# -*- coding: utf-8 -*-
import pdfplumber
import re
from paddleocr import PaddleOCR
import numpy as np
from decimal import Decimal

ocr = PaddleOCR(use_angle_cls=True, lang='en')

def clean_number(value):
    return value.replace(",", "") if isinstance(value, str) else value

def safe_convert(value, to_type):
    try:
        if to_type == float:
            return float(clean_number(value))
        elif to_type == int:
            return int(clean_number(value))
        elif to_type == str:
            return str(value).strip()
        else:
            return value
    except (ValueError, TypeError):
        return None

def is_address_line(line):
    states = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
        "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
        "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
        "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
        "Delhi", "Puducherry", "Chandigarh", "Jammu", "Kashmir", "Ladakh"
    ]
    if any(state.lower() in line.lower() for state in states):
        return True
    if re.search(r'\b\d{6}\b', line):  # PIN code
        return True
    if re.search(r'road|block|sector|floor|shop|no\.|opp\.|near|main|colony|avenue|layout|city|market|building|street', line, re.IGNORECASE):
        return True
    return False

def extract_buyer_address(lines, buyer_name_idx):
    address_lines = []
    for j in range(buyer_name_idx+1, min(buyer_name_idx+5, len(lines))):
        line = lines[j].strip()
        if re.search(r'(Customer GSTIN|Customer PAN|Payment terms|Place of Supply|PO Date|Amount Due In Words)', line, re.IGNORECASE):
            break
        if is_address_line(line):
            address_lines.append(line)
    return " ".join(address_lines).strip() if address_lines else "NOT FOUND"

def extract_seller_info(lines):
    seller_name, seller_gst, seller_address = "", "", ""
    # Find company name and address block
    for i, line in enumerate(lines[:10]):
        if "Nucleus Analytics Private Limited" in line:
            seller_name = "Nucleus Analytics Private Limited"
            # Address block is usually next 2-4 lines
            address_lines = []
            for j in range(i+1, min(i+5, len(lines))):
                if "GSTIN" in lines[j] or "TAX INVOICE" in lines[j]:
                    break
                address_lines.append(lines[j].strip())
            seller_address = " ".join(address_lines)
        if "GSTIN:" in line:
            match = re.search(r"GSTIN:\s*([A-Z0-9]+)", line)
            if match:
                seller_gst = match.group(1)
    # Fallbacks
    if not seller_name:
        for line in lines[:10]:
            if "Nucleus" in line and "Private Limited" in line:
                seller_name = line.strip()
                break
    if not seller_gst:
        for line in lines[:15]:
            match = re.search(r"GSTIN[:\s]*([A-Z0-9]{15})", line)
            if match:
                seller_gst = match.group(1)
                break
    return seller_name, seller_gst, seller_address

def ocr_extract_metadata(image, patterns):
    result = ocr.ocr(np.array(image))
    text_lines = [(line[1][0], line[1][1]) for block in result for line in block]
    found = {}
    for field, pattern in patterns.items():
        for txt, conf in text_lines:
            m = re.search(pattern, txt)
            if m:
                found[field] = {
                    "value": m.group(1) if m.groups() else txt,
                    "confidence": round(conf, 3)
                }
                break
    return found

fallback_patterns = {
    "Invoice Number": r"Invoice\s*No[:\-]?\s*(\S+)",
    "Invoice Date": r"Date[:\-]?\s*([0-9]{1,2}[\/\-\s]?[A-Za-z]{3,9}[\/\-\s]?[0-9]{2,4})",
    "Buyer Name": r"M/S[.,]?\s*(.*?)(?:\s{2,}|$)",
    "Buyer GSTIN": r"Customer\s+GSTIN[\s_:]+([0-9A-Z]{15})"
}

def clean_amount(value):
    return value.replace(",", "").replace(".", "", value.count(".") - 1)

def format_currency_indian(value):
    try:
        amount = float(value)
    except:
        return value
    parts = f"{amount:.2f}".split(".")
    integer = parts[0]
    decimal = parts[1]
    if len(integer) <= 3:
        result = integer
    else:
        result = integer[-3:]
        integer = integer[:-3]
        while len(integer) > 0:
            result = integer[-2:] + "," + result
            integer = integer[:-2]
    return result + "." + decimal

item_regex = re.compile(
    r"^(\d+)\s+(\d{8})\s+(.+?)\s+(Nos|PCS|Units?)\s*\|\s*([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)"
)

