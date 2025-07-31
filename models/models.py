from __future__ import annotations
from typing import List, Optional
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy import DECIMAL, Date, DateTime, ForeignKeyConstraint, Identity, Integer, PrimaryKeyConstraint, String, Unicode, text, ForeignKey, UnicodeText
import datetime

import decimal

class Base(DeclarativeBase):
    pass


class ApiKeyTable(Base):
    __tablename__ = 'ApiKeyTable'
    __table_args__ = (
        PrimaryKeyConstraint('ApiId', name='PK__ApiKeyTa__024B3BB383375DB0'),
    )

    ApiId: Mapped[int] = mapped_column(Integer, primary_key=True)
    ApiKey: Mapped[str] = mapped_column(String(collation='SQL_Latin1_General_CP1_CI_AS'))
    CompanyName: Mapped[str] = mapped_column(String(50, 'SQL_Latin1_General_CP1_CI_AS'))
    ApiKey_Created_Date: Mapped[Optional[datetime.date]] = mapped_column(Date, server_default=text('(getdate())'))


class InvoiceTokenUsage(Base):
    __tablename__ = 'InvoiceTokenUsage'
    __table_args__ = (
        PrimaryKeyConstraint('Id', name='PK__InvoiceT__3214EC07ADCCDBFF'),
    )

    Id: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    InvoiceId: Mapped[Optional[int]] = mapped_column(Integer)
    FileName: Mapped[Optional[str]] = mapped_column(Unicode(255, 'SQL_Latin1_General_CP1_CI_AS'))
    UploadTime: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('(getdate())'))
    InputTokens: Mapped[Optional[int]] = mapped_column(Integer)
    OutputTokens: Mapped[Optional[int]] = mapped_column(Integer)
    TotalTokens: Mapped[Optional[int]] = mapped_column(Integer)
    InputCost: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 4))
    OutputCost: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 4))
    TotalCost: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 4))
    ApiKeyUsed: Mapped[Optional[str]] = mapped_column(Unicode(255, 'SQL_Latin1_General_CP1_CI_AS'))


class Invoices(Base):
    __tablename__ = 'Invoices'
    __table_args__ = (
        PrimaryKeyConstraint('InvoiceNo', name='PK__Invoices__D796B2268103C982'),
    )

    InvoiceNo: Mapped[str] = mapped_column(Unicode(50, 'SQL_Latin1_General_CP1_CI_AS'), primary_key=True)
    FromAddress: Mapped[Optional[str]] = mapped_column(Unicode(collation='SQL_Latin1_General_CP1_CI_AS'))
    ToAddress: Mapped[Optional[str]] = mapped_column(Unicode(collation='SQL_Latin1_General_CP1_CI_AS'))
    GSTNo: Mapped[Optional[str]] = mapped_column(Unicode(50, 'SQL_Latin1_General_CP1_CI_AS'))
    InvoiceDate: Mapped[Optional[str]] = mapped_column(Unicode(50, 'SQL_Latin1_General_CP1_CI_AS'))
    Total: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 2))
    Taxes: Mapped[Optional[str]] = mapped_column(Unicode(collation='SQL_Latin1_General_CP1_CI_AS'))
    TotalQuantity: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 2))
    Created_Date: Mapped[Optional[datetime.date]] = mapped_column(Date, server_default=text('(getdate())'))

    Items: Mapped[List['Items']] = relationship('Items', back_populates='Invoices_')

    def as_dict(self):
        return {
            "invoice_number": self.InvoiceNo,
            "from_address": self.FromAddress,
            "to_address": self.ToAddress,
            "gst_number": self.GSTNo,
            "invoice_date": self.InvoiceDate,
            "total": str(self.Total) if self.Total is not None else None,
            "taxes": self.Taxes,
            "total_quantity": str(self.TotalQuantity) if self.TotalQuantity is not None else None,
            "created_date": str(self.Created_Date) if self.Created_Date is not None else None
        }


