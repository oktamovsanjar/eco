const API_BASE = "/api";

export const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem("token");
        const headers = {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        };

        // Don't set Content-Type for FormData (browser will set it with boundary)
        if (!(options.body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem("token");
                window.location.hash = "#login";
            }
            const error = await response.json();
            let msg = "Xatolik yuz berdi";
            if (typeof error.detail === 'string') {
                msg = error.detail;
            } else if (Array.isArray(error.detail)) {
                // Handle FastAPI validation errors
                msg = error.detail.map(d => `${d.loc[1]}: ${d.msg}`).join('\n');
            }
            throw new Error(msg);
        }

        return response.json();
    },

    async login(email, password) {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Email yoki parol noto'g'ri");
        }

        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        return data;
    },

    async getMe() {
        return this.request("/auth/me");
    },

    async getReports(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/reports?${query}`);
    },

    async createReport(data) {
        return this.request("/reports", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    async uploadImage(reportId, file) {
        const formData = new FormData();
        formData.append("file", file);
        return this.request(`/reports/${reportId}/images`, {
            method: "POST",
            body: formData,
        });
    },

    async getStats() {
        return this.request("/reports/stats");
    },

    async getLeaderboard() {
        return this.request("/auth/leaderboard");
    },

    async getReport(id) {
        return this.request(`/reports/${id}`);
    },

    async upvoteReport(id) {
        return this.request(`/reports/${id}/upvote`, {
            method: "POST",
        });
    },
};
