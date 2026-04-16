const express   = require('express');
const router    = express.Router();
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');
const { logUsage } = require('../middleware/logger');

// Stricter limit for full papers (more tokens)
const paperLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,   // 5 papers per IP per hour
  message: { error: 'Paper generation limit reached (5/hour). Please wait.' },
});

router.post('/', paperLimiter, async (req, res) => {
  try {
    const {
      subject, chapters, duration, totalMarks, difficulty,
      sections, includeChoice, source, examMode, teacherNote
    } = req.body;

    if (!subject || !chapters || !totalMarks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Cap total marks to prevent excessively long responses
    const cappedMarks = Math.min(parseInt(totalMarks) || 70, 100);

    const sys = `You are a CBSE Grade 12 exam paper setter. Return ONLY valid JSON, no markdown, no fences.
Schema: {"paperTitle":"string","examDate":"string","totalMarks":number,"duration":"string","generalInstructions":["string"],"sections":[{"sectionName":"string","sectionDesc":"string","totalMarks":number,"qType":"mcq|assertion|vsa|sa|la|casebased","questions":[{"qNum":number,"qText":"string","marks":number,"opts":["(a)..."],"answerKey":"string","answerExplanation":"string"}]}]}`;

    const subjectNames = {
      physics:'Physics', chemistry:'Chemistry', mathematics:'Mathematics',
      english:'English Core', cs:'Computer Science', biology:'Biology'
    };
    const subjectCodes = {
      physics:'042', chemistry:'043', mathematics:'041',
      english:'301', cs:'083', biology:'044'
    };

    const choiceNote = includeChoice
      ? 'Include internal choice (OR) in all SA and LA questions.'
      : '';

    const sectionsDesc = sections ? sections.map(s =>
      `${s.name}: ${s.count} questions × ${s.marks} marks = ${s.count * s.marks}M`
    ).join('\n') : `Standard CBSE pattern for ${cappedMarks} marks`;

    const usr = `Generate a CBSE board exam paper for Grade 12 ${subjectNames[subject]} (Code: ${subjectCodes[subject]}).
Coverage: ${Array.isArray(chapters) ? chapters.join(', ') : chapters}
Duration: ${duration || '3 hours'}, Total: ${cappedMarks} marks, Difficulty: ${difficulty || 'Mixed'}
${choiceNote}
Sections:
${sectionsDesc}
${teacherNote ? 'Teacher note: ' + teacherNote.slice(0, 200) : ''}
Include 5 CBSE-style general instructions. Date: March 2027. Full answer key.`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: sys,
      messages: [{ role: 'user', content: usr }],
    });

    let raw = message.content[0].text.trim()
      .replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();

    let paper;
    try {
      paper = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ error: 'AI returned invalid JSON. Please try again.' });
    }

    await logUsage({
      endpoint: 'paper',
      ip: req.ip,
      subject,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      estimatedCostUSD: (message.usage.input_tokens / 1e6 * 3 + message.usage.output_tokens / 1e6 * 15).toFixed(6),
    });

    res.json({ success: true, data: paper });

  } catch (err) {
    console.error('[PAPER ERROR]', err.message);
    res.status(500).json({ error: 'Failed to generate paper. Please try again.' });
  }
});

module.exports = router;
