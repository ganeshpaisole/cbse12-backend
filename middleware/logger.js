const fs   = require('fs').promises;
const path = require('path');

const LOG_FILE = path.join(__dirname, '../usage.log.json');

// Simple file-based log — replace with Supabase/DB in production
async function logUsage(data) {
  try {
    const entry = {
      ...data,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-IN'),
    };

    // Read existing log
    let log = [];
    try {
      const raw = await fs.readFile(LOG_FILE, 'utf8');
      log = JSON.parse(raw);
    } catch (e) {
      // File doesn't exist yet — start fresh
    }

    // Append and keep last 10,000 entries
    log.push(entry);
    if (log.length > 10000) log = log.slice(-10000);

    await fs.writeFile(LOG_FILE, JSON.stringify(log), 'utf8');
  } catch (err) {
    // Non-critical — don't fail the request if logging fails
    console.error('[LOGGER] Failed to log usage:', err.message);
  }
}

async function getUsageStats() {
  try {
    const raw = await fs.readFile(LOG_FILE, 'utf8');
    const log = JSON.parse(raw);

    const totalRequests   = log.length;
    const totalCostUSD    = log.reduce((s, e) => s + parseFloat(e.estimatedCostUSD || 0), 0);
    const totalInputTok   = log.reduce((s, e) => s + (e.inputTokens  || 0), 0);
    const totalOutputTok  = log.reduce((s, e) => s + (e.outputTokens || 0), 0);

    // By endpoint
    const byEndpoint = {};
    log.forEach(e => {
      byEndpoint[e.endpoint] = (byEndpoint[e.endpoint] || 0) + 1;
    });

    // By subject
    const bySubject = {};
    log.forEach(e => {
      if (e.subject) bySubject[e.subject] = (bySubject[e.subject] || 0) + 1;
    });

    // Today's usage
    const today = new Date().toLocaleDateString('en-IN');
    const todayLog = log.filter(e => e.date === today);

    return {
      total: { requests: totalRequests, costUSD: totalCostUSD.toFixed(4), inputTokens: totalInputTok, outputTokens: totalOutputTok },
      today: { requests: todayLog.length, costUSD: todayLog.reduce((s,e)=>s+parseFloat(e.estimatedCostUSD||0),0).toFixed(4) },
      byEndpoint,
      bySubject,
      recentRequests: log.slice(-20).reverse(),
    };
  } catch (e) {
    return { error: 'No usage data yet' };
  }
}

module.exports = { logUsage, getUsageStats };
