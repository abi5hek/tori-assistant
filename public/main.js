// public/main.js
// Shared helpers: Text-to-Speech (TTS), Speech-to-Text (STT), DOM utils, and page-1 login wiring.

const Tori = (() => {
  // ===== DOM helpers =====
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  // ===== TTS =====
  let preferredVoice = null;
  let voiceOn = true;

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
  function pickVoice() {
    const list = speechSynthesis.getVoices() || [];
    return list.find(v => /Google UK English Female/i.test(v.name))
        || list.find(v => /Microsoft (Aria|Zira)/i.test(v.name))
        || list.find(v => /Samantha/i.test(v.name))
        || list.find(v => /female/i.test(v.name))
        || list.find(v => /en/i.test(v.lang||""))
        || null;
  }
  async function speak(text) {
    if (!voiceOn || !('speechSynthesis' in window)) return;
    try {
      await ensureVoices();
      if (!preferredVoice) preferredVoice = pickVoice();
      const u = new SpeechSynthesisUtterance(String(text || ''));
      if (preferredVoice) u.voice = preferredVoice;
      u.rate = 1.02; u.pitch = 1.08;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {}
  }
  const setVoice = on => { voiceOn = !!on; };
  const isVoiceOn = () => voiceOn;

  // ===== STT (mic) =====
  function listenOnce() {
    return new Promise((resolve, reject) => {
      const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Rec) return reject(new Error('SpeechRecognition not supported. Use Chrome/Edge over HTTPS.'));
      const rec = new Rec();
      rec.lang = 'en-AU';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = e => resolve(e.results[0][0].transcript);
      rec.onerror  = e => reject(new Error(e.error || 'mic error'));
      rec.onend    = () => {};
      rec.start();
    });
  }

  // ===== Page 1 (index.html) login wiring (runs only if the form exists) =====
  document.addEventListener('DOMContentLoaded', () => {
    const form = $('#loginForm');
    if (!form) return; // not on index.html

    const idEl     = $('#studentId');
    const nameEl   = $('#studentName');
    const enterBtn = $('#enterBtn');
    const voiceBtn = $('#voiceTest');
    const waving   = $('#wavingImg');

    if (waving) waving.src = 'media/tori-waving.jpeg';

    function go() {
      const id   = (idEl.value || '').trim();
      const name = (nameEl.value || '').trim();
      const url = new URL('app.html', location.href);
      if (id)   url.searchParams.set('studentId', id);
      if (name) url.searchParams.set('studentName', name);
      // also store to session so app.html can read if user strips params
      sessionStorage.setItem('tori_student_id', id);
      sessionStorage.setItem('tori_student_name', name);
      location.href = url.toString();
    }

    form.addEventListener('submit', e => { e.preventDefault(); go(); });
    enterBtn?.addEventListener('click', e => { e.preventDefault(); go(); });

    voiceBtn?.addEventListener('click', () => {
      speak("This is a quick voice test. If you can hear me, text to speech is working.");
    });

    // greet once page loads (some browsers need a click before audio actually plays)
    speak("Welcome to Torrens Tower. I'm Tori. Enter your Student ID and name to get started.");
  });

  return { $, $$, esc, speak, listenOnce, setVoice, isVoiceOn };
})();
