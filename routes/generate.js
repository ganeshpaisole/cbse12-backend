const express  = require('express');
const router   = express.Router();
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');
const { logUsage } = require('../middleware/logger');

// ── STRICTER RATE LIMIT for AI generation ──
const genLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 20,                    // 20 generations per IP per hour
  message: { error: 'Generation limit reached (20/hour). Please wait before generating more questions.' },
});

router.post('/', genLimiter, async (req, res) => {
  try {
    const {
      subject, chapters, type, count, difficulty,
      source, examMode, systemPrompt, userPrompt
    } = req.body;

    // ── INPUT VALIDATION ────────────────────
    if (!subject || !chapters || !type) {
      return res.status(400).json({ error: 'Missing required fields: subject, chapters, type' });
    }
    if (!['mcq','assertion','hots','formula','short','long','fill'].includes(type)) {
      return res.status(400).json({ error: 'Invalid question type' });
    }
    const validSubjects = ['physics','chemistry','mathematics','english','cs','biology'];
    if (!validSubjects.includes(subject)) {
      return res.status(400).json({ error: 'Invalid subject' });
    }
    const questionCount = Math.min(parseInt(count) || 5, 20); // max 20 questions

    // ── SANITISE PROMPTS ────────────────────
    // Use server-side prompts — never trust client-provided system prompts
    const sys = buildSystemPrompt(type);
    const usr = buildUserPrompt({ subject, chapters, type, count: questionCount, difficulty, source, examMode });

    // ── CALL ANTHROPIC API (key is safe on server) ──
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: sys,
      messages: [{ role: 'user', content: usr }],
    });

    // ── PARSE AND VALIDATE RESPONSE ─────────
    let raw = message.content[0].text.trim()
      .replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ error: 'AI returned invalid JSON. Please try again.' });
    }

    // ── LOG USAGE ───────────────────────────
    await logUsage({
      endpoint: 'generate',
      ip: req.ip,
      subject, type, count: questionCount,
      inputTokens:  message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      estimatedCostUSD: calculateCost(message.usage),
    });

    res.json({ success: true, data });

  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json({ error: 'Anthropic API rate limit reached. Please wait a moment.' });
    }
    if (err.status === 401) {
      return res.status(500).json({ error: 'API configuration error. Contact admin.' });
    }
    console.error('[GENERATE ERROR]', err.message);
    res.status(500).json({ error: 'Failed to generate questions. Please try again.' });
  }
});

// ── PROMPT BUILDERS ──────────────────────
function buildSystemPrompt(type) {
  return `You are a CBSE Grade 12 expert tutor and examiner. Return ONLY valid JSON, no markdown, no fences.
For MCQ: {"type":"mcq","questions":[{"q":"...","opts":["(a)...","(b)...","(c)...","(d)..."],"correct":0,"exp":"...","source":"..."}]}
For assertion: {"type":"assertion","questions":[{"assertion":"...","reason":"...","correct":0,"exp":"..."}]}
For hots: {"type":"hots","questions":[{"q":"...","marks":3,"a":"...","hint":"...","skill":"Analysis|Evaluation|Application"}]}
For formula: {"type":"formula","formulas":[{"name":"...","formula":"ASCII notation","vars":"...","use":"...","ncert_ref":"..."}]}
For short: {"type":"short","questions":[{"q":"...","a":"...","marks":2,"ncert_ref":"..."}]}
For long: {"type":"long","questions":[{"q":"...","a":"...","marks":5,"ncert_ref":"..."}]}
For fill: {"type":"fill","questions":[{"q":"sentence with ___ blank","answer":"...","hint":"..."}]}
correct is 0-indexed. All content must be accurate for CBSE Class 12.`;
}

function buildUserPrompt({ subject, chapters, type, count, difficulty, source, examMode }) {
  const subjectNames = {
    physics:'Physics', chemistry:'Chemistry', mathematics:'Mathematics',
    english:'English Core', cs:'Computer Science', biology:'Biology'
  };
  const typeNames = {
    mcq:'Multiple Choice Questions', assertion:'Assertion & Reason questions',
    hots:'HOTS (Higher Order Thinking) questions', formula:'a Formula Bank',
    short:'Short Answer Questions', long:'Long Answer Questions (5 marks)',
    fill:'Fill in the Blank questions'
  };
  const examContexts = {
    cbse12:   'CBSE Class 12 board exam. No negative marking. All section types applicable.',
    jee_main: 'JEE Main. Single correct +4/-1. Include numericals. Moderate to hard difficulty.',
    jee_adv:  'JEE Advanced. Deep conceptual. Multiple correct possible. Beyond NCERT level.',
    neet:     'NEET UG. NCERT Biology word-level accuracy. Standard MCQ +4/-1.',
    mht_cet:  'MHT-CET. MCQ +2/0 no negative. Maharashtra HSC syllabus.',
    cuet:     'CUET UG. NCERT Class 12. MCQ +5/-1. Select 40/50 style.',
    bitsat:   'BITSAT. Speed-oriented. Mixed subjects. MCQ -1 wrong.',
    iiser:    'IISER IAT. All 4 subjects equally. MCQ +4/-1. Conceptual clarity.',
  };

  const chapterLabel = Array.isArray(chapters)
    ? chapters.slice(0, 5).join(', ') + (chapters.length > 5 ? ` +${chapters.length - 5} more` : '')
    : chapters;

  const sourceLabel = {
    ncert:    'NCERT textbook',
    exemplar: 'NCERT Exemplar Problems',
    pyq:      'Previous Year CBSE Board Questions (2015-2024)',
    mixed:    'NCERT + PYQ combined',
  }[source] || 'NCERT textbook';

  return `Generate ${type === 'formula' ? 'all key formulas' : count + ' ' + typeNames[type]} for CBSE Grade 12 ${subjectNames[subject]}.
Coverage: ${chapterLabel}
Difficulty: ${difficulty || 'Mixed'}
Source: ${sourceLabel}
Exam Context: ${examContexts[examMode] || examContexts.cbse12}

- Board exam style, syllabus accurate
- In explanation field, cite source (e.g. NCERT Ex 2.3, PYQ 2022)
${type === 'hots' ? '- Tag each with cognitive skill: Analysis / Evaluation / Application' : ''}
${source === 'pyq' ? '- Mention the year for PYQ-style questions' : ''}`;
}

function calculateCost(usage) {
  // claude-sonnet-4 pricing (per million tokens)
  const inputCost  = (usage.input_tokens  / 1_000_000) * 3.0;
  const outputCost = (usage.output_tokens / 1_000_000) * 15.0;
  return parseFloat((inputCost + outputCost).toFixed(6));
}

module.exports = router;
