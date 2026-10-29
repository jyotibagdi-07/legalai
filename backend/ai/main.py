# legalai/backend/ai/main.py

import os
import shutil
import logging
import traceback
try:
    import joblib
except ImportError:
    joblib = None
import re
import json
import urllib.request
import urllib.error
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
LEGALAI_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REPO_ROOT = os.path.dirname(LEGALAI_DIR)

if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from legalai.backend.ai.utils.pdf_reader import extract_text_from_pdf
from legalai.backend.ai.utils.ai_summarizer import summarize_text

load_dotenv(os.path.join(LEGALAI_DIR, ".env"))
load_dotenv()

UPLOAD_DIR = os.path.join(LEGALAI_DIR, "uploads")
FRONTEND_DIR = os.path.join(LEGALAI_DIR, "frontend")
os.makedirs(UPLOAD_DIR, exist_ok=True)

assets_dir = os.path.join(LEGALAI_DIR, "assets")
model_path = os.path.join(assets_dir, "risk_model.pkl")
vectorizer_path = os.path.join(assets_dir, "vectorizer.pkl")

logging.basicConfig(level=logging.INFO)

model = None
vectorizer = None
if joblib:
    try:
        model = joblib.load(model_path)
        vectorizer = joblib.load(vectorizer_path)
        logging.info("ML Risk Model and Vectorizer loaded successfully.")
    except Exception as e:
        logging.warning("ML model not available (%s). Heuristics fallback will be used.", e)

