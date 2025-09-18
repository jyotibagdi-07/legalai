import openai
import os
from dotenv import load_dotenv

# Load API key from environment
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def summarize_text(text: str) -> str:
    """
    Summarizes legal text using the OpenAI API.
    """
    if not text.strip():
        return "No text found in document."

    try:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a legal AI assistant. Summarize the provided legal text concisely and highlight key clauses."},
                {"role": "user", "content": f"Summarize this legal text:\n\n{text}"}
            ],
            max_tokens=500
        )
        summary = response.choices[0].message.content.strip()
        return summary
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        return "An error occurred during summarization. Please check your API key and network connection."
