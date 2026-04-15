# Harvey Spectre AI SDR - Business Plan

## Executive Summary

Harvey Spectre AI SDR is an AI-powered cold outreach agency specializing in B2B coffee industry outreach, with plans to expand into other commodity verticals. We leverage n8n workflow automation, Claude AI, and best-in-class email infrastructure to deliver hyper-personalized outreach at scale with 80-90% profit margins.

**First Client:** ph6 Coffee / Imago Trading Vietnam - premium industrial coffee roastery seeking wholesale buyers in Europe, Australia, Asia, and Middle East.

**Target:** $100M market opportunity in B2B coffee outreach alone.

---

## Market Analysis

### The AI SDR Industry

The AI SDR market is exploding. Key players:
- **SaaS Tools:** Instantly ($100M+ ARR), Apollo ($100M+ ARR), Lemlist, Smartlead
- **AI SDR Products:** 11x.ai ($50M raised), Artisan AI, AiSDR, Regie.ai
- **Agencies:** Outpilot.ai (sports/sponsorship niche), Belkins, CIENCE

**The Gap:** No one owns the B2B coffee/commodity vertical. The industry is "old" - decision-makers aren't tech-savvy and rely on word of mouth. This is a blue ocean.

### B2B Coffee Market
- Global roasted coffee market: $44.98B (2023) -> $66.41B by 2030
- B2B segment: 54.17% of total (larger than consumer)
- Europe specialty coffee: $7.81B (2024) -> $18.01B by 2033
- Vietnam: World's #2 coffee exporter, $8.9B in exports

### Why This Works
1. **Old industry, new approach.** Coffee procurement runs on relationships and trade shows. Cold email is virtually unused.
2. **High deal values.** A single B2B coffee contract = $100K-1M+/year in recurring revenue for the client.
3. **Deep personalization advantage.** AI can research each buyer's sourcing patterns, trade show attendance, LinkedIn activity - things human SDRs can't do at scale.
4. **Origin cost advantage.** ph6's PROBAT P60 roasting in Vietnam = 30-40% lower costs. This is a genuinely compelling offer.

---

## Our Competitive Advantages

### 1. Speed (Ship in Days, Not Weeks)
Claude Code + n8n = we build and deploy automation faster than any agency. What takes others 2-4 weeks, we do in 2-3 days.

### 2. Depth of Research
6-dimension deep research per prospect: professional background, media appearances, LinkedIn activity, company news, industry involvement, pain signals. No one else does this at scale.

### 3. Smart Multi-Threading
Hit 3 decision-makers per company. If one responds, automatically stop sequences for the other two. Coordinate messaging across contacts. This alone puts us ahead of 90% of agencies.

### 4. AI Email Writing That Sounds Human
Claude writes emails using PAS framework with real research insights. Not templates with {first_name} merge fields. Emails reference specific podcasts, LinkedIn posts, company news.

### 5. Industry Expertise
We don't just send emails. We understand coffee procurement, supply chain pain points, origin economics. Our emails demonstrate industry knowledge.

### 6. Cost Efficiency
80-90% margins because we automate everything. Our monthly tool cost per client: ~$300-400. We charge $3,000-10,000/month.

### 7. Continuous Learning
Every email is an A/B test. We track what works across subject lines, frameworks, personalization levels, send times, and continuously improve.

---

## Technical Architecture

### 10 Core Workflows (All Deployed to n8n)

| # | Workflow | Status | n8n ID |
|---|---------|--------|--------|
| 1 | ICP Company Finder | Deployed | QqgrjivURxbcVaha |
| 2 | Org Chart Mapper & Contact Finder | Deployed | HjRp6jOqQqrT7MRe |
| 3 | Email Finder & Verifier | Deployed | iVjuVogmGslYCr7X |
| 4 | Deep Research Engine | Deployed | 6jNrx7Kf9n2V2Jmm |
| 5 | AI Email Writer | Deployed | SyQ4jTcuhiDQpsSM |
| 6 | Airtable Review & Approval Pipeline | Deployed | KCRnwGT1u2O63A7h |
| 7 | Follow-up Sequencer | Deployed | NJMh8mZda2DNYtuN |
| 8 | Response Handler & Loop Closer | Deployed | Fk1nd8TxFVvfusRS |
| 9 | Domain Finder & Availability Checker | Deployed | qIW0XSHxRkQUbQY8 |
| 10 | Deliverability & Health Monitor | Deployed | 9y6v126WYbZ09h8r |

### Tool Stack & Costs

| Tool | Monthly Cost | Purpose |
|------|-------------|---------|
| n8n (Railway) | $20-50 | Workflow orchestration |
| SmartLead AI | $79-159 | Email warmup + sending |
| ScaledMail | ~$108 (36 mailboxes) | Bulk mailbox management |
| Airtable | Free-$20 | Campaign dashboard |
| Claude API | ~$50-100 | AI research + writing |
| Brave Search API | Free-$9 | Web research |
| Hunter.io | Free-$49 | Email finding + verification |
| **Total** | **~$336-495/mo** | |

### Email Infrastructure for 10k/month

- 12 secondary domains
- 3 mailboxes per domain = 36 mailboxes
- ~15 emails/mailbox/day = 540/day = ~12,000/month
- SPF + DKIM + DMARC on every domain
- SmartLead warmup running permanently
- Custom tracking domain (not shared)

---

## First Client: ph6 Coffee Campaign Plan

### Client Profile
- **Company:** Imago Trading Vietnam / ph6 Coffee
- **Product:** PROBAT P60 roasted Vietnamese coffee
- **USP:** 30-40% lower landed costs vs European-roasted, 40-50 MT/month capacity
- **Tone:** Warm, confident, data-driven

