import re
import pdfplumber
import pandas as pd

def parse_money(s):
    if not s:
        return 0.0
    s = s.replace(",", "").strip()
    try:
        return float(s)
    except:
        return 0.0

def extract_nucleus_invoice(pdf_path, out_xlsx):
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join(p.extract_text() for p in pdf.pages if p.extract_text())

    # --- Header fields ---
    bill_number = re.search(r"Invoice No[:\s]*([A-Z0-9/\-]+)", text)
    bill_number = bill_number.group(1) if bill_number else ""

    bill_date = re.search(r"Date\s+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})", text)
    bill_date = bill_date.group(1) if bill_date else ""

    vendor_name = "Nucleus Analytics Private Limited"

    vendor_gstin = re.search(r"\bGSTIN[:\s]*([0-9A-Z]{15})", text)
    vendor_gstin = vendor_gstin.group(1) if vendor_gstin else ""

    customer_name = "Abharan Jewellers Pvt Ltd"

    customer_gstin = re.search(r"Customer GSTIN\s*[_:]*([0-9A-Z]{15})", text)
    customer_gstin = customer_gstin.group(1) if customer_gstin else ""

    supply_code = re.search(r"Place of Supply state code[:\s]*([0-9]{2})", text)
    supply_code = supply_code.group(1) if supply_code else ""

    delivery_code = re.search(r"Place of Delivery state code[:\s]*([0-9]{2})", text)
    delivery_code = delivery_code.group(1) if delivery_code else ""

    payment_terms = re.search(r"Payment terms[:\s]*([^\n]+)", text)
    payment_terms = payment_terms.group(1).strip() if payment_terms else ""

    # --- Items extraction ---
    items = []
    for line in text.splitlines():
        line = line.strip()
        if re.match(r"^\d+\s+\d{6,8}", line):  # starts with SlNo + HSN
            parts = line.split()
            hsn = parts[1]
            unit = "Nos"
            try:
                qty = parse_money(parts[-3])
                rate = parse_money(parts[-2])
                total = parse_money(parts[-1])
                desc = " ".join(parts[2:-3])
            except Exception:
                qty, rate, total, desc = 0, 0, 0, " ".join(parts[2:])
            items.append({
                "Bill Number": bill_number,
                "Bill Date": bill_date,
                "Vendor Name": vendor_name,
                "Vendor GSTIN": vendor_gstin,
                "Customer Name": customer_name,
                "Customer GSTIN": customer_gstin,
                "Source of Supply": supply_code,
                "Destination of Supply": delivery_code,
                "Payment Terms": payment_terms,
                "HSN/SAC": hsn,
                "Item Name": desc,
                "Usage Unit": unit,
                "Quantity": qty,
                "Rate": rate,
                "SubTotal": total
            })

    # --- Totals ---
    subtotal = re.search(r"Sub Total[:\s]*([\d,]+\.\d+)", text)
    subtotal = parse_money(subtotal.group(1)) if subtotal else 0.0

    igst_line = re.search(r"IGST%.*?([\d,]+\.\d+)", text)
    igst_amt = parse_money(igst_line.group(1)) if igst_line else 0.0
    igst_pct = re.search(r"IGST%.*?(\d+)%", text)
    igst_pct = igst_pct.group(1) if igst_pct else "0"

    total_amt = re.search(r"Total[, ]*([\d,]+\.\d+)", text)
    total_amt = parse_money(total_amt.group(1)) if total_amt else 0.0

    for it in items:
        it["Tax Name"] = "IGST"
        it["Tax Percentage"] = float(igst_pct)
        it["Tax Amount"] = round(it["SubTotal"] * float(igst_pct) / 100, 2)
        it["Total"] = it["SubTotal"] + it["Tax Amount"]

    df_items = pd.DataFrame(items)

    # --- Summary ---
    summary = pd.DataFrame([{
        "Bill Number": bill_number,
        "Bill Date": bill_date,
        "Vendor Name": vendor_name,
        "Vendor GSTIN": vendor_gstin,
        "Customer Name": customer_name,
        "Customer GSTIN": customer_gstin,
        "Source of Supply": supply_code,
        "Destination of Supply": delivery_code,
        "Payment Terms": payment_terms,
        "Invoice SubTotal": subtotal,
        "IGST %": igst_pct,
        "IGST Amount": igst_amt,
        "Invoice Total": total_amt
    }])

    with pd.ExcelWriter(out_xlsx, engine="openpyxl") as writer:
        df_items.to_excel(writer, sheet_name="Items", index=False)
        summary.to_excel(writer, sheet_name="Summary", index=False)

    return df_items, summary
if __name__ == "__main__":
    items, summary = extract_nucleus_invoice(
        "invoice5_processed.pdf",  # input PDF path
        "nucleus_invoice1.xlsx"        # output Excel path
    )
    print(items)
    print(summary)
