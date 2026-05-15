/* ===================================================================
   TECHCO CRM — admin.js
   Supabase + Vanilla JS, no build tools
=================================================================== */

/* ===== CONFIG ===== */
const SUPABASE_URL  = 'https://egadgmckwldootwcuyav.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWRnbWNrd2xkb290d2N1eWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjcwMzUsImV4cCI6MjA5NDQ0MzAzNX0.XVIuhcVEveqsLN-xZgOSDJfua5Mbqhv6LiM8M30Q0Co';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ===== STATE ===== */
const S = {
  view:     'dashboard',
  contacts: [],
  deals:    [],
  stages:   [],
  dragDealId: null,
};

/* =================================================================
   UTILS
================================================================= */
function fmt(n) {
  if (!n && n !== 0) return '—';
  return '$' + Number(n).toLocaleString('ru-RU');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function stageById(id) {
  return S.stages.find(s => s.id === id) || { name: '—', color: '#ccc' };
}

function contactById(id) {
  return S.contacts.find(c => c.id === id);
}

/* =================================================================
   TOAST
================================================================= */
function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* =================================================================
   MODAL
================================================================= */
let _modalSubmit = null;

function openModal(title, bodyHTML, onSubmit) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modal').style.display = 'flex';
  _modalSubmit = onSubmit || null;
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('modalBody').innerHTML = '';
  _modalSubmit = null;
}

function initModal() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

/* =================================================================
   AUTH
================================================================= */
async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    showApp();
  } else {
    showLogin();
  }

  sb.auth.onAuthStateChange((event, session) => {
    if (session) showApp();
    else showLogin();
  });
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminApp').style.display = 'none';
}

async function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display = 'flex';
  await loadAll();
  initRouter();
  renderView(S.view);
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const btn   = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');

  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Входим...';

  const { error } = await sb.auth.signInWithPassword({ email, password: pass });

  if (error) {
    errEl.textContent = 'Неверный email или пароль';
    btn.disabled = false;
    btn.textContent = 'Войти →';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await sb.auth.signOut();
});

/* =================================================================
   THEME TOGGLE
================================================================= */
function initTheme() {
  const saved = localStorage.getItem('adminTheme');
  if (saved === 'dark') applyTheme('dark');

  document.getElementById('themeToggleAdmin').addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('adminTheme', isDark ? 'dark' : 'light');
    document.getElementById('themeIconAdmin').textContent = isDark ? '☾' : '☀';
  });
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark');
    document.getElementById('themeIconAdmin').textContent = '☾';
  }
}

/* =================================================================
   ROUTER
================================================================= */
const VIEW_TITLES = {
  dashboard: 'Дашборд',
  contacts:  'Контакты',
  pipeline:  'Воронка продаж',
  deals:     'Сделки',
};

const VIEW_ACTIONS = {
  contacts: () => `<button class="btn btn--primary btn--sm" id="addContactBtn">+ Контакт</button>`,
  pipeline: () => `<button class="btn btn--primary btn--sm" id="addDealBtn">+ Сделка</button>`,
  deals:    () => `<button class="btn btn--primary btn--sm" id="addDealBtn">+ Сделка</button>`,
  dashboard: () => '',
};

function navigateTo(view) {
  S.view = view;

  document.querySelectorAll('.sidebar__link').forEach(l => {
    l.classList.toggle('active', l.dataset.view === view);
  });

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');

  document.getElementById('viewTitle').textContent = VIEW_TITLES[view] || view;
  document.getElementById('topbarActions').innerHTML = (VIEW_ACTIONS[view] || (() => ''))();

  wireTopbarActions();
  renderView(view);
}

function renderView(view) {
  if (view === 'dashboard') renderDashboard();
  if (view === 'contacts')  renderContactsTable();
  if (view === 'pipeline')  renderKanban();
  if (view === 'deals')     renderDealsTable();
}

function wireTopbarActions() {
  const addContact = document.getElementById('addContactBtn');
  if (addContact) addContact.addEventListener('click', () => openContactModal(null));

  const addDeal = document.getElementById('addDealBtn');
  if (addDeal) addDeal.addEventListener('click', () => openDealModal(null, null));
}

