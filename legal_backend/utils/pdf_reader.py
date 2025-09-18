import PyPDF2

def extract_text_from_pdf(file_path: str) -> str:
    """
    Reads a PDF file from a local path and returns its text content.
    """
    text = ""
    try:
        with open(file_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text += page.extract_text()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
    return text

