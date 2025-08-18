# response_schemas.py
from pydantic import BaseModel
from pydantic import ConfigDict
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

    model_config = ConfigDict(from_attributes=True)

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

    model_config = ConfigDict(from_attributes=True)

class UpdateInvoiceRequest(BaseModel):
    invoice_number: str
    from_address: str
    to_address: str
    gst_number: str
    invoice_date: str
    total: str
    taxes: str
    total_quantity: str

# Add these to your existing response_schemas.py
from datetime import datetime

class CompletedItemResponse(BaseModel):
    item_id: int
    description: str
    quantity: Decimal
    rate: Decimal
    tax: Decimal
    amount: Decimal
    hsn: Optional[str]

    model_config = ConfigDict(from_attributes=True)

class CompletedInvoiceResponse(BaseModel):
    invoice_number: str
    from_address: str
    to_address: str
    supplier_gst: str
    customer_gst: Optional[str]
    invoice_date: str
    total: Decimal
    subtotal: Decimal
    tax_amount: Decimal
    taxes: str
    total_quantity: Decimal
    correction_date: datetime
    items: List[CompletedItemResponse] = []

    model_config = ConfigDict(from_attributes=True)

class InvoicePreviewResponse(BaseModel):
    invoice_number: str
    vendor_name: str
    date: str
    total_amount: Decimal
    tax_amount: Decimal
    item_count: int
    from_address: str = ""  # Optional with default
    to_address: str = ""    # Optional with default

    model_config = ConfigDict(from_attributes=True)