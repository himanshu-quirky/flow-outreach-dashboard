async function renderCampaigns() {
  const content = $('#content');
  const campaigns = await api('/api/campaigns') || [];

  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <h2 style="font-size:18px;font-weight:600;margin-bottom:4px">Campaigns</h2>
        <p style="font-size:13px;color:var(--text-3)">${campaigns.length} campaign${campaigns.length !== 1 ? 's' : ''}</p>
      </div>
      <button class="btn btn-primary" onclick="showNewCampaignModal()">+ New Campaign</button>
    </div>

    ${campaigns.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">&#128640;</div>
        <div class="empty-state-text">No campaigns yet. Create your first campaign to start prospecting.</div>
        <button class="btn btn-primary" onclick="showNewCampaignModal()">Create Campaign</button>
      </div>
    ` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px">
        ${campaigns.map(c => `
          <div class="card" style="cursor:pointer" onclick="showCampaignDetail(${c.id})">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
              <div>
                <div style="font-weight:600;font-size:15px;margin-bottom:4px">${esc(c.name)}</div>
                <div style="font-size:12px;color:var(--text-3)">${esc(c.client_name || '')}</div>
              </div>
              ${statusPill(c.status)}
            </div>
            <div style="font-size:12px;color:var(--text-3);margin-bottom:8px">
              ${esc(c.icp_industry || 'No ICP configured')} &middot; ${esc(c.icp_geography || '')}
            </div>
            <div style="display:flex;gap:16px;font-size:12px;color:var(--text-2)">
              <span>Target: ${c.target_count || 0}</span>
              <span>${timeAgo(c.created_at)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

async function showCampaignDetail(id) {
  const c = await api(`/api/campaigns/${id}`);
  if (!c) return;

  const content = $('#content');
  const actionBtn = getActionButton(c);

  content.innerHTML = `
    <div style="margin-bottom:20px">
      <button class="btn btn-ghost" onclick="renderCampaigns()">&larr; Back to Campaigns</button>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
      <div>
        <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">${esc(c.name)}</h2>
        <p style="font-size:13px;color:var(--text-3)">${esc(c.client_name || '')} &middot; Created ${timeAgo(c.created_at)}</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        ${statusPill(c.status)}
        ${actionBtn}
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><div class="card-title">ICP Configuration</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
        <div><span style="color:var(--text-3)">Industry:</span> ${esc(c.icp_industry || 'Not set')}</div>
        <div><span style="color:var(--text-3)">Geography:</span> ${esc(c.icp_geography || 'Not set')}</div>
        <div><span style="color:var(--text-3)">Company Size:</span> ${esc(c.icp_company_size || 'Not set')}</div>
        <div><span style="color:var(--text-3)">Target Titles:</span> ${esc(c.icp_titles || 'Not set')}</div>
        <div><span style="color:var(--text-3)">Target Count:</span> ${c.target_count}</div>
      </div>
    </div>
  `;
}

function getActionButton(c) {
  switch (c.status) {
    case 'draft':
      return `<button class="btn btn-primary" onclick="triggerAction(${c.id},'start-prospecting')">Start Prospecting</button>`;
    case 'prospecting':
      return `<button class="btn btn-primary" onclick="triggerAction(${c.id},'find-contacts')">Find Contacts</button>`;
    case 'mapping_contacts':
      return `<button class="btn btn-primary" onclick="triggerAction(${c.id},'research-write')">Research & Write Emails</button>`;
    case 'researching':
      return `<span style="color:var(--amber);font-size:13px">Processing...</span>`;
    default:
      return '';
  }
}

async function triggerAction(campaignId, action) {
  const result = await api(`/api/campaigns/${campaignId}/${action}`, { method: 'POST' });
  if (result?.ok) {
    toast(result.message || 'Action triggered', 'success');
    showCampaignDetail(campaignId);
  }
}

function showNewCampaignModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-title">New Campaign</div>
      <div class="form-group">
        <label class="form-label">Campaign Name</label>
        <input class="form-input" id="mc-name" placeholder="e.g. Europe Coffee Importers Q2">
      </div>
      <div class="form-group">
        <label class="form-label">ICP Industry</label>
        <input class="form-input" id="mc-industry" placeholder="Coffee importers, private-label brands, cafe chains" value="Coffee importers, private-label coffee brands, cafe chains, specialty coffee distributors">
      </div>
      <div class="form-group">
        <label class="form-label">Geography</label>
        <input class="form-input" id="mc-geo" placeholder="Europe, Australia, Middle East" value="Europe, Australia, Asia, Middle East">
      </div>
      <div class="form-group">
        <label class="form-label">Company Size</label>
        <select class="form-select" id="mc-size">
          <option value="SME to mid-sized (10-500 employees)">SME to Mid-sized (10-500)</option>
          <option value="Small (1-50 employees)">Small (1-50)</option>
          <option value="Medium (50-200 employees)">Medium (50-200)</option>
          <option value="Large (200+ employees)">Large (200+)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Target Titles</label>
        <input class="form-input" id="mc-titles" placeholder="Procurement Head, Coffee Buyer, Category Manager" value="Procurement Head, Coffee Buyer, Category Manager, Head of Purchasing, Supply Chain Director">
      </div>
      <div class="form-group">
        <label class="form-label">Target Companies</label>
        <input class="form-input" id="mc-count" type="number" value="100" min="10" max="1000">
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="createCampaign()">Create Campaign</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function createCampaign() {
  const data = {
    name: document.getElementById('mc-name').value || 'New Campaign',
    icp_industry: document.getElementById('mc-industry').value,
    icp_geography: document.getElementById('mc-geo').value,
    icp_company_size: document.getElementById('mc-size').value,
    icp_titles: document.getElementById('mc-titles').value,
    target_count: +document.getElementById('mc-count').value || 100,
    client_name: 'ph6 Coffee',
  };
  const result = await api('/api/campaigns', { method: 'POST', body: data });
  if (result) {
    document.querySelector('.modal-overlay')?.remove();
    toast('Campaign created', 'success');
    renderCampaigns();
  }
}
