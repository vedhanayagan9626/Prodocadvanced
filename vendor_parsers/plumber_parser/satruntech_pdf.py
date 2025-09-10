import re
import sys
import io
from decimal import Decimal

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from decimal import Decimal, InvalidOperation

def safe_convert(value, default=Decimal("0.0")):
    try:
        # Remove commas and cast to Decimal
        return Decimal(str(value).replace(",", "").strip())
    except (InvalidOperation, ValueError, TypeError):
        return default

def safe_decimal(value):
    try:
        return Decimal(str(value).replace(',', '').strip())
    except:
        return Decimal("0.00")

def extract_items_from_text(text):
    lines = text.splitlines()
    items = []

    for line in lines:
        if len(line.strip()) < 20:
            continue

        clean = re.sub(r'[\[\]\|_}{)(]', '', line).strip()
        prices = re.findall(r'[\d,]+\.\d{2}', clean)
        if len(prices) < 5:
            continue

        hsn_match = re.search(r'\b(\d{4,8})\b', clean)
        if not hsn_match:
            continue
        hsn_code = hsn_match.group(1)

        tax_percent_match = re.search(r'(\d{1,2}%)', clean)
        tax_percent = tax_percent_match.group(1) if tax_percent_match else ""

        start_match = re.match(r'\s*(\d+)[\)/]?\s*(.+?)\b' + re.escape(hsn_code) + r'\b\s+(\d+)', clean)
        if not start_match:
            continue

        item_no = start_match.group(1)
        description = start_match.group(2).strip()
        qty = start_match.group(3)

        # Corrected price field positions (based on format in your invoice)
        rate = safe_decimal(prices[-5])
        taxable_value = safe_decimal(prices[-4])
        tax_amount = safe_decimal(prices[-2])
        total = safe_decimal(prices[-1])

        items.append({
            "item_no": item_no,
            "description": description if description != "/" else "Unknown Item",
            "hsn_code": hsn_code,
            "qty": safe_decimal(qty),
            "rate": rate,
            "taxable_value": taxable_value,
            "tax_percent": tax_percent,
            "tax_amount": tax_amount,
            "total": total
        })

        print("-" * 40)
        print(f"Item No: {item_no}, Description: {description}, HSN: {hsn_code}, Qty: {qty}, Rate: {rate}, Taxable Value: {taxable_value}, Tax Percent: {tax_percent}, Tax Amount: {tax_amount}, Total: {total}")
        print("-" * 40)

    return items

def extract_invoice_data(text):
    invoice = {}
    match = re.search(r'invoice No:\s*(\S+)', text, re.IGNORECASE)
    if match:
        invoice['invoice_number'] = match.group(1)
    match = re.search(r'invoice date:\s*(\d{2}/\d{2}/\d{4})', text, re.IGNORECASE)
    if match:
        invoice['invoice_date'] = match.group(1)
    match = re.search(r'Transport Mode:\s*([^\n]+)', text)
    if match:
        invoice['transport_mode'] = match.group(1).strip()
    match = re.search(r'State:\s*(.+?)\s+Code\s+(\d+)', text)
    if match:
        invoice['state'] = match.group(1).strip()
        invoice['state_code'] = match.group(2)

    return invoice


def extract_seller_buyer(text):
    seller = {
        "company_name": "SATRUN TECHNOLOGIES"
    }
    match = re.search(r'Mobile:([\d/]+)', text)
    if match:
        seller["phone"] = match.group(1)
    match = re.search(r'Email:\s*([^\s\n]+)', text)
    if match:
        seller["email"] = match.group(1)
    match = re.search(r'GSTIN:\s*(\S+)', text)
    if match:
        seller["gstin"] = match.group(1)

    buyer = {}
    match = re.search(r'Bill to Party\s*\|?(.+?)\n', text)
    if match:
        buyer["company_name"] = match.group(1).strip()
    match = re.search(r'IGST NO\s*:\s*(\S+)', text)
    if match:
        buyer["gstin"] = match.group(1)
    match = re.search(r'State Name:\s*(.+?),', text)
    if match:
        buyer["state"] = match.group(1).strip()

    return seller, buyer


