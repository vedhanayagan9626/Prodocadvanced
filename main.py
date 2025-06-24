from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from api.v1.routes import router as v1_router
from core.config import TEMPLATES_DIR, STATIC_DIR

app = FastAPI(title="Invoice Extractor API", version="1.0")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

app.include_router(v1_router,prefix ="/api/v1")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/invoicelist", response_class=HTMLResponse)
async def invoicelist(request: Request):
    return templates.TemplateResponse("invoicelist.html", {"request": request})

@app.get("/upload_section", response_class=HTMLResponse)
async def upload_section(request: Request):
    return templates.TemplateResponse("upload_section.html", {"request": request})