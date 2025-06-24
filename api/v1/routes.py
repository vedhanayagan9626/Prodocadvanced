from fastapi import APIRouter, UploadFile, Path, File, Form, HTTPException, Depends, Body
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import shutil, os, uuid, json, datetime
from typing import List, Optional
from models.models import Invoices
from models.response_schemas import InvoiceResponse, UpdateInvoiceRequest
from core.database import SessionLocal
from crud import invoice_crud
from core import pdf_reader, template_loader
from core.pdf_reader import extract_text, convert_pdf_to_images, ocr_image
import importlib
# import vendor_parsers.ocr_parser.surekha_goldocr as surekha_goldocr
# import vendor_parsers.plumber_parser.satruntech_pdf as satruntech_pdf

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def load_vendor_parser(vendor_name, mode):
    """
    Dynamically import vendor parser based on name and mode (ocr or plumber).
    Expects file to exist under:
        vendor_parsers/<mode>_parser/<vendorname_normalized>.py
    """
    vendor_map = {}
    if mode == 'plumber':
        vendor_map = {
            "Surekha Gold Private Limited": "surekha_goldpdf",
            "Satrun Technologies": "satruntech_pdf",
            "Nucleus Analytics Private Limited": "Nucleus_pdf"
            # Add more mappings here
        }
    elif mode == 'ocr':
        vendor_map = {
            "Surekha Gold Private Limited": "surekha_goldocr",
            "Satrun Technologies": "satruntech_ocr",
            "Silver & C.Z International": "silver_czocr"
            # Add more mappings here
        }
    
    key = vendor_map.get(vendor_name)
    print(key)
    if not key:
        return None
    
    print(f"[INFO] Loading parser for vendor: {vendor_name} in {mode} mode")
    module_path = f"vendor_parsers.{mode}_parser.{key}"
    try:
        return importlib.import_module(module_path)
    except ModuleNotFoundError:
        return None

def process_with_pdfplumber(path, mode):
    if not path.lower().endswith(".pdf"):
        raise ValueError("[ERROR] Input is not a PDF. Cannot process with pdfplumber.")
            
    print("[INFO] Proccessing a pdf Extraction on given Text Pdf .")

    text = extract_text(path)
    if not text.strip():
        raise ValueError("[ERROR] No text found in PDF. It's likely scanned. Use OCR mode.")

    print("[INFO] Extracted text using pdfplumber:\n")
    print(text[:])  # Preview

    # Detect template
    templates = template_loader.load_templates()
    matched_template = template_loader.detect_template(text, templates)

    if not matched_template:
        raise ValueError("[ERROR] No matching template found in YAML for this text-based PDF.")

    vendor = matched_template["vendor"]
    print(f"[INFO] Detected vendor: {vendor}")

    # Dynamically import the correct vendor parser
    vendor_module = load_vendor_parser(vendor, mode)

    if not vendor_module:
        raise ValueError(f"[ERROR] No parser found for vendor '{vendor}' in plumber mode.")

    return vendor_module.process_invoice(text,path)

def process_with_ocr(path, mode):
    # Accept both image and PDF
    if path.lower().endswith(".pdf"):
        images = convert_pdf_to_images(path)
        if images:
            print(f"[INFO] Converted PDF to {len(images)} images for OCR processing.")
            text = "\n".join([ocr_image(img) for img in images])
        else:
            raise ValueError("[ERROR] No images extracted from PDF for OCR processing.")
    elif path.lower().endswith((".jpg", ".jpeg", ".png")):
        print("[INFO] Proccessing in OCR on given image .")
        text = ocr_image(path)
    else:
        raise ValueError("[ERROR] Unsupported file type for OCR processing.")

    print("[INFO] Extracted text using OCR:\n")
    print(text[:])

    templates = template_loader.load_templates()
    matched_template = template_loader.detect_template(text, templates)

    if not matched_template:
        raise ValueError(f"[ERROR] No matching template found for OCR content.")
    
    vendor = matched_template["vendor"]
    print(f"[INFO] Detected vendor: {vendor}")

    vendor_module = load_vendor_parser(vendor, mode)

    if not vendor_module:
        raise ValueError(f"[ERROR] No parser found for vendor '{vendor}' in ocr mode.")
    
    return vendor_module.process_invoice(text,matched_template,path)