function initRouter() {
  document.querySelectorAll('.sidebar__link[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.view);
    });
  });
}

/* =================================================================
   DATA
================================================================= */
async function loadAll() {
  await Promise.all([loadStages(), loadContacts(), loadDeals()]);
}

async function loadStages() {
  const { data, error } = await sb.from('pipeline_stages').select('*').order('ord');
  if (error) { showToast('Ошибка загрузки этапов', 'error'); return; }
  S.stages = data || [];
  populateDealStageFilter();
}

async function loadContacts() {
  const { data, error } = await sb
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { showToast('Ошибка загрузки контактов', 'error'); return; }
  S.contacts = data || [];
}

async function loadDeals() {
  const { data, error } = await sb
    .from('deals')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) { showToast('Ошибка загрузки сделок', 'error'); return; }
  S.deals = data || [];
}

function populateDealStageFilter() {
  const sel = document.getElementById('dealStageFilter');
  if (!sel) return;
  const existing = sel.innerHTML.split('<option value="">')[0];
  sel.innerHTML = '<option value="">Все этапы</option>' +
    S.stages.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
}

async function createContact(data) {
  const { error } = await sb.from('contacts').insert(data);
  if (error) throw error;
  await loadContacts();
}

async function updateContact(id, data) {
  const { error } = await sb.from('contacts').update(data).eq('id', id);
  if (error) throw error;
  await loadContacts();
}

async function deleteContact(id) {
  const { error } = await sb.from('contacts').delete().eq('id', id);
  if (error) throw error;
  await loadContacts();
  await loadDeals();
}

async function createDeal(data) {
  const { error } = await sb.from('deals').insert(data);
  if (error) throw error;
  await loadDeals();
}

async function updateDeal(id, data) {
  const { error } = await sb.from('deals').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  await loadDeals();
}

async function deleteDeal(id) {
  const { error } = await sb.from('deals').delete().eq('id', id);
  if (error) throw error;
  await loadDeals();
}

async function moveDealStage(dealId, newStageId) {
  const { error } = await sb
    .from('deals')
    .update({ stage_id: newStageId, updated_at: new Date().toISOString() })
    .eq('id', dealId);
  if (error) { showToast('Ошибка перемещения', 'error'); return false; }
  await loadDeals();
  return true;
}

/* =================================================================
   DASHBOARD
================================================================= */
function renderDashboard() {
  renderStats();
  renderNewLeads();
  renderStagesBars();
  renderDeadlines();
  renderPayments();
}

function renderStats() {
  const totalContacts = S.contacts.length;
  const activeDeals = S.deals.filter(d => [1,2,3,4].includes(d.stage_id)).length;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthRevenue = S.deals
    .filter(d => d.stage_id === 5 && d.updated_at >= monthStart)
    .reduce((sum, d) => sum + (Number(d.paid_amount) || 0), 0);

  const closed = S.deals.filter(d => d.stage_id === 5).length;
  const rejected = S.deals.filter(d => d.stage_id === 6).length;
  const conversion = (closed + rejected) > 0
    ? Math.round(closed / (closed + rejected) * 100)
    : 0;

  document.getElementById('dashStats').innerHTML = [
    { num: totalContacts, label: 'Контактов', accent: false },
    { num: activeDeals,   label: 'Активных сделок', accent: true },
    { num: '$' + monthRevenue.toLocaleString('ru-RU'), label: 'Выручка за месяц', accent: false },
    { num: conversion + '%', label: 'Конверсия', accent: false },
  ].map(c => `
    <div class="dash-stat-card">
      <div class="dash-stat-card__num" ${c.accent ? 'style="color:var(--accent);-webkit-text-stroke:1px var(--border-color)"' : ''}>${c.num}</div>
      <div class="dash-stat-card__label">${c.label}</div>
    </div>
  `).join('');
}

