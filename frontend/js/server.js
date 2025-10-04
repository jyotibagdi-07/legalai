import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config(); // Load .env file

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY; // ✅ Read from .env
const PORT = 3000;

if (!API_KEY) {
  console.error("❌ Gemini API key not found. Did you create .env?");
  process.exit(1);
}

app.get("/", (req, res) => {
  res.send("✅ Backend is running with Gemini API support");
});

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    console.log("📩 Received:", userMessage);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage }] }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Gemini API Error:", errorText);
      return res.status(500).json({ error: "Gemini API error", details: errorText });
    }

    const data = await response.json();
    const aiMessage =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No AI response";

    console.log("🤖 Gemini replied:", aiMessage);
    res.json({ reply: aiMessage });

  } catch (err) {
    console.error("❌ Server Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/", (req, res) => {
  res.send("✅ Backend is running with Gemini API support!");
});

app.listen(PORT, () =>
  console.log(`✅ Backend running on http://127.0.0.1:${PORT}`)
);
