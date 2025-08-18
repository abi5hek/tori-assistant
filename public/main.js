<script>
// Minimal speech + helpers used by both pages.
// Works offline; requires user gesture to start audio on some browsers.

(function(){
  const Tori = {};
  window.Tori = Tori;

  // ---------- Text to Speech ----------
  let voiceOn = true;
  let preferred = null;

  function pickVoice(){
    const list = speechSynthesis.getVoices() || [];
    // Try some pleasant female voices first
    return list.find(v=>/Google UK English Female/i.test(v.name))
        || list.find(v=>/Microsoft (Aria|Zira)/i.test(v.name))
        || list.find(v=>/Samantha/i.test(v.name))
        || list.find(v=>/female/i.test(v.name))
        || list.find(v=>/en/i.test(v.lang||""));
  }

  function ensureVoices(){
    return new Promise(resolve=>{
      const check=()=>{ if ((speechSynthesis.getVoices()||[]).length) resolve(); else setTimeout(check,120);};
      check();
    });
  }

  Tori.setVoice = (on)=>{ voiceOn = !!on; };
  Tori.isVoiceOn = ()=> voiceOn;

  Tori.speak = async (text)=>{
    if (!('speechSynthesis' in window) || !voiceOn) return;
    try{
      await ensureVoices();
      if (!preferred) preferred = pickVoice();
      const u = new SpeechSynthesisUtterance(text);
      if (preferred) u.voice = preferred;
      u.rate = 1.02; u.pitch = 1.08;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }catch{}
  };

  // ---------- Voice Input (Speech-to-Text) ----------
  Tori.listen = ()=>{
    return new Promise((resolve,reject)=>{
      const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Rec) return reject(new Error('SpeechRecognition not supported'));
      const rec = new Rec();
      rec.lang='en-AU'; rec.interimResults=false; rec.maxAlternatives=1;
      rec.onresult=(e)=>resolve(e.results[0][0].transcript);
      rec.onerror =(e)=>reject(e.error||'mic error');
      rec.onend   =()=>{};
      rec.start();
    });
  };

  // ---------- Small helpers ----------
  Tori.qs = (s)=>document.querySelector(s);
  Tori.qsa= (s)=>Array.from(document.querySelectorAll(s));
  Tori.escape = (s)=>s.replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

  // Say hi once page is interacted (autoplay policies)
  window.addEventListener('click', function once(){
    window.removeEventListener('click', once);
    // prewarm voices
    if ('speechSynthesis' in window) speechSynthesis.getVoices();
  });
})();
</script>
