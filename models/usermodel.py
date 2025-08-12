from __future__ import annotations
from typing import List, Optional
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy import TypeDecorator,DECIMAL, Date, DateTime, ForeignKeyConstraint, Identity, Integer, PrimaryKeyConstraint, String, Unicode, text, ForeignKey, UnicodeText, JSON
import datetime
import decimal
import json

class Base(DeclarativeBase):
    pass

class Users(Base):
    __tablename__ = 'Users'

    Id: Mapped[int] = mapped_column(Integer, primary_key= True, autoincrement= True, server_default=Identity())
    Username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    HashPassword: Mapped[str] = mapped_column(String(100), nullable=False)
    Role: Mapped[str] = mapped_column(String(40), nullable=False)
    EmailId: Mapped[str] = mapped_column(String(30), nullable=False)
    PhoneNumber: Mapped[str] = mapped_column(String(10), nullable=False)
    CreatedDate: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    UpdatedDate: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    