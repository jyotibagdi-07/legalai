# legal_backend/main.py

import os, shutil, logging, traceback, joblib
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Import your existing utils
from backend.ai.utils.pdf_reader import extract_text_from_pdf
from backend.ai.utils.ai_summarizer import summarize_text

# -------------------------------
# ✅ Load environment and model
# -------------------------------
load_dotenv()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Load trained model and vectorizer
model = joblib.load("assets/risk_model.pkl")
vectorizer = joblib.load("assets/vectorizer.pkl")

# -------------------------------
# ✅ FastAPI app setup
# -------------------------------
app = FastAPI()

origins = [
    "https://turbo-space-fishstick-5g5v5g944q94cr5r-5503.app.github.dev",  # Frontend URL
    "https://turbo-space-fishstick-5g5v5g944q94cr5r-8016.app.github.dev"   # Backend URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.DEBUG)

# -------------------------------
# ✅ Existing routes
# -------------------------------
@app.get("/")
def home():
    return {"message": "Backend is running 🚀"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        filename = os.path.basename(file.filename)
        dest = os.path.join(UPLOAD_DIR, filename)

        with open(dest, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
        logging.info(f"Saved upload -> {dest}")

        text = extract_text_from_pdf(dest)
        logging.debug(f"Extracted text length: {len(text) if text else 0}")

        if not text or not text.strip():
            return JSONResponse({"summary": "⚠️ No text could be extracted from the PDF."}, status_code=200)

        summary = summarize_text(text)
        return JSONResponse({"summary": summary}, status_code=200)

    except Exception as e:
        logging.error("Upload processing failed:\n" + traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

# -------------------------------
# ✅ NEW: Risk Analyzer Endpoint
# -------------------------------
@app.post("/analyze")
async def analyze_risk(file: UploadFile = File(...)):
    try:
        content = await file.read()
        temp_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(temp_path, "wb") as f:
            f.write(content)

        # extract text from uploaded PDF
        text = extract_text_from_pdf(temp_path)

        if not text.strip():
            return JSONResponse({"risk": "⚠️ No readable text found in PDF."}, status_code=200)

        # predict risk
        X = vectorizer.transform([text])
        risk_level = model.predict(X)[0]

        # optional message
        message = {
            "Low": "✅ Low Risk — Document seems safe.",
            "Medium": "⚠️ Medium Risk — Review recommended.",
            "High": "🚨 High Risk — Possible legal risk, check carefully."
        }.get(risk_level, "Unknown")

        return JSONResponse({"risk": risk_level, "message": message}, status_code=200)

    except Exception as e:
        logging.error("Risk analysis failed:\n" + traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to analyze risk: {str(e)}")
if __name__ == "__main__":
    import uvicorn
    # The first argument 'app' should match your FastAPI variable (e.g., app = FastAPI())
    uvicorn.run("backend.ai.main:app", host="0.0.0.0", port=8016, reload=True)