### ICP
- **Companies:** SME to mid-sized coffee importers, private-label brands, cafe chains
- **Geography:** Europe (priority: Germany, Italy, Netherlands, Nordics), Australia, Middle East, Asia
- **Personas:** Procurement Heads, Coffee Buyers, Category Managers
- **Pain Point:** "We struggle to find a supplier who delivers consistent quality at scale"

### Campaign Strategy
- **Volume:** 10,000 emails/month
- **Multi-thread:** 3 contacts per company
- **Sequence:** 4 emails over 17 days (Day 0, Day 3, Day 10, Day 17)
- **Framework:** PAS (Problem-Agitate-Solve) for initial, mixed for follow-ups

### Expected Results (Based on Industry Benchmarks)

| Metric | Conservative | Expected | Optimistic |
|--------|-------------|----------|-----------|
| Emails Sent | 10,000 | 10,000 | 10,000 |
| Open Rate | 35% | 45% | 55% |
| Reply Rate | 3% | 5% | 8% |
| Positive Reply Rate | 1% | 2% | 3% |
| Meetings Booked | 50 | 100 | 200 |

### Data Sources for Prospect Lists
1. **Volza** - 30,677+ active coffee buyers with customs data
2. **Tendata** - 42,084 coffee importers worldwide
3. **SCA Member Directory** - Specialty Coffee Association members
4. **World of Coffee Exhibitor Lists** - Recent trade show attendees
5. **LinkedIn Sales Navigator** - Filtered by coffee industry titles
6. **NCA Business Directory** - US coffee industry contacts

---

## Revenue Model

### Pricing Options

**Option A: Monthly Retainer**
- Setup fee: $3,000 (one-time)
- Monthly: $5,000-10,000/month
- Includes: Full pipeline management, 10k emails/month, AI personalization, reporting

**Option B: Pay Per Meeting**
- Setup fee: $2,000 (one-time)
- Per qualified meeting: $300-500
- Minimum commitment: $3,000/month

**Option C: Revenue Share (for close partners like ph6)**
- Setup fee: $0 (we invest)
- Revenue share: 10-15% of first-year contract value from landed clients
- Align incentives: we only win when they win

### Unit Economics

| Item | Cost |
|------|------|
| Tool stack per client | $400/month |
| AI API costs | $100/month |
| Time investment | 5 hrs/week maintenance |
| **Total cost per client** | **~$500/month** |
| **Revenue per client** | **$5,000-10,000/month** |
| **Gross margin** | **80-90%** |

### Scale Plan

| Quarter | Clients | Monthly Revenue | Margin |
|---------|---------|----------------|--------|
| Q1 2026 | 1 (ph6) | $0 (investment) | -100% |
| Q2 2026 | 3 | $15,000 | 80% |
| Q3 2026 | 8 | $50,000 | 85% |
| Q4 2026 | 15 | $100,000 | 88% |
| Q2 2027 | 30 | $200,000 | 90% |

---

## Immediate Next Steps

### This Week
1. Purchase domains (run WF09 first to check availability)
2. Set up ScaledMail account and create mailboxes
3. Set up SmartLead account and start warmup
4. Create Airtable base with schema from SOP
5. Configure n8n environment variables
6. Run WF01 to start building prospect list

### Week 2
1. Complete prospect research pipeline (WF02-WF04)
2. Generate first batch of email drafts (WF05)
3. Review and approve emails in Airtable
4. Continue warmup (not ready to send yet)
5. Monitor warmup stats daily

### Week 3
1. Begin sending at low volume (5/mailbox/day)
2. Activate follow-up automation (WF07)
3. Activate response handler (WF08)
4. Monitor deliverability closely
5. First replies expected

### Month 2
1. Scale to full volume (15/mailbox/day = 12k/month)
2. First meetings booked
3. Optimize based on data
4. Begin pitching second client

---

## Secret Sauce: What No One Else Is Doing

1. **Customs Data Prospecting:** Using Volza/Tendata to find companies that are ACTUALLY importing coffee (not just guessing from LinkedIn). We know their volumes, pricing, and current suppliers.

2. **Trade Show Follow-up Automation:** Scrape World of Coffee and SCA Expo exhibitor/attendee lists. These people are actively in the market.

3. **Procurement Cycle Timing:** Coffee procurement cycles are quarterly/semi-annual. We time outreach 60-90 days before typical contract renewals.

4. **Industry Language:** Our emails use coffee industry terminology (cupping scores, origin profiles, landed cost per MT, FOB pricing). This proves we understand their world.

5. **Sample Program CTA:** Instead of "book a demo," our CTA is "Would you be open to reviewing samples?" This is the natural next step in coffee procurement and has dramatically lower friction.

6. **Multi-Origin Positioning:** ph6 sources from 4 origins (Vietnam, India, Indonesia, Laos). We can match email messaging to the prospect's current sourcing origins based on customs data.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Low deliverability | 12 backup domains, conservative sending limits, permanent warmup |
| Bad email copy | AI + human review before every send, continuous A/B testing |
| Wrong ICP | Data-driven targeting using customs import data, not guesses |
| Competition enters | First mover in coffee vertical, deep industry knowledge moat |
| Client churn | Revenue share model aligns incentives, prove ROI with data |
| GDPR compliance | Legitimate interest basis for B2B, easy unsubscribe, documented processes |
| Scaling bottleneck | n8n automation handles 95% of work, minimal human touch needed |
