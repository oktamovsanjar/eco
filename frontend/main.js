import { api } from './src/api.js';
import L from 'leaflet';
import Chart from 'chart.js/auto';

// Global variables for Map
let selectedLocation = null;
let currentMap = null;
let mainMarker = null;

const app = document.getElementById('app');

// State
let user = null;
let currentPath = window.location.hash || '#home';

const GUEST_USER = {
  full_name: "Xush kelibsiz",
  role: "user",
  points: 0
};

// Router
async function router() {
  const path = window.location.hash || '#home';
  const token = localStorage.getItem('token');

  // Only redirect to login if trying to access admin/moderator features
  if (!token && (path === '#admin' || path === '#users' || path === '#reports' || path === '#moderator')) {
    window.location.hash = '#login';
    return;
  }

  if (token && !user) {
    try {
      user = await api.getMe();
    } catch (e) {
      localStorage.removeItem('token');
      user = null;
      if (path !== '#home' && path !== '#login') {
        window.location.hash = '#login';
        return;
      }
    }
  }

  // Use guest if no user (and not redirecting)
  const activeUser = user || GUEST_USER;

  app.innerHTML = '';

  if (path === '#login') {
    renderLogin();
  } else if (path === '#register') {
    renderRegister();
  } else {
    // Role-based view selection
    if (activeUser.role === 'admin') {
      renderAdminDashboard();
    } else if (activeUser.role === 'moderator') {
      renderModeratorView();
    } else {
      renderMobileContainer(activeUser, path);
    }
  }

  // Highlight active nav
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.getAttribute('href') === path) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Re-run Lucide
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ========== LOGIN VIEW ==========
function renderLogin() {
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card glass premium-shadow">
        <h2 style="text-align: center; margin-bottom: 10px;">EcoWatch</h2>
        <p style="text-align: center; color: var(--text-muted); margin-bottom: 30px;">Admin yoki Moderator sifatida kirish</p>
        <form id="login-form">
          <div class="form-group">
            <label>Login (Username yoki Email)</label>
            <input type="text" id="username" required placeholder="Masalan: oadminos">
          </div>
          <div class="form-group">
            <label>Parol</label>
            <input type="password" id="password" required placeholder="••••••••">
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 14px;">
            Kirish <i data-lucide="arrow-right"></i>
          </button>
        </form>
        <div style="text-align: center; margin-top: 30px;">
          <a href="#home" class="btn btn-ghost" style="width: 100%; justify-content: center;">
             <i data-lucide="arrow-left"></i> Orqaga qaytish
          </a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const loginValue = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
      await api.login(loginValue, password);
      user = await api.getMe();
      window.location.hash = '#home';
      router();
    } catch (err) {
      alert(err.message);
    }
  };
}

// ========== MOBILE CONTAINER & VIEWS ==========
function renderMobileContainer(activeUser, path) {
  app.innerHTML = `
    <div class="main-content" style="padding: 20px;">
      <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 700;">${activeUser.full_name}</h1>
          <p style="color: var(--text-muted); font-size: 0.875rem;">Ekologiya nazorati tizimi</p>
        </div>
      </header>

      <div id="mobile-page-content"></div>

      <div class="mobile-nav">
        <a href="#home" class="nav-link"><i data-lucide="map"></i></a>
        <a href="#list" class="nav-link"><i data-lucide="list"></i></a>
        <a href="#ranking" class="nav-link"><i data-lucide="award"></i></a>
        <a href="#profile" class="nav-link"><i data-lucide="user"></i></a>
      </div>
    </div>
  `;

  const container = document.getElementById('mobile-page-content');

  if (path === '#list') {
    renderUserList(container);
  } else if (path === '#ranking') {
    renderUserRanking(container);
  } else if (path === '#profile') {
    renderUserProfile(activeUser, container);
  } else {
    renderUserHome(activeUser, container);
  }
}

