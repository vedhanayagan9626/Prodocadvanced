# import re

# def extract_invoice_fields(ocr_results):
#     # Helper to find text by regex
#     def find_text(pattern, ocr_results, flags=re.IGNORECASE):
#         for item in ocr_results:
#             if re.search(pattern, item['text'], flags):
#                 return item['text']
#         return ""

#     # Seller details (top block)
#     seller_block = []
#     for item in ocr_results:
#         if item['bbox'][0][1] < 200:  # Y coordinate threshold for header
#             seller_block.append(item['text'])
#     seller_text = " ".join(seller_block)
#     seller_name = re.search(r"^([A-Z\s]+TECHNOLOGIES)", seller_text)
#     seller_name = seller_name.group(1).strip() if seller_name else ""

#     # Invoice number
#     invoice_no = find_text(r"Invoice No[:\s]*([A-Za-z0-9\-]+)", ocr_results)
#     invoice_no = re.sub(r"^Invoice No[:\s]*", "", invoice_no)

#     # Invoice date
#     invoice_date = find_text(r"Invoice date[:\s]*([\d/-]+)", ocr_results)
#     invoice_date = re.sub(r"^Invoice date[:\s]*", "", invoice_date)

#     # Buyer details (Bill to Party)
#     buyer_block = []
#     bill_to_found = False
#     for item in ocr_results:
#         if "Bill to Party" in item['text']:
#             bill_to_found = True
#             continue
#         if bill_to_found:
#             if "GST" in item['text'] or "State Name" in item['text']:
#                 break
#             buyer_block.append(item['text'])
#     buyer_name = buyer_block[0] if buyer_block else ""
#     buyer_address = " ".join(buyer_block[1:]) if len(buyer_block) > 1 else ""

#     # GSTINs
#     seller_gstin = find_text(r"GSTIN[:\s]*([0-9A-Z]+)", ocr_results)
#     seller_gstin = re.sub(r"^GSTIN[:\s]*", "", seller_gstin)
#     buyer_gstin = find_text(r"GST NO[:\s]*([0-9A-Z]+)", ocr_results)
#     buyer_gstin = re.sub(r"^GST NO[:\s]*", "", buyer_gstin)

#     # Table extraction (simple row grouping by Y)
#     table_rows = []
#     for item in ocr_results:
#         # Only rows in the table area (Y between 400 and 800 for this template)
#         y = item['bbox'][0][1]
#         if 400 < y < 800:
#             table_rows.append(item)
#     # Group by similar Y (row-wise)
#     from collections import defaultdict
#     row_dict = defaultdict(list)
#     for item in table_rows:
#         y = item['bbox'][0][1]
#         row_key = int(y // 20)  # group by 20px
#         row_dict[row_key].append(item)
#     # Parse each row
#     items = []
#     for row in sorted(row_dict.keys()):
#         texts = [i['text'] for i in sorted(row_dict[row], key=lambda x: x['bbox'][0][0])]
#         # Heuristic: skip header and empty rows
#         if texts and texts[0].strip().isdigit():
#             items.append(texts)

#     # Output
#     return {
#         "seller_name": seller_name,
#         "seller_gstin": seller_gstin,
#         "invoice_no": invoice_no,
#         "invoice_date": invoice_date,
#         "buyer_name": buyer_name,
#         "buyer_address": buyer_address,
#         "buyer_gstin": buyer_gstin,
#         "items": items
#     }

# # Example usage:
# from paddleocr import PaddleOCR
# ocr = PaddleOCR(use_angle_cls=True, lang='en')
# result = ocr.ocr('invoice1.jpg', cls=True)
# ocr_results = [{'text': line[1][0], 'bbox': line[0]} for line in result[0]]
# fields = extract_invoice_fields(ocr_results)
# print(fields)


# {'seller_name': 'SATRUN TECHNOLOGIES',
#   'seller_gstin': '29ADUFS7136G1ZD',
#     'invoice_no': 'GST246', 
#     'invoice_date': '25/10/2024',
#       'buyer_name': 'Creativetech',
#       'buyer_address': '3rd Floor,Vishnu Towers, Amirtha Nagar Dharga, Hosur-635126',
#       'buyer_gstin': '33AASFC6348M1ZV',
#  'items': [['8473', '1', '9,000.00', '9,000.00', '18%', '1,620.00', '10,620.00']]}

