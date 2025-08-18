<script>
// Page 2 logic – greets with name, simple “AI” replies, voice on/off, mic input.
(function(){
  const $  = Tori.qs;
  const $$ = Tori.qsa;

  // ---- State ----
  const url = new URL(location.href);
  const studentId   = url.searchParams.get('studentId')   || sessionStorage.getItem('tori_student_id')   || '';
  const studentName = url.searchParams.get('studentName') || sessionStorage.getItem('tori_student_name') || '';

  // Persist for refresh
  if (studentId)   sessionStorage.setItem('tori_student_id', studentId);
  if (studentName) sessionStorage.setItem('tori_student_name', studentName);

  // ---- UI refs ----
  const whoEl    = $('#who');
  const introEl  = $('#intro');
  const statusEl = $('#statusText');
  const voiceBtn = $('#btnVoice');
  const micBtn   = $('#btnMic');
  const logoutBtn= $('#btnLogout');
  const chatEl   = $('#chat');
  const msgEl    = $('#msg');
  const sendBtn  = $('#send');
  const voiceStateEl = $('#voiceState');

  // ---- Chat helpers ----
  function addMsg(from, text){
    const div = document.createElement('div');
    div.className = 'rowmsg';
    div.innerHTML = `<div class="from">${from}</div><div class="msg">${Tori.escape(text)}</div>`;
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
  }
  function say(text){
    addMsg('Tori', text);
    Tori.speak(text);
  }

  // ---- Greeting ----
  function greet(){
    const who = studentName ? `${studentName} (${studentId || 'no ID'})` : (studentId || 'Guest');
    whoEl.textContent = `Signed in: ${who}`;
    const line = studentName
      ? `Welcome to Torrens Tower, ${studentName}! I can help with fees, enrolment, grades, MyLearn, and campus events.`
      : `Welcome to Torrens Tower! I can help with fees, enrolment, grades, MyLearn, and campus events.`;
    introEl.textContent = line;
    say(line + " For important updates, please check your student email.");
  }
  greet();

  // ---- Voice toggle / mic ----
  function refreshVoiceUI(){
    voiceStateEl.textContent = Tori.isVoiceOn()? 'On':'Off';
  }
  voiceBtn.addEventListener('click', ()=>{
    Tori.setVoice(!Tori.isVoiceOn());
    refreshVoiceUI();
  });
  refreshVoiceUI();

  micBtn.addEventListener('click', async ()=>{
    try{
      statusEl.textContent='Listening…';
      const heard = await Tori.listen();
      statusEl.textContent='Ready';
      msgEl.value = heard;
      handleUser(heard);
    }catch(e){
      statusEl.textContent='Ready';
      alert('Mic not available in this browser.\nUse Chrome/Edge on desktop/mobile.');
    }
  });

  logoutBtn.addEventListener('click', ()=>{
    sessionStorage.removeItem('tori_student_id');
    sessionStorage.removeItem('tori_student_name');
    location.href = 'index.html';
  });

  // ---- Quick chips (left side) ----
  $$('.chip[data-intent]').forEach(chip=>{
    chip.addEventListener('click', ()=> handleIntent(chip.dataset.intent));
  });

  // ---- Send message ----
  sendBtn.addEventListener('click', ()=>{ const v=msgEl.value.trim(); if(v) handleUser(v); });
  msgEl.addEventListener('keydown', e=>{ if(e.key==='Enter'){ const v=msgEl.value.trim(); if(v) handleUser(v); }});

  function handleUser(text){
    msgEl.value='';
    addMsg('You', text);
    handleIntent(routeIntent(text));
  }

  // ---- Simple rule-based assistant (demo mode) ----
  function routeIntent(q){
    q = q.toLowerCase();
    if (q.includes('fee')) return 'fees';
    if (q.includes('enrol') || q.includes('enroll')) return 'enrolment';
    if (q.includes('grade') || q.includes('mark')) return 'grades';
    if (q.includes('event') || q.includes('campus')) return 'events';
    if (q.includes('mylearn') || q.includes('portal') || q.includes('guide')) return 'mylearn';
    if (q.includes('contact') || q.includes('support') || q.includes('helpdesk')) return 'contacts';
    return 'fallback';
  }

  function handleIntent(intent){
    switch(intent){
      case 'fees':
        say("You can view and pay fees in the Student Portal → Payments. For payment plans, contact Student Services.");
        break;
      case 'enrolment':
        say("To manage enrolment: open MyLearn → ‘My Subjects’ → ‘Add/Drop’. Check prerequisites and census dates.");
        break;
      case 'grades':
        say("Grades appear in each subject → ‘Grades’. Marking can take time after submission—watch your subject announcements.");
        break;
      case 'events':
        say("This month: Hackathon (15 Aug), Careers Fair (24 Aug), Study Skills Workshop (Wednesdays 4pm).");
        break;
      case 'contacts':
        say("Student Services: support@university.edu • IT Helpdesk: ithelp@university.edu • Phone: (02) 1234 5678.");
        break;
      case 'mylearn':
        say("MyLearn walkthrough: 1) Dashboard → 2) My Subjects → 3) Inside a subject: Announcements, Modules, Assessments, Grades. See the images on the left for a quick map.");
        break;
      default:
        say("I can help with fees, enrolment, grades, MyLearn, events, or support contacts. Try a chip or ask a question.");
    }
  }
})();
</script>