function renderNewLeads() {
  const leads = S.contacts
    .filter(c => c.status === 'lead')
    .slice(0, 6);

  const el = document.getElementById('newLeadsList');
  if (!leads.length) { el.innerHTML = '<div class="empty-state">Новых заявок нет</div>'; return; }

  el.innerHTML = leads.map(c => `
    <div class="dash-lead-row">
      <div>
        <div class="dash-lead-row__name">${esc(c.name)}</div>
        ${c.company ? `<div class="contact-info__item">${esc(c.company)}</div>` : ''}
      </div>
      <div class="dash-lead-row__date">${fmtDate(c.created_at)}</div>
    </div>
  `).join('');
}

function renderStagesBars() {
  const el = document.getElementById('stagesBars');
  if (!S.stages.length) { el.innerHTML = '<div class="empty-state">—</div>'; return; }

  const max = Math.max(...S.stages.map(s => S.deals.filter(d => d.stage_id === s.id).length), 1);
  el.innerHTML = S.stages.map(s => {
    const count = S.deals.filter(d => d.stage_id === s.id).length;
    const pct = Math.round(count / max * 100);
    return `
      <div class="dash-bar-row">
        <div class="dash-bar-label" title="${esc(s.name)}">${esc(s.name.split(' ')[0])}</div>
        <div class="dash-bar-track">
          <div class="dash-bar-fill" style="width:${pct}%;background:${s.color}"></div>
        </div>
        <div class="dash-bar-count">${count}</div>
      </div>
    `;
  }).join('');
}

function renderDeadlines() {
  const el = document.getElementById('upcomingDeadlines');
  const upcoming = S.deals
    .filter(d => d.deadline && ![5,6].includes(d.stage_id))
    .map(d => ({ ...d, days: daysUntil(d.deadline) }))
    .filter(d => d.days !== null && d.days <= 14)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  if (!upcoming.length) { el.innerHTML = '<div class="empty-state">Нет ближайших дедлайнов</div>'; return; }

  el.innerHTML = upcoming.map(d => {
    const cls = d.days < 0 ? 'date--urgent' : d.days <= 3 ? 'date--soon' : 'date--ok';
    const label = d.days < 0 ? `просрочено ${Math.abs(d.days)} дн.` : d.days === 0 ? 'сегодня' : `${d.days} дн.`;
    return `
      <div class="dash-deadline-row">
        <div class="dash-deadline-row__title">${esc(d.title)}</div>
        <div class="dash-deadline-row__date ${cls}">${label}</div>
      </div>
    `;
  }).join('');
}

function renderPayments() {
  const el = document.getElementById('paymentStatus');
  const active = S.deals.filter(d => ![6].includes(d.stage_id));
  const rows = [
    { key: 'unpaid',  label: 'Не оплачено' },
    { key: 'partial', label: 'Частично' },
    { key: 'paid',    label: 'Оплачено' },
  ];

  el.innerHTML = rows.map(r => {
    const total = active.filter(d => d.payment_status === r.key)
      .reduce((s, d) => s + (Number(d.amount) || 0), 0);
    return `
      <div class="dash-pay-row">
        <div class="dash-pay-label"><span class="badge badge--${r.key}">${r.label}</span></div>
        <div class="dash-pay-amount">${total > 0 ? fmt(total) : '—'}</div>
      </div>
    `;
  }).join('');
}

