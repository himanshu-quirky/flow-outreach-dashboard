const state = {
  view: 'dashboard',
  stats: {},
  campaigns: [],
  emailQueue: [],
  responses: [],
};

const views = {
  dashboard: { title: 'Dashboard', render: renderDashboard },
  campaigns: { title: 'Campaigns', render: renderCampaigns },
  prospects: { title: 'Prospects', render: renderProspects },
  'email-review': { title: 'Email Review', render: renderEmailReview },
  responses: { title: 'Responses', render: renderResponses },
  domains: { title: 'Domains', render: renderDomains },
  settings: { title: 'Settings', render: renderSettings },
};

function navigate(view) {
  state.view = view;
  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  $('#page-title').textContent = views[view]?.title || 'Dashboard';
  const fn = views[view]?.render;
  if (fn) fn();
}

// Nav clicks
document.addEventListener('click', (e) => {
  const nav = e.target.closest('.nav-item');
  if (nav) {
    e.preventDefault();
    navigate(nav.dataset.view);
  }
});

// SSE
let evtSource;
function connectSSE() {
  evtSource = new EventSource('/api/events');
  evtSource.onopen = () => {
    const dot = $('#conn-status .status-dot');
    const txt = $('#conn-status .status-text');
    dot.className = 'status-dot connected';
    txt.textContent = 'Connected';
  };
  evtSource.onerror = () => {
    const dot = $('#conn-status .status-dot');
    const txt = $('#conn-status .status-text');
    dot.className = 'status-dot error';
    txt.textContent = 'Disconnected';
  };
  evtSource.addEventListener('statsUpdated', (e) => {
    state.stats = JSON.parse(e.data);
    if (state.view === 'dashboard') renderDashboard();
  });
  evtSource.addEventListener('emailsReady', (e) => {
    const { count } = JSON.parse(e.data);
    toast(`${count} new email drafts ready for review`, 'info');
    updateBadge('email-badge', count);
    if (state.view === 'email-review') renderEmailReview();
  });
  evtSource.addEventListener('responseReceived', (e) => {
    const { count } = JSON.parse(e.data);
    toast(`${count} new response(s) received`, 'info');
    updateBadge('response-badge', count);
    if (state.view === 'responses') renderResponses();
  });
  evtSource.addEventListener('campaignUpdated', () => {
    if (state.view === 'campaigns') renderCampaigns();
  });
}

function updateBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  if (count > 0) {
    el.style.display = 'flex';
    el.textContent = count;
  } else {
    el.style.display = 'none';
  }
}

// Init
async function init() {
  connectSSE();
  state.stats = await api('/api/stats') || {};
  // Check email queue for badge
  const queue = await api('/api/emails/queue');
  if (queue?.length) updateBadge('email-badge', queue.length);
  // Check unhandled responses
  const resp = await api('/api/responses?handled=0');
  if (resp?.total) updateBadge('response-badge', resp.total);
  // Test n8n connection
  const conn = await api('/api/n8n/test');
  if (conn?.connected) {
    $('#conn-status .status-dot').className = 'status-dot connected';
    $('#conn-status .status-text').textContent = 'n8n Connected';
  }
  navigate('dashboard');
}

init();
