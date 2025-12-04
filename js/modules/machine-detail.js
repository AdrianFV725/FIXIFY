// ========================================
// MACHINE DETAIL MODULE
// Página de detalle y administración de máquina
// ========================================

const MachineDetailModule = {
    machine: null,
    employees: [],
    machineAssignments: [],
    machineId: null,

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        // Obtener ID de la URL
        const urlParams = new URLSearchParams(window.location.search);
        this.machineId = urlParams.get('id');

        if (!this.machineId) {
            this.showError('No se especificó una máquina');
            return;
        }

        await this.loadData();
        this.render();
        this.bindEvents();
    },

    async loadData() {
        try {
            const [machine, employees, assignments] = await Promise.all([
                Store.getMachineById(this.machineId),
                Store.getEmployees(),
                Store.getMachineAssignments()
            ]);

            if (!machine) {
                this.showError('Máquina no encontrada');
                return;
            }

            this.machine = machine;
            this.employees = employees || [];
            this.machineAssignments = assignments || [];
        } catch (e) {
            console.error('Error cargando datos:', e);
            this.showError('Error al cargar los datos de la máquina');
        }
    },

    render() {
        const container = document.getElementById('machineDetailContent');
        if (!container || !this.machine) return;

        const activeAssignments = this.machineAssignments.filter(a => 
            a.machineId === this.machineId && !a.endDate
        );
        const allAssignments = this.machineAssignments.filter(a => 
            a.machineId === this.machineId
        ).sort((a, b) => {
            const dateA = new Date(a.endDate || a.startDate);
            const dateB = new Date(b.endDate || b.startDate);
            return dateB - dateA;
        });

        const currentEmployee = activeAssignments.length > 0 
            ? this.employees.find(e => e.id === activeAssignments[0].employeeId)
            : null;

        container.innerHTML = `
            <!-- Información de la máquina -->
            <div class="machine-info-card">
                <div class="machine-info-header">
                    <div class="machine-title-section">
                        <h2 class="machine-title">${this.escapeHtml(this.machine.name || 'Sin nombre')}</h2>
                        <div class="machine-meta">
                            <div class="machine-meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                                    <line x1="8" y1="21" x2="16" y2="21"></line>
                                    <line x1="12" y1="17" x2="12" y2="21"></line>
                                </svg>
                                <span>Serie: ${this.escapeHtml(this.machine.serialNumber || 'N/A')}</span>
                            </div>
                            ${this.machine.model ? `
                                <div class="machine-meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="9" y1="9" x2="15" y2="15"></line>
                                        <line x1="15" y1="9" x2="9" y2="15"></line>
                                    </svg>
                                    <span>Modelo: ${this.escapeHtml(this.machine.model)}</span>
                                </div>
                            ` : ''}
                            ${this.machine.year ? `
                                <div class="machine-meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    <span>Año: ${this.machine.year}</span>
                                </div>
                            ` : ''}
                            ${this.machine.cost ? `
                                <div class="machine-meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                    </svg>
                                    <span>Costo: $${parseFloat(this.machine.cost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div>
                        <button class="btn btn-secondary" onclick="MachineDetailModule.editMachine()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Editar
                        </button>
                    </div>
                </div>

                <div class="machine-specs-grid">
                    <div class="machine-spec-card">
                        <div class="machine-spec-label">Estado</div>
                        <div class="machine-spec-value">
                            ${this.getStatusBadge(this.machine.status)}
                        </div>
                    </div>
                    <div class="machine-spec-card">
                        <div class="machine-spec-label">Sistema Operativo</div>
                        <div class="machine-spec-value">${this.getOSLabel(this.machine.operatingSystem)} ${this.machine.osVersion || ''}</div>
                    </div>
                    <div class="machine-spec-card">
                        <div class="machine-spec-label">RAM</div>
                        <div class="machine-spec-value">${this.machine.ram || '-'} ${this.machine.ramType ? `(${this.getRamTypeLabel(this.machine.ramType)})` : ''}</div>
                    </div>
                    <div class="machine-spec-card">
                        <div class="machine-spec-label">Almacenamiento</div>
                        <div class="machine-spec-value">${this.machine.disk || '-'} ${this.machine.diskType ? `(${this.getDiskTypeLabel(this.machine.diskType)})` : ''}</div>
                    </div>
                    ${this.machine.monitor ? `
                        <div class="machine-spec-card">
                            <div class="machine-spec-label">Monitor</div>
                            <div class="machine-spec-value">${this.escapeHtml(this.machine.monitor)}</div>
                        </div>
                    ` : ''}
                    ${this.machine.openCoreVersion ? `
                        <div class="machine-spec-card">
                            <div class="machine-spec-label">Versión OpenCore</div>
                            <div class="machine-spec-value">${this.escapeHtml(this.machine.openCoreVersion)}</div>
                        </div>
                    ` : ''}
                    <div class="machine-spec-card">
                        <div class="machine-spec-label">Asignada a</div>
                        <div class="machine-spec-value">
                            ${currentEmployee ? 
                                `${this.escapeHtml(currentEmployee.name)} ${this.escapeHtml(currentEmployee.lastName || '')}` : 
                                '<span style="color: var(--text-tertiary);">Disponible</span>'
                            }
                        </div>
                    </div>
                    <div class="machine-spec-card">
                        <div class="machine-spec-label">Total de Asignaciones</div>
                        <div class="machine-spec-value">${allAssignments.length}</div>
                    </div>
                </div>

                ${this.machine.comments ? `
                    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                        <div style="font-size: 0.85rem; color: var(--text-tertiary); margin-bottom: 0.5rem;">Comentarios</div>
                        <p style="margin: 0; white-space: pre-wrap; color: var(--text-secondary);">${this.escapeHtml(this.machine.comments)}</p>
                    </div>
                ` : ''}
            </div>

            <!-- Asignación actual -->
            <div class="assignments-section">
                <div class="section-header">
                    <h3 class="section-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        ${activeAssignments.length > 0 ? 'Asignación Actual' : 'Máquina Disponible'}
                    </h3>
                    ${activeAssignments.length === 0 ? `
                        <button class="btn btn-primary" onclick="MachineDetailModule.showAssignModal()" 
                                ${this.machine.status === 'maintenance' || this.machine.status === 'retired' ? 'disabled' : ''}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Asignar Máquina
                        </button>
                    ` : `
                        <button class="btn btn-danger" onclick="MachineDetailModule.confirmUnassign('${activeAssignments[0].employeeId}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Desasignar
                        </button>
                    `}
                </div>

                ${activeAssignments.length === 0 ? `
                    <div class="empty-assignments">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        <p>Esta máquina no está asignada actualmente</p>
                    </div>
                ` : activeAssignments.map(a => {
                    const employee = this.employees.find(e => e.id === a.employeeId);
                    if (!employee) return '';
                    
                    const initials = `${employee.name?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}`.toUpperCase();
                    
                    return `
                        <table class="assignments-table">
                            <thead>
                                <tr>
                                    <th>Empleado</th>
                                    <th>Número de Empleado</th>
                                    <th>Fecha de Asignación</th>
                                    <th>Asignado por</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <div class="employee-cell">
                                            <div class="employee-avatar">${initials}</div>
                                            <div class="employee-info">
                                                <div class="employee-name">${this.escapeHtml(employee.name)} ${this.escapeHtml(employee.lastName || '')}</div>
                                                <div class="employee-department">${this.escapeHtml(employee.email || '')}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="font-family: monospace;">${this.escapeHtml(employee.employeeNumber || '-')}</td>
                                    <td>${this.formatDate(a.startDate)}</td>
                                    <td>${this.escapeHtml(a.assignedBy || 'Sistema')}</td>
                                </tr>
                            </tbody>
                        </table>
                        ${a.notes ? `
                            <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;">
                                <div style="font-size: 0.85rem; color: var(--text-tertiary); margin-bottom: 0.5rem;">Notas de asignación</div>
                                <p style="margin: 0; color: var(--text-secondary);">${this.escapeHtml(a.notes)}</p>
                            </div>
                        ` : ''}
                    `;
                }).join('')}
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
        const activeEmployees = this.employees.filter(e => e.status === 'active');
        
        // Guardar empleados para usar en la búsqueda
        this._modalEmployees = activeEmployees;
        this._selectedEmployeeId = null;

        const modalHtml = `
            <div class="modal-overlay active" id="assignModal">
                <div class="modal" style="max-width: 450px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Asignar Máquina</h2>
                        <button class="modal-close" onclick="document.getElementById('assignModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="assign-resource-preview machine">
                            <div class="preview-icon machine">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                                    <line x1="8" y1="21" x2="16" y2="21"></line>
                                    <line x1="12" y1="17" x2="12" y2="21"></line>
                                </svg>
                            </div>
                            <div class="preview-info">
                                <div class="preview-name">${this.escapeHtml(this.machine.name)}</div>
                                <div class="preview-detail">${this.escapeHtml(this.machine.serialNumber || '')} - ${this.escapeHtml(this.machine.model || '')}</div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Seleccionar Empleado <span class="required">*</span></label>
                            ${activeEmployees.length === 0 ? `
                                <div class="form-hint" style="color: #f97316; margin-bottom: 0.5rem;">No hay empleados activos disponibles</div>
                            ` : `
                                <div style="position: relative;">
                                    <div class="search-group" style="margin-bottom: 0;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <path d="m21 21-4.35-4.35"></path>
                                        </svg>
                                        <input type="text" 
                                               id="employeeSearchInput" 
                                               class="form-input" 
                                               placeholder="Buscar empleado por nombre, apellido o número de empleado..."
                                               autocomplete="off"
                                               style="padding-left: 2.5rem;">
                                    </div>
                                    <div id="employeeDropdown" 
                                         class="employee-dropdown" 
                                         style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; margin-top: 0.25rem; max-height: 250px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                                        ${activeEmployees.map(e => `
                                            <div class="employee-option" 
                                                 data-employee-id="${e.id}"
                                                 data-employee-name="${this.escapeHtml(e.name)} ${this.escapeHtml(e.lastName || '')}"
                                                 style="padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid var(--border-color); transition: background-color 0.2s;"
                                                 onmouseover="this.style.backgroundColor='var(--hover-bg)'"
                                                 onmouseout="this.style.backgroundColor='transparent'"
                                                 onclick="MachineDetailModule.selectEmployee('${e.id}', '${this.escapeHtml(e.name)} ${this.escapeHtml(e.lastName || '')}${e.employeeNumber ? ` - #${e.employeeNumber}` : ''}')">
                                                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">
                                                    ${this.escapeHtml(e.name)} ${this.escapeHtml(e.lastName || '')}
                                                </div>
                                                <div style="font-size: 0.85rem; color: var(--text-secondary); font-family: monospace;">
                                                    ${e.employeeNumber ? `#${this.escapeHtml(e.employeeNumber)}` : 'Sin número'}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                <input type="hidden" id="employeeSelect" value="">
                                <div id="selectedEmployeeDisplay" style="margin-top: 0.5rem; padding: 0.75rem; background: var(--hover-bg); border-radius: 6px; display: none;">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <div>
                                            <div style="font-weight: 600; color: var(--text-primary);" id="selectedEmployeeName"></div>
                                            <div style="font-size: 0.85rem; color: var(--text-secondary); font-family: monospace;" id="selectedEmployeeNumber"></div>
                                        </div>
                                        <button type="button" 
                                                onclick="MachineDetailModule.clearEmployeeSelection()"
                                                style="background: none; border: none; color: var(--text-tertiary); cursor: pointer; padding: 0.25rem;"
                                                title="Limpiar selección">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            `}
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Notas (opcional)</label>
                            <textarea id="assignNotes" class="form-textarea" placeholder="Agregar notas sobre esta asignación..." rows="3"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('assignModal').remove()">Cancelar</button>
                        <button class="btn btn-primary" onclick="MachineDetailModule.confirmAssign()" ${activeEmployees.length === 0 ? 'disabled' : ''}>
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
        if (activeEmployees.length > 0) {
            this.bindEmployeeSearchEvents();
        }
    },
    
    bindEmployeeSearchEvents() {
        const searchInput = document.getElementById('employeeSearchInput');
        const dropdown = document.getElementById('employeeDropdown');
        
        if (!searchInput || !dropdown) return;
        
        // Mostrar dropdown al hacer focus
        searchInput.addEventListener('focus', () => {
            if (!this._selectedEmployeeId) {
                dropdown.style.display = 'block';
                this.filterEmployeeOptions('');
            }
        });
        
        // Filtrar mientras se escribe
        searchInput.addEventListener('input', (e) => {
            if (!this._selectedEmployeeId) {
                this.filterEmployeeOptions(e.target.value);
                dropdown.style.display = 'block';
            }
        });
        
        // Ocultar dropdown al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    },
    
    filterEmployeeOptions(query) {
        const dropdown = document.getElementById('employeeDropdown');
        if (!dropdown || !this._modalEmployees) return;
        
        const searchTerm = query.toLowerCase().trim();
        const options = dropdown.querySelectorAll('.employee-option');
        
        if (!searchTerm) {
            options.forEach(opt => opt.style.display = '');
            return;
        }
        
        options.forEach(option => {
            const name = option.dataset.employeeName.toLowerCase();
            const employeeNumber = option.querySelector('div:last-child')?.textContent.toLowerCase() || '';
            
            if (name.includes(searchTerm) || employeeNumber.includes(searchTerm)) {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        });
        
        // Mostrar mensaje si no hay resultados
        const visibleOptions = Array.from(options).filter(opt => opt.style.display !== 'none');
        let noResultsMsg = dropdown.querySelector('.no-results');
        
        if (visibleOptions.length === 0 && searchTerm) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.className = 'no-results';
                noResultsMsg.style.cssText = 'padding: 1rem; text-align: center; color: var(--text-tertiary);';
                noResultsMsg.textContent = 'No se encontraron empleados';
                dropdown.appendChild(noResultsMsg);
            }
            noResultsMsg.style.display = 'block';
        } else if (noResultsMsg) {
            noResultsMsg.style.display = 'none';
        }
    },
    
    selectEmployee(employeeId, displayText) {
        this._selectedEmployeeId = employeeId;
        document.getElementById('employeeSelect').value = employeeId;
        
        const searchInput = document.getElementById('employeeSearchInput');
        const dropdown = document.getElementById('employeeDropdown');
        const displayDiv = document.getElementById('selectedEmployeeDisplay');
        const nameDiv = document.getElementById('selectedEmployeeName');
        const numberDiv = document.getElementById('selectedEmployeeNumber');
        
        if (searchInput && dropdown && displayDiv && nameDiv && numberDiv) {
            // Ocultar dropdown y limpiar búsqueda
            dropdown.style.display = 'none';
            searchInput.value = '';
            
            // Mostrar empleado seleccionado
            const parts = displayText.split(' - ');
            nameDiv.textContent = parts[0];
            numberDiv.textContent = parts[1] ? `#${parts[1]}` : '';
            displayDiv.style.display = 'block';
        }
    },
    
    clearEmployeeSelection() {
        this._selectedEmployeeId = null;
        document.getElementById('employeeSelect').value = '';
        
        const searchInput = document.getElementById('employeeSearchInput');
        const dropdown = document.getElementById('employeeDropdown');
        const displayDiv = document.getElementById('selectedEmployeeDisplay');
        
        if (searchInput && dropdown && displayDiv) {
            searchInput.value = '';
            displayDiv.style.display = 'none';
            searchInput.focus();
            dropdown.style.display = 'block';
            this.filterEmployeeOptions('');
        }
    },

    async confirmAssign() {
        const employeeId = document.getElementById('employeeSelect')?.value || this._selectedEmployeeId;
        const notes = document.getElementById('assignNotes')?.value || '';

        if (!employeeId) {
            this.showToast('Selecciona un empleado', 'error');
            return;
        }

        try {
            await Store.assignMachineToEmployee(this.machineId, employeeId, notes);
            document.getElementById('assignModal')?.remove();
            this._selectedEmployeeId = null;
            this._modalEmployees = null;
            await this.loadData();
            this.render();
            this.showToast('Máquina asignada correctamente', 'success');
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
                            <p>¿Estás seguro de desasignar esta máquina?</p>
                            <div class="confirm-details" style="margin-top: 1rem;">
                                <strong>${this.escapeHtml(this.machine.name || 'Máquina')}</strong>
                                <span>de</span>
                                <strong>${employee ? `${employee.name} ${employee.lastName || ''}` : 'empleado'}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('confirmModal').remove()">Cancelar</button>
                        <button class="btn btn-danger" onclick="MachineDetailModule.executeUnassign()">
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

    async executeUnassign() {
        try {
            await Store.unassignMachine(this.machineId);
            document.getElementById('confirmModal')?.remove();
            await this.loadData();
            this.render();
            this.showToast('Máquina desasignada correctamente', 'success');
        } catch (e) {
            this.showToast(e.message || 'Error al desasignar', 'error');
        }
    },

    async editMachine() {
        // Usar el módulo de máquinas para editar
        if (window.MachinesModule) {
            window.location.href = `machines.html?edit=${this.machineId}`;
        } else {
            // Fallback: redirigir a la página de máquinas
            window.location.href = `machines.html`;
        }
    },

    bindEvents() {
        // Eventos adicionales si son necesarios
    },

    getStatusBadge(status) {
        const labels = {
            available: 'Disponible',
            assigned: 'Asignada',
            maintenance: 'Mantenimiento',
            retired: 'Dada de baja'
        };
        const colors = {
            available: '#22c55e',
            assigned: '#3b82f6',
            maintenance: '#f97316',
            retired: '#ef4444'
        };
        const label = labels[status] || status || '-';
        const color = colors[status] || '#6b7280';
        return `<span style="color: ${color}; font-weight: 600;">${label}</span>`;
    },

    getOSLabel(os) {
        const options = Store.getLocal(Store.KEYS.MACHINE_OPTIONS);
        if (options?.operatingSystem) {
            const opt = options.operatingSystem.find(o => o.value === os);
            if (opt) return opt.label;
        }
        const labels = { 
            macos: 'macOS', 
            windows: 'Windows', 
            linux: 'Linux', 
            chromeos: 'ChromeOS', 
            other: 'Otro' 
        };
        return labels[os] || os || '-';
    },

    getDiskTypeLabel(diskType) {
        const options = Store.getLocal(Store.KEYS.MACHINE_OPTIONS);
        if (options?.diskType) {
            const opt = options.diskType.find(o => o.value === diskType);
            if (opt) return opt.label;
        }
        const labels = { ssd: 'SSD', hdd: 'HDD', nvme: 'NVMe', hybrid: 'Híbrido' };
        return labels[diskType] || diskType || '-';
    },

    getRamTypeLabel(ramType) {
        const options = Store.getLocal(Store.KEYS.MACHINE_OPTIONS);
        if (options?.ramType) {
            const opt = options.ramType.find(o => o.value === ramType);
            if (opt) return opt.label;
        }
        const labels = { 
            ddr3: 'DDR3', 
            ddr4: 'DDR4', 
            ddr5: 'DDR5', 
            lpddr4: 'LPDDR4', 
            lpddr5: 'LPDDR5', 
            unified: 'Unificada' 
        };
        return labels[ramType] || ramType || '-';
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
        const container = document.getElementById('machineDetailContent');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-tertiary);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 1rem; opacity: 0.5;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    <p>${this.escapeHtml(message)}</p>
                    <button class="btn btn-primary" onclick="window.location.href='machines.html'" style="margin-top: 1rem;">
                        Volver a Máquinas
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
    setTimeout(() => MachineDetailModule.init(), 100);
});

window.MachineDetailModule = MachineDetailModule;

