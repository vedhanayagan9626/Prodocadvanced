import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# ------------------------------
# Helper: Locate resource path for dev + PyInstaller
# ------------------------------
def resource_path(relative_path: str) -> Path:
    """
    Get absolute path to resource.
    Works in development and in PyInstaller bundle.
    """
    base_path = getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent)
    return Path(base_path) / relative_path

# ------------------------------
# Application storage in AppData for user-generated files
# ------------------------------
APP_NAME = "ProDoc"
APP_STORAGE = Path(os.getenv("APPDATA", Path.home())) / APP_NAME
APP_STORAGE.mkdir(parents=True, exist_ok=True)

# ------------------------------
# Load .env (External first, then bundled)
# ------------------------------
external_env = APP_STORAGE / ".env"
if external_env.exists():
    load_dotenv(dotenv_path=external_env)
else:
    bundled_env = resource_path(".env")
    if bundled_env.exists():
        load_dotenv(dotenv_path=bundled_env)

# ------------------------------
# User-generated folders (persistent, outside of exe)
# ------------------------------
UPLOADS_DIR = APP_STORAGE / "uploads"
DOWNLOAD_DIR = APP_STORAGE / "downloads"

UPLOADS_DIR.mkdir(exist_ok=True)
DOWNLOAD_DIR.mkdir(exist_ok=True)

# ------------------------------
# Bundled resource folders (inside exe or project)
# ------------------------------
TEMPLATES_DIR = resource_path("templates")
STATIC_DIR = resource_path("static")

# Bundled YAML templates (inside exe or project)

external_yml_dir = Path(os.getenv("EXTERNAL_YML_DIR", ""))
if external_yml_dir.exists() and any(external_yml_dir.glob("*.yaml")):
    YML_TEMPLATE_DIR = external_yml_dir
else:
    YML_TEMPLATE_DIR = resource_path("core/templates")# For YAML invoice parsing files

# ------------------------------
# Security and settings
# ------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "INV_EXT_CrEaTiVe_TeCh730@04082025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///default.db")
