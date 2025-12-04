// ========================================
// USER DETAIL MODULE
// Página de detalle y administración de usuario
// ========================================

const UserDetailModule = {
    user: null,
    machines: [],
    licenses: [],
    tickets: [],
    machineAssignments: [],
    licenseAssignments: [],
    departments: [],
    employees: [],
    userId: null,
    employeeId: null,

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        // Obtener ID de la URL
        const urlParams = new URLSearchParams(window.location.search);
        this.userId = urlParams.get('id');

        if (!this.userId) {
            this.showError('No se especificó un usuario');
            return;
        }

        await this.loadData();
        this.render();
        this.bindEvents();
    },

    async loadData() {
        try {
            const [user, machines, licenses, tickets, machineAssignments, licenseAssignments, departments, employees] = await Promise.all([
                Store.getUserById(this.userId),
                Store.getMachines(),
                Store.getLicenses(),
                Store.getTickets(),
                Store.getMachineAssignments(),
                Store.getLicenseAssignments(),
                Store.getDepartments(),
                Store.getEmployees()
            ]);

            if (!user) {
                this.showError('Usuario no encontrado');
                return;
            }

            this.user = user;
            this.machines = machines || [];
            this.licenses = licenses || [];
            this.tickets = tickets || [];
            this.machineAssignments = machineAssignments || [];
            this.licenseAssignments = licenseAssignments || [];
            this.departments = departments || [];
            this.employees = employees || [];

            // Buscar el empleado correspondiente al usuario por email
            if (this.user.email) {
                const employee = this.employees.find(e => 
                    e.email && e.email.toLowerCase() === this.user.email.toLowerCase()
                );
                if (employee) {
                    this.employeeId = employee.id;
                }
            }
        } catch (e) {
            console.error('Error cargando datos:', e);
            this.showError('Error al cargar los datos del usuario');
        }
    },

    getUserAssignments() {
        // Buscar asignaciones por employeeId (el campo correcto) o userId (por compatibilidad)
        const activeMachineAssignments = this.machineAssignments.filter(a => 
            (a.employeeId === this.employeeId || a.userId === this.userId) && !a.endDate
        );
        const allMachineAssignments = this.machineAssignments.filter(a => 
            a.employeeId === this.employeeId || a.userId === this.userId
        ).sort((a, b) => {
            const dateA = new Date(a.endDate || a.startDate);
            const dateB = new Date(b.endDate || b.startDate);
            return dateB - dateA;
        });

        const activeLicenseAssignments = this.licenseAssignments.filter(a => 
            (a.employeeId === this.employeeId || a.userId === this.userId) && !a.endDate
        );
        const allLicenseAssignments = this.licenseAssignments.filter(a => 
            a.employeeId === this.employeeId || a.userId === this.userId
        ).sort((a, b) => {
            const dateA = new Date(a.endDate || a.startDate);
            const dateB = new Date(b.endDate || b.startDate);
            return dateB - dateA;
        });

        // Obtener tickets del usuario (solo si es employee)
        const userTickets = this.user.role === 'employee' 
            ? this.tickets.filter(t => t.contactoId === this.userId || t.contactoId === this.employeeId || t.contactoEmail === this.user.email)
            : [];

        return {
            activeMachineAssignments,
            allMachineAssignments,
            activeLicenseAssignments,
            allLicenseAssignments,
            userTickets
        };
    },

    render() {
        const container = document.getElementById('userDetailContent');
        if (!container || !this.user) return;

        const assignments = this.getUserAssignments();
        const department = this.departments.find(d => d.id === this.user.department);
        const initials = `${this.user.name?.charAt(0) || ''}${this.user.lastName?.charAt(0) || ''}`.toUpperCase();

        // Obtener máquinas y licencias activas
        const activeMachines = assignments.activeMachineAssignments.map(a => {
            const machine = this.machines.find(m => m.id === a.machineId);
            return machine ? { ...machine, assignment: a } : null;
        }).filter(Boolean);

        const activeLicenses = assignments.activeLicenseAssignments.map(a => {
            const license = this.licenses.find(l => l.id === a.licenseId);
            return license ? { ...license, assignment: a } : null;
        }).filter(Boolean);

        container.innerHTML = `
            <!-- Estadísticas rápidas -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value" style="color: #3b82f6;">${activeMachines.length}</div>
                    <div class="stat-label">Máquinas Asignadas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #a855f7;">${activeLicenses.length}</div>
                    <div class="stat-label">Licencias Asignadas</div>
                </div>
                ${this.user.role === 'employee' ? `
                    <div class="stat-card">
                        <div class="stat-value" style="color: #f59e0b;">${assignments.userTickets.length}</div>
                        <div class="stat-label">Tickets</div>
                    </div>
                ` : ''}
                <div class="stat-card">
                    <div class="stat-value" style="color: #22c55e;">${assignments.allMachineAssignments.length}</div>
                    <div class="stat-label">Total Máquinas (Histórico)</div>
                </div>
            </div>

            <!-- Información del usuario -->
            <div class="user-info-card">
                <div class="user-info-header">
                    <div style="display: flex; align-items: flex-start;">
                        <div class="user-avatar-large">${initials}</div>
                        <div class="user-title-section">
                            <h2 class="user-title">${this.escapeHtml(this.user.name || '')} ${this.escapeHtml(this.user.lastName || '')}</h2>
                            <div class="user-meta">
                                <div class="user-meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                    <span>${this.escapeHtml(this.user.email || 'N/A')}</span>
                                </div>
                                ${this.user.employeeNumber ? `
                                    <div class="user-meta-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        <span>No. ${this.escapeHtml(this.user.employeeNumber)}</span>
                                    </div>
                                ` : ''}
                                <div class="user-meta-item">
                                    <span class="badge ${this.user.role === 'admin' ? 'badge-open' : this.user.role === 'employee' ? 'badge-in-progress' : 'badge-resolved'}">${this.getRoleName(this.user.role)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <button class="btn btn-secondary" onclick="UserDetailModule.editUser()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Editar
                        </button>
                    </div>
                </div>

                <div class="user-specs-grid">
                    ${this.user.role === 'employee' ? `
                        <div class="user-spec-card">
                            <div class="user-spec-label">Departamento</div>
                            <div class="user-spec-value">
                                ${department ? `
                                    <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
                                        <span style="width: 12px; height: 12px; border-radius: 3px; background: ${department.color || '#3b82f6'};"></span>
                                        ${this.escapeHtml(department.name)}
                                    </span>
                                ` : '<span style="color: var(--text-tertiary);">Sin departamento</span>'}
                            </div>
                        </div>
                        <div class="user-spec-card">
                            <div class="user-spec-label">Puesto</div>
                            <div class="user-spec-value">${this.escapeHtml(this.user.position || 'N/A')}</div>
                        </div>
                    ` : ''}
                    <div class="user-spec-card">
                        <div class="user-spec-label">Estado</div>
                        <div class="user-spec-value">
                            ${this.user.status === 'active' 
                                ? '<span style="color: #22c55e; font-weight: 600;">Activo</span>'
                                : '<span style="color: #ef4444; font-weight: 600;">Inactivo</span>'}
                        </div>
                    </div>
                    ${this.user.phone ? `
                        <div class="user-spec-card">
                            <div class="user-spec-label">Teléfono</div>
                            <div class="user-spec-value">${this.escapeHtml(this.user.phone)}</div>
                        </div>
                    ` : ''}
                    ${this.user.startDate ? `
                        <div class="user-spec-card">
                            <div class="user-spec-label">Fecha de Inicio</div>
                            <div class="user-spec-value">${this.formatDate(this.user.startDate)}</div>
                        </div>
                    ` : ''}
                    <div class="user-spec-card">
                        <div class="user-spec-label">Último Acceso</div>
                        <div class="user-spec-value">${this.user.lastLogin ? this.formatDateTime(this.user.lastLogin) : 'Nunca'}</div>
                    </div>
                </div>
            </div>

            <!-- Máquinas asignadas -->
            <div class="assignments-section">
                <div class="section-header">
                    <h3 class="section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        Máquinas Asignadas
                    </h3>
                </div>

                ${activeMachines.length === 0 ? `
                    <div class="empty-resources">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        <p>Este usuario no tiene máquinas asignadas actualmente</p>
                    </div>
                ` : `
                    <div class="resource-grid">
                        ${activeMachines.map(machine => `
                            <div class="resource-card" onclick="window.location.href='machine-detail.html?id=${machine.id}'">
                                <div class="resource-card-header">
                                    <div class="resource-icon machine">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                                            <line x1="8" y1="21" x2="16" y2="21"></line>
                                            <line x1="12" y1="17" x2="12" y2="21"></line>
                                        </svg>
                                    </div>
                                    <div class="resource-info">
                                        <div class="resource-name">${this.escapeHtml(machine.name || 'Sin nombre')}</div>
                                        <div class="resource-detail">${this.escapeHtml(machine.serialNumber || 'N/A')}</div>
                                    </div>
                                </div>
                                <div class="resource-meta">
                                    ${machine.model ? `
                                        <div class="resource-meta-item">
                                            <span class="resource-meta-label">Modelo</span>
                                            <span class="resource-meta-value">${this.escapeHtml(machine.model)}</span>
                                        </div>
                                    ` : ''}
                                    <div class="resource-meta-item">
                                        <span class="resource-meta-label">Asignada desde</span>
                                        <span class="resource-meta-value">${this.formatDate(machine.assignment.startDate)}</span>
                                    </div>
                                    ${machine.assignment.notes ? `
                                        <div class="resource-meta-item" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color);">
                                            <span class="resource-meta-label" style="font-size: 0.8rem; color: var(--text-tertiary);">${this.escapeHtml(machine.assignment.notes)}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <!-- Licencias asignadas -->
            <div class="assignments-section">
                <div class="section-header">
                    <h3 class="section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Licencias Asignadas
                    </h3>
                </div>

                ${activeLicenses.length === 0 ? `
                    <div class="empty-resources">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <p>Este usuario no tiene licencias asignadas actualmente</p>
                    </div>
                ` : `
                    <div class="resource-grid">
                        ${activeLicenses.map(license => `
                            <div class="resource-card" onclick="window.location.href='license-detail.html?id=${license.id}'">
                                <div class="resource-card-header">
                                    <div class="resource-icon license">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                        </svg>
                                    </div>
                                    <div class="resource-info">
                                        <div class="resource-name">${this.escapeHtml(license.software || 'Sin nombre')}</div>
                                        <div class="resource-detail">${this.escapeHtml(license.type || 'Licencia')}</div>
                                    </div>
                                </div>
                                <div class="resource-meta">
                                    ${license.vendor ? `
                                        <div class="resource-meta-item">
                                            <span class="resource-meta-label">Vendor</span>
                                            <span class="resource-meta-value">${this.escapeHtml(license.vendor)}</span>
                                        </div>
                                    ` : ''}
                                    ${license.expirationDate ? `
                                        <div class="resource-meta-item">
                                            <span class="resource-meta-label">Expira</span>
                                            <span class="resource-meta-value ${this.isExpired(license.expirationDate) ? 'style="color: #ef4444;"' : ''}">${this.formatDate(license.expirationDate)}</span>
                                        </div>
                                    ` : ''}
                                    <div class="resource-meta-item">
                                        <span class="resource-meta-label">Asignada desde</span>
                                        <span class="resource-meta-value">${this.formatDate(license.assignment.startDate)}</span>
                                    </div>
                                    ${license.assignment.notes ? `
                                        <div class="resource-meta-item" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color);">
                                            <span class="resource-meta-label" style="font-size: 0.8rem; color: var(--text-tertiary);">${this.escapeHtml(license.assignment.notes)}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <!-- Tickets (solo para empleados) -->
            ${this.user.role === 'employee' && assignments.userTickets.length > 0 ? `
                <div class="tickets-section">
                    <div class="section-header">
                        <h3 class="section-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            Tickets de Soporte
                        </h3>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        ${assignments.userTickets.slice(0, 10).map(ticket => `
                            <div class="resource-card" onclick="window.location.href='tickets.html?id=${ticket.id}'" style="cursor: pointer;">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">
                                            ${this.escapeHtml(ticket.title || ticket.categoriaElemento || 'Sin título')}
                                        </div>
                                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                                            ${this.escapeHtml(ticket.description || '').substring(0, 100)}${ticket.description && ticket.description.length > 100 ? '...' : ''}
                                        </div>
                                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                            ${this.getStatusBadge(ticket.status)}
                                            ${ticket.priority ? `<span class="badge badge-info">${this.escapeHtml(ticket.priority)}</span>` : ''}
                                        </div>
                                    </div>
                                    <div style="font-size: 0.75rem; color: var(--text-tertiary); text-align: right;">
                                        ${this.formatDate(ticket.createdAt)}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${assignments.userTickets.length > 10 ? `
                        <div style="text-align: center; margin-top: 1rem;">
                            <button class="btn btn-secondary" onclick="window.location.href='tickets.html'">
                                Ver todos los tickets
                            </button>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        `;
    },

    async editUser() {
        if (window.UsersModule) {
            window.location.href = `users.html?edit=${this.userId}`;
        } else {
            window.location.href = `users.html`;
        }
    },

    bindEvents() {
        // Eventos adicionales si son necesarios
    },

    getRoleName(role) {
        const roleNames = {
            admin: 'Administrador',
            manager: 'Manager',
            user: 'Usuario',
            employee: 'Empleado'
        };
        return roleNames[role] || role;
    },

    getStatusBadge(status) {
        const statusMap = {
            open: { color: '#3b82f6', label: 'Abierto', class: 'badge-open' },
            in_progress: { color: '#f59e0b', label: 'En Progreso', class: 'badge-in-progress' },
            resolved: { color: '#22c55e', label: 'Resuelto', class: 'badge-resolved' },
            closed: { color: '#6b7280', label: 'Cerrado', class: 'badge-closed' }
        };
        const statusInfo = statusMap[status] || { color: '#6b7280', label: status, class: 'badge' };
        return `<span class="badge ${statusInfo.class}">${statusInfo.label}</span>`;
    },

    isExpired(dateStr) {
        if (!dateStr) return false;
        return new Date(dateStr) < new Date();
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('es-MX', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            });
        } catch (e) {
            return '-';
        }
    },

    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('es-MX', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '-';
        }
    },

    showError(message) {
        const container = document.getElementById('userDetailContent');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-tertiary);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 1rem; opacity: 0.5;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    <p>${this.escapeHtml(message)}</p>
                    <button class="btn btn-primary" onclick="window.location.href='users.html'" style="margin-top: 1rem;">
                        Volver a Usuarios
                    </button>
                </div>
            `;
        }
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                ${type === 'success' ? `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                ` : `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                `}
            </div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        const container = document.getElementById('toastContainer') || document.body;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => UserDetailModule.init(), 100);
});

window.UserDetailModule = UserDetailModule;

