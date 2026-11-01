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

# Last uploaded document kept in memory so /chat can answer from real text.
LAST_DOC = {"filename": "", "text": "", "analysis": None}


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


def remember_document(filename: str, text: str, analysis=None):
    LAST_DOC["filename"] = filename or ""
    LAST_DOC["text"] = text or ""
    LAST_DOC["analysis"] = analysis


def _clip(text: str, limit: int = 220) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def ml_risk_prediction(text: str):
    """Return (label, score 0-100) from the trained model, or (None, None)."""
    if model is None or vectorizer is None:
        return None, None
    try:
        features = vectorizer.transform([text[:20000]])
        label = str(model.predict(features)[0])
        score = 40
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(features)[0]
            classes = list(model.classes_)
            weights = {"Low": 20, "Medium": 55, "High": 90}
            score = int(round(sum(float(proba[i]) * weights.get(str(classes[i]), 50) for i in range(len(classes)))))
        return label, min(max(score, 5), 95)
    except Exception as err:
        logging.warning("ML risk prediction failed: %s", err)
        return None, None


def analyze_heuristically(text: str, filename: str) -> dict:
    """Analyze the actual uploaded document text (no canned sample contract)."""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    word_count = len(text.split())

    buckets = {
        "liability": [],
        "termination": [],
        "payment": [],
        "exclusivity": [],
        "dispute": [],
        "obligation": [],
        "blank": [],
    }

    for sentence in sentences:
        if len(sentence) < 12:
            continue
        lower = sentence.lower()
        if any(w in lower for w in ["liability", "indemn", "hold harmless", "damages", "waive"]):
            buckets["liability"].append(sentence)
        if any(w in lower for w in ["terminate", "termination", "cancel", "renewal", "notice period", "breach"]):
            buckets["termination"].append(sentence)
        if any(w in lower for w in ["payment", "commission", "price", "fee", "invoice", "consideration", "rent"]):
            buckets["payment"].append(sentence)
        if any(w in lower for w in ["exclusive", "non-compete", "non compete", "restrict", "territory"]):
            buckets["exclusivity"].append(sentence)
        if any(w in lower for w in ["arbitrat", "dispute", "jurisdiction", "governing law", "court"]):
            buckets["dispute"].append(sentence)
        if any(w in lower for w in ["shall", "must", "agrees to", "is required", "will pay", "undertake"]):
            buckets["obligation"].append(sentence)
        if "____" in sentence or "……" in sentence or "[insert" in lower or "to be filled" in lower:
            buckets["blank"].append(sentence)

    clauses = []
    risks = []
    obligations = [_clip(s) for s in buckets["obligation"][:6]]
    ambiguous = [_clip(s) for s in buckets["blank"][:4]]

    def add_clause(name, found, severity_if_found, empty_risk, empty_detail):
        if found:
            clauses.append({"name": name, "risk": severity_if_found, "detail": _clip(found[0])})
            risks.append({
                "name": name,
                "severity": severity_if_found,
                "note": _clip(found[0], 280),
            })
        else:
            clauses.append({"name": name, "risk": empty_risk, "detail": empty_detail})

    add_clause("Limitation of Liability", buckets["liability"], "High", "Medium", "No explicit liability cap found in the uploaded text.")
    add_clause("Termination & Notice", buckets["termination"], "Medium", "Low", "No explicit termination/notice language found.")
    add_clause("Payment Terms", buckets["payment"], "Medium", "Low", "No payment, fee, or commission language found.")
    add_clause("Exclusivity / Restriction", buckets["exclusivity"], "High", "Low", "No exclusivity or non-compete language found.")
    add_clause("Dispute Resolution", buckets["dispute"], "Low", "Medium", "No governing law or dispute forum found.")

    if not buckets["dispute"]:
        ambiguous.append("No governing law or dispute-resolution forum is specified in this file.")
    if not obligations:
        preview = " ".join(text.split()[:45])
        obligations = [_clip(preview) or f"Review the terms in {filename}."]

    dates = re.findall(
        r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|"
        r"(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b",
        text,
        flags=re.I,
    )
    expiry = "Not specified"
    for sentence in sentences:
        if any(w in sentence.lower() for w in ["expir", "term of", "duration", "years from"]):
            expiry = _clip(sentence, 160)
            break

    ml_label, ml_score = ml_risk_prediction(text)
    high_count = sum(1 for r in risks if r["severity"] == "High")
    med_count = sum(1 for r in risks if r["severity"] == "Medium")
    risk_score = ml_score if ml_score is not None else min(max(20 + high_count * 18 + med_count * 10, 10), 95)
    risk_level = ml_label if ml_label in ("Low", "Medium", "High") else (
        "High" if risk_score >= 70 else "Medium" if risk_score >= 40 else "Low"
    )

    first_sentences = " ".join(sentences[:3]) if sentences else " ".join(text.split()[:60])
    summary_text = (
        f"{filename} ({word_count} words). "
        f"{_clip(first_sentences, 420)}"
    )

    recommendations = [
        "Confirm every amount, date, and party name is filled in before signing.",
        "Check termination notice windows against how you actually operate.",
        "Match liability caps to the real value of the deal.",
    ]
    if buckets["blank"]:
        recommendations.insert(0, "Fill the blank/placeholder fields found in this document.")
    if not buckets["dispute"]:
        recommendations.append("Add governing law and a dispute forum.")

    return {
        "summary": summary_text,
        "risk": risk_level,
        "message": {
            "Low": "Low Risk — the uploaded text looks relatively standard.",
            "Medium": "Medium Risk — review the flagged clauses in this file.",
            "High": "High Risk — this file contains clauses that need careful review.",
        }.get(risk_level, "Review recommended."),
        "risk_score": int(risk_score),
        "sentiment": "Neutral" if risk_level == "Low" else "Restrictive",
        "sentiment_score": 50 if risk_level == "Low" else 72,
        "obligations": obligations[:8],
        "risks": risks,
        "ambiguous": ambiguous or ["No obvious blanks found; still verify defined terms."],
        "clauses": clauses,
        "timeline": {
            "draft": dates[0] if dates else "Not specified in text",
            "signing": dates[1] if len(dates) > 1 else (dates[0] if dates else "Not specified in text"),
            "expiry": expiry,
        },
        "recommendations": recommendations,
        "stats": {
            "word_count": word_count,
            "complexity_score": round(min(5 + (word_count / 1500), 9.5), 1),
            "processing_time_sec": 2,
        },
        "engine": "ml+heuristics" if ml_label else "heuristics",
        "filename": filename,
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
        "Explain clauses in plain English using the uploaded document. This is not formal legal advice."
    )
    user = message
    pieces = []
    if LAST_DOC.get("filename"):
        pieces.append(f"Filename: {LAST_DOC['filename']}")
    if LAST_DOC.get("text"):
        pieces.append(LAST_DOC["text"][:3500])
    if context:
        pieces.append(context[:2000])
    if pieces:
        user = "Document context:\n" + "\n".join(pieces) + f"\n\nUser question: {message}"
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
    extra = []
    if LAST_DOC.get("text"):
        extra.append(LAST_DOC["text"][:3500])
    if context:
        extra.append(context[:2000])
    if extra:
        prompt = (
            "You are LegalAI. Use this uploaded document:\n"
            + "\n".join(extra)
            + f"\n\nQuestion: {message}"
        )
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.0-flash:generateContent?key={key}"
    )
    payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["candidates"][0]["content"]["parts"][0]["text"]


