import openai
import os

# Load the API key from the environment variable
openai.api_key = os.getenv("OPENAI_API_KEY")

def summarize_text(text: str) -> str:
    """Summarizes legal text using the OpenAI API."""
    if not text.strip():
        return "No text found in document."

    try:
        # Use gpt-4o-mini for efficient summarization
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful legal assistant."},
                {"role": "user", "content": f"Summarize this legal text:\n{text}"}
            ],
            max_tokens=300
        )
        return response.choices[0].message.content.strip()
    except openai.APIError as e:
        print(f"OpenAI API Error: {e}")
        return f"❌ AI summarization failed due to an API error. Please check your API key."
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return f"❌ An unexpected error occurred: {e}"

