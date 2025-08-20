// ---------- Speech core + utils ----------
let voicesReady = false;
let cachedVoice = null;

export async function initSpeech(){
  if (!('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis not supported');
    return;
  }
  await ensureVoicesLoaded();
  chooseVoice();
}

function ensureVoicesLoaded(){
  return new Promise(resolve=>{
    const v = speechSynthesis.getVoices();
    if (v && v.length) return resolve();
    const timer = setInterval(()=>{
      const vv = speechSynthesis.getVoices();
      if (vv && vv.length){ clearInterval(timer); resolve(); }
    }, 120);
    setTimeout(()=>{ clearInterval(timer); resolve(); }, 1500);
  });
}

function chooseVoice(){
  const voices = speechSynthesis.getVoices() || [];
  cachedVoice =
    voices.find(v=>/Google UK English Female/i.test(v.name)) ||
    voices.find(v=>/Samantha/i.test(v.name)) ||
    voices.find(v=>/Zira/i.test(v.name)) ||
    voices.find(v=>/female/i.test(v.name)) ||
    voices.find(v=>/^en/i.test(v.lang||''));
  voicesReady = true;
}

export function speak(text){
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.02; u.pitch = 1.06;
  if (voicesReady && cachedVoice) u.voice = cachedVoice;
  try { speechSynthesis.cancel(); } catch{}
  speechSynthesis.speak(u);
}

export function listenOnce(){
  return new Promise((resolve,reject)=>{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return reject(new Error('SpeechRecognition not supported'));
    const rec = new SR();
    rec.lang = 'en-AU';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = e => resolve(e.results[0][0].transcript);
    rec.onerror = e => reject(e.error || e);
    rec.onend = ()=>{};
    rec.start();
  });
}

export function getParam(key){
  return new URLSearchParams(window.location.search).get(key);
}
