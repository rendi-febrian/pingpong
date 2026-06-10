/* PingPong 🏓 — Frontend App */

let endpoints = [];

// --- Fetch & Render ---
async function loadEndpoints() {
  try {
    const res = await fetch('/api/endpoints');
    const data = await res.json();
    endpoints = data.endpoints;
    render();
  } catch (err) {
    showBanner('Failed to load endpoints', 'error');
  }
}

function render() {
  const container = document.getElementById('dashboard');
  const upCount = document.getElementById('upCount');
  const downCount = document.getElementById('downCount');
  const totalCount = document.getElementById('totalCount');

  const up = endpoints.filter(e => e.is_up === 1).length;
  const down = endpoints.filter(e => e.is_up === 0).length;
  
  upCount.textContent = up;
  downCount.textContent = down;
  totalCount.textContent = endpoints.length;

  if (endpoints.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏓</div>
        <h2>No endpoints yet</h2>
        <p>Add URLs above to start monitoring their uptime.</p>
      </div>`;
    return;
  }

  container.innerHTML = endpoints.map(ep => {
    const statusClass = ep.is_up === null ? 'unknown' : ep.is_up === 1 ? 'up' : 'down';
    const statusText = ep.is_up === null ? 'Unknown' : ep.is_up === 1 ? 'Online' : 'Offline';
    const msText = ep.response_time_ms != null ? `${ep.response_time_ms}ms` : '—';
    const statusCodeText = ep.status_code ? `HTTP ${ep.status_code}` : '—';
    
    let uptimeClass = 'medium';
    let uptimeText = '—';
    if (ep.uptime_24h != null) {
      uptimeText = `${ep.uptime_24h}%`;
      uptimeClass = ep.uptime_24h >= 99 ? 'high' : ep.uptime_24h >= 90 ? 'medium' : 'low';
    }

    const label = ep.label || ep.url;
    const checkedAt = ep.checked_at 
      ? new Date(ep.checked_at + 'Z').toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      : 'Never';

    return `
      <div class="endpoint-card" data-id="${ep.id}">
        <div class="status-dot ${statusClass}" title="${statusText}"></div>
        <div class="endpoint-info">
          <div class="endpoint-url" title="${ep.url}">${label}</div>
          <div class="endpoint-meta">
            <span>📍 ${ep.url}</span>
            <span>⏱ ${msText}</span>
            <span>📡 ${statusCodeText}</span>
            <span>🕐 ${checkedAt}</span>
          </div>
        </div>
        <span class="uptime-badge ${uptimeClass}" title="24h uptime">${uptimeText}</span>
        <div class="card-actions">
          <button class="check-btn" onclick="checkEndpoint(${ep.id})">✓ Check</button>
          <button class="delete-btn" onclick="deleteEndpoint(${ep.id})">✕</button>
        </div>
      </div>`;
  }).join('');
}

// --- Actions ---
async function addEndpoint() {
  const urlInput = document.getElementById('urlInput');
  const labelInput = document.getElementById('labelInput');
  const url = urlInput.value.trim();
  const label = labelInput.value.trim();

  if (!url) {
    showBanner('Please enter a URL', 'error');
    return;
  }

  try {
    const res = await fetch('/api/endpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, label })
    });

    if (!res.ok) {
      const err = await res.json();
      showBanner(err.error || 'Failed to add', 'error');
      return;
    }

    urlInput.value = '';
    labelInput.value = '';
    showBanner('Endpoint added!', 'success');
    loadEndpoints();
  } catch (err) {
    showBanner('Network error', 'error');
  }
}

async function deleteEndpoint(id) {
  if (!confirm('Remove this endpoint?')) return;
  try {
    await fetch(`/api/endpoints/${id}`, { method: 'DELETE' });
    showBanner('Endpoint removed', 'info');
    loadEndpoints();
  } catch (err) {
    showBanner('Failed to delete', 'error');
  }
}

async function checkEndpoint(id) {
  try {
    showBanner('Checking...', 'info');
    await fetch(`/api/endpoints/${id}/check`, { method: 'POST' });
    loadEndpoints();
  } catch (err) {
    showBanner('Check failed', 'error');
  }
}

async function checkAll() {
  const btn = document.getElementById('checkAllBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Checking...';
  showBanner('Checking all endpoints...', 'info');
  
  try {
    await fetch('/api/check-all', { method: 'POST' });
    loadEndpoints();
    showBanner('All endpoints checked!', 'success');
  } catch (err) {
    showBanner('Check failed', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Check All';
  }
}

// --- Banner ---
let bannerTimeout;

function showBanner(msg, type = 'info') {
  const banner = document.getElementById('statusBanner');
  const msgEl = document.getElementById('bannerMsg');
  
  clearTimeout(bannerTimeout);
  banner.className = `status-banner ${type}`;
  msgEl.textContent = msg;
  banner.classList.remove('hidden');

  bannerTimeout = setTimeout(() => banner.classList.add('hidden'), 4000);
}

// --- Keyboard shortcut ---
document.getElementById('urlInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addEndpoint();
});

document.getElementById('labelInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addEndpoint();
});

// --- Init ---
loadEndpoints();

// Auto-refresh every 60s
setInterval(() => {
  if (document.visibilityState === 'visible') loadEndpoints();
}, 60000);
