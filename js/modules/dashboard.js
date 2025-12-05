// ========================================
// DASHBOARD MODULE - Versión Rediseñada
// Dashboard con información útil y animaciones
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

        // Renderizar componentes con animaciones
        await this.renderShortcuts();
        await this.renderMetrics();
        
        // Renderizar gráficas después de un pequeño delay para asegurar que el DOM esté listo
        setTimeout(async () => {
            await this.renderCharts();
        }, 300);
        
        await this.renderPerformance();
        await this.renderTopTechnicians();
        await this.renderFinancialSummary();
        await this.renderActivityLog();

        // Configurar actualizacion periodica
        this.startAutoRefresh();
        this.startActivityLogRefresh();
    },

    // ========================================
    // ACCESOS DIRECTOS (mantener igual)
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
                licenses: { billing: 0 }
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
                badge: 0
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
    // MÉTRICAS ANIMADAS
    // ========================================

    async renderMetrics() {
        const container = document.getElementById('metricsGrid');
        if (!container) return;

        let stats;
        try {
            stats = await Store.getStats();
        } catch (e) {
            stats = {
                tickets: { open: 0, resolved: 0, total: 0 },
                machines: { assigned: 0, available: 0, total: 0 },
                employees: { total: 0, active: 0 },
                licenses: { total: 0, billing: 0 }
            };
        }

        let tickets = [];
        try {
            tickets = await Store.getTickets();
        } catch (e) {
            console.warn('No se pudieron obtener tickets para métricas');
        }

        // Calcular métricas adicionales
        const totalTickets = tickets.length;
        const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
        const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
        const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;

        const metrics = [
            {
                label: 'Tickets Abiertos',
                value: stats.tickets?.open || 0,
                change: '+12%',
                changeType: 'up',
                icon: 'tickets',
                color: '#3b82f6',
                description: `${inProgressTickets} en progreso`
            },
            {
                label: 'Tasa de Resolución',
                value: `${resolutionRate}%`,
                change: '+5%',
                changeType: 'up',
                icon: 'success',
                color: '#22c55e',
                description: `${resolvedTickets} resueltos`
            },
            {
                label: 'Máquinas Activas',
                value: stats.machines?.assigned || 0,
                change: '0%',
                changeType: 'neutral',
                icon: 'machines',
                color: '#8b5cf6',
                description: `${stats.machines?.available || 0} disponibles`
            },
            {
                label: 'Tickets Totales',
                value: totalTickets,
                change: '+8',
                changeType: 'up',
                icon: 'total',
                color: '#f97316',
                description: 'Este mes'
            }
        ];

        container.innerHTML = metrics.map((metric, index) => `
            <div class="metric-card" style="animation-delay: ${index * 0.1}s">
                <div class="metric-header">
                    <div class="metric-icon" style="background: ${this.getMetricIconBg(metric.icon)}; color: ${metric.color};">
                        ${this.getMetricIcon(metric.icon)}
                    </div>
                    <div class="metric-change metric-change-${metric.changeType}">
                        ${metric.changeType === 'up' ? '↑' : metric.changeType === 'down' ? '↓' : ''} ${metric.change}
                    </div>
                </div>
                <div class="metric-value" data-target="${metric.value}">0</div>
                <div class="metric-label">${metric.label}</div>
                <div class="metric-description">${metric.description}</div>
            </div>
        `).join('');

        // Animar números
        setTimeout(() => {
            this.animateNumbers();
        }, 300);
    },

    animateNumbers() {
        const valueElements = document.querySelectorAll('.metric-value[data-target]');
        valueElements.forEach(el => {
            const target = el.getAttribute('data-target');
            const isPercentage = target.includes('%');
            const targetNumber = parseFloat(target.replace(/\D/g, '')) || 0;
            
            if (targetNumber === 0) {
                el.textContent = target;
                return;
            }

            let current = 0;
            const duration = 1500;
            const increment = targetNumber / (duration / 16);
            const isInteger = Number.isInteger(targetNumber);

            const updateValue = () => {
                current += increment;
                if (current < targetNumber) {
                    el.textContent = isInteger 
                        ? Math.floor(current) + (isPercentage ? '%' : '')
                        : Math.floor(current * 10) / 10 + (isPercentage ? '%' : '');
                    requestAnimationFrame(updateValue);
                } else {
                    el.textContent = target;
                }
            };
            
            requestAnimationFrame(updateValue);
        });
    },

    getMetricIcon(type) {
        const icons = {
            tickets: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path></svg>`,
            success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
            machines: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line></svg>`,
            total: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`
        };
        return icons[type] || icons.tickets;
    },

    getMetricIconBg(type) {
        const colors = {
            tickets: 'rgba(59, 130, 246, 0.15)',
            success: 'rgba(34, 197, 94, 0.15)',
            machines: 'rgba(139, 92, 246, 0.15)',
            total: 'rgba(249, 115, 22, 0.15)'
        };
        return colors[type] || 'rgba(59, 130, 246, 0.15)';
    },

    // ========================================
    // GRÁFICAS MEJORADAS
    // ========================================

    async renderCharts() {
        // Esperar un momento para que el DOM esté completamente renderizado
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.renderTicketsStatusChart();
        await this.renderTicketsTrendChart();
    },

    async renderTicketsStatusChart() {
        const container = document.getElementById('ticketsStatusChart');
        if (!container) return;

        let tickets = [];
        try {
            tickets = await Store.getTickets();
        } catch (e) {
            console.warn('No se pudieron obtener tickets para gráfica de estado');
        }

        const statusCounts = {
            open: tickets.filter(t => t.status === 'open').length,
            in_progress: tickets.filter(t => t.status === 'in_progress').length,
            resolved: tickets.filter(t => t.status === 'resolved').length,
            closed: tickets.filter(t => t.status === 'closed').length
        };

        const values = [
            statusCounts.open,
            statusCounts.in_progress,
            statusCounts.resolved,
            statusCounts.closed
        ];

        const colors = ['#3b82f6', '#f97316', '#22c55e', '#6b7280'];
        const labels = ['Abiertos', 'En Progreso', 'Resueltos', 'Cerrados'];

        // Mostrar estadísticas detalladas incluso si no hay datos
        const totalTickets = values.reduce((a, b) => a + b, 0);
        
        if (totalTickets === 0) {
            // Mostrar estado vacío con información útil
            const chartContainer = container.querySelector('.chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="empty-chart-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-tertiary); margin-bottom: 1rem;">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                        </svg>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">No hay tickets registrados</p>
                        <p style="color: var(--text-tertiary); font-size: 0.8rem;">Los tickets aparecerán aquí cuando se creen</p>
                    </div>
                `;
            }
            return;
        }

        // Esperar a que el canvas esté disponible
        await new Promise(resolve => setTimeout(resolve, 100));

        if (typeof Charts === 'undefined' || !Charts.doughnut) {
            console.warn('Charts no disponible');
            return;
        }

        const canvas = document.getElementById('ticketsStatusCanvas');
        if (!canvas) {
            console.warn('Canvas no encontrado');
            return;
        }

        try {
            Charts.doughnut('ticketsStatusCanvas', {
                labels: labels,
                values: values,
                colors: colors
            }, {
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        align: 'center',
                        labels: {
                            padding: 12,
                            usePointStyle: true,
                            boxWidth: 8,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        enabled: true
                    }
                },
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 15,
                        bottom: 10
                    }
                }
            });

            // Agregar estadísticas adicionales debajo del gráfico
            const chartContainer = container.querySelector('.chart-container');
            if (chartContainer && !chartContainer.querySelector('.chart-status-summary')) {
                const summary = document.createElement('div');
                summary.className = 'chart-status-summary';
                
                const statusInfo = [
                    { label: 'Abiertos', value: statusCounts.open, color: '#3b82f6', icon: '●' },
                    { label: 'En Progreso', value: statusCounts.in_progress, color: '#f97316', icon: '●' },
                    { label: 'Resueltos', value: statusCounts.resolved, color: '#22c55e', icon: '●' },
                    { label: 'Cerrados', value: statusCounts.closed, color: '#6b7280', icon: '●' }
                ];

                summary.innerHTML = statusInfo.map(status => `
                    <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; box-sizing: border-box; overflow: hidden;">
                        <span style="color: ${status.color}; font-size: 0.85rem; flex-shrink: 0; line-height: 1;">${status.icon}</span>
                        <div style="flex: 1; min-width: 0; overflow: hidden;">
                            <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${status.value}</div>
                            <div style="font-size: 0.7rem; color: var(--text-tertiary); line-height: 1.2; margin-top: 0.125rem; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${status.label}</div>
                        </div>
                    </div>
                `).join('');
                
                chartContainer.appendChild(summary);
            }
        } catch (error) {
            console.error('Error al renderizar gráfico de estado:', error);
        }
    },

    async renderTicketsTrendChart() {
        const container = document.getElementById('ticketsTrendChart');
        if (!container) return;

        let tickets = [];
        try {
            tickets = await Store.getTickets();
        } catch (e) {
            console.warn('No se pudieron obtener tickets para la gráfica');
        }

        // Últimos 7 días
        const today = new Date();
        const labels = [];
        const data = [];
        const resolvedData = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dayName = date.toLocaleDateString('es-MX', { weekday: 'short' });
            labels.push(dayName.charAt(0).toUpperCase() + dayName.slice(1));

            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            
            const dayTickets = tickets.filter(t => {
                if (!t.createdAt) return false;
                const ticketDate = new Date(t.createdAt);
                return ticketDate >= dayStart && ticketDate <= dayEnd;
            });

            const count = dayTickets.length;
            const resolved = dayTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

            data.push(count);
            resolvedData.push(resolved);
        }

        const totalWeek = data.reduce((a, b) => a + b, 0);

        if (totalWeek === 0) {
            const chartContainer = container.querySelector('.chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="empty-chart-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-tertiary); margin-bottom: 1rem;">
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">No hay actividad esta semana</p>
                        <p style="color: var(--text-tertiary); font-size: 0.8rem;">Los tickets de los últimos 7 días aparecerán aquí</p>
                    </div>
                `;
            }
            return;
        }

        // Esperar a que el canvas esté disponible
        await new Promise(resolve => setTimeout(resolve, 100));

        if (typeof Charts === 'undefined' || !Charts.line) {
            console.warn('Charts no disponible');
            return;
        }

        const canvas = document.getElementById('ticketsTrendCanvas');
        if (!canvas) {
            console.warn('Canvas no encontrado para tendencia');
            return;
        }

        try {
            Charts.line('ticketsTrendCanvas', {
                labels: labels,
                datasets: [
                    {
                        label: 'Creados',
                        data: data,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Resueltos',
                        data: resolvedData,
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            }, {
                plugins: {
                    datalabels: {
                        display: false
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'center',
                        labels: {
                            padding: 10,
                            usePointStyle: true,
                            boxWidth: 8,
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 5,
                        right: 5
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 0,
                            minRotation: 0,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: true
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: true
                        }
                    }
                }
            });

            // Agregar resumen debajo del gráfico
            const chartContainer = container.querySelector('.chart-container');
            if (chartContainer && !chartContainer.querySelector('.chart-summary')) {
                const summary = document.createElement('div');
                summary.className = 'chart-summary';
                const totalResolved = resolvedData.reduce((a, b) => a + b, 0);
                const avgPerDay = Math.round(totalWeek / 7);
                summary.innerHTML = `
                    <div style="text-align: center; flex: 1; min-width: 0; padding: 0 0.5rem; overflow: hidden;">
                        <div style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${totalWeek}</div>
                        <div style="font-size: 0.7rem; color: var(--text-tertiary); line-height: 1.2; margin-top: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Total Semana</div>
                    </div>
                    <div style="text-align: center; flex: 1; min-width: 0; padding: 0 0.5rem; overflow: hidden;">
                        <div style="font-size: 1.4rem; font-weight: 700; color: #22c55e; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${totalResolved}</div>
                        <div style="font-size: 0.7rem; color: var(--text-tertiary); line-height: 1.2; margin-top: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Resueltos</div>
                    </div>
                    <div style="text-align: center; flex: 1; min-width: 0; padding: 0 0.5rem; overflow: hidden;">
                        <div style="font-size: 1.4rem; font-weight: 700; color: #3b82f6; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${avgPerDay}</div>
                        <div style="font-size: 0.7rem; color: var(--text-tertiary); line-height: 1.2; margin-top: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Promedio/Día</div>
                    </div>
                `;
                chartContainer.appendChild(summary);
            }
        } catch (error) {
            console.error('Error al renderizar gráfico de tendencia:', error);
        }
    },

    // ========================================
    // RENDIMIENTO DEL SISTEMA
    // ========================================

    async renderPerformance() {
        const container = document.getElementById('performanceContent');
        if (!container) return;

        let tickets = [];
        try {
            tickets = await Store.getTickets();
        } catch (e) {
            console.warn('No se pudieron obtener tickets para rendimiento');
        }

        // Calcular métricas de rendimiento
        const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
        const avgResolutionTime = this.calculateAvgResolutionTime(resolvedTickets);
        const responseTime = this.calculateAvgResponseTime(tickets);
        const totalTickets = tickets.length;
        const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
        const resolvedCount = resolvedTickets.length;
        const resolutionRate = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 0;

        container.innerHTML = `
            <div class="performance-metric">
                <div class="performance-icon" style="background: rgba(34, 197, 94, 0.15); color: #22c55e;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <div class="performance-content">
                    <div class="performance-label">Tiempo Promedio de Resolución</div>
                    <div class="performance-value">${avgResolutionTime}</div>
                </div>
            </div>
            <div class="performance-metric">
                <div class="performance-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                </div>
                <div class="performance-content">
                    <div class="performance-label">Tiempo de Respuesta</div>
                    <div class="performance-value">${responseTime}</div>
                </div>
            </div>
            <div class="performance-metric">
                <div class="performance-icon" style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                </div>
                <div class="performance-content">
                    <div class="performance-label">Tasa de Resolución</div>
                    <div class="performance-value">${resolutionRate}%</div>
                </div>
            </div>
            <div class="performance-metric">
                <div class="performance-icon" style="background: rgba(249, 115, 22, 0.15); color: #f97316;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path></svg>
                </div>
                <div class="performance-content">
                    <div class="performance-label">Tickets Pendientes</div>
                    <div class="performance-value">${openTickets}</div>
                </div>
            </div>
        `;
    },

    calculateAvgResolutionTime(resolvedTickets) {
        if (!resolvedTickets || resolvedTickets.length === 0) return 'N/A';

        const times = resolvedTickets
            .filter(t => t.createdAt && t.resolvedAt)
            .map(t => {
                const created = new Date(t.createdAt);
                const resolved = new Date(t.resolvedAt);
                return (resolved - created) / (1000 * 60 * 60); // horas
            })
            .filter(t => t > 0 && t < 10000); // Filtrar valores anómalos

        if (times.length === 0) return 'N/A';

        const avgHours = times.reduce((a, b) => a + b, 0) / times.length;
        
        if (avgHours < 1) {
            return `${Math.round(avgHours * 60)} min`;
        } else if (avgHours < 24) {
            return `${Math.round(avgHours)} hrs`;
        } else {
            return `${Math.round(avgHours / 24)} días`;
        }
    },

    calculateAvgResponseTime(tickets) {
        // Simplificado - en producción se calcularía desde el primer comentario
        const inProgress = tickets.filter(t => t.status === 'in_progress' || t.status === 'resolved');
        if (inProgress.length === 0) return 'N/A';
        
        // Simulación
        return '< 1 hora';
    },

    // ========================================
    // TOP TÉCNICOS - Gráfica de Pastel
    // ========================================

    async renderTopTechnicians() {
        const container = document.getElementById('topTechnicians');
        if (!container) return;
        
        const chartContainer = container.querySelector('.chart-container');
        if (!chartContainer) return;

        let tickets = [];
        let employees = [];
        let users = [];
        
        try {
            tickets = await Store.getTickets();
            employees = await Store.getEmployees();
            users = await Store.getUsers();
        } catch (e) {
            console.warn('No se pudieron obtener datos para técnicos:', e);
        }

        // Combinar empleados y usuarios para obtener nombres ANTES de contar tickets
        const allPeople = [
            ...employees.map(e => ({ 
                id: e.id?.toString() || '', 
                email: e.email?.toString() || '',
                name: e.name || '', 
                lastName: e.lastName || '', 
                type: 'employee',
                role: 'employee'
            })),
            ...users.map(u => ({ 
                id: u.id?.toString() || '', 
                email: u.email?.toString() || '',
                name: u.name || u.email?.split('@')[0] || 'Usuario', 
                lastName: '', 
                type: 'user',
                role: u.role || 'user'
            }))
        ];

        // Agregar también emails como IDs alternativos
        allPeople.forEach(person => {
            if (person.email && person.email !== person.id) {
                allPeople.push({
                    ...person,
                    id: person.email,
                    isEmailId: true
                });
            }
        });

        // Contar tickets por técnico (puede ser empleado o usuario del sistema)
        const technicianStats = {};
        
        tickets.forEach(ticket => {
            // Tickets asignados directamente - usar asignadoId (campo usado en el sistema)
            const assignedId = ticket.asignadoId || ticket.assignedTo || ticket.assignedToId;
            
            if (assignedId) {
                // Normalizar el ID para evitar duplicados
                const normalizedId = assignedId.toString();
                
                if (!technicianStats[normalizedId]) {
                    technicianStats[normalizedId] = {
                        id: normalizedId,
                        tickets: 0,
                        resolved: 0,
                        inProgress: 0,
                        comments: 0,
                        name: ticket.asignadoNombre || null
                    };
                }
                technicianStats[normalizedId].tickets++;
                
                if (ticket.status === 'resolved' || ticket.status === 'closed') {
                    technicianStats[normalizedId].resolved++;
                } else if (ticket.status === 'in_progress') {
                    technicianStats[normalizedId].inProgress++;
                }
            }
        });

        // Preparar datos para la gráfica de pastel
        // Obtener todos los técnicos con sus tickets totales
        const techniciansData = Object.values(technicianStats)
            .map(stat => {
                const statId = stat.id?.toString() || '';
                
                // Buscar información de la persona - búsqueda más flexible
                let person = null;
                
                // Buscar por coincidencia exacta de ID
                person = allPeople.find(p => {
                    const pId = p.id?.toString() || '';
                    const pEmail = p.email?.toString() || '';
                    return pId === statId || pEmail === statId;
                });
                
                // Si no se encuentra, buscar en empleados y usuarios directamente
                if (!person) {
                    const emp = employees.find(e => {
                        const eId = e.id?.toString() || '';
                        const eEmail = e.email?.toString() || '';
                        return eId === statId || eEmail === statId;
                    });
                    
                    if (emp) {
                        person = {
                            id: emp.id?.toString() || '',
                            email: emp.email?.toString() || '',
                            name: emp.name || '',
                            lastName: emp.lastName || '',
                            type: 'employee',
                            role: 'employee'
                        };
                    } else {
                        const usr = users.find(u => {
                            const uId = u.id?.toString() || '';
                            const uEmail = u.email?.toString() || '';
                            return uId === statId || uEmail === statId;
                        });
                        
                        if (usr) {
                            person = {
                                id: usr.id?.toString() || '',
                                email: usr.email?.toString() || '',
                                name: usr.name || usr.email?.split('@')[0] || 'Usuario',
                                lastName: '',
                                type: 'user',
                                role: usr.role || 'user'
                            };
                        }
                    }
                }
                
                // Determinar el nombre a mostrar
                let fullName = stat.name || null;
                
                if (!fullName && person) {
                    fullName = `${person.name || ''} ${person.lastName || ''}`.trim() || person.email?.split('@')[0] || 'Sin nombre';
                }
                
                if (!fullName) {
                    if (statId.includes('@')) {
                        fullName = statId.split('@')[0];
                    } else if (statId) {
                        fullName = `Técnico ${statId.substring(0, 8)}`;
                    } else {
                        fullName = 'Sin nombre';
                    }
                }
                
                // Determinar el rol
                let role = 'user';
                if (person) {
                    role = person.role === 'admin' ? 'admin' : 
                           person.role === 'manager' ? 'manager' : 
                           person.type === 'employee' ? 'employee' : 'user';
                } else {
                    // Buscar rol en empleados o usuarios
                    const emp = employees.find(e => {
                        const eId = e.id?.toString() || '';
                        return eId === statId;
                    });
                    if (emp) {
                        role = 'employee';
                    } else {
                        const usr = users.find(u => {
                            const uId = u.id?.toString() || '';
                            return uId === statId;
                        });
                        if (usr) {
                            role = usr.role || 'user';
                        }
                    }
                }
                
                return {
                    name: fullName,
                    role: role,
                    tickets: stat.tickets,
                    id: statId
                };
            })
            .filter(tech => tech.tickets > 0) // Solo técnicos con tickets
            .sort((a, b) => b.tickets - a.tickets); // Ordenar por cantidad de tickets

        // Debug: mostrar información en consola
        console.log('=== DEBUG TÉCNICOS MÁS ACTIVOS ===');
        console.log('Total tickets:', tickets.length);
        console.log('Tickets con asignación:', tickets.filter(t => t.asignadoId || t.assignedTo || t.assignedToId).length);
        console.log('Estadísticas de técnicos:', technicianStats);
        console.log('Técnicos encontrados:', Object.keys(technicianStats).length);
        console.log('Datos para gráfica:', techniciansData);
        console.log('Total empleados:', employees.length);
        console.log('Total usuarios:', users.length);
        
        // Si no hay técnicos con tickets, mostrar estado vacío
        if (techniciansData.length === 0) {
            const assignedTickets = tickets.filter(t => t.asignadoId || t.assignedTo || t.assignedToId);
            chartContainer.innerHTML = `
                <div class="empty-chart-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-tertiary); margin-bottom: 1rem;">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">No hay tickets asignados a técnicos</p>
                    <p style="color: var(--text-tertiary); font-size: 0.8rem;">Total de tickets: ${tickets.length} | Con asignación: ${assignedTickets.length}</p>
                </div>
            `;
            return;
        }

        // Preparar datos para Chart.js
        // Limitar a los top 8 técnicos para que la gráfica no se vea muy saturada
        const topTechnicians = techniciansData.slice(0, 8);
        const labels = topTechnicians.map(tech => {
            const roleLabel = tech.role === 'admin' ? 'Admin' : tech.role === 'manager' ? 'Gerente' : 'Usuario';
            return `${tech.name} (${roleLabel})`;
        });
        const values = topTechnicians.map(tech => tech.tickets);
        
        // Paleta de colores variada y atractiva para diferenciar cada técnico
        const vibrantPalette = [
            '#8b5cf6', // Morado vibrante
            '#3b82f6', // Azul brillante
            '#22c55e', // Verde esmeralda
            '#f97316', // Naranja cálido
            '#ef4444', // Rojo coral
            '#06b6d4', // Cian turquesa
            '#ec4899', // Rosa magenta
            '#84cc16', // Lima verde
            '#6366f1', // Índigo
            '#14b8a6', // Teal
            '#f59e0b', // Ámbar
            '#a855f7'  // Púrpura
        ];
        
        // Asignar un color único a cada técnico basado en su índice
        const colors = topTechnicians.map((tech, index) => {
            return vibrantPalette[index % vibrantPalette.length];
        });

        // Esperar a que el canvas esté disponible
        await new Promise(resolve => setTimeout(resolve, 100));

        if (typeof Charts === 'undefined' || !Charts.doughnut) {
            console.warn('Charts no disponible');
            return;
        }

        const canvas = document.getElementById('techniciansChartCanvas');
        if (!canvas) {
            console.warn('Canvas no encontrado para técnicos');
            return;
        }

        try {
            Charts.doughnut('techniciansChartCanvas', {
                labels: labels,
                values: values,
                colors: colors
            }, {
                cutout: '65%',
                plugins: {
                    legend: {
                        display: true,
                        position: 'right',
                        align: 'start',
                        labels: {
                            padding: 14,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 12,
                            boxHeight: 12,
                            font: {
                                size: 11,
                                weight: '500',
                                family: 'Outfit, sans-serif'
                            },
                            color: function(context) {
                                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                return isDark ? '#b0b0b0' : '#5c5c5c';
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                        return {
                                            text: `${label} - ${value} (${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: function(context) {
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            return isDark ? '#1a1a1a' : '#ffffff';
                        },
                        titleColor: function(context) {
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            return isDark ? '#f5f5f5' : '#1a1a1a';
                        },
                        bodyColor: function(context) {
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            return isDark ? '#b0b0b0' : '#5c5c5c';
                        },
                        borderColor: function(context) {
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            return isDark ? '#2a2a2a' : '#e8e4dc';
                        },
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        callbacks: {
                            title: function(context) {
                                return context[0].label.split(' (')[0];
                            },
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                const roleLabel = label.includes('(Admin)') ? 'Admin' : 
                                                 label.includes('(Gerente)') ? 'Gerente' : 'Usuario';
                                return [
                                    `Tickets: ${value}`,
                                    `Porcentaje: ${percentage}%`,
                                    `Rol: ${roleLabel}`
                                ];
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 15,
                        right: 15,
                        top: 15,
                        bottom: 15
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                elements: {
                    arc: {
                        borderWidth: 2,
                        borderColor: function(context) {
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            return isDark ? '#1a1a1a' : '#ffffff';
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error al renderizar gráfico de técnicos:', error);
        }
    },

    getProgressColor(percentage) {
        if (percentage >= 80) return '#22c55e';
        if (percentage >= 60) return '#3b82f6';
        if (percentage >= 40) return '#f97316';
        return '#ef4444';
    },

    // ========================================
    // RESUMEN FINANCIERO
    // ========================================

    async renderFinancialSummary() {
        const container = document.getElementById('financialContent');
        if (!container) return;

        let licenses = [];
        try {
            licenses = await Store.getLicenses();
        } catch (e) {
            console.warn('No se pudieron obtener licencias');
        }

        // Calcular costos
        let monthlyCost = 0;
        let annualCost = 0;
        const upcomingBilling = [];

        licenses.forEach(license => {
            if (license.isBilling && license.cost) {
                const cost = parseFloat(license.cost) || 0;
                const monthly = this.getMonthlyCost(license);
                monthlyCost += monthly;
                annualCost += monthly * 12;
                
                // Próximas facturaciones (próximos 30 días)
                if (license.billingDate) {
                    const billDate = new Date(license.billingDate);
                    const today = new Date();
                    const daysDiff = Math.ceil((billDate - today) / (1000 * 60 * 60 * 24));
                    
                    if (daysDiff >= 0 && daysDiff <= 30) {
                        upcomingBilling.push({
                            name: license.software,
                            date: billDate,
                            amount: cost,
                            daysLeft: daysDiff
                        });
                    }
                }
            }
        });

        upcomingBilling.sort((a, b) => a.daysLeft - b.daysLeft);

        container.innerHTML = `
            <div class="financial-metric">
                <div class="financial-label">Costo Mensual Total</div>
                <div class="financial-value">${this.formatCurrency(monthlyCost)}</div>
            </div>
            <div class="financial-metric">
                <div class="financial-label">Proyección Anual</div>
                <div class="financial-value">${this.formatCurrency(annualCost)}</div>
            </div>
            ${upcomingBilling.length > 0 ? `
                <div class="financial-upcoming">
                    <div class="financial-upcoming-title">Próximas Facturaciones</div>
                    ${upcomingBilling.slice(0, 3).map(item => `
                        <div class="financial-upcoming-item">
                            <span>${this.escapeHtml(item.name)}</span>
                            <span class="financial-upcoming-amount">${this.formatCurrency(item.amount)}</span>
                            <span class="financial-upcoming-date">${item.daysLeft === 0 ? 'Hoy' : `En ${item.daysLeft} días`}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    },

    getMonthlyCost(license) {
        if (!license.cost || !license.periodicity) return 0;
        
        const cost = parseFloat(license.cost) || 0;
        const periodicity = license.periodicity;
        
        switch(periodicity) {
            case 'monthly': return cost;
            case 'quarterly': return cost / 3;
            case 'semiannual': return cost / 6;
            case 'annual': return cost / 12;
            case 'one-time': return 0;
            default: return cost;
        }
    },

    formatCurrency(amount) {
        if (amount === 0) return '$0';
        if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
        if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
        return `$${Math.round(amount).toLocaleString('es-MX')}`;
    },

    // ========================================
    // LOG DE ACTIVIDAD EN TIEMPO REAL
    // ========================================

    async renderActivityLog() {
        const container = document.getElementById('activityLogContainer');
        if (!container) return;

        let activities = [];
        try {
            activities = await Store.getActivityLog(30) || [];
            // Ordenar por fecha más reciente
            activities.sort((a, b) => {
                const dateA = new Date(a.timestamp || a.createdAt || 0);
                const dateB = new Date(b.timestamp || b.createdAt || 0);
                return dateB - dateA;
            });
        } catch (e) {
            console.warn('No se pudo obtener log de actividad:', e);
        }

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-tertiary); margin-bottom: 1rem;">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">No hay actividad registrada</p>
                    <p style="color: var(--text-tertiary); font-size: 0.8rem;">Las acciones del sistema aparecerán aquí</p>
                </div>
            `;
            return;
        }

        // Renderizar actividades
        const activityHTML = await Promise.all(activities.slice(0, 20).map(async (activity, index) => {
            const activityType = activity.type || activity.action || 'ticket_created';
            const icon = this.getActivityIcon(activityType);
            const description = await this.getActivityDescription(activity);
            const time = this.timeAgo(activity.timestamp || activity.createdAt);
            const bgColor = this.getActivityColor(activityType);
            const textColor = this.getActivityTextColor(activityType);
            const userName = activity.userName || activity.user || activity.createdBy || 'Sistema';

            return `
                <div class="activity-log-item" style="animation-delay: ${index * 0.05}s">
                    <div class="activity-log-icon" style="background: ${bgColor}; color: ${textColor};">
                        ${icon}
                    </div>
                    <div class="activity-log-content">
                        <div class="activity-log-header">
                            <span class="activity-log-user">${this.escapeHtml(userName)}</span>
                            <span class="activity-log-time">${time}</span>
                        </div>
                        <div class="activity-log-description">${this.escapeHtml(description.title || description.text || 'Actividad del sistema')}</div>
                        ${description.text && description.text !== description.title ? `<div class="activity-log-detail">${this.escapeHtml(description.text)}</div>` : ''}
                    </div>
                </div>
            `;
        }));

        container.innerHTML = activityHTML.join('');
        
        // Scroll automático suave al top cuando hay nuevas actividades
        if (container.scrollTop === 0) {
            container.scrollTop = 0;
        }
    },

    startActivityLogRefresh() {
        // Actualizar cada 2 segundos
        this.activityLogInterval = setInterval(async () => {
            await this.renderActivityLog();
        }, 2000);
    },

    getTicketStatusColor(status) {
        const colors = {
            open: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
            in_progress: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
            resolved: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
            closed: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' }
        };
        return colors[status] || colors.open;
    },

    // ========================================
    // HELPER FUNCTIONS PARA LOG DE ACTIVIDAD
    // ========================================

    getActivityIcon(type) {
        const icons = {
            ticket_created: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path></svg>`,
            ticket_updated: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
            machine_assigned: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line></svg>`,
            machine_unassigned: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
            license_assigned: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline></svg>`,
            license_unassigned: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="8 17 3 12 8 7"></polyline></svg>`,
            employee_created: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>`,
            user_created: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
            user_login: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`,
            user_login_google: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`,
            user_logout: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
            comment_added: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
            status_changed: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`
        };
        return icons[type] || icons.ticket_created;
    },

    getActivityColor(type) {
        const colors = {
            ticket_created: 'rgba(59, 130, 246, 0.15)',
            ticket_updated: 'rgba(139, 92, 246, 0.15)',
            machine_assigned: 'rgba(34, 197, 94, 0.15)',
            machine_unassigned: 'rgba(239, 68, 68, 0.15)',
            license_assigned: 'rgba(249, 115, 22, 0.15)',
            license_unassigned: 'rgba(239, 68, 68, 0.15)',
            employee_created: 'rgba(168, 85, 247, 0.15)',
            user_created: 'rgba(59, 130, 246, 0.15)',
            user_login: 'rgba(34, 197, 94, 0.15)',
            user_login_google: 'rgba(34, 197, 94, 0.15)',
            user_logout: 'rgba(107, 114, 128, 0.15)',
            comment_added: 'rgba(139, 92, 246, 0.15)',
            status_changed: 'rgba(34, 197, 94, 0.15)'
        };
        return colors[type] || 'rgba(107, 114, 128, 0.15)';
    },

    getActivityTextColor(type) {
        const colors = {
            ticket_created: '#3b82f6',
            ticket_updated: '#8b5cf6',
            machine_assigned: '#22c55e',
            machine_unassigned: '#ef4444',
            license_assigned: '#f97316',
            license_unassigned: '#ef4444',
            employee_created: '#a855f7',
            user_created: '#3b82f6',
            user_login: '#22c55e',
            user_login_google: '#22c55e',
            user_logout: '#6b7280',
            comment_added: '#8b5cf6',
            status_changed: '#22c55e'
        };
        return colors[type] || '#6b7280';
    },

    async getActivityDescription(activity) {
        try {
            const type = activity.type || activity.action || '';
            const data = activity.data || activity.details || {};
            
            if (type.includes('ticket')) {
                let ticket = null;
                if (data.ticketId) {
                    try {
                        ticket = await Store.getTicketById(data.ticketId);
                    } catch (e) {}
                }
                
                if (type === 'ticket_created' || type === 'ticket.created') {
                    return {
                        title: 'Ticket creado',
                        text: ticket ? (ticket.title || ticket.folio || 'Sin título') : (data.title || data.ticketFolio || 'Nuevo ticket')
                    };
                } else if (type === 'ticket_updated' || type === 'ticket.updated') {
                    return {
                        title: 'Ticket actualizado',
                        text: ticket ? (ticket.title || ticket.folio || 'Sin título') : (data.title || data.ticketFolio || 'Ticket actualizado')
                    };
                } else if (type === 'comment_added' || type === 'comment.added') {
                    return {
                        title: 'Comentario agregado',
                        text: ticket ? (ticket.title || ticket.folio || 'Sin título') : (data.ticketFolio || 'En un ticket')
                    };
                } else if (type === 'status_changed' || type === 'status.changed') {
                    const statusLabels = {
                        open: 'Abierto',
                        in_progress: 'En Progreso',
                        resolved: 'Resuelto',
                        closed: 'Cerrado'
                    };
                    const fromLabel = statusLabels[data.from] || data.from || 'Desconocido';
                    const toLabel = statusLabels[data.to] || data.to || 'Desconocido';
                    return {
                        title: 'Estado de ticket cambiado',
                        text: ticket ? (ticket.title || ticket.folio || 'Sin título') : (data.ticketFolio || 'Ticket') + `: ${fromLabel} → ${toLabel}`
                    };
                }
            }
            
            if (type.includes('machine') || type.includes('máquina')) {
                if (type === 'machine_assigned') {
                    return {
                        title: 'Máquina asignada',
                        text: data.machineName || data.machineId || 'Máquina'
                    };
                } else if (type === 'machine_unassigned') {
                    return {
                        title: 'Máquina desasignada',
                        text: data.machineName || data.machineId || 'Máquina'
                    };
                }
            }
            
            if (type.includes('license') || type.includes('licencia')) {
                if (type === 'license_assigned') {
                    return {
                        title: 'Licencia asignada',
                        text: data.licenseName || data.software || 'Licencia'
                    };
                } else if (type === 'license_unassigned') {
                    return {
                        title: 'Licencia desasignada',
                        text: data.licenseName || data.software || 'Licencia'
                    };
                }
            }
            
            if (type.includes('employee') || type.includes('empleado')) {
                return {
                    title: 'Empleado creado',
                    text: data.employeeName || 'Nuevo empleado'
                };
            }
            
            if (type.includes('user') || type.includes('usuario')) {
                if (type === 'user_login' || type === 'user_login_google') {
                    return {
                        title: 'Inicio de sesión',
                        text: data.email || 'Usuario'
                    };
                } else if (type === 'user_logout') {
                    return {
                        title: 'Cierre de sesión',
                        text: data.email || 'Usuario'
                    };
                } else {
                    return {
                        title: 'Usuario creado',
                        text: data.userName || data.email || 'Nuevo usuario'
                    };
                }
            }
            
            // Descripción genérica
            return {
                title: activity.type || activity.action || 'Actividad',
                text: activity.description || activity.message || data.title || 'Acción realizada en el sistema'
            };
        } catch (e) {
            console.warn('Error al obtener descripción de actividad:', e);
        }
        
        return {
            title: 'Actividad del sistema',
            text: activity.type || activity.description || 'Acción realizada'
        };
    },

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    getStatusLabel(status) {
        const labels = {
            open: 'Abierto',
            in_progress: 'En Progreso',
            resolved: 'Resuelto',
            closed: 'Cerrado'
        };
        return labels[status] || status;
    },

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

    // ========================================
    // AUTO-REFRESH
    // ========================================

    startAutoRefresh() {
        setInterval(async () => {
            await this.renderMetrics();
            await this.renderCharts();
            await this.renderPerformance();
            await this.renderTopTechnicians();
            await this.renderFinancialSummary();
            await this.renderShortcuts();
            if (typeof Sidebar !== 'undefined' && Sidebar.updateBadges) {
                Sidebar.updateBadges();
            }
        }, 5 * 60 * 1000); // 5 minutos
    },

    // Limpiar intervalos al salir
    destroy() {
        if (this.activityLogInterval) {
            clearInterval(this.activityLogInterval);
        }
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        await DashboardModule.init();
    }, 100);
});

// Exportar para uso global
window.DashboardModule = DashboardModule;
