#OCR 

import ocrmypdf
import os

path = r"D:\Working_app_Invoice\TemplateMatching\invoice_extractor\data\invoice5_dup1.jpg"
# Output OCR'd PDF path
output_pdf_path = path.rsplit('.', 1)[0] + '_textpdf.pdf'

if not os.path.exists(output_pdf_path):
    ocrmypdf.ocr(path, output_pdf_path, deskew=True, image_dpi=300)