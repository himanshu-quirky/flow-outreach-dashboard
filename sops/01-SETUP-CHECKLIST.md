# Harvey Spectre AI SDR - Setup Checklist

## Phase 1: Infrastructure (Day 1-3)

### 1.1 Domain Setup
- [ ] Purchase 12 secondary domains via Porkbun or Namecheap
  - Naming pattern: tryph6.com, getph6coffee.com, ph6roasters.com, ph6supply.com, etc.
  - Budget: ~$10-12/domain = ~$120-144 total
- [ ] Set up DNS for each domain:
  - [ ] SPF record: `v=spf1 include:_spf.google.com ~all`
  - [ ] DKIM: Generate via Google Workspace admin
  - [ ] DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`
  - [ ] MX records pointing to Google Workspace
- [ ] Set up domain forwarding (all secondary domains -> ph6coffee.com)
- [ ] Run WF09 (Domain Finder) to check availability first

### 1.2 Email Mailboxes
- [ ] Set up 3 mailboxes per domain via ScaledMail (36 total)
  - Names: harvey@, h.spectre@, team@ (or first-name variations)
  - Each mailbox needs profile photo, signature, sending name
- [ ] Create professional email signatures for each persona
- [ ] Connect all mailboxes to SmartLead for warmup

### 1.3 Tool Accounts
- [ ] ScaledMail - Create account, connect domains ($3/mailbox = ~$108/mo)
- [ ] SmartLead AI - Create account ($79/mo starter plan)
  - Connect mailboxes
  - Start warmup immediately (2-3 weeks needed)
- [ ] Airtable - Create free account, set up base (see schema below)
- [ ] Brave Search API - Get API key (free tier: 2000 queries/mo)
- [ ] Hunter.io - Get API key (free: 25 verifications/mo, $49/mo for 1000)
- [ ] Anthropic API - Already have key, set environment variable in n8n

### 1.4 n8n Configuration
- [ ] Set environment variables in n8n:
  ```
  ANTHROPIC_API_KEY=sk-ant-...
  BRAVE_API_KEY=BSA...
  HUNTER_API_KEY=...
  SNOV_API_KEY=...
  SMARTLEAD_API_KEY=...
  SMARTLEAD_CAMPAIGN_ID=...
  AIRTABLE_BASE_ID=...
  AIRTABLE_API_KEY=...
  ```
- [ ] Test each workflow individually
- [ ] Set up webhook URLs and test connectivity

### 1.5 Airtable Base Schema
Create base "Harvey SDR - ph6 Coffee" with these tables:

**Companies Table:**
| Field | Type |
|-------|------|
| company_name | Primary (text) |
| website | URL |
| linkedin_url | URL |
| description | Long text |
| icp_score | Number |
| priority_tier | Single select (A/B/C/D) |
| region | Single select |
| pipeline_stage | Single select |
| found_at | Date |

**Contacts Table:**
| Field | Type |
|-------|------|
| full_name | Primary (text) |
| email | Email |
| job_title | Text |
| company_name | Link to Companies |
| contact_rank | Number (1-3) |
| linkedin_url | URL |
| email_verified | Checkbox |
| research_confidence | Single select (high/medium/low) |
| personal_hook | Long text |
| pain_hypothesis | Long text |
| pipeline_stage | Single select |

**Emails Table:**
| Field | Type |
|-------|------|
| thread_id | Primary (text) |
| full_name | Text |
| email | Email |
| company_name | Link to Companies |
| sequence_number | Number |
| subject | Text |
| body | Long text |
| approved | Checkbox |
| sent | Checkbox |
| replied | Checkbox |
| status | Single select |
| drafted_at | Date |
| queued_at | Date |

**Responses Table:**
| Field | Type |
|-------|------|
| from_email | Primary (email) |
| from_name | Text |
| company_name | Link to Companies |
| classification | Single select (POSITIVE/REFERRAL/NOT_NOW/OBJECTION/NEGATIVE/UNSUBSCRIBE) |
| sentiment_score | Number |
| summary | Long text |
| suggested_action | Long text |
| urgency | Single select |
| reply_date | Date |

**Domains Table:**
| Field | Type |
|-------|------|
| domain | Primary (text) |
| available | Checkbox |
| purchased | Checkbox |
| dns_configured | Checkbox |
| warmup_started | Checkbox |
| health_status | Single select |

**Health Logs Table:**
| Field | Type |
|-------|------|
| checked_at | Primary (date) |
| overall_health | Single select (HEALTHY/WARNING/CRITICAL) |
| open_rate | Text |
| reply_rate | Text |
| bounce_rate | Text |
| spam_rate | Text |
| alert_count | Number |

---

## Phase 2: Warmup Period (Day 3-21)

### 2.1 Email Warmup
- [ ] SmartLead warmup running on all 36 mailboxes
- [ ] Daily check: warmup engagement rates above 40%
- [ ] Week 1: 5-10 warmup emails/day per mailbox
- [ ] Week 2: 20-30 warmup emails/day
- [ ] Week 3: 40-50 warmup emails/day
- [ ] Test deliverability at mail-tester.com (aim for 9+/10 score)

### 2.2 Prospect Research (During Warmup)
- [ ] Run WF01 (ICP Company Finder) - target 100 companies
- [ ] Run WF02 (Org Chart Mapper) for Tier A companies
- [ ] Run WF03 (Email Finder) for all mapped contacts
- [ ] Run WF04 (Deep Research) for verified contacts
- [ ] Run WF05 (AI Email Writer) for all researched contacts
- [ ] Review and approve emails in Airtable

---

## Phase 3: Campaign Launch (Day 21+)

### 3.1 Gradual Ramp-Up
- [ ] Week 1 of sending: 5 emails/mailbox/day (180 total/day)
- [ ] Week 2: 10 emails/mailbox/day (360 total/day)
- [ ] Week 3: 15 emails/mailbox/day (540 total/day = ~12k/month)
- [ ] Monitor bounce rate (<3%), spam rate (<0.1%) daily

### 3.2 Activate Automation
- [ ] Activate WF06 (Review Pipeline) - 5min polling
- [ ] Activate WF07 (Follow-up Sequencer) - 6hr polling
- [ ] Activate WF08 (Response Handler) - webhook active
- [ ] Activate WF10 (Health Monitor) - 12hr polling

### 3.3 Daily Operations
- [ ] Review Airtable dashboard (10 min)
- [ ] Approve pending email drafts
- [ ] Respond to positive replies within 2 hours
- [ ] Check health alerts
- [ ] Add new companies to pipeline weekly

---

## Phase 4: Optimization (Ongoing)

- [ ] A/B test subject lines (split test in SmartLead)
- [ ] Track which email frameworks get best replies (PAS vs AIDA)
- [ ] Refine ICP scoring based on who converts
- [ ] Update email templates based on Cold Email Hall of Fame
- [ ] Monthly: review and clean domain reputation
- [ ] Quarterly: expand to new geographies/verticals
