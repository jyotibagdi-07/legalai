import os
import openai

# Load from environment variable
openai.api_key = os.getenv("OPENAI_API_KEY")

def summarize(text):
    response = openai.Completion.create(
        engine="text-davinci-003",
        prompt=f"Simplify this legal text into plain English:\n\n{text}",
        max_tokens=300
    )
    return response.choices[0].text.strip()
