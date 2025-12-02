// ========================================
// MODAL - Sistema de modales
// ========================================

const Modal = {
    // Estado
    activeModal: null,
    
    // ========================================
    // ABRIR MODAL
    // ========================================

    /**
     * Abre un modal con contenido
     * @param {Object} options - Opciones del modal
     * @param {string} options.title - Titulo del modal
     * @param {string} options.content - Contenido HTML
     * @param {string} options.size - Tamano: 'sm', 'md', 'lg', 'xl'
     * @param {Function} options.onClose - Callback al cerrar
     * @param {Array} options.buttons - Botones del footer
     */
    open(options = {}) {
        const {
            title = '',
            content = '',
            size = 'md',
            onClose = null,
            buttons = [],
            closable = true
        } = options;

        // Crear overlay si no existe
        let overlay = document.getElementById('modalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.id = 'modalOverlay';
            document.body.appendChild(overlay);
        }

        // Determinar clase de tamano
        const sizeClass = {
            sm: '',
            md: '',
            lg: 'modal-lg',
            xl: 'modal-xl'
        }[size] || '';

        // Renderizar modal
        overlay.innerHTML = `
            <div class="modal ${sizeClass}">
                <div class="modal-header">
                    <h2 class="modal-title">${Utils?.escapeHtml(title) || title}</h2>
                    ${closable ? `
                        <button class="modal-close" data-action="close">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    ` : ''}
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${buttons.length > 0 ? `
                    <div class="modal-footer">
                        ${this.renderButtons(buttons)}
                    </div>
                ` : ''}
            </div>
        `;

        // Guardar callback de cierre
        this.activeModal = {
            overlay,
            onClose
        };

        // Mostrar modal
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });

        // Event listeners
        this.bindModalEvents(overlay, closable);

        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';

        return overlay;
    },

    /**
     * Renderiza los botones del footer
     */
    renderButtons(buttons) {
        return buttons.map(btn => {
            const className = `btn ${btn.variant || 'btn-secondary'}`;
            const icon = btn.icon || '';
            return `
                <button class="${className}" data-action="${btn.action || 'close'}">
                    ${icon}
                    ${btn.label}
                </button>
            `;
        }).join('');
    },

    /**
     * Configura eventos del modal
     */
    bindModalEvents(overlay, closable) {
        // Cerrar con X
        overlay.querySelector('[data-action="close"]')?.addEventListener('click', () => {
            this.close();
        });

        // Cerrar al hacer click fuera
        if (closable) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.close();
                }
            });
        }

        // Cerrar con Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape' && closable) {
                this.close();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Manejar botones de accion
        overlay.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                if (action && action !== 'close') {
                    // Disparar evento custom para la accion
                    overlay.dispatchEvent(new CustomEvent('modal-action', {
                        detail: { action }
                    }));
                }
            });
        });
    },

    // ========================================
    // CERRAR MODAL
    // ========================================

    /**
     * Cierra el modal activo
     */
    close() {
        if (!this.activeModal) return;

        const { overlay, onClose } = this.activeModal;
        
        overlay.classList.remove('active');
        
        // Esperar animacion
        setTimeout(() => {
            overlay.innerHTML = '';
            document.body.style.overflow = '';
            
            // Callback de cierre
            if (onClose) onClose();
            
            this.activeModal = null;
        }, 300);
    },

    // ========================================
    // MODALES PREDEFINIDOS
    // ========================================

    /**
     * Modal de confirmacion
     * @param {Object} options - Opciones
     * @returns {Promise<boolean>} - True si confirmo, false si cancelo
     */
    confirm(options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Confirmar accion',
                message = 'Esta seguro de realizar esta accion?',
                confirmText = 'Confirmar',
                cancelText = 'Cancelar',
                variant = 'btn-primary',
                icon = ''
            } = options;

            const overlay = this.open({
                title,
                content: `
                    <div style="text-align: center; padding: 0.5rem 0;">
                        ${icon ? `<div style="margin-bottom: 1rem;">${icon}</div>` : ''}
                        <p style="color: var(--text-secondary); font-size: 0.95rem;">${message}</p>
                    </div>
                `,
                size: 'sm',
                buttons: [
                    { label: cancelText, action: 'cancel', variant: 'btn-secondary' },
                    { label: confirmText, action: 'confirm', variant }
                ],
                onClose: () => resolve(false)
            });

            overlay.addEventListener('modal-action', (e) => {
                if (e.detail.action === 'confirm') {
                    resolve(true);
                } else {
                    resolve(false);
                }
                this.close();
            });
        });
    },

    /**
     * Modal de confirmacion de eliminacion - VERSION MEJORADA
     * @param {string} itemName - Nombre del item a eliminar
     * @param {string} itemType - Tipo de item (empleado, maquina, etc)
     * @returns {Promise<boolean>}
     */
    confirmDelete(itemName, itemType = 'registro') {
        return new Promise((resolve) => {
            // Crear overlay
            let overlay = document.getElementById('modalOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'modal-overlay';
                overlay.id = 'modalOverlay';
                document.body.appendChild(overlay);
            }

            const escapedName = Utils?.escapeHtml(itemName) || itemName;

            overlay.innerHTML = `
                <div class="modal" style="max-width: 420px;">
                    <div class="modal-header" style="border-bottom: none; padding-bottom: 0;">
                        <h2 class="modal-title">Eliminar ${itemType}</h2>
                        <button class="modal-close" data-action="cancel">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body" style="text-align: center; padding: 1.5rem;">
                        <div class="delete-modal-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </div>
                        <p class="delete-modal-message">
                            Estas a punto de eliminar
                        </p>
                        <p class="delete-modal-item">
                            "${escapedName}"
                        </p>
                        <p class="delete-modal-warning">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            Esta accion no se puede deshacer
                        </p>
                    </div>
                    <div class="modal-footer" style="border-top: none; padding-top: 0; justify-content: center; gap: 1rem;">
                        <button class="btn btn-secondary" data-action="cancel" style="min-width: 120px;">
                            Cancelar
                        </button>
                        <button class="btn btn-danger" data-action="confirm" style="min-width: 120px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Eliminar
                        </button>
                    </div>
                </div>
            `;

            // Guardar estado
            this.activeModal = {
                overlay,
                onClose: () => resolve(false)
            };

            // Mostrar modal
            requestAnimationFrame(() => {
                overlay.classList.add('active');
            });

            document.body.style.overflow = 'hidden';

            // Eventos
            const handleAction = (action) => {
                if (action === 'confirm') {
                    resolve(true);
                } else {
                    resolve(false);
                }
                this.close();
            };

            overlay.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', () => handleAction(btn.dataset.action));
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) handleAction('cancel');
            });

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleAction('cancel');
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    },

    /**
     * Modal de alerta/informacion
     * @param {Object} options - Opciones
     */
    alert(options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Informacion',
                message = '',
                buttonText = 'Aceptar',
                type = 'info' // info, success, warning, error
            } = options;

            const icons = {
                info: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
                success: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
                warning: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
                error: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
            };

            this.open({
                title,
                content: `
                    <div style="text-align: center; padding: 1rem 0;">
                        <div style="margin-bottom: 1rem;">${icons[type]}</div>
                        <p style="color: var(--text-secondary);">${message}</p>
                    </div>
                `,
                size: 'sm',
                buttons: [
                    { label: buttonText, action: 'close', variant: 'btn-primary' }
                ],
                onClose: () => resolve()
            });
        });
    },

    /**
     * Modal con formulario
     * @param {Object} options - Opciones
     * @param {string} options.title - Titulo
     * @param {Array} options.fields - Campos del formulario
     * @param {Object} options.data - Datos iniciales
     * @returns {Promise<Object|null>} - Datos del formulario o null si cancelo
     */
    form(options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Formulario',
                fields = [],
                data = {},
                submitText = 'Guardar',
                size = 'md'
            } = options;

            const formHtml = this.buildForm(fields, data);

            const overlay = this.open({
                title,
                content: `<form class="form" id="modalForm">${formHtml}</form>`,
                size,
                buttons: [
                    { label: 'Cancelar', action: 'cancel', variant: 'btn-secondary' },
                    { label: submitText, action: 'submit', variant: 'btn-primary' }
                ],
                onClose: () => resolve(null)
            });

            // Manejar submit
            overlay.addEventListener('modal-action', (e) => {
                if (e.detail.action === 'submit') {
                    const form = overlay.querySelector('#modalForm');
                    if (form.checkValidity()) {
                        const formData = new FormData(form);
                        const result = Object.fromEntries(formData);
                        resolve(result);
                        this.close();
                    } else {
                        form.reportValidity();
                    }
                } else {
                    resolve(null);
                    this.close();
                }
            });

            // Focus en primer campo
            setTimeout(() => {
                overlay.querySelector('.form-input, .form-select, .form-textarea')?.focus();
            }, 100);
        });
    },

    /**
     * Construye el HTML de un formulario
     * @param {Array} fields - Campos
     * @param {Object} data - Datos iniciales
     */
    buildForm(fields, data = {}) {
        return fields.map(field => {
            const value = data[field.name] || field.default || '';
            const required = field.required ? 'required' : '';
            const requiredMark = field.required ? '<span class="required">*</span>' : '';

            switch (field.type) {
                case 'text':
                case 'email':
                case 'number':
                case 'date':
                case 'password':
                    return `
                        <div class="form-group ${field.fullWidth ? 'full-width' : ''}">
                            <label class="form-label">${field.label}${requiredMark}</label>
                            <input 
                                type="${field.type}" 
                                name="${field.name}" 
                                class="form-input"
                                value="${Utils?.escapeHtml(value) || value}"
                                placeholder="${field.placeholder || ''}"
                                ${required}
                                ${field.min !== undefined ? `min="${field.min}"` : ''}
                                ${field.max !== undefined ? `max="${field.max}"` : ''}
                            >
                            ${field.hint ? `<span class="form-hint">${field.hint}</span>` : ''}
                        </div>
                    `;

                case 'textarea':
                    return `
                        <div class="form-group ${field.fullWidth ? 'full-width' : ''}">
                            <label class="form-label">${field.label}${requiredMark}</label>
                            <textarea 
                                name="${field.name}" 
                                class="form-textarea"
                                placeholder="${field.placeholder || ''}"
                                rows="${field.rows || 3}"
                                ${required}
                            >${Utils?.escapeHtml(value) || value}</textarea>
                        </div>
                    `;

                case 'select':
                    const options = (field.options || []).map(opt => {
                        const selected = opt.value === value ? 'selected' : '';
                        return `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
                    }).join('');
                    
                    return `
                        <div class="form-group ${field.fullWidth ? 'full-width' : ''}">
                            <label class="form-label">${field.label}${requiredMark}</label>
                            <select name="${field.name}" class="form-select" ${required}>
                                <option value="">Seleccionar...</option>
                                ${options}
                            </select>
                        </div>
                    `;

                case 'checkbox':
                    return `
                        <div class="form-group ${field.fullWidth ? 'full-width' : ''}">
                            <label class="checkbox-item">
                                <input type="checkbox" name="${field.name}" ${value ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                <span>${field.label}</span>
                            </label>
                        </div>
                    `;

                default:
                    return '';
            }
        }).join('');
    },

    // ========================================
    // MODAL PERSONALIZADO
    // ========================================

    /**
     * Actualiza el contenido del modal activo
     * @param {string} content - Nuevo contenido HTML
     */
    updateContent(content) {
        if (!this.activeModal) return;
        
        const body = this.activeModal.overlay.querySelector('.modal-body');
        if (body) {
            body.innerHTML = content;
        }
    },

    /**
     * Obtiene referencia al modal activo
     * @returns {HTMLElement|null}
     */
    getActiveModal() {
        return this.activeModal?.overlay || null;
    }
};

// Exportar para uso global
window.Modal = Modal;
