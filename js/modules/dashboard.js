// ========================================
// DASHBOARD MODULE
// Logica del dashboard principal
// ========================================

const DashboardModule = {
    // ========================================
    // INICIALIZACION
    // ========================================

    init() {
        // Verificar autenticacion
        if (!Auth.requireAuth()) return;

        // Cargar datos de demo si es primera vez
        Store.seedDemoData();

        // Renderizar componentes
        this.renderKPIs();
        this.renderCharts();
        this.renderRecentTickets();
        this.renderExpiringLicenses();

        // Configurar actualizacion periodica
        this.startAutoRefresh();
    },

    // ========================================
    // KPIs
    // ========================================

    renderKPIs() {
        const container = document.getElementById('kpiGrid');
        if (!container) return;

        const stats = Store.getStats();

        const kpis = [
            {
                label: 'Tickets Abiertos',
                value: stats.tickets.open,
                icon: 'tickets',
                trend: this.calculateTrend('tickets'),
                color: '#3b82f6'
            },
            {
                label: 'Maquinas Activas',
                value: stats.machines.assigned,
                icon: 'machines',
                subtext: `${stats.machines.available} disponibles`,
                color: '#22c55e'
            },
            {
                label: 'Empleados',
                value: stats.employees.total,
                icon: 'employees',
                subtext: `${stats.employees.active} activos`,
                color: '#a855f7'
            },
            {
                label: 'Licencias por Vencer',
                value: stats.licenses.expiring,
                icon: stats.licenses.expiring > 0 ? 'warning' : 'licenses',
                subtext: 'Proximos 30 dias',
                color: stats.licenses.expiring > 0 ? '#ef4444' : '#f97316'
            }
        ];

        container.innerHTML = kpis.map(kpi => `
            <div class="kpi-card">
                <div class="kpi-header">
                    <div class="kpi-icon ${kpi.icon}">
                        ${this.getKPIIcon(kpi.icon)}
                    </div>
                    ${kpi.trend ? `
                        <span class="kpi-trend ${kpi.trend.direction}">
                            ${kpi.trend.direction === 'up' ? '&uarr;' : '&darr;'}
                            ${kpi.trend.value}%
                        </span>
                    ` : ''}
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

    calculateTrend(type) {
        // TODO: Implementar calculo de tendencia comparando con periodo anterior
        // Por ahora retornamos null
        return null;
    },

    // ========================================
    // GRAFICAS
    // ========================================

    renderCharts() {
        this.renderTicketsTrendChart();
        this.renderMachineFailuresChart();
    },

    renderTicketsTrendChart() {
        const container = document.getElementById('ticketsTrendChart');
        if (!container) return;

        // Preparar contenedor para canvas
        container.innerHTML = `
            <h3 class="chart-title">Tendencia de Tickets (Ultimos 6 meses)</h3>
            <div class="chart-container">
                <canvas id="ticketsTrendCanvas"></canvas>
            </div>
        `;

        // Obtener datos de tickets agrupados por mes
        const tickets = Store.getTickets();
        const monthLabels = Charts.getMonthLabels(6);
        
        // Agrupar tickets por mes (simulado por ahora)
        const ticketsByMonth = [12, 8, 15, 10, 18, 14]; // TODO: Calcular real

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

    renderMachineFailuresChart() {
        const container = document.getElementById('machineFailuresChart');
        if (!container) return;

        container.innerHTML = `
            <h3 class="chart-title">Maquinas con Mas Fallas</h3>
            <div class="chart-container">
                <canvas id="machineFailuresCanvas"></canvas>
            </div>
        `;

        const problematicMachines = Store.getMostProblematicMachines(5);
        
        if (problematicMachines.length === 0) {
            container.querySelector('.chart-container').innerHTML = `
                <div class="empty-state" style="padding: 2rem;">
                    <p class="text-muted">No hay datos de fallas registradas</p>
                </div>
            `;
            return;
        }

        Charts.horizontalBar('machineFailuresCanvas', {
            labels: problematicMachines.map(m => m.name || m.serialNumber),
            datasets: [{
                label: 'Tickets',
                data: problematicMachines.map(m => m.ticketCount),
                backgroundColor: '#ef4444'
            }]
        });
    },

    // ========================================
    // LISTAS RAPIDAS
    // ========================================

    renderRecentTickets() {
        const container = document.getElementById('recentTickets');
        if (!container) return;

        const tickets = Store.getTickets()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        container.innerHTML = `
            <h3 class="stat-title" style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">Ultimos Tickets</h3>
            ${tickets.length === 0 ? `
                <p class="text-muted">No hay tickets registrados</p>
            ` : `
                <div class="stat-list">
                    ${tickets.map(ticket => `
                        <div class="stat-item" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                            <div class="stat-item-icon" style="width: 32px; height: 32px; border-radius: 8px; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path></svg>
                            </div>
                            <div class="stat-item-content" style="flex: 1;">
                                <div style="font-weight: 500; font-size: 0.875rem;">${Utils.escapeHtml(ticket.title || 'Sin titulo')}</div>
                                <div style="font-size: 0.75rem; color: var(--text-tertiary);">${ticket.folio} - ${Utils.timeAgo(ticket.createdAt)}</div>
                            </div>
                            <span class="badge badge-${ticket.status === 'open' ? 'open' : ticket.status === 'in_progress' ? 'in-progress' : 'resolved'}">${this.getStatusLabel(ticket.status)}</span>
                        </div>
                    `).join('')}
                </div>
                <a href="/pages/tickets.html" class="btn btn-ghost btn-sm" style="width: 100%; margin-top: 1rem;">Ver todos los tickets</a>
            `}
        `;
    },

    renderExpiringLicenses() {
        const container = document.getElementById('expiringLicenses');
        if (!container) return;

        const licenses = Store.getExpiringLicenses(30);

        container.innerHTML = `
            <h3 class="stat-title" style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">Licencias por Vencer</h3>
            ${licenses.length === 0 ? `
                <p class="text-muted">No hay licencias proximas a vencer</p>
            ` : `
                <div class="stat-list">
                    ${licenses.map(license => {
                        const daysLeft = Utils.daysUntil(license.expirationDate);
                        const urgency = daysLeft <= 7 ? 'danger' : daysLeft <= 15 ? 'warning' : 'info';
                        
                        return `
                            <div class="stat-item" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                                <div class="stat-item-icon" style="width: 32px; height: 32px; border-radius: 8px; background: rgba(249, 115, 22, 0.1); display: flex; align-items: center; justify-content: center; color: #f97316;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                </div>
                                <div class="stat-item-content" style="flex: 1;">
                                    <div style="font-weight: 500; font-size: 0.875rem;">${Utils.escapeHtml(license.software)}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-tertiary);">Vence: ${Utils.formatDate(license.expirationDate)}</div>
                                </div>
                                <span class="badge badge-${urgency === 'danger' ? 'high' : urgency === 'warning' ? 'medium' : 'low'}">${daysLeft} dias</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                <a href="/pages/licenses.html" class="btn btn-ghost btn-sm" style="width: 100%; margin-top: 1rem;">Ver todas las licencias</a>
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

    // ========================================
    // AUTO-REFRESH
    // ========================================

    startAutoRefresh() {
        // Actualizar cada 5 minutos
        setInterval(() => {
            this.renderKPIs();
            this.renderRecentTickets();
            this.renderExpiringLicenses();
            Sidebar.updateBadges();
        }, 5 * 60 * 1000);
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    DashboardModule.init();
});

// Exportar para uso global
window.DashboardModule = DashboardModule;

