export class State {
    constructor() {
        this.user = null;
        this.currentPath = window.location.hash || '#home';
        this.listeners = [];
    }

    setUser(user) {
        this.user = user;
        this.notify();
    }

    setPath(path) {
        this.currentPath = path;
        this.notify();
    }

    addListener(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(l => l(this));
    }
}

export const state = new State();