def extract_amount_and_bank(text):
    amount = {}
    match = re.search(r'INR\s+([A-Z\s\-]+ONLY)', text, re.IGNORECASE)
    if match:
        amount["amount_in_words"] = "INR " + match.group(1).strip()
    else:
        amount["amount_in_words"] = "INR ZERO ONLY"
    match = re.search(r'Total Amount after Tax\s+([\d,]+\.\d{2})', text)
    if match:
        amount["total_amount"] = match.group(1)
    else:
        amount["total_amount"] = "0.00"

    print("Extracted Total Amount:", amount["total_amount"])
    
    # print("Extracted Amount in Words:", amount["amount_in_words"])

    # bank = {}
    # match = re.search(r'Bank Name:\s*(.+?)\s', text)
    # if match:
    #     bank["bank_name"] = match.group(1).strip()
    # match = re.search(r'Bank A/C:\s*([\d]+)', text)
    # if match:
    #     bank["account_number"] = match.group(1)
    # match = re.search(r'Bank IFSC:\s*(\S+)', text)
    # if match:
    #     bank["ifsc"] = match.group(1)

    return amount

def clean_amount(value):
    """Clean unwanted characters and safely convert to numeric string"""
    return re.sub(r'[^\d.]', '', value)

def extract_taxes(text):
    taxes = {}
    clean = re.sub(r'[\[\]\|_}{)(]', '', text).strip()
    # Normalize text to remove clutter symbols and line breaks
    text = text.replace('\n', ' ').replace('\r', ' ')
    text = re.sub(r'[\[\]{}|()_]', '', text)

    # Total tax amount
    total_match = re.search(r'Total\s+Tax\s+Amount[.:]?\s*([\d,]+\.\d{2})', text, re.IGNORECASE)
    if total_match:
        taxes["total_tax"] = clean_amount(total_match.group(1))

    # IGST
    igst_match = re.search(r'(IGST\s\d{1,2}%)', clean)
    if igst_match:
        taxes["igst"] = clean_amount(igst_match.group(1))

    # CGST
    cgst_match = re.search(r'(CGST\s\d{1,2}%)', clean)
    if cgst_match:
        taxes["cgst"] = clean_amount(cgst_match.group(1))

    # SGST
    sgst_match = re.search(r'(SGST\s\d{1,2}%)', clean)
    if sgst_match:
        taxes["sgst"] = clean_amount(sgst_match.group(1))

    return taxes


def process_invoice(text, path):
    items_data = extract_items_from_text(text)
    invoice_meta = extract_invoice_data(text)
    seller, buyer = extract_seller_buyer(text)
    amount = extract_amount_and_bank(text)
    taxes = extract_taxes(text)


    from_address = f"{seller.get('company_name', '')} - {seller.get('gstin', '')}"
    to_address = f"{buyer.get('company_name', '')} - {buyer.get('gstin', 'NOT FOUND')}"

    invoice_number = invoice_meta.get("invoice_number", "UNKNOWN")
    total_amount = safe_convert(amount.get("total_amount", "0.00"))
    print("total_amount:", total_amount)
    total_qty = sum(safe_convert(i.get("qty", 0)) for i in items_data)

    
    items = []
    tax_percent_default = ""
    for item in items_data:
        tax_percent = item.get("tax_percent", "").replace("%", "").strip()
        if tax_percent and not tax_percent_default:
            tax_percent_default = tax_percent
        items.append({
            "invoice_number": invoice_number,
            "description": item["description"] if len(item["description"].strip()) > 3 else "Unknown Item",
            "hsn": item["hsn_code"],
            "quantity": safe_convert(item["qty"]),
            "price_per_unit": safe_convert(item["rate"]),
            "gst": tax_percent,
            "igst": tax_percent,
            "sgst": tax_percent,
            "amount": safe_convert(item["total"])
        })
    print("Items Data:", items)
    
    # Use the first found tax_percent or default to empty string
    invoice_data = {
        "invoice_number": invoice_number,
        "from_address": from_address,
        "to_address": to_address,
        "gst_number": seller.get("gstin", ""),
        "invoice_date": invoice_meta.get("invoice_date", ""),
        "total": total_amount,
        "taxes": f"{taxes.get('total_tax', '0.00')} (IGST: {taxes.get('igst', tax_percent_default)}, CGST: {taxes.get('cgst', '0.00')}, SGST: {taxes.get('sgst', '0.00')})",
        "total_quantity": total_qty
    }
    print("Invoice Data:", invoice_data)
    return {
        "invoice_number": invoice_number,
        "invoice_data": invoice_data,
        "items": items
    }

