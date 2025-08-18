// ---------- TTS/STT (shared) ----------
let voiceOn = true, cachedVoice = null, ttsUnlocked = false, lipTimer = null;

function ensureVoicesReady(timeoutMs=4000){
  return new Promise(res=>{
    const v = speechSynthesis.getVoices();
    if (v && v.length) return res();
    speechSynthesis.onvoiceschanged = ()=>{ speechSynthesis.onvoiceschanged=null; res(); };
    setTimeout(()=>res(), timeoutMs);
  });
}
function pickVoice(){
  const vs = speechSynthesis.getVoices() || [];
  return vs.find(v=>/Google UK English Female/i.test(v.name))
      || vs.find(v=>/Microsoft Zira/i.test(v.name))
      || vs.find(v=>/Samantha/i.test(v.name))
      || vs.find(v=>/female/i.test(v.name))
      || vs.find(v=>/en/i.test(v.lang||""))
      || vs[0] || null;
}
function unlockTTSOnce(){
  if (ttsUnlocked) return;
  const f=()=>{ ttsUnlocked=true; window.removeEventListener('pointerdown',f); window.removeEventListener('keydown',f); };
  window.addEventListener('pointerdown',f,{once:true});
  window.addEventListener('keydown',f,{once:true});
}
async function ttsInit(){
  if (!('speechSynthesis' in window)) return;
  unlockTTSOnce();
  await ensureVoicesReady();
  cachedVoice = cachedVoice || pickVoice();
}

function lipsyncStart(){
  try{
    const model = window.__live2dModel;
    if (!model) return;
    clearInterval(lipTimer);
    let i=0;
    lipTimer = setInterval(()=>{
      const y = 0.12 + 0.88*Math.abs(Math.sin(i+=0.32));
      try{ model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', y); }catch{}
    }, 50);
  }catch{}
}
function lipsyncStop(){
  clearInterval(lipTimer);
  try{ window.__live2dModel?.internalModel?.coreModel?.setParameterValueById('ParamMouthOpenY', 0); }catch{}
}
function ttsSpeak(text){
  if (!voiceOn || !('speechSynthesis' in window)) return;
  if (!ttsUnlocked){
    const once=()=>{window.removeEventListener('pointerdown',once);window.removeEventListener('keydown',once);ttsUnlocked=true;ttsSpeak(text);};
    window.addEventListener('pointerdown', once, { once:true });
    window.addEventListener('keydown',   once, { once:true });
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  cachedVoice=cachedVoice||pickVoice();
  if (cachedVoice) u.voice=cachedVoice;
  u.rate=1.02; u.pitch=1.08;
  u.onstart=lipsyncStart; u.onend=lipsyncStop; u.onerror=lipsyncStop;
  try{ speechSynthesis.cancel(); }catch{}
  speechSynthesis.speak(u);
}
function sttStart(onText){
  const statusEl = document.querySelector('#statusText');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ alert('Voice input not supported. Try Chrome/Edge.'); return; }
  const rec = new SR();
  rec.lang='en-AU'; rec.interimResults=false; rec.maxAlternatives=1;
  rec.onstart=()=> statusEl && (statusEl.textContent='Listening…');
  rec.onerror=()=> statusEl && (statusEl.textContent='Ready');
  rec.onend  =()=> statusEl && (statusEl.textContent='Ready');
  rec.onresult=(e)=> onText(e.results[0][0].transcript);
  rec.start();
}

// ---------- Live2D Loader ----------
async function initLive2D(stageId, modelUrl){
  await ttsInit(); // prep voices on both pages
  const stageEl = document.getElementById(stageId);
  if (!stageEl || !PIXI?.live2d) return;
  try{
    const app = new PIXI.Application({ backgroundAlpha:0, resizeTo:stageEl, antialias:true, powerPreference:'high-performance' });
    stageEl.appendChild(app.view);
    const { Live2DModel } = PIXI.live2d;
    const model = await Live2DModel.from(modelUrl);
    window.__live2dModel = model; // expose for lipsync
    model.anchor.set(0.5, 0.5);
    function position(){
      model.position.set(app.renderer.width/2, app.renderer.height*0.98);
      const scale = Math.min(app.renderer.width/900, app.renderer.height/1000);
      model.scale.set(scale);
    }
    position(); window.addEventListener('resize', position);
    app.stage.addChild(model);

    // gentle idle
    app.ticker.add(()=>{
      const t = performance.now()/1000;
      try{
        const cm = model.internalModel.coreModel;
        cm.setParameterValueById('ParamAngleX', Math.sin(t*0.8)*5);
        cm.setParameterValueById('ParamBodyAngleX', Math.sin(t*0.5)*3);
      }catch{}
    });

    // tap reaction if motion exists
    stageEl.addEventListener('pointerdown', ()=>{ try{ model.motion('FlickUp',0)?.start?.(); }catch{} });
  }catch(err){
    console.error("[Live2D] failed:", err);
    stageEl.innerHTML = `<div style="display:grid;place-items:center;height:100%;color:#7a3d1f">
      <div>Model failed to load. Check <code>${modelUrl}</code> & file paths.</div></div>`;
  }
}

// ---------- Page 1 (login) ----------
document.addEventListener('DOMContentLoaded', ()=>{
  if (document.body.dataset.page !== 'intro') return;

  document.getElementById('introForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('studentName').value.trim();
    const id   = document.getElementById('studentId').value.trim();
    if (!name || !id){ alert('Please enter your name and student ID.'); return; }
    await saveStudentProfile({ name, id });       // Firestore write
    localStorage.setItem('student_profile', JSON.stringify({ name, id })); // quick cache
    window.location.href = 'app.html';
  });

  // Optional: test voice to unlock autoplay
  document.getElementById('testVoiceBtn')?.addEventListener('click', ()=>{
    const u = new SpeechSynthesisUtterance("Hello from Tori. Voice is ready.");
    try{ speechSynthesis.cancel(); }catch{}
    speechSynthesis.speak(u);
  });
});
