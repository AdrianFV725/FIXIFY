// ========================================
// EMPLOYEE DETAIL MODULE
// Página de detalle y administración de empleado
// ========================================

const EmployeeDetailModule = {
    employee: null,
    machines: [],
    licenses: [],
    machineAssignments: [],
    licenseAssignments: [],
    departments: [],
    employeeId: null,

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        // Obtener ID de la URL
        const urlParams = new URLSearchParams(window.location.search);
        this.employeeId = urlParams.get('id');

        if (!this.employeeId) {
            this.showError('No se especificó un empleado');
            return;
        }

        await this.loadData();
        this.render();
        this.bindEvents();
    },

    async loadData() {
        try {
            const [employee, machines, licenses, machineAssignments, licenseAssignments, departments] = await Promise.all([
                Store.getEmployeeById(this.employeeId),
                Store.getMachines(),
                Store.getLicenses(),
                Store.getMachineAssignments(),
                Store.getLicenseAssignments(),
                Store.getDepartments()
            ]);

            if (!employee) {
                this.showError('Empleado no encontrado');
                return;
            }

            this.employee = employee;
            this.machines = machines || [];
            this.licenses = licenses || [];
            this.machineAssignments = machineAssignments || [];
            this.licenseAssignments = licenseAssignments || [];
            this.departments = departments || [];
        } catch (e) {
            console.error('Error cargando datos:', e);
            this.showError('Error al cargar los datos del empleado');
        }
    },

    getEmployeeAssignments() {
        const activeMachineAssignments = this.machineAssignments.filter(a => 
            a.employeeId === this.employeeId && !a.endDate
        );
        const allMachineAssignments = this.machineAssignments.filter(a => 
            a.employeeId === this.employeeId
        ).sort((a, b) => {
            const dateA = new Date(a.endDate || a.startDate);
            const dateB = new Date(b.endDate || b.startDate);
            return dateB - dateA;
        });

        const activeLicenseAssignments = this.licenseAssignments.filter(a => 
            a.employeeId === this.employeeId && !a.endDate
        );
        const allLicenseAssignments = this.licenseAssignments.filter(a => 
            a.employeeId === this.employeeId
        ).sort((a, b) => {
            const dateA = new Date(a.endDate || a.startDate);
            const dateB = new Date(b.endDate || b.startDate);
            return dateB - dateA;
        });

        return {
            activeMachineAssignments,
            allMachineAssignments,
            activeLicenseAssignments,
            allLicenseAssignments
        };
    },

    render() {
        const container = document.getElementById('employeeDetailContent');
        if (!container || !this.employee) return;

        const assignments = this.getEmployeeAssignments();
        const department = this.departments.find(d => d.id === this.employee.department);
        const initials = `${this.employee.name?.charAt(0) || ''}${this.employee.lastName?.charAt(0) || ''}`.toUpperCase();

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
                <div class="stat-card">
                    <div class="stat-value" style="color: #22c55e;">${assignments.allMachineAssignments.length}</div>
                    <div class="stat-label">Total Máquinas (Histórico)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #f97316;">${assignments.allLicenseAssignments.length}</div>
                    <div class="stat-label">Total Licencias (Histórico)</div>
                </div>
            </div>

            <!-- Información del empleado -->
            <div class="employee-info-card">
                <div class="employee-info-header">
                    <div style="display: flex; align-items: flex-start;">
                        <div class="employee-avatar-large">${initials}</div>
                        <div class="employee-title-section">
                            <h2 class="employee-title">${this.escapeHtml(this.employee.name || '')} ${this.escapeHtml(this.employee.lastName || '')}</h2>
                            <div class="employee-meta">
                                <div class="employee-meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                    <span>${this.escapeHtml(this.employee.email || 'N/A')}</span>
                                </div>
                                ${this.employee.employeeNumber ? `
                                    <div class="employee-meta-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        <span>No. ${this.escapeHtml(this.employee.employeeNumber)}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div>
                        <button class="btn btn-secondary" onclick="EmployeeDetailModule.editEmployee()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Editar
                        </button>
                    </div>
                </div>

                <div class="employee-specs-grid">
                    <div class="employee-spec-card">
                        <div class="employee-spec-label">Departamento</div>
                        <div class="employee-spec-value">
                            ${department ? `
                                <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
                                    <span style="width: 12px; height: 12px; border-radius: 3px; background: ${department.color || '#3b82f6'};"></span>
                                    ${this.escapeHtml(department.name)}
                                </span>
                            ` : '<span style="color: var(--text-tertiary);">Sin departamento</span>'}
                        </div>
                    </div>
                    <div class="employee-spec-card">
                        <div class="employee-spec-label">Puesto</div>
                        <div class="employee-spec-value">${this.escapeHtml(this.employee.position || 'N/A')}</div>
                    </div>
                    <div class="employee-spec-card">
                        <div class="employee-spec-label">Estado</div>
                        <div class="employee-spec-value">
                            ${this.getStatusBadge(this.employee.status)}
                        </div>
                    </div>
                    ${this.employee.phone ? `
                        <div class="employee-spec-card">
                            <div class="employee-spec-label">Teléfono</div>
                            <div class="employee-spec-value">${this.escapeHtml(this.employee.phone)}</div>
                        </div>
                    ` : ''}
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
                        <p>Este empleado no tiene máquinas asignadas actualmente</p>
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
                        <p>Este empleado no tiene licencias asignadas actualmente</p>
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

            <!-- Historial de asignaciones -->
            ${assignments.allMachineAssignments.length > 0 || assignments.allLicenseAssignments.length > 0 ? `
                <div class="history-section">
                    <h3 class="section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Historial de Asignaciones
                    </h3>
                    <div class="history-list">
                        ${[...assignments.allMachineAssignments.map(a => ({ ...a, type: 'machine' })), 
                            ...assignments.allLicenseAssignments.map(a => ({ ...a, type: 'license' }))]
                            .sort((a, b) => {
                                const dateA = new Date(a.endDate || a.startDate);
                                const dateB = new Date(b.endDate || b.startDate);
                                return dateB - dateA;
                            })
                            .slice(0, 20)
                            .map(item => {
                                const isActive = !item.endDate;
                                const resource = item.type === 'machine' 
                                    ? this.machines.find(m => m.id === item.machineId)
                                    : this.licenses.find(l => l.id === item.licenseId);
                                
                                if (!resource) return '';
                                
                                const resourceName = item.type === 'machine' 
                                    ? resource.name || resource.serialNumber || 'Máquina'
                                    : resource.software || 'Licencia';
                                
                                return `
                                    <div class="history-item">
                                        <div class="history-icon" style="background: ${isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${isActive ? '#22c55e' : '#ef4444'};">
                                            ${item.type === 'machine' ? `
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
                                            <div class="history-action">
                                                ${isActive ? 'Asignado' : 'Desasignado'}: ${this.escapeHtml(resourceName)}
                                            </div>
                                            <div class="history-details">
                                                ${item.notes ? `Notas: "${this.escapeHtml(item.notes)}"` : ''}
                                            </div>
                                            <div class="history-details" style="margin-top: 0.25rem;">
                                                ${isActive ? `Por: ${this.escapeHtml(item.assignedBy || 'Sistema')}` : `Desasignado por: ${this.escapeHtml(item.unassignedBy || 'Sistema')}`}
                                            </div>
                                        </div>
                                        <div class="history-date">
                                            ${isActive ? this.formatDateTime(item.startDate) : this.formatDateTime(item.endDate)}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    },

    async editEmployee() {
        if (window.UsersModule) {
            window.location.href = `users.html`;
            // Después de cargar, abrir el formulario de edición
            setTimeout(() => {
                if (window.UsersModule) {
                    UsersModule.editUser(this.employeeId);
                }
            }, 500);
        } else {
            window.location.href = `users.html`;
        }
    },

    bindEvents() {
        // Eventos adicionales si son necesarios
    },

    getStatusBadge(status) {
        const statusOptions = Store.getLocal(Store.KEYS.EMPLOYEE_OPTIONS)?.status || [];
        const statusOption = statusOptions.find(s => s.value === status);
        
        if (statusOption) {
            const classMap = {
                active: { color: '#22c55e', label: statusOption.label },
                inactive: { color: '#ef4444', label: statusOption.label }
            };
            const statusInfo = classMap[status] || { color: '#6b7280', label: statusOption.label };
            return `<span style="color: ${statusInfo.color}; font-weight: 600;">${statusInfo.label}</span>`;
        }
        
        const labels = {
            active: 'Activo',
            inactive: 'Inactivo'
        };
        const colors = {
            active: '#22c55e',
            inactive: '#ef4444'
        };
        const label = labels[status] || status || '-';
        const color = colors[status] || '#6b7280';
        return `<span style="color: ${color}; font-weight: 600;">${label}</span>`;
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
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    },

    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    showError(message) {
        const container = document.getElementById('employeeDetailContent');
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
                        Volver a Empleados
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
    setTimeout(() => EmployeeDetailModule.init(), 100);
});

window.EmployeeDetailModule = EmployeeDetailModule;

