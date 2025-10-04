import PyPDF2

def extract_text_from_pdf(file_path: str) -> str:
    """Extracts text from a PDF file using PyPDF2."""
    try:
        with open(file_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text
            return text
    except Exception as e:
        # print for quick debugging; consider using logging in production
        print(f"Error reading PDF: {e}")
        return ""

# keep original name for backward compatibility
read_pdf = extract_text_from_pdf




