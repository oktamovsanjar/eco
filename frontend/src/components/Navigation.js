import { state } from '../state.js';

export class Navigation {
    render() {
        const path = state.currentPath;
        const navItems = [
            { hash: '#home', icon: 'map', label: 'Xarita' },
            { hash: '#list', icon: 'clipboard-list', label: 'Hisobotlar' }
        ];

        return `
            <!-- Desktop Sidebar -->
            <aside class="desktop-sidebar glass">
                <div class="sidebar-logo">
                    <i data-lucide="leaf" style="color:var(--secondary);"></i>
                    <span>EcoWatch</span>
                </div>
                <nav class="sidebar-nav">
                    ${navItems.map(item => `
                        <a href="${item.hash}" class="nav-link ${path === item.hash ? 'active' : ''}">
                            <i data-lucide="${item.icon}"></i>
                            <span>${item.label}</span>
                        </a>
                    `).join('')}
                </nav>
            </aside>

            <!-- Mobile Bottom Nav -->
            <nav class="mobile-nav glass">
                ${navItems.map(item => `
                    <a href="${item.hash}" class="nav-link ${path === item.hash ? 'active' : ''}">
                        <i data-lucide="${item.icon}"></i>
                        <span>${item.label}</span>
                    </a>
                `).join('')}
            </nav>
        `;
    }
}