function renderUserHome(activeUser, container) {
  container.innerHTML = `
      <div id="map" class="glass premium-shadow animate-in" style="margin-bottom: 20px; position: relative; animation-delay: 0.1s; height: 500px;">
        <button id="locate-me" class="map-control-btn" title="Mening joylashuvim">
          <i data-lucide="crosshair"></i>
        </button>
      </div>

      <div id="location-display" class="glass animate-in" style="animation-delay: 0.2s;">
        <i data-lucide="map-pin" style="color: var(--danger);"></i>
        <span id="address-text">Xaritadan joyni tanlang</span>
      </div>

      <button id="add-report-btn" class="btn btn-primary animate-in" style="animation-delay: 0.3s; padding: 16px; border-radius: 20px; box-shadow: 0 10px 20px rgba(79, 70, 229, 0.4);">
        <i data-lucide="plus-circle"></i> Shikoyat yuborish
      </button>

      <!-- Report Modal -->
      <div id="report-modal" class="modal-overlay">
        <div class="modal-content glass premium-shadow">
          <div class="modal-header">
            <h2>Yangi shikoyat</h2>
            <button id="close-modal" class="btn-ghost" style="padding: 5px; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="x"></i>
            </button>
          </div>
          <form id="report-form">
            <div class="form-group">
              <label>Siz tanlagan manzil:</label>
              <div id="selected-address" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px;"></div>
            </div>
            <div class="form-group">
              <label>Sarlavha</label>
              <input type="text" id="report-title" placeholder="Masalan: Chuqur yo'l yoki chiqindi" required>
            </div>
            <div class="form-group">
              <label>Yo'nalish</label>
              <select id="report-category" required>
                <option value="ekologiya">Ekologiya (Chiqindilar, daraxtlar)</option>
                <option value="yol_qurilish">Yo'l qurilishi (Chuqurlar, belgilar)</option>
                <option value="suv_muammosi">Suv muammosi</option>
                <option value="chiqindi">Chiqindi</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tavsif</label>
              <textarea id="report-desc" rows="3" placeholder="Muammo haqida batafsil..." required style="width:100%; padding:12px; border-radius:12px; background:rgba(15,23,42,0.6); color:white; border:1px solid var(--glass-border);"></textarea>
            </div>
            <div class="form-group">
              <label>Rasm yuklash</label>
              <input type="file" id="report-image" accept="image/*">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">
              Yuborish <i data-lucide="send"></i>
            </button>
          </form>
        </div>
      </div>
  `;
  initMap();
}

async function renderUserList(container) {
  container.innerHTML = `<h2 style="margin-bottom:20px;">Barcha shikoyatlar</h2><div id="full-reports-list" class="glass" style="padding:10px;">Yuklanmoqda...</div>`;
  const listEl = document.getElementById('full-reports-list');
  try {
    const reports = await api.getReports({ limit: 20 });
    if (!reports || reports.length === 0) {
      listEl.innerHTML = "<p style='padding:20px; text-align:center;'>Hozircha shikoyatlar yo'q</p>";
      return;
    }
    listEl.innerHTML = reports.map(r => `
      <div class="report-list-item" onclick="window.showOnMap(${r.latitude}, ${r.longitude}, '${(r.title || '').replace(/'/g, "\\'")}')" style="padding: 15px; border-bottom: 1px solid var(--glass-border); cursor: pointer; transition: background 0.2s;">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
           <span style="font-weight:700;">${r.title}</span>
           <span class="glass" style="font-size:0.7rem; padding:2px 8px; border-radius:10px;">${r.status}</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${r.address || ''}</div>
      </div>
    `).join('');
  } catch (e) {
    listEl.innerHTML = "Xatolik yuz berdi";
  }
}

async function renderUserRanking(container) {
  container.innerHTML = `<h2 style="margin-bottom:20px;">Top foydalanuvchilar</h2><div id="leaderboard-list" class="glass" style="padding:10px;">Yuklanmoqda...</div>`;
  const listEl = document.getElementById('leaderboard-list');
  try {
    const users = await api.getLeaderboard();
    listEl.innerHTML = users.map((u, i) => `
      <div style="padding: 12px; display:flex; align-items:center; gap:15px; border-bottom: 1px solid var(--glass-border);">
        <div style="width:30px; font-weight:800; color:var(--primary);">${i + 1}</div>
        <div style="flex:1;">
          <div style="font-weight:600;">${u.full_name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${u.username}</div>
        </div>
        <div style="font-weight:700; color:var(--secondary);">${u.points} ball</div>
      </div>
    `).join('');
  } catch (e) {
    listEl.innerHTML = "Xatolik yuz berdi";
  }
}

