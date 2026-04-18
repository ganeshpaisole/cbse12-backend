const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '20kb' }));

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-teacher-key');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ══════════════════════════════════════════════
   PASSWORD HASHING (built-in crypto, no bcrypt)
══════════════════════════════════════════════ */
function hashPass(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return { hash, salt };
}
function verifyPass(password, salt, storedHash) {
  return hashPass(password, salt).hash === storedHash;
}

/* ══════════════════════════════════════════════
   CODE GENERATOR
══════════════════════════════════════════════ */
function genCode(n = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function genDigits(n = 4) {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

/* ══════════════════════════════════════════════
   IN-MEMORY STORE (resets on restart — MVP)
   teacherStore[teacherCode] = {
     name, passwordHash, passwordSalt, subjects[], examMode,
     teacherKey (for legacy class endpoint compat),
     createdAt,
     students: {
       studentCode: { name, passwordHash, passwordSalt, joinedAt, progress[] }
     }
   }
══════════════════════════════════════════════ */
const teacherStore = {};

/* ── TEACHER AUTH ─────────────────────────── */

// POST /api/auth/teacher/register
app.post('/api/auth/teacher/register', (req, res) => {
  const { name, password, subjects, examMode } = req.body;
  if (!name || !password || !subjects || !Array.isArray(subjects) || subjects.length === 0)
    return res.status(400).json({ error: 'Name, password and at least one subject are required.' });
  if (password.length < 4)
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });

  const teacherCode = genCode(6);
  const teacherKey  = genCode(12);
  const { hash, salt } = hashPass(password);

  teacherStore[teacherCode] = {
    name: name.slice(0, 60),
    passwordHash: hash,
    passwordSalt: salt,
    subjects: subjects.slice(0, 8),
    examMode: examMode || 'cbse12',
    teacherKey,
    createdAt: new Date().toISOString(),
    students: {}
  };

  console.log(`[TEACHER] Registered: ${name} → Code: ${teacherCode}`);
  res.json({ success: true, teacherCode, teacherKey, name: teacherStore[teacherCode].name });
});

// POST /api/auth/teacher/login
app.post('/api/auth/teacher/login', (req, res) => {
  const { teacherCode, password } = req.body;
  if (!teacherCode || !password)
    return res.status(400).json({ error: 'Teacher code and password required.' });

  const code = teacherCode.toString().toUpperCase().trim();
  const t = teacherStore[code];
  if (!t) return res.status(404).json({ error: 'Teacher code not found.' });
  if (!verifyPass(password, t.passwordSalt, t.passwordHash))
    return res.status(401).json({ error: 'Incorrect password.' });

  res.json({
    success: true,
    teacherCode: code,
    teacherKey: t.teacherKey,
    name: t.name,
    subjects: t.subjects,
    examMode: t.examMode,
    studentCount: Object.keys(t.students).length
  });
});

// POST /api/teacher/student/invite  — teacher creates a student slot
app.post('/api/teacher/student/invite', (req, res) => {
  const { teacherCode, teacherKey, studentName } = req.body;
  if (!teacherCode || !teacherKey || !studentName)
    return res.status(400).json({ error: 'teacherCode, teacherKey and studentName required.' });

  const code = teacherCode.toString().toUpperCase().trim();
  const t = teacherStore[code];
  if (!t) return res.status(404).json({ error: 'Teacher not found.' });
  if (t.teacherKey !== teacherKey) return res.status(401).json({ error: 'Invalid teacher key.' });

  const studentCode     = genCode(4);
  const studentPassword = genDigits(4);
  const { hash, salt }  = hashPass(studentPassword);

  t.students[studentCode] = {
    name: studentName.slice(0, 60),
    passwordHash: hash,
    passwordSalt: salt,
    joinedAt: new Date().toISOString(),
    progress: []
  };

  res.json({ success: true, studentCode, studentPassword, studentName: t.students[studentCode].name });
});

// POST /api/auth/student/login
app.post('/api/auth/student/login', (req, res) => {
  const { teacherCode, studentCode, studentPassword } = req.body;
  if (!teacherCode || !studentCode || !studentPassword)
    return res.status(400).json({ error: 'Teacher code, student code and password required.' });

  const tc = teacherCode.toString().toUpperCase().trim();
  const sc = studentCode.toString().toUpperCase().trim();
  const t  = teacherStore[tc];
  if (!t) return res.status(404).json({ error: 'Teacher code not found.' });

  const s = t.students[sc];
  if (!s) return res.status(404).json({ error: 'Student code not found.' });
  if (!verifyPass(studentPassword, s.passwordSalt, s.passwordHash))
    return res.status(401).json({ error: 'Incorrect student password.' });

  res.json({
    success: true,
    teacherCode: tc,
    studentCode: sc,
    studentName: s.name,
    teacherName: t.name,
    subjects: t.subjects,
    examMode: t.examMode
  });
});

