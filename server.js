// server.js
// Express web service: serves /public and proxies AI calls to OpenAI at /api/ask
// Env vars needed on Render: OPENAI_API_KEY (and optionally PORT)

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "1mb" }));

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/healthz", (req, res) => res.send("ok"));

// Minimal knowledge the model can use (you can edit freely)
const KB = {
  fees: "View and pay fees in the Student Portal → Payments. For payment plans, contact Student Services.",
  enrolment: "Use MyLearn → ‘My Subjects’ → ‘Add/Drop’. Check prerequisites and census dates.",
  events: "Examples: Careers Fair, Hackathons, Skills Workshops. Check your calendar regularly.",
  mylearnGuide: [
    "Dashboard → announcements, calendar, grades, messages",
    "Subjects → open a unit; left menu has Announcements, Modules, Assessments, Grades",
    "Assessments → due dates, instructions, rubrics, submissions",
    "Grades → feedback and marks when released",
    "Calendar → class times, due dates, events"
  ],
  contacts: "Student Services: support@university.edu • IT: ithelp@university.edu • Phone: (02) 1234 5678"
};

// AI endpoint
app.post("/api/ask", async (req, res) => {
  try {
    const { message, student } = req.body || {};
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY missing on server" });

    const system = [
      "You are Tori, a warm, concise student assistant for a university website.",
      "Answer clearly in 1–4 short sentences unless the user asks for more detail.",
      "If the user asks about fees, enrolment, events, or MyLearn, use the provided knowledge.",
      "Never fabricate personal student data.",
      `Knowledge: ${JSON.stringify(KB)}`
    ].join("\n");

    const body = {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini", // or "gpt-3.5-turbo"
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        student && (student.name || student.id)
          ? { role: "system", content: `Student context: name="${student.name||""}", id="${student.id||""}"` }
          : null,
        { role: "user", content: String(message || "") }
      ].filter(Boolean)
    };

    // Node 18+ has fetch built-in on Render
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: "OpenAI error", detail: text });
    }
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn’t find that.";
    res.json({ reply });
  } catch (e) {
    console.error("AI error:", e);
    res.status(500).json({ error: "Server error", detail: String(e) });
  }
});

// All other routes → index.html (so links still work if user deep-links)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
