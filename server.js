// server.js
// Express backend for Tori Assistant
// - Serves static frontend from /public
// - Proxies chat to OpenAI at POST /api/chat
// - Keep your OPENAI_API_KEY in .env (local) or Render Env Vars.

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

// --- Load .env in local dev (Render uses its own Env Vars UI)
try { require('dotenv').config(); } catch (_) {}

// --- Polyfill / fallback fetch for Node <18
let _fetch = global.fetch;
if (typeof _fetch !== 'function') {
  try { _fetch = require('node-fetch'); }
  catch { console.error('No fetch() available. Install node-fetch or use Node 18+.'); process.exit(1); }
}

// --- Basic config
const PORT = process.env.PORT ? Number(process.env.PORT) : 10000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (!OPENAI_API_KEY) {
  console.warn('[WARN] OPENAI_API_KEY is missing. /api/chat will return 500.');
}

const app = express();
app.use(express.json({ limit: '1mb' }));

// --- CORS (allow specific origins if provided)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGIN.length === 0) return cb(null, true);
    return cb(null, ALLOWED_ORIGIN.includes(origin));
  },
}));

// --- Static frontend
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// --- Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now(), hasKey: Boolean(OPENAI_API_KEY) });
});

// --- OpenAI chat proxy
// Request body:
// { messages: [{role:'system'|'user'|'assistant', content:'...'}],
//   model?: 'gpt-3.5-turbo',
//   temperature?: number }
app.post('/api/chat', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Server missing OPENAI_API_KEY' });
  }

  const { messages, model, temperature } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] required' });
  }

  // Default model & settings
  const useModel = model || 'gpt-3.5-turbo';
  const temp = typeof temperature === 'number' ? temperature : 0.7;

  try {
    const resp = await _fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: useModel,
        temperature: temp,
        messages,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error('[OpenAI error]', resp.status, text);
      return res.status(502).json({ error: 'OpenAI API error', status: resp.status, detail: text });
    }

    const data = await resp.json();
    // Standardize a small response for the frontend
    const answer = data?.choices?.[0]?.message?.content?.trim() || '';
    res.json({ answer, raw: data });
  } catch (err) {
    console.error('[OpenAI fetch failed]', err);
    res.status(500).json({ error: 'Failed to reach OpenAI', detail: String(err) });
  }
});

// --- (Optional) Fallback to index.html for unknown routes under root
// If you have multiple pages (index.html, app.html) this is not strictly needed,
// but it helps if someone hits "/" without a file.
app.get('/', (_req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.send('Tori Assistant server is running.');
});

// --- Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Tori backend running on http://localhost:${PORT}\n`);
});
