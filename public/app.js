document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const whoEl       = Tori.$('#who');
  const introEl     = Tori.$('#intro');
  const statusEl    = Tori.$('#statusText');
  const voiceBtn    = Tori.$('#btnVoice');
  const micBtn      = Tori.$('#btnMic');
  const logoutBtn   = Tori.$('#btnLogout');
  const chatEl      = Tori.$('#chat');
  const msgEl       = Tori.$('#msg');
  const sendBtn     = Tori.$('#send');
  const voiceState  = Tori.$('#voiceState');
  const talkingGif  = Tori.$('#talkingGif');

  // Ensure media paths are correct
  if (talkingGif) talkingGif.src = 'media/tori-talking.gif';

  // Params / session
  const url = new URL(location.href);
  const studentId   = url.searchParams.get('studentId')   || sessionStorage.getItem('tori_student_id')   || '';
  const studentName = url.searchParams.get('studentName') || sessionStorage.getItem('tori_student_name') || '';

  if (studentId)   sessionStorage.setItem('tori_student_id', studentId);
  if (studentName) sessionStorage.setItem('tori_student_name', studentName);

  // UI helpers
  function addMsg(from, text){
    const row = document.createElement('div');
    row.className = 'rowmsg';
    row.innerHTML = `<div class="from">${from}</div><div class="msg">${Tori.esc(text)}</div>`;
    chatEl.appendChild(row);
    chatEl.scrollTop = chatEl.scrollHeight;
  }
  function say(text){ addMsg('Tori', text); Tori.speak(text); }

  // Greet
  const who = studentName ? `${studentName}${studentId ? ' ('+studentId+')':''}` : (studentId || 'Guest');
  whoEl.textContent = `Signed in: ${who}`;
  const greetLine = studentName
    ? `Welcome to Torrens Tower, ${studentName}! I can help with fees, enrolment, grades, MyLearn and campus events.`
    : `Welcome to Torrens Tower! I can help with fees, enrolment, grades, MyLearn and campus events.`;
  introEl.textContent = greetLine;
  // Will actually speak once the user clicks somewhere (autoplay policy)
  Tori.speak(greetLine + ' For important updates, please check your student email.');

  // Voice toggle
  function refreshVoice(){ voiceState.textContent = Tori.isVoiceOn() ? 'On' : 'Off'; }
  voiceBtn.addEventListener('click', ()=>{ Tori.setVoice(!Tori.isVoiceOn()); refreshVoice(); });
  refreshVoice();

  // Mic (Speech-to-Text)
  micBtn.addEventListener('click', async ()=>{
    try{
      statusEl.textContent='Listening…';
      const heard = await Tori.listen();
      statusEl.textContent='Ready';
      msgEl.value = heard;
      handleUser(heard);
    }catch(e){
      statusEl.textContent='Ready';
      alert('Voice input is unavailable in this browser.\nPlease use Chrome or Edge over HTTPS.');
    }
  });

  // Logout
  logoutBtn.addEventListener('click', ()=>{
    sessionStorage.removeItem('tori_student_id');
    sessionStorage.removeItem('tori_student_name');
    location.href = 'index.html';
  });

  // Chips
  Tori.$$('.chip[data-intent]').forEach(chip=>{
    chip.addEventListener('click', ()=> handleIntent(chip.dataset.intent));
  });

  // Chat input
  function handleUser(text){
    if (!text) return;
    msgEl.value = '';
    addMsg('You', text);
    handleIntent(route(text));
  }
  sendBtn.addEventListener('click', ()=> handleUser(msgEl.value.trim()));
  msgEl.addEventListener('keydown', e=>{
    if (e.key === 'Enter') handleUser(msgEl.value.trim());
  });

  // Router (demo AI, rule-based)
  function route(q){
    q = (q||'').toLowerCase();
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
        say("Grades appear inside each subject → ‘Grades’. Marking takes time after submissions; watch announcements.");
        break;
      case 'events':
        say("This month: Hackathon (15 Aug), Careers Fair (24 Aug), Study Skills Workshop (Wednesdays 4pm).");
        break;
      case 'contacts':
        say("Student Services: support@university.edu • IT Helpdesk: ithelp@university.edu • Phone: (02) 1234 5678.");
        break;
      case 'mylearn':
        say("MyLearn walkthrough: 1) Dashboard, 2) My Subjects, 3) Inside a subject: Announcements, Modules, Assessments, Grades. See the gallery on the left for a visual guide.");
        break;
      default:
        say("I can help with fees, enrolment, grades, MyLearn, events, or contacts. Try a chip or ask a question.");
    }
  }
});
