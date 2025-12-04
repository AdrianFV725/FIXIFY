// ========================================
// LICENSE DETAIL MODULE
// Página de detalle y administración de licencia
// ========================================

const LicenseDetailModule = {
    license: null,
    employees: [],
    licenseAssignments: [],
    licenseId: null,
    activeAssignments: [],
    filteredAssignments: [],

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        // Obtener ID de la URL
        const urlParams = new URLSearchParams(window.location.search);
        this.licenseId = urlParams.get('id');

        if (!this.licenseId) {
            this.showError('No se especificó una licencia');
            return;
        }

        await this.loadData();
        this.render();
        this.bindEvents();
    },

    async loadData() {
        try {
            const [license, employees, assignments] = await Promise.all([
                Store.getLicenseById(this.licenseId),
                Store.getEmployees(),
                Store.getLicenseAssignments()
            ]);

            if (!license) {
                this.showError('Licencia no encontrada');
                return;
            }

            this.license = license;
            this.employees = Array.isArray(employees) ? employees : [];
            this.licenseAssignments = Array.isArray(assignments) ? assignments : [];
            
            // Limpiar asignaciones inválidas (sin licenseId o employeeId)
            this.licenseAssignments = this.licenseAssignments.filter(a => {
                return a && a.licenseId && a.employeeId && typeof a.licenseId === 'string' && typeof a.employeeId === 'string';
            });
        } catch (e) {
            console.error('Error cargando datos:', e);
            this.showError('Error al cargar los datos de la licencia');
        }
    },

    render() {
        const container = document.getElementById('licenseDetailContent');
        if (!container || !this.license) return;

        // Filtrar asignaciones activas y válidas (que tengan empleado existente)
        this.activeAssignments = this.licenseAssignments.filter(a => {
            // Validar que la asignación sea para esta licencia y esté activa
            if (!a || a.licenseId !== this.licenseId || a.endDate) return false;
            // Validar que tenga un employeeId válido
            if (!a.employeeId) return false;
            // Validar que el empleado exista
            return this.employees.some(e => e && e.id === a.employeeId);
        });
        
        // Inicializar asignaciones filtradas con todas las activas
        this.filteredAssignments = [...this.activeAssignments];
        
        const allAssignments = this.licenseAssignments.filter(a => 
            a && a.licenseId === this.licenseId
        ).sort((a, b) => {
            const dateA = new Date(a.endDate || a.startDate);
            const dateB = new Date(b.endDate || b.startDate);
            return dateB - dateA;
        });

        // El conteo solo incluye asignaciones válidas con empleados existentes
        const assignedCount = this.activeAssignments.length;
        const totalQuantity = this.license.quantity || 0;
        const available = totalQuantity > 0 ? totalQuantity - assignedCount : 0;
        const usagePercent = totalQuantity > 0 ? (assignedCount / totalQuantity) * 100 : 0;
        const hasCard = this.license.isBilling && this.license.cardLastFour && this.license.cardLastFour.length === 4;

        container.innerHTML = `
            <!-- Información de la licencia -->
            <div class="license-info-card">
                <div class="license-info-header">
                    <div class="license-title-section">
                        <h2 class="license-title">${this.escapeHtml(this.license.software || 'Licencia')}</h2>
                        <div class="license-meta">
                            <div class="license-meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                <span>Tipo: ${this.license.type || 'N/A'}</span>
                            </div>
                            ${this.license.billingDate ? `
                                <div class="license-meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    <span>Facturación: ${this.formatDate(this.license.billingDate)}</span>
                                </div>
                            ` : ''}
                            ${this.license.cost ? `
                                <div class="license-meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                    </svg>
                                    <span>Costo: ${this.license.currency || 'MXN'} $${parseFloat(this.license.cost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                </div>
                            ` : ''}
                            ${this.license.periodicity ? `
                                <div class="license-meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    <span>Periodicidad: ${this.getPeriodicityLabel(this.license.periodicity)}</span>
                                </div>
                            ` : ''}
                            ${this.license.cardLastFour ? `
                                <div class="license-meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                        <line x1="1" y1="10" x2="23" y2="10"></line>
                                    </svg>
                                    <span>Tarjeta: ****${this.license.cardLastFour}</span>
                                </div>
                            ` : ''}
                            ${this.license.isBilling ? `
                                <div class="license-meta-item" style="color: #22c55e;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    <span>En Facturación</span>
                                </div>
                            ` : ''}
                            ${this.license.loginUrl ? `
                                <div class="license-meta-item">
                                    <a href="${this.license.loginUrl}" target="_blank" class="btn btn-primary sm" style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                            <polyline points="15 3 21 3 21 9"></polyline>
                                            <line x1="10" y1="14" x2="21" y2="3"></line>
                                        </svg>
                                        Iniciar Sesión
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div>
                        <button class="btn btn-secondary" onclick="LicenseDetailModule.editLicense()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Editar
                        </button>
                    </div>
                </div>

                <div class="license-stats-grid">
                    <div class="license-stat-card">
                        <div class="license-stat-label">Total de Licencias</div>
                        <div class="license-stat-value">${totalQuantity || 'Ilimitado'}</div>
                    </div>
                    <div class="license-stat-card">
                        <div class="license-stat-label">Asignadas</div>
                        <div class="license-stat-value" style="color: #22c55e;">${assignedCount}</div>
                    </div>
                    <div class="license-stat-card">
                        <div class="license-stat-label">Disponibles</div>
                        <div class="license-stat-value" style="color: ${available > 0 ? '#3b82f6' : '#ef4444'};">${available}</div>
                    </div>
                    <div class="license-stat-card">
                        <div class="license-stat-label">Estado</div>
                        <div class="license-stat-value">
                            ${available <= 0 ? '<span style="color: #f97316;">Agotada</span>' : 
                              this.license.isBilling && !hasCard ? '<span style="color: #f97316;">Sin Tarjeta</span>' :
                              this.license.isBilling ? '<span style="color: #8b5cf6;">En Facturación</span>' :
                              '<span style="color: #22c55e;">Activa</span>'}
                        </div>
                    </div>
                </div>

                ${totalQuantity > 0 ? `
                    <div class="license-progress-section">
                        <div class="license-progress-header">
                            <span class="license-progress-label">Uso de Licencias</span>
                            <span class="license-progress-count">${assignedCount} / ${totalQuantity}</span>
                        </div>
                        <div class="license-progress-bar">
                            <div class="license-progress-fill" style="width: ${usagePercent}%"></div>
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- Asignaciones activas -->
            <div class="assignments-section">
                <div class="section-header">
                    <h3 class="section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        Empleados con esta Licencia (${this.activeAssignments.length})
                    </h3>
                    <button class="btn btn-primary" onclick="LicenseDetailModule.showAssignModal()" 
                            ${available <= 0 ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Asignar Licencia
                    </button>
                </div>

                ${this.activeAssignments.length > 0 ? `
                    <div class="assignments-search-container" style="margin-bottom: 1rem;">
                        <div class="search-input-wrapper" style="position: relative; max-width: 400px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none;">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <input type="text" id="assignmentsSearchInput" class="assignments-search-input" placeholder="Buscar empleado por nombre, email o número de empleado..." style="width: 100%; padding: 0.75rem 0.75rem 0.75rem 2.5rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary); font-size: 0.9rem; outline: none; transition: all 0.2s ease;" oninput="LicenseDetailModule.filterAssignments(this.value)">
                            <button id="clearSearchBtn" onclick="LicenseDetailModule.clearSearch()" style="display: none; position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-tertiary); cursor: pointer; padding: 0.25rem; border-radius: 4px; transition: all 0.2s ease;" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                ` : ''}

                ${this.activeAssignments.length === 0 ? `
                    <div class="empty-assignments">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <p>No hay empleados asignados a esta licencia</p>
                    </div>
                ` : `
                    <div id="assignmentsTableContainer">
                        <table class="assignments-table">
                            <thead>
                                <tr>
                                    <th>Empleado</th>
                                    <th>Número de Empleado</th>
                                    <th>Fecha de Asignación</th>
                                    <th>Asignado por</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="assignmentsTableBody">
                                ${this.renderAssignmentsTable()}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>

            <!-- Historial de asignaciones -->
            ${allAssignments.length > 0 ? `
                <div class="history-section">
                    <h3 class="section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Historial de Asignaciones
                    </h3>
                    <div class="history-list">
                        ${allAssignments.map(a => {
                            const employee = this.employees.find(e => e.id === a.employeeId);
                            const isActive = !a.endDate;
                            
                            return `
                                <div class="history-item">
                                    <div class="history-icon" style="background: ${isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${isActive ? '#22c55e' : '#ef4444'};">
                                        ${isActive ? `
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        ` : `
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        `}
                                    </div>
                                    <div class="history-content">
                                        <div class="history-action">
                                            ${isActive ? 'Asignada a' : 'Desasignada de'} ${employee ? `${employee.name} ${employee.lastName || ''}` : 'Empleado eliminado'}
                                        </div>
                                        <div class="history-details">
                                            ${a.notes ? `Notas: "${this.escapeHtml(a.notes)}"` : ''}
                                        </div>
                                        <div class="history-details" style="margin-top: 0.25rem;">
                                            ${isActive ? `Por: ${this.escapeHtml(a.assignedBy || 'Sistema')}` : `Desasignada por: ${this.escapeHtml(a.unassignedBy || 'Sistema')}`}
                                        </div>
                                    </div>
                                    <div class="history-date">
                                        ${isActive ? this.formatDateTime(a.startDate) : this.formatDateTime(a.endDate)}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    },

    showAssignModal() {
        const activeAssignments = this.licenseAssignments.filter(a => 
            a.licenseId === this.licenseId && !a.endDate
        );
        const assignedEmployeeIds = activeAssignments.map(a => a.employeeId);
        const activeEmployees = this.employees.filter(e => 
            e.status === 'active' && !assignedEmployeeIds.includes(e.id)
        );

        const totalQuantity = this.license.quantity || 0;
        const available = totalQuantity > 0 ? totalQuantity - activeAssignments.length : 0;

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
                                <div class="preview-name">${this.escapeHtml(this.license.software)}</div>
                                <div class="preview-detail">${this.license.type || 'Licencia'} - Disponibles: ${available}</div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Seleccionar Empleado <span class="required">*</span></label>
                            <select id="employeeSelect" class="form-select">
                                <option value="">-- Seleccionar empleado --</option>
                                ${activeEmployees.map(e => `
                                    <option value="${e.id}">${e.name} ${e.lastName || ''}${e.employeeNumber ? ` - #${e.employeeNumber}` : ''}</option>
                                `).join('')}
                            </select>
                            ${activeEmployees.length === 0 ? `
                                <div class="form-hint" style="color: #f97316; margin-top: 0.5rem;">
                                    ${totalQuantity > 0 && available <= 0 ? 'No hay licencias disponibles' : 'Todos los empleados ya tienen esta licencia asignada'}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Notas (opcional)</label>
                            <textarea id="assignNotes" class="form-textarea" placeholder="Agregar notas sobre esta asignación..." rows="3"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('assignModal').remove()">Cancelar</button>
                        <button class="btn btn-primary" onclick="LicenseDetailModule.confirmAssign()" ${activeEmployees.length === 0 ? 'disabled' : ''}>
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

    async confirmAssign() {
        const employeeId = document.getElementById('employeeSelect')?.value;
        const notes = document.getElementById('assignNotes')?.value || '';

        if (!employeeId) {
            this.showToast('Selecciona un empleado', 'error');
            return;
        }

        try {
            await Store.assignLicenseToEmployee(this.licenseId, employeeId, notes);
            document.getElementById('assignModal')?.remove();
            await this.loadData();
            this.render();
            this.showToast('Licencia asignada correctamente', 'success');
        } catch (e) {
            this.showToast(e.message || 'Error al asignar', 'error');
        }
    },

    confirmUnassign(employeeId) {
        const employee = this.employees.find(e => e.id === employeeId);

        const modalHtml = `
            <div class="modal-overlay active" id="confirmModal">
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Confirmar Desasignación</h2>
                        <button class="modal-close" onclick="document.getElementById('confirmModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="confirm-message">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <p>¿Estás seguro de desasignar esta licencia?</p>
                            <div class="confirm-details" style="margin-top: 1rem;">
                                <strong>${this.escapeHtml(this.license.software || 'Licencia')}</strong>
                                <span>de</span>
                                <strong>${employee ? `${employee.name} ${employee.lastName || ''}` : 'empleado'}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('confirmModal').remove()">Cancelar</button>
                        <button class="btn btn-danger" onclick="LicenseDetailModule.executeUnassign('${employeeId}')">
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

    async executeUnassign(employeeId) {
        try {
            await Store.unassignLicense(this.licenseId, employeeId);
            document.getElementById('confirmModal')?.remove();
            await this.loadData();
            this.render();
            this.showToast('Licencia desasignada correctamente', 'success');
        } catch (e) {
            this.showToast(e.message || 'Error al desasignar', 'error');
        }
    },

    async editLicense() {
        // Usar el mismo modal que en LicensesModule para mantener consistencia
        const license = this.license;
        const isEdit = true;

        const modalHtml = `
            <div class="modal-overlay active" id="licenseModal">
                <div class="modal" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2>Editar Licencia</h2>
                        <button class="modal-close" onclick="document.getElementById('licenseModal').remove()">&times;</button>
                    </div>
                    <form id="licenseForm" class="modal-body">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group" style="grid-column: span 2;">
                                <label>Software/Producto *</label>
                                <input type="text" name="software" required value="${license?.software || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Tipo *</label>
                                <select name="type" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    <option value="subscription" ${license?.type === 'subscription' ? 'selected' : ''}>Suscripcion</option>
                                    <option value="perpetual" ${license?.type === 'perpetual' ? 'selected' : ''}>Perpetua</option>
                                    <option value="volume" ${license?.type === 'volume' ? 'selected' : ''}>Por Volumen</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Cantidad</label>
                                <input type="number" name="quantity" min="1" value="${license?.quantity || 1}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Fecha de Facturación</label>
                                <input type="date" name="billingDate" value="${license?.billingDate?.split('T')[0] || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Costo *</label>
                                <input type="number" name="cost" min="0" step="0.01" required value="${license?.cost || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Tipo de Moneda *</label>
                                <select name="currency" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    <option value="MXN" ${license?.currency === 'MXN' ? 'selected' : ''}>MXN - Peso Mexicano</option>
                                    <option value="USD" ${license?.currency === 'USD' ? 'selected' : ''}>USD - Dólar Estadounidense</option>
                                    <option value="EUR" ${license?.currency === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                                    <option value="GBP" ${license?.currency === 'GBP' ? 'selected' : ''}>GBP - Libra Esterlina</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Periodicidad *</label>
                                <select name="periodicity" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    <option value="monthly" ${license?.periodicity === 'monthly' ? 'selected' : ''}>Mensual</option>
                                    <option value="quarterly" ${license?.periodicity === 'quarterly' ? 'selected' : ''}>Trimestral</option>
                                    <option value="semiannual" ${license?.periodicity === 'semiannual' ? 'selected' : ''}>Semestral</option>
                                    <option value="annual" ${license?.periodicity === 'annual' ? 'selected' : ''}>Anual</option>
                                    <option value="one-time" ${license?.periodicity === 'one-time' ? 'selected' : ''}>Pago Único</option>
                                </select>
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label>Link de Inicio de Sesión</label>
                                <div style="display: flex; gap: 0.5rem;">
                                    <input type="url" name="loginUrl" placeholder="https://ejemplo.com/login" value="${license?.loginUrl || ''}" style="flex: 1; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    ${license?.loginUrl ? `
                                        <a href="${license.loginUrl}" target="_blank" class="btn btn-primary" style="white-space: nowrap;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                <polyline points="15 3 21 3 21 9"></polyline>
                                                <line x1="10" y1="14" x2="21" y2="3"></line>
                                            </svg>
                                            Abrir
                                        </a>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Terminación de Tarjeta</label>
                                <input type="text" name="cardLastFour" maxlength="4" pattern="[0-9]{4}" placeholder="1234" value="${license?.cardLastFour || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                <small style="color: var(--text-tertiary); font-size: 0.8rem;">Últimos 4 dígitos de la tarjeta de pago</small>
                            </div>
                            <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1.5rem;">
                                <input type="checkbox" name="isBilling" id="isBilling" ${license?.isBilling ? 'checked' : ''} style="width: auto;">
                                <label for="isBilling" style="margin: 0; cursor: pointer;">Se está facturando</label>
                            </div>
                        </div>
                        <input type="hidden" name="id" value="${license?.id || ''}">
                    </form>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('licenseModal').remove()">Cancelar</button>
                        <button type="submit" form="licenseForm" class="btn btn-primary">Actualizar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Agregar listener para mostrar botón de link dinámicamente
        const loginUrlInput = document.querySelector('input[name="loginUrl"]');
        const loginUrlContainer = loginUrlInput?.parentElement;
        
        if (loginUrlInput && loginUrlContainer) {
            const updateLinkButton = () => {
                const url = loginUrlInput.value.trim();
                let existingBtn = loginUrlContainer.querySelector('a.btn');
                
                if (url && url.startsWith('http')) {
                    if (!existingBtn) {
                        const btn = document.createElement('a');
                        btn.href = url;
                        btn.target = '_blank';
                        btn.className = 'btn btn-primary';
                        btn.style.cssText = 'white-space: nowrap;';
                        btn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            Abrir
                        `;
                        loginUrlContainer.appendChild(btn);
                    } else {
                        existingBtn.href = url;
                    }
                } else if (existingBtn) {
                    existingBtn.remove();
                }
            };
            
            loginUrlInput.addEventListener('input', updateLinkButton);
            loginUrlInput.addEventListener('blur', updateLinkButton);
            
            // Inicializar si ya hay un valor
            if (loginUrlInput.value) {
                updateLinkButton();
            }
        }

        document.getElementById('licenseForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            if (data.quantity) data.quantity = parseInt(data.quantity);
            if (data.cost) data.cost = parseFloat(data.cost);
            
            // Manejar checkbox de facturación
            data.isBilling = document.getElementById('isBilling')?.checked || false;
            
            // Validar y formatear terminación de tarjeta (solo números, máximo 4 dígitos)
            if (data.cardLastFour) {
                data.cardLastFour = data.cardLastFour.replace(/\D/g, '').substring(0, 4);
            }
            
            if (data.id) {
                const existing = this.license;
                if (existing) Object.assign(existing, data);
                await Store.saveLicense(existing || data);
            } else {
                delete data.id;
                await Store.saveLicense(data);
            }

            document.getElementById('licenseModal').remove();
            await this.loadData();
            this.render();
            this.showToast('Licencia actualizada', 'success');
        });
    },

    renderAssignmentsTable() {
        if (this.filteredAssignments.length === 0) {
            return `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                        ${this.activeAssignments.length === 0 
                            ? 'No hay empleados asignados a esta licencia' 
                            : 'No se encontraron empleados que coincidan con la búsqueda'}
                    </td>
                </tr>
            `;
        }

        return this.filteredAssignments.map(a => {
            const employee = this.employees.find(e => e.id === a.employeeId);
            if (!employee) return '';
            
            const initials = `${employee.name?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}`.toUpperCase();
            
            return `
                <tr>
                    <td>
                        <div class="employee-cell">
                            <div class="employee-avatar">${initials}</div>
                            <div class="employee-info">
                                <div class="employee-name">${this.escapeHtml(employee.name || '')} ${this.escapeHtml(employee.lastName || '')}</div>
                                <div class="employee-department">${this.escapeHtml(employee.email || '')}</div>
                            </div>
                        </div>
                    </td>
                    <td style="font-family: monospace;">${this.escapeHtml(employee.employeeNumber || '-')}</td>
                    <td>${this.formatDate(a.startDate)}</td>
                    <td>${this.escapeHtml(a.assignedBy || 'Sistema')}</td>
                    <td>
                        <button class="btn-icon sm btn-danger" onclick="LicenseDetailModule.confirmUnassign('${a.employeeId}')" title="Desasignar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        }).filter(row => row !== '').join('');
    },

    filterAssignments(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const clearBtn = document.getElementById('clearSearchBtn');
        
        // Mostrar/ocultar botón de limpiar
        if (clearBtn) {
            clearBtn.style.display = term ? 'block' : 'none';
        }
        
        if (!term) {
            this.filteredAssignments = [...this.activeAssignments];
        } else {
            this.filteredAssignments = this.activeAssignments.filter(a => {
                const employee = this.employees.find(e => e.id === a.employeeId);
                if (!employee) return false;
                
                const name = `${employee.name || ''} ${employee.lastName || ''}`.toLowerCase();
                const email = (employee.email || '').toLowerCase();
                const employeeNumber = (employee.employeeNumber || '').toLowerCase();
                const assignedBy = (a.assignedBy || '').toLowerCase();
                
                return name.includes(term) || 
                       email.includes(term) || 
                       employeeNumber.includes(term) ||
                       assignedBy.includes(term);
            });
        }
        
        // Actualizar la tabla
        const tbody = document.getElementById('assignmentsTableBody');
        if (tbody) {
            tbody.innerHTML = this.renderAssignmentsTable();
        }
        
        // Actualizar contador si existe
        const sectionTitle = document.querySelector('.section-title');
        if (sectionTitle) {
            const totalCount = this.activeAssignments.length;
            const filteredCount = this.filteredAssignments.length;
            const countText = term && filteredCount !== totalCount 
                ? `Empleados con esta Licencia (${filteredCount} de ${totalCount})`
                : `Empleados con esta Licencia (${totalCount})`;
            sectionTitle.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
                ${countText}
            `;
        }
    },

    clearSearch() {
        const searchInput = document.getElementById('assignmentsSearchInput');
        if (searchInput) {
            searchInput.value = '';
            this.filterAssignments('');
        }
    },

    bindEvents() {
        // Eventos adicionales si son necesarios
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

    getPeriodicityLabel(periodicity) {
        const labels = {
            'monthly': 'Mensual',
            'quarterly': 'Trimestral',
            'semiannual': 'Semestral',
            'annual': 'Anual',
            'one-time': 'Pago Único'
        };
        return labels[periodicity] || periodicity;
    },

    showError(message) {
        const container = document.getElementById('licenseDetailContent');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-tertiary);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 1rem; opacity: 0.5;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    <p>${this.escapeHtml(message)}</p>
                    <button class="btn btn-primary" onclick="window.location.href='licenses.html'" style="margin-top: 1rem;">
                        Volver a Licencias
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
    setTimeout(() => LicenseDetailModule.init(), 100);
});

window.LicenseDetailModule = LicenseDetailModule;

