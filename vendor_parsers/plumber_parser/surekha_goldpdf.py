
import re
import pandas as pd
from collections import defaultdict

FIELD_PATTERNS = {
    "irn": r"IRN[:\s-]*([a-fA-F0-9\-]{30,})",
    "ack_no": r"Ack\s*No[:.]*\s*([0-9]{10,})",
    "ack_date": r"Ack\s*Date[:.]*\s*([\dA-Za-z\-]+)",
    "invoice_number": r"Invoice\s*No[:.]*\s*([A-Z0-9\-\/]+)",
    "invoice_date": r"Date[:.]*\s*([0-9]{1,2}[A-Za-z0-9\-]+)",
    "seller_name": r"SUREKHA GOLD PRIVATE LIMITED",
    "seller_gstin": r"GSTIN/UIN[:\s]*([0-9A-Z]{15})",
    "seller_email": r"E-Mail\s*[:]*\s*([\w\.-]+@[\w\.-]+)",
    "buyer_gstin": r"GSTN ?[:\-]?\s*([0-9A-Z]{15})",
    "taxable_amount": r"Taxable Amount\s*([\d,]+\.\d{2})",
    "cgst_amt": r"CGST Amount.*?([\d,]+\.\d{2})",
    "sgst_amt": r"SGST Amount.*?([\d,]+\.\d{2})",
    "total_amount": r"Total Amount Payable\s*([\d,]+\.\d{2})",
    "total_in_words": r"Total In Words\s*:?[\s]*INR\s*(.*)",
    "bank_name": r"Bank[\s:_-]*:?[\s]*([A-Z &]+)",
    "account_number": r"AICNo[\s:_-]*:?[\s]*([0-9]+)",
    "ifsc": r"IFSCode[\s:_-]*:?[\s]*([A-Z0-9]+)"
}

def extract_fields(text: str):
    fields = {}
    for key, pattern in FIELD_PATTERNS.items():
        m = re.search(pattern, text, re.IGNORECASE)
        fields[key] = m.group(1).strip() if m and m.groups() else ""
    return fields

def cluster_lines_by_y(ocr_data, y_threshold=10):
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
    match_count = sum(1 for word in expected_keywords if word.lower() in text.lower())
    return match_count >= max(2, len(expected_keywords) // 2)

def reconstruct_table(ocr_data, template):
    start_keywords = template['table'].get('header_keywords', [])
    end_keywords = template['table'].get('end_keywords', ['taxable amount'])

    header_found = False
    header_line_items = []
    lines = cluster_lines_by_y(ocr_data)

    table_rows = []

    for line_items in lines:
        line_text = " ".join([item['text'] for item in line_items])

        if not header_found and is_header_line(line_text, start_keywords):
            header_found = True
            header_line_items = sorted(line_items, key=lambda x: x['bbox'][0][0])
            continue

        if header_found:
            sorted_line = sorted(line_items, key=lambda x: x['bbox'][0][0])
            row = [item['text'] for item in sorted_line]
            table_rows.append(row)

            if any(end_kw.lower() in item['text'].lower() for item in sorted_line for end_kw in end_keywords):
                break

    column_count = len(header_line_items)
    normalized_rows = []
    for row in table_rows:
        if len(row) < column_count:
            row.extend([''] * (column_count - len(row)))
        elif len(row) > column_count:
            row = row[:column_count]
        normalized_rows.append(row)

    column_names = [item['text'] for item in header_line_items]
    return pd.DataFrame(normalized_rows, columns=column_names)

def process_invoice_with_paddleocr(ocr_data, template):
    full_text = " ".join([item['text'] for item in ocr_data])
    fields = extract_fields(full_text)
    table_df = reconstruct_table(ocr_data, template)
    return {
        "vendor": template['vendor'],
        "custom_fields": fields,
        "custom_table": table_df.to_dict(orient="records")
    }
