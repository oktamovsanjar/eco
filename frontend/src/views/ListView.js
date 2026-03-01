import { BaseView } from './BaseView.js';
import { api } from '../api.js';

const CATEGORY_LABELS = {
    'ekologiya': '🌿 Ekologiya',
    'yol_qurilish': '🚧 Yo\'l qurilishi',
    'suv_muammosi': '💧 Suv muammosi',
    'havo_ifloslanishi': '💨 Havo ifloslanishi',
    'chiqindi': '🗑️ Chiqindi',
    'shovqin': '🔊 Shovqin',
    'daraxt_kesish': '🌳 Daraxt kesish',
    'qurilish_buzilishi': '🏗️ Qurilish buzilishi',
    'boshqa': '📌 Boshqa',
};

const STATUS_LABELS = {
    'kutilmoqda': 'Kutilmoqda',
    'tekshirilmoqda': 'Tekshirilmoqda',
    'tasdiqlangan': 'Tasdiqlangan',
    'rad_etilgan': 'Rad etilgan',
    'hal_qilinmoqda': 'Hal qilinmoqda',
    'hal_qilindi': 'Hal qilindi',
    'yopilgan': 'Yopilgan',
};

const STATUS_COLORS = {
    'kutilmoqda': '#f59e0b',
    'tekshirilmoqda': '#3b82f6',
    'tasdiqlangan': '#8b5cf6',
    'rad_etilgan': '#ef4444',
    'hal_qilinmoqda': '#06b6d4',
    'hal_qilindi': '#10b981',
    'yopilgan': '#6b7280',
};

const UZBEKISTAN_REGIONS = [
    'Toshkent shahri',
    'Toshkent viloyati',
    'Samarqand viloyati',
    'Buxoro viloyati',
    'Farg\'ona viloyati',
    'Andijon viloyati',
    'Namangan viloyati',
    'Qashqadaryo viloyati',
    'Surxondaryo viloyati',
    'Jizzax viloyati',
    'Sirdaryo viloyati',
    'Navoiy viloyati',
    'Xorazm viloyati',
    'Qoraqalpog\'iston Respublikasi',
];

export class ListView extends BaseView {
    constructor() {
        super();
        this.filters = {
            region: '',
            category: '',
            status: '',
            sort: 'newest',
        };
        this.reports = [];
        this.likedReports = new Set(
            JSON.parse(localStorage.getItem('liked_reports') || '[]')
        );
    }

    render() {
        this.container.innerHTML = `
            <div class="page-header">
                <h1 class="gradient-text">Barcha hisobotlar</h1>
                <p class="text-muted">Jamoatchilik tomonidan yuborilgan muammolar</p>
            </div>

            <!-- Filter Panel -->
            <div class="filter-panel glass animate-fade-in">
                <div class="filter-row">
                    <div class="filter-group">
                        <label class="filter-label">
                            <i data-lucide="map-pin" style="width:13px;height:13px;"></i> Hudud
                        </label>
                        <select id="filter-region" class="filter-select">
                            <option value="">Barcha hududlar</option>
                            ${UZBEKISTAN_REGIONS.map(r => `<option value="${r}">${r}</option>`).join('')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">
                            <i data-lucide="tag" style="width:13px;height:13px;"></i> Kategoriya
                        </label>
                        <select id="filter-category" class="filter-select">
                            <option value="">Barchasi</option>
                            ${Object.entries(CATEGORY_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">
                            <i data-lucide="activity" style="width:13px;height:13px;"></i> Holat
                        </label>
                        <select id="filter-status" class="filter-select">
                            <option value="">Barchasi</option>
                            ${Object.entries(STATUS_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">
                            <i data-lucide="arrow-up-down" style="width:13px;height:13px;"></i> Saralash
                        </label>
                        <select id="filter-sort" class="filter-select">
                            <option value="newest">Yangi avval</option>
                            <option value="oldest">Eski avval</option>
                            <option value="most_liked">Ko'p ovozli</option>
                            <option value="most_viewed">Ko'p ko'rilgan</option>
                        </select>
                    </div>

                    <button id="clear-filters-btn" class="filter-clear-btn" title="Filtrlarni tozalash">
                        <i data-lucide="x-circle" style="width:16px;height:16px;"></i> Tozalash
                    </button>
                </div>

                <div id="active-filter-tags" class="active-tags"></div>
            </div>

            <!-- Results count -->
            <div id="results-info" class="results-info text-muted"></div>

            <!-- Reports Grid -->
            <div class="report-grid animate-fade-in" id="reports-list">
                <div class="loader">Yuklanmoqda...</div>
            </div>
        `;
    }

