const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Try DB_PATH, then local data dir, then /tmp as last resort
let DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'aisdr.db');
try {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  // Test write access
  fs.accessSync(dbDir, fs.constants.W_OK);
} catch (e) {
  console.log(`Cannot use ${DB_PATH}, falling back to /tmp: ${e.message}`);
  DB_PATH = '/tmp/aisdr.db';
}
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    name TEXT NOT NULL,
    website TEXT,
    tagline TEXT,
    usp TEXT,
    services TEXT,
    tone TEXT DEFAULT 'Warm, confident, data-driven',
    default_cta TEXT DEFAULT 'Worth a 15-min chat?',
    from_email TEXT,
    from_name TEXT,
    signature TEXT,
    gmail_thread_ids TEXT DEFAULT '[]',
    icp_industry TEXT,
    icp_geography TEXT,
    icp_company_size TEXT,
    icp_titles TEXT,
    avoid_topics TEXT,
    proof_points TEXT,
    example_emails TEXT,
    daily_send_cap INTEGER DEFAULT 10,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id INTEGER REFERENCES brands(id),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    icp_industry TEXT,
    icp_geography TEXT,
    icp_company_size TEXT,
    icp_titles TEXT,
    target_count INTEGER DEFAULT 100,
    client_name TEXT DEFAULT 'ph6 Coffee',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER REFERENCES campaigns(id),
    name TEXT NOT NULL,
    website TEXT,
    linkedin_url TEXT,
    industry TEXT,
    location TEXT,
    icp_score INTEGER DEFAULT 0,
    icp_tier TEXT DEFAULT 'C',
    status TEXT DEFAULT 'found',
    description TEXT,
    data_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    name TEXT NOT NULL,
    title TEXT,
    email TEXT,
    linkedin_url TEXT,
    contact_rank INTEGER DEFAULT 1,
    email_verified INTEGER DEFAULT 0,
    research_confidence TEXT,
    personal_hook TEXT,
    pain_hypothesis TEXT,
    status TEXT DEFAULT 'found',
    data_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER REFERENCES contacts(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    contact_name TEXT,
    contact_email TEXT,
    company_name TEXT,
    subject TEXT,
    body TEXT,
    sequence_number INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft',
    approved_at TEXT,
    sent_at TEXT,
    opened_at TEXT,
    replied_at TEXT,
    data_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id INTEGER REFERENCES emails(id),
    contact_id INTEGER,
    campaign_id INTEGER,
    from_email TEXT,
    from_name TEXT,
    company_name TEXT,
    category TEXT DEFAULT 'positive',
    sentiment_score INTEGER,
    reply_body TEXT,
    summary TEXT,
    suggested_action TEXT,
    urgency TEXT DEFAULT 'medium',
    handled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    available INTEGER DEFAULT 0,
    purchased INTEGER DEFAULT 0,
    warmup_day INTEGER DEFAULT 0,
    health_score INTEGER DEFAULT 0,
    spf_ok INTEGER DEFAULT 0,
    dkim_ok INTEGER DEFAULT 0,
    dmarc_ok INTEGER DEFAULT 0,
    mailbox_count INTEGER DEFAULT 0,
    data_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_brands_user ON brands(user_email);
  CREATE INDEX IF NOT EXISTS idx_companies_campaign ON companies(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_companies_tier ON companies(icp_tier);
  CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_campaign ON contacts(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_emails_campaign ON emails(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);
  CREATE INDEX IF NOT EXISTS idx_responses_category ON responses(category);
`);

// Insert default settings
const defaultSettings = {
  client_name: 'ph6 Coffee / Imago Trading Vietnam',
  client_usp: 'German PROBAT P60 automated roasting in Vietnam. 40-50 MT/month capacity. 30-40% lower landed costs vs European-roasted coffee.',
  client_tone: 'Warm, confident, and data-driven. Professional yet conversational.',
  email_max_words: '120',
  email_cta: 'Would you be open to reviewing samples?'
};

const upsertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(defaultSettings)) {
  upsertSetting.run(k, v);
}

// Safe ALTER TABLE migrations - add columns if they don't exist
function addColumnIfMissing(table, column, definition) {
  try {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.find(c => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  } catch (e) { /* ignore */ }
}

addColumnIfMissing('campaigns', 'brand_id', 'INTEGER');
addColumnIfMissing('emails', 'brand_id', 'INTEGER');
addColumnIfMissing('emails', 'gmail_message_id', 'TEXT');
addColumnIfMissing('emails', 'gmail_thread_id', 'TEXT');
addColumnIfMissing('emails', 'next_followup_day', 'INTEGER DEFAULT 3');
addColumnIfMissing('emails', 'followup_sequence', 'INTEGER DEFAULT 0');
addColumnIfMissing('responses', 'gmail_message_id', 'TEXT');
addColumnIfMissing('responses', 'gmail_thread_id', 'TEXT');
addColumnIfMissing('contacts', 'brand_id', 'INTEGER');
addColumnIfMissing('companies', 'brand_id', 'INTEGER');

// Seed Quirkyheads brand if it doesn't exist
const quirkyheadsExists = db.prepare('SELECT id FROM brands WHERE name = ?').get('Quirkyheads');
if (!quirkyheadsExists) {
  db.prepare(`INSERT INTO brands (name, website, tagline, usp, services, tone, default_cta, from_email, from_name, signature, icp_industry, icp_geography, icp_company_size, icp_titles, avoid_topics, proof_points, daily_send_cap)
    VALUES (@name, @website, @tagline, @usp, @services, @tone, @default_cta, @from_email, @from_name, @signature, @icp_industry, @icp_geography, @icp_company_size, @icp_titles, @avoid_topics, @proof_points, @daily_send_cap)`).run({
    name: 'Quirkyheads',
    website: 'https://quirkyheads.co',
    tagline: 'Shopify-only D2C agency. Craft over speed.',
    usp: 'Shopify Select Partner. 170+ D2C brands over 6 years. Deep expertise in Shopify 2.0/Liquid, Core Web Vitals, CRO, paid ads, and Amazon/Walmart storefront ops. We teach your team to run the store.',
    services: 'Shopify development, redesigns, migrations, B2B Shopify, marketplace operations (Amazon, Walmart), Meta/Google Ads, CRO audits, AI automation, staff training',
    tone: 'Warm, confident, and specific. No jargon. Observational. Write like a senior practitioner, not a salesperson.',
    default_cta: 'Worth a 15-min chat?',
    from_email: 'himanshu@quirkyheads.co',
    from_name: 'Himanshu',
    signature: 'Himanshu\nWebsite Growth / CRO\nQuirkyheads | quirkyheads.co',
    icp_industry: 'D2C brands on Shopify - stationery, apparel, beauty, home goods, accessories',
    icp_geography: 'US, UK, India, Canada, Australia',
    icp_company_size: '$500K-$10M annual revenue, 2-50 employees',
    icp_titles: 'Founder, Co-founder, CEO, CMO, Head of E-commerce, Head of Digital, Growth Lead',
    avoid_topics: 'Generic agency pitches, overpromising, cold discount offers, copying competitor language',
    proof_points: 'Shopify Select Partner (2023). 170+ D2C brands. Clients include Amicreative, Happy Threads, Pomp Flowers. 98% client satisfaction. 6+ years Shopify-exclusive.',
    daily_send_cap: 10
  });
}

module.exports = {
  // Brands
  getBrands: () => db.prepare('SELECT * FROM brands ORDER BY created_at DESC').all(),
  getBrand: (id) => db.prepare('SELECT * FROM brands WHERE id = ?').get(id),
  getBrandByName: (name) => db.prepare('SELECT * FROM brands WHERE name = ?').get(name),
  createBrand: (data) => {
    const stmt = db.prepare(`INSERT INTO brands (user_email, name, website, tagline, usp, services, tone, default_cta, from_email, from_name, signature, icp_industry, icp_geography, icp_company_size, icp_titles, avoid_topics, proof_points, example_emails, daily_send_cap)
      VALUES (@user_email, @name, @website, @tagline, @usp, @services, @tone, @default_cta, @from_email, @from_name, @signature, @icp_industry, @icp_geography, @icp_company_size, @icp_titles, @avoid_topics, @proof_points, @example_emails, @daily_send_cap)`);
    return stmt.run(data);
  },
  updateBrand: (id, data) => {
    const allowed = ['name','website','tagline','usp','services','tone','default_cta','from_email','from_name','signature','icp_industry','icp_geography','icp_company_size','icp_titles','avoid_topics','proof_points','example_emails','daily_send_cap','gmail_thread_ids'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (fields.length === 0) return { changes: 0 };
    const setClause = fields.map(k => `${k} = @${k}`).join(', ');
    const params = { id };
    for (const k of fields) params[k] = data[k];
    return db.prepare(`UPDATE brands SET ${setClause}, updated_at = datetime('now') WHERE id = @id`).run(params);
  },
  addBrandThreadId: (brandId, threadId) => {
    const brand = db.prepare('SELECT gmail_thread_ids FROM brands WHERE id = ?').get(brandId);
    if (!brand) return;
    let ids = [];
    try { ids = JSON.parse(brand.gmail_thread_ids || '[]'); } catch {}
    if (!ids.includes(threadId)) {
      ids.push(threadId);
      db.prepare('UPDATE brands SET gmail_thread_ids = ? WHERE id = ?').run(JSON.stringify(ids), brandId);
    }
  },
  getAllKnownThreadIds: () => {
    const rows = db.prepare('SELECT gmail_thread_ids FROM brands').all();
    const all = new Set();
    for (const r of rows) {
      try {
        const ids = JSON.parse(r.gmail_thread_ids || '[]');
        for (const id of ids) all.add(id);
      } catch {}
    }
    return Array.from(all);
  },

  // Email sending + tracking
  markEmailSent: (id, data) => {
    return db.prepare(`UPDATE emails SET status = 'sent', sent_at = datetime('now'), gmail_message_id = @gmail_message_id, gmail_thread_id = @gmail_thread_id WHERE id = @id`)
      .run({ id, gmail_message_id: data.gmail_message_id || null, gmail_thread_id: data.gmail_thread_id || null });
  },
  getEmailById: (id) => db.prepare('SELECT * FROM emails WHERE id = ?').get(id),
  markEmailReplied: (threadId) => {
    return db.prepare(`UPDATE emails SET status = 'replied', replied_at = datetime('now') WHERE gmail_thread_id = ?`).run(threadId);
  },
  getDueFollowups: () => {
    // Find sent emails where next_followup_day has passed and no reply received
    // Follow-up sequence: Day 3, Day 10, Day 17
    const sql = `
      SELECT e.*
      FROM emails e
      WHERE e.status = 'sent'
        AND e.replied_at IS NULL
        AND e.followup_sequence < 3
        AND CAST((julianday('now') - julianday(e.sent_at)) AS INTEGER) >= e.next_followup_day
      ORDER BY e.sent_at ASC
      LIMIT 20
    `;
    return db.prepare(sql).all();
  },
  markFollowupSent: (id) => {
    const row = db.prepare('SELECT followup_sequence FROM emails WHERE id = ?').get(id);
    if (!row) return;
    const nextSeq = (row.followup_sequence || 0) + 1;
    const nextDay = [3, 10, 17][nextSeq] || 99;
    db.prepare('UPDATE emails SET followup_sequence = ?, next_followup_day = ? WHERE id = ?').run(nextSeq, nextDay, id);
  },

  // Campaigns
  getCampaigns: () => db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all(),
  getCampaign: (id) => db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id),
  createCampaign: (data) => {
    const stmt = db.prepare(`INSERT INTO campaigns (name, icp_industry, icp_geography, icp_company_size, icp_titles, target_count, client_name)
      VALUES (@name, @icp_industry, @icp_geography, @icp_company_size, @icp_titles, @target_count, @client_name)`);
    return stmt.run(data);
  },
  updateCampaign: (id, data) => {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    return db.prepare(`UPDATE campaigns SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id });
  },

  // Companies
  getCompanies: ({ campaign_id, tier, status, q, limit = 50, offset = 0 } = {}) => {
    let where = ['1=1'];
    const params = {};
    if (campaign_id) { where.push('campaign_id = @campaign_id'); params.campaign_id = campaign_id; }
    if (tier) { where.push('icp_tier = @tier'); params.tier = tier; }
    if (status) { where.push('status = @status'); params.status = status; }
    if (q) { where.push('name LIKE @q'); params.q = `%${q}%`; }
    const whereClause = where.join(' AND ');
    const total = db.prepare(`SELECT COUNT(*) as count FROM companies WHERE ${whereClause}`).get(params).count;
    const data = db.prepare(`SELECT * FROM companies WHERE ${whereClause} ORDER BY icp_score DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
    return { data, total };
  },
  insertCompany: (data) => {
    const stmt = db.prepare(`INSERT INTO companies (campaign_id, name, website, linkedin_url, industry, location, icp_score, icp_tier, status, description, data_json)
      VALUES (@campaign_id, @name, @website, @linkedin_url, @industry, @location, @icp_score, @icp_tier, @status, @description, @data_json)`);
    return stmt.run(data);
  },

  // Contacts
  getContacts: ({ campaign_id, company_id, status, q, limit = 50, offset = 0 } = {}) => {
    let where = ['1=1'];
    const params = {};
    if (campaign_id) { where.push('c.campaign_id = @campaign_id'); params.campaign_id = campaign_id; }
    if (company_id) { where.push('c.company_id = @company_id'); params.company_id = company_id; }
    if (status) { where.push('c.status = @status'); params.status = status; }
    if (q) { where.push('(c.name LIKE @q OR co.name LIKE @q)'); params.q = `%${q}%`; }
    const whereClause = where.join(' AND ');
    const total = db.prepare(`SELECT COUNT(*) as count FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE ${whereClause}`).get(params).count;
    const data = db.prepare(`SELECT c.*, co.name as company_name, co.icp_tier, co.icp_score FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE ${whereClause} ORDER BY co.icp_score DESC, c.contact_rank ASC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
    return { data, total };
  },
  insertContact: (data) => {
    const stmt = db.prepare(`INSERT INTO contacts (company_id, campaign_id, name, title, email, linkedin_url, contact_rank, email_verified, research_confidence, personal_hook, pain_hypothesis, status, data_json)
      VALUES (@company_id, @campaign_id, @name, @title, @email, @linkedin_url, @contact_rank, @email_verified, @research_confidence, @personal_hook, @pain_hypothesis, @status, @data_json)`);
    return stmt.run(data);
  },

  // Emails
  getEmailQueue: (campaign_id) => {
    let sql = 'SELECT * FROM emails WHERE status = \'draft\'';
    if (campaign_id) sql += ' AND campaign_id = ?';
    sql += ' ORDER BY created_at DESC';
    return campaign_id ? db.prepare(sql).all(campaign_id) : db.prepare(sql).all();
  },
  getEmails: ({ campaign_id, status, limit = 50, offset = 0 } = {}) => {
    let where = ['1=1'];
    const params = {};
    if (campaign_id) { where.push('campaign_id = @campaign_id'); params.campaign_id = campaign_id; }
    if (status) { where.push('status = @status'); params.status = status; }
    const whereClause = where.join(' AND ');
    const total = db.prepare(`SELECT COUNT(*) as count FROM emails WHERE ${whereClause}`).get(params).count;
    const data = db.prepare(`SELECT * FROM emails WHERE ${whereClause} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
    return { data, total };
  },
  insertEmail: (data) => {
    const stmt = db.prepare(`INSERT INTO emails (contact_id, campaign_id, contact_name, contact_email, company_name, subject, body, sequence_number, status, data_json)
      VALUES (@contact_id, @campaign_id, @contact_name, @contact_email, @company_name, @subject, @body, @sequence_number, @status, @data_json)`);
    return stmt.run(data);
  },
  approveEmails: (ids) => {
    const placeholders = ids.map(() => '?').join(',');
    return db.prepare(`UPDATE emails SET status = 'approved', approved_at = datetime('now') WHERE id IN (${placeholders})`).run(...ids);
  },
  rejectEmails: (ids) => {
    const placeholders = ids.map(() => '?').join(',');
    return db.prepare(`UPDATE emails SET status = 'rejected' WHERE id IN (${placeholders})`).run(...ids);
  },
  updateEmail: (id, data) => {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    return db.prepare(`UPDATE emails SET ${fields} WHERE id = @id`).run({ ...data, id });
  },

  // Responses
  getResponses: ({ category, campaign_id, handled, limit = 50, offset = 0 } = {}) => {
    let where = ['1=1'];
    const params = {};
    if (category) { where.push('category = @category'); params.category = category; }
    if (campaign_id) { where.push('campaign_id = @campaign_id'); params.campaign_id = campaign_id; }
    if (handled !== undefined) { where.push('handled = @handled'); params.handled = handled; }
    const whereClause = where.join(' AND ');
    const total = db.prepare(`SELECT COUNT(*) as count FROM responses WHERE ${whereClause}`).get(params).count;
    const data = db.prepare(`SELECT * FROM responses WHERE ${whereClause} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
    return { data, total };
  },
  insertResponse: (data) => {
    const stmt = db.prepare(`INSERT INTO responses (email_id, contact_id, campaign_id, from_email, from_name, company_name, category, sentiment_score, reply_body, summary, suggested_action, urgency)
      VALUES (@email_id, @contact_id, @campaign_id, @from_email, @from_name, @company_name, @category, @sentiment_score, @reply_body, @summary, @suggested_action, @urgency)`);
    return stmt.run(data);
  },
  markResponseHandled: (id) => db.prepare('UPDATE responses SET handled = 1 WHERE id = ?').run(id),

  // Domains
  getDomains: () => db.prepare('SELECT * FROM domains ORDER BY created_at DESC').all(),
  insertDomain: (data) => {
    const stmt = db.prepare(`INSERT OR REPLACE INTO domains (domain, status, available, purchased, warmup_day, health_score, spf_ok, dkim_ok, dmarc_ok, mailbox_count, data_json)
      VALUES (@domain, @status, @available, @purchased, @warmup_day, @health_score, @spf_ok, @dkim_ok, @dmarc_ok, @mailbox_count, @data_json)`);
    return stmt.run(data);
  },

  // Settings
  getSetting: (key) => { const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key); return r ? r.value : null; },
  getSettings: () => {
    const rows = db.prepare('SELECT * FROM settings').all();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  },
  setSetting: (key, value) => db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value),

  // Stats
  getStats: () => {
    const campaigns = db.prepare('SELECT COUNT(*) as count FROM campaigns').get().count;
    const activeCampaigns = db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status NOT IN ('draft','completed')").get().count;
    const companies = db.prepare('SELECT COUNT(*) as count FROM companies').get().count;
    const contacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;
    const emailsDrafted = db.prepare("SELECT COUNT(*) as count FROM emails WHERE status = 'draft'").get().count;
    const emailsApproved = db.prepare("SELECT COUNT(*) as count FROM emails WHERE status = 'approved'").get().count;
    const emailsSent = db.prepare("SELECT COUNT(*) as count FROM emails WHERE status IN ('sent','opened','replied')").get().count;
    const emailsOpened = db.prepare("SELECT COUNT(*) as count FROM emails WHERE status IN ('opened','replied')").get().count;
    const totalResponses = db.prepare('SELECT COUNT(*) as count FROM responses').get().count;
    const positiveResponses = db.prepare("SELECT COUNT(*) as count FROM responses WHERE category = 'positive'").get().count;
    const referrals = db.prepare("SELECT COUNT(*) as count FROM responses WHERE category = 'referral'").get().count;
    const domains = db.prepare('SELECT COUNT(*) as count FROM domains WHERE purchased = 1').get().count;

    const openRate = emailsSent > 0 ? ((emailsOpened / emailsSent) * 100).toFixed(1) : '0.0';
    const replyRate = emailsSent > 0 ? ((totalResponses / emailsSent) * 100).toFixed(1) : '0.0';

    // Pipeline breakdown
    const pipeline = {
      found: db.prepare("SELECT COUNT(*) as c FROM companies WHERE status = 'found'").get().c,
      contacts_mapped: db.prepare("SELECT COUNT(*) as c FROM companies WHERE status = 'contacts_mapped'").get().c,
      researched: db.prepare("SELECT COUNT(*) as c FROM companies WHERE status = 'researched'").get().c,
      emailing: db.prepare("SELECT COUNT(*) as c FROM companies WHERE status = 'emailing'").get().c,
      replied: db.prepare("SELECT COUNT(*) as c FROM companies WHERE status = 'replied'").get().c,
    };

    // Response breakdown
    const responseBreakdown = db.prepare("SELECT category, COUNT(*) as count FROM responses GROUP BY category").all();

    return {
      campaigns, activeCampaigns, companies, contacts,
      emailsDrafted, emailsApproved, emailsSent, emailsOpened,
      totalResponses, positiveResponses, referrals, domains,
      openRate, replyRate, pipeline,
      responseBreakdown: Object.fromEntries(responseBreakdown.map(r => [r.category, r.count]))
    };
  }
};
