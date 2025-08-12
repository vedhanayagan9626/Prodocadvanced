import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent  # Points to INVOICE_Extractor/
TEMPLATES_DIR = ROOT_DIR / "templates"
STATIC_DIR = ROOT_DIR / "static"
UPLOADS_DIR = ROOT_DIR / "uploads"
YML_TEMPLATE_DIR = ROOT_DIR / "core" / "templates"
SECRET_KEY = os.getenv("SECRET_KEY", "INV_EXT_CrEaTiVe_TeCh730@04082025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30