function renderUserProfile(activeUser, container) {
  container.innerHTML = `
    <div class="glass premium-shadow animate-in" style="padding:30px; text-align:center;">
       <div style="width:80px; height:80px; background:linear-gradient(135deg, var(--primary), #818cf8); border-radius:50%; margin: 0 auto 15px; display:flex; align-items:center; justify-content:center; font-size:2rem; box-shadow: 0 8px 16px var(--primary-glow);">
          ${activeUser.full_name[0]}
       </div>
       <h3 style="margin-bottom: 5px;">${activeUser.full_name}</h3>
       <p style="color:var(--text-muted); font-size: 0.9rem; margin-bottom:25px;">@${activeUser.username || 'user'}</p>

       <div class="stats-grid" style="margin-bottom: 30px;">
          <div class="stat-card glass" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2);">
            <div class="stat-value" style="color: var(--secondary); font-size: 1.5rem;">${activeUser.points || 0}</div>
            <div class="stat-label">Ballar</div>
          </div>
          <div class="stat-card glass" style="background: rgba(79, 70, 229, 0.1); border-color: rgba(79, 70, 229, 0.2);">
            <div class="stat-value" style="color: var(--primary); font-size: 1.5rem;">0</div>
            <div class="stat-label">Yuborilgan</div>
          </div>
       </div>
       
       ${user ? `
         <button id="logout-mobile" class="btn btn-ghost" style="width:100%; justify-content:center; color:var(--danger); border-color: rgba(239, 68, 68, 0.2);">
           <i data-lucide="log-out"></i> Chiqish
         </button>
       ` : `
         <p style="font-size:0.8rem; margin-bottom:15px; color: var(--text-muted);">Tizimga kirish orqali ballaringizni saqlang</p>
         <a href="#login" class="btn btn-primary" style="width:100%; justify-content:center;">Kirish</a>
       `}
    </div>
  `;

  const logoutBtn = document.getElementById('logout-mobile');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem('token');
      user = null;
      window.location.hash = '#home';
      router();
    };
  }
}

