let responseFilter = '';

async function renderResponses() {
  const content = $('#content');
  const params = new URLSearchParams();
  if (responseFilter) params.set('category', responseFilter);
  const result = await api(`/api/responses?${params}`);
  const responses = result?.data || [];
  const total = result?.total || 0;

  // Get counts per category
  const allResult = await api('/api/responses');
  const allTotal = allResult?.total || 0;

  content.innerHTML = `
    <div style="margin-bottom:20px">
      <h2 style="font-size:18px;font-weight:600;margin-bottom:4px">Responses</h2>
      <p style="font-size:13px;color:var(--text-3)">${allTotal} total responses</p>
    </div>

    <div class="filter-bar">
      <button class="filter-btn ${!responseFilter ? 'active' : ''}" onclick="filterResponses('')">All (${allTotal})</button>
      <button class="filter-btn ${responseFilter === 'positive' ? 'active' : ''}" onclick="filterResponses('positive')">Positive</button>
      <button class="filter-btn ${responseFilter === 'referral' ? 'active' : ''}" onclick="filterResponses('referral')">Referral</button>
      <button class="filter-btn ${responseFilter === 'not_now' ? 'active' : ''}" onclick="filterResponses('not_now')">Not Now</button>
      <button class="filter-btn ${responseFilter === 'objection' ? 'active' : ''}" onclick="filterResponses('objection')">Objection</button>
      <button class="filter-btn ${responseFilter === 'negative' ? 'active' : ''}" onclick="filterResponses('negative')">Negative</button>
    </div>

    ${responses.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">&#128172;</div>
        <div class="empty-state-text">No responses yet. Responses will appear here once prospects reply to your emails.</div>
      </div>
    ` : `
      ${responses.map(r => `
        <div class="response-card">
          <div class="response-header">
            <div>
              <span style="font-weight:600;font-size:14px">${esc(r.from_name || r.from_email)}</span>
              <span style="color:var(--text-3);font-size:12px;margin-left:8px">${esc(r.company_name || '')}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              ${statusPill(r.category)}
              ${r.urgency === 'high' ? '<span class="pill pill-d">Urgent</span>' : ''}
              ${r.handled ? '<span style="font-size:11px;color:var(--green)">Handled</span>' : ''}
            </div>
          </div>

          ${r.summary ? `<div style="font-size:13px;color:var(--text-2);margin-bottom:8px">${esc(r.summary)}</div>` : ''}

          <div class="response-body">${esc(r.reply_body || 'No content')}</div>

          ${r.suggested_action ? `
            <div class="response-action">
              <strong>Suggested Action:</strong> ${esc(r.suggested_action)}
            </div>
          ` : ''}

          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
            <span style="font-size:11px;color:var(--text-3)">${timeAgo(r.created_at)}</span>
            ${!r.handled ? `<button class="btn btn-sm btn-outline" onclick="markHandled(${r.id})">Mark Handled</button>` : ''}
          </div>
        </div>
      `).join('')}
    `}
  `;

  updateBadge('response-badge', responses.filter(r => !r.handled).length);
}

function filterResponses(category) {
  responseFilter = category;
  renderResponses();
}

async function markHandled(id) {
  const result = await api(`/api/responses/${id}/handled`, { method: 'PUT' });
  if (result?.ok) {
    toast('Marked as handled', 'success');
    renderResponses();
  }
}
