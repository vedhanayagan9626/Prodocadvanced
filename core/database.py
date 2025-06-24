from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "mssql+pyodbc://InvoiceAPI:InvoiceAPI%40API%40123%21@103.133.214.232:1436/InvoiceAPIDB?driver=ODBC+Driver+17+for+SQL+Server"

engine = create_engine(DATABASE_URL, echo=True, fast_executemany=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()



