// ========================================
// NOTIFICATIONS - Sistema de notificaciones toast
// ========================================

const Toast = {
    container: null,
    defaultDuration: 4000,

    // ========================================
    // INICIALIZACION
    // ========================================

    init() {
        // Crear contenedor si no existe
        if (!this.container) {
            this.container = document.getElementById('toastContainer');
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.className = 'toast-container';
                this.container.id = 'toastContainer';
                document.body.appendChild(this.container);
            }
        }
    },

    // ========================================
    // MOSTRAR TOAST
    // ========================================

    /**
     * Muestra una notificacion toast
     * @param {Object} options - Opciones del toast
     * @param {string} options.title - Titulo del toast
     * @param {string} options.message - Mensaje del toast
     * @param {string} options.type - Tipo: success, error, warning, info
     * @param {number} options.duration - Duracion en ms (0 para no auto-cerrar)
     */
    show(options = {}) {
        this.init();

        const {
            title = '',
            message = '',
            type = 'info',
            duration = this.defaultDuration
        } = options;

        const icons = {
            success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
            error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
            warning: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
            info: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
        };

        // Crear elemento toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <div class="toast-content">
                ${title ? `<span class="toast-title">${Utils?.escapeHtml(title) || title}</span>` : ''}
                ${message ? `<span class="toast-message">${Utils?.escapeHtml(message) || message}</span>` : ''}
            </div>
            <button class="toast-close" aria-label="Cerrar">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        // Agregar al contenedor
        this.container.appendChild(toast);

        // Event listener para cerrar
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.dismiss(toast);
        });

        // Auto-cerrar si tiene duracion
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(toast);
            }, duration);
        }

        return toast;
    },

    /**
     * Cierra un toast
     * @param {HTMLElement} toast - Elemento toast
     */
    dismiss(toast) {
        if (!toast || !toast.parentElement) return;

        toast.classList.add('hiding');
        setTimeout(() => {
            toast.remove();
        }, 300);
    },

    /**
     * Cierra todos los toasts
     */
    dismissAll() {
        this.init();
        this.container.querySelectorAll('.toast').forEach(toast => {
            this.dismiss(toast);
        });
    },

    // ========================================
    // METODOS DE CONVENIENCIA
    // ========================================

    /**
     * Toast de exito
     */
    success(message, title = 'Exito') {
        return this.show({ title, message, type: 'success' });
    },

    /**
     * Toast de error
     */
    error(message, title = 'Error') {
        return this.show({ title, message, type: 'error', duration: 6000 });
    },

    /**
     * Toast de advertencia
     */
    warning(message, title = 'Advertencia') {
        return this.show({ title, message, type: 'warning', duration: 5000 });
    },

    /**
     * Toast informativo
     */
    info(message, title = '') {
        return this.show({ title, message, type: 'info' });
    },

    /**
     * Toast de carga (no se cierra automaticamente)
     */
    loading(message = 'Cargando...') {
        return this.show({
            title: '',
            message: `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="loading-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
                    <span>${message}</span>
                </div>
            `,
            type: 'info',
            duration: 0
        });
    },

    /**
     * Muestra toast de operacion con resultado
     * @param {Promise} promise - Promesa a esperar
     * @param {Object} messages - Mensajes { loading, success, error }
     */
    async promise(promise, messages = {}) {
        const {
            loading = 'Procesando...',
            success = 'Operacion exitosa',
            error = 'Ocurrio un error'
        } = messages;

        const loadingToast = this.loading(loading);

        try {
            const result = await promise;
            this.dismiss(loadingToast);
            this.success(typeof success === 'function' ? success(result) : success);
            return result;
        } catch (err) {
            this.dismiss(loadingToast);
            this.error(typeof error === 'function' ? error(err) : (err.message || error));
            throw err;
        }
    }
};

// Exportar para uso global
window.Toast = Toast;

