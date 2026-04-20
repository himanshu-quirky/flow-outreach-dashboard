#!/usr/bin/env python3
"""Deploy Send Email, Monitor Inbox, and Follow-up workflows to n8n.

These workflows use Gmail SMTP/IMAP via app password (not OAuth).
Simpler setup: user generates app password in Gmail, we use it.
"""

import json
import urllib.request
import urllib.error

import os
N8N_URL = os.environ.get("N8N_API_URL", "https://primary-production-2f66e.up.railway.app")
N8N_KEY = os.environ.get("N8N_API_KEY", "")
GROQ_KEY = os.environ.get("GROQ_API_KEY", "")
BACKEND = os.environ.get("BACKEND_URL", "https://flow-outreach-dashboard-production-ea55.up.railway.app")

if not N8N_KEY or not GROQ_KEY:
    print("Set N8N_API_KEY and GROQ_API_KEY env vars first.")
    import sys; sys.exit(1)

def deploy(workflow):
    body = json.dumps(workflow).encode()
    req = urllib.request.Request(
        f"{N8N_URL}/api/v1/workflows",
        data=body,
        headers={"X-N8N-API-KEY": N8N_KEY, "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read()).get("id")
    except urllib.error.HTTPError as e:
        print(f"  ERROR: {e.read().decode()[:200]}")
        return None


# ============================================================
# WORKFLOW 05: Send Email via Gmail
# ============================================================
# Triggered by dashboard when user approves an email.
# Body: { email_id, to_email, to_name, subject, body, from_brand, reply_to_thread_id? }
wf05 = {
    "name": "05 - Send Email (Gmail)",
    "nodes": [
        {
            "parameters": {"httpMethod": "POST", "path": "send-email", "responseMode": "onReceived", "options": {}},
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook", "typeVersion": 2.1,
            "position": [-600, 300], "webhookId": "send-email"
        },
        {
            "parameters": {"mode": "runOnceForAllItems", "language": "javaScript",
                "jsCode": """const body = $input.first().json.body || $input.first().json;
// Validate required fields
if (!body.to_email || !body.subject || !body.body) {
  return [{ json: { error: 'missing_required_fields', required: ['to_email', 'subject', 'body'] } }];
}
return [{ json: {
  email_id: body.email_id,
  to_email: body.to_email,
  to_name: body.to_name || '',
  subject: body.subject,
  body: body.body,
  from_brand: body.from_brand || 'Quirkyheads',
  from_email: body.from_email || 'himanshu@quirkyheads.co',
  from_name: body.from_name || 'Himanshu',
  signature: body.signature || '',
  reply_to_thread_id: body.reply_to_thread_id || null,
  campaign_id: body.campaign_id || 1
}}];"""
            },
            "name": "Parse & Validate", "type": "n8n-nodes-base.code", "typeVersion": 2,
            "position": [-380, 300]
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "send",
                "sendTo": "={{ $json.to_email }}",
                "subject": "={{ $json.subject }}",
                "message": "={{ $json.body }}{{ $json.signature ? '\\n\\n' + $json.signature : '' }}",
                "options": {}
            },
            "name": "Gmail Send",
            "type": "n8n-nodes-base.gmail", "typeVersion": 2.1,
            "position": [-160, 300],
            "onError": "continueRegularOutput"
            # NOTE: requires Gmail OAuth credential configured in n8n
            # Will be set via Chrome automation in next step
        },
        {
            "parameters": {"mode": "runOnceForAllItems", "language": "javaScript",
                "jsCode": """const sent = $input.first().json;
const original = $('Parse & Validate').first().json;

// Check if Gmail send succeeded
const ok = !sent.error && (sent.id || sent.threadId);

return [{ json: {
  email_id: original.email_id,
  campaign_id: original.campaign_id,
  to_email: original.to_email,
  sent: ok,
  sent_at: new Date().toISOString(),
  gmail_message_id: sent.id || null,
  gmail_thread_id: sent.threadId || null,
  error: sent.error ? JSON.stringify(sent.error).substring(0, 300) : null,
  status: ok ? 'sent' : 'send_failed'
}}];"""
            },
            "name": "Prepare Callback", "type": "n8n-nodes-base.code", "typeVersion": 2,
            "position": [60, 300]
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{BACKEND}/api/webhook/email-sent",
                "sendHeaders": True, "headerParameters": {"parameters": [
                    {"name": "Content-Type", "value": "application/json"},
                    {"name": "X-Webhook-Secret", "value": "harvey_sdr_2026_secret"}
                ]},
                "sendBody": True, "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify($json) }}",
                "options": {"timeout": 15000}
            },
            "name": "Update Dashboard",
            "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
            "position": [280, 300],
            "onError": "continueRegularOutput"
        }
    ],
    "connections": {
        "Webhook": {"main": [[{"node": "Parse & Validate", "type": "main", "index": 0}]]},
        "Parse & Validate": {"main": [[{"node": "Gmail Send", "type": "main", "index": 0}]]},
        "Gmail Send": {"main": [[{"node": "Prepare Callback", "type": "main", "index": 0}]]},
        "Prepare Callback": {"main": [[{"node": "Update Dashboard", "type": "main", "index": 0}]]}
    },
    "settings": {"executionOrder": "v1"}
}