def _relevant_passages(message: str, text: str, limit: int = 3) -> list:
    if not text:
        return []
    words = [w for w in re.findall(r"[a-zA-Z]{4,}", message.lower()) if w not in {
        "what", "when", "where", "which", "this", "that", "have", "does", "about", "please", "tell"
    }]
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 20]
    scored = []
    for sentence in sentences:
        lower = sentence.lower()
        hits = sum(1 for w in words if w in lower)
        if hits:
            scored.append((hits, sentence))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [item[1] for item in scored[:limit]]


def chat_heuristic(message: str, context: str) -> str:
    lower = message.lower().strip()
    if "hello" in lower or lower in ("hi", "hey"):
        name = LAST_DOC.get("filename") or "your uploaded document"
        return f"Hello. I can answer from {name}. Ask about risks, payments, termination, or a specific clause."

    analysis = LAST_DOC.get("analysis")
    if context:
        try:
            analysis = json.loads(context)
        except Exception:
            pass

    passages = _relevant_passages(message, LAST_DOC.get("text") or "")
    if passages:
        quoted = "\n".join(f"- {_clip(p, 260)}" for p in passages)
        return (
            f"From {LAST_DOC.get('filename') or 'the uploaded document'}:\n{quoted}\n\n"
            "This is extracted from your file, not a canned sample. Add an API key in legalai/.env for a fuller AI explanation."
        )

    if analysis:
        summary = analysis.get("summary") or ""
        risk = analysis.get("risk") or "Unknown"
        risks = analysis.get("risks") or []
        if "risk" in lower:
            notes = "; ".join(f"{r.get('name')}: {r.get('note')}" for r in risks[:3]) or summary
            return f"Overall risk for {LAST_DOC.get('filename') or 'this file'} is {risk}. {notes}"
        if "summar" in lower:
            return summary or "No summary stored yet. Upload a PDF first."
        if summary:
            return f"I only have the last analysis for {LAST_DOC.get('filename') or 'this file'} (risk {risk}). {summary}"

    return (
        "No matching clause found yet. Upload a PDF on the home page, then ask again. "
        "Optional: set OPENAI_API_KEY in legalai/.env for GPT-powered answers."
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
        remember_document(filename, text)
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
        result = run_analysis(text, filename)
        remember_document(filename, text, result)
        return JSONResponse(result, status_code=200)
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
