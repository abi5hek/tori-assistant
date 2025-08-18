// -----------------------------
// main.js  (shared utilities)
// - Text-to-Speech (TTS)
// - Voice utils loader
// - Small DOM helpers
// -----------------------------

// ---------- Text-to-Speech (TTS) ----------
let voiceOn = true;             // toggled on page 2 via a button
let preferredVoice = null;

function pickVoice() {
  const voices = speechSynthesis.getVoices() || [];
  // Prefer pleasant female voices, fallback to any English
  return voices.find(v => /Google UK English Female/i.test(v.name))
      || voices.find(v => /Samantha/i.test(v.name))            // Safari
      || voices.find(v => /Microsoft Zira/i.test(v.name))      // Windows
      || voices.find(v => /female/i.test(v.name))
      || voices.find(v => /en/i.test(v.lang || "")) || null;
}

function ensureVoices() {
  return new Promise(resolve => {
    const check = () => {
      const v = speechSynthesis.getVoices();
      if (v && v.length) resolve();
      else setTimeout(check, 120);
    };
    check();
  });
}

async function speak(text){
  try{
    if (!voiceOn) return;
    if (!('speechSynthesis' in window)) return;

    if (!preferredVoice){
      await ensureVoices();
      preferredVoice = pickVoice();
    }

    const u = new SpeechSynthesisUtterance(String(text || ''));
    if (preferredVoice) u.voice = preferredVoice;
    u.rate = 1.02; u.pitch = 1.08;

    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }catch(_e){}
}

// ---------- Tiny helpers ----------
function esc(s){ return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }
function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

// Expose some helpers to other scripts (optional)
window.Tori = { speak, esc, $, $all, get voiceOn(){ return voiceOn; }, set voiceOn(v){ voiceOn = !!v; } };
