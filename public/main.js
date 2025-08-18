// ========= Tori core (shared) =========
const Tori = (() => {
  let voiceOn = true;
  let preferredVoice = null;
  let userInteracted = false;
  let speakQueue = [];

  function pickVoice() {
    const list = speechSynthesis.getVoices() || [];
    return (
      list.find(v => /Google UK English Female/i.test(v.name)) ||
      list.find(v => /Microsoft (Aria|Zira)/i.test(v.name)) ||
      list.find(v => /Samantha/i.test(v.name)) ||
      list.find(v => /female/i.test(v.name)) ||
      list.find(v => /en/i.test(v.lang || ""))
    );
  }

  function ensureVoices() {
    return new Promise(resolve => {
      const check = () => {
        const v = speechSynthesis.getVoices();
        if (v && v.length) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  }

  function flushSpeakQueue() {
    if (!userInteracted) return;
    const q = [...speakQueue];
    speakQueue = [];
    q.forEach(txt => _doSpeak(txt));
  }

  async function _doSpeak(text) {
    if (!('speechSynthesis' in window) || !voiceOn) return;
    try {
      await ensureVoices();
      if (!preferredVoice) preferredVoice = pickVoice();
      const u = new SpeechSynthesisUtterance(text);
      if (preferredVoice) u.voice = preferredVoice;
      u.rate = 1.02; u.pitch = 1.08;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) {
      // silent fail is fine for demo
    }
  }

  // Public speak that respects autoplay policy
  function speak(text) {
    if (!userInteracted) {
      speakQueue.push(text);
      return;
    }
    _doSpeak(text);
  }

  // First interaction “unlocks” audio
  function unlockAudioOnce() {
    if (userInteracted) return;
    userInteracted = true;
    // Prewarm
    if ('speechSynthesis' in window) speechSynthesis.getVoices();
    flushSpeakQueue();
  }

  // Voice input (Chrome/Edge)
  function listen() {
    return new Promise((resolve, reject) => {
      const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Rec) return reject(new Error('SpeechRecognition not supported'));
      const rec = new Rec();
      rec.lang = 'en-AU';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = e => resolve(e.results[0][0].transcript);
      rec.onerror = e => reject(new Error(e.error || 'mic error'));
      rec.onend = () => {};
      rec.start();
    });
  }

  // Small helpers
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => s.replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[m]));

  // global click unlock
  window.addEventListener('pointerdown', unlockAudioOnce, { once:true });

  return {
    setVoice: on => (voiceOn = !!on),
    isVoiceOn: () => voiceOn,
    speak, listen, $, $$, esc
  };
})();

// ========= Page 1 (index.html) logic =========
document.addEventListener('DOMContentLoaded', () => {
  const form = Tori.$('#loginForm');
  if (!form) return; // not on page 1

  const idInput = Tori.$('#studentId');
  const nameInput = Tori.$('#studentName');
  const enterBtn = Tori.$('#enterBtn');
  const voiceTestBtn = Tori.$('#voiceTestBtn');
  const wavingImg = Tori.$('#wavingImg');

  // Make sure image path is correct
  if (wavingImg) wavingImg.src = 'media/tori-waving.jpeg';

  // Submit handler (button or Enter key)
  const go = () => {
    const id = (idInput.value || '').trim();
    const name = (nameInput.value || '').trim();
    // No hard validation for demo
    const url = new URL('app.html', location.href);
    if (id)   url.searchParams.set('studentId', id);
    if (name) url.searchParams.set('studentName', name);
    location.href = url.toString();
  };

  enterBtn?.addEventListener('click', e => { e.preventDefault(); go(); });
  form.addEventListener('submit', e => { e.preventDefault(); go(); });

  // Voice test (requires a click)
  voiceTestBtn?.addEventListener('click', () => {
    Tori.speak('Hello! Voice is working.');
  });
});