/* ── STUDENT PROGRESS SYNC ────────────────── */

// POST /api/student/sync
app.post('/api/student/sync', (req, res) => {
  const { teacherCode, studentCode, subject, chapter, type, scoreC, scoreW, scoreTot } = req.body;
  if (!teacherCode || !studentCode)
    return res.status(400).json({ error: 'teacherCode and studentCode required.' });

  const tc = teacherCode.toString().toUpperCase().trim();
  const sc = studentCode.toString().toUpperCase().trim();
  const t  = teacherStore[tc];
  if (!t || !t.students[sc]) return res.status(404).json({ error: 'Student not found.' });

  const pct = scoreTot > 0 ? Math.round((scoreC / scoreTot) * 100) : 0;
  t.students[sc].progress.push({ subject, chapter, type, scoreC, scoreW, scoreTot, pct, timestamp: new Date().toISOString() });
  if (t.students[sc].progress.length > 100) t.students[sc].progress.splice(0, 50);
  res.json({ success: true });
});

/* ── TEACHER DASHBOARD ───────────────────── */

// GET /api/class/:teacherCode  — teacher views all students
app.get('/api/class/:teacherCode', (req, res) => {
  const code = req.params.teacherCode.toUpperCase();
  const t    = teacherStore[code];
  if (!t) return res.status(404).json({ error: 'Teacher not found.' });
  if (req.headers['x-teacher-key'] !== t.teacherKey)
    return res.status(401).json({ error: 'Invalid teacher key.' });

  const students = Object.entries(t.students).map(([sc, s]) => {
    const avg = s.progress.length > 0
      ? Math.round(s.progress.reduce((a, p) => a + p.pct, 0) / s.progress.length)
      : null;
    return { studentCode: sc, name: s.name, joinedAt: s.joinedAt, totalQuizzes: s.progress.length, avgScore: avg, recentProgress: s.progress.slice(-10) };
  });

  res.json({ success: true, teacherCode: code, teacherName: t.name, subjects: t.subjects, examMode: t.examMode, students });
});

