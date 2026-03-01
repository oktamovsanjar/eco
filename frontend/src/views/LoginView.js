import { BaseView } from './BaseView.js';
import { api } from '../api.js';
import { state } from '../state.js';

export class LoginView extends BaseView {
    render() {
        this.container.innerHTML = `
            <div class="auth-wrapper animate-fade-in">
                <div class="auth-card glass-card">
                    <div class="auth-brand">
                        <div class="brand-icon">
                            <i data-lucide="shield-check"></i>
                        </div>
                        <h1>EcoWatch</h1>
                        <p>Tizimga xavfsiz kirish</p>
                    </div>

                    <form id="login-form">
                        <div class="form-group">
                            <label class="form-label">Foydalanuvchi nomi</label>
                            <input type="text" id="username" class="form-input" placeholder="Lider_001" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Parol</label>
                            <input type="password" id="password" class="form-input" placeholder="••••••••" required>
                        </div>
                        <div id="login-error" class="error-msg" style="display:none;"></div>
                        <button type="submit" class="btn btn-primary" style="width:100%; height:52px;" id="submit-btn">
                            Kirish <i data-lucide="arrow-right"></i>
                        </button>
                    </form>
                    
                    <div class="auth-footer">
                        <a href="#home" class="btn-ghost" style="padding:10px; border-radius:12px; font-size:0.9rem;">
                             Mehmmon bo'lib davom etish
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    afterRender() {
        super.afterRender();
        const form = document.getElementById('login-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submit-btn');
            const err = document.getElementById('login-error');
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            try {
                btn.disabled = true;
                btn.innerHTML = '<i data-lucide="loader" class="rotate"></i> Kirilmoqda...';
                if (window.lucide) window.lucide.createIcons();

                await api.login(username, password);
                const user = await api.getMe();
                state.setUser(user);
                window.location.hash = '#home';
            } catch (e) {
                err.textContent = e.message;
                err.style.display = 'block';
                btn.disabled = false;
                btn.innerHTML = 'Kirish <i data-lucide="arrow-right"></i>';
                if (window.lucide) window.lucide.createIcons();
            }
        };
    }
}