    async afterRender() {
        super.afterRender();

        // Filter events
        document.getElementById('filter-region').addEventListener('change', (e) => {
            this.filters.region = e.target.value;
            this.applyFilters();
        });
        document.getElementById('filter-category').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.applyFilters();
        });
        document.getElementById('filter-status').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });
        document.getElementById('filter-sort').addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.applyFilters();
        });
        document.getElementById('clear-filters-btn').addEventListener('click', () => {
            this.clearFilters();
        });

        await this.loadReports();
    }

    clearFilters() {
        this.filters = { region: '', category: '', status: '', sort: 'newest' };
        document.getElementById('filter-region').value = '';
        document.getElementById('filter-category').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-sort').value = 'newest';
        this.applyFilters();
    }

    async loadReports() {
        const listEl = document.getElementById('reports-list');
        try {
            this.reports = await api.getReports({ limit: 200 });
            this.applyFilters();
        } catch (e) {
            listEl.innerHTML = '<p class="error">Xatolik yuz berdi</p>';
        }
    }

    applyFilters() {
        let filtered = [...this.reports];

        if (this.filters.region) {
            filtered = filtered.filter(r =>
                r.region && r.region.toLowerCase().includes(this.filters.region.toLowerCase())
            );
        }
        if (this.filters.category) {
            filtered = filtered.filter(r => r.category === this.filters.category);
        }
        if (this.filters.status) {
            filtered = filtered.filter(r => r.status === this.filters.status);
        }

        // Sort
        switch (this.filters.sort) {
            case 'oldest':
                filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'most_liked':
                filtered.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
                break;
            case 'most_viewed':
                filtered.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
                break;
            default: // newest
                filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        this.renderReports(filtered);
        this.renderActiveTags();

        const infoEl = document.getElementById('results-info');
        if (infoEl) {
            const total = this.reports.length;
            const shown = filtered.length;
            infoEl.textContent = total === shown
                ? `Jami ${total} ta hisobot`
                : `${shown} ta natija (jami ${total} dan)`;
        }
    }

    renderActiveTags() {
        const tagsEl = document.getElementById('active-filter-tags');
        if (!tagsEl) return;
        const tags = [];
        if (this.filters.region) tags.push({ label: this.filters.region, key: 'region' });
        if (this.filters.category) tags.push({ label: CATEGORY_LABELS[this.filters.category] || this.filters.category, key: 'category' });
        if (this.filters.status) tags.push({ label: STATUS_LABELS[this.filters.status] || this.filters.status, key: 'status' });

        tagsEl.innerHTML = tags.map(t => `
            <span class="active-tag">
                ${t.label}
                <button onclick="window.__listView && window.__listView.removeFilter('${t.key}')" class="tag-remove">×</button>
            </span>
        `).join('');

        window.__listView = this;
    }

    removeFilter(key) {
        this.filters[key] = '';
        if (document.getElementById(`filter-${key}`)) {
            document.getElementById(`filter-${key}`).value = '';
        }
        this.applyFilters();
    }

    renderReports(reports) {
        const listEl = document.getElementById('reports-list');
        if (!listEl) return;

        if (!reports.length) {
            listEl.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1; text-align:center; padding:60px 20px;">
                    <i data-lucide="inbox" style="width:48px;height:48px;opacity:0.3;margin-bottom:16px;"></i>
                    <p style="opacity:0.5;">Hisobotlar topilmadi</p>
                    <button onclick="window.__listView && window.__listView.clearFilters()" class="btn btn-ghost" style="margin-top:12px;">
                        Filtrlarni tozalash
                    </button>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        listEl.innerHTML = reports.map(r => {
            const catLabel = CATEGORY_LABELS[r.category] || r.category || 'Noma\'lum';
            const statusLabel = STATUS_LABELS[r.status] || r.status;
            const statusColor = STATUS_COLORS[r.status] || '#94a3b8';
            const isLiked = this.likedReports.has(r.id);
            const date = new Date(r.created_at).toLocaleDateString('uz-UZ', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            const region = r.region || r.district || '';

            return `
                <div class="glass-card report-item" style="cursor:pointer; position:relative; overflow:hidden;">
                    <!-- Status stripe -->
                    <div style="position:absolute; top:0; left:0; right:0; height:3px; background:${statusColor};"></div>

                    <!-- Header -->
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px; padding-top:4px;">
                        <span class="status-badge" style="background:${statusColor}20; color:${statusColor}; border:1px solid ${statusColor}40; font-size:0.7rem;">
                            ${statusLabel}
                        </span>
                        <span class="text-dim" style="font-size:0.72rem;">${date}</span>
                    </div>

                    <!-- Title (clickable) -->
                    <h3 style="margin-bottom:6px; font-size:0.95rem; line-height:1.4; cursor:pointer;"
                        onclick="location.hash='#home?id=${r.id}'">
                        ${r.title}
                    </h3>

                    <!-- Category & Region -->
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                        <span style="font-size:0.72rem; background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:20px; color:var(--text-muted);">
                            ${catLabel}
                        </span>
                        ${region ? `
                        <span style="font-size:0.72rem; background:rgba(99,179,237,0.12); padding:2px 8px; border-radius:20px; color:#63b3ed; display:flex; align-items:center; gap:4px;">
                            <i data-lucide="map-pin" style="width:10px;height:10px;"></i>${region}
                        </span>` : ''}
                    </div>

                    <!-- Description -->
                    <p class="text-muted" style="font-size:0.82rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.5; margin-bottom:12px;">
                        ${r.description || ''}
                    </p>

                    <!-- Author -->
                    ${r.author_name ? `
                    <div style="font-size:0.75rem; color:var(--text-dim); margin-bottom:10px;">
                        <i data-lucide="user" style="width:11px;height:11px;"></i> ${r.author_name}
                    </div>` : ''}

                    <!-- Footer: Like & Views -->
                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid rgba(255,255,255,0.07);">
                        <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${r.id}" onclick="event.stopPropagation(); window.__listView && window.__listView.handleLike(${r.id}, this)">
                            <i data-lucide="${isLiked ? 'thumbs-up' : 'thumbs-up'}" style="width:13px;height:13px;"></i>
                            <span class="like-count">${r.upvotes || 0}</span>
                        </button>

                        <div style="display:flex; gap:12px; color:var(--text-dim); font-size:0.78rem; align-items:center;">
                            <span style="display:flex; align-items:center; gap:4px;">
                                <i data-lucide="eye" style="width:12px;height:12px;"></i> ${r.views_count || 0}
                            </span>
                            <span style="display:flex; align-items:center; gap:4px; cursor:pointer; color:var(--accent);" onclick="location.hash='#home?id=${r.id}'">
                                <i data-lucide="arrow-right" style="width:12px;height:12px;"></i> Ko'rish
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    }

    async handleLike(reportId, btn) {
        if (this.likedReports.has(reportId)) {
            // Already liked — show message
            btn.classList.add('shake');
            setTimeout(() => btn.classList.remove('shake'), 400);
            return;
        }

        try {
            btn.disabled = true;
            const result = await api.upvoteReport(reportId);

            // Save to localStorage
            this.likedReports.add(reportId);
            localStorage.setItem('liked_reports', JSON.stringify([...this.likedReports]));

            // Update UI
            btn.classList.add('liked');
            const countEl = btn.querySelector('.like-count');
            if (countEl) countEl.textContent = result.upvotes;

            // Update in local data
            const report = this.reports.find(r => r.id === reportId);
            if (report) report.upvotes = result.upvotes;

            // Animate
            btn.style.transform = 'scale(1.3)';
            setTimeout(() => { btn.style.transform = ''; btn.disabled = false; }, 300);

        } catch (e) {
            btn.disabled = false;
            console.error('Like xatolik:', e);
        }
    }
}
