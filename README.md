# 📄 Invoice Extractor API

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Stars](https://img.shields.io/github/stars/vedhanayagan9626/INVOICE-PARSER-APP?style=social)

A **FastAPI**-based application for extracting and parsing invoice data using OCR (PaddleOCR) and vendor-specific logic (PDFPlumber).

---

## ✨ Features

- 🧾 Extracts invoice data from uploaded files:
  - Scanned images → **OCR (PaddleOCR)**
  - Text PDFs → **PDFPlumber**
- 🏷️ Vendor-specific, easily extensible parsing logic
- ⚙️ REST API endpoints for uploading, listing, and viewing invoices
- 🎨 Templated HTML frontend using **Jinja2**

---

## 🚀 Getting Started

### ✅ 1. Clone the Repository
```bash
git clone https://github.com/vedhanayagan9626/INVOICE-PARSER-APP.git
cd INVOICE-PARSER-APP
🐍 2. Set Up Python Environment
bash
Copy
Edit
python -m venv invoice-env
invoice-env\Scripts\activate   # On Windows
# or
source invoice-env/bin/activate  # On Linux/Mac
📦 3. Install Dependencies
bash
Copy
Edit
pip install -r requirements.txt
🔑 4. Configure Environment Variables
Create a .env file in the project root:

env
Copy
Edit
DATABASE_URL=your_database_url
SECRET_KEY=your_secure_generated_secret_key
Add other keys as needed if you extend the project.

🖼️ 5. Add Templates & Static Files
Place HTML templates in templates/ (e.g., index.html, invoicelist.html)

Place CSS, JS, and images in static/

▶️ 6. Run the Application
bash
Copy
Edit
# If you have a start script
./start.sh

# Or directly with uvicorn
uvicorn main:app --host 0.0.0.0 --port 10000
🛠 Developer Notes
📂 Templates
All Jinja2 HTML templates → templates/ directory.

📂 Static Files
Static assets → static/ directory.

🧩 Extending Vendor Parser Logic
Add vendor parsers in vendor_parsers/:

OCR logic → vendor_parsers/ocr/

PDFPlumber logic → vendor_parsers/plumber/

Create a YAML file to map vendor name & keywords:

yaml
Copy
Edit
vendor: Satrun Technologies
keywords: ["SATRUN TECHNOLOGIES", "satruntechnologies@hotmail.com"]
Map your parser in load_vendor_parser(vendor_name, mode):

python
Copy
Edit
if mode == 'plumber':
    vendor_map = {
        "Surekha Gold Private Limited": "surekha_goldpdf",
        "Satrun Technologies": "satruntech_pdf",
        "Nucleus Analytics Private Limited": "Nucleus_pdf"
    }
elif mode == 'ocr':
    vendor_map = {
        "Surekha Gold Private Limited": "surekha_goldocr",
        "Satrun Technologies": "satruntech_ocr",
        "Silver & C.Z International": "silver_czocr"
    }
Update routing or parsing logic in api/v1/routes.py.

🗄️ Database
Connection settings → DATABASE_URL in .env

Models → models/ directory

DB session & engine → core/database.py

Customize how extracted data is stored as needed.

🤝 Contributing Guide
We welcome contributions!

📌 Steps:
Fork this repository.

Clone your fork:

bash
Copy
Edit
git clone https://github.com/yourusername/INVOICE-PARSER-APP.git
Create a new branch:

bash
Copy
Edit
git checkout -b feature/YourFeatureName
Make your changes and commit:

bash
Copy
Edit
git commit -m "Add YourFeatureName"
Push to your fork:

bash
Copy
Edit
git push origin feature/YourFeatureName
Open a Pull Request on GitHub.

✅ Please follow clean code practices and keep commits clear and descriptive.

📄 License
This project is licensed under the MIT License.

❓ Need help?
Open an issue on GitHub

Made with ❤️ by Vedhanayagan
