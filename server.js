const express = require('express');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Trust Railway/Fastly proxy layers
app.set('trust proxy', true);

// Handle Railway health check - must respond immediately
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// CORS - set before everything else
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  message: { error: 'Too many requests. Please wait.' },
});
app.use(limiter);

// Routes
app.use('/api/generate', require('./routes/generate'));
app.use('/api/paper',    require('./routes/paper'));
app.use('/api/usage',    require('./routes/usage'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CBSE12 Backend running on port ${PORT}`);
  console.log(`API key: ${process.env.ANTHROPIC_API_KEY ? 'SET ✅' : 'MISSING ❌'}`);
  console.log(`Domain: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'not set'}`);
});