# ============================================================
# WORKFLOW 06: Monitor Gmail Inbox + Classify Replies
# ============================================================
# Runs every 15 minutes, checks for new emails in the inbox,
# filters to ones that look like replies to our outreach,
# classifies them with Groq, updates dashboard, sends Telegram.
wf06 = {
    "name": "06 - Monitor Inbox & Classify Replies",
    "nodes": [
        {
            "parameters": {"rule": {"interval": [{"field": "minutes", "minutesInterval": 15}]}},
            "name": "Every 15 Minutes",
            "type": "n8n-nodes-base.scheduleTrigger", "typeVersion": 1.2,
            "position": [-600, 300]
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "getAll",
                "returnAll": False,
                "limit": 20,
                "simple": False,
                "filters": {
                    "q": "=label:inbox newer_than:1d -from:me"
                }
            },
            "name": "Fetch Recent Emails",
            "type": "n8n-nodes-base.gmail", "typeVersion": 2.1,
            "position": [-380, 300],
            "onError": "continueRegularOutput"
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{BACKEND}/api/webhook/check-known-thread",
                "sendHeaders": True, "headerParameters": {"parameters": [
                    {"name": "Content-Type", "value": "application/json"},
                    {"name": "X-Webhook-Secret", "value": "harvey_sdr_2026_secret"}
                ]},
                "sendBody": True, "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify({ thread_ids: $input.all().map(i => i.json.threadId).filter(Boolean) }) }}",
                "options": {"timeout": 15000}
            },
            "name": "Match Known Threads",
            "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
            "position": [-160, 300],
            "onError": "continueRegularOutput"
        },
        {
            "parameters": {"mode": "runOnceForAllItems", "language": "javaScript",
                "jsCode": """const emails = $('Fetch Recent Emails').all();
const knownThreadsResp = $input.first().json;
const knownThreads = new Set(knownThreadsResp.known_thread_ids || []);

const replies = emails
  .map(e => e.json)
  .filter(e => e && e.threadId && knownThreads.has(e.threadId))
  .map(e => ({
    gmail_message_id: e.id,
    gmail_thread_id: e.threadId,
    from_email: (e.from && e.from.value && e.from.value[0] && e.from.value[0].address) || '',
    from_name: (e.from && e.from.value && e.from.value[0] && e.from.value[0].name) || '',
    subject: e.subject || '',
    body: (e.textPlain || e.snippet || '').substring(0, 2000),
    received_at: e.date || new Date().toISOString()
  }));

return replies.length > 0 ? replies.map(r => ({ json: r })) : [{ json: { no_new_replies: true } }];"""
            },
            "name": "Filter to Reply Threads", "type": "n8n-nodes-base.code", "typeVersion": 2,
            "position": [60, 300]
        },
        {
            "parameters": {
                "conditions": {
                    "options": {"caseSensitive": True, "typeValidation": "strict", "version": 2},
                    "combinator": "and",
                    "conditions": [{
                        "leftValue": "={{ $json.no_new_replies }}",
                        "rightValue": True,
                        "operator": {"type": "boolean", "operation": "notEquals"}
                    }]
                }
            },
            "name": "Has Replies?",
            "type": "n8n-nodes-base.if", "typeVersion": 2.3,
            "position": [280, 300]
        },
        {
            "parameters": {
                "method": "POST",
                "url": "https://api.groq.com/openai/v1/chat/completions",
                "sendHeaders": True, "headerParameters": {"parameters": [
                    {"name": "Authorization", "value": f"Bearer {GROQ_KEY}"},
                    {"name": "Content-Type", "value": "application/json"}
                ]},
                "sendBody": True, "specifyBody": "json",
                "jsonBody": '={\n  "model": "llama-3.3-70b-versatile",\n  "messages": [\n    {"role": "system", "content": "Classify email replies. Return valid JSON only."},\n    {"role": "user", "content": "Classify this reply:\\n\\nFrom: " + $json.from_name + " <" + $json.from_email + ">\\nSubject: " + $json.subject + "\\nBody: " + $json.body + "\\n\\nCategories: positive (wants to engage, asks questions, says yes), referral (points to another person), not_now (not the right timing), objection (has concerns), negative (clear no), out_of_office, unsubscribe, bounce\\n\\nReturn JSON: {\\"category\\": \\"...\\", \\"sentiment_score\\": 1-10, \\"summary\\": \\"one line\\", \\"suggested_action\\": \\"what to do next\\", \\"urgency\\": \\"high/medium/low\\"}"}\n  ],\n  "temperature": 0.2,\n  "max_tokens": 512,\n  "response_format": {"type": "json_object"}\n}',
                "options": {"timeout": 30000}
            },
            "name": "Groq - Classify",
            "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
            "position": [500, 200],
            "retryOnFail": True, "waitBetweenTries": 2000, "maxTries": 2
        },
        {
            "parameters": {"mode": "runOnceForAllItems", "language": "javaScript",
                "jsCode": """const resp = $input.first().json;
const original = $('Filter to Reply Threads').first().json;
const text = resp.choices && resp.choices[0] && resp.choices[0].message ? resp.choices[0].message.content : '{}';
let cls = {};
try { cls = JSON.parse(text); } catch(e) { cls = { category: 'positive', sentiment_score: 5, summary: '', urgency: 'medium' }; }

return [{ json: {
  gmail_message_id: original.gmail_message_id,
  gmail_thread_id: original.gmail_thread_id,
  from_email: original.from_email,
  from_name: original.from_name,
  subject: original.subject,
  body: original.body,
  reply_body: original.body,
  received_at: original.received_at,
  category: cls.category || 'positive',
  classification: cls.category || 'positive',
  sentiment_score: cls.sentiment_score || 5,
  summary: cls.summary || '',
  suggested_action: cls.suggested_action || '',
  urgency: cls.urgency || 'medium'
}}];"""
            },
            "name": "Parse Classification", "type": "n8n-nodes-base.code", "typeVersion": 2,
            "position": [720, 200]
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{BACKEND}/api/webhook/responses",
                "sendHeaders": True, "headerParameters": {"parameters": [
                    {"name": "Content-Type", "value": "application/json"},
                    {"name": "X-Webhook-Secret", "value": "harvey_sdr_2026_secret"}
                ]},
                "sendBody": True, "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify($json) }}",
                "options": {"timeout": 15000}
            },
            "name": "Save to Dashboard",
            "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
            "position": [940, 200],
            "onError": "continueRegularOutput"
        },
        {
            "parameters": {
                "method": "POST",
                "url": "=https://api.telegram.org/bot{{ $env.TELEGRAM_BOT_TOKEN || '000:placeholder' }}/sendMessage",
                "sendHeaders": True, "headerParameters": {"parameters": [
                    {"name": "Content-Type", "value": "application/json"}
                ]},
                "sendBody": True, "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify({ chat_id: $env.TELEGRAM_CHAT_ID || '0', parse_mode: 'Markdown', text: '*New reply received!*\\n\\n*Category:* ' + $json.category.toUpperCase() + ' (' + $json.urgency + ' urgency)\\n*From:* ' + $json.from_name + ' (' + $json.from_email + ')\\n*Subject:* ' + $json.subject + '\\n\\n*Summary:* ' + $json.summary + '\\n\\n*Suggested action:* ' + $json.suggested_action + '\\n\\n*Reply preview:*\\n' + $json.body.substring(0, 500) }) }}",
                "options": {"timeout": 15000}
            },
            "name": "Notify via Telegram",
            "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
            "position": [1160, 200],
            "onError": "continueRegularOutput"
        }
    ],
    "connections": {
        "Every 15 Minutes": {"main": [[{"node": "Fetch Recent Emails", "type": "main", "index": 0}]]},
        "Fetch Recent Emails": {"main": [[{"node": "Match Known Threads", "type": "main", "index": 0}]]},
        "Match Known Threads": {"main": [[{"node": "Filter to Reply Threads", "type": "main", "index": 0}]]},
        "Filter to Reply Threads": {"main": [[{"node": "Has Replies?", "type": "main", "index": 0}]]},
        "Has Replies?": {"main": [
            [{"node": "Groq - Classify", "type": "main", "index": 0}],
            []
        ]},
        "Groq - Classify": {"main": [[{"node": "Parse Classification", "type": "main", "index": 0}]]},
        "Parse Classification": {"main": [[
            {"node": "Save to Dashboard", "type": "main", "index": 0},
            {"node": "Notify via Telegram", "type": "main", "index": 0}
        ]]}
    },
    "settings": {"executionOrder": "v1"}
}


