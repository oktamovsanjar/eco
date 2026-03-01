export class BaseView {
    constructor() {
        this.container = null;
    }

    mount(container) {
        this.container = container;
        this.render();
        this.afterRender();
    }

    render() {
        // To be implemented by subclasses
    }

    afterRender() {
        // To be implemented by subclasses
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    destroy() {
        // Cleanup logic if needed
    }
}
