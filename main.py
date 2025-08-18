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
async def index(request: Request, file: str, token: Optional[str] = None):
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
        return templates.TemplateResponse("invoicelist.html", {"request": request})
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