require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const db = require('./db');
const n8n = require('./n8n');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- SSE ----------
const sseClients = [];
function sendSSE(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => res.write(msg));
}

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(':\n\n');
  sseClients.push(res);
  req.on('close', () => {
    const i = sseClients.indexOf(res);
    if (i >= 0) sseClients.splice(i, 1);
  });
});

// ---------- Stats ----------
app.get('/api/stats', (req, res) => {
  try { res.json(db.getStats()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Campaigns ----------
app.get('/api/campaigns', (req, res) => {
  res.json(db.getCampaigns());
});

app.post('/api/campaigns', (req, res) => {
  try {
    const result = db.createCampaign({
      name: req.body.name || 'New Campaign',
      icp_industry: req.body.icp_industry || '',
      icp_geography: req.body.icp_geography || '',
      icp_company_size: req.body.icp_company_size || '',
      icp_titles: req.body.icp_titles || '',
      target_count: req.body.target_count || 100,
      client_name: req.body.client_name || 'ph6 Coffee',
    });
    const campaign = db.getCampaign(result.lastInsertRowid);
    sendSSE('campaignUpdated', campaign);
    res.json(campaign);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/campaigns/:id', (req, res) => {
  const c = db.getCampaign(+req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});

app.put('/api/campaigns/:id', (req, res) => {
  try {
    db.updateCampaign(+req.params.id, req.body);
    res.json(db.getCampaign(+req.params.id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Campaign workflow triggers
app.post('/api/campaigns/:id/start-prospecting', async (req, res) => {
  try {
    const campaign = db.getCampaign(+req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    db.updateCampaign(campaign.id, { status: 'prospecting' });
    const result = await n8n.triggerProspecting({
      campaign_id: campaign.id,
      icp_industry: campaign.icp_industry,
      icp_geography: campaign.icp_geography,
      icp_company_size: campaign.icp_company_size,
      icp_titles: campaign.icp_titles,
      target_count: campaign.target_count,
      callback_url: `${req.protocol}://${req.get('host')}/api/webhook/companies`,
    });
    sendSSE('campaignUpdated', { ...campaign, status: 'prospecting' });
    res.json({ ok: true, message: 'Prospecting started', n8n: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/campaigns/:id/find-contacts', async (req, res) => {
  try {
    const campaign = db.getCampaign(+req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const { data: companies } = db.getCompanies({ campaign_id: campaign.id, tier: 'A' });
    db.updateCampaign(campaign.id, { status: 'mapping_contacts' });
    for (const company of companies) {
      await n8n.triggerContactFinder({
        campaign_id: campaign.id,
        company_id: company.id,
        company_name: company.name,
        website: company.website,
        callback_url: `${req.protocol}://${req.get('host')}/api/webhook/contacts`,
      });
    }
    sendSSE('campaignUpdated', { ...campaign, status: 'mapping_contacts' });
    res.json({ ok: true, message: `Finding contacts for ${companies.length} companies` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/campaigns/:id/research-write', async (req, res) => {
  try {
    const campaign = db.getCampaign(+req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const { data: contacts } = db.getContacts({ campaign_id: campaign.id, status: 'found' });
    db.updateCampaign(campaign.id, { status: 'researching' });
    for (const contact of contacts.slice(0, 50)) {
      await n8n.triggerResearch({
        campaign_id: campaign.id,
        contact_id: contact.id,
        full_name: contact.name,
        company_name: contact.company_name,
        job_title: contact.title,
        email: contact.email,
        callback_url: `${req.protocol}://${req.get('host')}/api/webhook/emails`,
      });
    }
    sendSSE('campaignUpdated', { ...campaign, status: 'researching' });
    res.json({ ok: true, message: `Researching ${Math.min(contacts.length, 50)} contacts` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Prospects (Companies + Contacts) ----------
app.get('/api/prospects', (req, res) => {
  const { campaign_id, tier, status, q, page = 1 } = req.query;
  const limit = 50;
  const offset = (page - 1) * limit;
  const companies = db.getCompanies({ campaign_id: +campaign_id || undefined, tier, status, q, limit, offset });
  res.json(companies);
});

app.get('/api/contacts', (req, res) => {
  const { campaign_id, company_id, status, q, page = 1 } = req.query;
  const limit = 50;
  const offset = (page - 1) * limit;
  const contacts = db.getContacts({ campaign_id: +campaign_id || undefined, company_id: +company_id || undefined, status, q, limit, offset });
  res.json(contacts);
});

// ---------- Emails ----------
app.get('/api/emails/queue', (req, res) => {
  const emails = db.getEmailQueue(req.query.campaign_id ? +req.query.campaign_id : undefined);
  res.json(emails);
});

app.get('/api/emails', (req, res) => {
  const { campaign_id, status, page = 1 } = req.query;
  const limit = 50;
  const offset = (page - 1) * limit;
  res.json(db.getEmails({ campaign_id: +campaign_id || undefined, status, limit, offset }));
});

app.post('/api/emails/approve', (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'No IDs provided' });
    db.approveEmails(ids);
    sendSSE('statsUpdated', db.getStats());
    res.json({ ok: true, approved: ids.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/emails/reject', (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'No IDs provided' });
    db.rejectEmails(ids);
    sendSSE('statsUpdated', db.getStats());
    res.json({ ok: true, rejected: ids.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/emails/:id', (req, res) => {
  try {
    db.updateEmail(+req.params.id, req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Responses ----------
app.get('/api/responses', (req, res) => {
  const { category, campaign_id, handled, page = 1 } = req.query;
  const limit = 50;
  const offset = (page - 1) * limit;
  res.json(db.getResponses({ category, campaign_id: +campaign_id || undefined, handled: handled !== undefined ? +handled : undefined, limit, offset }));
});

app.put('/api/responses/:id/handled', (req, res) => {
  try {
    db.markResponseHandled(+req.params.id);
    sendSSE('statsUpdated', db.getStats());
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Domains ----------
app.get('/api/domains', (req, res) => {
  res.json(db.getDomains());
});

app.post('/api/domains/check', async (req, res) => {
  try {
    const result = await n8n.triggerDomainFinder(req.body);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Settings ----------
app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.put('/api/settings', (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      db.setSetting(key, value);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- n8n Integration ----------
app.get('/api/n8n/test', async (req, res) => {
  const result = await n8n.testConnection();
  res.json(result);
});

app.get('/api/n8n/workflows', async (req, res) => {
  try {
    const workflows = await n8n.getWorkflows();
    res.json(workflows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Webhooks (called by n8n) ----------
function verifyWebhook(req, res, next) {
  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) {
    // Allow in dev without secret
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
}

app.post('/api/webhook/companies', verifyWebhook, (req, res) => {
  try {
    const companies = Array.isArray(req.body) ? req.body : [req.body];
    let inserted = 0;
    for (const c of companies) {
      db.insertCompany({
        campaign_id: c.campaign_id || null,
        name: c.company_name || c.name || 'Unknown',
        website: c.website || '',
        linkedin_url: c.linkedin_url || '',
        industry: c.industry || '',
        location: c.region || c.location || '',
        icp_score: c.icp_score || 0,
        icp_tier: c.priority_tier || c.icp_tier || 'C',
        status: 'found',
        description: c.description || '',
        data_json: JSON.stringify(c),
      });
      inserted++;
    }
    sendSSE('statsUpdated', db.getStats());
    sendSSE('prospectUpdate', { type: 'companies', count: inserted });
    res.json({ ok: true, inserted });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/webhook/contacts', verifyWebhook, (req, res) => {
  try {
    const contacts = Array.isArray(req.body) ? req.body : [req.body];
    let inserted = 0;
    for (const c of contacts) {
      db.insertContact({
        company_id: c.company_id || null,
        campaign_id: c.campaign_id || null,
        name: c.full_name || c.name || 'Unknown',
        title: c.job_title || c.title || '',
        email: c.email || '',
        linkedin_url: c.linkedin_url || '',
        contact_rank: c.contact_rank || 1,
        email_verified: c.email_verified ? 1 : 0,
        research_confidence: c.research_confidence || '',
        personal_hook: c.personal_hook || '',
        pain_hypothesis: c.pain_hypothesis || '',
        status: c.status || 'found',
        data_json: JSON.stringify(c),
      });
      inserted++;
    }
    sendSSE('statsUpdated', db.getStats());
    res.json({ ok: true, inserted });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/webhook/emails', verifyWebhook, (req, res) => {
  try {
    const emails = Array.isArray(req.body) ? req.body : [req.body];
    let inserted = 0;
    for (const e of emails) {
      db.insertEmail({
        contact_id: e.contact_id || null,
        campaign_id: e.campaign_id || null,
        contact_name: e.full_name || e.contact_name || '',
        contact_email: e.email || e.contact_email || '',
        company_name: e.company_name || '',
        subject: e.subject || '',
        body: e.body || '',
        sequence_number: e.sequence_number || 1,
        status: 'draft',
        data_json: JSON.stringify(e),
      });
      inserted++;
    }
    sendSSE('emailsReady', { count: inserted });
    sendSSE('statsUpdated', db.getStats());
    res.json({ ok: true, inserted });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/webhook/responses', verifyWebhook, (req, res) => {
  try {
    const responses = Array.isArray(req.body) ? req.body : [req.body];
    let inserted = 0;
    for (const r of responses) {
      db.insertResponse({
        email_id: r.email_id || null,
        contact_id: r.contact_id || null,
        campaign_id: r.campaign_id || null,
        from_email: r.from_email || '',
        from_name: r.from_name || '',
        company_name: r.company_name || '',
        category: r.classification || r.category || 'positive',
        sentiment_score: r.sentiment_score || 5,
        reply_body: r.body || r.reply_body || '',
        summary: r.summary || '',
        suggested_action: r.suggested_action || '',
        urgency: r.urgency || 'medium',
      });
      inserted++;
    }
    sendSSE('responseReceived', { count: inserted });
    sendSSE('statsUpdated', db.getStats());
    res.json({ ok: true, inserted });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/webhook/domains', verifyWebhook, (req, res) => {
  try {
    const domains = Array.isArray(req.body) ? req.body : [req.body];
    for (const d of domains) {
      db.insertDomain({
        domain: d.domain,
        status: d.status || 'pending',
        available: d.available ? 1 : 0,
        purchased: d.purchased ? 1 : 0,
        warmup_day: d.warmup_day || 0,
        health_score: d.health_score || 0,
        spf_ok: d.spf_ok ? 1 : 0,
        dkim_ok: d.dkim_ok ? 1 : 0,
        dmarc_ok: d.dmarc_ok ? 1 : 0,
        mailbox_count: d.mailbox_count || 0,
        data_json: JSON.stringify(d),
      });
    }
    sendSSE('statsUpdated', db.getStats());
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Fallback to SPA ----------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Flow Outreach Dashboard running on http://localhost:${PORT}`);
});
