from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL is None:
	raise ValueError("DATABASE_URL environment variable is not set")
# engine = create_engine(DATABASE_URL, echo=True, fast_executemany=True)
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()



