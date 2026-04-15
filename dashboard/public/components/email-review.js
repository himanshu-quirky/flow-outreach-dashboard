let selectedEmails = new Set();

async function renderEmailReview() {
  const content = $('#content');
  const emails = await api('/api/emails/queue') || [];
  selectedEmails.clear();

  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <h2 style="font-size:18px;font-weight:600;margin-bottom:4px">Email Review</h2>
        <p style="font-size:13px;color:var(--text-3)">${emails.length} email${emails.length !== 1 ? 's' : ''} pending approval</p>
      </div>
      ${emails.length > 0 ? `
        <label class="checkbox-wrap" style="font-size:13px;color:var(--text-2)">
          <input type="checkbox" onchange="toggleAllEmails(this.checked, ${JSON.stringify(emails.map(e=>e.id))})">
          Select All
        </label>
      ` : ''}
    </div>

    ${emails.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">&#9993;</div>
        <div class="empty-state-text">No emails pending review. Run Research & Write on a campaign to generate drafts.</div>
      </div>
    ` : `
      <div id="email-list">
        ${emails.map(e => renderEmailCard(e)).join('')}
      </div>

      <div class="bulk-bar" id="bulk-bar" style="display:none">
        <span style="font-size:13px;color:var(--text-2)" id="selected-count">0 selected</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-success btn-sm" onclick="bulkAction('approve')">Approve Selected</button>
          <button class="btn btn-danger btn-sm" onclick="bulkAction('reject')">Reject Selected</button>
        </div>
      </div>
    `}
  `;

  updateBadge('email-badge', emails.length);
}

function renderEmailCard(e) {
  return `
    <div class="email-card" id="email-${e.id}">
      <div class="email-card-header">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <input type="checkbox" style="margin-top:3px;accent-color:var(--accent)" onchange="toggleEmail(${e.id}, this.checked)" ${selectedEmails.has(e.id) ? 'checked' : ''}>
          <div>
            <div class="email-recipient">${esc(e.contact_name || 'Unknown')}</div>
            <div class="email-recipient-sub">${esc(e.company_name || '')} &middot; ${esc(e.contact_email || '')}</div>
          </div>
        </div>
        <span class="pill pill-draft">Seq ${e.sequence_number || 1}</span>
      </div>

      <div class="email-subject" id="subj-${e.id}" onclick="editSubject(${e.id})">${esc(e.subject || '(no subject)')}</div>
      <div class="email-body" id="body-${e.id}" onclick="editBody(${e.id})">${esc(e.body || '')}</div>

      <div class="email-actions">
        <button class="btn btn-success btn-sm" onclick="approveOne(${e.id})">Approve</button>
        <button class="btn btn-danger btn-sm" onclick="rejectOne(${e.id})">Reject</button>
        <button class="btn btn-ghost btn-sm" onclick="editEmail(${e.id})">Edit</button>
      </div>
    </div>
  `;
}

function toggleEmail(id, checked) {
  if (checked) selectedEmails.add(id); else selectedEmails.delete(id);
  updateBulkBar();
}

function toggleAllEmails(checked, ids) {
  ids.forEach(id => { if (checked) selectedEmails.add(id); else selectedEmails.delete(id); });
  document.querySelectorAll('.email-card input[type="checkbox"]').forEach(cb => cb.checked = checked);
  updateBulkBar();
}

function updateBulkBar() {
  const bar = document.getElementById('bulk-bar');
  const count = document.getElementById('selected-count');
  if (!bar) return;
  if (selectedEmails.size > 0) {
    bar.style.display = 'flex';
    count.textContent = `${selectedEmails.size} selected`;
  } else {
    bar.style.display = 'none';
  }
}

async function bulkAction(action) {
  const ids = Array.from(selectedEmails);
  if (ids.length === 0) return;
  const result = await api(`/api/emails/${action}`, { method: 'POST', body: { ids } });
  if (result?.ok) {
    toast(`${ids.length} email(s) ${action === 'approve' ? 'approved' : 'rejected'}`, 'success');
    renderEmailReview();
  }
}

async function approveOne(id) {
  const result = await api('/api/emails/approve', { method: 'POST', body: { ids: [id] } });
  if (result?.ok) {
    toast('Email approved', 'success');
    document.getElementById(`email-${id}`)?.remove();
  }
}

async function rejectOne(id) {
  const result = await api('/api/emails/reject', { method: 'POST', body: { ids: [id] } });
  if (result?.ok) {
    toast('Email rejected', 'success');
    document.getElementById(`email-${id}`)?.remove();
  }
}

function editEmail(id) {
  const card = document.getElementById(`email-${id}`);
  if (!card) return;
  const subjEl = document.getElementById(`subj-${id}`);
  const bodyEl = document.getElementById(`body-${id}`);

  const currentSubj = subjEl.textContent;
  const currentBody = bodyEl.textContent;

  subjEl.innerHTML = `<input class="form-input" value="${esc(currentSubj)}" id="edit-subj-${id}" style="font-weight:600;font-size:13px">`;
  bodyEl.innerHTML = `<textarea class="form-textarea" id="edit-body-${id}" rows="6">${esc(currentBody)}</textarea>`;

  const actions = card.querySelector('.email-actions');
  actions.innerHTML = `
    <button class="btn btn-primary btn-sm" onclick="saveEdit(${id})">Save</button>
    <button class="btn btn-outline btn-sm" onclick="renderEmailReview()">Cancel</button>
  `;
}

async function saveEdit(id) {
  const subject = document.getElementById(`edit-subj-${id}`)?.value;
  const body = document.getElementById(`edit-body-${id}`)?.value;
  const result = await api(`/api/emails/${id}`, { method: 'PUT', body: { subject, body } });
  if (result?.ok) {
    toast('Email updated', 'success');
    renderEmailReview();
  }
}