import re
from decimal import Decimal
from collections import defaultdict

def safe_convert(val, typ):
    try:
        return typ(val.replace(",", "")) if isinstance(val, str) else typ(val)
    except Exception:
        return typ()

def clean_number(value):
    return value.replace(",", "") if isinstance(value, str) else value

def group_rows_by_y(ocr_results, y_thresh=15):
    rows = []
    ocr_results = sorted(ocr_results, key=lambda x: x['bbox'][0][1])
    current_row = []
    last_y = None
    for item in ocr_results:
        y = item['bbox'][0][1]
        if last_y is None or abs(y - last_y) <= y_thresh:
            current_row.append(item)
        else:
            if current_row:
                rows.append(current_row)
            current_row = [item]
        last_y = y
    if current_row:
        rows.append(current_row)
    return rows

def extract_invoice_fields_from_ocr(ocr_results):
    # --- Extract header fields ---
    def find_text(pattern):
        for item in ocr_results:
            m = re.search(pattern, item['text'], re.IGNORECASE)
            if m:
                return m.group(1) if m.groups() else item['text']
        return ""

    invoice_number = find_text(r"Invoice\s*No[:\-]?\s*([A-Za-z0-9\-]+)")
    invoice_date = find_text(r"Invoice\s*date[:\-]?\s*([\d/-]+)")
    gst_number = find_text(r"GSTIN[:\s]*([0-9A-Z]{15})")
    from_address = find_text(r"SATRUN TECHNOLOGIES")
    # Buyer address: concatenate lines after "Bill to Party"
    to_address = ""
    bill_to_idx = None
    for idx, item in enumerate(ocr_results):
        if "Bill to Party" in item['text']:
            bill_to_idx = idx
            break
    if bill_to_idx is not None:
        addr_lines = []
        for item in ocr_results[bill_to_idx+1:bill_to_idx+6]:
            if re.search(r"GST|State Name|Code", item['text'], re.IGNORECASE):
                break
            addr_lines.append(item['text'])
        to_address = " ".join(addr_lines).strip()

    # --- Group table rows ---
    table_start_y = None
    for item in ocr_results:
        if re.search(r"Product\s*Description", item['text'], re.IGNORECASE):
            table_start_y = item['bbox'][0][1]
            break
    if table_start_y is None:
        return {}

    table_rows = [item for item in ocr_results if item['bbox'][0][1] >= table_start_y]
    grouped_rows = group_rows_by_y(table_rows, y_thresh=18)

    # --- Detect header row and map columns ---
    header_row = None
    for row in grouped_rows:
        header_texts = [cell['text'].strip().lower() for cell in row]
        if any("description" in t for t in header_texts):
            header_row = row
            break
    if not header_row:
        return {}

    # Fuzzy column mapping
    def find_col(header_row, keywords):
        for idx, cell in enumerate(header_row):
            for kw in keywords:
                if kw in cell['text'].strip().lower():
                    return idx
        return None

    idx_sno = find_col(header_row, ["s.", "sno", "no"])
    idx_desc = find_col(header_row, ["description"])
    idx_hsn = find_col(header_row, ["hsn"])
    idx_part = find_col(header_row, ["part"])
    idx_qty = find_col(header_row, ["qty"])
    idx_rate = find_col(header_row, ["rate"])
    idx_amount = find_col(header_row, ["amount"])
    idx_discount = find_col(header_row, ["discount"])
    idx_taxable = find_col(header_row, ["taxable"])
    idx_igst_rate = find_col(header_row, ["igst"])
    idx_total = find_col(header_row, ["total"])

    # --- Parse items, handle multi-line descriptions ---
    items = []
    current_item = None
    for row in grouped_rows:
        texts = [cell['text'].strip() for cell in row]
        # Heuristic: first cell starts with a digit (S.No.)
        if texts and idx_sno is not None and idx_sno < len(texts) and texts[idx_sno].isdigit():
            if current_item:
                items.append(current_item)
            current_item = {
                "invoice_number": invoice_number,
                "s_no": texts[idx_sno] if idx_sno < len(texts) else "",
                "description": texts[idx_desc] if idx_desc is not None and idx_desc < len(texts) else "",
                "hsn": texts[idx_hsn] if idx_hsn is not None and idx_hsn < len(texts) else "",
                "part_no": texts[idx_part] if idx_part is not None and idx_part < len(texts) else "",
                "quantity": texts[idx_qty] if idx_qty is not None and idx_qty < len(texts) else "",
                "price_per_unit": texts[idx_rate] if idx_rate is not None and idx_rate < len(texts) else "",
                "amount": Decimal(clean_number(texts[idx_amount])) if idx_amount is not None and idx_amount < len(texts) and clean_number(texts[idx_amount]).replace('.', '', 1).isdigit() else Decimal("0.00"),
                "discount": texts[idx_discount] if idx_discount is not None and idx_discount < len(texts) else "",
                "taxable_value": texts[idx_taxable] if idx_taxable is not None and idx_taxable < len(texts) else "",
                "igst_rate": texts[idx_igst_rate] if idx_igst_rate is not None and idx_igst_rate < len(texts) else "",
                "total": Decimal(clean_number(texts[idx_total])) if idx_total is not None and idx_total < len(texts) and clean_number(texts[idx_total]).replace('.', '', 1).isdigit() else Decimal("0.00"),
            }
        elif current_item and idx_desc is not None and idx_desc < len(texts):
            # Multi-line description: append to previous
            current_item["description"] += " " + texts[idx_desc]
    if current_item:
        items.append(current_item)

    # --- Extract totals and taxes ---
    total_before_tax = find_text(r"Total Amount before Tax\s*([\d,\.]+)")
    output_igst = find_text(r"Output IGST@18%\s*([\d,\.]+)")
    total_tax = find_text(r"Total Tax Amount\s*([\d,\.]+)")
    total_after_tax = find_text(r"Total Amount after Tax\s*([\d,\.]+)")
    total_in_words = ""
    for item in ocr_results:
        if "Total Invoice amount in words" in item['text']:
            idx = ocr_results.index(item)
            if idx+1 < len(ocr_results):
                total_in_words = ocr_results[idx+1]['text']
            break

    # --- Extract bank details ---
    bank_name = find_text(r"Bank Name[:\s]*([A-Za-z0-9 ]+)")
    bank_ac = find_text(r"Bank A/C[:\s]*([0-9]+)")
    bank_ifsc = find_text(r"Bank IFSC[:\s]*([A-Z0-9]+)")

    invoice_data = {
        "invoice_number": invoice_number,
        "invoice_date": invoice_date,
        "from_address": from_address,
        "to_address": to_address,
        "gst_number": gst_number,
        "total_before_tax": Decimal(total_before_tax.replace(",", "")) if total_before_tax else Decimal("0.00"),
        "output_igst": Decimal(output_igst.replace(",", "")) if output_igst else Decimal("0.00"),
        "total_tax": Decimal(total_tax.replace(",", "")) if total_tax else Decimal("0.00"),
        "total_after_tax": Decimal(total_after_tax.replace(",", "")) if total_after_tax else Decimal("0.00"),
        "total_in_words": total_in_words,
        "bank_details": {
            "bank_name": bank_name,
            "bank_ac": bank_ac,
            "bank_ifsc": bank_ifsc
        },
        "items": items
    }
    return invoice_data

# Example usage:
# ocr_results = [{'text': ..., 'bbox': ...}, ...]  # Your OCR output
# invoice_data = extract_invoice_fields_from_ocr(ocr_results)
# print(invoice_data)
# Example usage:
# ocr_results = [{'text': ..., 'bbox': ...}, ...]  # Your OCR output
# invoice_data = extract_invoice_fields_from_ocr(ocr_results)
# print(invoice_data)

# Example usage:
from paddleocr import PaddleOCR
ocr = PaddleOCR(use_angle_cls=True, lang='en')
result = ocr.ocr('invoice1.jpg', cls=True)
ocr_results = [{'text': line[1][0], 'bbox': line[0]} for line in result[0]]
print("OCR Results:", ocr_results)
invoice_data = extract_invoice_fields_from_ocr(ocr_results)
print(invoice_data)
