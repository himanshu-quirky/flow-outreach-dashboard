const fetch = require('node-fetch');

const N8N_URL = process.env.N8N_API_URL || 'https://primary-production-2f66e.up.railway.app';
const N8N_KEY = process.env.N8N_API_KEY || '';

const WORKFLOWS = {
  WF01: process.env.WF01_ID,  // ICP Company Finder
  WF02: process.env.WF02_ID,  // Org Chart Mapper
  WF03: process.env.WF03_ID,  // Email Finder
  WF04: process.env.WF04_ID,  // Deep Research
  WF05: process.env.WF05_ID,  // AI Email Writer
  WF06: process.env.WF06_ID,  // Review Pipeline
  WF07: process.env.WF07_ID,  // Follow-up Sequencer
  WF08: process.env.WF08_ID,  // Response Handler
  WF09: process.env.WF09_ID,  // Domain Finder
  WF10: process.env.WF10_ID,  // Health Monitor
};

async function apiCall(path, opts = {}) {
  const url = `${N8N_URL}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'X-N8N-API-KEY': N8N_KEY,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
    timeout: 30000,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`n8n API ${res.status}: ${text}`);
  }
  return res.json();
}

async function triggerWebhook(webhookPath, payload) {
  const url = `${N8N_URL}/webhook/${webhookPath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    timeout: 30000,
  });
  return { status: res.status, ok: res.ok };
}

module.exports = {
  WORKFLOWS,

  testConnection: async () => {
    try {
      const data = await apiCall('/api/v1/workflows?limit=1');
      return { connected: true, workflows: (data.data || []).length >= 0 };
    } catch (e) {
      return { connected: false, error: e.message };
    }
  },

  getWorkflows: async () => {
    const data = await apiCall('/api/v1/workflows');
    const harveyWfs = (data.data || []).filter(w =>
      w.name.match(/^\d{2}\s*-/)
    );
    return harveyWfs.map(w => ({
      id: w.id,
      name: w.name,
      active: w.active,
      updatedAt: w.updatedAt,
    }));
  },

  getWorkflowExecutions: async (workflowId, limit = 5) => {
    try {
      const data = await apiCall(`/api/v1/executions?workflowId=${workflowId}&limit=${limit}`);
      return (data.data || []).map(e => ({
        id: e.id,
        status: e.status,
        startedAt: e.startedAt,
        stoppedAt: e.stoppedAt,
        finished: e.finished,
      }));
    } catch {
      return [];
    }
  },

  // Trigger WF01 - ICP Company Finder
  triggerProspecting: (payload) => triggerWebhook('icp-finder', payload),

  // Trigger WF02 - Org Chart Mapper
  triggerContactFinder: (payload) => triggerWebhook('org-mapper', payload),

  // Trigger WF03 - Email Finder
  triggerEmailFinder: (payload) => triggerWebhook('email-finder', payload),

  // Trigger WF04 - Deep Research
  triggerResearch: (payload) => triggerWebhook('deep-research', payload),

  // Trigger WF05 - AI Email Writer
  triggerEmailWriter: (payload) => triggerWebhook('write-email', payload),

  // Trigger WF08 - Response Handler
  triggerResponseHandler: (payload) => triggerWebhook('email-response', payload),

  // Trigger WF09 - Domain Finder (manual trigger, use API execution)
  triggerDomainFinder: async (payload) => {
    try {
      const data = await apiCall('/api/v1/executions', {
        method: 'POST',
        body: JSON.stringify({
          workflowId: WORKFLOWS.WF09,
          data: payload || {},
        }),
      });
      return { ok: true, executionId: data.id };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  activateWorkflow: async (workflowId) => {
    return apiCall(`/api/v1/workflows/${workflowId}/activate`, { method: 'POST' });
  },

  deactivateWorkflow: async (workflowId) => {
    return apiCall(`/api/v1/workflows/${workflowId}/deactivate`, { method: 'POST' });
  },
};
