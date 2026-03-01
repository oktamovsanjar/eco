import { BaseView } from './BaseView.js';
import { api } from '../api.js';
import { ReportModal } from '../components/ReportModal.js';
import L from 'leaflet';

export class HomeView extends BaseView {
    constructor() {
        super();
        this.map = null;
        this.selectedLocation = null;
        this.marker = null;
        this.address = 'Xaritadan joyni tanlang';
        this.region = '';
        this.district = '';
        this.reportModal = new ReportModal(() => this.loadReports());
    }

    render() {
        this.container.innerHTML = `
            <div id="map-container" class="animate-fade-in">
                <div id="map"></div>
                
                <div class="map-search">
                    <div class="search-wrapper">
                        <i data-lucide="search" class="search-icon"></i>
                        <input type="text" placeholder="Manzilni qidirish..." class="search-input" id="map-search-input">
                    </div>
                </div>

                <div class="map-controls">
                    <button class="map-btn" id="locate-btn" title="Mening joylashuvim">
                        <i data-lucide="crosshair"></i>
                    </button>
                    <button class="map-btn" id="add-report-btn" title="Yangi shikoyat">
                        <i data-lucide="plus"></i>
                    </button>
                </div>

                <div id="report-drawer" class="report-drawer glass">
                    <div class="drawer-header">
                        <h3 id="drawer-title">Hisobot tafsilotlari</h3>
                        <button class="btn-ghost" id="close-drawer">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <div id="drawer-content" class="drawer-content">
                        <!-- Report details loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    afterRender() {
        super.afterRender();
        this.initMap();
        this.setEvents();
    }

    initMap() {
        this.map = L.map('map', {
            zoomControl: false,
            attributionControl: false
        }).setView([41.2995, 69.2401], 13);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(this.map);

        this.loadReports();

        // Default location request
        this.map.locate({ setView: true, maxZoom: 16 });
    }

    setEvents() {
        const locateBtn = document.getElementById('locate-btn');
        if (locateBtn) {
            locateBtn.onclick = () => {
                locateBtn.classList.add('rotate');
                this.map.locate({ setView: true, maxZoom: 16 });
            };
        }

        const addBtn = document.getElementById('add-report-btn');
        if (addBtn) {
            addBtn.onclick = () => this.openAddReportModal();
        }

        const closeDrawerBtn = document.getElementById('close-drawer');
        if (closeDrawerBtn) {
            closeDrawerBtn.onclick = () => this.toggleDrawer(false);
        }

        this.map.on('locationfound', (e) => {
            const locateBtn = document.getElementById('locate-btn');
            if (locateBtn) locateBtn.classList.remove('rotate');
            this.updateSelection(e.latlng);
        });

        this.map.on('locationerror', () => {
            const locateBtn = document.getElementById('locate-btn');
            if (locateBtn) locateBtn.classList.remove('rotate');
            console.warn('Geolocation failed');
        });

        this.map.on('click', (e) => this.updateSelection(e.latlng));
    }

    async loadReports() {
        try {
            const reports = await api.getReports({ limit: 100 });
            reports.forEach(r => {
                if (r.latitude && r.longitude) {
                    const color = this.getStatusColor(r.status);
                    const marker = L.marker([r.latitude, r.longitude], {
                        icon: L.divIcon({
                            className: 'report-marker-wrapper',
                            html: `<div class="report-marker-pin" style="background: ${color}; box-shadow: 0 0 10px ${color}60;"></div>`,
                            iconSize: [16, 16],
                            iconAnchor: [8, 8]
                        })
                    }).addTo(this.map);

                    marker.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        this.showReportDetail(r.id);
                    });
                }
            });
        } catch (e) {
            console.error('Failed to load map reports:', e);
        }
    }

    getStatusColor(status) {
        const colors = {
            'kutilmoqda': '#f59e0b',
            'tekshirilmoqda': '#3b82f6',
            'hal_qilindi': '#10b981',
            'rad_etilgan': '#ef4444'
        };
        return colors[status] || '#94a3b8';
    }

    async updateSelection(latlng) {
        this.selectedLocation = latlng;
        if (this.marker) {
            this.marker.setLatLng(latlng);
        } else {
            this.marker = L.marker(latlng, {
                icon: L.divIcon({
                    className: 'custom-div-icon',
                    html: '<div class="pulse-marker"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(this.map);
        }

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`);
            const data = await res.json();
            const addr = data.address || {};
            const city = addr.city || addr.town || addr.village || 'Toshkent';
            const district = addr.suburb || addr.district || addr.county || '';
            const road = addr.road || '';
            this.address = `${city}${district ? ', ' + district : ''}${road ? ', ' + road : ''}`;

            // Region va district ni aniqroq saqlash
            this.region = addr.state || city;
            this.district = district;
        } catch (e) {
            this.address = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
            this.region = '';
            this.district = '';
        }
    }

    async showReportDetail(id) {
        this.toggleDrawer(true);
        const contentEl = document.getElementById('drawer-content');
        contentEl.innerHTML = '<div class="loader">Yuklanmoqda...</div>';

        try {
            const report = await api.request(`/reports/${id}`);
            contentEl.innerHTML = `
                <div class="report-detail animate-fade-in">
                    <span class="status-badge" style="background:${this.getStatusColor(report.status)}15; color:${this.getStatusColor(report.status)};">
                        ${report.status}
                    </span>
                    <h2 class="detail-title">${report.title}</h2>
                    <p class="detail-address"><i data-lucide="map-pin"></i> ${report.address || 'Manzil ko\'rsatilmagan'}</p>
                    
                    ${report.images?.[0] ? `<img src="${report.images[0].image_url}" class="detail-img">` : ''}
                    
                    <div class="detail-desc glass">
                        <p>${report.description}</p>
                    </div>

                    <div class="detail-stats">
                        <div class="stat-item glass">
                            <span class="stat-val">${report.upvotes || 0}</span>
                            <span class="stat-label">Ovozlar</span>
                        </div>
                        <div class="stat-item glass">
                            <span class="stat-val">${report.views_count || 0}</span>
                            <span class="stat-label">Ko'rishlar</span>
                        </div>
                    </div>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        } catch (e) {
            contentEl.innerHTML = '<p class="error">Xatolik yuz berdi</p>';
        }
    }

    toggleDrawer(show) {
        const drawer = document.getElementById('report-drawer');
        if (drawer) {
            drawer.classList.toggle('open', show);
        }
    }

    openAddReportModal() {
        if (!this.selectedLocation) {
            alert("Iltimos, avval xaritadan joyni tanlang");
            return;
        }
        this.reportModal.open(this.selectedLocation, this.address, this.region, this.district);
    }

    destroy() {
        if (this.map) {
            this.map.remove();
        }
    }
}
