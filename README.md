🧾 Invoice Extractor API

[![Python](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.13-green.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Deploy on Render](https://img.shields.io/badge/Deploy-Render-blueviolet)](https://render.com/)

A FastAPI-based application for extracting and parsing invoice data using OCR and vendor-specific logic with PDF Plumber.

---

✨ Features

- 🖼️ Extracts invoice data from uploaded files using OCR (PaddleOCR) or PDFPlumber based on input file type (scanned image → OCR, text PDF → plumber)
- 🏷️ Vendor-specific parsing logic (extensible)
- 🔗 REST API endpoints for uploading, listing, and viewing invoices
- 🎨 Templated HTML frontend using Jinja2

---

🚀 Getting Started

1. **Clone the Repository**
```sh
git clone https://github.com/vedhanayagan9626/INVOICE-PARSER-APP.git
cd INVOICE-PARSER-APP
```

2. **Set Up Python Environment**
```sh
python -m venv invoice-env
invoice-env\Scripts\activate   # On Windows
Or
source invoice-env/bin/activate  # On Linux/Mac
```

3. **Install Dependencies**
```sh
pip install -r requirements.txt
```

4. **Configure Environment Variables**
- 📄 Copy `.env` to your project root (if not present).
- 🔑 Set your `DATABASE_URL` in `.env`.
- 🔒 Add `SECRET_KEY` in `.env`.
- 🛠️ Add any other important keys in `.env` if you extend this project.

5. **Add Template and Static Files**
- 🗂️ Place your HTML templates in the `templates/` directory.
- 🖼️ Place static files (CSS, JS, images) in the `static/` directory.

### 6. **Run the Application**
```sh
# If you have start.sh
./start.sh

# Or directly
uvicorn main:app --host 0.0.0.0 --port 10000
```

---

**🛠️ Developer Notes**

📁 Templates
- All Jinja2 HTML templates should be placed in the `templates/` directory.
- Example: `templates/index.html`, `templates/invoicelist.html`, etc.

🗂️ Static Files
- Place static assets in the `static/` directory.

**🧩 Extending Vendor Parser Logic**
- STEP 1
         - Each vendor can have its own parser module so create a new parser for new template on your own logic if needed.
         - Create your own parser.pyfile using REGEX, positional mappings, table extractor like pdfplumber, camelot or any other table parsers based on a custom template.
         - To add or extend vendor-specific invoice parsing, add your logic in the `vendor_parsers/` directory.
         - You have to add  parser .pyfile  for OCR in `vendor_parsers/ocr/` and PDFplumber in `vendor_parsers/plumber/`.
- STEP 2
         - Generate a basic `.yml` for template with `vendor name` and `keywords` to recognize and choose a vendor parser based on detected keywords.
  ```yaml
  vendor: Satrun Technologies
  keywords: ["SATRUN TECHNOLOGIES", "satruntechnologies@hotmail.com"]
  ```
- STEP 3
         - Once created, place parsers in the appropriate folder as mentioned above. Add their `vendor name`: `parser name` (without extension) in the `load_vendor_parser(vendor_name, mode)` function:
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
- Update the routing or parsing logic in `api/v1/routes.py` or the relevant handler to use your new parser.

---

🗄️ Database
- Connection settings are managed via the `DATABASE_URL` in `.env`.
- SQLAlchemy models are in `models/`.
- Database session management is in `core/database.py`.
- You can modify the extracting output based on your requirement and store them in your DB.
NOTES: This app using MSSQL server(which Db creation file is not added you can create a db on your own by refering models/models.py) , i have created my db and its tables manually and mapped them in a models/ , you can also create a db migrations to make changes in tables.
---

🤝 Contributing

1. 🍴 Fork the repo
2. 🛠️ Create your feature branch (`git checkout -b feature/YourFeature`)
3. 💾 Commit your changes
4. 🚀 Push to the branch (`git push origin feature/YourFeature`)
5. 📬 Open a pull request

---

📄 License

MIT License

---

**❓ For any questions or issues, please open an issue on GitHub.**
