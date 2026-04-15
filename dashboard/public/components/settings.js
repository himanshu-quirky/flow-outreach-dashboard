async function renderSettings() {
  const content = $('#content');
  const settings = await api('/api/settings') || {};
  let workflows = [];
  try { workflows = await api('/api/n8n/workflows') || []; } catch {}

  content.innerHTML = `
    <div style="margin-bottom:24px">
      <h2 style="font-size:18px;font-weight:600;margin-bottom:4px">Settings</h2>
      <p style="font-size:13px;color:var(--text-3)">Configure your Harvey SDR system</p>
    </div>

    <div class="section-grid">
      <!-- n8n Connection -->
      <div class="card">
        <div class="card-header"><div class="card-title">n8n Connection</div></div>
        <div id="n8n-status" style="margin-bottom:12px">
          <span style="font-size:13px;color:var(--text-3)">Checking connection...</span>
        </div>
        <button class="btn btn-outline btn-sm" onclick="testN8nConnection()">Test Connection</button>
      </div>

      <!-- Client Profile -->
      <div class="card">
        <div class="card-header"><div class="card-title">Client Profile</div></div>
        <div class="form-group">
          <label class="form-label">Client Name</label>
          <input class="form-input" id="s-client-name" value="${esc(settings.client_name || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Desired Tone</label>
          <input class="form-input" id="s-client-tone" value="${esc(settings.client_tone || '')}">
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveClientSettings()">Save</button>
      </div>
    </div>

    <div class="section-grid">
      <!-- USP & Messaging -->
      <div class="card">
        <div class="card-header"><div class="card-title">USP & Messaging</div></div>
        <div class="form-group">
          <label class="form-label">Unique Selling Proposition</label>
          <textarea class="form-textarea" id="s-usp" rows="3">${esc(settings.client_usp || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Default CTA</label>
          <input class="form-input" id="s-cta" value="${esc(settings.email_cta || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Max Email Words</label>
          <input class="form-input" id="s-max-words" type="number" value="${settings.email_max_words || 120}">
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveEmailSettings()">Save</button>
      </div>

      <!-- Workflows Status -->
      <div class="card">
        <div class="card-header"><div class="card-title">Workflow Status</div></div>
        ${workflows.length > 0 ? `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Workflow</th><th>Active</th><th>Updated</th></tr></thead>
              <tbody>
                ${workflows.map(w => `
                  <tr>
                    <td style="font-size:12px">${esc(w.name)}</td>
                    <td>${w.active ? '<span style="color:var(--green)">Active</span>' : '<span style="color:var(--text-3)">Inactive</span>'}</td>
                    <td style="font-size:11px;color:var(--text-3)">${timeAgo(w.updatedAt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="font-size:13px;color:var(--text-3)">Could not load workflow status. Check n8n connection.</div>
        `}
      </div>
    </div>
  `;

  testN8nConnection();
}

async function testN8nConnection() {
  const el = document.getElementById('n8n-status');
  if (!el) return;
  el.innerHTML = '<span style="color:var(--amber)">Testing...</span>';
  const result = await api('/api/n8n/test');
  if (result?.connected) {
    el.innerHTML = '<span style="color:var(--green);font-weight:600">Connected</span>';
    toast('n8n connection successful', 'success');
  } else {
    el.innerHTML = `<span style="color:var(--red)">Disconnected</span><div style="font-size:11px;color:var(--text-3);margin-top:4px">${esc(result?.error || 'Unknown error')}</div>`;
  }
}

async function saveClientSettings() {
  const data = {
    client_name: document.getElementById('s-client-name').value,
    client_tone: document.getElementById('s-client-tone').value,
  };
  const result = await api('/api/settings', { method: 'PUT', body: data });
  if (result?.ok) toast('Client settings saved', 'success');
}

async function saveEmailSettings() {
  const data = {
    client_usp: document.getElementById('s-usp').value,
    email_cta: document.getElementById('s-cta').value,
    email_max_words: document.getElementById('s-max-words').value,
  };
  const result = await api('/api/settings', { method: 'PUT', body: data });
  if (result?.ok) toast('Email settings saved', 'success');
}
