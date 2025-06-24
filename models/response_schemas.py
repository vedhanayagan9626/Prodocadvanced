# response_schemas.py
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal

class ItemResponse(BaseModel):
    ItemID: int
    InvoiceNo: Optional[str]
    Description: Optional[str]
    HSN: Optional[str]
    Quantity: Optional[str]
    PricePerUnit: Optional[str]
    GST: Optional[str]
    IGST: Optional[str]
    SGST: Optional[str]
    Amount: Optional[Decimal]

    class Config:
        orm_mode = True

class InvoiceResponse(BaseModel):
    InvoiceNo: str
    FromAddress: Optional[str]
    ToAddress: Optional[str]
    GSTNo: Optional[str]
    InvoiceDate: Optional[str]
    TotalAmount: Optional[Decimal]
    Taxes: Optional[str]
    TotalQuantity: Optional[Decimal]
    Items: List[ItemResponse] = []

    class Config:
        orm_mode = True

class UpdateInvoiceRequest(BaseModel):
    invoice_number: str
    from_address: str
    to_address: str
    gst_number: str
    invoice_date: str
    total: str
    taxes: str
    total_quantity: str