def entry(text, path):
    items = []
    tax_info = {}
    grand_total = {}
    current_item = None
    capture_description = False

    # Default invoice_metadata in case there are no pages
    invoice_metadata = {
        "Invoice Number": "",
        "Invoice Date": "",
        "Buyer Name": "",
        "Buyer Address": "",
        "Buyer GSTIN": "",
        "Seller Name": "Nucleus Analytics Private Limited",
        "Seller Address": "Bengaluru - 560 062. INDIA",
        "Seller GSTIN": "29AAECNOIGIEIZR",
        "Subtotal (INR)": ""
    }

    with pdfplumber.open(path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            print(f"\n📄 Page {page_num + 1}")
            lines = page.extract_text(layout=True).split("\n")

            # --- Seller Info Extraction ---
            seller_name, seller_gst, seller_address = extract_seller_info(lines)

            invoice_metadata = {
                "Invoice Number": "",
                "Invoice Date": "",
                "Buyer Name": "",
                "Buyer Address": "",
                "Buyer GSTIN": "",
                "Seller Name": seller_name or "Nucleus Analytics Private Limited",
                "Seller Address": seller_address or "Bengaluru - 560 062. INDIA",
                "Seller GSTIN": seller_gst or "29AAECNOIGIEIZR",
                "Subtotal (INR)": ""
            }

            found_buyer_name = False
            buyer_name_idx = None

            # --------- PDFPlumber Extraction Pass ----------
            for i, line in enumerate(lines):
                line = line.strip()
                if not invoice_metadata["Invoice Number"]:
                    inv_match = re.search(r"Invoice\s*No[:\-]?\s*(\S+)", line, re.IGNORECASE)
                    if inv_match:
                        invoice_metadata["Invoice Number"] = inv_match.group(1).strip()
                if not invoice_metadata["Invoice Date"]:
                    date_match = re.search(r"Date[:\-]?\s*([0-9]{1,2}[\/\-\s]?[A-Za-z]{3,9}[\/\-\s]?[0-9]{2,4})", line)
                    if date_match:
                        invoice_metadata["Invoice Date"] = date_match.group(1).strip()
                if "Billing Address:" in line:
                    # Buyer name is after "Billing Address:"
                    match = re.search(r"Billing Address:\s*(.*)", line)
                    if match:
                        buyer_name = match.group(1).strip()
                        if buyer_name:
                            invoice_metadata["Buyer Name"] = buyer_name
                            found_buyer_name = True
                            buyer_name_idx = i
                if not invoice_metadata["Buyer Name"] and "M/S" in line.upper():
                    parties = re.findall(r"M/S[.,]?\s*(.*?)(?:\s{2,}|$)", line, re.IGNORECASE)
                    for party in parties:
                        name = party.strip(" ,.")
                        if name and not invoice_metadata["Buyer Name"]:
                            invoice_metadata["Buyer Name"] = name
                            found_buyer_name = True
                            buyer_name_idx = i
                if not invoice_metadata["Buyer GSTIN"]:
                    gstin_match = re.search(r"Customer\s+GSTIN[\s_:]+([0-9A-Z]{15})", line, re.IGNORECASE)
                    if gstin_match:
                        invoice_metadata["Buyer GSTIN"] = gstin_match.group(1)
                if found_buyer_name and not invoice_metadata["Buyer Address"] and buyer_name_idx is not None:
                    buyer_address = extract_buyer_address(lines, buyer_name_idx)
                    invoice_metadata["Buyer Address"] = buyer_address if buyer_address else "NOT FOUND"

                if re.search(r"\bSub[\s\-]?Total[:\-]?", line, re.IGNORECASE):
                    sub_match = re.search(r"([\d,]+\.\d{2})", line)
                    if sub_match:
                        subtotal_clean = sub_match.group(1).replace(",", "")
                        invoice_metadata["Subtotal (INR)"] = format_currency_indian(subtotal_clean)

            # --------- OCR Fallback (ONE TIME, ONLY IF MISSING) ----------
            missing_fields = [k for k, v in invoice_metadata.items() if not v and k in fallback_patterns]
            if missing_fields:
                print(f"[INFO] Running OCR fallback for missing fields: {missing_fields}")
                page_image = page.to_image(resolution=200).original
                ocr_results = ocr_extract_metadata(page_image, {k: fallback_patterns[k] for k in missing_fields})
                for k, v in ocr_results.items():
                    invoice_metadata[k] = v["value"]
                    invoice_metadata[k + " Confidence"] = v["confidence"]

            # --------- Item Extraction ----------
            i = 0
            while i < len(lines):
                line = lines[i].strip()
                print(f"[Line {i:02}] {line}")
                item_match = item_regex.match(line)
                if item_match:
                    if current_item:
                        print("📥 Saving previous item:", current_item["S.No"])
                        items.append(current_item)
                    current_item = {
                        "S.No": item_match.group(1),
                        "HSN Code": item_match.group(2),
                        "Item Description": item_match.group(3).strip(),
                        "Unit": item_match.group(4),
                        "Quantity": format_currency_indian(clean_amount(item_match.group(5))),
                        "Unit Price (INR)": format_currency_indian(clean_amount(item_match.group(6))),
                        "Total Price (INR)": format_currency_indian(clean_amount(item_match.group(7)))
                    }
                    print("🆕 New item found:", current_item)
                    capture_description = True
                    i += 1
                    continue
                if capture_description and current_item:
                    if re.search(r"(Declaration|Subtotal|Total|GSTIN|Authorised|Bank|NEFT|Amount Due)", line, re.IGNORECASE):
                        print("🛑 End of item description detected.")
                        capture_description = False
                    else:
                        print("➕ Adding to description:", line)
                        current_item["Item Description"] += " " + line.strip()
                igst_match = re.search(r"IGST%.*?(\d+)%\s+([\d.,]+)", line)
                sgst_match = re.search(r"SGST\s*%.*?(\d+)%", line)
                cgst_match = re.search(r"CGST\s*%.*?(\d+)%", line)
                if igst_match:
                    tax_info['IGST %'] = igst_match.group(1)
                    tax_info['IGST Amount'] = format_currency_indian(clean_amount(igst_match.group(2)))
                if sgst_match:
                    tax_info['SGST %'] = sgst_match.group(1)
                if cgst_match:
                    tax_info['CGST %'] = cgst_match.group(1)
                amt_words_match = re.search(r"Rupees (.+?) Only", line)
                if amt_words_match:
                    grand_total['Amount in Words'] = "Rupees " + amt_words_match.group(1).strip() + " Only"
                total_match = re.search(r"Total.*?([\d,]+\.\d+)", line)
                if total_match:
                    grand_total['Total Amount (INR)'] = format_currency_indian(total_match.group(1).replace(",", ""))
                i += 1
            if current_item:
                print("📥 Saving final item:", current_item["S.No"])
                items.append(current_item)
                current_item = None
    return invoice_metadata, items, tax_info, grand_total

def remove_duplicate_phrases(address):
    """Remove duplicate phrases/words from an address string, preserving order."""
    # Split by comma and also by space for finer granularity
    parts = []
    for p in address.split(','):
        for sub in p.strip().split():
            if sub:
                parts.append(sub)
    seen = set()
    result = []
    for p in address.split(','):
        phrase = p.strip()
        if phrase and phrase.lower() not in seen:
            seen.add(phrase.lower())
            result.append(phrase)
    return ', '.join(result)

def extract_buyer_block(lines):
    """
    Extracts the buyer address block from 'Billing Address:' or 'Delivery Address:' up to the line items table.
    Removes duplicate lines and lines containing unrelated info.
    """
    start_idx = None
    for i, line in enumerate(lines):
        if re.search(r'Billing Address:|Delivery Address:', line, re.IGNORECASE):
            start_idx = i
            break
    if start_idx is None:
        return "", "", ""

    block = []
    buyer_name = ""
    buyer_gst = ""
    for line in lines[start_idx:start_idx+10]:
        # Stop at line items header or unrelated fields
        if re.search(r'SL\s*No\.|HSN\s*CODE|Material Description|Invoice No|Invoice Date|Customer GSTIN|Customer PAN|PO Date|Payment terms|Place of Supply|Qty\.|Unit|Amount', line, re.IGNORECASE):
            break
        # Remove invoice number/date lines
        if re.search(r'Invoice No|Invoice Date', line, re.IGNORECASE):
            continue
        # Extract GSTIN if present
        gst_match = re.search(r'GSTIN[:\s]*([A-Z0-9]{15})', line)
        if gst_match:
            buyer_gst = gst_match.group(1)
            continue
        # Extract buyer name (first non-empty line after header)
        if not buyer_name and line.strip() and not re.search(r'Billing Address:|Delivery Address:', line, re.IGNORECASE):
            buyer_name = line.strip()
        # Add to block if not duplicate and not empty
        if line.strip() and (not block or line.strip() != block[-1]):
            block.append(line.strip())
    # Remove duplicates and empty lines
    block = [b for i, b in enumerate(block) if b and b.lower() not in [x.lower() for x in block[:i]]]
    # Remove header if present
    if block and re.search(r'Billing Address:|Delivery Address:', block[0], re.IGNORECASE):
        block = block[1:]
    # Remove lines with invoice number/date
    block = [l for l in block if not re.search(r'Invoice No|Invoice Date', l, re.IGNORECASE)]
    # Remove GSTIN line
    block = [l for l in block if not re.search(r'GSTIN[:\s]*[A-Z0-9]{15}', l)]
    return buyer_name, buyer_gst, " ".join(block).strip()

def process_invoice(text, path):
    invoice_details, items_raw, tax_info, grand_total = entry(text, path)

    # Read the PDF lines for address block extraction
    with pdfplumber.open(path) as pdf:
        lines = []
        for page in pdf.pages:
            lines += page.extract_text(layout=True).split("\n")

    # --- Seller Info ---
    seller_name = invoice_details.get("Seller Name", "Nucleus Analytics Private Limited")
    seller_gst = invoice_details.get("Seller GSTIN", "29AAECNOIGIEIZR")
    seller_address = invoice_details.get("Seller Address", "Bengaluru - 560 062. INDIA")
    from_address = f"{seller_name}, GSTIN: {seller_gst}, {seller_address}"
    from_address = remove_duplicate_phrases(from_address)

    # --- Buyer Info ---
    buyer_name, buyer_gst, buyer_address_block = extract_buyer_block(lines)
    if not buyer_name:
        buyer_name = invoice_details.get("Buyer Name", "")
    if not buyer_gst:
        buyer_gst = invoice_details.get("Buyer GSTIN", "")
    if not buyer_address_block:
        buyer_address_block = invoice_details.get("Buyer Address", "")
    to_address = f"{buyer_name}, GSTIN: {buyer_gst}, {buyer_address_block}".strip(" ,")
    to_address = remove_duplicate_phrases(to_address)

    invoice_number = safe_convert(invoice_details.get("Invoice Number", ""), str)
    invoice_date = safe_convert(invoice_details.get("Invoice Date", ""), str)
    gst_number = safe_convert(buyer_gst, str)

    total = safe_convert(grand_total.get("Total Amount (INR)", ""), float)
    raw_tax = tax_info.get("IGST Amount", "") or tax_info.get("CGST Amount", "") or ""
    taxes = safe_convert(clean_number(raw_tax), str)

    total_quantity = sum(
        val for val in (
            safe_convert(item.get("Quantity", "0").replace(",", ""), float)
            for item in items_raw if item.get("Quantity")
        ) if isinstance(val, (int, float)) and val is not None
    )

    invoice_data = {
        "invoice_number": invoice_number,
        "invoice_date": invoice_date,
        "from_address": from_address,
        "to_address": to_address,
        "gst_number": gst_number,
        "seller_name": seller_name,
        "seller_gst": seller_gst,
        "seller_address": from_address,
        "buyer_name": buyer_name,
        "buyer_gst": gst_number,
        "buyer_address": to_address,
        "total": Decimal(str(total)) if total is not None else Decimal("0.00"),
        "taxes": taxes,
        "total_quantity": Decimal(str(total_quantity)) if total_quantity else Decimal("0.00")
    }

    items = []
    for item in items_raw:
        amount_val = safe_convert(item.get("Total Price (INR)", ""), float)
        items.append({
            "invoice_number": invoice_number,
            "description": safe_convert(item.get("Item Description", ""), str),
            "hsn": safe_convert(item.get("HSN Code", ""), str),
            "quantity": safe_convert(item.get("Quantity", ""), str),
            "price_per_unit": safe_convert(item.get("Unit Price (INR)", ""), str),
            "gst": safe_convert(tax_info.get("CGST %", ""), str),
            "igst": safe_convert(tax_info.get("IGST %", ""), str),
            "sgst": safe_convert(tax_info.get("SGST %", ""), str),
            "amount": Decimal(str(amount_val)) if amount_val is not None else Decimal("0.00")
        })

    return {
        "invoice_number": invoice_number,
        "invoice_data": invoice_data,
        "items": items
    }


if __name__ == '__main__':
    pdf_path = 'invoice5_dup1_processed.pdf'
    
    try:
        processed_data = process_invoice("", pdf_path)
        import json
        print(json.dumps(processed_data, indent=4, default=str))

    except FileNotFoundError:
        print(f"Error: The file '{pdf_path}' was not found.")
        print("Please make sure the PDF file is in the same directory as the script.")
    except Exception as e:
        print(f"An error occurred: {e}")