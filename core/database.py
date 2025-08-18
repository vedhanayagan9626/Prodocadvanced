from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Path to the folder where EXE is running
base_path = Path(getattr(sys, '_MEIPASS', Path.cwd()))
env_file = base_path / ".env"

if env_file.exists():
    load_dotenv(env_file)
else:
    raise ValueError(f".env file not found at {env_file}")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set.")

# engine = create_engine(DATABASE_URL, echo=True, fast_executemany=True)
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

