# legalAI/main.py

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from legal_backend.utils.ai_summarizer import summarize
from legal_backend.utils.pdf_reader import read_pdf_bytes


app = FastAPI()

# Allow frontend to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/summarize")
async def summarize_file(file: UploadFile = File(...)):
    content = await file.read()
    text = read_pdf_bytes(content)  # from pdf_reader.py
    summary = summarize(text)       # from ai_summarizer.py
    return {"summary": summary}
