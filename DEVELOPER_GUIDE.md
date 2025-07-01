🧾 Invoice Extractor API – Program Flow & Developer Guide

This document explains the main program execution flow, key functions, and how developers can extend or plug in new vendor logic.

---

🗺️ Program Execution Flow

<svg width="900" height="600" viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
  <rect x="40" y="30" width="220" height="50" rx="10" fill="#e3f2fd" stroke="#1976d2" stroke-width="2"/>
  <text x="60" y="60" font-size="18" fill="#1976d2">⬆️ Client Uploads Invoice</text>
  
  <rect x="300" y="30" width="220" height="50" rx="10" fill="#fffde7" stroke="#fbc02d" stroke-width="2"/>
  <text x="320" y="60" font-size="18" fill="#fbc02d">POST /upload-invoice</text>
  
  <rect x="560" y="30" width="220" height="50" rx="10" fill="#e8f5e9" stroke="#388e3c" stroke-width="2"/>
  <text x="580" y="60" font-size="18" fill="#388e3c">mode: "ocr" or "text"</text>
  
  <rect x="300" y="120" width="220" height="50" rx="10" fill="#f3e5f5" stroke="#8e24aa" stroke-width="2"/>
  <text x="320" y="150" font-size="16" fill="#8e24aa">process_with_pdfplumber</text>
  
  <rect x="560" y="120" width="220" height="50" rx="10" fill="#f3e5f5" stroke="#8e24aa" stroke-width="2"/>
  <text x="580" y="150" font-size="16" fill="#8e24aa">process_with_ocr</text>
  
  <rect x="430" y="210" width="220" height="50" rx="10" fill="#e1f5fe" stroke="#0288d1" stroke-width="2"/>
  <text x="450" y="240" font-size="16" fill="#0288d1">Detect Vendor Template</text>
  
  <rect x="430" y="290" width="220" height="50" rx="10" fill="#fff3e0" stroke="#f57c00" stroke-width="2"/>
  <text x="450" y="320" font-size="16" fill="#f57c00">load_vendor_parser</text>
  
  <rect x="430" y="370" width="220" height="50" rx="10" fill="#fce4ec" stroke="#d81b60" stroke-width="2"/>
  <text x="450" y="400" font-size="16" fill="#d81b60">Vendor Parser: process_invoice</text>
  
  <rect x="430" y="450" width="220" height="50" rx="10" fill="#e8f5e9" stroke="#388e3c" stroke-width="2"/>
  <text x="450" y="480" font-size="16" fill="#388e3c">Insert Invoice & Items (DB)</text>
  
  <rect x="430" y="530" width="220" height="50" rx="10" fill="#fffde7" stroke="#fbc02d" stroke-width="2"/>
  <text x="450" y="560" font-size="16" fill="#fbc02d">Return API Response</text>
  
  <!-- Arrows -->
  <line x1="260" y1="55" x2="300" y2="55" stroke="#1976d2" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="520" y1="55" x2="560" y2="55" stroke="#fbc02d" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="670" y1="80" x2="670" y2="120" stroke="#388e3c" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="410" y1="80" x2="410" y2="120" stroke="#8e24aa" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="410" y1="145" x2="430" y2="235" stroke="#8e24aa" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="670" y1="170" x2="670" y2="235" stroke="#8e24aa" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="540" y1="235" x2="540" y2="290" stroke="#0288d1" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="540" y1="340" x2="540" y2="370" stroke="#f57c00" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="540" y1="420" x2="540" y2="450" stroke="#d81b60" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="540" y1="500" x2="540" y2="530" stroke="#388e3c" stroke-width="2" marker-end="url(#arrow)"/>
  
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L10,5 L0,10 L2,5 z" fill="#333"/>
    </marker>
  </defs>
</svg>

---

🔍 Key Functions & Extension Points

| Function/Module                | Purpose                                                                 | Where to Extend / Add Plugins                |
|------------------------------- |------------------------------------------------------------------------|----------------------------------------------|
| `/upload-invoice` (route)      | Main entrypoint for invoice upload and processing                       | -                                           |
| `process_with_pdfplumber`      | Handles text-based PDF extraction using PDFPlumber                      | -                                           |
| `process_with_ocr`             | Handles scanned images/PDFs using OCR (PaddleOCR)                       | -                                           |
| `template_loader.detect_template` | Detects which vendor template matches the extracted text              | Add new YAML templates for new vendors       |
| `load_vendor_parser`           | Dynamically loads the correct vendor parser module                      | Map new vendor names to parser modules here  |
| `vendor_parsers/`              | Directory for vendor-specific parsing logic                             | Add new parser modules here                  |
| `process_invoice` (in vendor module) | Processes extracted text and returns structured data               | Implement logic for new vendors here         |
| `invoice_crud`                 | Handles DB operations for invoices and items                            | -                                           |

---

🧩 How to Add Your Own Vendor Parser

1. **Create a YAML template** for your vendor in the templates directory.
2. **Write a parser module** in `vendor_parsers/ocr/` or `vendor_parsers/plumber/` (e.g., `myvendor_ocr.py` or `myvendor_pdf.py`).
3. **Map your vendor** in the `load_vendor_parser` function in `api/v1/routes.py`:
    ```python
    vendor_map = {
        "My Vendor Name": "myvendor_ocr",  # for OCR
        "My Vendor Name": "myvendor_pdf",  # for PDFPlumber
    }
    ```
4. **Implement** the `process_invoice` function in your parser module.
5. **Test** by uploading an invoice for your vendor.

---

🏗️ Other Important Endpoints

- `/invoices` – List all invoices
- `/invoices/{invoice_no}` – Get a specific invoice
- `/invoices/{invoice_no}/items` – Get items for an invoice
- `/invoices/update-invoice` – Update invoice data
- `/invoices/update-items` – Update items
- `/invoices/{invoice_no}` (DELETE) – Delete an invoice
- `/invoices/{invoice_no}/history` – Get invoice history
- `/invoices/history` – Get all invoice history

---

🛠️ Developer Notes

- **Templates:** Place Jinja2 HTML templates in the `templates/` directory.
- **Static Files:** Place static assets in the `static/` directory.
- **Database:** Connection settings are managed via the `DATABASE_URL` in `.env`. SQLAlchemy models are in `models/`. Session management is in `core/database.py`.

---

**Tip:**  
Add your new vendor logic in the correct folder, update the mapping, and provide a YAML template for seamless
