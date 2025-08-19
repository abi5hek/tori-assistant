// public/app.js
// Page 2 assistant: greets by name, hooks buttons, mic, and calls /api/ask for real AI replies.

(function(){
  const { $, $$, esc, speak, listenOnce, setVoice, isVoiceOn } = window.Tori;

  // Elements (make sure your app.html has these IDs/classes)
  const whoEl      = $('#who');
  const introEl    = $('#intro');
  const statusEl   = $('#statusText');
  const voiceBtn   = $('#btnVoice');
  const voiceState = $('#voiceState');
  const micBtn     = $('#btnMic');
  const logoutBtn  = $('#btnLogout');

  const chatEl  = $('#chat');
  const msgEl   = $('#msg');
  const sendBtn = $('#send');

  const toriGif = $('#talkingGif'); // optional <img id="talkingGif">
  if (toriGif) toriGif.src = 'media/tori-talking.gif';

  // Student context from URL or session
  const url = new URL(location.href);
  const student = {
    id:   url.searchParams.get('studentId')   || sessionStorage.getItem('tori_student_id')   || '',
    name: url.searchParams.get('studentName') || sessionStorage.getItem('tori_student_name') || ''
  };
  if (student.id)   sessionStorage.setItem('tori_student_id', student.id);
  if (student.name) sessionStorage.setItem('tori_student_name', student.name);

  // Helpers
  function addMsg(from, text){
    const row = document.createElement('div');
    row.className = 'rowmsg';
    row.innerHTML = `<div class="from">${from}</div><div class="msg">${esc(text)}</div>`;
    chatEl.appendChild(row);
    chatEl.scrollTop = chatEl.scrollHeight;
  }
  function say(text){ addMsg('Tori', text); speak(text); }

  // Greet
  function greet(){
    const who = student.name ? `${student.name}${student.id ? ' ('+student.id+')':''}` : (student.id || 'Guest');
    if (whoEl) whoEl.textContent = `Signed in: ${who}`;
    const line = student.name
      ? `Welcome to Torrens Tower, ${student.name}! I can help with fees, enrolment, grades, MyLearn and campus events.`
      : `Welcome to Torrens Tower! I can help with fees, enrolment, grades, MyLearn and campus events.`;
    if (introEl) introEl.textContent = line;
    say(line + " For important updates, please check your student email.");
  }
  greet();

  // Voice toggle
  function refreshVoiceUI(){ if (voiceState) voiceState.textContent = isVoiceOn() ? 'On' : 'Off'; }
  voiceBtn?.addEventListener('click', ()=>{
    setVoice(!isVoiceOn());
    refreshVoiceUI();
  });
  refreshVoiceUI();

  // Mic (speech-to-text)
  micBtn?.addEventListener('click', async ()=>{
    try{
      if (statusEl) statusEl.textContent = 'Listening…';
      const heard = await listenOnce();
      if (statusEl) statusEl.textContent = 'Ready';
      if (heard) { msgEl.value = heard; handleSend(); }
    }catch(e){
      if (statusEl) statusEl.textContent = 'Ready';
      alert('Voice input not supported in this browser. Use Chrome/Edge over HTTPS.');
    }
  });

  // Logout
  logoutBtn?.addEventListener('click', ()=>{
    sessionStorage.removeItem('tori_student_id');
    sessionStorage.removeItem('tori_student_name');
    location.href = 'index.html';
  });

  // Quick chips on the left (require class="chip" data-intent="fees" etc.)
  $$('.chip[data-intent]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const intent = chip.dataset.intent;
      const prompts = {
        fees:     "Explain how to view and pay my university fees.",
        enrolment:"How do I add or drop subjects in MyLearn and what about census dates?",
        grades:   "Where do I see my grades and feedback in MyLearn?",
        events:   "What campus events are coming up and where do I find the calendar?",
        mylearn:  "Give me a quick MyLearn walkthrough: Dashboard, Subjects, Assessments, Grades, Calendar.",
        contacts: "Give me key support contacts: Student Services and IT Helpdesk."
      };
      const text = prompts[intent] || "Help me with general student support.";
      askAI(text);
    });
  });

  // Send chat
  function handleSend(){
    const v = (msgEl.value || '').trim();
    if (!v) return;
    askAI(v);
    msgEl.value = '';
  }
  sendBtn?.addEventListener('click', handleSend);
  msgEl?.addEventListener('keydown', e=>{ if (e.key === 'Enter') handleSend(); });

  // Call backend AI
  async function askAI(text){
    addMsg('You', text);
    if (statusEl) statusEl.textContent = 'Thinking…';
    try{
      const r = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ message: text, student })
      });
      const data  = await r.json();
      const reply = data?.reply || data?.error || "Sorry, something went wrong.";
      say(reply);
    }catch(e){
      console.error(e);
      say("Network error. Please try again.");
    }finally{
      if (statusEl) statusEl.textContent = 'Ready';
    }
  }
})();
