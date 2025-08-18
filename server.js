import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve the frontend from /public
app.use(express.static(path.join(__dirname, "public")));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Real AI proxy: POST /api/chat  { message, profile }
app.post("/api/chat", async (req, res) => {
  try {
    const { message, profile } = req.body || {};
    if (!message) return res.json({ reply: "Please ask a question." });
    if (!OPENAI_API_KEY) return res.status(500).json({ reply: "(Missing OPENAI_API_KEY)" });

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: "You are Tori, a friendly Torrens University student assistant. Be concise and practical." },
          { role: "user", content: `Student: ${JSON.stringify(profile)}\nQuestion: ${message}` }
        ]
      })
    });

    const j = await r.json();
    const reply = j?.choices?.[0]?.message?.content?.trim() || "(No answer)";
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.json({ reply: "(AI backend unreachable)" });
  }
});

// Default route -> login page
app.get("*", (_, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running  →  http://localhost:${PORT}`));
