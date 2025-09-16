# legal-backend/utils/pdf_reader.py

import PyPDF2
from io import BytesIO

def read_pdf_bytes(file_bytes):
    text = ""
    reader = PyPDF2.PdfReader(BytesIO(file_bytes))
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

