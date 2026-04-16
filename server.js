const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ── SECURITY HEADERS ──────────────────────
app.use(helmet());

// ── CORS — only allow your Netlify domain ──
const allowedOrigins = [
  'https://cbseexamwala.netlify.app',
  'https://ganeshpaisole.github.io',
  'http://localhost:3000',  // for local dev
  'http://localhost:5500',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS: origin not allowed — ' + origin));
  },
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));  // prevent large payload attacks

// ── GLOBAL RATE LIMIT ────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour window
  max: 50,                     // 50 requests per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait before trying again.' },
});
app.use('/api/', globalLimiter);

// ── ROUTES ──────────────────────────────
app.use('/api/generate', require('./routes/generate'));
app.use('/api/paper',    require('./routes/paper'));
app.use('/api/usage',    require('./routes/usage'));

// ── HEALTH CHECK ─────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── 404 HANDLER ──────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── ERROR HANDLER ────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`CBSE12 Backend running on port ${PORT}`);
  console.log(`API key configured: ${process.env.ANTHROPIC_API_KEY ? 'YES ✅' : 'NO ❌'}`);
});