// ========== ADMIN DASHBOARD (LAPTOP OPTIMIZED) ==========
async function renderAdminDashboard() {
  let stats = { total_reports: 0, pending: 0, resolved: 0, rejected: 0 };
  try {
    stats = await api.getStats();
  } catch (e) { console.error(e); }

  app.innerHTML = `
    <div class="dashboard-layout">
      <aside class="sidebar glass">
        <div class="sidebar-logo">
          <i data-lucide="leaf" style="color: var(--secondary);"></i> EcoWatch
        </div>
        <nav class="sidebar-nav">
          <div class="nav-item"><a href="#home" class="nav-link active"><i data-lucide="layout-dashboard"></i> Dashboard</a></div>
          <div class="nav-item"><a href="#reports" class="nav-link"><i data-lucide="file-text"></i> Shikoyatlar</a></div>
          <div class="nav-item"><a href="#map-admin" class="nav-link"><i data-lucide="map"></i> Xarita</a></div>
          <div class="nav-item"><a href="#users" class="nav-link"><i data-lucide="users"></i> Foydalanuvchilar</a></div>
          <div class="nav-item" style="margin-top: 40px; border-top: 1px solid var(--glass-border); padding-top: 20px;">
            <a href="#" id="logout" class="nav-link" style="color: var(--danger);"><i data-lucide="log-out"></i> Chiqish</a>
          </div>
        </nav>
      </aside>

      <main class="main-content" style="padding: 40px; overflow-y: auto;">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
          <h2 style="font-size: 2rem; font-weight: 700;">Admin Paneli</h2>
          <div style="display: flex; gap: 20px;">
             <div class="glass" style="padding: 8px 16px; border-radius: 12px; display: flex; align-items: center; gap: 10px;">
                <span style="color: var(--text-muted);">Admin:</span> <strong>${user ? user.full_name : 'Admin'}</strong>
             </div>
          </div>
        </header>

        <div class="stats-grid">
          <div class="stat-card glass premium-shadow">
            <div class="stat-label">Jami shikoyatlar</div>
            <div class="stat-value">${stats.total_reports || 0}</div>
          </div>
          <div class="stat-card glass premium-shadow">
            <div class="stat-label">Kutilmoqda</div>
            <div class="stat-value" style="color: var(--accent);">${stats.pending || 0}</div>
          </div>
          <div class="stat-card glass premium-shadow">
            <div class="stat-label">Hal qilingan</div>
            <div class="stat-value" style="color: var(--secondary);">${stats.resolved || 0}</div>
          </div>
          <div class="stat-card glass premium-shadow">
            <div class="stat-label">Rad etilgan</div>
            <div class="stat-value" style="color: var(--danger);">${stats.rejected || 0}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px; margin-top: 30px;">
          <div class="glass premium-shadow" style="padding: 24px;">
            <h3 style="margin-bottom: 20px;">So'nggi shikoyatlar</h3>
            <div id="recent-reports-list" style="color: var(--text-muted);">Ma'lumotlar yuklanmoqda...</div>
          </div>
          <div class="glass premium-shadow" style="padding: 24px;">
            <h3 style="margin-bottom: 20px;">HUDUDLAR BOYICHA</h3>
            <canvas id="regionChart"></canvas>
          </div>
        </div>
      </main>
    </div>
  `;

  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      user = null;
      window.location.hash = '#home';
      router();
    };
  }

  loadRecentReports();
  initCharts();
}

function renderModeratorView() {
  renderAdminDashboard();
}

// ========== HELPERS ==========
function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  // Custom Dark Style (CartoDB Dark Matter)
  currentMap = L.map('map', { zoomControl: false }).setView([41.2995, 69.2401], 13);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(currentMap);

  // Custom GPS button
  const locateBtn = document.getElementById('locate-me');
  if (locateBtn) {
    locateBtn.onclick = (e) => {
      e.stopPropagation();
      locateBtn.classList.add('locate-loading'); // Animatsiya qo'shish
      currentMap.locate({
        setView: true,
        maxZoom: 16,
        enableHighAccuracy: true,
        timeout: 15000
      });
    };
    L.DomEvent.disableClickPropagation(locateBtn);
  }

  // Automaticaly ask for location on startup
  currentMap.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });

  currentMap.on('locationfound', (e) => {
    if (locateBtn) locateBtn.classList.remove('locate-loading');
    updateMarker(e.latlng);
  });

  currentMap.on('locationerror', (e) => {
    if (locateBtn) locateBtn.classList.remove('locate-loading');
    console.error("GPS Error:", e.message);
    if (e.code !== 1) {
      alert("Joylashuvni aniqlashda xatolik: " + e.message);
    }
  });

  currentMap.on('click', (e) => {
    updateMarker(e.latlng);
  });

  // Load existing reports on map
  loadMapReports();

  // Modal logic
  const modal = document.getElementById('report-modal');
  const addBtn = document.getElementById('add-report-btn');
  const closeBtn = document.getElementById('close-modal');

  if (addBtn) {
    addBtn.onclick = () => {
      if (!selectedLocation) {
        alert("Iltimos, avval xaritadan joylashuvni tanlang!");
        return;
      }
      modal.style.display = 'flex';
      document.getElementById('selected-address').innerText = document.getElementById('address-text').innerText;
    };
  }

  if (closeBtn) {
    closeBtn.onclick = () => modal.style.display = 'none';
  }

  // Form submission
  const form = document.getElementById('report-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const reportData = {
        title: document.getElementById('report-title').value,
        description: document.getElementById('report-desc').value,
        category: document.getElementById('report-category').value,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        address: document.getElementById('address-text').innerText
      };

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Yuborilmoqda... <i data-lucide="loader" class="rotate"></i>';
        if (window.lucide) window.lucide.createIcons();

        const report = await api.createReport(reportData);

        const imageFile = document.getElementById('report-image').files[0];
        if (imageFile) {
          await api.uploadImage(report.id, imageFile);
        }

        alert("Muvaffaqiyatli yuborildi!");
        modal.style.display = 'none';
        form.reset();

        selectedLocation = null;
        if (mainMarker) {
          currentMap.removeLayer(mainMarker);
          mainMarker = null;
        }
        document.getElementById('address-text').innerText = "Xaritadan joyni tanlang";
      } catch (err) {
        alert("Xatolik: \n" + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        if (window.lucide) window.lucide.createIcons();
      }
    };
  }
}

