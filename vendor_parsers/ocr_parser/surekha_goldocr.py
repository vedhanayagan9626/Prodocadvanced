
import re
import pandas as pd
from collections import defaultdict
from decimal import Decimal
from typing import Optional, List, Dict
# -----------------------------------
def extract_buyer_consignee_by_table(ocr_results):
    # Step 1: Flatten and sort by Y (row), then X (column)
    rows = []
    for item in ocr_results:
        text = item['text'].strip()
        box = item['bbox']
        y = min(pt[1] for pt in box)
        x = min(pt[0] for pt in box)
        rows.append({'text': text, 'y': y, 'x': x, 'box': box})
    rows.sort(key=lambda r: (r['y'], r['x']))

    # Step 2: Find the row with "Buyer Name" and "Consignee Name"
    header_row_y = None
    for r in rows:
        if "buyer name" in r['text'].lower():
            header_row_y = r['y']
            break
    if header_row_y is None:
        return {"buyer_name": "", "buyer_address": "", "consignee_name": "", "consignee_address": ""}

    # Find columns in that row
    header_row = [r for r in rows if abs(r['y'] - header_row_y) < 10]
    buyer_col = min(header_row, key=lambda r: r['x'])
    consignee_col = max(header_row, key=lambda r: r['x'])
    buyer_x = buyer_col['x']
    consignee_x = consignee_col['x']

    # Step 3: Find the first large text block after "Buyer Name" (skip labels)
    stop_keywords = ["invoice no", "date", "purity", "uom", "gstin", "gstn", "mob no"]
    buyer_details = []
    for r in rows:
        # Only consider rows below the header
        if r['y'] > header_row_y and abs(r['x'] - buyer_x) < 100:
            lower_text = r['text'].lower()
            if any(kw in lower_text for kw in stop_keywords):
                continue
            # Heuristic: likely a name if it's all caps and not a label
            if r['text'].isupper() and len(r['text']) > 5:
                buyer_details.append(r['text'])
            # Or, if it's an address (contains numbers or commas)
            elif any(c.isdigit() for c in r['text']) or ',' in r['text']:
                buyer_details.append(r['text'])

    buyer_name = buyer_details[0] if buyer_details else ""
    buyer_address = " ".join(buyer_details[1:]) if len(buyer_details) > 1 else ""

    # Consignee extraction (similar logic)
    consignee_details = []
    for r in rows:
        if r['y'] > header_row_y and abs(r['x'] - consignee_x) < 100:
            lower_text = r['text'].lower()
            if any(kw in lower_text for kw in stop_keywords):
                continue
            if r['text'].isupper() and len(r['text']) > 5:
                consignee_details.append(r['text'])
            elif any(c.isdigit() for c in r['text']) or ',' in r['text']:
                consignee_details.append(r['text'])

    consignee_name = consignee_details[0] if consignee_details else ""
    consignee_address = " ".join(consignee_details[1:]) if len(consignee_details) > 1 else ""

    return {
        "buyer_name": buyer_name,
        "buyer_address": buyer_address,
        "consignee_name": consignee_name,
        "consignee_address": consignee_address
    }

def extract_fields(text: str, ocr_results) -> Dict:
    # Seller (From) Name and Address
    seller_name = re.search(r"(SUREKHA GOLD ?PRIVATE LIMITED)", text, re.IGNORECASE)
    seller_addr = re.search(r"(26/452B1,VAZHAPPILLY[\s\S]*?MUDAVUR,MUVATTUPUZHA)", text, re.IGNORECASE)
    from_address = ""
    if seller_name and seller_addr:
        addr_clean = seller_addr.group(1).replace('\n', ' ').strip() if seller_addr else ""
        from_address = f"{seller_name.group(1)}, {addr_clean}" if seller_name and seller_addr else ""
    elif seller_name:
        from_address = seller_name.group(1)
    elif seller_addr:
        from_address = seller_addr.group(1).replace('\n', ' ').strip()

    buyer_consignee = extract_buyer_consignee_by_table(ocr_results)
    print("[DEBUG] Buyer/Consignee Extracted:", buyer_consignee)

    to_address = f"{buyer_consignee['buyer_name']}, {buyer_consignee['buyer_address'] if buyer_consignee['buyer_name'] or buyer_consignee['buyer_address'] else buyer_consignee['consignee_name']}, {buyer_consignee['consignee_address']}" if buyer_consignee['buyer_name'] or buyer_consignee['buyer_address'] or buyer_consignee['consignee_name'] or buyer_consignee['consignee_address'] else "<Unknown>"

    # ...rest of your extraction logic unchanged...
    invoice_no = re.search(r"Invoice\s*No[:.]*\s*([A-Z0-9\-\/]+)", text, re.IGNORECASE)
    gst_no = re.search(r"GSTIN/UIN[:\s]*([0-9A-Z]{15})", text, re.IGNORECASE)
    invoice_date = re.search(r"Date[:.]*\s*([0-9]{1,2}[-/][A-Za-z]{3}[-/][0-9]{2,4}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})", text, re.IGNORECASE)
    gold_rate = re.search(r"Gold\s*Rate[:\s]*([0-9,]+\.\d{4})", text, re.IGNORECASE)
    total_amount = re.search(r"Total Amount Payable\s*([0-9,]+\.\d{2})", text, re.IGNORECASE)
    cgst = re.search(r"CGST\s*Amount\s*@\s*[0-9\.]+%\s*([0-9,]+\.\d{2})", text, re.IGNORECASE)
    sgst = re.search(r"SGST\s*Amount\s*@\s*[0-9\.]+%\s*([0-9,]+\.\d{2})", text, re.IGNORECASE)
    cgst_per = re.search(r"CGST\s*Amount\s*@\s*([0-9\.]+)%", text, re.IGNORECASE)
    sgst_per = re.search(r"SGST\s*Amount\s*@\s*([0-9\.]+)%", text, re.IGNORECASE)
    
    taxes = []
    if cgst and cgst_per:
        taxes.append(f"CGST-per: {cgst_per.group(1)},CGST-Amt: {cgst.group(1)}")
    elif cgst:
        taxes.append(f"CGST-Amt: {cgst.group(1)}")
    if sgst and sgst_per:
        taxes.append(f"SGST-per: {sgst_per.group(1)},SGST-Amt: {sgst.group(1)}")
    elif sgst:
        taxes.append(f"SGST-Amt: {sgst.group(1)}")
    taxes_str = ", ".join(taxes) if taxes else None

    qty_matches = re.findall(r"\b([0-9]+\.[0-9]+)\b", text)
    total_qty = None
    if qty_matches:
        try:
            total_qty = sum(q.replace(',', '') for q in qty_matches)
        except Exception:
            total_qty = None
    
    if gold_rate:
        print(f"Gold rate extracted: {gold_rate.group(1)}")
    else:
        print("Gold rate not found.")

    items = []
    item_lines = re.findall(r"(\d+\s+[A-Z ]+\d+\s+\d+\s+\d+\s+[0-9,\.]+)", text)
    for line in item_lines:
        parts = line.split()
        if len(parts) >= 5:
            items.append({
                "Description": " ".join(parts[1:-4]),
                "HSN": parts[-4],
                "Quantity": parts[-3],
                "Rate": parts[-2],
                "Amount": parts[-1]
            })

    return {
        "InvoiceNo": invoice_no.group(1) if invoice_no else "",
        "FromAddress": from_address,
        "ToAddress": to_address,
        "GSTNo": gst_no.group(1) if gst_no else "",
        "InvoiceDate": invoice_date.group(1) if invoice_date else "",
        "TotalAmount": total_amount.group(1).replace(',', '') if total_amount else None,
        "Taxes": taxes_str,
        "TotalQuantity": total_qty,
        "Items": items
    }

