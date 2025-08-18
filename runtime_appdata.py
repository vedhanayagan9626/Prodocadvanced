
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
