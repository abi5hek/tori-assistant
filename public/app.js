function esc(s){return (s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

async function askAI(message, profile){
  try{
    const r = await fetch('/api/chat', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ message, profile })
    });
    const j = await r.json();
    return j.reply || "(No answer)";
  }catch(e){
    return "(AI backend unreachable)";
  }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  if (document.body.dataset.page !== 'tori') return;

  const cached = JSON.parse(localStorage.getItem('student_profile')||'{}');
  const fromDb = await getStudentProfile(cached.id);
  const profile = { ...cached, ...fromDb };
  const firstName = (profile.name || 'Student').split(/\s+/)[0];

  const logEl = document.getElementById('log');
  const input = document.getElementById('input');
  const send  = document.getElementById('send');
  const micBtn= document.getElementById('micBtn');
  const voiceBtn = document.getElementById('voiceBtn');
  const welcomeLine = document.getElementById('welcomeLine');

  function addMsg(from, text){
    const row = document.createElement('div');
    row.className='row';
    row.innerHTML = `<div class="from">${esc(from)}</div><div class="msg">${esc(text)}</div>`;
    logEl.appendChild(row); logEl.scrollTop = logEl.scrollHeight;
  }

  // greet
  welcomeLine.textContent = `Welcome, ${firstName}!`;
  const greet = `Welcome to Torrens Tower, ${firstName}! For important updates, please check your student email. How can I help you today?`;
  addMsg('Tori', greet); ttsSpeak(greet);

  // quick options
  document.querySelectorAll('.option').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const intent = btn.dataset.intent;
      const prompt = `User clicked: ${intent}. Context:
- Student: ${profile.name} (${profile.id})
- If MyLearn: give a concise step-by-step.
- If Grades/Fees/Events/Calendar: give practical steps and where to find it.
Be friendly and succinct.`;
      const reply = await askAI(prompt, profile);
      addMsg('Tori', reply); ttsSpeak(reply);
    });
  });

  // chat box
  send.addEventListener('click', async ()=>{
    const v = (input.value||'').trim(); if(!v) return;
    addMsg(firstName, v);
    const reply = await askAI(v, profile);
    addMsg('Tori', reply); ttsSpeak(reply);
    input.value='';
  });
  input.addEventListener('keydown', async (e)=>{
    if (e.key==='Enter'){
      const v = (input.value||'').trim(); if(!v) return;
      addMsg(firstName, v);
      const reply = await askAI(v, profile);
      addMsg('Tori', reply); ttsSpeak(reply);
      input.value='';
    }
  });

  // voice
  voiceBtn.addEventListener('click', ()=>{
    voiceOn = !voiceOn;
    voiceBtn.textContent = voiceOn ? '🔊 Voice On' : '🔇 Voice Off';
    if (!voiceOn) { try{ speechSynthesis.cancel(); }catch{} }
  });
  micBtn.addEventListener('click', ()=>{
    sttStart(async (heard)=>{
      input.value = heard;
      addMsg(firstName, heard);
      const reply = await askAI(heard, profile);
      addMsg('Tori', reply); ttsSpeak(reply);
    });
  });
});
