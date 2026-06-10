const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4567;
const DATA_FILE = path.join(__dirname, 'data.json');

// --- Data helpers ---
function normalizeUrl(url) {
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url;
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { endpoints: [], checks: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch { return { endpoints: [], checks: [] }; }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---

// Get all endpoints with latest status
app.get('/api/endpoints', (req, res) => {
  const data = loadData();
  const now = Date.now();
  const dayAgo = now - 86400000;

  const result = data.endpoints.map(ep => {
    const epChecks = data.checks
      .filter(c => c.endpoint_id === ep.id)
      .sort((a, b) => b.checked_at - a.checked_at);
    
    const latest = epChecks[0] || {};
    const dayChecks = epChecks.filter(c => c.checked_at > dayAgo);
    const upCount = dayChecks.filter(c => c.is_up).length;

    return {
      ...ep,
      status_code: latest.status_code ?? null,
      response_time_ms: latest.response_time_ms ?? null,
      is_up: latest.is_up ?? null,
      checked_at: latest.checked_at ? new Date(latest.checked_at).toISOString() : null,
      uptime_24h: dayChecks.length > 0 ? Math.round((upCount / dayChecks.length) * 100) : null
    };
  });

  res.json({ endpoints: result });
});

// Add endpoint
app.post('/api/endpoints', (req, res) => {
  let { url, label } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  
  url = normalizeUrl(url);

  const data = loadData();
  if (data.endpoints.some(e => e.url === url)) {
    return res.status(409).json({ error: 'URL already exists' });
  }

  const id = Date.now() + Math.floor(Math.random() * 1000);
  const ep = { id, url, label: label || url, created_at: Date.now(), is_active: true };
  data.endpoints.push(ep);
  saveData(data);

  res.json(ep);
});

// Delete endpoint
app.delete('/api/endpoints/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = loadData();
  data.endpoints = data.endpoints.filter(e => e.id !== id);
  data.checks = data.checks.filter(c => c.endpoint_id !== id);
  saveData(data);
  res.json({ success: true });
});

// Check a single endpoint
app.post('/api/endpoints/:id/check', async (req, res) => {
  const data = loadData();
  const ep = data.endpoints.find(e => e.id === parseInt(req.params.id));
  if (!ep) return res.status(404).json({ error: 'Not found' });

  // Normalize URL just in case
  ep.url = normalizeUrl(ep.url);

  const start = Date.now();
  try {
    const response = await fetch(ep.url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000)
    });
    const ms = Date.now() - start;
    const isUp = response.status < 500;
    
    data.checks.push({
      id: Date.now(),
      endpoint_id: ep.id,
      status_code: response.status,
      response_time_ms: ms,
      is_up: isUp,
      checked_at: Date.now()
    });
    saveData(data);
    
    res.json({ url: ep.url, status: response.status, ms, is_up: isUp });
  } catch (err) {
    const ms = Date.now() - start;
    data.checks.push({
      id: Date.now(),
      endpoint_id: ep.id,
      status_code: null,
      response_time_ms: ms,
      is_up: false,
      checked_at: Date.now(),
      error: err.message
    });
    saveData(data);
    res.json({ url: ep.url, status: null, ms, is_up: false });
  }
});

// Check all endpoints
app.post('/api/check-all', async (req, res) => {
  const data = loadData();
  const results = [];

  for (const ep of data.endpoints.filter(e => e.is_active)) {
    const start = Date.now();
    try {
      const response = await fetch(ep.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      });
      const ms = Date.now() - start;
      const isUp = response.status < 500;
      
      data.checks.push({
        id: Date.now(),
        endpoint_id: ep.id,
        status_code: response.status,
        response_time_ms: ms,
        is_up: isUp,
        checked_at: Date.now()
      });
      results.push({ url: ep.url, status: response.status, ms, is_up: isUp });
    } catch (err) {
      const ms = Date.now() - start;
      data.checks.push({
        id: Date.now(),
        endpoint_id: ep.id,
        status_code: null,
        response_time_ms: ms,
        is_up: false,
        checked_at: Date.now()
      });
      results.push({ url: ep.url, status: null, ms, is_up: false });
    }
  }
  
  saveData(data);
  res.json({ results, count: results.length });
});

// Get check history
app.get('/api/endpoints/:id/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const data = loadData();
  const checks = data.checks
    .filter(c => c.endpoint_id === parseInt(req.params.id))
    .sort((a, b) => b.checked_at - a.checked_at)
    .slice(0, limit);
  res.json({ checks });
});

// --- SPA fallback ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏓 PingPong running on http://0.0.0.0:${PORT}`);
});
