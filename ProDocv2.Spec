# -*- mode: python ; coding: utf-8 -*-

import sys
import os
from PyInstaller.utils.hooks import collect_all
from pathlib import Path

# === Collect packages ===
packages = [
    "passlib", "pdf2image", "pymssql", "fastapi", "webview",
    "ocrmypdf", "pdfplumber", "SQLAlchemy", "jinja2", "uvicorn",
    "pydantic", "python_jose", "ecdsa", "rsa", "pythonnet", "paddleocr", "paddlepaddle"
]

datas, binaries, hiddenimports = [], [], []
for pkg in packages:
    d, b, h = collect_all(pkg)
    datas += d
    binaries += b
    hiddenimports += h

# === Add your template/static/YAML folders ===
datas += [
    ("templates/*", "templates"),
    ("static/*", "static"),
    ("core/templates/*.yaml", "core/templates"),
    ("vendor_parsers/**", "vendor_parsers"),
    (".env", "."),
]

# Explicitly include pythonnet DLLs
site_packages = Path(sys.executable).parent.parent / "Lib" / "site-packages"
pythonnet_runtime = site_packages / "pythonnet" / "runtime"


# Include all DLLs from pythonnet/runtime
for dll in pythonnet_runtime.glob("*.dll"):
    binaries.append((str(dll), "pythonnet/runtime"))

# Hidden imports for clr
hiddenimports += [
    "clr",
    "vendor_parsers.plumber_parser.satruntech_pdf",
    "vendor_parsers.plumber_parser.surekha_goldpdf",
    "vendor_parsers.plumber_parser.Nucleus_pdf",
    "vendor_parsers.plumber_parser.Nucleus_pdf_advancedcolumns",
    "vendor_parsers.plumber_parser.satruntech_pdf_advancedcolumns",
    "vendor_parsers.ocr_parser.satruntech_ocr",
    "vendor_parsers.ocr_parser.surekha_goldocr",
    "vendor_parsers.ocr_parser.silver_czocr",
    "paddleocr",
    "paddlepaddle",
    "paddleocr.tools",
    "paddleocr.ppstructure"
]

# === Runtime hook ===
runtime_hook_code = r"""
import os
import sys
import shutil
from pathlib import Path

APP_NAME = "ProDoc-V2"
APP_DATA_DIR = Path(os.getenv("APPDATA", Path.home())) / APP_NAME

UPLOADS_DIR = APP_DATA_DIR / "uploads"
DOWNLOAD_DIR = APP_DATA_DIR / "downloads"
LOGS_DIR = APP_DATA_DIR / "logs"
EXTERNAL_YML_DIR = APP_DATA_DIR / "core_templates"

for d in [UPLOADS_DIR, DOWNLOAD_DIR, LOGS_DIR, EXTERNAL_YML_DIR]:
    os.makedirs(d, exist_ok=True)

# Copy bundled YAML files to external folder if missing or outdated
try:
    import time
    bundled_yml_dir = Path(getattr(sys, "_MEIPASS", Path("."))) / "core/templates"
    if bundled_yml_dir.exists():
        for file in bundled_yml_dir.glob("*.yaml"):
            target = EXTERNAL_YML_DIR / file.name
            if not target.exists():
                shutil.copy(file, target)
            else:
                if file.stat().st_mtime > target.stat().st_mtime:
                    shutil.copy(file, target)
except Exception as e:
    print(f"[WARN] Could not sync YAML files: {e}")

os.environ["UPLOADS_DIR"] = str(UPLOADS_DIR)
os.environ["DOWNLOAD_DIR"] = str(DOWNLOAD_DIR)
os.environ["LOGS_DIR"] = str(LOGS_DIR)
os.environ["EXTERNAL_YML_DIR"] = str(EXTERNAL_YML_DIR)
"""

with open("runtime_appdata.py", "w", encoding="utf-8") as f:
    f.write(runtime_hook_code)

# === PyInstaller build ===
block_cipher = None

a = Analysis(
    ["main.py"],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=["runtime_appdata.py"],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="ProDoc",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    icon="app.ico",
    version_file="version_info.txt"
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="ProDoc"
)
