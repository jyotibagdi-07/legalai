    from fastapi import FastAPI, UploadFile, File
    from fastapi.middleware.cors import CORSMiddleware
    import shutil
    import os
    from dotenv import load_dotenv

    # Absolute imports based on project structure
    from legal_backend.utils.pdf_reader import extract_text_from_pdf
    from legal_backend.utils.ai_summarizer import summarize_text

    load_dotenv()

    app = FastAPI()

    # Allow frontend (legalAI/index.html) to talk to backend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def home():
        return {"message": "Backend is running 🚀"}

    @app.post("/analyze/")
    async def analyze_document(file: UploadFile = File(...)):
        # 1. Ensure uploads folder exists
        UPLOAD_DIR = "uploads"
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        # 2. Save uploaded file
        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 3. Extract text from PDF
        text = extract_text_from_pdf(file_location)

        # 4. Summarize using AI
        summary = summarize_text(text)

        return {"summary": summary}
    