/* =================================================================
   CONTACTS
================================================================= */
function renderContactsTable() {
  const search  = (document.getElementById('contactSearch')?.value || '').toLowerCase();
  const status  = document.getElementById('contactStatusFilter')?.value || '';
  const source  = document.getElementById('contactSourceFilter')?.value || '';

  let list = S.contacts;
  if (search) list = list.filter(c =>
    (c.name || '').toLowerCase().includes(search) ||
    (c.company || '').toLowerCase().includes(search)
  );
  if (status) list = list.filter(c => c.status === status);
  if (source) list = list.filter(c => c.source === source);

  const tbody = document.getElementById('contactsTbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Контактов не найдено</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(c => {
    const contactLine = [c.email, c.phone, c.telegram].filter(Boolean).join(' · ') || c.contact_pref || '—';
    return `
      <tr>
        <td><strong style="font-family:var(--font-head)">${esc(c.name)}</strong></td>
        <td>${esc(c.company) || '<span style="opacity:.4">—</span>'}</td>
        <td><span style="font-size:12px;color:var(--text-muted)">${esc(contactLine)}</span></td>
        <td><span class="badge badge--${c.status}">${statusLabel(c.status)}</span></td>
        <td><span class="badge badge--${c.source}">${sourceLabel(c.source)}</span></td>
        <td style="font-size:12px;color:var(--text-muted)">${fmtDate(c.created_at)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn--sm btn--outline" onclick="openContactModal('${c.id}')">✏</button>
            <button class="btn btn--sm btn--danger"  onclick="deleteContactConfirm('${c.id}','${esc(c.name)}')">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('contactSearch')?.addEventListener('input', renderContactsTable, { once: true });
  document.getElementById('contactStatusFilter')?.addEventListener('change', renderContactsTable, { once: true });
  document.getElementById('contactSourceFilter')?.addEventListener('change', renderContactsTable, { once: true });
}

function wireContactFilters() {
  ['contactSearch','contactStatusFilter','contactSourceFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderContactsTable);
    if (el) el.addEventListener('change', renderContactsTable);
  });
}

function statusLabel(s) {
  return { lead: 'Лид', client: 'Клиент', archived: 'Архив' }[s] || s;
}

function sourceLabel(s) {
  return { contact_form: 'Форма', manual: 'Вручную', referral: 'Реферал', other: 'Другое' }[s] || s;
}

function openContactModal(id) {
  const c = id ? S.contacts.find(x => x.id === id) : null;
  const title = c ? 'Редактировать контакт' : 'Новый контакт';

  const body = buildContactForm(c);
  openModal(title, body, null);

  document.getElementById('contactFormModal').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name:         fd.get('name'),
      company:      fd.get('company') || null,
      email:        fd.get('email') || null,
      phone:        fd.get('phone') || null,
      telegram:     fd.get('telegram') || null,
      description:  fd.get('description') || null,
      contact_pref: fd.get('contact_pref') || null,
      notes:        fd.get('notes') || null,
      status:       fd.get('status'),
      source:       fd.get('source'),
    };

    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Сохраняем...';

    try {
      if (c) {
        await updateContact(c.id, data);
        showToast('Контакт обновлён', 'success');
      } else {
        await createContact({ ...data, source: data.source || 'manual' });
        showToast('Контакт добавлен', 'success');
      }
      closeModal();
      renderContactsTable();
      if (S.view === 'dashboard') renderDashboard();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Сохранить';
    }
  });
}

function buildContactForm(c) {
  return `
    <form id="contactFormModal">
      <div class="form-row">
        <div class="form-group">
          <label>Имя *</label>
          <input name="name" value="${esc(c?.name || '')}" required placeholder="Иван Иванов">
        </div>
        <div class="form-group">
          <label>Компания</label>
          <input name="company" value="${esc(c?.company || '')}" placeholder="ООО Ромашка">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" value="${esc(c?.email || '')}" placeholder="ivan@example.com">
        </div>
        <div class="form-group">
          <label>Телефон</label>
          <input name="phone" value="${esc(c?.phone || '')}" placeholder="+7 900 000-00-00">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Telegram</label>
          <input name="telegram" value="${esc(c?.telegram || '')}" placeholder="@username">
        </div>
        <div class="form-group">
          <label>Предпочт. контакт</label>
          <select name="contact_pref">
            <option value="">—</option>
            ${['telegram','whatsapp','email','phone'].map(v =>
              `<option value="${v}" ${c?.contact_pref===v?'selected':''}>${v}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Описание проекта</label>
        <textarea name="description" placeholder="Что нужно сделать...">${esc(c?.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label>Заметки</label>
        <textarea name="notes" placeholder="Внутренние заметки...">${esc(c?.notes || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Статус</label>
          <select name="status">
            <option value="lead"     ${(!c || c.status==='lead')    ?'selected':''}>Лид</option>
            <option value="client"   ${c?.status==='client'         ?'selected':''}>Клиент</option>
            <option value="archived" ${c?.status==='archived'       ?'selected':''}>Архив</option>
          </select>
        </div>
        <div class="form-group">
          <label>Источник</label>
          <select name="source">
            <option value="manual"       ${(!c || c.source==='manual')       ?'selected':''}>Вручную</option>
            <option value="contact_form" ${c?.source==='contact_form'        ?'selected':''}>Форма</option>
            <option value="referral"     ${c?.source==='referral'            ?'selected':''}>Реферал</option>
            <option value="other"        ${c?.source==='other'               ?'selected':''}>Другое</option>
          </select>
        </div>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn--outline" onclick="closeModal()">Отмена</button>
        <button type="submit" class="btn btn--primary">Сохранить</button>
      </div>
    </form>
  `;
}

function deleteContactConfirm(id, name) {
  openModal('Удалить контакт', `
    <p class="confirm-text">Удалить <strong>${esc(name)}</strong>?</p>
    <p class="confirm-sub">Все связанные сделки тоже будут удалены. Это действие необратимо.</p>
    <div class="modal__footer">
      <button class="btn btn--outline" onclick="closeModal()">Отмена</button>
      <button class="btn btn--danger" id="confirmDeleteContact">Удалить</button>
    </div>
  `);
  document.getElementById('confirmDeleteContact').addEventListener('click', async () => {
    try {
      await deleteContact(id);
      showToast('Контакт удалён', 'success');
      closeModal();
      renderContactsTable();
      if (S.view === 'dashboard') renderDashboard();
      if (S.view === 'pipeline') renderKanban();
      if (S.view === 'deals') renderDealsTable();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

/* =================================================================
   PIPELINE (KANBAN)
================================================================= */
function renderKanban() {
  const board = document.getElementById('kanbanBoard');
  if (!S.stages.length) {
    board.innerHTML = '<div class="empty-state" style="padding:40px">Загрузка...</div>';
    return;
  }

  board.innerHTML = S.stages.map(stage => {
    const stageDeals = S.deals.filter(d => d.stage_id === stage.id);
    return `
      <div class="kanban-col" data-stage-id="${stage.id}">
        <div class="kanban-col__header">
          <span class="kanban-col__badge" style="background:${stage.color}">${esc(stage.name)}</span>
          <span class="kanban-col__count">${stageDeals.length}</span>
        </div>
        <div class="kanban-col__cards" id="stage-cards-${stage.id}"
          data-stage="${stage.id}"
          ondragover="handleDragOver(event)"
          ondrop="handleDrop(event)"
          ondragleave="handleDragLeave(event)">
          ${stageDeals.map(d => buildKanbanCard(d)).join('')}
        </div>
        <button class="btn btn--outline kanban-col__add" data-stage="${stage.id}" onclick="openDealModal(null, ${stage.id})">
          + Сделка
        </button>
      </div>
    `;
  }).join('');
}

function buildKanbanCard(deal) {
  const contact = contactById(deal.contact_id);
  const clientName = contact ? esc(contact.name) : '—';
  const days = daysUntil(deal.deadline);
  const deadlineCls = days !== null ? (days < 0 ? 'date--urgent' : days <= 3 ? 'date--soon' : 'date--ok') : '';

  return `
    <div class="kanban-card"
      draggable="true"
      data-deal-id="${deal.id}"
      ondragstart="handleDragStart(event)"
      ondragend="handleDragEnd(event)">
      <div class="kanban-card__title">${esc(deal.title)}</div>
      <div class="kanban-card__client">${clientName}</div>
      <div class="kanban-card__footer">
        <span class="kanban-card__amount">${deal.amount ? fmt(deal.amount) : '—'}</span>
        ${deal.deadline ? `<span class="kanban-card__deadline ${deadlineCls}">${fmtDate(deal.deadline)}</span>` : ''}
      </div>
      <div class="kanban-card__actions">
        <button class="btn btn--sm btn--outline" onclick="openDealModal('${deal.id}', null); event.stopPropagation()">✏</button>
        <button class="btn btn--sm btn--danger"  onclick="deleteDealConfirm('${deal.id}','${esc(deal.title)}'); event.stopPropagation()">✕</button>
      </div>
    </div>
  `;
}

/* Drag & Drop */
function handleDragStart(e) {
  S.dragDealId = e.currentTarget.dataset.dealId;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.kanban-col--over').forEach(el => el.classList.remove('kanban-col--over'));
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('kanban-col--over');
}

function handleDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    e.currentTarget.classList.remove('kanban-col--over');
  }
}

async function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('kanban-col--over');
  const newStageId = parseInt(e.currentTarget.dataset.stage);
  if (!S.dragDealId || !newStageId) return;

  const deal = S.deals.find(d => d.id === S.dragDealId);
  if (!deal || deal.stage_id === newStageId) return;

  const ok = await moveDealStage(S.dragDealId, newStageId);
  if (ok) {
    renderKanban();
    if (S.view === 'dashboard') renderDashboard();
  }
  S.dragDealId = null;
}

/* =================================================================
   DEALS
================================================================= */
function renderDealsTable() {
  const search = (document.getElementById('dealSearch')?.value || '').toLowerCase();
  const stage  = document.getElementById('dealStageFilter')?.value || '';
  const pay    = document.getElementById('dealPayFilter')?.value || '';

  let list = S.deals;
  if (search) list = list.filter(d => (d.title || '').toLowerCase().includes(search));
  if (stage)  list = list.filter(d => String(d.stage_id) === stage);
  if (pay)    list = list.filter(d => d.payment_status === pay);

  const tbody = document.getElementById('dealsTbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Сделок не найдено</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(d => {
    const contact = contactById(d.contact_id);
    const stage   = stageById(d.stage_id);
    return `
      <tr>
        <td><strong style="font-family:var(--font-head)">${esc(d.title)}</strong></td>
        <td style="font-size:13px">${contact ? esc(contact.name) : '<span style="opacity:.4">—</span>'}</td>
        <td>
          <span class="stage-label">
            <span class="stage-dot" style="background:${stage.color}"></span>
            ${esc(stage.name)}
          </span>
        </td>
        <td style="font-family:var(--font-head);font-weight:700">${d.amount ? fmt(d.amount) : '—'}</td>
        <td><span class="badge badge--${d.payment_status}">${payLabel(d.payment_status)}</span></td>
        <td style="font-size:12px;color:var(--text-muted)">${fmtDate(d.deadline)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn--sm btn--outline" onclick="openDealModal('${d.id}', null)">✏</button>
            <button class="btn btn--sm btn--danger"  onclick="deleteDealConfirm('${d.id}','${esc(d.title)}')">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  wireDealFilters();
}

function wireDealFilters() {
  ['dealSearch','dealStageFilter','dealPayFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._wired) {
      el._wired = true;
      el.addEventListener('input', renderDealsTable);
      el.addEventListener('change', renderDealsTable);
    }
  });
}

function payLabel(s) {
  return { unpaid: 'Не оплачено', partial: 'Частично', paid: 'Оплачено' }[s] || s;
}

function openDealModal(id, defaultStageId) {
  const d = id ? S.deals.find(x => x.id === id) : null;
  const title = d ? 'Редактировать сделку' : 'Новая сделка';

  openModal(title, buildDealForm(d, defaultStageId));

  document.getElementById('dealFormModal').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      contact_id:     fd.get('contact_id') || null,
      stage_id:       parseInt(fd.get('stage_id')),
      title:          fd.get('title'),
      amount:         fd.get('amount') ? parseFloat(fd.get('amount')) : null,
      currency:       fd.get('currency') || 'USD',
      payment_status: fd.get('payment_status'),
      paid_amount:    fd.get('paid_amount') ? parseFloat(fd.get('paid_amount')) : 0,
      deadline:       fd.get('deadline') || null,
      notes:          fd.get('notes') || null,
    };

    if (!data.stage_id) { showToast('Выберите этап', 'error'); return; }

    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Сохраняем...';

    try {
      if (d) {
        await updateDeal(d.id, data);
        showToast('Сделка обновлена', 'success');
      } else {
        await createDeal(data);
        showToast('Сделка создана', 'success');
      }
      closeModal();
      if (S.view === 'pipeline') renderKanban();
      if (S.view === 'deals')    renderDealsTable();
      if (S.view === 'dashboard') renderDashboard();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Сохранить';
    }
  });
}

function buildDealForm(d, defaultStageId) {
  const stageOpts = S.stages.map(s => {
    const sel = d ? d.stage_id === s.id : s.id === (defaultStageId || 1);
    return `<option value="${s.id}" ${sel?'selected':''}>${esc(s.name)}</option>`;
  }).join('');

  const contactOpts = '<option value="">— без контакта —</option>' +
    S.contacts.map(c =>
      `<option value="${c.id}" ${d?.contact_id===c.id?'selected':''}>${esc(c.name)}${c.company?' ('+esc(c.company)+')':''}</option>`
    ).join('');

  return `
    <form id="dealFormModal">
      <div class="form-group">
        <label>Название сделки *</label>
        <input name="title" value="${esc(d?.title || '')}" required placeholder="CRM для e-commerce">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Этап *</label>
          <select name="stage_id">${stageOpts}</select>
        </div>
        <div class="form-group">
          <label>Контакт</label>
          <select name="contact_id">${contactOpts}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Сумма</label>
          <input type="number" name="amount" value="${d?.amount || ''}" placeholder="1500" min="0" step="0.01">
        </div>
        <div class="form-group">
          <label>Валюта</label>
          <select name="currency">
            <option value="USD" ${(!d||d.currency==='USD')?'selected':''}>USD</option>
            <option value="EUR" ${d?.currency==='EUR'?'selected':''}>EUR</option>
            <option value="RUB" ${d?.currency==='RUB'?'selected':''}>RUB</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Статус оплаты</label>
          <select name="payment_status">
            <option value="unpaid"  ${(!d||d.payment_status==='unpaid') ?'selected':''}>Не оплачено</option>
            <option value="partial" ${d?.payment_status==='partial'     ?'selected':''}>Частично</option>
            <option value="paid"    ${d?.payment_status==='paid'        ?'selected':''}>Оплачено</option>
          </select>
        </div>
        <div class="form-group">
          <label>Оплачено</label>
          <input type="number" name="paid_amount" value="${d?.paid_amount || ''}" placeholder="0" min="0" step="0.01">
        </div>
      </div>
      <div class="form-group">
        <label>Дедлайн</label>
        <input type="date" name="deadline" value="${d?.deadline || ''}">
      </div>
      <div class="form-group">
        <label>Заметки</label>
        <textarea name="notes" placeholder="Детали сделки...">${esc(d?.notes || '')}</textarea>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn--outline" onclick="closeModal()">Отмена</button>
        <button type="submit" class="btn btn--primary">Сохранить</button>
      </div>
    </form>
  `;
}

function deleteDealConfirm(id, title) {
  openModal('Удалить сделку', `
    <p class="confirm-text">Удалить сделку <strong>${esc(title)}</strong>?</p>
    <p class="confirm-sub">Это действие необратимо.</p>
    <div class="modal__footer">
      <button class="btn btn--outline" onclick="closeModal()">Отмена</button>
      <button class="btn btn--danger" id="confirmDeleteDeal">Удалить</button>
    </div>
  `);
  document.getElementById('confirmDeleteDeal').addEventListener('click', async () => {
    try {
      await deleteDeal(id);
      showToast('Сделка удалена', 'success');
      closeModal();
      if (S.view === 'pipeline') renderKanban();
      if (S.view === 'deals')    renderDealsTable();
      if (S.view === 'dashboard') renderDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

/* =================================================================
   INIT
================================================================= */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initModal();
  initAuth();
  wireContactFilters();
});
