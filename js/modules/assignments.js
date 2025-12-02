// ========================================
// ASSIGNMENTS MODULE - Centro de Asignaciones
// ========================================

const AssignmentsModule = {
    employees: [],
    machines: [],
    licenses: [],
    machineAssignments: [],
    licenseAssignments: [],
    currentTab: 'machines',
    selectedEmployee: null,
    selectedResource: null,
    searchFilters: {
        employees: '',
        machines: '',
        licenses: ''
    },

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        await this.loadData();
        this.renderContent();
        this.bindEvents();
    },

    async loadData() {
        try {
            const [employees, machines, licenses, machineAssignments, licenseAssignments] = await Promise.all([
                Store.getEmployees(),
                Store.getMachines(),
                Store.getLicenses(),
                Store.getMachineAssignments(),
                Store.getLicenseAssignments()
            ]);
            
            this.employees = employees || [];
            this.machines = machines || [];
            this.licenses = licenses || [];
            this.machineAssignments = machineAssignments || [];
            this.licenseAssignments = licenseAssignments || [];
        } catch (e) {
            console.error('Error cargando datos:', e);
        }
    },

    renderContent() {
        const container = document.querySelector('.page-content');
        if (!container) return;

        const activeEmployees = this.employees.filter(e => e.status === 'active');
        const assignedMachines = this.machines.filter(m => m.assignedTo);
        const availableMachines = this.machines.filter(m => !m.assignedTo && m.status === 'available');
        
        // Obtener licencias asignadas activas
        const activeLicenseAssignments = this.licenseAssignments.filter(a => !a.endDate);
        
        container.innerHTML = `
            <!-- Tabs principales -->
            <div class="assignment-tabs">
                <button class="assignment-tab ${this.currentTab === 'machines' ? 'active' : ''}" data-tab="machines">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <span>Maquinas</span>
                    <span class="tab-badge">${assignedMachines.length}/${this.machines.length}</span>
                </button>
                <button class="assignment-tab ${this.currentTab === 'licenses' ? 'active' : ''}" data-tab="licenses">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span>Licencias</span>
                    <span class="tab-badge">${activeLicenseAssignments.length}</span>
                </button>
                <button class="assignment-tab ${this.currentTab === 'history' ? 'active' : ''}" data-tab="history">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>Historial</span>
                </button>
            </div>

            <!-- Panel de Maquinas -->
            <div id="machinesPanel" class="assignment-panel ${this.currentTab === 'machines' ? '' : 'hidden'}">
                ${this.renderMachinesPanel(activeEmployees, assignedMachines, availableMachines)}
            </div>

            <!-- Panel de Licencias -->
            <div id="licensesPanel" class="assignment-panel ${this.currentTab === 'licenses' ? '' : 'hidden'}">
                ${this.renderLicensesPanel(activeEmployees, activeLicenseAssignments)}
            </div>

            <!-- Panel de Historial -->
            <div id="historyPanel" class="assignment-panel ${this.currentTab === 'history' ? '' : 'hidden'}">
                ${this.renderHistoryPanel()}
            </div>
        `;
    },

    renderMachinesPanel(activeEmployees, assignedMachines, availableMachines) {
        // Vista de tabla mejorada con búsqueda avanzada
        return `
            <div class="machines-table-container">
                <div class="table-controls">
                    <div class="search-group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <input type="text" class="table-search" placeholder="Buscar por máquina, empleado, serie..." id="machinesSearchInput">
                    </div>
                    <div class="filter-group">
                        <select id="machinesFilterStatus" class="filter-select">
                            <option value="all">Todas las máquinas</option>
                            <option value="assigned">Solo asignadas</option>
                            <option value="available">Solo disponibles</option>
                        </select>
                    </div>
                </div>
                
                <div class="table-wrapper">
                    <table class="assignments-table">
                        <thead>
                            <tr>
                                <th>Máquina</th>
                                <th>Tipo</th>
                                <th>Serie</th>
                                <th>Asignada a</th>
                                <th>Fecha Asignación</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="machinesTableBody">
                            ${this.renderMachinesTableRows(assignedMachines, availableMachines, activeEmployees)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderMachinesTableRows(assignedMachines, availableMachines, activeEmployees) {
        const allMachines = [
            ...assignedMachines.map(m => ({ ...m, status: 'assigned' })),
            ...availableMachines.map(m => ({ ...m, status: 'available' }))
        ];

        if (allMachines.length === 0) {
            return `
                <tr>
                    <td colspan="7" class="empty-table">
                        <div class="empty-list">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                                <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                            </svg>
                            <p>No hay máquinas registradas</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        return allMachines.map(m => {
            const employee = m.assignedTo ? this.employees.find(e => e.id === m.assignedTo) : null;
            const assignment = this.machineAssignments.find(a => a.machineId === m.id && !a.endDate);
            
            return `
                <tr class="machine-row ${m.status}" data-machine-id="${m.id}" data-status="${m.status}">
                    <td>
                        <div class="machine-cell">
                            <div class="machine-icon-cell">
                                ${this.getMachineIcon(m.type)}
                            </div>
                            <div class="machine-name-cell">
                                <strong>${this.escapeHtml(m.name)}</strong>
                                <span class="machine-meta">${m.brand || ''} ${m.model || ''}</span>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge badge-type">${m.type || 'N/A'}</span></td>
                    <td>${this.escapeHtml(m.serialNumber || 'Sin serie')}</td>
                    <td>
                        ${employee ? `
                            <div class="assignee-cell">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <span>${this.escapeHtml(employee.name)} ${this.escapeHtml(employee.lastName || '')}</span>
                            </div>
                        ` : '<span class="text-muted">Disponible</span>'}
                    </td>
                    <td>
                        ${assignment ? this.formatDate(assignment.startDate) : '<span class="text-muted">-</span>'}
                    </td>
                    <td>
                        ${m.status === 'assigned' ? 
                            '<span class="badge badge-assigned">Asignada</span>' : 
                            '<span class="badge badge-available">Disponible</span>'
                        }
                    </td>
                    <td>
                        <div class="table-actions">
                            ${m.status === 'available' ? `
                                <button class="btn-icon sm btn-success" onclick="AssignmentsModule.showAssignMachineModal('${m.id}')" title="Asignar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </button>
                            ` : `
                                <button class="btn-icon sm btn-danger" onclick="AssignmentsModule.confirmUnassignMachine('${m.id}')" title="Desasignar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            `}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderLicensesPanel(activeEmployees, activeLicenseAssignments) {
        // Calcular asignaciones por licencia dinámicamente
        const licensesWithStats = this.licenses.map(l => {
            const assignedCount = activeLicenseAssignments.filter(a => a.licenseId === l.id).length;
            const totalQuantity = l.quantity || 0;
            const available = totalQuantity > 0 ? totalQuantity - assignedCount : 0;
            const isExpired = l.expirationDate && new Date(l.expirationDate) < new Date();
            const usagePercent = totalQuantity > 0 ? (assignedCount / totalQuantity) * 100 : 0;
            
            return {
                ...l,
                assignedCount,
                available,
                isExpired,
                usagePercent
            };
        });

        return `
            <div class="licenses-table-container">
                <div class="table-controls">
                    <div class="search-group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <input type="text" class="table-search" placeholder="Buscar por software, empleado..." id="licensesSearchInput">
                    </div>
                </div>
                
                <div class="licenses-grid">
                    ${licensesWithStats.length === 0 ? `
                        <div class="empty-list" style="grid-column: 1 / -1;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            <p>No hay licencias registradas</p>
                        </div>
                    ` : licensesWithStats.map(l => {
                        const assignmentsForLicense = activeLicenseAssignments.filter(a => a.licenseId === l.id);
                        const canAssign = l.available > 0 && !l.isExpired;
                        
                        return `
                            <div class="license-card ${!canAssign ? 'depleted' : ''}" data-license-id="${l.id}">
                                <div class="license-card-header">
                                    <div class="license-icon ${l.isExpired ? 'expired' : l.available <= 0 ? 'depleted' : ''}">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                        </svg>
                                    </div>
                                    <div class="license-title">
                                        <h4>${this.escapeHtml(l.software)}</h4>
                                        <span class="license-type">${l.type || 'Licencia'}</span>
                                    </div>
                                </div>
                                
                                <div class="license-progress-section">
                                    <div class="license-progress-header">
                                        <span class="progress-label">Uso de Licencias</span>
                                        <span class="progress-count">${l.assignedCount} / ${l.quantity || 0}</span>
                                    </div>
                                    <div class="license-progress-bar">
                                        <div class="license-progress-fill" style="width: ${l.usagePercent}%"></div>
                                    </div>
                                    <div class="license-availability-info">
                                        <span class="available-count ${l.available <= 0 ? 'depleted' : ''}">
                                            ${l.available} disponible${l.available !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                                
                                ${l.expirationDate ? `
                                    <div class="license-expiry ${l.isExpired ? 'expired' : ''}">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                        <span>${l.isExpired ? 'Expirada' : 'Expira'}: ${this.formatDate(l.expirationDate)}</span>
                                    </div>
                                ` : ''}
                                
                                <div class="license-assignments-list">
                                    ${assignmentsForLicense.length === 0 ? `
                                        <div class="no-assignments">
                                            <span>No hay asignaciones activas</span>
                                        </div>
                                    ` : assignmentsForLicense.map(a => {
                                        const employee = this.employees.find(e => e.id === a.employeeId);
                                        if (!employee) return '';
                                        return `
                                            <div class="license-assignment-item">
                                                <div class="assignment-employee">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                        <circle cx="12" cy="7" r="4"></circle>
                                                    </svg>
                                                    <span>${this.escapeHtml(employee.name)} ${this.escapeHtml(employee.lastName || '')}</span>
                                                </div>
                                                <button class="btn-icon xs btn-danger" onclick="AssignmentsModule.confirmUnassignLicense('${a.licenseId}', '${a.employeeId}')" title="Desasignar">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                    </svg>
                                                </button>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                                
                                <div class="license-card-actions">
                                    <button class="btn btn-primary btn-sm" 
                                            onclick="AssignmentsModule.showAssignLicenseModal('${l.id}')" 
                                            ${!canAssign ? 'disabled' : ''}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                        Asignar
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },

    renderHistoryPanel() {
        // Combinar y ordenar historial de asignaciones
        const allAssignments = [
            ...this.machineAssignments.map(a => ({
                ...a,
                type: 'machine',
                resourceName: this.machines.find(m => m.id === a.machineId)?.name || 'Maquina eliminada'
            })),
            ...this.licenseAssignments.map(a => ({
                ...a,
                type: 'license',
                resourceName: this.licenses.find(l => l.id === a.licenseId)?.software || 'Licencia eliminada'
            }))
        ].sort((a, b) => {
            const dateA = new Date(a.endDate || a.startDate);
            const dateB = new Date(b.endDate || b.startDate);
            return dateB - dateA;
        });

        return `
            <div class="history-container">
                <div class="history-header">
                    <h3 class="history-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Historial de Asignaciones
                    </h3>
                    <div class="history-filters">
                        <select id="historyFilterType" class="history-filter-select">
                            <option value="all">Todos</option>
                            <option value="machine">Solo maquinas</option>
                            <option value="license">Solo licencias</option>
                        </select>
                        <select id="historyFilterStatus" class="history-filter-select">
                            <option value="all">Todas</option>
                            <option value="active">Activas</option>
                            <option value="ended">Finalizadas</option>
                        </select>
                    </div>
                </div>
                
                <div class="history-list" id="historyList">
                    ${allAssignments.length === 0 ? `
                        <div class="empty-list">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <p>No hay historial de asignaciones</p>
                        </div>
                    ` : allAssignments.map(a => {
                        const employee = this.employees.find(e => e.id === a.employeeId);
                        const isActive = !a.endDate;
                        return `
                            <div class="history-item ${isActive ? 'active' : 'ended'}" data-type="${a.type}" data-status="${isActive ? 'active' : 'ended'}">
                                <div class="history-icon ${a.type}">
                                    ${a.type === 'machine' ? `
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                                            <line x1="8" y1="21" x2="16" y2="21"></line>
                                            <line x1="12" y1="17" x2="12" y2="21"></line>
                                        </svg>
                                    ` : `
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                        </svg>
                                    `}
                                </div>
                                <div class="history-content">
                                    <div class="history-resource">${this.escapeHtml(a.resourceName)}</div>
                                    <div class="history-employee">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        ${employee ? `${employee.name} ${employee.lastName || ''}` : 'Empleado eliminado'}
                                    </div>
                                    ${a.notes ? `<div class="history-notes">"${this.escapeHtml(a.notes)}"</div>` : ''}
                                    <div class="history-by">Por: ${a.assignedBy || 'Sistema'}</div>
                                </div>
                                <div class="history-dates">
                                    <div class="history-date start">
                                        <span class="date-label">Inicio:</span>
                                        <span class="date-value">${this.formatDateTime(a.startDate)}</span>
                                    </div>
                                    ${a.endDate ? `
                                        <div class="history-date end">
                                            <span class="date-label">Fin:</span>
                                            <span class="date-value">${this.formatDateTime(a.endDate)}</span>
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="history-status ${isActive ? 'active' : 'ended'}">
                                    ${isActive ? 'Activa' : 'Finalizada'}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },

    getMachineIcon(type) {
        const icons = {
            laptop: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                <line x1="2" y1="20" x2="22" y2="20"></line>
            </svg>`,
            desktop: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>`,
            printer: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
            </svg>`,
            monitor: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>`
        };
        return icons[type] || icons.desktop;
    },

    bindEvents() {
        // Tabs
        document.querySelectorAll('.assignment-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.currentTab = tab.dataset.tab;
                this.renderContent();
                this.bindEvents();
            });
        });

        // Filtros de historial
        const filterType = document.getElementById('historyFilterType');
        const filterStatus = document.getElementById('historyFilterStatus');
        
        if (filterType) {
            filterType.addEventListener('change', () => this.filterHistory());
        }
        if (filterStatus) {
            filterStatus.addEventListener('change', () => this.filterHistory());
        }

        // Busquedas
        this.bindSearchEvents();
    },

    bindSearchEvents() {
        // Búsqueda de máquinas en tabla
        const machinesSearchInput = document.getElementById('machinesSearchInput');
        const machinesFilterStatus = document.getElementById('machinesFilterStatus');
        
        if (machinesSearchInput) {
            machinesSearchInput.addEventListener('input', () => this.filterMachinesTable());
        }
        
        if (machinesFilterStatus) {
            machinesFilterStatus.addEventListener('change', () => this.filterMachinesTable());
        }
        
        // Búsqueda de licencias
        const licensesSearchInput = document.getElementById('licensesSearchInput');
        if (licensesSearchInput) {
            licensesSearchInput.addEventListener('input', () => this.filterLicensesCards());
        }
    },

    filterMachinesTable() {
        const searchQuery = (document.getElementById('machinesSearchInput')?.value || '').toLowerCase();
        const statusFilter = document.getElementById('machinesFilterStatus')?.value || 'all';
        const tbody = document.getElementById('machinesTableBody');
        
        if (!tbody) return;
        
        tbody.querySelectorAll('.machine-row').forEach(row => {
            const machineName = row.querySelector('.machine-name-cell strong')?.textContent.toLowerCase() || '';
            const serialNumber = row.cells[2]?.textContent.toLowerCase() || '';
            const assignee = row.cells[3]?.textContent.toLowerCase() || '';
            const status = row.dataset.status || '';
            
            const matchesSearch = !searchQuery || 
                machineName.includes(searchQuery) || 
                serialNumber.includes(searchQuery) || 
                assignee.includes(searchQuery);
            
            const matchesStatus = statusFilter === 'all' || status === statusFilter;
            
            row.style.display = matchesSearch && matchesStatus ? '' : 'none';
        });
    },

    filterLicensesCards() {
        const searchQuery = (document.getElementById('licensesSearchInput')?.value || '').toLowerCase();
        const cards = document.querySelectorAll('.license-card');
        
        cards.forEach(card => {
            const software = card.querySelector('.license-title h4')?.textContent.toLowerCase() || '';
            const assignments = Array.from(card.querySelectorAll('.assignment-employee span'))
                .map(span => span.textContent.toLowerCase())
                .join(' ');
            
            const matches = !searchQuery || 
                software.includes(searchQuery) || 
                assignments.includes(searchQuery);
            
            card.style.display = matches ? '' : 'none';
        });
    },

    filterHistory() {
        const typeFilter = document.getElementById('historyFilterType')?.value || 'all';
        const statusFilter = document.getElementById('historyFilterStatus')?.value || 'all';
        
        document.querySelectorAll('.history-item').forEach(item => {
            const matchType = typeFilter === 'all' || item.dataset.type === typeFilter;
            const matchStatus = statusFilter === 'all' || item.dataset.status === statusFilter;
            item.style.display = matchType && matchStatus ? '' : 'none';
        });
    },

    // Modal para asignar maquina
    showAssignMachineModal(machineId) {
        const machine = this.machines.find(m => m.id === machineId);
        if (!machine) return;

        const activeEmployees = this.employees.filter(e => e.status === 'active');

        const modalHtml = `
            <div class="modal-overlay active" id="assignModal">
                <div class="modal" style="max-width: 450px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Asignar Maquina</h2>
                        <button class="modal-close" onclick="document.getElementById('assignModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="assign-resource-preview">
                            <div class="preview-icon machine">
                                ${this.getMachineIcon(machine.type)}
                            </div>
                            <div class="preview-info">
                                <div class="preview-name">${this.escapeHtml(machine.name)}</div>
                                <div class="preview-detail">${machine.serialNumber || ''} - ${machine.brand || ''} ${machine.model || ''}</div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Seleccionar Empleado <span class="required">*</span></label>
                            <select id="employeeSelect" class="form-select">
                                <option value="">-- Seleccionar empleado --</option>
                                ${activeEmployees.map(e => `
                                    <option value="${e.id}">${e.name} ${e.lastName || ''} - ${e.department || 'Sin depto.'}</option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Notas (opcional)</label>
                            <textarea id="assignNotes" class="form-textarea" placeholder="Agregar notas sobre esta asignacion..." rows="3"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('assignModal').remove()">Cancelar</button>
                        <button class="btn btn-primary" onclick="AssignmentsModule.confirmAssignMachine('${machineId}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Asignar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async confirmAssignMachine(machineId) {
        const employeeId = document.getElementById('employeeSelect').value;
        const notes = document.getElementById('assignNotes')?.value || '';

        if (!employeeId) {
            this.showToast('Selecciona un empleado', 'error');
            return;
        }

        try {
            await Store.assignMachineToEmployee(machineId, employeeId, notes);
            document.getElementById('assignModal')?.remove();
            await this.loadData();
            this.renderContent();
            this.bindEvents();
            this.showToast('Maquina asignada correctamente', 'success');
        } catch (e) {
            this.showToast(e.message || 'Error al asignar', 'error');
        }
    },

    confirmUnassignMachine(machineId) {
        const machine = this.machines.find(m => m.id === machineId);
        const employee = this.employees.find(e => e.id === machine?.assignedTo);

        const modalHtml = `
            <div class="modal-overlay active" id="confirmModal">
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Confirmar Desasignacion</h2>
                        <button class="modal-close" onclick="document.getElementById('confirmModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="confirm-message">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <p>Estas a punto de desasignar:</p>
                            <div class="confirm-details">
                                <strong>${machine?.name || 'Maquina'}</strong>
                                <span>de</span>
                                <strong>${employee ? `${employee.name} ${employee.lastName || ''}` : 'empleado'}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('confirmModal').remove()">Cancelar</button>
                        <button class="btn btn-danger" onclick="AssignmentsModule.executeUnassignMachine('${machineId}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Desasignar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async executeUnassignMachine(machineId) {
        try {
            await Store.unassignMachine(machineId);
            document.getElementById('confirmModal')?.remove();
            await this.loadData();
            this.renderContent();
            this.bindEvents();
            this.showToast('Maquina desasignada correctamente', 'success');
        } catch (e) {
            this.showToast(e.message || 'Error al desasignar', 'error');
        }
    },

    // Modal para asignar licencia
    showAssignLicenseModal(licenseId) {
        const license = this.licenses.find(l => l.id === licenseId);
        if (!license) return;

        const activeEmployees = this.employees.filter(e => e.status === 'active');
        const activeLicenseAssignments = this.licenseAssignments.filter(a => a.licenseId === licenseId && !a.endDate);
        const assignedEmployeeIds = activeLicenseAssignments.map(a => a.employeeId);
        const availableEmployees = activeEmployees.filter(e => !assignedEmployeeIds.includes(e.id));

        const modalHtml = `
            <div class="modal-overlay active" id="assignModal">
                <div class="modal" style="max-width: 450px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Asignar Licencia</h2>
                        <button class="modal-close" onclick="document.getElementById('assignModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="assign-resource-preview license">
                            <div class="preview-icon license">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                            </div>
                            <div class="preview-info">
                                <div class="preview-name">${this.escapeHtml(license.software)}</div>
                                <div class="preview-detail">${license.type || 'Licencia'} - Disponibles: ${(license.quantity || 0) - activeLicenseAssignments.length}</div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Seleccionar Empleado <span class="required">*</span></label>
                            <select id="employeeSelect" class="form-select">
                                <option value="">-- Seleccionar empleado --</option>
                                ${availableEmployees.map(e => `
                                    <option value="${e.id}">${e.name} ${e.lastName || ''} - ${e.department || 'Sin depto.'}</option>
                                `).join('')}
                            </select>
                            ${availableEmployees.length === 0 ? `
                                <div class="form-hint" style="color: #f97316;">Todos los empleados ya tienen esta licencia asignada</div>
                            ` : ''}
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Notas (opcional)</label>
                            <textarea id="assignNotes" class="form-textarea" placeholder="Agregar notas sobre esta asignacion..." rows="3"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('assignModal').remove()">Cancelar</button>
                        <button class="btn btn-primary" onclick="AssignmentsModule.confirmAssignLicense('${licenseId}')" ${availableEmployees.length === 0 ? 'disabled' : ''}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Asignar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async confirmAssignLicense(licenseId) {
        const employeeId = document.getElementById('employeeSelect').value;
        const notes = document.getElementById('assignNotes')?.value || '';

        if (!employeeId) {
            this.showToast('Selecciona un empleado', 'error');
            return;
        }

        try {
            await Store.assignLicenseToEmployee(licenseId, employeeId, notes);
            document.getElementById('assignModal')?.remove();
            await this.loadData();
            this.renderContent();
            this.bindEvents();
            this.showToast('Licencia asignada correctamente', 'success');
        } catch (e) {
            this.showToast(e.message || 'Error al asignar', 'error');
        }
    },

    confirmUnassignLicense(licenseId, employeeId) {
        console.log('confirmUnassignLicense llamado con:', { licenseId, employeeId });
        
        const license = this.licenses.find(l => l.id === licenseId);
        const employee = this.employees.find(e => e.id === employeeId);

        // Guardar los IDs para usarlos en el handler del boton
        this._pendingUnassign = { licenseId, employeeId };

        const modalHtml = `
            <div class="modal-overlay active" id="confirmModal">
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Confirmar Desasignacion</h2>
                        <button class="modal-close" onclick="document.getElementById('confirmModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="confirm-message">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <p>Estas a punto de desasignar:</p>
                            <div class="confirm-details">
                                <strong>${this.escapeHtml(license?.software || 'Licencia')}</strong>
                                <span>de</span>
                                <strong>${employee ? this.escapeHtml(`${employee.name} ${employee.lastName || ''}`) : 'empleado'}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('confirmModal').remove()">Cancelar</button>
                        <button class="btn btn-danger" id="confirmUnassignLicenseBtn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Desasignar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Agregar el event listener al boton de confirmar
        document.getElementById('confirmUnassignLicenseBtn')?.addEventListener('click', () => {
            const { licenseId, employeeId } = this._pendingUnassign || {};
            if (licenseId && employeeId) {
                this.executeUnassignLicense(licenseId, employeeId);
            }
        });
    },

    async executeUnassignLicense(licenseId, employeeId) {
        console.log('executeUnassignLicense llamado con:', { licenseId, employeeId });
        
        try {
            // Verificar que los IDs existan
            if (!licenseId || !employeeId) {
                throw new Error('Faltan datos para desasignar la licencia');
            }

            const result = await Store.unassignLicense(licenseId, employeeId);
            console.log('Resultado de unassignLicense:', result);
            
            if (!result) {
                throw new Error('No se encontro la asignacion a desasignar');
            }
            
            document.getElementById('confirmModal')?.remove();
            await this.loadData();
            this.renderContent();
            this.bindEvents();
            this.showToast('Licencia desasignada correctamente', 'success');
        } catch (e) {
            console.error('Error en executeUnassignLicense:', e);
            this.showToast(e.message || 'Error al desasignar la licencia', 'error');
        }
    },

    selectMachine(machineId, type) {
        document.querySelectorAll('.resource-item').forEach(item => {
            item.classList.remove('selected');
        });
        const item = document.querySelector(`.resource-item[data-id="${machineId}"]`);
        if (item) {
            item.classList.add('selected');
        }
        this.selectedResource = { id: machineId, type };
    },

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

    formatDateTime(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
    setTimeout(() => AssignmentsModule.init(), 100);
});

window.AssignmentsModule = AssignmentsModule;
