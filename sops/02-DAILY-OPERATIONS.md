# Harvey Spectre AI SDR - Daily Operations SOP

## Morning Routine (15 minutes)

### 1. Check Health Dashboard (5 min)
- Open Airtable > Health Logs table
- Check overnight health alerts
- **CRITICAL ALERTS (immediate action):**
  - Spam rate > 0.1% -> PAUSE all campaigns immediately
  - Bounce rate > 3% -> Stop campaign, clean list
  - Domain blacklisted -> Rotate to backup domains
- **WARNING ALERTS (investigate):**
  - Open rate < 25% -> Check subject lines, test deliverability
  - Reply rate < 2% -> Review email copy quality

### 2. Process Responses (5 min)
- Open Airtable > Responses table, filter by "today"
- **POSITIVE responses:** Flag for immediate personal follow-up (within 2 hours)
- **REFERRALS:** Add referred contact to pipeline (triggers WF02 automatically)
- **OBJECTIONS:** Note objection type for email template improvement
- **NOT_NOW:** Set reminder for 60-90 day re-engagement

### 3. Approve Email Drafts (5 min)
- Open Airtable > Emails table, filter `approved = false`
- Review AI-drafted emails for:
  - Accuracy (no false claims, no avoided topics)
  - Tone (warm, confident, data-driven - not salesy)
  - Personalization quality (specific, not generic)
  - Length (50-120 words max)
- Check the "approved" checkbox for emails that pass
- Edit and approve any that need minor tweaks
- Reject and regenerate any that miss the mark

## Weekly Tasks (30 minutes on Monday)

### 1. Pipeline Review
- How many new companies added this week?
- How many contacts found and verified?
- What's the approval rate on email drafts?
- Target: 25 new companies/week, 75 contacts/week

### 2. Performance Metrics
- Total emails sent this week
- Open rate trend (target: 45%+)
- Reply rate trend (target: 5%+)
- Positive reply rate (target: 2%+)
- Meetings booked this week

### 3. Add New Prospects
- Run WF01 with new search queries if pipeline is thin
- Target maintaining 100+ active prospects at all times
- Adjust ICP criteria based on what's working

### 4. Email Template Refresh
- Check Cold Email Hall of Fame (coldemails.world) for new ideas
- Update email prompt in WF05 if needed
- A/B test new subject line approaches

## Monthly Tasks (1 hour on first Monday)

### 1. Domain Health Audit
- Run mail-tester.com on each active mailbox
- Check blacklist status (mxtoolbox.com/blacklists.aspx)
- Rotate any domains with declining reputation
- Purchase new domains if needed (maintain 12+ buffer)

### 2. Campaign Performance Report
- Total emails sent this month
- Reply rate by sequence position (which follow-up works best?)
- Best-performing subject lines
- Best-performing email frameworks
- Cost per meeting booked
- Revenue attribution (if applicable)

### 3. ICP Refinement
- Which company types are responding best?
- Which job titles convert to meetings?
- Which geographies have highest engagement?
- Update WF01 config and WF05 prompts accordingly

### 4. Competitor Check
- What are other outreach agencies doing?
- Any new tools or techniques to adopt?
- Update knowledge base with latest best practices

## Emergency Procedures

### Spam Rate Spike (>0.1%)
1. IMMEDIATELY pause all campaigns in SmartLead
2. Check which emails triggered spam complaints
3. Review email copy for spam trigger words
4. Check domain reputation at postmaster.google.com
5. Wait 48 hours before resuming at reduced volume
6. If >0.3%: rotate to fresh domains

### Domain Blacklisted
1. Stop sending from affected domain immediately
2. Submit delisting request to relevant blacklist
3. Activate backup domains
4. Do NOT send from delisted domain until confirmed clean
5. Investigate root cause (bad list? aggressive sending? content?)

### Low Open Rates (<20%)
1. Test deliverability at mail-tester.com
2. Check if emails are landing in promotions/spam
3. Review subject lines - are they too salesy?
4. Check sending time (aim for 7-11 AM recipient local time)
5. Verify DNS records (SPF/DKIM/DMARC) are correct
6. Consider reducing daily volume per mailbox

### Negative Response Spike
1. Review the responses for common themes
2. Are we reaching wrong personas?
3. Is the value prop not resonating?
4. Adjust ICP criteria and email templates
5. Consider different approach (industry insight vs direct pitch)
