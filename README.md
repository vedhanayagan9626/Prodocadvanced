# Invoice Extractor API

A FastAPI-based application for extracting and parsing invoice data using OCR and vendor-specific logic using PDF Plumber.

---

## Features

- Extracts invoice data from uploaded files using OCR (PaddleOCR) or PDFPlumber based on input file type(scannedimage - ocr, text PDF - plumber)
- Vendor-specific parsing logic (extensible)
- REST API endpoints for uploading, listing, and viewing invoices
- Templated HTML frontend using Jinja2

---

## Getting Started

### 1. **Clone the Repository**
```sh
git clone https://github.com/vedhanayagan9626/INVOICE-PARSER-APP.git
cd INVOICE-PARSER-APP
```

### 2. **Set Up Python Environment**
```sh
python -m venv invoice-env
invoice-env\Scripts\activate   # On Windows
# Or
source invoice-env/bin/activate  # On Linux/Mac
```

### 3. **Install Dependencies**
```sh
pip install -r requirements.txt
```

### 4. **Configure Environment Variables**
- Copy `.env` to your project root (if not present).
- Set your `DATABASE_URL` in `.env`.
- Add `SECRET_KEY` in `.env`.
- Likewise add important keys in '.env' if you where extending this project .
  
### 5. **Add Template and Static Files**
- Place your HTML templates in the `templates/` directory.
- Place static files (CSS, JS, images) in the `static/` directory.

### 6. **Run the Application**
```sh
# If you have start.sh
./start.sh

# Or directly
uvicorn main:app --host 0.0.0.0 --port 10000
```

---

## Developer Notes

### **Templates**
- All Jinja2 HTML templates should be placed in the `templates/` directory.
- Example: `templates/index.html`, `templates/invoicelist.html`, etc.

### **Static Files**
- Place static assets in the `static/` directory.

### **Extending Vendor Parser Logic**
- To add or extend vendor-specific invoice parsing, add your logic in the `vendor_parsers/` directory.
- You can add seperate logic for OCR in `vendor_parsers/ocr/` and PDF plumber in `vendor_parsers/plumber/` based on a custom template .
- Generate a basic .yml for template with `vendor name` and 'keywords` to recognize and choose a vendor parser based on detected keywords.
  eg.  `vendor: Satrun Technologies
        keywords: ["SATRUN TECHNOLOGIES", "satruntechnologies@hotmail.com"] `
- Each vendor can have its own parser module.
  Once Created a parsers and placed them in a appropiate folder as mentioned above add there `vendor name`: `parser name` (without extention)
  in a `def load_vendor_parser(vendor_name, mode)` function.
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
  
- Update the routing or parsing logic in `api/v1/routes.py` or the relevant handler to use your new parser.

### **Database**
- Connection settings are managed via the `DATABASE_URL` in `.env`.
- SQLAlchemy models are in `models/`.
- Database session management is in `core/database.py`.
- If you want you can modify a extracting output based on your requirement and store them in your db.
---

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a pull request

---

## License

MIT License

---

**For any questions or issues, please open an issue on GitHub.**
