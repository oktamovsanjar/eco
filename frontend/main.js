import { state } from './src/state.js';
import { router } from './src/router.js';
import { api } from './src/api.js';
import { Navigation } from './src/components/Navigation.js';

// Views
import { HomeView } from './src/views/HomeView.js';
import { ListView } from './src/views/ListView.js';
import { LoginView } from './src/views/LoginView.js';

const app = document.getElementById('app');
const nav = new Navigation();

const routes = {
  '#home': HomeView,
  '#list': ListView,
  '#login': LoginView
};

let currentView = null;

async function update() {
  const path = state.currentPath.split('?')[0] || '#home';
  const ViewClass = routes[path] || HomeView;

  // Destroy previous view
  if (currentView) {
    currentView.destroy();
  }

  const pageNames = {
    '#home': 'Xarita',
    '#list': 'Hisobotlar',
    '#login': 'Kirish'
  };
  const pageTitle = pageNames[path] || 'EcoWatch';

  // Render Layout
  if (path === '#login') {
    app.innerHTML = `<main class="full-page" id="main-content"></main>`;
  } else {
    app.innerHTML = `
            <div class="app-layout">
                ${nav.render()}
                <div class="app-viewport">
                    <header class="app-header">
                        <div class="header-content">
                            <h1 class="page-title gradient-text">${pageTitle}</h1>
                        </div>
                    </header>
                    <main class="page-content" id="main-content"></main>
                </div>
            </div>
        `;
  }

  const mainContent = document.getElementById('main-content');
  currentView = new ViewClass();
  currentView.mount(mainContent);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Initial session check
async function initSession() {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const user = await api.getMe();
      state.setUser(user);
    } catch (e) {
      console.warn('Session expired');
    }
  }
}

// Subscribe to state changes
state.addListener(() => update());

// Init App
initSession().then(() => {
  router.init();
});
