from pdf2image.pdf2image import convert_from_path
import pdfplumber
import numpy as np
from pprint import pprint
import cv2
from PIL import Image
import os
# from paddleocr import PaddleOCR
# ocr = PaddleOCR(use_angle_cls=True, lang='en')

# def ocr_image(image):
#     # Convert PIL to numpy (openCV )format
#     image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR) if  isinstance(image, Image.Image) else image
#     result = ocr.ocr(image, cls=True)
#     print(result)
#     if not result:
#         raise ValueError("[ERROR] OCR failed to extract any text from the image.")
#     return "\n".join([line[1][0] for block in result for line in block])


def extract_text(path):
    with pdfplumber.open(path) as pdf:
        return "\n".join([p.extract_text() for p in pdf.pages])

def convert_pdf_to_images(path):
    return None if not convert_from_path(path) else convert_from_path(path)