async function updateMarker(latlng) {
  selectedLocation = latlng;

  if (mainMarker) {
    mainMarker.setLatLng(latlng);
  } else {
    mainMarker = L.marker(latlng, {
      icon: L.divIcon({
        className: 'custom-div-icon',
        html: '<div class="pulse-marker"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(currentMap);
  }

  // Optimize: Smoothly pan to the selected location
  currentMap.flyTo(latlng, 15, {
    animate: true,
    duration: 1.5
  });

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`);
    const data = await res.json();
    const address = data.display_name.split(',').slice(0, 3).join(',');
    const addrEl = document.getElementById('address-text');
    if (addrEl) addrEl.innerText = address;
  } catch (e) {
    const addrEl = document.getElementById('address-text');
    if (addrEl) addrEl.innerText = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
  }
}

async function loadMapReports() {
  if (!currentMap) return;
  try {
    const reports = await api.getReports({ limit: 100 });
    reports.forEach(r => {
      if (r.latitude && r.longitude) {
        L.marker([r.latitude, r.longitude], {
          icon: L.divIcon({
            className: 'report-marker-container',
            html: `<div class="report-marker" title="${r.title}"></div>`,
            iconSize: [20, 20]
          })
        }).addTo(currentMap)
          .bindPopup(`<strong>${r.title}</strong><br>${r.address || ''}<br><small>${r.status}</small>`);
      }
    });
  } catch (e) {
    console.error("Failed to load map reports:", e);
  }
}

async function loadRecentReports() {
  const listEl = document.getElementById('recent-reports-list');
  if (!listEl) return;

  try {
    const reports = await api.getReports({ limit: 5 });
    if (!reports || reports.length === 0) {
      listEl.innerHTML = "Hozircha shikoyatlar yo'q";
      return;
    }
    listEl.innerHTML = reports.map(r => `
      <div style="padding: 12px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="color: var(--text-main); font-weight: 600;">${r.title || 'Nomsiz'}</div>
          <div style="font-size: 0.75rem;">${new Date(r.created_at).toLocaleString()}</div>
        </div>
        <span class="glass" style="padding: 4px 10px; border-radius: 8px; font-size: 0.75rem;">${r.status}</span>
      </div>
    `).join('');
  } catch (e) {
    listEl.innerHTML = "Yuklashda xatolik";
  }
}

function initCharts() {
  const ctx = document.getElementById('regionChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Toshkent', 'Samarqand', 'Andijon'],
      datasets: [{
        data: [12, 19, 3],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
        borderWidth: 0
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8' } }
      }
    }
  });
}

// Initial Permissions
async function requestPermissions() {
  // Geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      () => console.log("Location permission granted"),
      (err) => console.warn("Location permission denied", err)
    );
  }

  // Camera permission removed as requested
  console.log("Permissions check completed (Camera omitted)");
}

window.showOnMap = (lat, lng, title) => {
  window.location.hash = '#home';
  // Kutib turamiz xarita yuklanishini
  setTimeout(() => {
    if (currentMap) {
      currentMap.flyTo([lat, lng], 16, { animate: true });
      L.popup()
        .setLatLng([lat, lng])
        .setContent(`<strong>${title}</strong>`)
        .openOn(currentMap);
    }
  }, 400);
};

// Initial Run
window.addEventListener('hashchange', () => {
  currentPath = window.location.hash;
  router();
});

// Run permissions check and router
requestPermissions().then(() => {
  router();
});
