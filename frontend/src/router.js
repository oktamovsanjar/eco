import { state } from './state.js';

export const router = {
    async handleHashChange() {
        const path = window.location.hash || '#home';
        state.setPath(path);
    },

    init() {
        window.addEventListener('hashchange', () => this.handleHashChange());
        this.handleHashChange();
    }
};
