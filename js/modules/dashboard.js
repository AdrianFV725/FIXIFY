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

        // Si es empleado, redirigir a su dashboard
        const currentUser = Auth.getCurrentUser();
        if (currentUser && currentUser.role === 'employee') {
            window.location.href = 'employee-dashboard.html';
            return;
        }

        // Cargar datos de demo si es primera vez
        try {
            await Store.seedDemoData();
        } catch (e) {
            console.warn('No se pudieron cargar datos demo');
        }

        // Renderizar componentes
        await this.renderShortcuts();
        await this.renderKPIs();
        await this.renderRecentActivity();
        await this.renderUrgentAlerts();
        await this.renderCharts();
        await this.renderRecentTickets();
        await this.renderExpiringLicenses();
        await this.renderUrgentTickets();

        // Configurar actualizacion periodica (cada 5 minutos, no cada segundo)
        this.startAutoRefresh();
    },

    // ========================================
    // ACCESOS DIRECTOS
    // ========================================

    async renderShortcuts() {
        const container = document.getElementById('shortcutsGrid');
        if (!container) return;

        let stats;
        try {
            stats = await Store.getStats();
        } catch (e) {
            stats = {
                tickets: { open: 0 },
                machines: { assigned: 0 },
                employees: { total: 0 },
                licenses: { expiring: 0 }
            };
        }

        const shortcuts = [
            {
                label: 'Tickets',
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
                href: 'tickets.html',
                shortcut: 'tickets',
                badge: stats.tickets?.open || 0
            },
            {
                label: 'Máquinas',
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
                href: 'machines.html',
                shortcut: 'machines',
                badge: stats.machines?.assigned || 0
            },
            {
                label: 'Usuarios',
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
                href: 'users.html',
                shortcut: 'users',
                badge: (stats.users?.total || 0) + (stats.employees?.total || 0)
            },
            {
                label: 'Licencias',
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
                href: 'licenses.html',
                shortcut: 'licenses',
                badge: stats.licenses?.expiring || 0
            },
            {
                label: 'Asignaciones',
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><path d="M20 8v6M23 11h-6"></path></svg>`,
                href: 'assignments.html',
                shortcut: 'assignments'
            },
            {
                label: 'Analíticas',
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
                href: 'analytics.html',
                shortcut: 'analytics'
            }
        ];

        container.innerHTML = shortcuts.map(shortcut => `
            <a href="${shortcut.href}" class="shortcut-card" data-shortcut="${shortcut.shortcut}">
                ${shortcut.badge > 0 ? `<span class="shortcut-badge">${shortcut.badge}</span>` : ''}
                <div class="shortcut-icon">
                    ${shortcut.icon}
                </div>
                <div class="shortcut-label">${shortcut.label}</div>
            </a>
        `).join('');
    },

    // ========================================
    // ACTIVIDAD RECIENTE
    // ========================================

    async renderRecentActivity() {
        const container = document.getElementById('activityList');
        if (!container) return;

        let activities = [];
        try {
            activities = await Store.getActivityLog(10) || [];
        } catch (e) {
            console.warn('No se pudo obtener actividad reciente');
        }

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-activity">
                    <p>No hay actividad reciente</p>
                </div>
            `;
            return;
        }

        // Renderizar actividades de forma asíncrona
        const activityPromises = activities.map(async (activity) => {
            const icon = this.getActivityIcon(activity.type);
            const description = await this.getActivityDescription(activity);
            const time = this.timeAgo(activity.timestamp || activity.createdAt);
            const bgColor = this.getActivityColor(activity.type);
            const textColor = this.getActivityTextColor(activity.type);

            return `
                <div class="activity-item">
                    <div class="activity-icon" style="background: ${bgColor}; color: ${textColor};">
                        ${icon}
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${this.escapeHtml(description.title)}</div>
                        <div class="activity-description">${this.escapeHtml(description.text)}</div>
                        <div class="activity-time">${time}</div>
                    </div>
                </div>
            `;
        });

        const activityHTML = await Promise.all(activityPromises);
        container.innerHTML = activityHTML.join('');
    },

    getActivityIcon(type) {
        const icons = {
            ticket_created: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path></svg>`,
            ticket_updated: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
            machine_assigned: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line></svg>`,
            license_assigned: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline></svg>`,
            employee_created: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>`
        };
        return icons[type] || icons.ticket_created;
    },

    getActivityColor(type) {
        const colors = {
            ticket_created: 'rgba(59, 130, 246, 0.15)',
            ticket_updated: 'rgba(139, 92, 246, 0.15)',
            machine_assigned: 'rgba(34, 197, 94, 0.15)',
            license_assigned: 'rgba(249, 115, 22, 0.15)',
            employee_created: 'rgba(168, 85, 247, 0.15)'
        };
        return colors[type] || 'rgba(201, 168, 108, 0.15)';
    },

    getActivityTextColor(type) {
        const colors = {
            ticket_created: '#3b82f6',
            ticket_updated: '#8b5cf6',
            machine_assigned: '#22c55e',
            license_assigned: '#f97316',
            employee_created: '#a855f7'
        };
        return colors[type] || 'var(--accent-primary)';
    },

    async getActivityDescription(activity) {
        try {
            if (activity.type === 'ticket_created' || activity.type === 'ticket_updated') {
                const ticket = await Store.getTicketById(activity.data?.ticketId);
                if (ticket) {
                    return {
                        title: activity.type === 'ticket_created' ? 'Ticket creado' : 'Ticket actualizado',
                        text: ticket.title || ticket.folio || 'Sin título'
                    };
                }
            }
            if (activity.type === 'machine_assigned') {
                const machine = await Store.getMachineById(activity.data?.machineId);
                const employee = await Store.getEmployeeById(activity.data?.employeeId);
                if (machine && employee) {
                    return {
                        title: 'Máquina asignada',
                        text: `${machine.name || machine.serialNumber} → ${employee.name} ${employee.lastName}`
                    };
                }
            }
            if (activity.type === 'license_assigned') {
                const license = await Store.getLicenseById(activity.data?.licenseId);
                if (license) {
                    return {
                        title: 'Licencia asignada',
                        text: license.software || 'Licencia'
                    };
                }
            }
            if (activity.type === 'employee_created') {
                const employee = await Store.getEmployeeById(activity.data?.employeeId);
                if (employee) {
                    return {
                        title: 'Empleado creado',
                        text: `${employee.name} ${employee.lastName}`
                    };
                }
            }
        } catch (e) {
            console.warn('Error al obtener detalles de actividad:', e);
        }
        return {
            title: 'Actividad',
            text: activity.type || 'Sin descripción'
        };
    },

    // ========================================
    // ALERTAS URGENTES
    // ========================================

    async renderUrgentAlerts() {
        const container = document.getElementById('alertsList');
        if (!container) return;

        const alerts = [];

        try {
            // Tickets urgentes
            const tickets = await Store.getTickets();
            const urgentTickets = tickets.filter(t => 
                (t.priority === 'critical' || t.priority === 'high') && 
                (t.status === 'open' || t.status === 'in_progress')
            ).slice(0, 3);

            urgentTickets.forEach(ticket => {
                alerts.push({
                    type: 'urgent',
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
                    title: `Ticket ${ticket.priority === 'critical' ? 'Crítico' : 'Alta Prioridad'}`,
                    description: ticket.title || ticket.folio || 'Sin título',
                    href: `tickets.html#${ticket.id}`
                });
            });

            // Licencias próximas a vencer (menos de 7 días)
            const licenses = await Store.getLicenses();
            const expiringSoon = licenses.filter(l => {
                const date = l.billingDate || l.expirationDate;
                const daysLeft = this.daysUntil(date);
                return daysLeft > 0 && daysLeft <= 7;
            }).slice(0, 3);

            expiringSoon.forEach(license => {
                const date = license.billingDate || license.expirationDate;
                const daysLeft = this.daysUntil(date);
                alerts.push({
                    type: daysLeft <= 3 ? 'urgent' : 'warning',
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
                    title: `Licencia vence en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`,
                    description: license.software,
                    href: `licenses.html#${license.id}`
                });
            });

            // Máquinas en mantenimiento
            const machines = await Store.getMachines();
            const maintenanceMachines = machines.filter(m => m.status === 'maintenance').slice(0, 2);

            maintenanceMachines.forEach(machine => {
                alerts.push({
                    type: 'info',
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line></svg>`,
                    title: 'Máquina en mantenimiento',
                    description: machine.name || machine.serialNumber,
                    href: `machines.html#${machine.id}`
                });
            });
        } catch (e) {
            console.warn('Error al obtener alertas:', e);
        }

        if (alerts.length === 0) {
            container.innerHTML = `
                <div class="empty-alerts">
                    <p>No hay alertas urgentes</p>
                </div>
            `;
            return;
        }

        container.innerHTML = alerts.slice(0, 5).map(alert => `
            <a href="${alert.href || '#'}" class="alert-item ${alert.type}">
                <div class="alert-icon" style="background: ${alert.type === 'urgent' ? 'rgba(239, 68, 68, 0.15)' : alert.type === 'warning' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(59, 130, 246, 0.15)'}; color: ${alert.type === 'urgent' ? '#ef4444' : alert.type === 'warning' ? '#f97316' : '#3b82f6'}">
                    ${alert.icon}
                </div>
                <div class="alert-content">
                    <div class="alert-title">${this.escapeHtml(alert.title)}</div>
                    <div class="alert-description">${this.escapeHtml(alert.description)}</div>
                </div>
            </a>
        `).join('');
    },

    // ========================================
    // TICKETS URGENTES
    // ========================================

    async renderUrgentTickets() {
        const container = document.getElementById('urgentTickets');
        if (!container) return;

        let tickets = [];
        try {
            const allTickets = await Store.getTickets();
            tickets = allTickets
                .filter(t => (t.priority === 'critical' || t.priority === 'high') && (t.status === 'open' || t.status === 'in_progress'))
                .sort((a, b) => {
                    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                })
                .slice(0, 5);
        } catch (e) {
            console.warn('No se pudieron obtener tickets urgentes');
        }

        container.innerHTML = `
            <h3 class="stat-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444;">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                </svg>
                Tickets Urgentes
            </h3>
            ${tickets.length === 0 ? `
                <p style="color: var(--text-tertiary); padding: 1rem 0;">No hay tickets urgentes</p>
            ` : `
                <div class="stat-list">
                    ${tickets.map(ticket => `
                        <a href="tickets.html#${ticket.id}" class="stat-item" style="text-decoration: none; color: inherit;">
                            <div class="stat-item-icon" style="background: ${ticket.priority === 'critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)'}; color: ${ticket.priority === 'critical' ? '#ef4444' : '#f97316'};">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path></svg>
                            </div>
                            <div class="stat-item-content">
                                <div class="stat-item-title">${this.escapeHtml(ticket.title || 'Sin título')}</div>
                                <div class="stat-item-subtitle">${ticket.folio || ''} - ${this.getStatusLabel(ticket.status)}</div>
                            </div>
                            <span class="badge badge-${ticket.priority === 'critical' ? 'high' : 'medium'}">${ticket.priority === 'critical' ? 'Crítico' : 'Alta'}</span>
                        </a>
                    `).join('')}
                </div>
                <a href="tickets.html?priority=high" class="btn btn-ghost btn-sm" style="width: 100%; margin-top: 1rem;">Ver todos los urgentes</a>
            `}
        `;
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
            <h3 class="chart-title">Tendencia de Tickets (Últimos 6 meses)</h3>
            <div class="chart-container">
                <canvas id="ticketsTrendCanvas"></canvas>
            </div>
        `;

        if (typeof Charts === 'undefined' || !Charts.line) {
            console.warn('Charts no disponible');
            return;
        }

        // Obtener datos reales de tickets
        let tickets = [];
        try {
            tickets = await Store.getTickets();
        } catch (e) {
            console.warn('No se pudieron obtener tickets para la gráfica');
        }

        // Calcular tickets por mes (últimos 6 meses)
        const monthLabels = Charts.getMonthLabels ? Charts.getMonthLabels(6) : ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
        const now = new Date();
        const ticketsByMonth = monthLabels.map((_, index) => {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
            const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
            
            return tickets.filter(ticket => {
                const ticketDate = new Date(ticket.createdAt);
                return ticketDate >= monthDate && ticketDate < nextMonth;
            }).length;
        });

        Charts.line('ticketsTrendCanvas', {
            labels: monthLabels,
            datasets: [{
                label: 'Tickets',
                data: ticketsByMonth,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
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
            <h3 class="stat-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                </svg>
                Últimos Tickets
            </h3>
            ${tickets.length === 0 ? `
                <p style="color: var(--text-tertiary); padding: 1rem 0;">No hay tickets registrados</p>
            ` : `
                <div class="stat-list">
                    ${tickets.map(ticket => `
                        <a href="tickets.html#${ticket.id}" class="stat-item" style="text-decoration: none; color: inherit;">
                            <div class="stat-item-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path></svg>
                            </div>
                            <div class="stat-item-content">
                                <div class="stat-item-title">${this.escapeHtml(ticket.title || 'Sin título')}</div>
                                <div class="stat-item-subtitle">${ticket.folio || ''} - ${this.timeAgo(ticket.createdAt)}</div>
                            </div>
                            <span class="badge badge-${ticket.status === 'open' ? 'open' : ticket.status === 'in_progress' ? 'in-progress' : 'resolved'}">${this.getStatusLabel(ticket.status)}</span>
                        </a>
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
            <h3 class="stat-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #f97316;">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Licencias por Vencer
            </h3>
            ${licenses.length === 0 ? `
                <p style="color: var(--text-tertiary); padding: 1rem 0;">No hay licencias próximas a vencer</p>
            ` : `
                <div class="stat-list">
                    ${licenses.map(license => {
                        const date = license.billingDate || license.expirationDate;
                        const daysLeft = this.daysUntil(date);
                        const urgency = daysLeft <= 7 ? 'danger' : daysLeft <= 15 ? 'warning' : 'info';
                        const bgColor = daysLeft <= 7 ? 'rgba(239, 68, 68, 0.15)' : daysLeft <= 15 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(59, 130, 246, 0.15)';
                        const iconColor = daysLeft <= 7 ? '#ef4444' : daysLeft <= 15 ? '#f97316' : '#3b82f6';
                        
                        return `
                            <a href="licenses.html#${license.id}" class="stat-item" style="text-decoration: none; color: inherit;">
                                <div class="stat-item-icon" style="background: ${bgColor}; color: ${iconColor};">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                </div>
                                <div class="stat-item-content">
                                    <div class="stat-item-title">${this.escapeHtml(license.software)}</div>
                                    <div class="stat-item-subtitle">Facturación: ${this.formatDate(date)}</div>
                                </div>
                                <span class="badge badge-${urgency === 'danger' ? 'high' : urgency === 'warning' ? 'medium' : 'low'}">${daysLeft} día${daysLeft !== 1 ? 's' : ''}</span>
                            </a>
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
            await this.renderShortcuts();
            await this.renderRecentActivity();
            await this.renderUrgentAlerts();
            await this.renderRecentTickets();
            await this.renderExpiringLicenses();
            await this.renderUrgentTickets();
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
