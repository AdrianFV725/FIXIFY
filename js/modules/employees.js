// ========================================
// EMPLOYEES MODULE
// Gestion de empleados
// ========================================

const EmployeesModule = {
    table: null,

    // ========================================
    // INICIALIZACION
    // ========================================

    init() {
        if (!Auth.requireAuth()) return;

        this.renderStats();
        this.renderFilters();
        this.initTable();
        this.bindEvents();
    },

    // ========================================
    // ESTADISTICAS
    // ========================================

    renderStats() {
        const container = document.getElementById('employeeStats');
        if (!container) return;

        const employees = Store.getEmployees();
        const stats = {
            total: employees.length,
            active: employees.filter(e => e.status === 'active').length,
            withMachine: employees.filter(e => Store.getMachinesByEmployee(e.id).length > 0).length
        };

        container.innerHTML = `
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(168, 85, 247, 0.1); color: #a855f7;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.total}</span>
                    <span class="mini-stat-label">Total Empleados</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #22c55e;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.active}</span>
                    <span class="mini-stat-label">Activos</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.withMachine}</span>
                    <span class="mini-stat-label">Con Equipo Asignado</span>
                </div>
            </div>
        `;
    },

    // ========================================
    // FILTROS
    // ========================================

    renderFilters() {
        const container = document.getElementById('filtersBar');
        if (!container) return;

        const departments = Store.getDepartments();

        container.innerHTML = `
            <div class="filter-group">
                <input type="text" class="filter-input" id="searchInput" placeholder="Buscar por nombre, correo, numero...">
            </div>
            <div class="filter-group">
                <label class="filter-label">Departamento:</label>
                <select class="filter-select" id="departmentFilter">
                    <option value="">Todos</option>
                    ${departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Estado:</label>
                <select class="filter-select" id="statusFilter">
                    <option value="">Todos</option>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                </select>
            </div>
            <button class="filter-btn" id="clearFilters">Limpiar</button>
        `;
    },

    // ========================================
    // TABLA
    // ========================================

    initTable() {
        const container = document.querySelector('.data-table-container') || document.querySelector('.page-content');
        if (!container) return;

        if (!document.getElementById('employeesTableContainer')) {
            const tableContainer = document.createElement('div');
            tableContainer.id = 'employeesTableContainer';
            container.appendChild(tableContainer);
        }

        const departments = Store.getDepartments();

        this.table = new DataTable({
            container: document.getElementById('employeesTableContainer'),
            columns: [
                { key: 'employeeNumber', label: 'No. Empleado', className: 'cell-id' },
                { 
                    key: 'name', 
                    label: 'Nombre', 
                    className: 'cell-primary',
                    render: (v, row) => `${v} ${row.lastName || ''}`
                },
                { key: 'email', label: 'Correo' },
                { 
                    key: 'department', 
                    label: 'Departamento',
                    render: (v) => {
                        const dept = departments.find(d => d.id === v);
                        return dept ? dept.name : '-';
                    }
                },
                { key: 'position', label: 'Puesto' },
                {
                    key: 'status',
                    label: 'Estado',
                    render: TableActions.createStatusBadge({
                        active: { label: 'Activo', class: 'badge-active' },
                        inactive: { label: 'Inactivo', class: 'badge-inactive' }
                    })
                },
                {
                    key: 'id',
                    label: 'Activos',
                    render: (id) => {
                        const machines = Store.getMachinesByEmployee(id).length;
                        const licenses = Store.getLicensesByEmployee(id).length;
                        return `${machines} / ${licenses}`;
                    }
                },
                TableActions.createActionsColumn(['view', 'edit', 'delete'])
            ],
            data: Store.getEmployees(),
            searchFields: ['name', 'lastName', 'email', 'employeeNumber', 'position'],
            perPage: 10,
            emptyMessage: 'No hay empleados registrados',
            onRowClick: (row) => this.viewEmployee(row.id),
            onAction: (action, row) => this.handleAction(action, row)
        });
    },

    // ========================================
    // EVENTOS
    // ========================================

    bindEvents() {
        // Busqueda
        document.getElementById('searchInput')?.addEventListener('input', Utils.debounce((e) => {
            this.table?.search(e.target.value);
        }, 300));

        // Filtros
        ['departmentFilter', 'statusFilter'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.applyFilters());
        });

        // Limpiar filtros
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('departmentFilter').value = '';
            document.getElementById('statusFilter').value = '';
            this.table?.setData(Store.getEmployees());
        });

        // Nuevo empleado
        document.getElementById('newEmployeeBtn')?.addEventListener('click', () => {
            this.openEmployeeForm();
        });

        // Importar CSV
        document.getElementById('importBtn')?.addEventListener('click', () => {
            this.importEmployees();
        });
    },

    applyFilters() {
        const filters = {
            department: document.getElementById('departmentFilter')?.value,
            status: document.getElementById('statusFilter')?.value
        };
        this.table?.filter(filters);
    },

    // ========================================
    // ACCIONES
    // ========================================

    handleAction(action, employee) {
        switch (action) {
            case 'view':
                this.viewEmployee(employee.id);
                break;
            case 'edit':
                this.openEmployeeForm(employee);
                break;
            case 'delete':
                this.deleteEmployee(employee);
                break;
        }
    },

    // ========================================
    // FORMULARIO
    // ========================================

    async openEmployeeForm(employee = null) {
        const isEdit = !!employee;
        const departments = Store.getDepartments();

        const fields = [
            { name: 'employeeNumber', label: 'Numero de Empleado', type: 'text', placeholder: 'Ej: EMP001' },
            { name: 'name', label: 'Nombre(s)', type: 'text', required: true, placeholder: 'Nombre(s)' },
            { name: 'lastName', label: 'Apellidos', type: 'text', required: true, placeholder: 'Apellido Paterno Materno' },
            { name: 'email', label: 'Correo Corporativo', type: 'email', required: true, placeholder: 'correo@empresa.com' },
            { name: 'phone', label: 'Telefono', type: 'text', placeholder: '55 1234 5678' },
            {
                name: 'department',
                label: 'Departamento',
                type: 'select',
                required: true,
                options: departments.map(d => ({ value: d.id, label: d.name }))
            },
            { name: 'position', label: 'Puesto', type: 'text', required: true, placeholder: 'Ej: Desarrollador Senior' },
            { name: 'startDate', label: 'Fecha de Ingreso', type: 'date' },
            {
                name: 'status',
                label: 'Estado',
                type: 'select',
                required: true,
                options: [
                    { value: 'active', label: 'Activo' },
                    { value: 'inactive', label: 'Inactivo' }
                ]
            },
            { name: 'notes', label: 'Notas', type: 'textarea', fullWidth: true, rows: 2 }
        ];

        const result = await Modal.form({
            title: isEdit ? 'Editar Empleado' : 'Nuevo Empleado',
            fields,
            data: employee || { status: 'active' },
            submitText: isEdit ? 'Actualizar' : 'Registrar',
            size: 'lg'
        });

        if (result) {
            if (isEdit) result.id = employee.id;

            Store.saveEmployee(result);
            this.table?.setData(Store.getEmployees());
            this.renderStats();
            
            Toast.success(isEdit ? 'Empleado actualizado' : 'Empleado registrado correctamente');
        }
    },

    // ========================================
    // VER EMPLEADO
    // ========================================

    viewEmployee(employeeId) {
        const employee = Store.getEmployeeById(employeeId);
        if (!employee) return;

        const departments = Store.getDepartments();
        const dept = departments.find(d => d.id === employee.department);
        const machines = Store.getMachinesByEmployee(employeeId);
        const licenses = Store.getLicensesByEmployee(employeeId);
        const tickets = Store.getTickets().filter(t => t.requesterId === employeeId);

        Modal.open({
            title: `${employee.name} ${employee.lastName || ''}`,
            size: 'xl',
            content: `
                <div class="employee-detail">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Numero de Empleado</label>
                            <p style="font-weight: 500;">${employee.employeeNumber || '-'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Correo</label>
                            <p style="font-weight: 500;">${employee.email}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Departamento</label>
                            <p style="font-weight: 500;">${dept ? dept.name : '-'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Puesto</label>
                            <p style="font-weight: 500;">${employee.position || '-'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Estado</label>
                            <p>${TableActions.createStatusBadge({
                                active: { label: 'Activo', class: 'badge-active' },
                                inactive: { label: 'Inactivo', class: 'badge-inactive' }
                            })(employee.status)}</p>
                        </div>
                        ${employee.startDate ? `
                            <div>
                                <label style="font-size: 0.75rem; color: var(--text-tertiary);">Fecha de Ingreso</label>
                                <p style="font-weight: 500;">${Utils.formatDate(employee.startDate)}</p>
                            </div>
                        ` : ''}
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1.5rem;">
                        <div>
                            <h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">Maquinas Asignadas (${machines.length})</h4>
                            ${machines.length === 0 ? '<p class="text-muted" style="font-size: 0.875rem;">Sin maquinas asignadas</p>' : `
                                <div style="max-height: 150px; overflow-y: auto;">
                                    ${machines.map(m => `
                                        <div style="padding: 0.5rem; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 0.5rem; font-size: 0.875rem;">
                                            <strong>${m.name}</strong>
                                            <span style="color: var(--text-tertiary); display: block; font-size: 0.75rem;">${m.serialNumber}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </div>

                        <div>
                            <h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">Licencias Asignadas (${licenses.length})</h4>
                            ${licenses.length === 0 ? '<p class="text-muted" style="font-size: 0.875rem;">Sin licencias asignadas</p>' : `
                                <div style="max-height: 150px; overflow-y: auto;">
                                    ${licenses.map(l => `
                                        <div style="padding: 0.5rem; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 0.5rem; font-size: 0.875rem;">
                                            <strong>${l.software}</strong>
                                            ${l.expirationDate ? `<span style="color: var(--text-tertiary); display: block; font-size: 0.75rem;">Vence: ${Utils.formatDate(l.expirationDate)}</span>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </div>
                    </div>

                    ${tickets.length > 0 ? `
                        <div style="margin-top: 1.5rem;">
                            <h4 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem;">Tickets Creados (${tickets.length})</h4>
                            <div style="max-height: 150px; overflow-y: auto;">
                                ${tickets.slice(0, 5).map(t => `
                                    <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); font-size: 0.875rem;">
                                        <span style="font-family: monospace; color: var(--text-tertiary);">${t.folio}</span>
                                        <span> - ${Utils.escapeHtml(t.title)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `,
            buttons: [
                { label: 'Cerrar', action: 'close' },
                { label: 'Editar', action: 'edit', variant: 'btn-primary' }
            ]
        });

        Modal.getActiveModal()?.addEventListener('modal-action', (e) => {
            if (e.detail.action === 'edit') {
                Modal.close();
                this.openEmployeeForm(employee);
            }
        });
    },

    // ========================================
    // ELIMINAR
    // ========================================

    async deleteEmployee(employee) {
        const confirmed = await Modal.confirmDelete(`${employee.name} ${employee.lastName || ''}`);
        
        if (confirmed) {
            Store.deleteEmployee(employee.id);
            this.table?.setData(Store.getEmployees());
            this.renderStats();
            Toast.success('Empleado eliminado');
        }
    },

    // ========================================
    // IMPORTAR
    // ========================================

    importEmployees() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const data = await Utils.importFromCSV(file);
                let imported = 0;

                data.forEach(row => {
                    if (row.name || row.nombre) {
                        Store.saveEmployee({
                            name: row.name || row.nombre,
                            lastName: row.lastname || row.apellidos || row.apellido,
                            email: row.email || row.correo,
                            department: row.department || row.departamento,
                            position: row.position || row.puesto,
                            status: 'active'
                        });
                        imported++;
                    }
                });

                this.table?.setData(Store.getEmployees());
                this.renderStats();
                Toast.success(`${imported} empleados importados`);
            } catch (error) {
                Toast.error('Error al importar el archivo');
            }
        };

        input.click();
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    EmployeesModule.init();
});

window.EmployeesModule = EmployeesModule;

