/**
 * Tori Assistant backend
 * - Serves static frontend from /public
 * - /api/chat : OpenAI Chat (needs OPENAI_API_KEY)
 * - /api/student/:id [GET, PUT] : Firestore (optional; needs Firebase Admin env vars)
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- middleware ----------
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- OpenAI ----------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function callOpenAI(userMessage, context = '') {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const systemPrompt = `You are Tori, a friendly university student assistant.
Be concise, specific, and helpful. If you don't know, say so and suggest Student Services.`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      temperature: 0.6,
      messages: [
        { role: 'system', content: systemPrompt + (context ? `\nContext:\n${context}` : '') },
        { role: 'user', content: userMessage || 'Hello' }
      ]
    })
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  return (data?.choices?.[0]?.message?.content || 'Sorry, I could not answer that.').trim();
}

// POST /api/chat  -> { reply }
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body || {};
    const reply = await callOpenAI(message, context);
    res.json({ reply });
  } catch (err) {
    console.error('[AI ERROR]', err.message);
    res.status(500).json({ reply: 'Error contacting AI (check server logs & OPENAI_API_KEY).' });
  }
});

// ---------- Firebase Admin (optional) ----------
let db = null;
(() => {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn('[Firebase] Admin not configured. Student endpoints will return 501.');
    return;
  }
  try {
    const admin = require('firebase-admin');
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'); // un-escape newlines
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey
      })
    });
    db = admin.firestore();
    console.log('[Firebase] Admin initialized.');
  } catch (e) {
    console.error('[Firebase] Initialization failed:', e.message);
  }
})();

// GET /api/student/:id  -> returns /students/{id}
app.get('/api/student/:id', async (req, res) => {
  try {
    if (!db) return res.status(501).json({ error: 'Firebase not configured on server.' });
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Missing student id.' });

    const snap = await db.collection('students').doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Student not found.' });

    res.json({ id, ...snap.data() });
  } catch (e) {
    console.error('[Student GET]', e.message);
    res.status(500).json({ error: 'Failed to fetch student.' });
  }
});

// PUT /api/student/:id  -> upsert fields into /students/{id}
app.put('/api/student/:id', async (req, res) => {
  try {
    if (!db) return res.status(501).json({ error: 'Firebase not configured on server.' });
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Missing student id.' });

    const data = req.body || {};
    await db.collection('students').doc(id).set(data, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    console.error('[Student PUT]', e.message);
    res.status(500).json({ error: 'Failed to save student.' });
  }
});

// health
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// SPA fallback for your frontend (serves /public/index.html)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tori backend running on http://localhost:${PORT}`);
});
