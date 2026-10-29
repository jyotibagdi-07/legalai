import os
import re


def _has_openai_key() -> bool:
    key = os.getenv("OPENAI_API_KEY", "")
    return bool(key and len(key.strip()) > 20 and not key.strip().lower().startswith("your_"))


def summarize_text(text: str) -> str:
    """Summarizes legal text using OpenAI, or a local extract if no key is set."""
    if not text or not text.strip():
        return "No text found in document."

    if _has_openai_key():
        try:
            import openai
            openai.api_key = os.getenv("OPENAI_API_KEY")
            response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful legal assistant."},
                    {"role": "user", "content": f"Summarize this legal text in plain English:\n{text[:8000]}"}
                ],
                max_tokens=300
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"OpenAI summarization failed, using local summary: {e}")

    words = text.split()
    preview = " ".join(words[:120])
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    first = sentences[0] if sentences else preview
    return (
        f"Local summary ({len(words)} words): {first[:400]}"
        + ("..." if len(first) > 400 else "")
    )
