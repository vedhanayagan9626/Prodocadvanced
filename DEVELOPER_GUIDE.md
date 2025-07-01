🧾 Invoice Extractor API – Program Flow & Developer Guide

This document explains the main program execution flow, key functions, and how developers can extend or plug in new vendor logic.

---

🗺️ Program Execution Flow

```mermaid
flowchart TD
    A[Client Uploads Invoice] --> B[POST /upload-invoice]
    B --> C{mode: "ocr" or "text"}
    C -- "text" --> D[process_with_pdfplumber]
    C -- "ocr" --> E[process_with_ocr]
    D & E --> F[Detect Vendor Template]
    F --> G[load_vendor_parser]
    G --> H[Vendor Parser: process_invoice]
    H --> I[Extracted Data Returned]
    I --> J[Insert Invoice & Items (invoice_crud)]
    J --> K[Save to Database]
    K --> L[Return API Response]
```

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
