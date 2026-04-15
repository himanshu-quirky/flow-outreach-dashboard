# Harvey Spectre AI SDR - System Architecture

## Overview

Fully automated cold outreach system built on n8n workflows, designed for B2B coffee industry outreach (expandable to any vertical). The system handles the complete outreach lifecycle from ICP identification to meeting booking.

## Core Principles

1. **80-90% Margins** - Replace expensive SaaS tools with n8n workflows wherever possible
2. **Quality at Scale** - Deep personalization that sounds human, not templated
3. **Deliverability First** - Proper infrastructure ensures emails land in inbox
4. **Speed to Deploy** - Ship faster than any competitor using Claude Code + n8n
5. **Multi-threading** - Hit 3 decision-makers per company, coordinate intelligently

## System Components

### 10 Core Workflows

| # | Workflow | Purpose | Trigger |
|---|---------|---------|---------|
| 1 | ICP Company Finder | Find companies matching client's ICP | Manual / Scheduled |
| 2 | Org Chart Mapper | Find 3 decision-makers per company via The Org + LinkedIn | Triggered by WF1 |
| 3 | Email Finder & Verifier | Find and verify email addresses | Triggered by WF2 |
| 4 | Deep Research Engine | Research each prospect (podcasts, LinkedIn, news) | Triggered by WF3 |
| 5 | AI Email Writer | Draft personalized emails using research + client templates | Triggered by WF4 |
| 6 | Airtable Review Pipeline | Push drafts to Airtable for human review/approval | Triggered by WF5 |
| 7 | Campaign Launcher | Send approved emails via SmartLead | Triggered by checkbox in Airtable |
| 8 | Follow-up Sequencer | Automated follow-ups with smart timing | Scheduled |
| 9 | Response Handler & Loop Closer | Handle replies, stop sequences for same-company responses | Webhook from SmartLead |
| 10 | Domain & Deliverability Manager | Domain health checks, warmup monitoring | Scheduled daily |

### Tool Stack

| Tool | Purpose | Cost | Alternative/Savings |
|------|---------|------|-------------------|
| n8n (Cloud/Railway) | Workflow orchestration | ~$20-50/mo | Self-hosted on Railway |
| SmartLead AI | Email warmup + sending | $79-159/mo | Core tool - no replacement |
| ScaledMail | Bulk mailbox management | ~$3/mailbox | Cheapest mailbox option |
| Airtable | Campaign dashboard + review | Free-$20/mo | n8n + Google Sheets alternative |
| Claude API | AI research + email writing | ~$50-100/mo | Core AI brain |
| The Org | Org chart data | Free scraping | n8n HTTP node |
| Parallel AI Search | Deep web research | API costs | Claude + web search |

### Data Flow

```
[ICP Criteria] 
    → WF1: Find Companies (Apollo/LinkedIn/Google/Industry DBs)
    → WF2: Map Org Chart (The Org + LinkedIn + company websites)
    → WF3: Find Emails (Hunter.io/Snov.io/custom verification)
    → WF4: Deep Research (web search, LinkedIn, podcasts, news)
    → WF5: AI Email Drafting (Claude with brand voice + research context)
    → WF6: Push to Airtable (human reviews, edits, approves)
    → WF7: Launch via SmartLead (approved emails → campaign)
    → WF8: Follow-up Engine (Day 3, Day 7, Day 14, Day 21)
    → WF9: Response Handling (reply detection, company-level de-dup)
    → WF10: Infrastructure Health (domain reputation, warmup stats)
```

## Email Infrastructure

### Domain Strategy (for 10k emails/month target)

- **Domains needed**: 10 secondary domains (to keep under 50 emails/domain/day)
- **Mailboxes per domain**: 3 (30 total mailboxes)
- **Emails per mailbox/day**: ~15-20 (conservative for deliverability)
- **Monthly capacity**: 30 mailboxes x 15 emails/day x 30 days = 13,500 emails/month
- **Domain naming**: Variations like tryph6.com, getph6coffee.com, ph6roasters.com, etc.
- **Provider**: ScaledMail for bulk mailbox management
- **Warmup**: SmartLead's built-in warmup (2-3 weeks before sending)

### Deliverability Setup

1. SPF records on all domains
2. DKIM signing enabled
3. DMARC policy set (p=none initially, move to quarantine)
4. Custom tracking domain (avoid shared tracking = spam)
5. Gradual ramp-up: Start 5/day → 10/day → 15/day over 3 weeks
6. Monitor blacklists weekly
7. Bounce rate < 3%, spam rate < 0.1%

## First Client: ph6 Coffee / Imago Trading Vietnam

### ICP

- **Companies**: SME to mid-sized B2B coffee importers, private-label brands, cafe chains
- **Geography**: Europe, Australia, Asia, Middle East (start with Europe + Australia)
- **Personas**: Procurement Heads, Coffee Buyers, Category Managers
- **Pain Point**: Finding consistent quality + scale at competitive pricing
- **USP**: PROBAT P60 roasting at origin = 30-40% lower landed costs

### Campaign Strategy

- **Multi-thread**: 3 contacts per company (Procurement Head + Buyer + Category Manager)
- **Sequence**: 4-email sequence over 21 days
- **Tone**: Warm, confident, data-driven
- **Proof points**: PROBAT P60 system, 40-50 MT/month capacity, origin pricing advantage

## Competitive Advantages (Harvey Spectre vs Others)

1. **Speed**: Ship in days, not weeks. Claude Code + n8n = fastest deployment
2. **Depth of Research**: AI-powered deep research on each prospect (not just name + company)
3. **Smart Multi-threading**: Coordinate across 3 contacts, stop when one responds
4. **Industry Expertise**: Deep understanding of client's business (not generic templates)
5. **Cost Efficiency**: 80-90% margins through n8n automation
6. **Deliverability Engineering**: Proper infrastructure from day 1
7. **Continuous Learning**: A/B testing built into every campaign

## Revenue Model

- **Setup Fee**: $2,000-5,000 (one-time)
- **Monthly Retainer**: $3,000-10,000/month (depending on volume)
- **Pay-per-meeting**: $200-500 per qualified meeting booked (alternative model)
- **Margin**: 80-90% (tool costs ~$200-400/month per client)
