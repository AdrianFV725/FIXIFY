// ========================================
// ANALYTICS MODULE
// Reportes y graficas de analitica
// ========================================

const AnalyticsModule = {
    dateRange: '30d',

    init() {
        if (!Auth.requireAuth()) return;
        this.bindEvents();
        this.renderAll();
    },

    bindEvents() {
        document.querySelectorAll('.date-btn')?.forEach(btn => {
            btn.addEventListener('click', () => this.setDateRange(btn.dataset.range));
        });

        document.getElementById('exportReportBtn')?.addEventListener('click', () => this.exportReport());
    },

    setDateRange(range) {
        this.dateRange = range;
        document.querySelectorAll('.date-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });
        this.renderAll();
    },

    renderAll() {
        this.renderKPIs();
        this.renderTicketsCharts();
        this.renderMachinesCharts();
        this.renderLicensesCharts();
        this.renderInsights();
    },

    renderKPIs() {
        const container = document.getElementById('analyticsKpis');
        if (!container) return;

        const stats = Store.getStats();
        const tickets = Store.getTickets();
        const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');

        const kpis = [
            { label: 'Tickets Resueltos', value: resolved.length, icon: 'check', color: '#22c55e' },
            { label: 'Tiempo Prom. Resolucion', value: this.getAvgResolutionTime(resolved), icon: 'clock', color: '#3b82f6' },
            { label: 'Tickets Abiertos', value: stats.tickets.open, icon: 'alert', color: '#f97316' },
            { label: 'Maq. Problematicas', value: Store.getMostProblematicMachines(1).length, icon: 'warning', color: '#ef4444' }
        ];

        container.innerHTML = kpis.map(kpi => `
            <div class="kpi-card">
                <div class="kpi-value">${kpi.value}</div>
                <div class="kpi-label">${kpi.label}</div>
            </div>
        `).join('');
    },

    getAvgResolutionTime(resolvedTickets) {
        if (resolvedTickets.length === 0) return '0 hrs';
        
        const totalHours = resolvedTickets.reduce((sum, t) => {
            if (!t.resolvedAt) return sum;
            const created = new Date(t.createdAt);
            const resolved = new Date(t.resolvedAt);
            return sum + (resolved - created) / (1000 * 60 * 60);
        }, 0);

        const avg = totalHours / resolvedTickets.length;
        if (avg < 1) return `${Math.round(avg * 60)} min`;
        if (avg < 24) return `${Math.round(avg)} hrs`;
        return `${Math.round(avg / 24)} dias`;
    },

    renderTicketsCharts() {
        // Tendencia de tickets
        const trendContainer = document.getElementById('ticketsTrendChart');
        if (trendContainer) {
            trendContainer.innerHTML = `
                <h3 class="chart-title">Tendencia de Tickets</h3>
                <div class="chart-container"><canvas id="ticketsTrendCanvas"></canvas></div>
            `;

            const labels = Charts.getMonthLabels(6);
            const data = [12, 8, 15, 10, 18, 14]; // TODO: Calcular real

            Charts.line('ticketsTrendCanvas', {
                labels,
                datasets: [{ label: 'Tickets', data, borderColor: '#3b82f6' }]
            });
        }

        // Por categoria
        const catContainer = document.getElementById('ticketsByCategoryChart');
        if (catContainer) {
            catContainer.innerHTML = `
                <h3 class="chart-title">Tickets por Categoria</h3>
                <div class="chart-container"><canvas id="ticketsCategoryCanvas"></canvas></div>
            `;

            const tickets = Store.getTickets();
            const byCategory = Utils.groupBy(tickets, 'category');

            Charts.doughnut('ticketsCategoryCanvas', {
                labels: Object.keys(byCategory).map(k => k || 'Sin categoria'),
                values: Object.values(byCategory).map(arr => arr.length)
            });
        }

        // Por prioridad
        const prioContainer = document.getElementById('ticketsByPriorityChart');
        if (prioContainer) {
            prioContainer.innerHTML = `
                <h3 class="chart-title">Por Prioridad</h3>
                <div class="chart-container"><canvas id="ticketsPriorityCanvas"></canvas></div>
            `;

            const tickets = Store.getTickets();
            const byPriority = Utils.groupBy(tickets, 'priority');

            Charts.horizontalBar('ticketsPriorityCanvas', {
                labels: ['Critica', 'Alta', 'Media', 'Baja'],
                datasets: [{
                    label: 'Tickets',
                    data: [
                        byPriority.critical?.length || 0,
                        byPriority.high?.length || 0,
                        byPriority.medium?.length || 0,
                        byPriority.low?.length || 0
                    ],
                    backgroundColor: ['#ef4444', '#f97316', '#eab308', '#6b7280']
                }]
            });
        }
    },

    renderMachinesCharts() {
        const failuresContainer = document.getElementById('machineFailuresChart');
        if (failuresContainer) {
            failuresContainer.innerHTML = `
                <h3 class="chart-title">Maquinas con Mas Fallas</h3>
                <div class="chart-container"><canvas id="machineFailuresCanvas"></canvas></div>
                <div class="chart-highlight" id="machineHighlight"></div>
            `;

            const problematic = Store.getMostProblematicMachines(5);
            
            if (problematic.length > 0) {
                Charts.horizontalBar('machineFailuresCanvas', {
                    labels: problematic.map(m => m.name || m.serialNumber),
                    datasets: [{
                        label: 'Tickets',
                        data: problematic.map(m => m.ticketCount),
                        backgroundColor: '#ef4444'
                    }]
                });

                const worst = problematic[0];
                document.getElementById('machineHighlight').innerHTML = `
                    <p style="font-size: 0.875rem;"><strong>Maquina mas problematica:</strong> ${worst.name}</p>
                    <p style="font-size: 0.8rem; color: var(--text-tertiary);">${worst.ticketCount} tickets registrados</p>
                `;
            }
        }

        const typeContainer = document.getElementById('machinesByTypeChart');
        if (typeContainer) {
            typeContainer.innerHTML = `
                <h3 class="chart-title">Maquinas por Tipo</h3>
                <div class="chart-container"><canvas id="machinesTypeCanvas"></canvas></div>
            `;

            const machines = Store.getMachines();
            const byType = Utils.groupBy(machines, 'type');

            Charts.doughnut('machinesTypeCanvas', {
                labels: Object.keys(byType).map(k => k || 'Sin tipo'),
                values: Object.values(byType).map(arr => arr.length)
            });
        }
    },

    renderLicensesCharts() {
        const distContainer = document.getElementById('licenseDistributionChart');
        if (distContainer) {
            distContainer.innerHTML = `
                <h3 class="chart-title">Licencias Mas Utilizadas</h3>
                <div class="chart-container"><canvas id="licenseDistCanvas"></canvas></div>
                <div class="chart-highlight" id="licenseHighlight"></div>
            `;

            const mostUsed = Store.getMostUsedLicenses(5);
            
            if (mostUsed.length > 0) {
                Charts.horizontalBar('licenseDistCanvas', {
                    labels: mostUsed.map(l => l.software),
                    datasets: [{
                        label: 'Asignaciones',
                        data: mostUsed.map(l => l.assignedCount || 0),
                        backgroundColor: '#3b82f6'
                    }]
                });

                const top = mostUsed[0];
                document.getElementById('licenseHighlight').innerHTML = `
                    <p style="font-size: 0.875rem;"><strong>Licencia mas popular:</strong> ${top.software}</p>
                    <p style="font-size: 0.8rem; color: var(--text-tertiary);">${top.assignedCount || 0} asignaciones</p>
                `;
            }
        }
    },

    renderInsights() {
        const container = document.getElementById('insightsSection');
        if (!container) return;

        const insights = this.generateInsights();
        
        const gridHtml = insights.length > 0 ? `
            <div class="insights-grid">
                ${insights.map(i => `
                    <div class="insight-card ${i.type}">
                        <h4 style="font-size: 0.9rem; margin-bottom: 0.5rem;">${i.title}</h4>
                        <p style="font-size: 0.8rem; color: var(--text-secondary);">${i.message}</p>
                    </div>
                `).join('')}
            </div>
        ` : '<p class="text-muted">No hay insights disponibles con los datos actuales</p>';

        container.innerHTML = `<h2 class="section-title">Insights y Recomendaciones</h2>${gridHtml}`;
    },

    generateInsights() {
        const insights = [];
        const stats = Store.getStats();

        // Maquinas problematicas
        const problematic = Store.getMostProblematicMachines(1)[0];
        if (problematic && problematic.ticketCount >= 3) {
            insights.push({
                type: 'warning',
                title: 'Maquina con alta incidencia',
                message: `${problematic.name} tiene ${problematic.ticketCount} tickets. Considera revisar o reemplazar este equipo.`
            });
        }

        // Licencias por vencer
        const expiring = Store.getExpiringLicenses(30);
        if (expiring.length > 0) {
            insights.push({
                type: 'danger',
                title: 'Licencias por vencer',
                message: `${expiring.length} licencia${expiring.length > 1 ? 's' : ''} vencera${expiring.length > 1 ? 'n' : ''} en los proximos 30 dias. Revisa las renovaciones.`
            });
        }

        // Tickets abiertos
        if (stats.tickets.open > 5) {
            insights.push({
                type: 'warning',
                title: 'Tickets pendientes',
                message: `Hay ${stats.tickets.open} tickets abiertos. Revisa la carga de trabajo del equipo.`
            });
        }

        // Maquinas sin asignar
        if (stats.machines.available > stats.machines.total * 0.3) {
            insights.push({
                type: '',
                title: 'Equipos disponibles',
                message: `${stats.machines.available} maquinas estan sin asignar. Considera redistribuir recursos.`
            });
        }

        return insights;
    },

    exportReport() {
        Toast.info('Generando reporte...');
        
        const stats = Store.getStats();
        const report = {
            generatedAt: new Date().toISOString(),
            period: this.dateRange,
            summary: stats,
            problematicMachines: Store.getMostProblematicMachines(10),
            expiringLicenses: Store.getExpiringLicenses(30),
            insights: this.generateInsights()
        };

        // Simular descarga de JSON
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `fixify-report-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        Toast.success('Reporte exportado');
    }
};

document.addEventListener('DOMContentLoaded', () => AnalyticsModule.init());
window.AnalyticsModule = AnalyticsModule;

