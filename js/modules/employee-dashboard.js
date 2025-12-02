// ========================================
// EMPLOYEE DASHBOARD MODULE
// Dashboard para empleados con sus recursos
// ========================================

const EmployeeDashboard = {
    employee: null,
    machine: null,
    licenses: [],
    tickets: [],

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        const currentUser = Auth.getCurrentUser();
        if (!currentUser || currentUser.role !== 'employee') {
            // Redirigir a dashboard normal si no es empleado
            window.location.href = 'dashboard.html';
            return;
        }

        await this.loadData();
        this.renderMachine();
        this.renderLicenses();
        this.renderTickets();
        this.bindEvents();
    },

    async loadData() {
        try {
            const currentUser = Auth.getCurrentUser();
            if (!currentUser || !currentUser.email) {
                console.error('No se pudo obtener información del usuario');
                return;
            }

            // Obtener empleado por email
            const employees = await Store.getEmployees();
            this.employee = employees.find(e => 
                e.email && e.email.toLowerCase() === currentUser.email.toLowerCase()
            );

            if (!this.employee) {
                console.warn('Empleado no encontrado para el email:', currentUser.email);
                return;
            }

            // Obtener máquina asignada
            const machines = await Store.getMachinesByEmployee(this.employee.id);
            this.machine = machines.length > 0 ? machines[0] : null;

            // Obtener licencias asignadas
            this.licenses = await Store.getLicensesByEmployee(this.employee.id);

            // Obtener tickets del empleado
            this.tickets = await Store.getTicketsByEmployeeId(this.employee.id);
            
            // Ordenar tickets por fecha (más recientes primero)
            this.tickets.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA;
            });
        } catch (e) {
            console.error('Error cargando datos del dashboard:', e);
        }
    },

    renderMachine() {
        const container = document.getElementById('myMachineContent');
        if (!container) return;

        if (!this.machine) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.5;">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">No tienes máquina asignada</h3>
                    <p class="empty-state-text">Contacta al administrador para asignarte una máquina</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 1.5rem; align-items: start;">
                <div style="background: var(--accent-light); padding: 1.5rem; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--accent-primary);">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                </div>
                <div>
                    <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">
                        ${this.escapeHtml(this.machine.name || 'Sin nombre')}
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Número de Serie</div>
                            <div style="font-family: monospace; font-size: 0.9rem; color: var(--text-primary);">
                                ${this.escapeHtml(this.machine.serialNumber || '-')}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Marca</div>
                            <div style="font-size: 0.9rem; color: var(--text-primary);">
                                ${this.escapeHtml(this.machine.brand || '-')}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Modelo</div>
                            <div style="font-size: 0.9rem; color: var(--text-primary);">
                                ${this.escapeHtml(this.machine.model || '-')}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Tipo</div>
                            <div style="font-size: 0.9rem; color: var(--text-primary);">
                                ${this.escapeHtml(this.machine.type || '-')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderLicenses() {
        const container = document.getElementById('myLicensesContent');
        if (!container) return;

        if (this.licenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.5;">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">No tienes licencias asignadas</h3>
                    <p class="empty-state-text">Contacta al administrador si necesitas una licencia</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                ${this.licenses.map(license => `
                    <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 10px; border: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 0.75rem;">
                            <h4 style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin: 0;">
                                ${this.escapeHtml(license.software || 'Sin nombre')}
                            </h4>
                            ${license.expirationDate ? `
                                <span style="font-size: 0.7rem; padding: 0.25rem 0.5rem; background: ${this.getExpirationColor(license.expirationDate)}; color: white; border-radius: 4px;">
                                    ${this.formatExpirationDate(license.expirationDate)}
                                </span>
                            ` : ''}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">
                            <div style="margin-bottom: 0.25rem;">
                                <strong>Tipo:</strong> ${this.escapeHtml(license.type || '-')}
                            </div>
                            ${license.vendor ? `
                                <div style="margin-bottom: 0.25rem;">
                                    <strong>Proveedor:</strong> ${this.escapeHtml(license.vendor)}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderTickets() {
        const container = document.getElementById('myTicketsContent');
        if (!container) return;

        if (this.tickets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.5;">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                    </div>
                    <h3 class="empty-state-title">No tienes tickets</h3>
                    <p class="empty-state-text">Crea un ticket desde "Solicitar Ayuda" cuando necesites soporte</p>
                </div>
            `;
            return;
        }

        // Mostrar solo los últimos 5 tickets
        const recentTickets = this.tickets.slice(0, 5);

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${recentTickets.map(ticket => `
                    <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 10px; border: 1px solid var(--border-color); border-left: 4px solid ${this.getStatusColor(ticket.status)};">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                    <span style="font-family: monospace; font-size: 0.75rem; color: var(--text-tertiary);">
                                        ${ticket.folio || '-'}
                                    </span>
                                    ${this.getStatusBadge(ticket.status)}
                                </div>
                                <h4 style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin: 0;">
                                    ${this.escapeHtml(ticket.title || ticket.categoriaElemento || 'Sin título')}
                                </h4>
                            </div>
                        </div>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.5rem 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${this.escapeHtml(ticket.description || 'Sin descripción')}
                        </p>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-tertiary);">
                            <span>Creado: ${this.formatTimeAgo(ticket.createdAt)}</span>
                            ${ticket.asignadoNombre ? `<span>Asignado a: ${this.escapeHtml(ticket.asignadoNombre)}</span>` : '<span>Sin asignar</span>'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
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

    getStatusColor(status) {
        const colors = {
            open: '#ef4444',
            in_progress: '#f97316',
            resolved: '#22c55e',
            closed: '#6b7280'
        };
        return colors[status] || '#6b7280';
    },

    getExpirationColor(expirationDate) {
        if (!expirationDate) return '#6b7280';
        const expDate = new Date(expirationDate);
        const now = new Date();
        const daysUntilExp = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExp < 0) return '#ef4444'; // Expirada
        if (daysUntilExp < 30) return '#f97316'; // Próxima a expirar
        return '#22c55e'; // Válida
    },

    formatExpirationDate(date) {
        if (!date) return '';
        const expDate = new Date(date);
        const now = new Date();
        const daysUntilExp = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExp < 0) return 'Expirada';
        if (daysUntilExp < 30) return `Expira en ${daysUntilExp} días`;
        return expDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    formatTimeAgo(date) {
        if (!date) return '-';
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `hace ${diffMins} min`;
        if (diffHours < 24) return `hace ${diffHours}h`;
        if (diffDays < 7) return `hace ${diffDays}d`;
        return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    bindEvents() {
        document.getElementById('requestHelpBtn')?.addEventListener('click', () => {
            window.location.href = 'tickets.html';
        });
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(() => EmployeeDashboard.init(), 100);
});

window.EmployeeDashboard = EmployeeDashboard;

