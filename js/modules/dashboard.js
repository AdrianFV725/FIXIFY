// ========================================
// DASHBOARD MODULE
// Logica del dashboard principal
// ========================================

const DashboardModule = {
    // ========================================
    // INICIALIZACION
    // ========================================

    async init() {
        // Verificar autenticacion
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        // Cargar datos de demo si es primera vez
        try {
            await Store.seedDemoData();
        } catch (e) {
            console.warn('No se pudieron cargar datos demo');
        }

        // Renderizar componentes
        await this.renderKPIs();
        await this.renderCharts();
        await this.renderRecentTickets();
        await this.renderExpiringLicenses();

        // Configurar actualizacion periodica (cada 5 minutos, no cada segundo)
        this.startAutoRefresh();
    },

    // ========================================
    // KPIs
    // ========================================

    async renderKPIs() {
        const container = document.getElementById('kpiGrid');
        if (!container) return;

        let stats;
        try {
            stats = await Store.getStats();
        } catch (e) {
            console.error('Error al obtener stats:', e);
            stats = {
                tickets: { open: 0 },
                machines: { assigned: 0, available: 0 },
                employees: { total: 0, active: 0 },
                licenses: { expiring: 0 }
            };
        }

        const kpis = [
            {
                label: 'Tickets Abiertos',
                value: stats.tickets?.open || 0,
                icon: 'tickets',
                color: '#3b82f6'
            },
            {
                label: 'Maquinas Activas',
                value: stats.machines?.assigned || 0,
                icon: 'machines',
                subtext: `${stats.machines?.available || 0} disponibles`,
                color: '#22c55e'
            },
            {
                label: 'Empleados',
                value: stats.employees?.total || 0,
                icon: 'employees',
                subtext: `${stats.employees?.active || 0} activos`,
                color: '#a855f7'
            },
            {
                label: 'Licencias por Vencer',
                value: stats.licenses?.expiring || 0,
                icon: (stats.licenses?.expiring || 0) > 0 ? 'warning' : 'licenses',
                subtext: 'Proximos 30 dias',
                color: (stats.licenses?.expiring || 0) > 0 ? '#ef4444' : '#f97316'
            }
        ];

        container.innerHTML = kpis.map(kpi => `
            <div class="kpi-card">
                <div class="kpi-header">
                    <div class="kpi-icon ${kpi.icon}">
                        ${this.getKPIIcon(kpi.icon)}
                    </div>
                </div>
                <div class="kpi-value">${kpi.value}</div>
                <div class="kpi-label">${kpi.label}</div>
                ${kpi.subtext ? `<div class="kpi-subtext" style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.25rem;">${kpi.subtext}</div>` : ''}
            </div>
        `).join('');
    },

    getKPIIcon(type) {
        const icons = {
            tickets: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
            machines: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
            employees: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
            licenses: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
            warning: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
        };
        return icons[type] || icons.tickets;
    },

    // ========================================
    // GRAFICAS
    // ========================================

    async renderCharts() {
        await this.renderTicketsTrendChart();
        await this.renderMachineFailuresChart();
    },

    async renderTicketsTrendChart() {
        const container = document.getElementById('ticketsTrendChart');
        if (!container) return;

        container.innerHTML = `
            <h3 class="chart-title">Tendencia de Tickets (Ultimos 6 meses)</h3>
            <div class="chart-container">
                <canvas id="ticketsTrendCanvas"></canvas>
            </div>
        `;

        if (typeof Charts === 'undefined' || !Charts.line) {
            console.warn('Charts no disponible');
            return;
        }

        const monthLabels = Charts.getMonthLabels ? Charts.getMonthLabels(6) : ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
        const ticketsByMonth = [12, 8, 15, 10, 18, 14];

        Charts.line('ticketsTrendCanvas', {
            labels: monthLabels,
            datasets: [{
                label: 'Tickets',
                data: ticketsByMonth,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }]
        });
    },

    async renderMachineFailuresChart() {
        const container = document.getElementById('machineFailuresChart');
        if (!container) return;

        container.innerHTML = `
            <h3 class="chart-title">Maquinas con Mas Fallas</h3>
            <div class="chart-container">
                <canvas id="machineFailuresCanvas"></canvas>
            </div>
        `;

        let problematicMachines = [];
        try {
            problematicMachines = await Store.getMostProblematicMachines(5);
        } catch (e) {
            console.warn('No se pudieron obtener maquinas problematicas');
        }
        
        if (!problematicMachines || problematicMachines.length === 0) {
            container.querySelector('.chart-container').innerHTML = `
                <div class="empty-state" style="padding: 2rem; text-align: center;">
                    <p style="color: var(--text-tertiary);">No hay datos de fallas registradas</p>
                </div>
            `;
            return;
        }

        if (typeof Charts !== 'undefined' && Charts.horizontalBar) {
            Charts.horizontalBar('machineFailuresCanvas', {
                labels: problematicMachines.map(m => m.name || m.serialNumber),
                datasets: [{
                    label: 'Tickets',
                    data: problematicMachines.map(m => m.ticketCount),
                    backgroundColor: '#ef4444'
                }]
            });
        }
    },

    // ========================================
    // LISTAS RAPIDAS
    // ========================================

    async renderRecentTickets() {
        const container = document.getElementById('recentTickets');
        if (!container) return;

        let tickets = [];
        try {
            const allTickets = await Store.getTickets();
            tickets = (allTickets || [])
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5);
        } catch (e) {
            console.warn('No se pudieron obtener tickets');
        }

        container.innerHTML = `
            <h3 class="stat-title" style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">Ultimos Tickets</h3>
            ${tickets.length === 0 ? `
                <p style="color: var(--text-tertiary);">No hay tickets registrados</p>
            ` : `
                <div class="stat-list">
                    ${tickets.map(ticket => `
                        <div class="stat-item" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                            <div class="stat-item-icon" style="width: 32px; height: 32px; border-radius: 8px; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path></svg>
                            </div>
                            <div class="stat-item-content" style="flex: 1;">
                                <div style="font-weight: 500; font-size: 0.875rem;">${this.escapeHtml(ticket.title || 'Sin titulo')}</div>
                                <div style="font-size: 0.75rem; color: var(--text-tertiary);">${ticket.folio || ''} - ${this.timeAgo(ticket.createdAt)}</div>
                            </div>
                            <span class="badge badge-${ticket.status === 'open' ? 'open' : ticket.status === 'in_progress' ? 'in-progress' : 'resolved'}">${this.getStatusLabel(ticket.status)}</span>
                        </div>
                    `).join('')}
                </div>
                <a href="tickets.html" class="btn btn-ghost btn-sm" style="width: 100%; margin-top: 1rem;">Ver todos los tickets</a>
            `}
        `;
    },

    async renderExpiringLicenses() {
        const container = document.getElementById('expiringLicenses');
        if (!container) return;

        let licenses = [];
        try {
            licenses = await Store.getExpiringLicenses(30) || [];
        } catch (e) {
            console.warn('No se pudieron obtener licencias');
        }

        container.innerHTML = `
            <h3 class="stat-title" style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">Licencias por Vencer</h3>
            ${licenses.length === 0 ? `
                <p style="color: var(--text-tertiary);">No hay licencias proximas a vencer</p>
            ` : `
                <div class="stat-list">
                    ${licenses.map(license => {
                        const daysLeft = this.daysUntil(license.expirationDate);
                        const urgency = daysLeft <= 7 ? 'danger' : daysLeft <= 15 ? 'warning' : 'info';
                        
                        return `
                            <div class="stat-item" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                                <div class="stat-item-icon" style="width: 32px; height: 32px; border-radius: 8px; background: rgba(249, 115, 22, 0.1); display: flex; align-items: center; justify-content: center; color: #f97316;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                </div>
                                <div class="stat-item-content" style="flex: 1;">
                                    <div style="font-weight: 500; font-size: 0.875rem;">${this.escapeHtml(license.software)}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-tertiary);">Vence: ${this.formatDate(license.expirationDate)}</div>
                                </div>
                                <span class="badge badge-${urgency === 'danger' ? 'high' : urgency === 'warning' ? 'medium' : 'low'}">${daysLeft} dias</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                <a href="licenses.html" class="btn btn-ghost btn-sm" style="width: 100%; margin-top: 1rem;">Ver todas las licencias</a>
            `}
        `;
    },

    getStatusLabel(status) {
        const labels = {
            open: 'Abierto',
            in_progress: 'En Progreso',
            resolved: 'Resuelto',
            closed: 'Cerrado'
        };
        return labels[status] || status;
    },

    // Helper functions
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    timeAgo(date) {
        if (!date) return '';
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'Hace un momento';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Hace ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours}h`;
        const days = Math.floor(hours / 24);
        return `Hace ${days}d`;
    },

    daysUntil(date) {
        if (!date) return 0;
        const diff = new Date(date) - new Date();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },

    formatDate(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString('es-MX');
    },

    // ========================================
    // AUTO-REFRESH
    // ========================================

    startAutoRefresh() {
        // Actualizar cada 5 minutos (no cada segundo)
        setInterval(async () => {
            await this.renderKPIs();
            await this.renderRecentTickets();
            await this.renderExpiringLicenses();
            if (typeof Sidebar !== 'undefined' && Sidebar.updateBadges) {
                Sidebar.updateBadges();
            }
        }, 5 * 60 * 1000); // 5 minutos
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', async () => {
    // Esperar a que Store este inicializado
    setTimeout(async () => {
        await DashboardModule.init();
    }, 100);
});

// Exportar para uso global
window.DashboardModule = DashboardModule;