/* ══════════════════════════════════════════════
   AI — GENERATE QUESTIONS
══════════════════════════════════════════════ */
app.post('/api/generate', async (req, res) => {
  try {
    const { subject, chapters, type, count, difficulty, examMode } = req.body;
    if (!subject || !chapters || !type)
      return res.status(400).json({ error: 'Missing required fields' });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const sys = `You are a CBSE Grade 12 expert tutor. Return ONLY valid JSON, no markdown.
For MCQ: {"type":"mcq","questions":[{"q":"...","opts":["(a)...","(b)...","(c)...","(d)..."],"correct":0,"exp":"...","source":"..."}]}
For short: {"type":"short","questions":[{"q":"...","a":"...","marks":2,"ncert_ref":"..."}]}
For long: {"type":"long","questions":[{"q":"...","a":"...","marks":5,"ncert_ref":"..."}]}
For hots: {"type":"hots","questions":[{"q":"...","marks":3,"a":"...","hint":"...","skill":"Analysis"}]}
For formula: {"type":"formula","formulas":[{"name":"...","formula":"...","vars":"...","use":"...","ncert_ref":"..."}]}
For fill: {"type":"fill","questions":[{"q":"sentence with ___","answer":"...","hint":"..."}]}
For assertion: {"type":"assertion","questions":[{"assertion":"...","reason":"...","correct":0,"exp":"..."}]}`;

    const examCtx = {
      cbse12:   'CBSE Class 12 board exam. NCERT-based. No negative marking.',
      jee_main: 'JEE Main. Single correct +4/-1. Include numericals. Moderate to hard.',
      jee_adv:  'JEE Advanced. Multiple correct possible. Hardest difficulty beyond NCERT.',
      neet:     'NEET UG. NCERT Biology word-level accuracy. MCQ +4/-1.',
      mht_cet:  'MHT-CET Maharashtra. MCQ +2/0 no negative. Maharashtra State Board (Balbharati) syllabus — Class 11 (20%) + Class 12 (80%). Maharashtra HSC level.',
      cuet:     'CUET UG. NCERT Class 12. MCQ +5/-1.',
      bitsat:   'BITSAT. Speed-oriented. MCQ -1 wrong.',
      iiser:    'IISER IAT. All 4 subjects equally. MCQ +4/-1.',
    }[examMode] || 'CBSE Class 12 board exam.';

    const usr = `Generate ${count || 5} ${type} questions for ${subject}.
Coverage: ${Array.isArray(chapters) ? chapters.join(', ') : chapters}
Difficulty: ${difficulty || 'Mixed'}
Exam context: ${examCtx}
Board exam style. Include source references in explanations.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: sys,
      messages: [{ role: 'user', content: usr }],
    });

    let raw = message.content[0].text.trim()
      .replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();

    const data = JSON.parse(raw);
    res.json({ success: true, data });

  } catch (err) {
    console.error('[GENERATE]', err.message);
    if (err.status === 401) return res.status(500).json({ error: 'API configuration error. Contact admin.' });
    res.status(500).json({ error: err.message || 'Generation failed. Please try again.' });
  }
});

/* ══════════════════════════════════════════════
   AI — GENERATE PAPER
══════════════════════════════════════════════ */
app.post('/api/paper', async (req, res) => {
  try {
    const { subject, chapters, duration, totalMarks, difficulty, includeChoice, source, examMode, teacherNote, sections } = req.body;
    if (!subject || !totalMarks) return res.status(400).json({ error: 'Missing required fields' });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const cappedMarks = Math.min(parseInt(totalMarks) || 70, 100);

    const sys = `You are a CBSE Grade 12 exam paper setter. Return ONLY valid JSON, no markdown.
Schema: {"paperTitle":"string","examDate":"string","totalMarks":number,"duration":"string","generalInstructions":["string"],"sections":[{"sectionName":"string","sectionDesc":"string","totalMarks":number,"qType":"mcq|vsa|sa|la|casebased","questions":[{"qNum":number,"qText":"string","marks":number,"opts":["(a)..."],"answerKey":"string","answerExplanation":"string"}]}]}`;

    const usr = `Generate a board exam paper for Grade 12 ${subject}.
Coverage: ${Array.isArray(chapters) ? chapters.join(', ') : (chapters || 'Full syllabus')}
Duration: ${duration || '3 hours'}, Total: ${cappedMarks} marks, Difficulty: ${difficulty || 'Mixed'}
${includeChoice ? 'Include internal choice (OR) in SA and LA questions.' : ''}
${sections ? 'Sections: ' + JSON.stringify(sections) : 'Use standard board exam pattern'}
${teacherNote ? 'Note: ' + String(teacherNote).slice(0, 200) : ''}
Include 5 general instructions. Date: March 2027. Full answer key.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: sys,
      messages: [{ role: 'user', content: usr }],
    });

    let raw = message.content[0].text.trim()
      .replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
    const paper = JSON.parse(raw);
    res.json({ success: true, data: paper });

  } catch (err) {
    console.error('[PAPER]', err.message);
    res.status(500).json({ error: err.message || 'Paper generation failed.' });
  }
});

// Usage stats (admin)
app.get('/api/usage', (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ status: 'ok', teacherCount: Object.keys(teacherStore).length });
});

/* ── ADMIN AUTH & MANAGEMENT ──────────────── */

// POST /api/auth/admin/login
app.post('/api/auth/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required.' });
  if (!process.env.ADMIN_SECRET || password !== process.env.ADMIN_SECRET)
    return res.status(401).json({ error: 'Invalid admin password.' });
  res.json({ success: true, role: 'admin' });
});

// GET /api/admin/teachers — list all teachers
app.get('/api/admin/teachers', (req, res) => {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET)
    return res.status(401).json({ error: 'Unauthorized' });
  const teachers = Object.entries(teacherStore).map(([code, t]) => ({
    teacherCode: code,
    name: t.name,
    subjects: t.subjects,
    examMode: t.examMode,
    createdAt: t.createdAt,
    studentCount: Object.keys(t.students).length
  }));
  res.json({ success: true, teachers, totalTeachers: teachers.length });
});

// DELETE /api/admin/teacher/:code
app.delete('/api/admin/teacher/:code', (req, res) => {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET)
    return res.status(401).json({ error: 'Unauthorized' });
  const code = req.params.code.toUpperCase();
  if (!teacherStore[code]) return res.status(404).json({ error: 'Teacher not found.' });
  delete teacherStore[code];
  console.log(`[ADMIN] Deleted teacher: ${code}`);
  res.json({ success: true, message: `Teacher ${code} deleted.` });
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CBSE12 Backend running on port ${PORT}`);
  console.log(`API key: ${process.env.ANTHROPIC_API_KEY ? 'SET ✅' : 'MISSING ❌'}`);
});
