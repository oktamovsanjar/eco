import { api } from './src/api.js';

const app = document.getElementById('app');
let user = null;
let currentTab = 'dashboard';

const STATUS_CONFIG = {
  'kutilmoqda': { label: 'Kutilmoqda', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  'tekshirilmoqda': { label: "Ko'rib chiqilmoqda", color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  'tasdiqlangan': { label: 'Tasdiqlangan', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  'hal_qilinmoqda': { label: 'Jarayonda', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  'hal_qilindi': { label: 'Hal qilingan', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  'rad_etilgan': { label: 'Rad etilgan', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  'yopilgan': { label: 'Yopilgan', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
};

const CATEGORY_CONFIG = {
  'ekologiya': '🌿 Ekologiya', 'yol_qurilish': '🛣️ Yo\'l qurilishi',
  'suv_muammosi': '💧 Suv muammosi', 'chiqindi': '🗑️ Chiqindi',
  'havo_ifloslanishi': '💨 Havo', 'shovqin': '🔊 Shovqin',
  'daraxt_kesish': '🌳 Daraxt kesish', 'qurilish_buzilishi': '🏗️ Qurilish', 'boshqa': '📋 Boshqa',
};

const ROLE_LABELS = { admin: '👑 Super Admin', moderator: '🛡️ Moderator', organization: '🏢 Tashkilot', user: '👤 Foydalanuvchi' };

function statusBadge(s) {
  const c = STATUS_CONFIG[s] || { label: s, color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' };
  return `<span style="padding:4px 10px;border-radius:8px;font-size:0.75rem;font-weight:600;background:${c.bg};color:${c.color};border:1px solid ${c.color}30;">${c.label}</span>`;
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'; }

function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'admin-toast';
  t.style.cssText = `position:fixed;top:20px;right:20px;padding:14px 24px;border-radius:12px;color:white;font-weight:600;z-index:9999;animation:fadeIn 0.3s;font-size:0.9rem;background:${type === 'success' ? '#10b981' : '#ef4444'};box-shadow:0 8px 30px rgba(0,0,0,0.3);`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ============ AUTH CHECK ============
async function init() {
  const token = localStorage.getItem('token');
  if (!token) { renderLogin(); return; }
  try {
    user = await api.getMe();
    if (user.role !== 'admin' && user.role !== 'moderator' && user.role !== 'organization') {
      localStorage.removeItem('token'); renderLogin('⛔ Sizda ruxsat yo\'q!'); return;
    }
    renderPanel();
  } catch (e) { localStorage.removeItem('token'); renderLogin(); }
}

// ============ LOGIN ============
function renderLogin(error = '') {
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%);">
      <div class="glass premium-shadow" style="padding:40px;width:100%;max-width:420px;border-radius:24px;">
        <div style="text-align:center;margin-bottom:30px;">
          <div style="width:70px;height:70px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:20px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(79,70,229,0.4);font-size:1.8rem;">🛡️</div>
          <h2 style="font-size:1.5rem;margin-bottom:6px;">Boshqaruv Paneli</h2>
          <p style="color:#94a3b8;font-size:0.85rem;">Faqat vakolatli shaxslar uchun</p>
        </div>
        ${error ? `<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;padding:10px;border-radius:10px;margin-bottom:16px;text-align:center;font-size:0.85rem;">${error}</div>` : ''}
        <form id="login-form">
          <div style="margin-bottom:16px;"><label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#94a3b8;">Login</label>
            <input type="text" id="email" required placeholder="adminos" style="width:100%;padding:12px 16px;border-radius:12px;background:rgba(15,23,42,0.6);color:white;border:1px solid rgba(148,163,184,0.2);outline:none;font-size:0.95rem;box-sizing:border-box;"></div>
          <div style="margin-bottom:20px;"><label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#94a3b8;">Parol</label>
            <input type="password" id="password" required placeholder="••••••••" style="width:100%;padding:12px 16px;border-radius:12px;background:rgba(15,23,42,0.6);color:white;border:1px solid rgba(148,163,184,0.2);outline:none;font-size:0.95rem;box-sizing:border-box;"></div>
          <button type="submit" id="login-btn" style="width:100%;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:1rem;font-weight:600;cursor:pointer;">Kirish</button>
        </form>
      </div>
    </div>`;
  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    btn.disabled = true; btn.textContent = 'Tekshirilmoqda...';
    try {
      await api.login(document.getElementById('email').value, document.getElementById('password').value);
      init();
    } catch (err) { renderLogin(err.message || 'Login yoki parol noto\'g\'ri'); }
  };
}

// ============ MAIN PANEL ============
function renderPanel() {
  const isAdmin = user.role === 'admin';
  const tabs = [
    { id: 'dashboard', icon: '📊', label: 'Umumiy' },
    { id: 'reports', icon: '📋', label: 'Murojaatlar' },
    ...(isAdmin ? [{ id: 'moderators', icon: '🛡️', label: 'Moderatorlar' }] : []),
    ...(isAdmin ? [{ id: 'users', icon: '👥', label: 'Foydalanuvchilar' }] : []),
  ];

  app.innerHTML = `
    <div style="display:flex;min-height:100vh;background:#0f172a;">
      <aside style="width:260px;background:rgba(15,23,42,0.95);border-right:1px solid rgba(148,163,184,0.1);padding:24px 16px;display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:30px;padding:0 8px;">
          <span style="font-size:1.5rem;">🛡️</span>
          <span style="font-size:1.2rem;font-weight:700;color:white;">EcoAdmin</span>
        </div>
        <nav style="flex:1;display:flex;flex-direction:column;gap:4px;" id="sidebar-nav">
          ${tabs.map(t => `<a href="#" data-tab="${t.id}" class="sidebar-tab ${currentTab === t.id ? 'active' : ''}" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;text-decoration:none;color:${currentTab === t.id ? 'white' : '#94a3b8'};background:${currentTab === t.id ? 'rgba(79,70,229,0.2)' : 'transparent'};font-weight:${currentTab === t.id ? '600' : '400'};transition:all 0.2s;font-size:0.9rem;">
            <span style="font-size:1.1rem;">${t.icon}</span>${t.label}
          </a>`).join('')}
        </nav>
        <div style="border-top:1px solid rgba(148,163,184,0.1);padding-top:16px;">
          <div style="padding:10px 14px;border-radius:12px;background:rgba(79,70,229,0.08);margin-bottom:10px;">
            <div style="font-weight:600;color:white;font-size:0.85rem;">${user.full_name}</div>
            <div style="font-size:0.75rem;color:#818cf8;">${ROLE_LABELS[user.role] || user.role}</div>
          </div>
          <a href="#" id="logout-btn" style="display:flex;align-items:center;gap:8px;padding:10px 14px;color:#ef4444;text-decoration:none;font-size:0.85rem;border-radius:10px;">🚪 Chiqish</a>
        </div>
      </aside>
      <main style="flex:1;margin-left:260px;padding:30px;overflow-y:auto;" id="main-content"></main>
    </div>`;

  document.querySelectorAll('.sidebar-tab').forEach(el => {
    el.onclick = (e) => { e.preventDefault(); currentTab = el.dataset.tab; renderPanel(); };
  });
  document.getElementById('logout-btn').onclick = (e) => { e.preventDefault(); localStorage.removeItem('token'); user = null; renderLogin(); };

  const main = document.getElementById('main-content');
  if (currentTab === 'dashboard') renderDashboard(main);
  else if (currentTab === 'reports') renderReports(main);
  else if (currentTab === 'moderators') renderModerators(main);
  else if (currentTab === 'users') renderUsers(main);
}

// ============ DASHBOARD ============
async function renderDashboard(container) {
  let stats = {};
  try { stats = await api.getStats(); } catch (e) { }
  const reports = await api.getReports({ limit: 5 }).catch(() => []);

  container.innerHTML = `
    <h2 style="font-size:1.6rem;font-weight:700;margin-bottom:24px;">📊 Umumiy ko'rinish</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:30px;">
      ${[
      { label: 'Jami murojaatlar', val: stats.total_reports || 0, color: '#4f46e5', icon: '📝' },
      { label: 'Kutilmoqda', val: stats.pending || 0, color: '#f59e0b', icon: '⏳' },
      { label: 'Hal qilingan', val: stats.resolved || 0, color: '#10b981', icon: '✅' },
      { label: 'Rad etilgan', val: stats.rejected || 0, color: '#ef4444', icon: '❌' },
    ].map(s => `
        <div class="glass" style="padding:20px;border-radius:16px;border-left:4px solid ${s.color};">
          <div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:0.8rem;color:#94a3b8;">${s.label}</span><span style="font-size:1.3rem;">${s.icon}</span></div>
          <div style="font-size:2rem;font-weight:800;color:${s.color};margin-top:8px;">${s.val}</div>
        </div>`).join('')}
    </div>
    <div class="glass" style="padding:20px;border-radius:16px;">
      <h3 style="margin-bottom:16px;">So'nggi murojaatlar</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="color:#94a3b8;font-size:0.8rem;text-align:left;">
          <th style="padding:10px;">ID</th><th>Sarlavha</th><th>Kategoriya</th><th>Status</th><th>Sana</th>
        </tr></thead>
        <tbody>${reports.map(r => `
          <tr style="border-top:1px solid rgba(148,163,184,0.1);">
            <td style="padding:10px;color:#818cf8;font-weight:600;">#${r.id}</td>
            <td style="font-weight:500;">${r.title}</td>
            <td style="font-size:0.8rem;">${CATEGORY_CONFIG[r.category] || r.category}</td>
            <td>${statusBadge(r.status)}</td>
            <td style="font-size:0.8rem;color:#94a3b8;">${fmtDate(r.created_at)}</td>
          </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

// ============ REPORTS (Murojaatlar) ============
async function renderReports(container) {
  container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">⏳ Yuklanmoqda...</div>';
  const reports = await api.getReports({ limit: 50 }).catch(() => []);

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h2 style="font-size:1.6rem;font-weight:700;">📋 Barcha murojaatlar <span style="font-size:0.9rem;color:#94a3b8;">(${reports.length})</span></h2>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;" id="reports-list">
      ${reports.length === 0 ? '<div class="glass" style="padding:40px;text-align:center;color:#94a3b8;border-radius:16px;">Hozircha murojaatlar yo\'q</div>' :
      reports.map(r => `
        <div class="glass" style="padding:16px;border-radius:14px;cursor:pointer;transition:all 0.2s;" onclick="window._viewReport(${r.id})" onmouseover="this.style.borderColor='rgba(79,70,229,0.4)'" onmouseout="this.style.borderColor='rgba(148,163,184,0.1)'">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
                <span style="color:#818cf8;font-weight:700;">#${r.id}</span>
                ${statusBadge(r.status)}
                <span style="font-size:0.75rem;color:#94a3b8;">${CATEGORY_CONFIG[r.category] || r.category}</span>
              </div>
              <div style="font-weight:600;font-size:1rem;">${r.title}</div>
              <div style="font-size:0.8rem;color:#94a3b8;margin-top:4px;">${r.address || ''} · ${fmtDate(r.created_at)}</div>
            </div>
            <div style="display:flex;gap:12px;font-size:0.75rem;color:#94a3b8;">
              <span>👍 ${r.upvotes || 0}</span><span>👁 ${r.views_count || 0}</span><span>💬 ${r.comments_count || 0}</span>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}

// ============ REPORT DETAIL (Modal) ============
window._viewReport = async (id) => {
  try {
    const r = await api.request(`/reports/${id}`);
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div class="glass premium-shadow" style="max-width:650px;width:100%;max-height:90vh;overflow-y:auto;padding:28px;border-radius:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h2 style="font-size:1.2rem;">#${r.id} — ${r.title}</h2>
          <button onclick="this.closest('div[style]').parentElement.remove()" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:1rem;">✕</button>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
          ${statusBadge(r.status)}
          <span style="padding:4px 10px;border-radius:8px;font-size:0.75rem;background:rgba(148,163,184,0.1);color:#94a3b8;">${CATEGORY_CONFIG[r.category] || r.category}</span>
        </div>
        ${r.images?.length ? r.images.map(img => `<img src="${img.image_url}" style="width:100%;border-radius:12px;margin-bottom:12px;max-height:300px;object-fit:cover;">`).join('') : ''}
        <div style="padding:16px;background:rgba(15,23,42,0.5);border-radius:14px;margin-bottom:16px;">
          <p style="color:#cbd5e1;line-height:1.7;font-size:0.9rem;">${r.description}</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;font-size:0.8rem;">
          <div class="glass" style="padding:10px;">📍 ${r.address || 'Noma\'lum'}</div>
          <div class="glass" style="padding:10px;">👤 ${r.author_name || 'Noma\'lum'}</div>
        </div>
        ${r.moderator_comment ? `<div style="padding:14px;background:rgba(79,70,229,0.08);border:1px solid rgba(79,70,229,0.2);border-radius:12px;margin-bottom:14px;"><div style="font-size:0.75rem;color:#818cf8;margin-bottom:4px;font-weight:600;">Moderator izohi:</div><p style="font-size:0.85rem;color:#94a3b8;">${r.moderator_comment}</p></div>` : ''}
        ${r.resolution_description ? `<div style="padding:14px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;margin-bottom:14px;"><div style="font-size:0.75rem;color:#10b981;margin-bottom:4px;font-weight:600;">Yechim:</div><p style="font-size:0.85rem;color:#94a3b8;">${r.resolution_description}</p></div>` : ''}
        ${r.status === 'kutilmoqda' || r.status === 'tekshirilmoqda' ? `
        <div style="border-top:1px solid rgba(148,163,184,0.1);padding-top:16px;margin-top:16px;">
          <h4 style="margin-bottom:12px;font-size:0.9rem;">⚡ Moderator amallar</h4>
          <div style="margin-bottom:10px;"><textarea id="mod-comment" placeholder="Izoh yozing..." rows="2" style="width:100%;padding:10px;border-radius:10px;background:rgba(15,23,42,0.6);color:white;border:1px solid rgba(148,163,184,0.2);resize:none;font-size:0.85rem;box-sizing:border-box;"></textarea></div>
          <div style="display:flex;gap:8px;">
            <button onclick="window._verifyReport(${r.id},'tasdiqlangan')" style="flex:1;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);color:white;cursor:pointer;font-weight:600;">✅ Tasdiqlash</button>
            <button onclick="window._verifyReport(${r.id},'rad_etilgan')" style="flex:1;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;cursor:pointer;font-weight:600;">❌ Rad etish</button>
          </div>
        </div>` : ''}
        ${r.status === 'tasdiqlangan' || r.status === 'hal_qilinmoqda' ? `
        <div style="border-top:1px solid rgba(148,163,184,0.1);padding-top:16px;margin-top:16px;">
          <h4 style="margin-bottom:12px;font-size:0.9rem;">🔧 Hal qilish</h4>
          <textarea id="resolve-desc" placeholder="Yechim tavsifi..." rows="2" style="width:100%;padding:10px;border-radius:10px;background:rgba(15,23,42,0.6);color:white;border:1px solid rgba(148,163,184,0.2);resize:none;font-size:0.85rem;box-sizing:border-box;margin-bottom:10px;"></textarea>
          <button onclick="window._resolveReport(${r.id})" style="width:100%;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;cursor:pointer;font-weight:600;">🏁 Hal qilindi</button>
        </div>` : ''}
        <div style="border-top:1px solid rgba(148,163,184,0.1);padding-top:16px;margin-top:16px;">
          <button onclick="window._deleteReport(${r.id})" style="width:100%;padding:10px;border:none;border-radius:10px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;font-weight:600;">🗑️ Murojaatni o'chirish</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  } catch (e) { toast('Xatolik: ' + e.message, 'error'); }
};

window._verifyReport = async (id, status) => {
  try {
    const comment = document.getElementById('mod-comment')?.value || '';
    await api.request(`/reports/${id}/verify`, { method: 'PUT', body: JSON.stringify({ status, moderator_comment: comment, points_to_award: status === 'tasdiqlangan' ? 50 : 0 }) });
    toast(status === 'tasdiqlangan' ? '✅ Tasdiqlandi!' : '❌ Rad etildi!');
    document.querySelector('[style*="position:fixed"][style*="inset:0"]')?.remove();
    renderReports(document.getElementById('main-content'));
  } catch (e) { toast('Xatolik: ' + e.message, 'error'); }
};

window._resolveReport = async (id) => {
  try {
    const desc = document.getElementById('resolve-desc')?.value || 'Hal qilindi';
    await api.request(`/reports/${id}/resolve`, { method: 'PUT', body: JSON.stringify({ resolution_description: desc, points_to_award: 10 }) });
    toast('🏁 Muammo hal qilindi!');
    document.querySelector('[style*="position:fixed"][style*="inset:0"]')?.remove();
    renderReports(document.getElementById('main-content'));
  } catch (e) { toast('Xatolik: ' + e.message, 'error'); }
};

window._deleteReport = async (id) => {
  if (!confirm('Rostdan o\'chirmoqchimisiz?')) return;
  try {
    await api.request(`/reports/${id}`, { method: 'DELETE' });
    toast('🗑️ O\'chirildi!');
    document.querySelector('[style*="position:fixed"][style*="inset:0"]')?.remove();
    renderReports(document.getElementById('main-content'));
  } catch (e) { toast('Xatolik: ' + e.message, 'error'); }
};

// ============ MODERATORS ============
async function renderModerators(container) {
  container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">⏳ Yuklanmoqda...</div>';
  let mods = [];
  try { mods = await api.request('/auth/users?role=moderator'); } catch (e) { }

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h2 style="font-size:1.6rem;font-weight:700;">🛡️ Moderatorlar</h2>
      <button onclick="window._showCreateMod()" style="padding:10px 20px;border:none;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;cursor:pointer;font-weight:600;">+ Yangi moderator</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;" id="mods-grid">
      ${mods.length === 0 ? '<div class="glass" style="padding:40px;text-align:center;color:#94a3b8;border-radius:16px;">Moderatorlar yo\'q</div>' :
      mods.map(m => `
        <div class="glass" style="padding:20px;border-radius:16px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
            <div style="width:45px;height:45px;border-radius:14px;background:linear-gradient(135deg,#4f46e5,#818cf8);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;">${m.full_name[0]}</div>
            <div><div style="font-weight:600;">${m.full_name}</div><div style="font-size:0.75rem;color:#94a3b8;">@${m.username}</div></div>
          </div>
          <div style="font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">📧 ${m.email}</div>
          ${m.organization_name ? `<div style="font-size:0.8rem;color:#818cf8;margin-bottom:4px;">🏢 ${m.organization_name}</div>` : ''}
          ${m.organization_type ? `<div style="font-size:0.8rem;color:#94a3b8;margin-bottom:8px;">📌 ${m.organization_type}</div>` : ''}
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid rgba(148,163,184,0.1);">
            <span style="font-size:0.75rem;padding:3px 8px;border-radius:6px;background:${m.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'};color:${m.is_active ? '#10b981' : '#ef4444'};">${m.is_active ? 'Faol' : 'Bloklangan'}</span>
            <div style="display:flex;gap:6px;">
              <button onclick="window._toggleUser(${m.id})" style="padding:5px 10px;border:1px solid rgba(148,163,184,0.2);background:transparent;color:#f59e0b;border-radius:8px;cursor:pointer;font-size:0.75rem;">${m.is_active ? '🔒' : '🔓'}</button>
              <button onclick="window._deleteUser(${m.id})" style="padding:5px 10px;border:1px solid rgba(239,68,68,0.2);background:transparent;color:#ef4444;border-radius:8px;cursor:pointer;font-size:0.75rem;">🗑️</button>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}

window._showCreateMod = () => {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div class="glass premium-shadow" style="max-width:480px;width:100%;padding:28px;border-radius:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="font-size:1.2rem;">🛡️ Yangi moderator yaratish</h2>
        <button onclick="this.closest('div[style]').parentElement.remove()" style="background:transparent;border:1px solid rgba(148,163,184,0.2);color:white;width:34px;height:34px;border-radius:10px;cursor:pointer;">✕</button>
      </div>
      <form id="create-mod-form">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div><label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">To'liq ismi</label><input id="cm-name" required style="width:100%;padding:10px;border-radius:10px;background:rgba(15,23,42,0.6);color:white;border:1px solid rgba(148,163,184,0.2);box-sizing:border-box;"></div>
          <div><label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">Username</label><input id="cm-uname" required style="width:100%;padding:10px;border-radius:10px;background:rgba(15,23,42,0.6);color:white;border:1px solid rgba(148,163,184,0.2);box-sizing:border-box;"></div>
        </div>
        <div style="margin-bottom:10px;"><label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">Email</label><input id="cm-email" type="email" required style="width:100%;padding:10px;border-radius:10px;background:rgba(15,23,42,0.6);color:white;border:1px solid rgba(148,163,184,0.2);box-sizing:border-box;"></div>
        <div style="margin-bottom:10px;"><label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">Parol</label><input id="cm-pass" type="password" required minlength="6" style="width:100%;padding:10px;border-radius:10px;background:rgba(15,23,42,0.6);color:white;border:1px solid rgba(148,163,184,0.2);box-sizing:border-box;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div><label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">Tashkilot nomi</label><input id="cm-org" style="width:100%;padding:10px;border-radius:10px;background:rgba(15,23,42,0.6);color:white;border:1px solid rgba(148,163,184,0.2);box-sizing:border-box;"></div>
          <div><label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">Yo'nalishi</label>
            <select id="cm-type" style="width:100%;padding:10px;border-radius:10px;background:rgba(15,23,42,0.6);color:white;border:1px solid rgba(148,163,184,0.2);box-sizing:border-box;">
              <option value="ekologiya">Ekologiya</option><option value="yol_qurilish">Yo'l qurilish</option><option value="boshqa">Boshqa</option>
            </select></div>
        </div>
        <button type="submit" style="width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;cursor:pointer;font-weight:600;margin-top:6px;">✅ Yaratish</button>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  document.getElementById('create-mod-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const orgName = document.getElementById('cm-org').value;
      const orgType = document.getElementById('cm-type').value;
      const params = new URLSearchParams({ role: 'moderator', organization_name: orgName, organization_type: orgType });
      await api.request(`/auth/create-moderator?${params}`, {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('cm-email').value,
          username: document.getElementById('cm-uname').value,
          full_name: document.getElementById('cm-name').value,
          password: document.getElementById('cm-pass').value,
        })
      });
      toast('🛡️ Moderator yaratildi!');
      overlay.remove();
      renderModerators(document.getElementById('main-content'));
    } catch (err) { toast('Xatolik: ' + err.message, 'error'); }
  };
};

window._toggleUser = async (id) => {
  try {
    await api.request(`/auth/users/${id}/toggle-active`, { method: 'PUT' });
    toast('✅ Holat o\'zgartirildi!');
    if (currentTab === 'moderators') renderModerators(document.getElementById('main-content'));
    else renderUsers(document.getElementById('main-content'));
  } catch (e) { toast('Xatolik: ' + e.message, 'error'); }
};

window._deleteUser = async (id) => {
  if (!confirm('Rostdan o\'chirmoqchimisiz?')) return;
  try {
    await api.request(`/auth/users/${id}`, { method: 'DELETE' });
    toast('🗑️ O\'chirildi!');
    if (currentTab === 'moderators') renderModerators(document.getElementById('main-content'));
    else renderUsers(document.getElementById('main-content'));
  } catch (e) { toast('Xatolik: ' + e.message, 'error'); }
};

// ============ USERS ============
async function renderUsers(container) {
  container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">⏳ Yuklanmoqda...</div>';
  let users = [];
  try { users = await api.request('/auth/users'); } catch (e) { }

  container.innerHTML = `
    <h2 style="font-size:1.6rem;font-weight:700;margin-bottom:20px;">👥 Barcha foydalanuvchilar <span style="font-size:0.9rem;color:#94a3b8;">(${users.length})</span></h2>
    <div class="glass" style="padding:16px;border-radius:16px;overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;min-width:700px;">
        <thead><tr style="color:#94a3b8;font-size:0.8rem;text-align:left;">
          <th style="padding:10px;">ID</th><th>Ism</th><th>Email</th><th>Rol</th><th>Ball</th><th>Holat</th><th>Amallar</th>
        </tr></thead>
        <tbody>${users.map(u => `
          <tr style="border-top:1px solid rgba(148,163,184,0.1);">
            <td style="padding:10px;color:#818cf8;font-weight:600;">#${u.id}</td>
            <td><div style="font-weight:500;">${u.full_name}</div><div style="font-size:0.7rem;color:#94a3b8;">@${u.username}</div></td>
            <td style="font-size:0.8rem;color:#94a3b8;">${u.email}</td>
            <td><span style="padding:3px 8px;border-radius:6px;font-size:0.7rem;background:rgba(79,70,229,0.15);color:#818cf8;">${ROLE_LABELS[u.role] || u.role}</span></td>
            <td style="font-weight:600;color:#10b981;">${u.points}</td>
            <td><span style="font-size:0.75rem;padding:3px 8px;border-radius:6px;background:${u.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'};color:${u.is_active ? '#10b981' : '#ef4444'};">${u.is_active ? 'Faol' : 'Blok'}</span></td>
            <td><div style="display:flex;gap:4px;">
              ${u.role !== 'admin' ? `<button onclick="window._toggleUser(${u.id})" style="padding:4px 8px;border:1px solid rgba(148,163,184,0.2);background:transparent;color:#f59e0b;border-radius:6px;cursor:pointer;font-size:0.7rem;">${u.is_active ? '🔒' : '🔓'}</button>
              <button onclick="window._deleteUser(${u.id})" style="padding:4px 8px;border:1px solid rgba(239,68,68,0.2);background:transparent;color:#ef4444;border-radius:6px;cursor:pointer;font-size:0.7rem;">🗑️</button>` : '<span style="font-size:0.7rem;color:#94a3b8;">—</span>'}
            </div></td>
          </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

init();
