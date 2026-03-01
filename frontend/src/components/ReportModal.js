import { api } from '../api.js';

export class ReportModal {
    constructor(onSuccess) {
        this.onSuccess = onSuccess;
        this.selectedLocation = null;
        this.address = '';
        this.region = '';
        this.district = '';
    }

    open(location, address, region = '', district = '') {
        this.selectedLocation = location;
        this.address = address;
        this.region = region;
        this.district = district;
        this.render();
        this.setEvents();
    }

    render() {
        const portal = document.getElementById('portal');
        portal.innerHTML = `
            <div class="modal-overlay animate-fade-in" id="report-modal">
                <div class="modal-content glass premium-shadow animate-in">
                    <div class="modal-header">
                        <h2>Yangi shikoyat</h2>
                        <button id="close-modal" class="btn-ghost" style="width:32px; height:32px; padding:0; border-radius:50%;">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    
                    <div class="selection-info glass">
                        <i data-lucide="map-pin" style="color:var(--danger);"></i>
                        <span>${this.address}</span>
                    </div>

                    <form id="report-form">
                        <div class="form-group">
                            <label class="form-label">Sarlavha</label>
                            <input type="text" id="report-title" class="form-input" placeholder="Masalan: Yo'ldagi chuqurlar" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Kategoriya</label>
                            <select id="report-category" class="form-select" required>
                                <option value="ekologiya">🌿 Ekologiya</option>
                                <option value="yol_qurilish">🚧 Yo'l qurilishi</option>
                                <option value="suv_muammosi">💧 Suv muammosi</option>
                                <option value="havo_ifloslanishi">💨 Havo ifloslanishi</option>
                                <option value="chiqindi">🗑️ Chiqindi</option>
                                <option value="shovqin">🔊 Shovqin</option>
                                <option value="daraxt_kesish">🌳 Daraxt kesish</option>
                                <option value="qurilish_buzilishi">🏗️ Qurilish buzilishi</option>
                                <option value="boshqa">📌 Boshqa</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Muhimlik darajasi</label>
                            <select id="report-priority" class="form-select">
                                <option value="past">🟢 Past</option>
                                <option value="o'rta" selected>🟡 O'rta</option>
                                <option value="yuqori">🟠 Yuqori</option>
                                <option value="juda_muhim">🔴 Juda muhim</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Batafsil tavsif</label>
                            <textarea id="report-desc" class="form-textarea" rows="4" placeholder="Muammo haqida batafsil ma'lumot bering..." required></textarea>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Rasm yuklash</label>
                            <div class="file-upload-wrapper glass">
                                <input type="file" id="report-image" accept="image/*">
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary" style="width:100%; height:52px;" id="submit-report">
                            Yuborish <i data-lucide="send"></i>
                        </button>
                    </form>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    }

    setEvents() {
        const modal = document.getElementById('report-modal');
        const closeBtn = document.getElementById('close-modal');
        const form = document.getElementById('report-form');

        closeBtn.onclick = () => this.close();
        modal.onclick = (e) => { if (e.target === modal) this.close(); };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submit-report');

            const data = {
                title: document.getElementById('report-title').value,
                description: document.getElementById('report-desc').value,
                category: document.getElementById('report-category').value,
                latitude: this.selectedLocation.lat,
                longitude: this.selectedLocation.lng,
                address: this.address,
                region: this.region || null,
                district: this.district || null,
                priority: document.getElementById('report-priority').value || 'o\'rta',
            };

            try {
                btn.disabled = true;
                btn.innerHTML = '<i data-lucide="loader" class="rotate"></i> Yuborilmoqda...';
                if (window.lucide) window.lucide.createIcons();

                const report = await api.createReport(data);

                const imageFile = document.getElementById('report-image').files[0];
                if (imageFile) {
                    await api.uploadImage(report.id, imageFile);
                }

                alert("Muvaffaqiyatli yuborildi!");
                this.close();
                if (this.onSuccess) this.onSuccess();
            } catch (err) {
                alert("Xatolik: " + err.message);
                btn.disabled = false;
                btn.innerHTML = 'Yuborish <i data-lucide="send"></i>';
                if (window.lucide) window.lucide.createIcons();
            }
        };
    }

    close() {
        const modal = document.getElementById('report-modal');
        if (modal) {
            modal.classList.remove('animate-fade-in');
            modal.style.opacity = '0';
            setTimeout(() => {
                document.getElementById('portal').innerHTML = '';
            }, 300);
        }
    }
}
