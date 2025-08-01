from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter, HTTPException
from api.v1.routes import router as v1_router
from core.config import TEMPLATES_DIR, STATIC_DIR
from pathlib import Path

app = FastAPI(title="Invoice Extractor API", version="1.0")

UPLOAD_FOLDER = "uploads"
# Allow all origins (for development only!)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
    expose_headers=["X-Total-Count", "X-Page", "X-Per-Page", "X-Total-Pages"]
)

#Allow specific origins (for production use)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:3000",  # React/Vue dev server
#         "https://myapp.com",       # Production frontend
#     ],
#     allow_credentials=True,
#     allow_methods=["GET", "POST", "PUT", "DELETE"],
#     allow_headers=["Authorization", "Content-Type"],
# )

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)



app.include_router(v1_router,prefix ="/api/v1")

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})

@app.get("/index", response_class=HTMLResponse)
async def index(request: Request, file: str):
    return templates.TemplateResponse("index.html", {
        "request": request,
        "filename": file  # Pass the filename to the template
    })

@app.get("/invoicelist", response_class=HTMLResponse)
async def invoicelist(request: Request):
    return templates.TemplateResponse("invoicelist.html", {"request": request})


@app.get("/api/v1/get-file")
async def get_file(filename: str):
    """Serve uploaded files for preview"""
    # Security check
    if not filename or any(c in filename for c in ['..', '/', '\\']):
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = Path(UPLOAD_FOLDER) / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine media type
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
        headers={
            'Content-Disposition': f'inline; filename="{filename}"'
        }
    )

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