# ============================================================
# WORKFLOW 07: Send Follow-ups (cron)
# ============================================================
# Runs every 2 hours, finds emails where follow-up is due
# and sends the next sequence email.
wf07 = {
    "name": "07 - Send Follow-ups",
    "nodes": [
        {
            "parameters": {"rule": {"interval": [{"field": "hours", "hoursInterval": 2}]}},
            "name": "Every 2 Hours",
            "type": "n8n-nodes-base.scheduleTrigger", "typeVersion": 1.2,
            "position": [-600, 300]
        },
        {
            "parameters": {
                "method": "GET",
                "url": f"{BACKEND}/api/followups/due",
                "sendHeaders": True, "headerParameters": {"parameters": [
                    {"name": "X-Webhook-Secret", "value": "harvey_sdr_2026_secret"}
                ]},
                "options": {"timeout": 30000}
            },
            "name": "Get Due Follow-ups",
            "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
            "position": [-380, 300]
        },
        {
            "parameters": {"mode": "runOnceForAllItems", "language": "javaScript",
                "jsCode": """const resp = $input.first().json;
const followups = resp.followups || [];
if (followups.length === 0) return [{ json: { no_followups: true } }];
return followups.map(f => ({ json: f }));"""
            },
            "name": "Split Follow-ups", "type": "n8n-nodes-base.code", "typeVersion": 2,
            "position": [-160, 300]
        },
        {
            "parameters": {
                "conditions": {
                    "options": {"caseSensitive": True, "typeValidation": "strict", "version": 2},
                    "combinator": "and",
                    "conditions": [{
                        "leftValue": "={{ $json.no_followups }}",
                        "rightValue": True,
                        "operator": {"type": "boolean", "operation": "notEquals"}
                    }]
                }
            },
            "name": "Has Follow-ups?",
            "type": "n8n-nodes-base.if", "typeVersion": 2.3,
            "position": [60, 300]
        },
        {
            "parameters": {
                "resource": "message",
                "operation": "reply",
                "messageId": "={{ $json.original_gmail_message_id }}",
                "message": "={{ $json.body }}",
                "options": {}
            },
            "name": "Gmail Reply",
            "type": "n8n-nodes-base.gmail", "typeVersion": 2.1,
            "position": [280, 200],
            "onError": "continueRegularOutput"
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{BACKEND}/api/webhook/followup-sent",
                "sendHeaders": True, "headerParameters": {"parameters": [
                    {"name": "Content-Type", "value": "application/json"},
                    {"name": "X-Webhook-Secret", "value": "harvey_sdr_2026_secret"}
                ]},
                "sendBody": True, "specifyBody": "json",
                "jsonBody": "={{ JSON.stringify({ email_id: $('Split Follow-ups').item.json.email_id, sent: true, sent_at: new Date().toISOString() }) }}",
                "options": {"timeout": 15000}
            },
            "name": "Mark Sent",
            "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
            "position": [500, 200],
            "onError": "continueRegularOutput"
        }
    ],
    "connections": {
        "Every 2 Hours": {"main": [[{"node": "Get Due Follow-ups", "type": "main", "index": 0}]]},
        "Get Due Follow-ups": {"main": [[{"node": "Split Follow-ups", "type": "main", "index": 0}]]},
        "Split Follow-ups": {"main": [[{"node": "Has Follow-ups?", "type": "main", "index": 0}]]},
        "Has Follow-ups?": {"main": [
            [{"node": "Gmail Reply", "type": "main", "index": 0}],
            []
        ]},
        "Gmail Reply": {"main": [[{"node": "Mark Sent", "type": "main", "index": 0}]]}
    },
    "settings": {"executionOrder": "v1"}
}


if __name__ == "__main__":
    print("Deploying send/monitor/followup workflows...\n")
    for wf in [wf05, wf06, wf07]:
        wf_id = deploy(wf)
        if wf_id:
            print(f"  OK  {wf['name']} -> {wf_id}")
        else:
            print(f"  FAIL {wf['name']}")
    print("\nDone. Next: activate in n8n UI + configure Gmail OAuth credential.")
