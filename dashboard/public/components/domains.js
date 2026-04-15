async function renderDomains() {
  const content = $('#content');
  const domains = await api('/api/domains') || [];

  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <h2 style="font-size:18px;font-weight:600;margin-bottom:4px">Domains & Infrastructure</h2>
        <p style="font-size:13px;color:var(--text-3)">${domains.length} domain${domains.length !== 1 ? 's' : ''} tracked</p>
      </div>
      <button class="btn btn-primary" onclick="checkDomainAvailability()">Check Availability</button>
    </div>

    <div class="stat-grid" style="margin-bottom:24px">
      <div class="stat-card">
        <div class="stat-label">Total Domains</div>
        <div class="stat-value">${domains.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Purchased</div>
        <div class="stat-value">${domains.filter(d => d.purchased).length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Available</div>
        <div class="stat-value green">${domains.filter(d => d.available && !d.purchased).length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Health Score</div>
        <div class="stat-value accent">${domains.length > 0 ? Math.round(domains.reduce((s,d) => s + d.health_score, 0) / domains.length) : 0}</div>
      </div>
    </div>

    ${domains.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">&#127760;</div>
        <div class="empty-state-text">No domains tracked yet. Click "Check Availability" to find domains for your outreach infrastructure.</div>
      </div>
    ` : `
      <div class="domain-grid">
        ${domains.map(d => `
          <div class="domain-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div class="domain-name">${esc(d.domain)}</div>
              ${d.available ? '<span class="pill pill-a">Available</span>' : d.purchased ? '<span class="pill pill-active">Active</span>' : '<span class="pill pill-d">Taken</span>'}
            </div>

            ${d.purchased ? `
              <div style="margin-top:8px">
                <div style="font-size:12px;color:var(--text-3);margin-bottom:4px">Warmup: Day ${d.warmup_day} of 30</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${Math.min(100, (d.warmup_day / 30) * 100)}%"></div>
                </div>
              </div>

              <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center">
                <div style="font-size:12px;color:var(--text-2)">Health: <span style="font-weight:600;color:${d.health_score >= 80 ? 'var(--green)' : d.health_score >= 50 ? 'var(--amber)' : 'var(--red)'}">${d.health_score}%</span></div>
                <div style="font-size:12px;color:var(--text-3)">${d.mailbox_count} mailboxes</div>
              </div>

              <div class="domain-checks">
                <span class="domain-check ${d.spf_ok ? 'ok' : 'fail'}">${d.spf_ok ? '&#10003;' : '&#10007;'} SPF</span>
                <span class="domain-check ${d.dkim_ok ? 'ok' : 'fail'}">${d.dkim_ok ? '&#10003;' : '&#10007;'} DKIM</span>
                <span class="domain-check ${d.dmarc_ok ? 'ok' : 'fail'}">${d.dmarc_ok ? '&#10003;' : '&#10007;'} DMARC</span>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `}
  `;
}

async function checkDomainAvailability() {
  toast('Domain check triggered via n8n workflow', 'info');
  const result = await api('/api/domains/check', { method: 'POST', body: {} });
  if (result?.ok) {
    toast('Domain check running. Results will appear shortly.', 'success');
  }
}
