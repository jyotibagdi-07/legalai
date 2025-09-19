# legal_backend/main.py
import os, shutil, logging, traceback
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# import your utils (keep them as they are)
from legal_backend.utils.pdf_reader import extract_text_from_pdf
from legal_backend.utils.ai_summarizer import summarize_text

# load env
load_dotenv()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI()

origins = [
    "https://redesigned-system-5g5v5g944q94cr5r-5503.app.github.dev",  # frontend (Codespaces preview)
    "https://redesigned-system-5g5v5g944q94cr5r-8016.app.github.dev",  # backend host
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.DEBUG)

@app.get("/")
def home():
    return {"message": "Backend is running 🚀"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        filename = os.path.basename(file.filename)
        dest = os.path.join(UPLOAD_DIR, filename)
        # save file
        with open(dest, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
        logging.info(f"Saved upload -> {dest}")

        # extract text (could return empty if scanned PDF)
        text = extract_text_from_pdf(dest)
        logging.debug(f"Extracted text length: {len(text) if text else 0}")

        if not text or not text.strip():
            # return JSON telling user no text, not raw file
            return JSONResponse({"summary": "⚠️ No text could be extracted from the PDF."}, status_code=200)

        # If your summarizer calls external APIs (OpenAI), it may require an API key.
        # For debugging you can temporarily replace summarize_text(text) with a stub.
        summary = summarize_text(text)

        return JSONResponse({"summary": summary}, status_code=200)

    except Exception as e:
        logging.error("Upload processing failed:\n" + traceback.format_exc())
        # return 500 with message
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")