class Items(Base):
    __tablename__ = 'Items'
    __table_args__ = (
        ForeignKeyConstraint(['InvoiceNo'], ['Invoices.InvoiceNo'], ondelete='CASCADE', name='FK_Items_Invoices'),
        PrimaryKeyConstraint('ItemID', name='PK__Items__727E83EB230084A6')
    )

    ItemID: Mapped[int] = mapped_column(Integer, Identity(start=1, increment=1), primary_key=True)
    InvoiceNo: Mapped[Optional[str]] = mapped_column(Unicode(50, 'SQL_Latin1_General_CP1_CI_AS'))
    Description: Mapped[Optional[str]] = mapped_column(Unicode(collation='SQL_Latin1_General_CP1_CI_AS'))
    HSN: Mapped[Optional[str]] = mapped_column(Unicode(50, 'SQL_Latin1_General_CP1_CI_AS'))
    Quantity: Mapped[Optional[str]] = mapped_column(Unicode(50, 'SQL_Latin1_General_CP1_CI_AS'))
    PricePerUnit: Mapped[Optional[str]] = mapped_column(Unicode(50, 'SQL_Latin1_General_CP1_CI_AS'))
    GST: Mapped[Optional[str]] = mapped_column(Unicode(50, 'SQL_Latin1_General_CP1_CI_AS'))
    IGST: Mapped[Optional[str]] = mapped_column(Unicode(50, 'SQL_Latin1_General_CP1_CI_AS'))
    SGST: Mapped[Optional[str]] = mapped_column(Unicode(50, 'SQL_Latin1_General_CP1_CI_AS'))
    Amount: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 2))

    Invoices_: Mapped[Optional['Invoices']] = relationship('Invoices', back_populates='Items')

    def as_dict(self):
        return {
            "item_id": self.ItemID,
            "invoice_number": self.InvoiceNo,
            "description": self.Description,
            "hsn": self.HSN,
            "quantity": self.Quantity,
            "price_per_unit": self.PricePerUnit,
            "gst": self.GST,
            "igst": self.IGST,
            "sgst": self.SGST,
            "amount": str(self.Amount) if self.Amount is not None else None
        }

class InvoicesHistory(Base):
    __tablename__ = 'Invoices_History'

    HistoryID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    InvoiceNo: Mapped[str] = mapped_column(Unicode(50))
    FromAddress: Mapped[Optional[str]] = mapped_column(Unicode)
    ToAddress: Mapped[Optional[str]] = mapped_column(Unicode)
    GSTNo: Mapped[Optional[str]] = mapped_column(Unicode(50))
    InvoiceDate: Mapped[Optional[str]] = mapped_column(Unicode(50))
    Total: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 2))
    Taxes: Mapped[Optional[str]] = mapped_column(Unicode)
    TotalQuantity: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 2))
    ChangedAt: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text("GETDATE()"))


class ItemsHistory(Base):
    __tablename__ = 'Items_History'

    ItemID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    InvoiceNo: Mapped[Optional[str]] = mapped_column(Unicode(50))
    Description: Mapped[Optional[str]] = mapped_column(Unicode)
    HSN: Mapped[Optional[str]] = mapped_column(Unicode(50))
    Quantity: Mapped[Optional[str]] = mapped_column(Unicode(50))
    PricePerUnit: Mapped[Optional[str]] = mapped_column(Unicode(50))
    GST: Mapped[Optional[str]] = mapped_column(Unicode(50))
    IGST: Mapped[Optional[str]] = mapped_column(Unicode(50))
    SGST: Mapped[Optional[str]] = mapped_column(Unicode(50))
    Amount: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 2))
    ChangedAt: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text("GETDATE()"))


class CorrectedInvoices(Base):
    __tablename__ = 'CorrectedInvoices'
    
    CorrectionID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    OriginalInvoiceNo: Mapped[str] = mapped_column(String(50), ForeignKey('Invoices.InvoiceNo'))
    FromAddress: Mapped[Optional[str]] = mapped_column(UnicodeText)
    ToAddress: Mapped[Optional[str]] = mapped_column(UnicodeText)
    SupplierGST: Mapped[Optional[str]] = mapped_column(String(50))
    CustomerGST: Mapped[Optional[str]] = mapped_column(String(50))
    InvoiceDate: Mapped[Optional[str]] = mapped_column(String(50))
    Total: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 2))
    Subtotal: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 2))
    TaxAmount: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 2))
    Taxes: Mapped[Optional[str]] = mapped_column(UnicodeText)
    TotalQuantity: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 2))
    CorrectionDate: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())
    CorrectedBy: Mapped[Optional[str]] = mapped_column(String(100))
    Status: Mapped[str] = mapped_column(String(20), default='PENDING_APPROVAL')
    Notes: Mapped[Optional[str]] = mapped_column(UnicodeText)
    
    Items: Mapped[List['CorrectedItems']] = relationship('CorrectedItems', back_populates='Correction')

class CorrectedItems(Base):
    __tablename__ = 'CorrectedItems'
    
    CorrectionItemID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    CorrectionID: Mapped[int] = mapped_column(Integer, ForeignKey('CorrectedInvoices.CorrectionID'))
    OriginalItemID: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('Items.ItemID'))
    Description: Mapped[Optional[str]] = mapped_column(UnicodeText)
    Quantity: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 2))
    Rate: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 2))
    Tax: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(5, 2))
    Amount: Mapped[Optional[decimal.Decimal]] = mapped_column(DECIMAL(18, 2))
    HSN: Mapped[Optional[str]] = mapped_column(String(50))
    
    Correction: Mapped['CorrectedInvoices'] = relationship('CorrectedInvoices', back_populates='Items') 