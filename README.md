# Project Readme

## Overview

This project is a FastAPI-based web application designed for invoice extraction and parsing, leveraging OCR and vendor-specific logic. It incorporates user authentication, file serving, and a Jinja2-templated frontend.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Running the Application](#running-the-application)
- [Application Workflow](#application-workflow)
  - [User Authentication](#user-authentication)
  - [Frontend Pages](#frontend-pages)
  - [File Serving](#file-serving)
  - [Invoice Extraction and Parsing](#invoice-extraction-and-parsing)
- [Developer Guide](#developer-guide)
  - [Extending Vendor Parser Logic](#extending-vendor-parser-logic)
- [Configuration](#configuration)
- [Directory Structure](#directory-structure)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Features

- **Invoice Data Extraction:** Employs OCR (PaddleOCR) for scanned images and PDFPlumber for text-based PDFs.
- **Vendor-Specific Parsing:** Customizable parsing logic tailored to different invoice vendors.
- **REST API Endpoints:** Facilitates invoice uploading, listing, and viewing via RESTful APIs.
- **Templated HTML Frontend:** Utilizes Jinja2 for dynamic HTML rendering.
- **User Authentication:** Secure user management with login, registration, and password recovery.
- **File Serving:** Securely serves uploaded files.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- Python 3.10+
- pip (Python package installer)
- Git

### Installation

1.  Clone the repository:

    ```bash
git clone https://github.com/vedhanayagan9626/ProDoc-V2.git
cd ProDoc-V2
```

2.  Create a virtual environment (recommended):

    ```bash
python -m venv invoice-env
```

    -   On Windows:

        ```bash
        invoice-env\Scripts\activate
```

    -   On macOS and Linux:

        ```bash
        source invoice-env/bin/activate
```

3.  Install the dependencies:

    ```bash
    pip install -r requirements.txt
  ```

4. Configure Environment Variables:

    - Copy `.env` to your project root (if not present).
    - Set your `DATABASE_URL` in `.env`.
    - Add `SECRET_KEY` in `.env`.
    - Add any other important keys in `.env` if you extend this project.

5. Add Template and Static Files:

    - Place your HTML templates in the `templates/` directory.
    - Place static files (CSS, JS, images) in the `static/` directory.

## Running the Application

1.  To run the application, execute the `main.py` file or use `start.sh`:

    ```bash
    ./start.sh
    #Or
    uvicorn main:app --host 0.0.0.0 --port 10000
  ```

2. The application will start the FastAPI server

## Application Workflow

### User Authentication

1.  **Login Page**: Accessible via `/login`. Users can log in with existing credentials.
2.  **Registration Page**: Accessible via `/register`. New users can create an account.
3.  **Forgot Password Page**: Accessible via `/forgot-password`. Users can initiate the password reset process.
4.  **Authentication**: Upon successful login, a JWT token is stored in a cookie.
5.  **Protected Routes**: Routes like `/` and `/index` require a valid JWT token for access. If the token is missing or invalid, the user is redirected to the login page.

### Frontend Pages

1.  **Home Page**: Accessible via `/`. Displays the home page after successful login.
2.  **Index Page**: Accessible via `/index?file=<filename>`. Requires a valid token and displays content related to a specific file.
3.  **Invoice List Page**: Accessible via `/invoicelist`. Requires a valid token and displays a list of invoices.

### File Serving

-   The `/api/v1/get-file` endpoint serves files from the `UPLOADS_DIR`. It requires a `filename` parameter.
-   It supports serving `pdf`, `jpg`, `jpeg`, and `png` files. Other file types are served as `application/octet-stream`.
-   It includes checks to prevent directory traversal vulnerabilities.

### Invoice Extraction and Parsing
    - When a file is uploaded, the application determines whether to use OCR (for images) or PDFPlumber (for text-based PDFs).
    - Based on the detected keywords, it selects the appropriate vendor parser.
    - The extracted data is then stored, and displayed.

## Developer Guide

### Extending Vendor Parser Logic

To extend or add vendor-specific invoice parsing:

1.  **Create a Parser Module:** Create a new Python file in the `vendor_parsers/ocr/` (for OCR) or `vendor_parsers/plumber/` (for PDFPlumber) directory. This module will contain the parsing logic for a specific vendor. Use regex, positional mappings, or table extractors (like pdfplumber or camelot) depending on the invoice template.

2.  **Create a Vendor Configuration File:** Create a `.yml` file containing the vendor name and keywords to identify the vendor. For example:

    ```yaml
    vendor: Satrun Technologies
    keywords: ["SATRUN TECHNOLOGIES", "satruntechnologies@hotmail.com"]
    ```

3.  **Update `load_vendor_parser` Function:** Modify the `load_vendor_parser` function in `api/v1/routes.py` to include your new parser module. Add the vendor name and the corresponding parser module name (without the `.py` extension) to the `vendor_map` dictionary.

    ```python
    if mode == 'plumber':
        vendor_map = {
            "Surekha Gold Private Limited": "surekha_goldpdf",
            "Satrun Technologies": "satruntech_pdf",
            "Nucleus Analytics Private Limited": "Nucleus_pdf"
            # Add more mappings here
        }
    elif mode == 'ocr':
        vendor_map = {
            "Surekha Gold Private Limited": "surekha_goldocr",
            "Satrun Technologies": "satruntech_ocr",
            "Silver & C.Z International": "silver_czocr"
            # Add more mappings here
        }
    ```

4.  **Implement the Parsing Logic**: Create a new module (e.g., `parser.py`) to handle the parsing logic.

    ```python
    # parser.py
    def parse_data(file_path: str):
        """
        Parse data from a given file path.
        """
        try:
            with open(file_path, 'r') as f:
                data = f.read()
                # Add your parsing logic here
                parsed_data = data  # Replace this with actual parsing
            return parsed_data
        except Exception as e:
            raise ValueError(f"Error parsing file: {e}")
    ```

5.  **Integrate the parser** into your FastAPI routes.

    ```python
    # main.py
    from parser import parse_data  # Import the new function
    from fastapi import UploadFile, File

    @app.post("/api/v1/parse-file")
    async def parse_file(file: UploadFile = File(...)):
        """
        Endpoint to upload and parse a file.
        """
        try:
            file_path = UPLOADS_DIR / file.filename
            with open(file_path, "wb") as f:
                f.write(await file.read())
            parsed_data = parse_data(str(file_path))
            return {"filename": file.filename, "data": parsed_data}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    ```

6.  **Implement Parsing Logic**: Inside the `parse_data` function, add the necessary code to parse the file according to its format (e.g., CSV, JSON, XML).

## Configuration

The following configurations are set in `core/config.py`:

-   `TEMPLATES_DIR`: Directory for Jinja2 templates.
-   `STATIC_DIR`: Directory for static files.
-   `UPLOADS_DIR`: Directory for file uploads.
-   `DOWNLOAD_DIR`: Directory for downloads.
-   `SECRET_KEY`: Secret key for JWT authentication.
-   `ALGORITHM`: Algorithm used for JWT encoding and decoding.
-   `DATABASE_URL`: Connection string for the database.

Ensure these configurations are correctly set for your environment. You can modify them directly in `core/config.py` or via environment variables.

## Directory Structure

```
├── api
│   └── v1
│       ├── auth.py          # Authentication routes
│       └── routes.py        # API routes for invoice processing
├── core
│   └── config.py        # Configuration settings
│   └── database.py      # Database session management
├── models                # SQLAlchemy models for database interaction
├── static                 # Static files (CSS, JavaScript, images)
├── templates              # Jinja2 templates
├── vendor_parsers
│   ├── ocr              # OCR Parser Files
│   └── plumber          # PDFPlumber Parser Files
├── venv                   # Virtual environment
├── main.py                # Main application file
├── parser.py              # New module for parsing logic
├── README.md              # Documentation
└── LICENSE                # License information
```

## Contributing

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/YourFeature`).
3.  Commit your changes (`git commit -am 'Add some feature'`).
4.  Push to the branch (`git push origin feature/YourFeature`).
5.  Open a pull request.

## License
MIT License

## Support
For any questions or issues, please open an issue on GitHub.
```

```python src/main.py
# main.py
import os


import threading
import time
import tempfile
import shutil
import subprocess
from pathlib import Path
from typing import Optional
import requests
import socket
import webview
import webbrowser

from fastapi import FastAPI, Request, Depends, HTTPException, status, Cookie
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware import Middleware
from jose import JWTError, jwt
import sys
import subprocess

if sys.platform == "win32":
    _orig_popen = subprocess.Popen
    def _no_window_popen(*args, **kwargs):
        kwargs['creationflags'] = kwargs.get('creationflags', 0) | getattr(subprocess, 'CREATE_NO_WINDOW', 0x08000000)
        return _orig_popen(*args, **kwargs)
    subprocess.Popen = _no_window_popen
import uvicorn

from core.config import APP_NAME
from api.v1.routes import router as v1_router, PyWebViewSaveAPI
from api.v1.auth import router as auth_router
from core.config import (
    TEMPLATES_DIR,
    STATIC_DIR,
    UPLOADS_DIR,
    DOWNLOAD_DIR,
    SECRET_KEY,
    ALGORITHM,
)
from parser import parse_data  # Import the new function


APP_VERSION = "2.0.0"
APP_TITLE = f"{APP_NAME} v{APP_VERSION}"

# ------------------------------
# Initialize FastAPI
# ------------------------------
app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    middleware=[
        Middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    ]
)

# Mount static directory
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Include routers
app.include_router(v1_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1/auth")

# Ensure persistent folders exist
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# Security setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username


# ------------------------------
# Frontend routes
# ------------------------------
@app.get("/", response_class=HTMLResponse)
async def home(request: Request, token: Optional[str] = Cookie(None)):
    if not token:
        return templates.TemplateResponse("login.html", {"request": request})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return templates.TemplateResponse("home.html", {
            "request": request,
            "username": payload.get("sub")
        })
    except JWTError:
        return templates.TemplateResponse("login_redirect.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})


@app.get("/forgot-password", response_class=HTMLResponse)
async def forgot_password_page(request: Request):
    return templates.TemplateResponse("forgot-password.html", {"request": request})


@app.get("/index", response_class=HTMLResponse)
async def index(request: Request, file: str, token: Optional[str = None):
    try:
        if token:
            await get_current_user(token)
        return templates.TemplateResponse("index.html", {
            "request": request,
            "filename": file
        })
    except HTTPException:
        return templates.TemplateResponse("login_redirect.html", {"request": request})


@app.get("/invoicelist", response_class=HTMLResponse)
async def invoicelist(request: Request, token: Optional[str] = None):
    try:
        if token:
            await get_current_user(token)
        return templates.TemplateResponse("invoicelist.html", {
            "request": request,
            "filename": file
        })
    except HTTPException:
        return templates.TemplateResponse("login_redirect.html", {"request": request})


# ------------------------------
# File serving endpoint
# ------------------------------
@app.get("/api/v1/get-file")
async def get_file(filename: str):
    """Serve uploaded files for preview"""
    if not filename or any(c in filename for c in ['..', '/', '\\']):
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_path = UPLOADS_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    ext = filename.split('.')[-1].lower()
    media_type = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png'
    }.get(ext, 'application/octet-stream')

    return FileResponse(
        file_path,
        media_type=media_type,
        headers={'Content-Disposition': f'inline; filename="{filename}"'}
    )

# ------------------------------
# File parsing endpoint
# ------------------------------
@app.post("/api/v1/parse-file")
async def parse_file(file: UploadFile = File(...)):
    """
    Endpoint to upload and parse a file.
    """
    try:
        file_path = UPLOADS_DIR / file.filename
        with open(file_path, "wb") as f:
            f.write(await file.read())
        parsed_data = parse_data(str(file_path))
        return {"filename": file.filename, "data": parsed_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------
# Error handlers
# ------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ------------------------------
# Health check
# ------------------------------
@app.get("/health-check")
async def health_check():
    return {"status": "ok"}


# ------------------------------
# Utility: find a free port
# ------------------------------
def get_free_port(start_port=8000):
    port = start_port
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
        port += 1


# ------------------------------
# Start API in background thread for PyWebView
# ------------------------------
def start_api(port):
    try:
        uvicorn.run(app, host="127.0.0.1", port=port, reload=False)
    except Exception as e:
        print("Uvicorn failed to start:", e)


# ------------------------------
# WebView2 Handling
# ------------------------------
def has_edge_webview2():
    """Check if Microsoft Edge WebView2 runtime is installed."""
    try:
        subprocess.run(
            ["reg", "query", r"HKCU\Software\Microsoft\EdgeUpdate\Clients"],
            capture_output=True, text=True, check=True
        )
        return True
    except subprocess.CalledProcessError:
        return False


def install_edge_webview2_background():
    """Download and install Edge WebView2 silently in the background."""
    def _install():
        try:
            url = "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
            temp_dir = tempfile.mkdtemp()
            installer_path = Path(temp_dir) / "MicrosoftEdgeWebview2Setup.exe"

            with requests.get(url, stream=True) as r:
                r.raise_for_status()
                with open(installer_path, "wb") as f:
                    shutil.copyfileobj(r.raw, f)

            subprocess.run([str(installer_path), "/silent", "/install"], check=True)
            shutil.rmtree(temp_dir, ignore_errors=True)
            print("✅ Edge WebView2 installed in background.")
        except Exception as e:
            print(f"❌ Failed to install Edge WebView2: {e}")

    threading.Thread(target=_install, daemon=True).start()


# ------------------------------
# App Entry Point
# ------------------------------
if __name__ == "__main__":
    free_port = get_free_port(8000)
    threading.Thread(target=start_api, args=(free_port,), daemon=True).start()
    time.sleep(1)

    if has_edge_webview2():
        api_bridge = PyWebViewSaveAPI()
        webview.create_window(
            APP_TITLE,
            f"http://127.0.0.1:{free_port}",
            js_api=api_bridge,
            width=1200,
            height=800,
            confirm_close=True,
            min_size=(800, 600)
        )
        webview.start(gui="edgechromium")
    else:
        print("⚠ WebView2 not found. Installing in background...")
        install_edge_webview2_background()
        webbrowser.open(f"http://127.0.0.1:{free_port}")
```

```python parser.py
def parse_data(file_path: str):
    """
    Parse data from a given file path.
    """
    try:
        with open(file_path, 'r') as f:
            data = f.read()
            # Add your parsing logic here
            parsed_data = data  # Replace this with actual parsing
        return parsed_data
    except Exception as e:
        raise ValueError(f"Error parsing file: {e}")