app = FastAPI(title="LegalAI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = ""


def has_openai_key() -> bool:
    key = os.getenv("OPENAI_API_KEY", "")
    return bool(key and len(key.strip()) > 20 and not key.strip().lower().startswith("your_"))


def has_gemini_key() -> bool:
    key = os.getenv("GEMINI_API_KEY", "")
    return bool(key and len(key.strip()) > 10 and not key.strip().lower().startswith("your_"))


def extract_document_text(path: str, filename: str) -> str:
    lower = (filename or "").lower()
    if lower.endswith(".txt") or lower.endswith(".md"):
        with open(path, "r", encoding="utf-8", errors="ignore") as handle:
            return handle.read()
    return extract_text_from_pdf(path)


def analyze_heuristically(text: str, filename: str) -> dict:
    """Rule-based legal analysis when an LLM API key is unavailable."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    word_count = len(text.split())

    liability_clauses = []
    termination_clauses = []
    payment_clauses = []
    exclusivity_clauses = []
    dispute_clauses = []

    for s in sentences:
        s_clean = s.strip()
        if len(s_clean) < 15:
            continue
        s_lower = s_clean.lower()

        if any(w in s_lower for w in ["liability", "indemn", "hold harmless", "damage", "responsible", "waive"]):
            liability_clauses.append(s_clean)
        if any(w in s_lower for w in ["terminate", "cancel", "renewal", "notice period", "breach"]):
            termination_clauses.append(s_clean)
        if any(w in s_lower for w in ["payment", "commission", "price", "fee", "cost", "charge", "invoice"]):
            payment_clauses.append(s_clean)
        if any(w in s_lower for w in ["exclusive", "non-compete", "restrict", "territory"]):
            exclusivity_clauses.append(s_clean)
        if any(w in s_lower for w in ["arbitrat", "dispute", "jurisdict", "governing law"]):
            dispute_clauses.append(s_clean)

    obligations = []
    risks = []
    clauses = []
    ambiguous = []

    if liability_clauses:
        snippet = liability_clauses[0][:120] + ("..." if len(liability_clauses[0]) > 120 else "")
        clauses.append({"name": "Limitation of Liability", "risk": "High", "detail": snippet})
        risks.append({
            "name": "Liability & Indemnification Risk",
            "severity": "High",
            "note": "Indemnification clauses found that may shift unlimited liability or financial risk to your party."
        })
    else:
        clauses.append({"name": "Limitation of Liability", "risk": "Medium", "detail": "No explicit limit on damages found. Standard default rules apply."})

    if termination_clauses:
        snippet = termination_clauses[0][:120] + ("..." if len(termination_clauses[0]) > 120 else "")
        clauses.append({"name": "Termination & Cancellation", "risk": "Medium", "detail": snippet})
        risks.append({
            "name": "Auto-Renewal & Notice Terms",
            "severity": "Medium",
            "note": "Specific notice terms or automatic renewal conditions exist. Check cancellation windows."
        })
    else:
        clauses.append({"name": "Termination & Notice", "risk": "Low", "detail": "Standard termination on breach or mutual written agreement."})

    if payment_clauses:
        snippet = payment_clauses[0][:120] + ("..." if len(payment_clauses[0]) > 120 else "")
        clauses.append({"name": "Payment & Commission Terms", "risk": "Medium", "detail": snippet})
        obligations.append("Timely payments / remittance of commissions and filing of accounts.")
    else:
        clauses.append({"name": "Payment Terms", "risk": "Low", "detail": "No complex fee schedules or commission calculations detected."})

    if exclusivity_clauses:
        snippet = exclusivity_clauses[0][:120] + ("..." if len(exclusivity_clauses[0]) > 120 else "")
        clauses.append({"name": "Exclusivity & Non-compete", "risk": "High", "detail": snippet})
        risks.append({
            "name": "Exclusivity Restrictions",
            "severity": "High",
            "note": "Restricts your ability to engage in competing business, limiting revenue opportunities."
        })
    else:
        clauses.append({"name": "Exclusivity", "risk": "Low", "detail": "Non-exclusive arrangement. Freedom to contract with third parties."})

    if dispute_clauses:
        snippet = dispute_clauses[0][:120] + ("..." if len(dispute_clauses[0]) > 120 else "")
        clauses.append({"name": "Dispute Resolution & Jurisdiction", "risk": "Low", "detail": snippet})
    else:
        clauses.append({"name": "Governing Law / Jurisdiction", "risk": "Medium", "detail": "No dispute resolution/arbitration venue specified."})
        ambiguous.append("No governing law or dispute resolution forum is specified.")

    if not obligations:
        preview = " ".join(text.split()[:40])
        obligations = [
            f"Review and comply with the terms in {filename or 'this document'}.",
            preview[:180] + ("..." if len(preview) > 180 else ""),
        ]
    if not risks:
        risks.append({"name": "General Risk", "severity": "Low", "note": "Standard document clauses with minor legal exposures."})
    if not ambiguous:
        ambiguous = ["Definition terms for specific roles or performance metrics are missing."]

    recommendations = [
        "Review liability limitation caps to match the contract value.",
        "Verify notice periods for cancellation to avoid automatic extensions.",
        "Ensure all monetary, commission rates, and location details are clearly filled.",
        "Identify and specify the governing law and arbitration venue clearly."
    ]

    risk_score = 30
    high_count = sum(1 for r in risks if r["severity"] == "High")
    med_count = sum(1 for r in risks if r["severity"] == "Medium")
    risk_score += (high_count * 20) + (med_count * 10)
    risk_score = min(max(risk_score, 10), 95)

    risk_level = "Low"
    if risk_score >= 70:
        risk_level = "High"
    elif risk_score >= 40:
        risk_level = "Medium"

    message = {
        "Low": "✅ Low Risk — Document seems safe.",
        "Medium": "⚠️ Medium Risk — Review recommended.",
        "High": "🚨 High Risk — Possible legal risk, check carefully."
    }.get(risk_level, "Unknown")

    summary_text = (
        f"This document ({filename or 'uploaded file'}) contains approximately {word_count} words. "
        "Analysis found clauses covering liability, payment, and termination. "
    )
    if high_count > 0:
        summary_text += f"We flagged {high_count} high-severity risk(s) that should be reviewed carefully."
    else:
        summary_text += "No high-risk restrictions were detected, but commercial clauses still need verification."

    return {
        "summary": summary_text,
        "risk": risk_level,
        "message": message,
        "risk_score": risk_score,
        "sentiment": "Neutral" if risk_level == "Low" else "Restrictive",
        "sentiment_score": 50 if risk_level == "Low" else 75,
        "obligations": obligations,
        "risks": risks,
        "ambiguous": ambiguous,
        "clauses": clauses,
        "timeline": {
            "draft": "Not explicitly stated in text",
            "signing": "Not explicitly stated in text",
            "expiry": "Varies (check auto-renewal terms)"
        },
        "recommendations": recommendations,
        "stats": {
            "word_count": word_count,
            "complexity_score": round(min(5 + (word_count / 1500), 9.5), 1),
            "processing_time_sec": 2
        },
        "engine": "heuristics"
    }


def analyze_with_openai(text: str, filename: str) -> dict:
    import openai
    openai.api_key = os.getenv("OPENAI_API_KEY")

    prompt = f"""
    You are an expert legal assistant. Analyze this legal document and output a valid JSON object matching this schema:
    {{
      "summary": "Plain English summary of the document (2-3 sentences)",
      "risk": "Low" | "Medium" | "High",
      "message": "A summary warning message about the risk level",
      "risk_score": 0-100 (integer representing overall risk score),
      "sentiment": "Overall sentiment (e.g. Neutral, Landlord-favourable, Restrictive)",
      "sentiment_score": 0-100 (integer representing sentiment strength),
      "obligations": ["string containing core obligation 1", "obligation 2", ...],
      "risks": [
        {{"name": "Risk Title", "severity": "High" | "Medium" | "Low", "note": "Explanation of the risk"}}
      ],
      "ambiguous": ["string containing ambiguous clause 1", ...],
      "clauses": [
        {{"name": "Clause Name (e.g. Indemnity)", "risk": "High" | "Medium" | "Low", "detail": "Plain English explanation of this clause in the text"}}
      ],
      "timeline": {{
        "draft": "Draft date or 'Not specified'",
        "signing": "Signing date or 'Not specified'",
        "expiry": "Expiration terms or date"
      }},
      "recommendations": ["Recommendation 1", "Recommendation 2", ...]
    }}

    Be objective and extract details directly from the text below:
    ---
    {text[:8000]}
    """

    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a legal document analyzer that returns strictly valid JSON."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"},
        max_tokens=1000,
        temperature=0.2
    )

    result = json.loads(response.choices[0].message.content.strip())
    result["stats"] = {
        "word_count": len(text.split()),
        "complexity_score": round(min(5 + (len(text.split()) / 1500), 9.5), 1),
        "processing_time_sec": 3
    }
    result["engine"] = "openai"
    return result


def run_analysis(text: str, filename: str) -> dict:
    if has_openai_key():
        try:
            logging.info("Analyzing using OpenAI API...")
            return analyze_with_openai(text, filename)
        except Exception as ai_err:
            logging.warning("OpenAI analysis failed: %s. Falling back to heuristics.", ai_err)
    logging.info("Analyzing using local rules/heuristics...")
    return analyze_heuristically(text, filename)


def empty_analysis(message: str) -> dict:
    return {
        "summary": message,
        "risk": "Low",
        "message": "No text detected.",
        "risk_score": 0,
        "sentiment": "Unknown",
        "sentiment_score": 0,
        "obligations": [],
        "risks": [],
        "ambiguous": [message],
        "clauses": [],
        "timeline": {"draft": "N/A", "signing": "N/A", "expiry": "N/A"},
        "recommendations": ["Ensure the PDF contains selectable, readable text."],
        "stats": {"word_count": 0, "complexity_score": 0, "processing_time_sec": 0},
        "engine": "none"
    }


def chat_with_openai(message: str, context: str) -> str:
    import openai
    openai.api_key = os.getenv("OPENAI_API_KEY")
    system = (
        "You are LegalAI, a helpful legal document assistant. "
        "Explain clauses in plain English. This is not formal legal advice."
    )
    user = message
    if context:
        user = f"Document analysis context:\n{context[:4000]}\n\nUser question: {message}"
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ],
        max_tokens=400,
        temperature=0.3
    )
    return response.choices[0].message.content.strip()


def chat_with_gemini(message: str, context: str) -> str:
    key = os.getenv("GEMINI_API_KEY")
    prompt = message
    if context:
        prompt = f"You are LegalAI. Use this document analysis if relevant:\n{context[:4000]}\n\nQuestion: {message}"
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.0-flash:generateContent?key={key}"
    )
    payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["candidates"][0]["content"]["parts"][0]["text"]


def chat_heuristic(message: str, context: str) -> str:
    lower = message.lower().strip()
    replies = {
        "what is a sale deed?": (
            "A Sale Deed transfers ownership of property from seller to buyer. "
            "It includes parties, property description, and consideration, and must be registered."
        ),
        "docs for registration": (
            "Typical registration documents: original title deeds, property tax receipts, "
            "ID/address proofs, two witnesses, and stamp-duty payment proof."
        ),
        "gift deed": (
            "A Gift Deed transfers property voluntarily without payment. "
            "It is valid only if executed and registered as required."
        ),
    }
    if lower in replies:
        return replies[lower]
    if "hello" in lower or lower in ("hi", "hey"):
        return "Hello. I am LegalAI. Ask about a clause, risk, or your uploaded document."
    if context:
        try:
            analysis = json.loads(context)
            summary = analysis.get("summary") or "No summary stored."
            risk = analysis.get("risk") or "Unknown"
            return (
                f"I am running in local mode (no API key). From your last analysis: "
                f"overall risk is {risk}. {summary}"
            )
        except Exception:
            pass
    return (
        "I can answer from your uploaded document analysis. "
        "Upload a PDF on the home page, then ask about risks, obligations, or clauses. "
        "Add OPENAI_API_KEY or GEMINI_API_KEY in legalai/.env for full AI chat."
    )


def save_upload(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file name provided.")
    filename = os.path.basename(file.filename)
    dest = os.path.join(UPLOAD_DIR, filename)
    with open(dest, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    return dest, filename


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "openai": has_openai_key(),
        "gemini": has_gemini_key(),
        "ml_model": model is not None,
        "frontend": os.path.isdir(FRONTEND_DIR),
    }


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        dest, filename = save_upload(file)
        logging.info("Saved upload -> %s", dest)
        text = extract_document_text(dest, filename)
        if not text or not text.strip():
            return JSONResponse({"summary": "No text could be extracted from the file."}, status_code=200)
        summary = summarize_text(text)
        return JSONResponse({"summary": summary, "filename": filename}, status_code=200)
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Upload processing failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


@app.post("/analyze")
async def analyze_risk(file: UploadFile = File(...)):
    try:
        dest, filename = save_upload(file)
        logging.info("Saved file for analysis -> %s", dest)
        text = extract_document_text(dest, filename)
        if not text or not text.strip():
            return JSONResponse(
                empty_analysis("No readable text found. Upload a text-based PDF (not a scan-only image)."),
                status_code=200,
            )
        return JSONResponse(run_analysis(text, filename), status_code=200)
    except HTTPException:
        raise
    except Exception as e:
        logging.error("Risk analysis failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to analyze risk: {str(e)}")


@app.post("/chat")
async def chat(req: ChatRequest):
    message = (req.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required.")
    try:
        if has_openai_key():
            reply = chat_with_openai(message, req.context or "")
        elif has_gemini_key():
            reply = chat_with_gemini(message, req.context or "")
        else:
            reply = chat_heuristic(message, req.context or "")
        return {"reply": reply}
    except Exception as e:
        logging.warning("LLM chat failed (%s). Using local reply.", e)
        return {"reply": chat_heuristic(message, req.context or "")}


@app.get("/")
def serve_index():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    return {"message": "LegalAI backend is running", "health": "/api/health"}


if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("legalai.backend.ai.main:app", host="127.0.0.1", port=8016, reload=True)
