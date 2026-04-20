require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const db = require('./db');
const n8n = require('./n8n');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS for Lovable frontend
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,https://flow-to-site-maker.lovable.app,https://flowoutreach.lovable.app').split(',');
  if (allowed.includes(origin) || allowed.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Webhook-Secret');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Auth ----------
const crypto = require('crypto');

app.post('/api/auth/signup', (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const existing = db.getSetting(`user:${email}`);
    if (existing) return res.status(409).json({ error: 'Account already exists' });
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const token = crypto.randomBytes(32).toString('hex');
    db.setSetting(`user:${email}`, JSON.stringify({ email, name: name || email.split('@')[0], hash, created: new Date().toISOString() }));
    db.setSetting(`token:${token}`, email);
    res.json({ token, user: { email, name: name || email.split('@')[0] } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const userData = db.getSetting(`user:${email}`);
    if (!userData) return res.status(401).json({ error: 'Invalid credentials' });
    const user = JSON.parse(userData);
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.hash !== hash) return res.status(401).json({ error: 'Invalid credentials' });
    const token = crypto.randomBytes(32).toString('hex');
    db.setSetting(`token:${token}`, email);
    res.json({ token, user: { email: user.email, name: user.name } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const email = db.getSetting(`token:${token}`);
  if (!email) return res.status(401).json({ error: 'Invalid token' });
  const userData = db.getSetting(`user:${email}`);
  if (!userData) return res.status(401).json({ error: 'User not found' });
  const user = JSON.parse(userData);
  res.json({ email: user.email, name: user.name });
});

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

// ---------- Brands ----------
app.get('/api/brands', (req, res) => {
  try { res.json(db.getBrands()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/brands/:id', (req, res) => {
  try {
    const brand = db.getBrand(+req.params.id);
    if (!brand) return res.status(404).json({ error: 'Not found' });
    res.json(brand);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/brands', (req, res) => {
  try {
    const data = {
      user_email: req.body.user_email || null,
      name: req.body.name,
      website: req.body.website || '',
      tagline: req.body.tagline || '',
      usp: req.body.usp || '',
      services: req.body.services || '',
      tone: req.body.tone || 'Warm, confident, data-driven',
      default_cta: req.body.default_cta || 'Worth a 15-min chat?',
      from_email: req.body.from_email || '',
      from_name: req.body.from_name || '',
      signature: req.body.signature || '',
      icp_industry: req.body.icp_industry || '',
      icp_geography: req.body.icp_geography || '',
      icp_company_size: req.body.icp_company_size || '',
      icp_titles: req.body.icp_titles || '',
      avoid_topics: req.body.avoid_topics || '',
      proof_points: req.body.proof_points || '',
      example_emails: req.body.example_emails || '',
      daily_send_cap: req.body.daily_send_cap || 10,
    };
    const result = db.createBrand(data);
    res.json(db.getBrand(result.lastInsertRowid));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/brands/:id', (req, res) => {
  try {
    db.updateBrand(+req.params.id, req.body);
    res.json(db.getBrand(+req.params.id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Email send trigger ----------
const fetchFn = require('node-fetch');

app.post('/api/emails/:id/send', async (req, res) => {
  try {
    const email = db.getEmailById(+req.params.id);
    if (!email) return res.status(404).json({ error: 'Email not found' });
    if (email.status === 'sent') return res.status(400).json({ error: 'Already sent' });

    // Get brand info for from_email
    let brand = null;
    if (email.brand_id) brand = db.getBrand(email.brand_id);
    if (!brand) {
      const brands = db.getBrands();
      brand = brands[0]; // default to first brand
    }

    const n8nWebhook = `${process.env.N8N_API_URL || 'https://primary-production-2f66e.up.railway.app'}/webhook/send-email`;
    const payload = {
      email_id: email.id,
      campaign_id: email.campaign_id,
      to_email: email.contact_email,
      to_name: email.contact_name,
      subject: email.subject,
      body: email.body,
      from_brand: brand ? brand.name : 'Quirkyheads',
      from_email: brand ? brand.from_email : 'himanshu@quirkyheads.co',
      from_name: brand ? brand.from_name : 'Himanshu',
      signature: brand ? brand.signature : '',
    };

    const resp = await fetchFn(n8nWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 30000,
    });

    // Mark as queued
    db.updateEmail(email.id, { status: 'queued' });
    sendSSE('emailQueued', { id: email.id });
    res.json({ ok: true, email_id: email.id, n8n_status: resp.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- New webhooks for Send/Monitor/Followup workflows ----------

// Called by WF05 after Gmail send
app.post('/api/webhook/email-sent', verifyWebhook, (req, res) => {
  try {
    const { email_id, gmail_message_id, gmail_thread_id, sent, error } = req.body;
    if (sent && email_id) {
      db.markEmailSent(email_id, { gmail_message_id, gmail_thread_id });
      // Track thread ID for inbox monitor
      const email = db.getEmailById(email_id);
      if (email && email.brand_id && gmail_thread_id) {
        db.addBrandThreadId(email.brand_id, gmail_thread_id);
      } else if (gmail_thread_id) {
        // No brand_id, add to default brand
        const brands = db.getBrands();
        if (brands[0]) db.addBrandThreadId(brands[0].id, gmail_thread_id);
      }
      sendSSE('statsUpdated', db.getStats());
    } else if (email_id) {
      db.updateEmail(email_id, { status: 'send_failed' });
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Called by WF06 to check which thread IDs are ours
app.post('/api/webhook/check-known-thread', verifyWebhook, (req, res) => {
  try {
    const { thread_ids } = req.body;
    if (!Array.isArray(thread_ids)) return res.json({ known_thread_ids: [] });
    const known = new Set(db.getAllKnownThreadIds());
    const matched = thread_ids.filter(id => known.has(id));
    res.json({ known_thread_ids: matched });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Called by WF07 after sending a follow-up
app.post('/api/webhook/followup-sent', verifyWebhook, (req, res) => {
  try {
    const { email_id } = req.body;
    if (email_id) db.markFollowupSent(email_id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Called by WF07 cron to fetch due follow-ups
app.get('/api/followups/due', (req, res) => {
  try {
    const secret = req.headers['x-webhook-secret'];
    if (process.env.NODE_ENV === 'production' && secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const followups = db.getDueFollowups();
    // Generate follow-up body for each (simple for now - AI gen can be added later)
    const enriched = followups.map(e => {
      const seq = (e.followup_sequence || 0) + 1;
      const followupBody = seq === 1
        ? `Hi ${(e.contact_name || '').split(' ')[0]},\n\nJust floating this back up. No reply needed if not a priority right now.\n\nI shared a quick idea on ${e.subject.toLowerCase()} a few days ago. Worth a 15-min chat?\n\nBest,\nHimanshu`
        : seq === 2
        ? `Hi ${(e.contact_name || '').split(' ')[0]},\n\nLast one from me on this.\n\nIf this isn't the right timing, totally get it. Would you be open to me reaching out in Q3 instead?\n\nBest,\nHimanshu`
        : `Hi ${(e.contact_name || '').split(' ')[0]},\n\nClosing the loop here - I'll step back. If this ever becomes a priority, you've got my email.\n\nBest of luck with the business.\n\nHimanshu`;
      return {
        email_id: e.id,
        original_gmail_message_id: e.gmail_message_id,
        original_gmail_thread_id: e.gmail_thread_id,
        to_email: e.contact_email,
        contact_name: e.contact_name,
        sequence_number: seq,
        body: followupBody,
      };
    });
    res.json({ followups: enriched, count: enriched.length });
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
