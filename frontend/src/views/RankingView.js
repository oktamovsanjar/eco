import { BaseView } from './BaseView.js';
import { api } from '../api.js';

export class RankingView extends BaseView {
    render() {
        this.container.innerHTML = `
            <div class="page-header">
                <h1 class="gradient-text">Top Foydalanuvchilar</h1>
                <p class="text-muted">Eng faol ekologik nazoratchilar reytingi</p>
            </div>
            
            <div class="ranking-layout animate-fade-in">
                <div class="glass-card ranking-stats">
                    <div class="stats-grid">
                        <div class="stat-box">
                            <span class="stat-label">Tasdiqlangan</span>
                            <span class="stat-value" id="total-verified-count">0</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-label">Berilgan ballar</span>
                            <span class="stat-value" id="total-points-count">0</span>
                        </div>
                    </div>
                </div>

                <div class="glass-card ranking-container">
                    <div class="ranking-header">
                        <span>O'rin</span>
                        <span>Foydalanuvchi</span>
                        <span>Daraja</span>
                        <span style="text-align: right;">Ball</span>
                    </div>
                    <div id="leaderboard-list">
                        <div class="loader">Yuklanmoqda...</div>
                    </div>
                </div>
            </div>
        `;
    }

    async afterRender() {
        super.afterRender();
        await this.loadRanking();
    }

    async loadRanking() {
        const listEl = document.getElementById('leaderboard-list');
        const verCountEl = document.getElementById('total-verified-count');
        const ptsCountEl = document.getElementById('total-points-count');

        try {
            const users = await api.getLeaderboard();

            let totalPts = 0;
            let totalVer = 0;

            if (!users.length) {
                listEl.innerHTML = '<div class="empty-state">Hozircha foydalanuvchilar yo\'q</div>';
                return;
            }

            listEl.innerHTML = users.map((u, i) => {
                totalPts += u.points || 0;
                totalVer += u.verified_reports_count || 0;

                const avatar = u.avatar_url
                    ? `<img src="${u.avatar_url}" class="user-avatar-sm">`
                    : `<div class="user-avatar-sm" style="background: ${this.getAvatarColor(u.username)}">${u.full_name[0].toUpperCase()}</div>`;

                return `
                    <div class="ranking-item animate-in" style="animation-delay: ${i * 0.05}s">
                        <div class="rank-number ${i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : ''}">
                            ${i < 3 ? `<i data-lucide="medal" style="width:14px;height:14px;"></i>` : i + 1}
                        </div>
                        
                        <div class="user-info-cell">
                            ${avatar}
                            <div class="user-details">
                                <div class="user-fullname">${u.full_name}</div>
                                <div class="user-username">@${u.username}</div>
                            </div>
                        </div>

                        <div class="user-rank-cell">
                            <span class="rank-badge rank-${u.rank.toLowerCase()}">${u.rank}</span>
                        </div>

                        <div class="user-score">
                            <span class="score-val">${u.points}</span>
                            <div class="score-verified">
                                <i data-lucide="check-circle" style="width:10px;height:10px;"></i> ${u.verified_reports_count}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            verCountEl.textContent = totalVer;
            ptsCountEl.textContent = totalPts;

            if (window.lucide) window.lucide.createIcons();
        } catch (e) {
            listEl.innerHTML = '<p class="error">Ma\'lumot yuklashda xatolik</p>';
        }
    }

    getAvatarColor(username) {
        const colors = [
            '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#ec4899', '#06b6d4', '#475569', '#14b8a6'
        ];
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }
}
