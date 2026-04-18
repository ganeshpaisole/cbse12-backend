const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '20kb' }));

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate questions
app.post('/api/generate', async (req, res) => {
  try {
    const { subject, chapters, type, count, difficulty, examMode } = req.body;
    if (!subject || !chapters || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
      cbse12: 'CBSE Class 12 board exam. NCERT-based. No negative marking.',
      jee_main: 'JEE Main. Single correct +4/-1. Include numericals. Moderate to hard.',
      jee_adv: 'JEE Advanced. Multiple correct possible. Hardest difficulty beyond NCERT.',
      neet: 'NEET UG. NCERT Biology word-level accuracy. MCQ +4/-1.',
      mht_cet: 'MHT-CET Maharashtra. MCQ +2/0 no negative marking.',
      cuet: 'CUET UG. NCERT Class 12. MCQ +5/-1.',
      bitsat: 'BITSAT. Speed-oriented. MCQ -1 wrong.',
      iiser: 'IISER IAT. All 4 subjects equally. MCQ +4/-1.',
    }[examMode] || 'CBSE Class 12 board exam.';

    const usr = `Generate ${count || 5} ${type} questions for CBSE Grade 12 ${subject}.
Coverage: ${Array.isArray(chapters) ? chapters.join(', ') : chapters}
Difficulty: ${difficulty || 'Mixed'}
Exam context: ${examCtx}
Board exam style. Include NCERT references in explanations.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: sys,
      messages: [{ role: 'user', content: usr }],
    });

    let raw = message.content[0].text.trim()
      .replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();

    const data = JSON.parse(raw);
    res.json({ success: true, data });

  } catch (err) {
    console.error('[GENERATE]', err.message);
    if (err.status === 401) return res.status(500).json({ error: 'API configuration error. Contact admin.' });
    res.status(500).json({ error: err.message || 'Generation failed. Please try again.' });
  }
});

// Generate paper
app.post('/api/paper', async (req, res) => {
  try {
    const { subject, chapters, duration, totalMarks, difficulty, includeChoice, source, examMode, teacherNote, sections } = req.body;
    if (!subject || !totalMarks) return res.status(400).json({ error: 'Missing required fields' });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const cappedMarks = Math.min(parseInt(totalMarks) || 70, 100);

    const sys = `You are a CBSE Grade 12 exam paper setter. Return ONLY valid JSON, no markdown.
Schema: {"paperTitle":"string","examDate":"string","totalMarks":number,"duration":"string","generalInstructions":["string"],"sections":[{"sectionName":"string","sectionDesc":"string","totalMarks":number,"qType":"mcq|vsa|sa|la|casebased","questions":[{"qNum":number,"qText":"string","marks":number,"opts":["(a)..."],"answerKey":"string","answerExplanation":"string"}]}]}`;

    const usr = `Generate a CBSE board exam paper for Grade 12 ${subject}.
Coverage: ${Array.isArray(chapters) ? chapters.join(', ') : (chapters || 'Full syllabus')}
Duration: ${duration || '3 hours'}, Total: ${cappedMarks} marks, Difficulty: ${difficulty || 'Mixed'}
${includeChoice ? 'Include internal choice (OR) in SA and LA questions.' : ''}
${sections ? 'Sections: ' + JSON.stringify(sections) : 'Use standard CBSE pattern'}
${teacherNote ? 'Note: ' + String(teacherNote).slice(0,200) : ''}
Include 5 CBSE-style general instructions. Date: March 2027. Full answer key.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: sys,
      messages: [{ role: 'user', content: usr }],
    });

    let raw = message.content[0].text.trim()
      .replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
    const paper = JSON.parse(raw);
    res.json({ success: true, data: paper });

  } catch (err) {
    console.error('[PAPER]', err.message);
    res.status(500).json({ error: err.message || 'Paper generation failed.' });
  }
});

/* ══════════════════════════════════════════════
   TEACHER-STUDENT CLASS SYSTEM
   In-memory store (resets on restart — MVP)
══════════════════════════════════════════════ */
const classStore = {};
// {classCode: {teacherName, teacherKey, createdAt, students: {}}}
// students: {studentId: {name, joinedAt, progress: []}}

function genCode(n = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Create a class (teacher)
app.post('/api/class/create', (req, res) => {
  const { teacherName } = req.body;
  if (!teacherName || typeof teacherName !== 'string') return res.status(400).json({ error: 'Teacher name required' });
  const classCode = genCode(6);
  const teacherKey = genCode(10);
  classStore[classCode] = { teacherName: teacherName.slice(0, 60), teacherKey, createdAt: new Date().toISOString(), students: {} };
  res.json({ success: true, classCode, teacherKey, teacherName: classStore[classCode].teacherName });
});

// Student joins a class
app.post('/api/class/join', (req, res) => {
  const { classCode, studentName } = req.body;
  if (!classCode || !studentName) return res.status(400).json({ error: 'Class code and student name required' });
  const code = classCode.toString().toUpperCase().trim();
  const cls = classStore[code];
  if (!cls) return res.status(404).json({ error: 'Class not found. Check the code with your teacher.' });
  const studentId = genCode(10);
  cls.students[studentId] = { name: studentName.toString().slice(0, 60), joinedAt: new Date().toISOString(), progress: [] };
  res.json({ success: true, studentId, classCode: code, teacherName: cls.teacherName });
});

// Student syncs quiz progress
app.post('/api/student/sync', (req, res) => {
  const { studentId, classCode, subject, chapter, type, scoreC, scoreW, scoreTot } = req.body;
  if (!studentId || !classCode) return res.status(400).json({ error: 'Missing studentId or classCode' });
  const code = classCode.toString().toUpperCase().trim();
  const cls = classStore[code];
  if (!cls || !cls.students[studentId]) return res.status(404).json({ error: 'Student not found' });
  const pct = scoreTot > 0 ? Math.round((scoreC / scoreTot) * 100) : 0;
  cls.students[studentId].progress.push({ subject, chapter, type, scoreC, scoreW, scoreTot, pct, timestamp: new Date().toISOString() });
  if (cls.students[studentId].progress.length > 100) cls.students[studentId].progress.splice(0, 50);
  res.json({ success: true });
});

// Teacher views class dashboard
app.get('/api/class/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const cls = classStore[code];
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  if (req.headers['x-teacher-key'] !== cls.teacherKey) return res.status(401).json({ error: 'Invalid teacher key' });
  const students = Object.entries(cls.students).map(([id, s]) => {
    const avg = s.progress.length > 0 ? Math.round(s.progress.reduce((a, p) => a + p.pct, 0) / s.progress.length) : null;
    return { id, name: s.name, joinedAt: s.joinedAt, totalQuizzes: s.progress.length, avgScore: avg, recentProgress: s.progress.slice(-10) };
  });
  res.json({ success: true, classCode: code, teacherName: cls.teacherName, students });
});

// Usage stats (admin only)
app.get('/api/usage', (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ status: 'ok', message: 'Usage tracking not configured' });
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
