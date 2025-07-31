from fastapi import APIRouter, UploadFile, Path, File, Form, HTTPException, Depends, Body
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
import shutil, os, uuid, json, datetime
from typing import List, Optional
from models.models import Invoices, CorrectedInvoices, CorrectedItems
from models.response_schemas import InvoiceResponse, ItemResponse, InvoicePreviewResponse
from fastapi import Depends
from fastapi import Path, Body
from core.database import SessionLocal
from fastapi.middleware.cors import CORSMiddleware
from crud import invoice_crud
from core import pdf_reader, template_loader
from core.pdf_reader import extract_text, convert_pdf_to_images, ocr_image
import importlib
from datetime import datetime
import decimal
# from main import app
# import vendor_parsers.ocr_parser.surekha_goldocr as surekha_goldocr
# import vendor_parsers.plumber_parser.satruntech_pdf as satruntech_pdf

router = APIRouter()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # For development only, restrict in production
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

UPLOAD_FOLDER = "uploads"

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

@router.post('/upload-doc')
async def upload_doc(file: UploadFile = File(...)):
    try:
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        with open(file_path, 'wb') as buffer:
            shutil.copyfileobj(file.file, buffer)

        return JSONResponse({
            "status": "success",
            "filename": unique_filename,
            "original_filename": file.filename,  # Include original filename
            "size": os.path.getsize(file_path)
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@router.get('/list-docs')
async def list_documents():
    try:
        if not os.path.exists(UPLOAD_FOLDER):
            return []
            
        files = []
        for filename in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(file_path):
                # Store both unique and original filenames
                files.append({
                    "name": filename,
                    "originalName": filename,  # You might want to store original names in a database
                    "size": os.path.getsize(file_path),
                    "uploadedOn": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                })
                
        files.sort(key=lambda x: x["uploadedOn"], reverse=True)
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")
#delete multi documents

@router.delete('/delete-docs')
async def delete_documents(filenames: dict):
    try:
        deleted_files = []
        failed_deletions = []
        
        for filename in filenames.get('filenames', []):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            
            # Security check to prevent directory traversal
            if not os.path.abspath(file_path).startswith(os.path.abspath(UPLOAD_FOLDER)):
                failed_deletions.append(filename)
                continue
                
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    deleted_files.append(filename)
                else:
                    failed_deletions.append(filename)
            except Exception as e:
                print(f"Error deleting {filename}: {str(e)}")
                failed_deletions.append(filename)
        
        return {
            "status": "success",
            "deleted": deleted_files,
            "failed": failed_deletions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting files: {str(e)}")




# Upload and process invoice
@router.post("/upload-invoice")
async def process_invoice(
    filename: str = Form(...),
    mode: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Process an already uploaded file (PDF or image) for invoice extraction.
    """
    if mode.lower() not in ["ocr", "text"]:
        raise HTTPException(status_code=400, detail="Mode must be either 'ocr' or 'text'")

    # Validate filename to prevent directory traversal
    if not filename or any(c in filename for c in ['..', '/', '\\']):
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_path = os.path.join(UPLOAD_FOLDER, filename)
    
    # Check if file exists
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # Process the invoice based on user given mode
        result = process_with_pdfplumber(file_path, mode="plumber") if mode == "text" else process_with_ocr(file_path, mode="ocr")
        
        if not result:
            raise HTTPException(status_code=400, detail="No data extracted from the invoice")
        
        invoice_data = result.get("invoice_data")
        items = result.get("items")
        invoice_number = result.get("invoice_number")

        invoice_crud.insert_invoice_orm(db, invoice_data)
        invoice_crud.insert_items_orm(db, invoice_number, items)

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
        raise HTTPException(status_code=500, detail=f"[FATAL] {str(e)}")

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


#Scave Correted Invoice from user in invoice correction form
@router.post("/invoices/save-correction")
def save_corrected_invoice(
    correction_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    try:
        # Save corrected invoice header
        corrected_invoice = CorrectedInvoices(
            OriginalInvoiceNo=correction_data['invoice_data']['invoice_number'],
            FromAddress=correction_data['invoice_data']['from_address'],
            ToAddress=correction_data['invoice_data']['to_address'],
            SupplierGST=correction_data['invoice_data']['gst_number'],
            CustomerGST=correction_data['invoice_data'].get('customer_gst'),
            InvoiceDate=correction_data['invoice_data']['invoice_date'],
            Total=decimal.Decimal(correction_data['invoice_data']['total']),
            Subtotal=decimal.Decimal(correction_data['invoice_data']['subtotal']),
            TaxAmount=decimal.Decimal(correction_data['invoice_data']['tax_amount']),
            Taxes=correction_data['invoice_data']['taxes'],
            TotalQuantity=decimal.Decimal(correction_data['invoice_data']['total_quantity']),
            CorrectedBy="user@example.com",  # Replace with actual user from auth
            Status="APPROVED"
        )
        
        db.add(corrected_invoice)
        db.commit()
        db.refresh(corrected_invoice)
        
        # Save corrected items
        for item in correction_data['items']:
            corrected_item = CorrectedItems(
                CorrectionID=corrected_invoice.CorrectionID,
                OriginalItemID=item.get('original_item_id'),
                Description=item['description'],
                Quantity=decimal.Decimal(item['quantity']),
                Rate=decimal.Decimal(item['price_per_unit']),
                Tax=decimal.Decimal(item['gst']),
                Amount=decimal.Decimal(item['amount']),
                HSN=item.get('hsn')
            )
            db.add(corrected_item)
        
        db.commit()
        
        return {"status": "success", "correction_id": corrected_invoice.CorrectionID}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoices/{invoice_no}/corrections")
def get_invoice_corrections(
    invoice_no: str,
    db: Session = Depends(get_db)
):
    corrections = db.query(CorrectedInvoices)\
        .filter(CorrectedInvoices.OriginalInvoiceNo == invoice_no)\
        .order_by(CorrectedInvoices.CorrectionDate.desc())\
        .all()
    
    if not corrections:
        raise HTTPException(status_code=404, detail="No corrections found for this invoice")
    
    return corrections


@router.get("/invoices/completed", response_model=List[InvoicePreviewResponse])
def get_completed_invoices(db: Session = Depends(get_db)):
    # Get all invoices that are marked as completed
    invoices = db.query(Invoices).all()
    
    result = []
    for invoice in invoices:
        items = db.query(CorrectedItems).filter(CorrectedItems.CorrectionID == invoice.InvoiceNo).all()

        # Calculate tax amount (simplified - you might need to adjust based on your tax calculation)
        tax_amount = decimal.Decimal('0')
        for item in items:
            if item.Amount is not None and item.Tax is not None:
                try:
                    tax_percent = decimal.Decimal(item.Tax)
                    item_amount = decimal.Decimal(str(item.Amount)) if item.Amount is not None else decimal.Decimal('0')
                    tax_amount += item_amount * (tax_percent / decimal.Decimal('100'))
                except (ValueError, TypeError, decimal.InvalidOperation):
                    pass
        
        # Extract vendor name from from_address (first line)
        vendor_name = "Unknown Vendor"
        if invoice.FromAddress:
            vendor_name = invoice.FromAddress.split('\n')[0] or "Unknown Vendor"
        
        # Ensure required fields have values
        invoice_date = invoice.InvoiceDate or "Unknown Date"
        total_amount = invoice.Total if invoice.Total is not None else decimal.Decimal('0')
        from_address = invoice.FromAddress or ""
        to_address = invoice.ToAddress or ""
        
        result.append(InvoicePreviewResponse(
            invoice_number=invoice.InvoiceNo,
            vendor_name=vendor_name,
            date=invoice_date,
            total_amount=total_amount,
            tax_amount=tax_amount,
            item_count=len(items),
            from_address=from_address,
            to_address=to_address
        ))
    
    return result