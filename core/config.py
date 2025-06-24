import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent  # Points to INVOICE_Extractor/
TEMPLATES_DIR = ROOT_DIR / "templates"
STATIC_DIR = ROOT_DIR / "static"
UPLOADS_DIR = ROOT_DIR / "uploads"
YML_TEMPLATE_DIR = ROOT_DIR / "core" / "templates"