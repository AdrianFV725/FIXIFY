// ========================================
// PROFILE MODULE - Mi Perfil
// ========================================

const ProfileModule = {
    user: null,
    employee: null,
    assignedMachines: [],
    assignedLicenses: [],
    myTickets: [],

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        this.user = Auth.getCurrentUser();
        await this.loadData();
        this.render();
        this.bindEvents();
    },

    async loadData() {
        try {
            // Buscar empleado vinculado al usuario por email
            const employees = await Store.getEmployees() || [];
            this.employee = employees.find(e => 
                e.email?.toLowerCase() === this.user?.email?.toLowerCase()
            );

            if (this.employee) {
                // Cargar maquinas asignadas
                this.assignedMachines = await Store.getMachinesByEmployee(this.employee.id) || [];
                
                // Cargar licencias asignadas
                this.assignedLicenses = await Store.getLicensesByEmployee(this.employee.id) || [];

                // Cargar tickets del usuario
                const allTickets = await Store.getTickets() || [];
                this.myTickets = allTickets.filter(t => 
                    t.reportedBy === this.employee.id ||
                    t.createdBy === this.user.email
                ).slice(0, 5);
            } else {
                // Si no hay empleado vinculado, buscar por email del usuario
                const allTickets = await Store.getTickets() || [];
                this.myTickets = allTickets.filter(t => 
                    t.createdBy === this.user.email
                ).slice(0, 5);
            }
        } catch (e) {
            console.error('Error cargando datos de perfil:', e);
        }
    },

    render() {
        const container = document.getElementById('profileContent');
        if (!container) return;

        const initials = Auth.getUserInitials() || '?';
        const roleName = Auth.getRoleName(this.user?.role) || 'Usuario';

        container.innerHTML = `
            <!-- Header del perfil -->
            <div class="profile-header">
                <div class="profile-avatar">${initials}</div>
                <div class="profile-info">
                    <h1 class="profile-name">${this.escapeHtml(this.user?.name || 'Usuario')}</h1>
                    <p class="profile-email">${this.escapeHtml(this.user?.email || '')}</p>
                    <span class="profile-role">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                            <path d="M2 12l10 5 10-5"></path>
                        </svg>
                        ${roleName}
                    </span>
                    ${this.employee ? `
                        <div class="profile-meta">
                            ${this.employee.department ? `
                                <div class="profile-meta-item">
                                    <span class="profile-meta-label">Departamento</span>
                                    <span class="profile-meta-value">${this.getDepartmentName(this.employee.department)}</span>
                                </div>
                            ` : ''}
                            ${this.employee.position ? `
                                <div class="profile-meta-item">
                                    <span class="profile-meta-label">Puesto</span>
                                    <span class="profile-meta-value">${this.escapeHtml(this.employee.position)}</span>
                                </div>
                            ` : ''}
                            ${this.employee.employeeNumber ? `
                                <div class="profile-meta-item">
                                    <span class="profile-meta-label">No. Empleado</span>
                                    <span class="profile-meta-value">${this.escapeHtml(this.employee.employeeNumber)}</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
                <div class="profile-actions">
                    <button class="btn btn-secondary" onclick="ProfileModule.openEditProfileModal()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Editar Perfil
                    </button>
                    <button class="btn btn-ghost" onclick="ProfileModule.openChangePasswordModal()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Cambiar Contrasena
                    </button>
                </div>
            </div>

            <!-- Grid de contenido -->
            <div class="profile-grid">
                <!-- Maquinas asignadas -->
                <div class="profile-section">
                    <div class="section-header">
                        <h2 class="section-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                            </svg>
                            Mis Maquinas
                        </h2>
                        <span class="badge badge-open">${this.assignedMachines.length}</span>
                    </div>
                    <div class="section-content">
                        ${this.renderAssignedMachines()}
                    </div>
                </div>

                <!-- Licencias asignadas -->
                <div class="profile-section">
                    <div class="section-header">
                        <h2 class="section-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            Mis Licencias
                        </h2>
                        <span class="badge badge-resolved">${this.assignedLicenses.length}</span>
                    </div>
                    <div class="section-content">
                        ${this.renderAssignedLicenses()}
                    </div>
                </div>

                <!-- Mis tickets recientes -->
                <div class="profile-section" style="grid-column: span 2;">
                    <div class="section-header">
                        <h2 class="section-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            Mis Tickets Recientes
                        </h2>
                        <a href="tickets.html" class="btn btn-ghost btn-sm">Ver todos</a>
                    </div>
                    <div class="section-content">
                        ${this.renderMyTickets()}
                    </div>
                </div>
            </div>
        `;
    },

    renderAssignedMachines() {
        if (this.assignedMachines.length === 0) {
            return `
                <div class="empty-section">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <p>No tienes maquinas asignadas</p>
                </div>
            `;
        }

        return this.assignedMachines.map(m => `
            <div class="assigned-item">
                <div class="assigned-icon machine">
                    ${this.getMachineIcon(m.type)}
                </div>
                <div class="assigned-info">
                    <div class="assigned-name">${this.escapeHtml(m.name)}</div>
                    <div class="assigned-detail">${m.serialNumber || 'Sin serie'} - ${m.brand || ''} ${m.model || ''}</div>
                    <div class="assigned-date">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        Tipo: ${this.getTypeLabel(m.type)}
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderAssignedLicenses() {
        if (this.assignedLicenses.length === 0) {
            return `
                <div class="empty-section">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <p>No tienes licencias asignadas</p>
                </div>
            `;
        }

        return this.assignedLicenses.map(l => {
            const isExpired = l.expirationDate && new Date(l.expirationDate) < new Date();
            return `
                <div class="assigned-item">
                    <div class="assigned-icon license">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <div class="assigned-info">
                        <div class="assigned-name">${this.escapeHtml(l.software)}</div>
                        <div class="assigned-detail">${l.type || 'Licencia'}</div>
                        ${l.expirationDate ? `
                            <div class="assigned-date" style="${isExpired ? 'color: #ef4444;' : ''}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                ${isExpired ? 'Vencida' : 'Vence'}: ${this.formatDate(l.expirationDate)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    renderMyTickets() {
        if (this.myTickets.length === 0) {
            return `
                <div class="empty-section">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <p>No tienes tickets registrados</p>
                    <button class="btn btn-primary btn-sm" style="margin-top: 1rem;" onclick="window.location.href='tickets.html'">
                        Crear Ticket
                    </button>
                </div>
            `;
        }

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.75rem;">
                ${this.myTickets.map(t => `
                    <div class="ticket-item" onclick="window.location.href='tickets.html'">
                        <div class="ticket-icon ${t.status}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                        </div>
                        <div class="ticket-info">
                            <div class="ticket-title">${this.escapeHtml(t.title || 'Sin titulo')}</div>
                            <div class="ticket-folio">${t.folio || '-'}</div>
                        </div>
                        ${this.getStatusBadge(t.status)}
                    </div>
                `).join('')}
            </div>
        `;
    },

    getMachineIcon(type) {
        const icons = {
            laptop: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="2" y1="20" x2="22" y2="20"></line></svg>`,
            desktop: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
            printer: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`
        };
        return icons[type] || icons.desktop;
    },

    getTypeLabel(type) {
        const labels = { laptop: 'Laptop', desktop: 'Desktop', server: 'Servidor', printer: 'Impresora', other: 'Otro' };
        return labels[type] || type || '-';
    },

    getStatusBadge(status) {
        const config = {
            open: { label: 'Abierto', class: 'badge-open' },
            in_progress: { label: 'En Progreso', class: 'badge-in-progress' },
            resolved: { label: 'Resuelto', class: 'badge-resolved' },
            closed: { label: 'Cerrado', class: 'badge-closed' }
        };
        const c = config[status] || { label: status, class: 'badge' };
        return `<span class="badge ${c.class}">${c.label}</span>`;
    },

    async getDepartmentName(deptId) {
        try {
            const departments = await Store.getDepartments() || [];
            const dept = departments.find(d => d.id === deptId);
            return dept?.name || deptId;
        } catch (e) {
            return deptId;
        }
    },

    bindEvents() {
        // Los eventos de los botones ya estan en los onclick
    },

    // ========================================
    // MODAL EDITAR PERFIL
    // ========================================

    openEditProfileModal() {
        const modalHtml = `
            <div class="modal-overlay active" id="editProfileModal">
                <div class="modal" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Editar Perfil</h2>
                        <button class="modal-close" onclick="document.getElementById('editProfileModal').remove()">&times;</button>
                    </div>
                    <form id="editProfileForm" class="modal-body">
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label class="form-label">Nombre completo</label>
                            <input type="text" name="name" value="${this.escapeHtml(this.user?.name || '')}" class="form-input" required>
                        </div>
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label class="form-label">Correo electronico</label>
                            <input type="email" value="${this.escapeHtml(this.user?.email || '')}" class="form-input" readonly disabled style="opacity: 0.6;">
                            <span class="form-hint">El correo no se puede cambiar</span>
                        </div>
                        ${this.employee ? `
                            <div class="profile-form-row" style="margin-bottom: 1rem;">
                                <div class="form-group">
                                    <label class="form-label">Telefono</label>
                                    <input type="tel" name="phone" value="${this.escapeHtml(this.employee?.phone || '')}" class="form-input" placeholder="Ej: 55 1234 5678">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Extension</label>
                                    <input type="text" name="extension" value="${this.escapeHtml(this.employee?.extension || '')}" class="form-input" placeholder="Ej: 101">
                                </div>
                            </div>
                        ` : ''}
                    </form>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('editProfileModal').remove()">Cancelar</button>
                        <button type="submit" form="editProfileForm" class="btn btn-primary">Guardar Cambios</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                // Actualizar usuario
                const users = await Store.getUsers() || [];
                const userToUpdate = users.find(u => u.email?.toLowerCase() === this.user?.email?.toLowerCase());
                
                if (userToUpdate) {
                    userToUpdate.name = data.name;
                    await Store.saveUser(userToUpdate);
                }

                // Actualizar empleado si existe
                if (this.employee) {
                    this.employee.phone = data.phone || '';
                    this.employee.extension = data.extension || '';
                    await Store.saveEmployee(this.employee);
                }

                // Actualizar sesion
                this.user.name = data.name;
                const storage = localStorage.getItem(Auth.SESSION_KEY) ? localStorage : sessionStorage;
                storage.setItem(Auth.USER_KEY, JSON.stringify(this.user));

                document.getElementById('editProfileModal').remove();
                await this.loadData();
                this.render();
                this.showToast('Perfil actualizado correctamente', 'success');

                // Refrescar sidebar y header
                if (window.Sidebar) Sidebar.refresh();
                if (window.Auth) Auth.renderUserMenu(document.getElementById('userMenu'));
            } catch (error) {
                console.error('Error actualizando perfil:', error);
                this.showToast('Error al actualizar el perfil', 'error');
            }
        });
    },

    // ========================================
    // MODAL CAMBIAR CONTRASENA
    // ========================================

    openChangePasswordModal() {
        const modalHtml = `
            <div class="modal-overlay active" id="changePasswordModal">
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Cambiar Contrasena</h2>
                        <button class="modal-close" onclick="document.getElementById('changePasswordModal').remove()">&times;</button>
                    </div>
                    <form id="changePasswordForm" class="modal-body">
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label class="form-label">Contrasena actual</label>
                            <input type="password" name="currentPassword" class="form-input" required minlength="6">
                        </div>
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label class="form-label">Nueva contrasena</label>
                            <input type="password" name="newPassword" class="form-input" required minlength="6">
                            <span class="form-hint">Minimo 6 caracteres</span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Confirmar nueva contrasena</label>
                            <input type="password" name="confirmPassword" class="form-input" required minlength="6">
                        </div>
                    </form>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('changePasswordModal').remove()">Cancelar</button>
                        <button type="submit" form="changePasswordForm" class="btn btn-primary">Cambiar Contrasena</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            if (data.newPassword !== data.confirmPassword) {
                Modal.alert({
                    title: 'Error',
                    message: 'Las contrasenas no coinciden',
                    type: 'error'
                });
                return;
            }

            if (data.newPassword.length < 6) {
                Modal.alert({
                    title: 'Contrasena muy corta',
                    message: 'La contrasena debe tener al menos 6 caracteres',
                    type: 'warning'
                });
                return;
            }

            // Deshabilitar boton mientras procesa
            const submitBtn = document.querySelector('#changePasswordModal .btn-primary');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Cambiando...';
            }

            try {
                // Usar el nuevo metodo de Auth que maneja Firebase Auth
                const result = await Auth.changeOwnPassword(data.currentPassword, data.newPassword);

                document.getElementById('changePasswordModal').remove();

                if (result.success) {
                    this.showToast('Contrasena actualizada correctamente', 'success');
                } else {
                    Modal.alert({
                        title: 'Error',
                        message: result.message,
                        type: 'error'
                    });
                }
            } catch (error) {
                console.error('Error cambiando contrasena:', error);
                document.getElementById('changePasswordModal').remove();
                Modal.alert({
                    title: 'Error',
                    message: error.message || 'Error al cambiar la contrasena',
                    type: 'error'
                });
            }
        });
    },

    // ========================================
    // UTILIDADES
    // ========================================

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    showToast(message, type = 'success') {
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f97316',
            info: '#3b82f6'
        };

        const toast = document.createElement('div');
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                ${type === 'success' ? `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                ` : type === 'error' ? `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                ` : `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                `}
                <span>${message}</span>
            </div>
        `;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${colors[type] || colors.success};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => ProfileModule.init(), 100);
});

window.ProfileModule = ProfileModule;

