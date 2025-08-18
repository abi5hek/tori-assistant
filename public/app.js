// -----------------------------
// app.js  (Page 2 logic)
// - Loads session (name/ID)
// - Chat UI (calls /api/chat)
// - Quick chips
// - Voice input (Chrome/Edge)
// - Optional student lookup (if backend Firebase configured)
// -----------------------------

// Shortcuts (imported from main.js)
const { speak, esc, $, $all } = window.Tori;

// ----- DOM refs -----
const chat   = $('#chat');
const input  = $('#msg');
const btnSend   = $('#send');
const btnMic    = $('#btnMic');
const btnVoice  = $('#btnVoice');
const btnLogout = $('#btnLogout');
const whoEl  = $('#who');

// ----- Session (set on index.html) -----
const studentId   = sessionStorage.getItem('tori_student_id')   || '';
const studentName = sessionStorage.getItem('tori_student_name') || 'there';
whoEl.textContent = studentName;

// Greet
speak(`Welcome to Torrens Tower, ${studentName}. I can help with MyLearn, fees, enrolment, grades, or campus events. For important updates, please check your student email account.`);

// ----- Voice toggle -----
btnVoice.addEventListener('click', () => {
  window.Tori.voiceOn = !window.Tori.voiceOn;
  btnVoice.textContent = window.Tori.voiceOn ? "🔊 Voice On" : "🔇 Voice Off";
  if (!window.Tori.voiceOn && 'speechSynthesis' in window) speechSynthesis.cancel();
});

// ----- Logout -----
btnLogout.addEventListener('click', () => {
  sessionStorage.removeItem('tori_student_id');
  sessionStorage.removeItem('tori_student_name');
  location.href = 'index.html';
});

// ----- Chat helpers -----
function addMsg(who, text){
  const row = document.createElement('div');
  row.className = `msg ${who}`;
  row.innerHTML = `<div>${esc(text)}</div>`;
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
}

async function askAI(text, extraContext=''){
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ message: text, context: extraContext })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json(); // { reply }
}

// ----- Send flow -----
async function sendMsg(){
  const text = input.value.trim();
  if (!text) return;

  addMsg('user', text);
  input.value = '';

  try{
    const context = studentId ? `Student ID: ${studentId}; Name: ${studentName}` : '';
    const { reply } = await askAI(text, context);
    addMsg('ai', reply);
    speak(reply);
  }catch(err){
    console.error(err);
    addMsg('ai', "Sorry, I couldn't reach the AI right now.");
  }
}

btnSend.addEventListener('click', sendMsg);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMsg(); });

// ----- Quick chips -----
$all('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const prompt = chip.dataset.prompt || chip.textContent || '';
    if (!prompt) return;
    input.value = prompt;
    sendMsg();
  });
});

// ----- Voice input (Chrome/Edge) -----
let rec = null;
if ('webkitSpeechRecognition' in window){
  rec = new webkitSpeechRecognition();
  rec.lang = 'en-AU';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    input.value = e.results[0][0].transcript;
    sendMsg();
  };
  rec.onerror = () => {};  // ignore
}
btnMic.addEventListener('click', () => { try{ rec?.start?.(); }catch(_e){} });

// ----- OPTIONAL: auto-load student record if backend Firebase is configured -----
// Uncomment the call at the bottom if you want it
async function loadStudent(){
  if (!studentId) return;
  try{
    const r = await fetch(`/api/student/${encodeURIComponent(studentId)}`);
    if (!r.ok) return; // 404 or 501 -> ignore
    const data = await r.json();

    const parts = [];
    if (data.name) parts.push(`Name: ${data.name}`);
    if (data.email) parts.push(`Email: ${data.email}`);
    if (data.gpa !== undefined) parts.push(`GPA: ${data.gpa}`);
    if (data.fees?.status) parts.push(`Fees: ${data.fees.status}${data.fees.amount ? ` ($${data.fees.amount})` : ''}`);

    if (parts.length){
      addMsg('ai', `I found your record:\n• ${parts.join('\n• ')}`);
      speak(`I found your record, ${data.name || studentName}.`);
    }
  }catch(_e){}
}

// If you want to auto-fetch student data when the page opens, uncomment:
// loadStudent();
