async function renderDashboard() {
  const s = state.stats || {};
  const content = $('#content');

  content.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Emails Sent</div>
        <div class="stat-value">${s.emailsSent || 0}</div>
        <div class="stat-sub">${s.emailsDrafted || 0} drafted, ${s.emailsApproved || 0} approved</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Open Rate</div>
        <div class="stat-value accent">${s.openRate || '0.0'}%</div>
        <div class="stat-sub">${s.emailsOpened || 0} opened</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Reply Rate</div>
        <div class="stat-value accent">${s.replyRate || '0.0'}%</div>
        <div class="stat-sub">${s.totalResponses || 0} total replies</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Positive Replies</div>
        <div class="stat-value green">${s.positiveResponses || 0}</div>
        <div class="stat-sub">${s.referrals || 0} referrals</div>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Active Campaigns</div>
        <div class="stat-value">${s.activeCampaigns || 0}</div>
        <div class="stat-sub">${s.campaigns || 0} total</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Companies Found</div>
        <div class="stat-value">${s.companies || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Contacts in Pipeline</div>
        <div class="stat-value">${s.contacts || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Domains Active</div>
        <div class="stat-value">${s.domains || 0}</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:24px">
      <div class="card-header">
        <div class="card-title">Pipeline Overview</div>
      </div>
      <div class="pipeline-row">
        <div class="pipeline-stage">
          <span class="pipeline-count">${s.pipeline?.found || 0}</span>
          Found
        </div>
        <div class="pipeline-stage">
          <span class="pipeline-count">${s.pipeline?.contacts_mapped || 0}</span>
          Contacts
        </div>
        <div class="pipeline-stage">
          <span class="pipeline-count">${s.pipeline?.researched || 0}</span>
          Researched
        </div>
        <div class="pipeline-stage">
          <span class="pipeline-count">${s.emailsDrafted || 0}</span>
          Drafts
        </div>
        <div class="pipeline-stage">
          <span class="pipeline-count">${s.emailsApproved || 0}</span>
          Approved
        </div>
        <div class="pipeline-stage">
          <span class="pipeline-count">${s.emailsSent || 0}</span>
          Sent
        </div>
        <div class="pipeline-stage">
          <span class="pipeline-count">${s.totalResponses || 0}</span>
          Replied
        </div>
      </div>
    </div>

    <div class="section-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Response Breakdown</div>
        </div>
        <div class="chart-container">
          <canvas id="response-chart"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Quick Actions</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button class="btn btn-outline" onclick="navigate('email-review')">
            Review Pending Emails (${s.emailsDrafted || 0})
          </button>
          <button class="btn btn-outline" onclick="navigate('campaigns')">
            Manage Campaigns
          </button>
          <button class="btn btn-outline" onclick="navigate('responses')">
            View Responses (${s.totalResponses || 0})
          </button>
          <button class="btn btn-outline" onclick="navigate('settings')">
            Settings
          </button>
        </div>
      </div>
    </div>
  `;

  // Response chart
  const rb = s.responseBreakdown || {};
  const ctx = document.getElementById('response-chart');
  if (ctx && Object.keys(rb).length > 0) {
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(rb).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
        datasets: [{
          data: Object.values(rb),
          backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#f59e0b', '#ef4444', '#52525b'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#a1a1aa', font: { size: 11 } } },
        },
      },
    });
  }
}
