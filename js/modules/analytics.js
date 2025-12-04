// ========================================
// ANALYTICS MODULE - Dashboard Enriquecido
// ========================================

const AnalyticsModule = {
    data: {
        tickets: [],
        machines: [],
        employees: [],
        licenses: [],
        assignments: [],
        categories: []
    },

    // Filtro de tiempo activo
    dateRange: '30d',
    customDateStart: null,
    customDateEnd: null,

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        await this.loadAllData();
        await this.renderDashboard();
        this.bindEvents();
    },

    bindEvents() {
        // Filtros de tiempo
        const dateRangePicker = document.getElementById('dateRangePicker');
        if (dateRangePicker) {
            dateRangePicker.addEventListener('click', async (e) => {
                const btn = e.target.closest('.date-btn');
                if (btn) {
                    const range = btn.dataset.range;
                    if (range === 'custom') {
                        this.showCustomDateModal();
                    } else {
                        await this.setDateRange(range);
                    }
                }
            });
        }

        // Boton exportar
        const exportBtn = document.getElementById('exportReportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.showExportModal());
        }

        // Boton recargar datos
        const refreshBtn = document.getElementById('refreshDataBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    Cargando...
                `;
                try {
                    await this.loadAllData();
                    await this.renderDashboard();
                    this.showToast('Datos recargados correctamente', 'success');
                } catch (e) {
                    console.error('Error recargando datos:', e);
                    this.showToast('Error al recargar datos', 'error');
                } finally {
                    refreshBtn.disabled = false;
                    refreshBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Recargar
                    `;
                }
            });
        }
    },

    async setDateRange(range) {
        this.dateRange = range;
        this.customDateStart = null;
        this.customDateEnd = null;
        
        // Actualizar botones activos
        document.querySelectorAll('.date-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });

        // Recargar datos y re-renderizar dashboard
        await this.loadAllData();
        await this.renderDashboard();
    },

    getDateRangeFilter() {
        const now = new Date();
        let startDate = null;

        if (this.customDateStart && this.customDateEnd) {
            return {
                start: new Date(this.customDateStart),
                end: new Date(this.customDateEnd)
            };
        }

        switch (this.dateRange) {
            case '7d':
                startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        }

        return { start: startDate, end: now };
    },

    filterByDateRange(items, dateField = 'createdAt') {
        if (!items || items.length === 0) return [];
        const { start, end } = this.getDateRangeFilter();
        return items.filter(item => {
            if (!item || !item[dateField]) return false; // Solo incluir items con fecha válida
            try {
                const itemDate = new Date(item[dateField]);
                if (isNaN(itemDate.getTime())) return false; // Fecha inválida
                return itemDate >= start && itemDate <= end;
            } catch (e) {
                console.warn('Error filtrando fecha:', item[dateField], e);
                return false;
            }
        });
    },

    async loadAllData() {
        try {
            console.log('Analytics: Cargando datos desde Store...');
            const [tickets, machines, employees, licenses, assignments, categories] = await Promise.all([
                Store.getTickets() || [],
                Store.getMachines() || [],
                Store.getEmployees() || [],
                Store.getLicenses() || [],
                Store.getMachineAssignments() || [],
                Store.getCategories() || []
            ]);
            
            console.log('Analytics: Datos cargados:', {
                tickets: tickets.length,
                machines: machines.length,
                employees: employees.length,
                licenses: licenses.length,
                assignments: assignments.length,
                categories: categories.length
            });
            
            this.data = { 
                tickets: tickets || [], 
                machines: machines || [], 
                employees: employees || [], 
                licenses: licenses || [], 
                assignments: assignments || [], 
                categories: categories || [] 
            };
        } catch (e) {
            console.error('Error cargando datos en Analytics:', e);
            this.data = { tickets: [], machines: [], employees: [], licenses: [], assignments: [], categories: [] };
        }
    },

    // ========================================
    // CALCULOS Y METRICAS
    // ========================================

    getTicketMetrics() {
        const { tickets: allTickets } = this.data;
        const now = new Date();
        
        // Filtrar tickets por rango de fecha seleccionado
        const tickets = this.filterByDateRange(allTickets || []);
        
        const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const thisWeekTickets = tickets.filter(t => {
            if (!t || !t.createdAt) return false;
            try {
                return new Date(t.createdAt) >= last7Days;
            } catch (e) {
                return false;
            }
        });

        // Tickets por estado - usando todos los tickets disponibles
        const byStatus = {
            open: tickets.filter(t => t && (t.status === 'open' || t.status === 'Open')).length,
            in_progress: tickets.filter(t => t && (t.status === 'in_progress' || t.status === 'In Progress' || t.status === 'in-progress')).length,
            resolved: tickets.filter(t => t && (t.status === 'resolved' || t.status === 'Resolved')).length,
            closed: tickets.filter(t => t && (t.status === 'closed' || t.status === 'Closed')).length
        };

        // Tickets por prioridad
        const byPriority = {
            critical: tickets.filter(t => t && (t.priority === 'critical' || t.priority === 'Critical')).length,
            high: tickets.filter(t => t && (t.priority === 'high' || t.priority === 'High')).length,
            medium: tickets.filter(t => t && (t.priority === 'medium' || t.priority === 'Medium')).length,
            low: tickets.filter(t => t && (t.priority === 'low' || t.priority === 'Low')).length
        };

        // Tickets por tipo (incidencia/requerimiento)
        const byType = {
            incidencia: tickets.filter(t => t && (t.tipo === 'incidencia' || t.tipo === 'Incidencia' || t.type === 'incidencia')).length,
            requerimiento: tickets.filter(t => t && (t.tipo === 'requerimiento' || t.tipo === 'Requerimiento' || t.type === 'requerimiento')).length
        };

        // Tickets por servicio/categoria
        const byService = {
            hardware: tickets.filter(t => t && (t.servicio === 'hardware' || t.category === 'hardware' || t.service === 'hardware')).length,
            software: tickets.filter(t => t && (t.servicio === 'software' || t.category === 'software' || t.service === 'software')).length,
            network: tickets.filter(t => t && (t.servicio === 'network' || t.category === 'network' || t.service === 'network' || t.servicio === 'red')).length,
            other: tickets.filter(t => t && (t.servicio === 'other' || t.category === 'other' || t.service === 'other')).length
        };

        // Tiempo promedio de resolucion (en horas)
        const resolvedTickets = tickets.filter(t => t.resolvedAt && t.createdAt);
        let avgResolutionTime = 0;
        if (resolvedTickets.length > 0) {
            const totalTime = resolvedTickets.reduce((acc, t) => {
                const created = new Date(t.createdAt);
                const resolved = new Date(t.resolvedAt);
                return acc + (resolved - created);
            }, 0);
            avgResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60); // en horas
        }

        // Tasa de resolucion
        const resolutionRate = tickets.length > 0 
            ? ((byStatus.resolved + byStatus.closed) / tickets.length * 100).toFixed(1)
            : 0;

        // Tickets por tema
        const byTema = {};
        tickets.forEach(t => {
            const tema = t.tema || 'Sin clasificar';
            byTema[tema] = (byTema[tema] || 0) + 1;
        });

        return {
            total: tickets.length,
            totalAll: allTickets.length,
            thisWeekCount: thisWeekTickets.length,
            byStatus,
            byPriority,
            byType,
            byService,
            byTema,
            avgResolutionTime,
            resolutionRate,
            pendingCount: byStatus.open + byStatus.in_progress
        };
    },

    // ========================================
    // MODALES
    // ========================================

    showCustomDateModal() {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const modalHtml = `
            <div class="modal-overlay active" id="customDateModal">
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Rango Personalizado</h2>
                        <button class="modal-close" onclick="document.getElementById('customDateModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="customDateForm" class="form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Fecha Inicio</label>
                                    <input type="date" name="startDate" class="form-input" value="${thirtyDaysAgo}" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Fecha Fin</label>
                                    <input type="date" name="endDate" class="form-input" value="${today}" required>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('customDateModal').remove()">Cancelar</button>
                        <button type="submit" form="customDateForm" class="btn btn-primary">Aplicar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

            document.getElementById('customDateForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            this.customDateStart = formData.get('startDate');
            this.customDateEnd = formData.get('endDate');
            this.dateRange = 'custom';

            document.querySelectorAll('.date-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.range === 'custom');
            });

            document.getElementById('customDateModal').remove();
            await this.loadAllData();
            await this.renderDashboard();
        });
    },

    showExportModal() {
        const modalHtml = `
            <div class="modal-overlay active" id="exportModal">
                <div class="modal" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Exportar Reporte</h2>
                        <button class="modal-close" onclick="document.getElementById('exportModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="export-options">
                            <div class="export-section">
                                <h4 style="font-size: 0.9rem; margin-bottom: 0.75rem; color: var(--text-primary);">Selecciona que datos incluir:</h4>
                                <div class="export-checkboxes">
                                    <label class="export-checkbox">
                                        <input type="checkbox" name="includeTickets" checked>
                                        <span class="checkmark"></span>
                                        <span>Analisis de Tickets</span>
                                    </label>
                                    <label class="export-checkbox">
                                        <input type="checkbox" name="includeMachines" checked>
                                        <span class="checkmark"></span>
                                        <span>Analisis de Maquinas</span>
                                    </label>
                                    <label class="export-checkbox">
                                        <input type="checkbox" name="includeEmployees" checked>
                                        <span class="checkmark"></span>
                                        <span>Analisis de Personal</span>
                                    </label>
                                    <label class="export-checkbox">
                                        <input type="checkbox" name="includeLicenses" checked>
                                        <span class="checkmark"></span>
                                        <span>Analisis de Licencias</span>
                                    </label>
                                    <label class="export-checkbox">
                                        <input type="checkbox" name="includeInsights" checked>
                                        <span class="checkmark"></span>
                                        <span>Insights y Alertas</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="export-section" style="margin-top: 1.25rem;">
                                <h4 style="font-size: 0.9rem; margin-bottom: 0.75rem; color: var(--text-primary);">Formato de exportacion:</h4>
                                <div class="export-formats">
                                    <label class="export-format active" data-format="csv">
                                        <input type="radio" name="format" value="csv" checked>
                                        <div class="format-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                        </div>
                                        <span class="format-name">CSV</span>
                                        <span class="format-desc">Excel compatible</span>
                                    </label>
                                    <label class="export-format" data-format="json">
                                        <input type="radio" name="format" value="json">
                                        <div class="format-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                                        </div>
                                        <span class="format-name">JSON</span>
                                        <span class="format-desc">Datos estructurados</span>
                                    </label>
                                    <label class="export-format" data-format="txt">
                                        <input type="radio" name="format" value="txt">
                                        <div class="format-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                                        </div>
                                        <span class="format-name">TXT</span>
                                        <span class="format-desc">Texto plano</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="export-preview" style="margin-top: 1.25rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <span style="font-size: 0.8rem; color: var(--text-tertiary);">Rango de datos:</span>
                                    <span style="font-size: 0.8rem; font-weight: 500;" id="exportDateRange">${this.getDateRangeLabel()}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 0.8rem; color: var(--text-tertiary);">Registros estimados:</span>
                                    <span style="font-size: 0.8rem; font-weight: 500;" id="exportRecordCount">${this.getEstimatedRecords()}</span>
                                </div>
                            </div>
                        </div>
                        
                        <style>
                            .export-checkboxes {
                                display: flex;
                                flex-direction: column;
                                gap: 0.5rem;
                            }
                            .export-checkbox {
                                display: flex;
                                align-items: center;
                                gap: 0.75rem;
                                padding: 0.5rem 0.75rem;
                                background: var(--bg-tertiary);
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 0.85rem;
                                transition: all 0.2s ease;
                            }
                            .export-checkbox:hover {
                                background: var(--border-color);
                            }
                            .export-checkbox input {
                                display: none;
                            }
                            .export-checkbox .checkmark {
                                width: 18px;
                                height: 18px;
                                border: 2px solid var(--border-color);
                                border-radius: 4px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                transition: all 0.2s ease;
                            }
                            .export-checkbox input:checked + .checkmark {
                                background: var(--accent-primary);
                                border-color: var(--accent-primary);
                            }
                            .export-checkbox input:checked + .checkmark::after {
                                content: '';
                                width: 5px;
                                height: 9px;
                                border: 2px solid white;
                                border-top: none;
                                border-left: none;
                                transform: rotate(45deg);
                                margin-top: -2px;
                            }
                            .export-formats {
                                display: grid;
                                grid-template-columns: repeat(3, 1fr);
                                gap: 0.75rem;
                            }
                            .export-format {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                padding: 1rem 0.5rem;
                                background: var(--bg-tertiary);
                                border: 2px solid transparent;
                                border-radius: 10px;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                text-align: center;
                            }
                            .export-format:hover {
                                border-color: var(--border-color);
                            }
                            .export-format.active {
                                border-color: var(--accent-primary);
                                background: var(--accent-light);
                            }
                            .export-format input {
                                display: none;
                            }
                            .format-icon {
                                width: 40px;
                                height: 40px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: var(--text-secondary);
                                margin-bottom: 0.5rem;
                            }
                            .export-format.active .format-icon {
                                color: var(--accent-primary);
                            }
                            .format-name {
                                font-weight: 600;
                                font-size: 0.85rem;
                            }
                            .format-desc {
                                font-size: 0.7rem;
                                color: var(--text-tertiary);
                                margin-top: 0.15rem;
                            }
                        </style>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('exportModal').remove()">Cancelar</button>
                        <button type="button" class="btn btn-primary" id="doExportBtn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Descargar Reporte
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Toggle de formatos
        document.querySelectorAll('.export-format').forEach(format => {
            format.addEventListener('click', () => {
                document.querySelectorAll('.export-format').forEach(f => f.classList.remove('active'));
                format.classList.add('active');
                format.querySelector('input').checked = true;
            });
        });

        // Boton de exportar
        document.getElementById('doExportBtn').addEventListener('click', () => {
            const format = document.querySelector('input[name="format"]:checked').value;
            const options = {
                includeTickets: document.querySelector('input[name="includeTickets"]').checked,
                includeMachines: document.querySelector('input[name="includeMachines"]').checked,
                includeEmployees: document.querySelector('input[name="includeEmployees"]').checked,
                includeLicenses: document.querySelector('input[name="includeLicenses"]').checked,
                includeInsights: document.querySelector('input[name="includeInsights"]').checked
            };
            
            this.exportReport(format, options);
            document.getElementById('exportModal').remove();
        });
    },

    getDateRangeLabel() {
        if (this.customDateStart && this.customDateEnd) {
            return `${this.formatDateShort(this.customDateStart)} - ${this.formatDateShort(this.customDateEnd)}`;
        }
        const labels = {
            '7d': 'Ultimos 7 dias',
            '30d': 'Ultimos 30 dias',
            '90d': 'Ultimos 90 dias',
            '1y': 'Ultimo año'
        };
        return labels[this.dateRange] || 'Ultimos 30 dias';
    },

    formatDateShort(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    getEstimatedRecords() {
        const tickets = this.filterByDateRange(this.data.tickets);
        return `~${tickets.length + this.data.machines.length + this.data.employees.length + this.data.licenses.length} registros`;
    },

    exportReport(format, options) {
        const ticketMetrics = this.getTicketMetrics();
        const machineMetrics = this.getMachineMetrics();
        const employeeMetrics = this.getEmployeeMetrics();
        const licenseMetrics = this.getLicenseMetrics();
        const insights = this.generateInsights();

        let content = '';
        const filename = `FIXIFY_Reporte_${new Date().toISOString().split('T')[0]}`;

        if (format === 'csv') {
            content = this.generateCSV(ticketMetrics, machineMetrics, employeeMetrics, licenseMetrics, insights, options);
            this.downloadFile(content, `${filename}.csv`, 'text/csv');
        } else if (format === 'json') {
            content = this.generateJSON(ticketMetrics, machineMetrics, employeeMetrics, licenseMetrics, insights, options);
            this.downloadFile(content, `${filename}.json`, 'application/json');
        } else {
            content = this.generateTXT(ticketMetrics, machineMetrics, employeeMetrics, licenseMetrics, insights, options);
            this.downloadFile(content, `${filename}.txt`, 'text/plain');
        }

        this.showToast('Reporte exportado correctamente', 'success');
    },

    generateCSV(ticketMetrics, machineMetrics, employeeMetrics, licenseMetrics, insights, options) {
        let csv = '';
        const dateRange = this.getDateRangeLabel();

        csv += `REPORTE FIXIFY - ${dateRange}\n`;
        csv += `Generado: ${new Date().toLocaleString('es-MX')}\n\n`;

        if (options.includeTickets) {
            csv += `RESUMEN DE TICKETS\n`;
            csv += `Metrica,Valor\n`;
            csv += `Total Tickets,${ticketMetrics.total}\n`;
            csv += `Tasa de Resolucion,${ticketMetrics.resolutionRate}%\n`;
            csv += `Tiempo Promedio,${this.formatTime(ticketMetrics.avgResolutionTime)}\n`;
            csv += `Abiertos,${ticketMetrics.byStatus.open}\n`;
            csv += `En Progreso,${ticketMetrics.byStatus.in_progress}\n`;
            csv += `Resueltos,${ticketMetrics.byStatus.resolved}\n`;
            csv += `Cerrados,${ticketMetrics.byStatus.closed}\n`;
            csv += `Prioridad Critica,${ticketMetrics.byPriority.critical}\n`;
            csv += `Prioridad Alta,${ticketMetrics.byPriority.high}\n`;
            csv += `Prioridad Media,${ticketMetrics.byPriority.medium}\n`;
            csv += `Prioridad Baja,${ticketMetrics.byPriority.low}\n`;
            csv += `Incidencias,${ticketMetrics.byType.incidencia}\n`;
            csv += `Requerimientos,${ticketMetrics.byType.requerimiento}\n\n`;
        }

        if (options.includeMachines) {
            csv += `RESUMEN DE MAQUINAS\n`;
            csv += `Metrica,Valor\n`;
            csv += `Total Maquinas,${machineMetrics.total}\n`;
            csv += `Asignadas,${machineMetrics.assignedCount}\n`;
            csv += `Disponibles,${machineMetrics.unassignedCount}\n`;
            csv += `Tasa de Utilizacion,${machineMetrics.utilizationRate}%\n`;
            csv += `Activas,${machineMetrics.byStatus.active}\n`;
            csv += `En Mantenimiento,${machineMetrics.byStatus.maintenance}\n`;
            csv += `Inactivas,${machineMetrics.byStatus.inactive}\n`;
            csv += `Antiguedad Promedio,${machineMetrics.avgAge} años\n`;
            csv += `Equipos +3 años,${machineMetrics.oldMachinesCount}\n\n`;

            if (machineMetrics.problematicMachines.length > 0) {
                csv += `MAQUINAS PROBLEMATICAS\n`;
                csv += `Nombre,Serial,Tickets\n`;
                machineMetrics.problematicMachines.forEach(m => {
                    csv += `"${m.name || 'Sin nombre'}","${m.serialNumber || '-'}",${m.ticketCount}\n`;
                });
                csv += `\n`;
            }
        }

        if (options.includeEmployees) {
            csv += `RESUMEN DE PERSONAL\n`;
            csv += `Metrica,Valor\n`;
            csv += `Total Empleados,${employeeMetrics.total}\n`;
            csv += `Activos,${employeeMetrics.byStatus.active}\n`;
            csv += `Inactivos,${employeeMetrics.byStatus.inactive}\n`;
            csv += `Con Maquina,${employeeMetrics.employeesWithMachine}\n`;
            csv += `Sin Maquina,${employeeMetrics.withoutMachine}\n\n`;

            if (Object.keys(employeeMetrics.byDepartment).length > 0) {
                csv += `EMPLEADOS POR DEPARTAMENTO\n`;
                csv += `Departamento,Cantidad\n`;
                Object.entries(employeeMetrics.byDepartment).forEach(([dept, count]) => {
                    csv += `"${dept}",${count}\n`;
                });
                csv += `\n`;
            }
        }

        if (options.includeLicenses) {
            csv += `RESUMEN DE LICENCIAS\n`;
            csv += `Metrica,Valor\n`;
            csv += `Total Licencias,${licenseMetrics.total}\n`;
            csv += `Activas,${licenseMetrics.active}\n`;
            csv += `Por Vencer,${licenseMetrics.expiringSoon}\n`;
            csv += `Vencidas,${licenseMetrics.expired}\n\n`;
        }

        if (options.includeInsights && insights.length > 0) {
            csv += `INSIGHTS Y ALERTAS\n`;
            csv += `Tipo,Titulo,Mensaje\n`;
            insights.forEach(i => {
                csv += `"${i.type}","${i.title}","${i.message}"\n`;
            });
        }

        return csv;
    },

    generateJSON(ticketMetrics, machineMetrics, employeeMetrics, licenseMetrics, insights, options) {
        const report = {
            meta: {
                generatedAt: new Date().toISOString(),
                dateRange: this.getDateRangeLabel(),
                generatedBy: 'FIXIFY Analytics'
            }
        };

        if (options.includeTickets) report.tickets = ticketMetrics;
        if (options.includeMachines) report.machines = machineMetrics;
        if (options.includeEmployees) report.employees = employeeMetrics;
        if (options.includeLicenses) report.licenses = licenseMetrics;
        if (options.includeInsights) report.insights = insights;

        return JSON.stringify(report, null, 2);
    },

    generateTXT(ticketMetrics, machineMetrics, employeeMetrics, licenseMetrics, insights, options) {
        let txt = '';
        const separator = '═'.repeat(50);
        const dateRange = this.getDateRangeLabel();

        txt += `${separator}\n`;
        txt += `  REPORTE FIXIFY - ANALITICA Y REPORTES\n`;
        txt += `${separator}\n\n`;
        txt += `Periodo: ${dateRange}\n`;
        txt += `Generado: ${new Date().toLocaleString('es-MX')}\n\n`;

        if (options.includeTickets) {
            txt += `${'─'.repeat(50)}\n`;
            txt += `  ANALISIS DE TICKETS\n`;
            txt += `${'─'.repeat(50)}\n\n`;
            txt += `  Total de Tickets:        ${ticketMetrics.total}\n`;
            txt += `  Tasa de Resolucion:      ${ticketMetrics.resolutionRate}%\n`;
            txt += `  Tiempo Promedio:         ${this.formatTime(ticketMetrics.avgResolutionTime)}\n\n`;
            txt += `  Por Estado:\n`;
            txt += `    • Abiertos:            ${ticketMetrics.byStatus.open}\n`;
            txt += `    • En Progreso:         ${ticketMetrics.byStatus.in_progress}\n`;
            txt += `    • Resueltos:           ${ticketMetrics.byStatus.resolved}\n`;
            txt += `    • Cerrados:            ${ticketMetrics.byStatus.closed}\n\n`;
            txt += `  Por Prioridad:\n`;
            txt += `    • Critica:             ${ticketMetrics.byPriority.critical}\n`;
            txt += `    • Alta:                ${ticketMetrics.byPriority.high}\n`;
            txt += `    • Media:               ${ticketMetrics.byPriority.medium}\n`;
            txt += `    • Baja:                ${ticketMetrics.byPriority.low}\n\n`;
            txt += `  Por Tipo:\n`;
            txt += `    • Incidencias:         ${ticketMetrics.byType.incidencia}\n`;
            txt += `    • Requerimientos:      ${ticketMetrics.byType.requerimiento}\n\n`;
        }

        if (options.includeMachines) {
            txt += `${'─'.repeat(50)}\n`;
            txt += `  ANALISIS DE MAQUINAS\n`;
            txt += `${'─'.repeat(50)}\n\n`;
            txt += `  Total de Maquinas:       ${machineMetrics.total}\n`;
            txt += `  Asignadas:               ${machineMetrics.assignedCount}\n`;
            txt += `  Disponibles:             ${machineMetrics.unassignedCount}\n`;
            txt += `  Utilizacion:             ${machineMetrics.utilizationRate}%\n`;
            txt += `  Antiguedad Promedio:     ${machineMetrics.avgAge} años\n\n`;
            txt += `  Por Estado:\n`;
            txt += `    • Activas:             ${machineMetrics.byStatus.active}\n`;
            txt += `    • Mantenimiento:       ${machineMetrics.byStatus.maintenance}\n`;
            txt += `    • Inactivas:           ${machineMetrics.byStatus.inactive}\n\n`;
        }

        if (options.includeEmployees) {
            txt += `${'─'.repeat(50)}\n`;
            txt += `  ANALISIS DE PERSONAL\n`;
            txt += `${'─'.repeat(50)}\n\n`;
            txt += `  Total de Empleados:      ${employeeMetrics.total}\n`;
            txt += `  Activos:                 ${employeeMetrics.byStatus.active}\n`;
            txt += `  Inactivos:               ${employeeMetrics.byStatus.inactive}\n`;
            txt += `  Con Maquina Asignada:    ${employeeMetrics.employeesWithMachine}\n`;
            txt += `  Sin Maquina:             ${employeeMetrics.withoutMachine}\n\n`;
        }

        if (options.includeLicenses) {
            txt += `${'─'.repeat(50)}\n`;
            txt += `  ANALISIS DE LICENCIAS\n`;
            txt += `${'─'.repeat(50)}\n\n`;
            txt += `  Total de Licencias:      ${licenseMetrics.total}\n`;
            txt += `  Activas:                 ${licenseMetrics.active}\n`;
            txt += `  Por Vencer (30 dias):    ${licenseMetrics.expiringSoon}\n`;
            txt += `  Vencidas:                ${licenseMetrics.expired}\n\n`;
        }

        if (options.includeInsights && insights.length > 0) {
            txt += `${'─'.repeat(50)}\n`;
            txt += `  INSIGHTS Y ALERTAS\n`;
            txt += `${'─'.repeat(50)}\n\n`;
            insights.forEach((insight, i) => {
                const typeLabel = { warning: '⚠️', danger: '🔴', success: '✅', info: 'ℹ️' };
                txt += `  ${i + 1}. [${typeLabel[insight.type] || '•'}] ${insight.title}\n`;
                txt += `     ${insight.message}\n\n`;
            });
        }

        txt += `${separator}\n`;
        txt += `  Fin del Reporte\n`;
        txt += `${separator}\n`;

        return txt;
    },

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    showToast(message, type = 'success') {
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f97316',
            info: '#3b82f6'
        };

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${colors[type] || colors.success};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    getMachineMetrics() {
        const { machines = [], assignments = [], tickets = [] } = this.data;
        
        // Estado de maquinas - considerar diferentes valores de estado
        const byStatus = {
            active: machines.filter(m => m && (m.status === 'active' || m.status === 'Active' || m.status === 'available' || m.status === 'assigned')).length,
            maintenance: machines.filter(m => m && (m.status === 'maintenance' || m.status === 'Maintenance')).length,
            inactive: machines.filter(m => m && (m.status === 'inactive' || m.status === 'Inactive' || m.status === 'retired' || m.status === 'Retired')).length
        };

        // Maquinas por tipo
        const byType = {};
        (machines || []).forEach(m => {
            if (!m) return;
            const type = m.type || m.kind || 'Sin tipo';
            byType[type] = (byType[type] || 0) + 1;
        });

        // Asignaciones activas
        const activeAssignments = (assignments || []).filter(a => a && !a.endDate);
        const assignedMachineIds = new Set(activeAssignments.map(a => a.machineId).filter(Boolean));
        const assignedCount = assignedMachineIds.size;
        const unassignedCount = Math.max(0, machines.length - assignedCount);

        // Maquinas con tickets (problematicas) - usar todos los tickets, no solo filtrados
        const machineTicketCount = {};
        (tickets || []).forEach(t => {
            if (t && t.machineId) {
                machineTicketCount[t.machineId] = (machineTicketCount[t.machineId] || 0) + 1;
            }
        });

        const problematicMachines = (machines || [])
            .filter(m => m && m.id)
            .map(m => ({
                ...m,
                ticketCount: machineTicketCount[m.id] || 0
            }))
            .filter(m => m.ticketCount > 0)
            .sort((a, b) => b.ticketCount - a.ticketCount)
            .slice(0, 5);

        // Antiguedad de maquinas
        const now = new Date();
        const machineAges = (machines || [])
            .filter(m => m && (m.purchaseDate || m.acquisitionDate || m.datePurchased))
            .map(m => {
                const purchaseDate = m.purchaseDate || m.acquisitionDate || m.datePurchased;
                try {
                    const date = new Date(purchaseDate);
                    if (!isNaN(date.getTime())) {
                        return (now - date) / (1000 * 60 * 60 * 24 * 365); // años
                    }
                } catch (e) {
                    console.warn('Error calculando edad de máquina:', purchaseDate, e);
                }
                return 0;
            })
            .filter(age => age > 0);

        const avgAge = machineAges.length > 0 
            ? (machineAges.reduce((a, b) => a + b, 0) / machineAges.length).toFixed(1)
            : 0;

        const oldMachines = (machines || []).filter(m => {
            if (!m) return false;
            const purchaseDate = m.purchaseDate || m.acquisitionDate || m.datePurchased;
            if (purchaseDate) {
                try {
                    const date = new Date(purchaseDate);
                    if (!isNaN(date.getTime())) {
                        const age = (now - date) / (1000 * 60 * 60 * 24 * 365);
                        return age > 3; // mas de 3 años
                    }
                } catch (e) {
                    return false;
                }
            }
            return false;
        });

        return {
            total: machines.length,
            byStatus,
            byType,
            assignedCount,
            unassignedCount,
            utilizationRate: machines.length > 0 ? ((assignedCount / machines.length) * 100).toFixed(1) : 0,
            problematicMachines,
            avgAge,
            oldMachinesCount: oldMachines.length
        };
    },

    getEmployeeMetrics() {
        const { employees = [], assignments = [], tickets = [] } = this.data;

        // Empleados por estado
        const byStatus = {
            active: employees.filter(e => e && (e.status === 'active' || e.status === 'Active')).length,
            inactive: employees.filter(e => e && (e.status === 'inactive' || e.status === 'Inactive')).length
        };

        // Empleados por departamento
        const byDepartment = {};
        (employees || []).forEach(e => {
            if (!e) return;
            const dept = e.department || e.departamento || 'Sin departamento';
            byDepartment[dept] = (byDepartment[dept] || 0) + 1;
        });

        // Empleados con maquina asignada
        const activeAssignments = (assignments || []).filter(a => a && !a.endDate);
        const employeesWithMachine = new Set(activeAssignments.map(a => a.employeeId).filter(Boolean)).size;

        // Empleados que mas tickets generan - usar todos los tickets
        const employeeTicketCount = {};
        (tickets || []).forEach(t => {
            if (t) {
                const employeeId = t.contactoId || t.employeeId || t.contactId;
                if (employeeId) {
                    employeeTicketCount[employeeId] = (employeeTicketCount[employeeId] || 0) + 1;
                }
            }
        });

        const topTicketGenerators = employees
            .map(e => ({
                ...e,
                ticketCount: employeeTicketCount[e.id] || 0
            }))
            .filter(e => e.ticketCount > 0)
            .sort((a, b) => b.ticketCount - a.ticketCount)
            .slice(0, 5);

        // Tickets por departamento - usar todos los tickets
        const ticketsByDepartment = {};
        (tickets || []).forEach(t => {
            if (!t) return;
            const employeeId = t.contactoId || t.employeeId || t.contactId;
            if (employeeId) {
                const employee = (employees || []).find(e => e && e.id === employeeId);
                if (employee) {
                    const dept = employee.department || employee.departamento || 'Sin departamento';
                    ticketsByDepartment[dept] = (ticketsByDepartment[dept] || 0) + 1;
                }
            }
        });

        return {
            total: employees.length,
            byStatus,
            byDepartment,
            employeesWithMachine,
            withoutMachine: employees.length - employeesWithMachine,
            topTicketGenerators,
            ticketsByDepartment
        };
    },

    getLicenseMetrics() {
        const { licenses = [] } = this.data;
        const now = new Date();

        // Licencias por estado de vencimiento
        const expiringSoon = licenses.filter(l => {
            if (l.expirationDate) {
                const expDate = new Date(l.expirationDate);
                const daysUntilExpiry = (expDate - now) / (1000 * 60 * 60 * 24);
                return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
            }
            return false;
        });

        const expired = licenses.filter(l => {
            if (l.expirationDate) {
                return new Date(l.expirationDate) < now;
            }
            return false;
        });

        // Licencias por tipo
        const byType = {};
        licenses.forEach(l => {
            const type = l.type || l.software || 'Sin tipo';
            byType[type] = (byType[type] || 0) + 1;
        });

        // Costo total (si hay datos de costo)
        const totalCost = licenses.reduce((acc, l) => acc + (parseFloat(l.cost) || 0), 0);

        return {
            total: licenses.length,
            expiringSoon: expiringSoon.length,
            expired: expired.length,
            active: licenses.length - expired.length,
            byType,
            totalCost,
            expiringList: expiringSoon.slice(0, 5)
        };
    },

    generateInsights() {
        const ticketMetrics = this.getTicketMetrics();
        const machineMetrics = this.getMachineMetrics();
        const employeeMetrics = this.getEmployeeMetrics();
        const licenseMetrics = this.getLicenseMetrics();

        const insights = [];

        // Insight: Tickets pendientes altos
        if (ticketMetrics.pendingCount > 5) {
            insights.push({
                type: 'warning',
                icon: 'alert-triangle',
                title: 'Tickets Pendientes',
                message: `Hay ${ticketMetrics.pendingCount} tickets sin resolver. Considera priorizar su atencion.`,
                metric: ticketMetrics.pendingCount
            });
        }

        // Insight: Tickets criticos
        if (ticketMetrics.byPriority.critical > 0) {
            insights.push({
                type: 'danger',
                icon: 'alert-circle',
                title: 'Tickets Criticos',
                message: `${ticketMetrics.byPriority.critical} ticket(s) con prioridad critica requieren atencion inmediata.`,
                metric: ticketMetrics.byPriority.critical
            });
        }

        // Insight: Maquinas problematicas
        if (machineMetrics.problematicMachines.length > 0) {
            const topMachine = machineMetrics.problematicMachines[0];
            insights.push({
                type: 'warning',
                icon: 'monitor',
                title: 'Maquina Problematica',
                message: `"${topMachine.name || topMachine.serialNumber}" tiene ${topMachine.ticketCount} tickets. Considera revision o reemplazo.`,
                metric: topMachine.ticketCount
            });
        }

        // Insight: Maquinas antiguas
        if (machineMetrics.oldMachinesCount > 0) {
            insights.push({
                type: 'info',
                icon: 'clock',
                title: 'Equipos Antiguos',
                message: `${machineMetrics.oldMachinesCount} maquina(s) tienen mas de 3 años. Evalua plan de renovacion.`,
                metric: machineMetrics.oldMachinesCount
            });
        }

        // Insight: Empleados sin maquina
        if (employeeMetrics.withoutMachine > 0) {
            insights.push({
                type: 'info',
                icon: 'user-x',
                title: 'Sin Equipo Asignado',
                message: `${employeeMetrics.withoutMachine} empleado(s) activo(s) no tienen maquina asignada.`,
                metric: employeeMetrics.withoutMachine
            });
        }

        // Insight: Licencias por vencer
        if (licenseMetrics.expiringSoon > 0) {
            insights.push({
                type: 'warning',
                icon: 'calendar',
                title: 'Licencias por Vencer',
                message: `${licenseMetrics.expiringSoon} licencia(s) venceran en los proximos 30 dias.`,
                metric: licenseMetrics.expiringSoon
            });
        }

        // Insight: Licencias vencidas
        if (licenseMetrics.expired > 0) {
            insights.push({
                type: 'danger',
                icon: 'x-circle',
                title: 'Licencias Vencidas',
                message: `${licenseMetrics.expired} licencia(s) ya estan vencidas y requieren renovacion.`,
                metric: licenseMetrics.expired
            });
        }

        // Insight: Buen rendimiento
        if (parseFloat(ticketMetrics.resolutionRate) > 80) {
            insights.push({
                type: 'success',
                icon: 'check-circle',
                title: 'Buen Rendimiento',
                message: `Tasa de resolucion del ${ticketMetrics.resolutionRate}%. El equipo esta haciendo un excelente trabajo.`,
                metric: `${ticketMetrics.resolutionRate}%`
            });
        }

        // Insight: Departamento problematico
        const deptEntries = Object.entries(employeeMetrics.ticketsByDepartment);
        if (deptEntries.length > 0) {
            const [topDept, topCount] = deptEntries.sort((a, b) => b[1] - a[1])[0];
            if (topCount > 3) {
                insights.push({
                    type: 'info',
                    icon: 'users',
                    title: 'Departamento con Mas Incidencias',
                    message: `"${topDept}" genera el mayor numero de tickets (${topCount}). Considera capacitacion.`,
                    metric: topCount
                });
            }
        }

        return insights;
    },

    // ========================================
    // RENDERIZADO
    // ========================================

    async renderDashboard() {
        const container = document.querySelector('.page-content');
        if (!container) return;

        // Asegurarse de que los datos estén actualizados antes de renderizar
        await this.loadAllData();

        const ticketMetrics = this.getTicketMetrics();
        const machineMetrics = this.getMachineMetrics();
        const employeeMetrics = this.getEmployeeMetrics();
        const licenseMetrics = this.getLicenseMetrics();
        const insights = this.generateInsights();

        console.log('Analytics: Renderizando dashboard con métricas:', {
            tickets: ticketMetrics.total,
            machines: machineMetrics.total,
            employees: employeeMetrics.total,
            licenses: licenseMetrics.total
        });

        container.innerHTML = `
            <!-- Indicador de rango de fechas -->
            <div class="date-range-indicator">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>Mostrando datos de: <strong>${this.getDateRangeLabel()}</strong></span>
                ${ticketMetrics.total !== ticketMetrics.totalAll ? `<span class="filtered-badge">${ticketMetrics.total} de ${ticketMetrics.totalAll} tickets</span>` : ''}
            </div>

            <!-- KPIs Principales -->
            <section class="analytics-kpis-grid">
                ${this.renderKPICard('Tickets Totales', ticketMetrics.total, ticketMetrics.pendingCount + ' pendientes', '#3b82f6', 'file-text')}
                ${this.renderKPICard('Tasa Resolucion', ticketMetrics.resolutionRate + '%', 'de tickets cerrados', '#22c55e', 'check-circle')}
                ${this.renderKPICard('Tiempo Promedio', this.formatTime(ticketMetrics.avgResolutionTime), 'de resolucion', '#f97316', 'clock')}
                ${this.renderKPICard('Maquinas', machineMetrics.total, machineMetrics.assignedCount + ' asignadas', '#8b5cf6', 'monitor')}
                ${this.renderKPICard('Empleados', employeeMetrics.total, employeeMetrics.byStatus.active + ' activos', '#ec4899', 'users')}
                ${this.renderKPICard('Licencias', licenseMetrics.total, licenseMetrics.expiringSoon + ' por vencer', '#14b8a6', 'key')}
            </section>

            <!-- Insights y Alertas -->
            ${insights.length > 0 ? `
            <section class="insights-section">
                <h2 class="section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path></svg>
                    Insights y Alertas
                </h2>
                <div class="insights-grid">
                    ${insights.map(i => this.renderInsightCard(i)).join('')}
                </div>
            </section>
            ` : ''}

            <!-- Analisis de Tickets -->
            <section class="analytics-section">
                <h2 class="section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path></svg>
                    Analisis de Tickets
                </h2>
                <div class="analytics-grid-3">
                    <!-- Por Estado -->
                    <div class="analytics-card">
                        <h3 class="card-title">Por Estado</h3>
                        <div class="status-bars">
                            ${this.renderStatusBar('Abiertos', ticketMetrics.byStatus.open, ticketMetrics.total, '#3b82f6')}
                            ${this.renderStatusBar('En Progreso', ticketMetrics.byStatus.in_progress, ticketMetrics.total, '#f97316')}
                            ${this.renderStatusBar('Resueltos', ticketMetrics.byStatus.resolved, ticketMetrics.total, '#22c55e')}
                            ${this.renderStatusBar('Cerrados', ticketMetrics.byStatus.closed, ticketMetrics.total, '#6b7280')}
                        </div>
                            </div>

                    <!-- Por Prioridad -->
                    <div class="analytics-card">
                        <h3 class="card-title">Por Prioridad</h3>
                        <div class="priority-grid">
                            ${this.renderPriorityBox('Critica', ticketMetrics.byPriority.critical, '#dc2626')}
                            ${this.renderPriorityBox('Alta', ticketMetrics.byPriority.high, '#ef4444')}
                            ${this.renderPriorityBox('Media', ticketMetrics.byPriority.medium, '#f97316')}
                            ${this.renderPriorityBox('Baja', ticketMetrics.byPriority.low, '#6b7280')}
                        </div>
                    </div>

                    <!-- Por Tipo -->
                    <div class="analytics-card">
                        <h3 class="card-title">Por Tipo</h3>
                        <div class="type-comparison">
                            <div class="type-item">
                                <div class="type-icon" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                </div>
                                <div class="type-value">${ticketMetrics.byType.incidencia}</div>
                                <div class="type-label">Incidencias</div>
                            </div>
                            <div class="type-item">
                                <div class="type-icon" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        </div>
                                <div class="type-value">${ticketMetrics.byType.requerimiento}</div>
                                <div class="type-label">Requerimientos</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tickets por Servicio y Tema -->
                <div class="analytics-grid-2" style="margin-top: 1.5rem;">
                    <div class="analytics-card">
                        <h3 class="card-title">Por Servicio</h3>
                        <div class="service-bars">
                            ${this.renderServiceBar('Hardware', ticketMetrics.byService.hardware, ticketMetrics.total, '#ef4444')}
                            ${this.renderServiceBar('Software', ticketMetrics.byService.software, ticketMetrics.total, '#8b5cf6')}
                            ${this.renderServiceBar('Red', ticketMetrics.byService.network, ticketMetrics.total, '#06b6d4')}
                            ${this.renderServiceBar('Otro', ticketMetrics.byService.other, ticketMetrics.total, '#6b7280')}
                        </div>
                    </div>

                    <div class="analytics-card">
                        <h3 class="card-title">Por Tema</h3>
                        ${Object.keys(ticketMetrics.byTema).length === 0 ? `
                            <p class="empty-message">No hay tickets clasificados por tema</p>
                        ` : `
                            <div class="tema-list">
                                ${Object.entries(ticketMetrics.byTema)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 5)
                                    .map(([tema, count]) => `
                                        <div class="tema-item">
                                            <span class="tema-name">${this.escapeHtml(tema)}</span>
                                            <span class="tema-count">${count}</span>
                                        </div>
                                    `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            </section>

            <!-- Analisis de Maquinas -->
            <section class="analytics-section">
                <h2 class="section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                    Analisis de Maquinas
                </h2>
                <div class="analytics-grid-3">
                    <!-- Utilizacion -->
                    <div class="analytics-card">
                        <h3 class="card-title">Utilizacion</h3>
                        <div class="utilization-chart">
                            <div class="donut-container">
                                ${this.renderDonutChart(machineMetrics.assignedCount, machineMetrics.total, '#22c55e')}
                            </div>
                            <div class="utilization-legend">
                                <div class="legend-item">
                                    <span class="legend-dot" style="background: #22c55e;"></span>
                                    <span>Asignadas: ${machineMetrics.assignedCount}</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-dot" style="background: var(--border-color);"></span>
                                    <span>Disponibles: ${machineMetrics.unassignedCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Por Estado -->
                    <div class="analytics-card">
                        <h3 class="card-title">Por Estado</h3>
                        <div class="machine-status-grid">
                            <div class="status-box active">
                                <div class="status-value">${machineMetrics.byStatus.active}</div>
                                <div class="status-label">Activas</div>
                            </div>
                            <div class="status-box maintenance">
                                <div class="status-value">${machineMetrics.byStatus.maintenance}</div>
                                <div class="status-label">Mantenimiento</div>
                        </div>
                            <div class="status-box inactive">
                                <div class="status-value">${machineMetrics.byStatus.inactive}</div>
                                <div class="status-label">Inactivas</div>
                            </div>
                        </div>
                    </div>

                    <!-- Antiguedad -->
                    <div class="analytics-card">
                        <h3 class="card-title">Antiguedad</h3>
                        <div class="age-info">
                            <div class="age-stat">
                                <div class="age-value">${machineMetrics.avgAge}</div>
                                <div class="age-label">años promedio</div>
                            </div>
                            <div class="age-warning ${machineMetrics.oldMachinesCount > 0 ? 'show' : ''}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                ${machineMetrics.oldMachinesCount} equipos con +3 años
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Maquinas Problematicas -->
                ${machineMetrics.problematicMachines.length > 0 ? `
                <div class="analytics-card full-width" style="margin-top: 1.5rem;">
                    <h3 class="card-title">Top Maquinas con Mas Incidencias</h3>
                    <div class="problematic-machines-grid">
                        ${machineMetrics.problematicMachines.map((m, i) => `
                            <div class="problematic-machine">
                                <div class="machine-rank">#${i + 1}</div>
                                <div class="machine-info">
                                    <div class="machine-name">${this.escapeHtml(m.name || 'Sin nombre')}</div>
                                    <div class="machine-serial">${this.escapeHtml(m.serialNumber || '-')}</div>
                                </div>
                                <div class="machine-tickets" style="background: rgba(239, 68, 68, ${0.15 - i * 0.02});">
                                    ${m.ticketCount} tickets
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </section>

            <!-- Analisis de Personal -->
            <section class="analytics-section">
                <h2 class="section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    Analisis de Personal
                </h2>
                <div class="analytics-grid-2">
                    <!-- Empleados por Departamento -->
                    <div class="analytics-card">
                        <h3 class="card-title">Empleados por Departamento</h3>
                        ${Object.keys(employeeMetrics.byDepartment).length === 0 ? `
                            <p class="empty-message">No hay empleados registrados</p>
                        ` : `
                            <div class="department-bars">
                                ${Object.entries(employeeMetrics.byDepartment)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([dept, count]) => this.renderDepartmentBar(dept, count, employeeMetrics.total))
                                    .join('')}
                            </div>
                        `}
                    </div>

                    <!-- Tickets por Departamento -->
                    <div class="analytics-card">
                        <h3 class="card-title">Tickets por Departamento</h3>
                        ${Object.keys(employeeMetrics.ticketsByDepartment).length === 0 ? `
                            <p class="empty-message">No hay datos de tickets por departamento</p>
                        ` : `
                            <div class="department-tickets">
                                ${Object.entries(employeeMetrics.ticketsByDepartment)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([dept, count]) => `
                                        <div class="dept-ticket-item">
                                            <span class="dept-name">${this.escapeHtml(dept)}</span>
                                            <div class="dept-bar-container">
                                                <div class="dept-bar" style="width: ${ticketMetrics.total > 0 ? (count / ticketMetrics.total * 100) : 0}%;"></div>
                                            </div>
                                            <span class="dept-count">${count}</span>
                                        </div>
                                    `).join('')}
                            </div>
                        `}
                    </div>
                </div>

                <!-- Top Generadores de Tickets -->
                ${employeeMetrics.topTicketGenerators.length > 0 ? `
                <div class="analytics-card full-width" style="margin-top: 1.5rem;">
                    <h3 class="card-title">Empleados con Mas Tickets Generados</h3>
                    <div class="top-generators-grid">
                        ${employeeMetrics.topTicketGenerators.map((e, i) => `
                            <div class="generator-item">
                                <div class="generator-avatar" style="background: ${this.getAvatarColor(i)};">
                                    ${this.getInitials(e.name, e.lastName)}
                                    </div>
                                <div class="generator-info">
                                    <div class="generator-name">${this.escapeHtml((e.name || '') + ' ' + (e.lastName || ''))}</div>
                                    <div class="generator-dept">${this.escapeHtml(e.department || 'Sin departamento')}</div>
                                </div>
                                <div class="generator-count">${e.ticketCount}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </section>

            <!-- Licencias -->
            <section class="analytics-section">
                <h2 class="section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                    Licencias
                </h2>
                <div class="analytics-grid-3">
                    <div class="analytics-card">
                        <h3 class="card-title">Estado General</h3>
                        <div class="license-overview">
                            <div class="license-stat">
                                <div class="license-value" style="color: #22c55e;">${licenseMetrics.active}</div>
                                <div class="license-label">Activas</div>
                            </div>
                            <div class="license-stat">
                                <div class="license-value" style="color: #f97316;">${licenseMetrics.expiringSoon}</div>
                                <div class="license-label">Por Vencer</div>
                            </div>
                            <div class="license-stat">
                                <div class="license-value" style="color: #ef4444;">${licenseMetrics.expired}</div>
                                <div class="license-label">Vencidas</div>
                            </div>
                        </div>
                    </div>

                    <div class="analytics-card">
                        <h3 class="card-title">Por Tipo</h3>
                        ${Object.keys(licenseMetrics.byType).length === 0 ? `
                            <p class="empty-message">No hay licencias registradas</p>
                        ` : `
                            <div class="license-types">
                                ${Object.entries(licenseMetrics.byType)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 4)
                                    .map(([type, count]) => `
                                        <div class="license-type-item">
                                            <span class="license-type-name">${this.escapeHtml(type)}</span>
                                            <span class="license-type-count">${count}</span>
                                        </div>
                                    `).join('')}
                            </div>
                        `}
                    </div>

                    <div class="analytics-card">
                        <h3 class="card-title">Proximos Vencimientos</h3>
                        ${licenseMetrics.expiringList.length === 0 ? `
                            <p class="empty-message success">No hay licencias por vencer pronto</p>
                        ` : `
                            <div class="expiring-list">
                                ${licenseMetrics.expiringList.map(l => `
                                    <div class="expiring-item">
                                        <span class="expiring-name">${this.escapeHtml(l.software || l.name || 'Sin nombre')}</span>
                                        <span class="expiring-date">${this.formatDate(l.expirationDate)}</span>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
            </section>

            <style>
                .date-range-indicator {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    margin-bottom: 1.5rem;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }
                .date-range-indicator svg {
                    color: var(--accent-primary);
                }
                .date-range-indicator strong {
                    color: var(--text-primary);
                }
                .filtered-badge {
                    margin-left: auto;
                    padding: 0.25rem 0.6rem;
                    background: var(--accent-light);
                    color: var(--accent-primary);
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 500;
                }
                .analytics-kpis-grid {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                .kpi-card-new {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 1.25rem;
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                }
                .kpi-icon-box {
                    width: 44px;
                    height: 44px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .kpi-content {
                    flex: 1;
                    min-width: 0;
                }
                .kpi-value-new {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    line-height: 1;
                }
                .kpi-label-new {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                    margin-top: 0.25rem;
                }
                .kpi-sub {
                    font-size: 0.7rem;
                    margin-top: 0.35rem;
                }

                .insights-section {
                    margin-bottom: 2rem;
                }
                .insights-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1rem;
                }
                .insight-card {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 1rem;
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    border-left: 4px solid;
                }
                .insight-card.warning { border-left-color: #f97316; }
                .insight-card.danger { border-left-color: #ef4444; }
                .insight-card.success { border-left-color: #22c55e; }
                .insight-card.info { border-left-color: #3b82f6; }
                .insight-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .insight-card.warning .insight-icon { background: rgba(249, 115, 22, 0.1); color: #f97316; }
                .insight-card.danger .insight-icon { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .insight-card.success .insight-icon { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
                .insight-card.info .insight-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .insight-content { flex: 1; }
                .insight-title { font-weight: 600; font-size: 0.875rem; margin-bottom: 0.25rem; }
                .insight-message { font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; }

                .analytics-section {
                    margin-bottom: 2.5rem;
                }
                .section-title {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    color: var(--text-primary);
                }
                .analytics-grid-2 {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1.5rem;
                }
                .analytics-grid-3 {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                }
                .analytics-card {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 1.25rem;
                }
                .analytics-card.full-width {
                    grid-column: 1 / -1;
                }
                .card-title {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    margin-bottom: 1rem;
                }

                .status-bars, .service-bars, .department-bars {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                .status-bar-item, .service-bar-item, .dept-bar-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .bar-label {
                    width: 90px;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }
                .bar-container {
                    flex: 1;
                    height: 8px;
                    background: var(--bg-tertiary);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .bar-fill {
                    height: 100%;
                    border-radius: 4px;
                    transition: width 0.3s ease;
                }
                .bar-value {
                    width: 30px;
                    text-align: right;
                    font-weight: 600;
                    font-size: 0.875rem;
                }

                .priority-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.75rem;
                }
                .priority-box {
                    text-align: center;
                    padding: 1rem;
                    border-radius: 10px;
                    background: var(--bg-tertiary);
                }
                .priority-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                }
                .priority-label {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                    margin-top: 0.25rem;
                }

                .type-comparison {
                    display: flex;
                    justify-content: space-around;
                    padding: 1rem 0;
                }
                .type-item {
                    text-align: center;
                }
                .type-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 0.75rem;
                }
                .type-value {
                    font-size: 1.75rem;
                    font-weight: 700;
                }
                .type-label {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }

                .tema-list, .license-types, .expiring-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .tema-item, .license-type-item, .expiring-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.5rem 0.75rem;
                    background: var(--bg-tertiary);
                    border-radius: 6px;
                    font-size: 0.8rem;
                }
                .tema-count, .license-type-count {
                    font-weight: 600;
                }
                .expiring-date {
                    font-size: 0.75rem;
                    color: #f97316;
                }

                .donut-container {
                    width: 120px;
                    height: 120px;
                    margin: 0 auto 1rem;
                }
                .utilization-legend {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.8rem;
                }
                .legend-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                }

                .machine-status-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 0.75rem;
                }
                .status-box {
                    text-align: center;
                    padding: 1rem 0.5rem;
                    border-radius: 8px;
                }
                .status-box.active { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
                .status-box.maintenance { background: rgba(249, 115, 22, 0.1); color: #f97316; }
                .status-box.inactive { background: rgba(107, 114, 128, 0.1); color: #6b7280; }
                .status-value { font-size: 1.5rem; font-weight: 700; }
                .status-label { font-size: 0.7rem; margin-top: 0.25rem; }

                .age-info {
                    text-align: center;
                    padding: 1rem;
                }
                .age-stat { margin-bottom: 1rem; }
                .age-value { font-size: 2.5rem; font-weight: 700; color: var(--text-primary); }
                .age-label { font-size: 0.8rem; color: var(--text-tertiary); }
                .age-warning {
                    display: none;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    color: #f97316;
                    background: rgba(249, 115, 22, 0.1);
                    padding: 0.5rem;
                    border-radius: 6px;
                }
                .age-warning.show { display: flex; }

                .problematic-machines-grid, .top-generators-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1rem;
                }
                .problematic-machine, .generator-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: var(--bg-tertiary);
                    border-radius: 10px;
                }
                .machine-rank {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    background: var(--accent-light);
                    color: var(--accent-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.75rem;
                }
                .machine-info, .generator-info { flex: 1; min-width: 0; }
                .machine-name, .generator-name { font-weight: 500; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .machine-serial, .generator-dept { font-size: 0.7rem; color: var(--text-tertiary); }
                .machine-tickets {
                    padding: 0.25rem 0.6rem;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: #ef4444;
                }
                .generator-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 600;
                    font-size: 0.75rem;
                }
                .generator-count {
                    font-weight: 700;
                    font-size: 1.1rem;
                    color: var(--text-primary);
                }

                .department-tickets {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                .dept-ticket-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .dept-name {
                    width: 100px;
                    font-size: 0.8rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .dept-bar-container {
                    flex: 1;
                    height: 8px;
                    background: var(--bg-tertiary);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .dept-bar {
                    height: 100%;
                    background: var(--accent-primary);
                    border-radius: 4px;
                }
                .dept-count {
                    width: 25px;
                    text-align: right;
                    font-weight: 600;
                    font-size: 0.85rem;
                }

                .license-overview {
                    display: flex;
                    justify-content: space-around;
                    padding: 1rem 0;
                }
                .license-stat { text-align: center; }
                .license-value { font-size: 1.75rem; font-weight: 700; }
                .license-label { font-size: 0.7rem; color: var(--text-tertiary); margin-top: 0.25rem; }

                .empty-message {
                    text-align: center;
                    padding: 1.5rem;
                    color: var(--text-tertiary);
                    font-size: 0.85rem;
                }
                .empty-message.success { color: #22c55e; }

                @media (max-width: 1200px) {
                    .analytics-kpis-grid { grid-template-columns: repeat(3, 1fr); }
                }
                @media (max-width: 900px) {
                    .analytics-kpis-grid { grid-template-columns: repeat(2, 1fr); }
                    .analytics-grid-3 { grid-template-columns: 1fr; }
                    .analytics-grid-2 { grid-template-columns: 1fr; }
                }
                @media (max-width: 600px) {
                    .analytics-kpis-grid { grid-template-columns: 1fr; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
    },

    // ========================================
    // HELPERS DE RENDERIZADO
    // ========================================

    renderKPICard(label, value, subtext, color, icon) {
        return `
            <div class="kpi-card-new">
                <div class="kpi-icon-box" style="background: ${color}15; color: ${color};">
                    ${this.getIcon(icon)}
                </div>
                <div class="kpi-content">
                    <div class="kpi-value-new">${value}</div>
                    <div class="kpi-label-new">${label}</div>
                    <div class="kpi-sub" style="color: ${color};">${subtext}</div>
                </div>
            </div>
        `;
    },

    renderInsightCard(insight) {
        return `
            <div class="insight-card ${insight.type}">
                <div class="insight-icon">
                    ${this.getIcon(insight.icon)}
                </div>
                <div class="insight-content">
                    <div class="insight-title">${insight.title}</div>
                    <div class="insight-message">${insight.message}</div>
                </div>
            </div>
        `;
    },

    renderStatusBar(label, value, total, color) {
        const percent = total > 0 ? (value / total * 100) : 0;
        return `
            <div class="status-bar-item">
                <span class="bar-label">${label}</span>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percent}%; background: ${color};"></div>
                </div>
                <span class="bar-value">${value}</span>
            </div>
        `;
    },

    renderServiceBar(label, value, total, color) {
        const percent = total > 0 ? (value / total * 100) : 0;
        return `
            <div class="service-bar-item">
                <span class="bar-label">${label}</span>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percent}%; background: ${color};"></div>
                </div>
                <span class="bar-value">${value}</span>
            </div>
        `;
    },

    renderDepartmentBar(label, value, total) {
        const percent = total > 0 ? (value / total * 100) : 0;
        return `
            <div class="dept-bar-item">
                <span class="bar-label">${this.escapeHtml(label)}</span>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percent}%; background: var(--accent-primary);"></div>
                </div>
                <span class="bar-value">${value}</span>
            </div>
        `;
    },

    renderPriorityBox(label, value, color) {
        return `
            <div class="priority-box">
                <div class="priority-value" style="color: ${color};">${value}</div>
                <div class="priority-label">${label}</div>
            </div>
        `;
    },

    renderDonutChart(value, total, color) {
        const percent = total > 0 ? (value / total * 100) : 0;
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (percent / 100) * circumference;
        
        return `
            <svg viewBox="0 0 100 100" style="width: 100%; height: 100%;">
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-color)" stroke-width="10"/>
                <circle cx="50" cy="50" r="45" fill="none" stroke="${color}" stroke-width="10"
                    stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                    transform="rotate(-90 50 50)" stroke-linecap="round"/>
                <text x="50" y="50" text-anchor="middle" dy="0.35em" font-size="18" font-weight="700" fill="var(--text-primary)">
                    ${percent.toFixed(0)}%
                </text>
            </svg>
        `;
    },

    getIcon(name) {
        const icons = {
            'file-text': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
            'check-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
            'clock': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
            'monitor': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
            'users': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
            'key': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>',
            'alert-triangle': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            'alert-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
            'calendar': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
            'x-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            'user-x': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>'
        };
        return icons[name] || '';
    },

    formatTime(hours) {
        if (hours === 0) return '0h';
        if (hours < 1) return Math.round(hours * 60) + 'm';
        if (hours < 24) return hours.toFixed(1) + 'h';
        return (hours / 24).toFixed(1) + 'd';
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    },

    getInitials(name, lastName) {
        const first = (name || '').charAt(0).toUpperCase();
        const last = (lastName || '').charAt(0).toUpperCase();
        return first + last || '??';
    },

    getAvatarColor(index) {
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e'];
        return colors[index % colors.length];
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => AnalyticsModule.init(), 100);
});

// Recargar datos cuando la página vuelve a tener foco (útil si hay cambios en otras pestañas)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.AnalyticsModule) {
        // Recargar datos después de 1 segundo para dar tiempo a que termine cualquier operación pendiente
        setTimeout(async () => {
            await window.AnalyticsModule.loadAllData();
            await window.AnalyticsModule.renderDashboard();
        }, 1000);
    }
});

window.AnalyticsModule = AnalyticsModule;
