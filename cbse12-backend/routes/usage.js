const express = require('express');
const router  = express.Router();
const { getUsageStats } = require('../middleware/logger');

// Simple admin endpoint to see usage (protect with a secret in production)
router.get('/', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const stats = await getUsageStats();
  res.json(stats);
});

module.exports = router;
