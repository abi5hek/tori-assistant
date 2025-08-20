// ---------- Intent map + optional AI call ----------
const KB = {
  fees:
`You can view and pay your fees via the Student Portal → Payments.
If you need a plan, contact Student Services.`,

  enrolment:
`Manage enrolments in MyLearn: “My Subjects” → “Add/Drop”.
Please check prerequisites and census dates first.`,

  grades:
`Find grades inside each subject: open the subject → “Grades”.
Feedback appears once released by your lecturer.`,

  events:
`Upcoming items: Hackathon • Careers Fair • Study Skills.
See the Student Hub calendar for dates and RSVP links.`,

  contacts:
`Student Services: support@university.edu
IT Helpdesk: ithelp@university.edu
Phone: (02) 1234 5678`,

  mylearn:
`MyLearn walkthrough:
1) Dashboard shows announcements and deadlines.
2) Click “My Subjects”.
3) Inside a subject: Announcements, Modules, Assessments.
4) The “Grades” tab shows marks and feedback when released.`
};

export function replyForIntent(inputOrIntent, ctx){
  const q = (inputOrIntent || '').toString().toLowerCase();
  if (q === 'fees' || q.includes('fee')) return KB.fees;
  if (q === 'enrolment' || q.includes('enrol') || q.includes('enroll')) return KB.enrolment;
  if (q === 'grades' || q.includes('grade') || q.includes('mark')) return KB.grades;
  if (q === 'events' || q.includes('event') || q.includes('campus')) return KB.events;
  if (q === 'contacts' || q.includes('contact') || q.includes('support')) return KB.contacts;
  if (q === 'mylearn' || q.includes('mylearn') || q.includes('guide')) return KB.mylearn;

  const name = ctx?.name || 'there';
  return `I can help with fees, enrolment, grades, campus events, or a MyLearn walkthrough. What do you need, ${name}?`;
}

/**
 * Tries your backend at /api/ask (OpenAI proxy).
 * If it fails (backend not deployed), returns a canned reply.
 */
export async function askAI(prompt, ctx){
  try{
    const r = await fetch('/api/ask', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ prompt, student: ctx })
    });
    if (!r.ok) throw new Error('backend_error');
    const data = await r.json();
    if (data && data.reply) return data.reply;
    throw new Error('bad_response');
  }catch(_){
    return replyForIntent(prompt, ctx);
  }
}