# Upload and process invoice
@router.post("/upload-invoice")
async def upload_invoice(
    file: UploadFile = File(...),
    mode: str = Form(...),
    db: Session = Depends(get_db)
):
    if mode.lower() not in ["ocr", "text"]:
        raise HTTPException(status_code=400, detail="Mode must be either 'ocr' or 'text'")

    filename = f"uploads/{uuid.uuid4()}_{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    with open(filename, 'wb') as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Process the invoice based on user given mode
        result = process_with_pdfplumber(filename, mode="plumber") if mode == "text" else process_with_ocr(filename, mode="ocr")
        if not result:
            raise HTTPException(status_code=400, detail="No data extracted from the invoice")
        print("-"*100)
        print("[INFO] Successfully processed invoice with vendor parser")
        print("[INFO] Result from vendor parser:", result)
        print("-"*100)
        
        invoice_data = result.get("invoice_data")
        items = result.get("items")
        invoice_number = result.get("invoice_number")

        print("Parsed Invoice Data:", invoice_data)
        print("Parsed Items:", items)

        invoice_crud.insert_invoice_orm(db, invoice_data)
        invoice_crud.insert_items_orm(db, invoice_number, items)
        print("-"*50 + "Invoice and items saved to database" + "-"*50)

        # Fetch the saved invoice and items from DB
        saved_invoice = invoice_crud.get_invoice_by_invoice_no_orm(db, invoice_number)
        saved_items = invoice_crud.get_items_by_invoice_no_orm(db, invoice_number)

        response = {
            "invoice_number": invoice_number,
            "invoice_data": saved_invoice.as_dict() if saved_invoice else {},
            "items": [item.as_dict() for item in saved_items]
        }
        return JSONResponse(content=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"[FATAL] {e}")

@router.get("/invoices", response_model=List[InvoiceResponse])
def get_all_invoices(db: Session = Depends(get_db)):
    invoices = db.query(Invoices).all()
    return [
        InvoiceResponse(
            InvoiceNo=inv.InvoiceNo,
            FromAddress=inv.FromAddress,
            ToAddress=inv.ToAddress,
            GSTNo=inv.GSTNo,
            InvoiceDate=inv.InvoiceDate,
            TotalAmount=inv.Total,
            Taxes=inv.Taxes,
            TotalQuantity=inv.TotalQuantity,
            Items=[]  # empty list
        )
        for inv in invoices
    ]

# get items for a specific invoice by invoice number
@router.get("/invoices/{invoice_no:path}/items")
def get_invoice_items(invoice_no: str = Path(...), db: Session = Depends(get_db)):
    return invoice_crud.get_items_by_invoice_no_orm(db, invoice_no)

# get a specific invoice by invoice number
@router.get("/invoices/{invoice_no:path}", response_model=InvoiceResponse)
def get_invoice(invoice_no: str = Path(...), db: Session = Depends(get_db)):
    inv = db.query(Invoices).filter(Invoices.InvoiceNo == invoice_no).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return InvoiceResponse(
        InvoiceNo=inv.InvoiceNo,
        FromAddress=inv.FromAddress,
        ToAddress=inv.ToAddress,
        GSTNo=inv.GSTNo,
        InvoiceDate=inv.InvoiceDate,
        TotalAmount=inv.Total,
        Taxes=inv.Taxes,
        TotalQuantity=inv.TotalQuantity,
        Items=[]
    )

@router.post("/invoices/update-invoice")
def update_invoice_main(data: dict, db: Session = Depends(get_db)):
    # Use your insert_invoice_orm for update (it handles both insert and update)
    updated_invoice = invoice_crud.insert_invoice_orm(db, data)
    if not updated_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found or not updated")
    return {"detail": "Invoice updated successfully"}


#update invoice items
@router.post("/invoices/update-items")
def update_invoice_items(items: List[dict], db: Session = Depends(get_db)):
    print("-"*100)
    print("[INFO] Updating invoice items")
    print(items)
    print("-"*100)
    for item in items:
        invoice_crud.update_invoice_item_orm(db, item)
    return {"detail": "Items updated successfully"}


# delete an invoice by invoice number
@router.delete("/invoices/{invoice_no}")
def delete_invoice(invoice_no: str, db: Session = Depends(get_db)):
    deleted = invoice_crud.delete_invoice_by_id_orm(db, invoice_no)
    if not deleted:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"detail": f"Invoice {invoice_no} deleted"}


# returns inbvoice history for a specific invoice
@router.get("/invoices/{invoice_no}/history")
def get_invoice_history_route(invoice_no: str, db: Session = Depends(get_db)):
    history = invoice_crud.get_invoice_history(db, invoice_no)
    if not history:
        raise HTTPException(status_code=404, detail="No history found for this invoice")
    return history

# returns all invoice history
@router.get("/invoices/history")
def get_all_invoice_history(db: Session = Depends(get_db)):
    history = invoice_crud.get_all_invoice_history(db)
    if not history:
        raise HTTPException(status_code=404, detail="No invoice history found")
    return history

