# 🧾 Invoice Extractor API – Developer Flow & Extension Guide

This guide explains the main program execution flow, key functions, and how to extend the system with new vendor logic.

---

## 🚦 Program Execution Flow

1. **⬆️ Client Uploads Invoice**
    - Endpoint: `POST /upload-invoice`
    - Accepts: PDF or image file, and a `mode` (`ocr` or `text`)

2. **🔀 Mode Selection**
    - If `mode == "text"`:  
      → Calls `process_with_pdfplumber()`
    - If `mode == "ocr"`:  
      → Calls `process_with_ocr()`

3. **🧠 Text Extraction**
    - `process_with_pdfplumber`: Extracts text from text-based PDFs.
    - `process_with_ocr`: Extracts text from scanned PDFs/images using OCR.

4. **🔎 Vendor Template Detection**
    - Calls `template_loader.detect_template()` to match extracted text to a vendor YAML template.

5. **🧩 Vendor Parser Loading**
    - Calls `load_vendor_parser(vendor, mode)` to dynamically import the correct parser module from `vendor_parsers/`.

6. **📦 Invoice Processing**
    - Calls `vendor_module.process_invoice()` to parse the invoice and extract structured data.

7. **💾 Database Operations**
    - Uses `invoice_crud.insert_invoice_orm()` and `insert_items_orm()` to save invoice and items to the database.

8. **📤 API Response**
    - Returns the parsed invoice and items as a JSON response.

---

## 🛠️ Key Functions & Extension Points

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

## 🧩 How to Add Your Own Vendor Parser

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

## 📚 Other Important Endpoints

- `GET /invoices` – List all invoices
- `GET /invoices/{invoice_no}` – Get a specific invoice
- `GET /invoices/{invoice_no}/items` – Get items for an invoice
- `POST /invoices/update-invoice` – Update invoice data
- `POST /invoices/update-items` – Update items
- `DELETE /invoices/{invoice_no}` – Delete an invoice
- `GET /invoices/{invoice_no}/history` – Get invoice history
- `GET /invoices/history` – Get all invoice history

---

## 📝 Developer Notes

- **Templates:** Place Jinja2 HTML templates in the `templates/` directory.
- **Static Files:** Place static assets in the `static/` directory.
- **Database:** Connection settings are managed via the `DATABASE_URL` in `.env`. SQLAlchemy models are in `models/`. Session management is in `core/database.py`.

---

**Tip:**  
Add your new vendor logic in the correct folder, update the mapping, and provide a YAML template for seamless integration!

---