# -----------------------------------
# Table Reconstruction from OCR
# -----------------------------------

def cluster_lines_by_y(ocr_data, y_threshold=12):
    lines = defaultdict(list)
    sorted_items = sorted(ocr_data, key=lambda x: x['bbox'][0][1])
    current_y = None
    line_index = -1
    for item in sorted_items:
        y = item['bbox'][0][1]
        if current_y is None or abs(y - current_y) > y_threshold:
            line_index += 1
            current_y = y
        lines[line_index].append(item)
    return list(lines.values())

def is_header_line(text, expected_keywords):
    return sum(1 for kw in expected_keywords if kw.lower() in text.lower()) >= 2

def reconstruct_table(ocr_data):
    expected_keywords = ["Description", "HSN", "Qty", "WT", "Rate", "Value"]
    end_keywords = ["Taxable Amount", "Total Amount"]

    lines = cluster_lines_by_y(ocr_data)
    table_started = False
    header_items = []
    rows = []

    for line in lines:
        line_text = " ".join([x['text'] for x in line])

        if not table_started and is_header_line(line_text, expected_keywords):
            table_started = True
            header_items = sorted(line, key=lambda x: x['bbox'][0][0])
            continue

        if table_started:
            if any(end_kw.lower() in line_text.lower() for end_kw in end_keywords):
                break
            # row = [correct_spelling(x['text']) for x in sorted(line, key=lambda x: x['bbox'][0][0])]
            row = [x['text'] for x in sorted(line, key=lambda x: x['bbox'][0][0])]
            rows.append(row)

    if not header_items:
        return pd.DataFrame()

    # col_names = [correct_spelling(x['text']) for x in header_items]
    col_names = [x['text'] for x in header_items]
    # Normalize rows
    normalized = []
    for row in rows:
        if len(row) < len(col_names):
            row.extend([''] * (len(col_names) - len(row)))
        normalized.append(row[:len(col_names)])

    return pd.DataFrame(normalized, columns=col_names)

# -----------------------------------
# Main Entry Point
# -----------------------------------
def process_invoice(text: str, matched_template: dict, path: str):
    from core.pdf_reader import convert_pdf_to_images, ocr_image
    from paddleocr import PaddleOCR
    if path.lower().endswith(".pdf"):
        images = convert_pdf_to_images(path)
        if not images:
            raise ValueError("[ERROR] No images found after converting PDF.")
    else :
        images =  path if isinstance(path, list) else [path]
    ocr_results = []
    for img in images:
        result = PaddleOCR(use_angle_cls=True, lang='en').ocr(img, cls=True)
        for block in result:
            for line in block:
                ocr_results.append({
                    'text': line[1][0],
                    'bbox': line[0]
                })
                print(f"[DEBUG] OCR Result: {line[1][0]} at {line[0]}")

    ocr_text = "\n".join([item['text'] for item in ocr_results])
    fields = extract_fields(ocr_text, ocr_results)
    print(f"[DEBUG] Extracted fields: {fields}")
    # If you want to correct spelling, uncomment the next line
    # fields = {k: correct_spelling(v) for k, v in fields.items()}
    table_df = reconstruct_table(ocr_results)
    print(f"[DEBUG] Reconstructed table:\n{table_df}")

    return {
        "custom_fields": fields,
        "custom_table": table_df.to_dict(orient="records")
    }
