from sqlalchemy.orm import Session
from models.models import Invoices, Items, InvoicesHistory, ItemsHistory
from fastapi import HTTPException
from typing import List



def insert_invoice_orm(db: Session, invoice_data: dict):
    from sqlalchemy.exc import IntegrityError

    invoice_no = invoice_data["invoice_number"]
    existing = db.query(Invoices).filter_by(InvoiceNo=invoice_no).first()

    if existing:
        # Log existing data to history table
        history = InvoicesHistory(
            InvoiceNo=existing.InvoiceNo,
            FromAddress=existing.FromAddress,
            ToAddress=existing.ToAddress,
            GSTNo=existing.GSTNo,
            InvoiceDate=existing.InvoiceDate,
            Total=existing.Total,
            Taxes=existing.Taxes,
            TotalQuantity=existing.TotalQuantity
        )
        db.add(history)

        # Update the invoice
        existing.FromAddress = invoice_data.get("from_address")
        existing.ToAddress = invoice_data.get("to_address")
        existing.GSTNo = invoice_data.get("gst_number")
        existing.InvoiceDate = invoice_data.get("invoice_date")
        existing.Total = invoice_data.get("total")
        existing.Taxes = invoice_data.get("taxes")
        existing.TotalQuantity = invoice_data.get("total_quantity")
        db.commit()
        db.refresh(existing)
        return existing
    else:
        try:
            invoice = Invoices(
                InvoiceNo=invoice_data.get("invoice_number"),
                FromAddress=invoice_data.get("from_address"),
                ToAddress=invoice_data.get("to_address"),
                GSTNo=invoice_data.get("gst_number"),
                InvoiceDate=invoice_data.get("invoice_date"),
                Total=invoice_data.get("total"),
                Taxes=invoice_data.get("taxes"),
                TotalQuantity=invoice_data.get("total_quantity"),
            )
            db.add(invoice)
            db.commit()
            db.refresh(invoice)
            return invoice
        except IntegrityError as e:
            db.rollback()
            print("[DB ERROR] IntegrityError:", str(e.orig))
            raise HTTPException(status_code=400, detail="Invoice already exists.")
        except Exception as e:
            db.rollback()
            print("[DB ERROR] General Exception:", str(e))
            raise HTTPException(status_code=500, detail="Failed to insert invoice.")


#This functon will insert items into the database, if invoice already exists, it will backup the old items to history table and delete the old items
def insert_items_orm(db: Session, invoice_no: str, items: List[dict]):
    # Fetch and backup old items
    old_items = db.query(Items).filter_by(InvoiceNo=invoice_no).all()
    for old_item in old_items:
        history = ItemsHistory(
            InvoiceNo=old_item.InvoiceNo,
            Description=old_item.Description,
            HSN=old_item.HSN,
            Quantity=old_item.Quantity,
            PricePerUnit=old_item.PricePerUnit,
            GST=old_item.GST,
            IGST=old_item.IGST,
            SGST=old_item.SGST,
            Amount=old_item.Amount
        )
        db.add(history)

    # Delete old items (if needed)
    if old_items:
        db.query(Items).filter_by(InvoiceNo=invoice_no).delete()

    # Insert new items
    item_objs = []
    for item in items:
        item_obj = Items(
            InvoiceNo=invoice_no,
            Description=item.get("description"),
            HSN=item.get("hsn"),
            Quantity=item.get("quantity"),
            PricePerUnit=item.get("price_per_unit"),
            GST=item.get("gst"),
            IGST=item.get("igst"),
            SGST=item.get("sgst"),
            Amount=item.get("amount"),
        )
        db.add(item_obj)
        item_objs.append(item_obj)

    db.commit()
    return item_objs


def get_all_invoices_orm(db: Session):
    return db.query(Invoices).all()


def get_invoice_by_invoice_no_orm(db: Session, invoice_no: str):
    return db.query(Invoices).filter(Invoices.InvoiceNo == invoice_no).first()


def get_items_by_invoice_no_orm(db: Session, invoice_no: str):
    return db.query(Items).filter(Items.InvoiceNo == invoice_no).all()


def delete_invoice_by_id_orm(db: Session, invoice_no: str):
    invoice = db.query(Invoices).filter(Invoices.InvoiceNo == invoice_no).first()
    if invoice:
        db.delete(invoice)
        db.commit()
    return invoice

def get_invoice_history(db: Session, invoice_no: str):
    return db.query(InvoicesHistory).filter_by(InvoiceNo=invoice_no).order_by(InvoicesHistory.ChangedAt.desc()).all()
def get_item_history(db: Session, invoice_no: str):
    return db.query(ItemsHistory).filter_by(InvoiceNo=invoice_no).order_by(ItemsHistory.ChangedAt.desc()).all()

def get_all_invoice_history(db: Session):
    return db.query(InvoicesHistory).order_by(InvoicesHistory.ChangedAt.desc()).all()

def update_invoice_item_orm(db: Session, item_data: dict):
    # Fetch the item by its primary key
    db_item = db.query(Items).filter(Items.ItemID == item_data["item_id"]).first()
    if not db_item:
        raise HTTPException(status_code=404, detail=f"Item with ID {item_data['item_id']} not found.")

    # Save old data to history before updating
    history = ItemsHistory(
        InvoiceNo=db_item.InvoiceNo,
        Description=db_item.Description,
        HSN=db_item.HSN,
        Quantity=db_item.Quantity,
        PricePerUnit=db_item.PricePerUnit,
        GST=db_item.GST,
        IGST=db_item.IGST,
        SGST=db_item.SGST,
        Amount=db_item.Amount
    )
    db.add(history)

    # Update item fields
    db_item.Description = item_data.get("description")
    db_item.HSN = item_data.get("hsn")
    db_item.Quantity = item_data.get("quantity")
    db_item.PricePerUnit = item_data.get("price_per_unit")
    db_item.GST = item_data.get("gst")
    db_item.IGST = item_data.get("igst")
    db_item.SGST = item_data.get("sgst")
    db_item.Amount = item_data.get("amount")

    db.commit()
    db.refresh(db_item)
    return db_item
