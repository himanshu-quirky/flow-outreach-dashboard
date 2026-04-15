let prospectFilters = { tier: '', q: '', page: 1 };

async function renderProspects() {
  const content = $('#content');
  const params = new URLSearchParams();
  if (prospectFilters.tier) params.set('tier', prospectFilters.tier);
  if (prospectFilters.q) params.set('q', prospectFilters.q);
  params.set('page', prospectFilters.page);

  const result = await api(`/api/prospects?${params}`);
  const companies = result?.data || [];
  const total = result?.total || 0;

  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <h2 style="font-size:18px;font-weight:600;margin-bottom:4px">Prospects</h2>
        <p style="font-size:13px;color:var(--text-3)">${total} companies found</p>
      </div>
    </div>

    <div class="filter-bar">
      <button class="filter-btn ${!prospectFilters.tier ? 'active' : ''}" onclick="filterProspects('')">All</button>
      <button class="filter-btn ${prospectFilters.tier === 'A' ? 'active' : ''}" onclick="filterProspects('A')">Tier A</button>
      <button class="filter-btn ${prospectFilters.tier === 'B' ? 'active' : ''}" onclick="filterProspects('B')">Tier B</button>
      <button class="filter-btn ${prospectFilters.tier === 'C' ? 'active' : ''}" onclick="filterProspects('C')">Tier C</button>
      <input class="search-input" placeholder="Search companies..." value="${esc(prospectFilters.q)}" oninput="searchProspects(this.value)">
    </div>

    ${companies.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">&#128269;</div>
        <div class="empty-state-text">No prospects found. Start a campaign to begin prospecting.</div>
      </div>
    ` : `
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Location</th>
                <th>ICP Score</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Found</th>
              </tr>
            </thead>
            <tbody>
              ${companies.map(c => `
                <tr>
                  <td>
                    <div style="font-weight:500">${esc(c.name)}</div>
                    ${c.website ? `<div style="font-size:11px;color:var(--text-3)">${esc(c.website)}</div>` : ''}
                  </td>
                  <td>${esc(c.location || '-')}</td>
                  <td><span style="font-weight:600;color:${c.icp_score >= 70 ? 'var(--green)' : c.icp_score >= 50 ? 'var(--amber)' : 'var(--text-2)'}">${c.icp_score}</span></td>
                  <td>${tierPill(c.icp_tier)}</td>
                  <td>${statusPill(c.status)}</td>
                  <td style="color:var(--text-3)">${timeAgo(c.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${total > 50 ? `
          <div style="display:flex;justify-content:center;gap:8px;margin-top:16px">
            <button class="btn btn-sm btn-outline" ${prospectFilters.page <= 1 ? 'disabled' : ''} onclick="prospectFilters.page--;renderProspects()">Prev</button>
            <span style="font-size:12px;color:var(--text-3);padding:6px">Page ${prospectFilters.page} of ${Math.ceil(total/50)}</span>
            <button class="btn btn-sm btn-outline" ${prospectFilters.page >= Math.ceil(total/50) ? 'disabled' : ''} onclick="prospectFilters.page++;renderProspects()">Next</button>
          </div>
        ` : ''}
      </div>
    `}
  `;
}

function filterProspects(tier) {
  prospectFilters.tier = tier;
  prospectFilters.page = 1;
  renderProspects();
}

let searchTimeout;
function searchProspects(q) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    prospectFilters.q = q;
    prospectFilters.page = 1;
    renderProspects();
  }, 300);
}
