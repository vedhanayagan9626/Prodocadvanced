from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware import Middleware
from fastapi import Cookie
from jose import JWTError, jwt
from api.v1.routes import router as v1_router
from api.v1.auth import router as auth_router
from core.config import TEMPLATES_DIR, STATIC_DIR, SECRET_KEY, ALGORITHM
from pathlib import Path
from typing import Optional
import os

# Initialize FastAPI app
app = FastAPI(
    title="Invoice Extractor API",
    version="1.0",
    middleware=[
        Middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    ]
)

# Configuration
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Mount static files and templates
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

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

# Include routers
app.include_router(v1_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1/auth")

# Frontend routes
@app.get("/", response_class=HTMLResponse)
async def home(request: Request, token: Optional[str] = Cookie(None)):
    if not token:
        return templates.TemplateResponse("login_redirect.html", {"request": request})
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

# File serving endpoint
@app.get("/api/v1/get-file")
async def get_file(filename: str):
    """Serve uploaded files for preview"""
    if not filename or any(c in filename for c in ['..', '/', '\\']):
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = Path(UPLOAD_FOLDER) / filename
    
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

# Error handlers
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

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}