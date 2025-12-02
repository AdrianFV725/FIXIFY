// ========================================
// EMPLOYEES MODULE
// ========================================

const EmployeesModule = {
    employees: [],
    filteredEmployees: [],
    departments: [],
    employeeOptions: {},

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        await this.loadData();
        this.renderStats();
        this.renderFilters();
        this.renderTable();
        this.bindEvents();
    },

    async loadData() {
        try {
            this.employees = await Store.getEmployees() || [];
            this.departments = await Store.getDepartments() || [];
            this.employeeOptions = await Store.getEmployeeOptions() || {};
            this.filteredEmployees = [...this.employees];
        } catch (e) {
            console.error('Error cargando empleados:', e);
            this.employees = [];
            this.filteredEmployees = [];
            this.departments = [];
            this.employeeOptions = {};
        }
    },

    applyFilters() {
        const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
        const departmentFilter = document.getElementById('departmentFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';

        this.filteredEmployees = this.employees.filter(e => {
            const fullName = `${e.name || ''} ${e.lastName || ''}`.toLowerCase();
            const matchesSearch = !searchTerm || 
                fullName.includes(searchTerm) ||
                (e.email || '').toLowerCase().includes(searchTerm) ||
                (e.employeeNumber || '').toLowerCase().includes(searchTerm) ||
                (e.position || '').toLowerCase().includes(searchTerm);

            const matchesDepartment = !departmentFilter || e.department === departmentFilter;
            const matchesStatus = !statusFilter || e.status === statusFilter;

            return matchesSearch && matchesDepartment && matchesStatus;
        });

        this.renderTable();
    },

    renderStats() {
        const container = document.getElementById('employeeStats');
        if (!container) return;

        const stats = {
            total: this.employees.length,
            active: this.employees.filter(e => e.status === 'active').length,
            inactive: this.employees.filter(e => e.status === 'inactive').length
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
                <div class="mini-stat-icon" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.inactive}</span>
                    <span class="mini-stat-label">Inactivos</span>
                </div>
            </div>
        `;
    },

    renderFilters() {
        const container = document.getElementById('filtersBar');
        if (!container) return;

        container.innerHTML = `
            <div class="filter-group">
                <input type="text" class="filter-input" id="searchInput" placeholder="Buscar por nombre, correo...">
            </div>
            <div class="filter-group">
                <label class="filter-label">Departamento:</label>
                <select class="filter-select" id="departmentFilter">
                    <option value="">Todos</option>
                    ${this.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Estado:</label>
                <select class="filter-select" id="statusFilter">
                    <option value="">Todos</option>
                    ${(this.employeeOptions.status || []).map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
                </select>
            </div>
            <button class="filter-btn" id="clearFilters">Limpiar</button>
        `;
    },

    renderTable() {
        const container = document.querySelector('.data-table-container') || document.querySelector('.page-content');
        if (!container) return;

        const statusBadge = (status) => {
            const statusOptions = this.employeeOptions.status || [];
            const statusOption = statusOptions.find(s => s.value === status);
            
            if (statusOption) {
                const classMap = {
                    active: 'badge-active',
                    inactive: 'badge-inactive'
                };
                const badgeClass = classMap[status] || 'badge';
                return `<span class="badge ${badgeClass}">${statusOption.label}</span>`;
            }
            
            return `<span class="badge">${status || '-'}</span>`;
        };

        const getDeptName = (deptId) => {
            const dept = this.departments.find(d => d.id === deptId);
            return dept ? dept.name : '-';
        };

        let tableContainer = document.getElementById('employeesTableContainer');
        if (!tableContainer) {
            tableContainer = document.createElement('div');
            tableContainer.id = 'employeesTableContainer';
            container.appendChild(tableContainer);
        }

        tableContainer.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>No. Empleado</th>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Departamento</th>
                        <th>Puesto</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredEmployees.length === 0 ? `
                        <tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">${this.employees.length === 0 ? 'No hay empleados registrados' : 'No se encontraron resultados'}</td></tr>
                    ` : this.filteredEmployees.map(e => `
                        <tr data-id="${e.id}">
                            <td style="font-family: monospace;">${e.employeeNumber || '-'}</td>
                            <td>${this.escapeHtml(e.name || '')} ${this.escapeHtml(e.lastName || '')}</td>
                            <td>${e.email || '-'}</td>
                            <td>${getDeptName(e.department)}</td>
                            <td>${e.position || '-'}</td>
                            <td>${statusBadge(e.status)}</td>
                            <td>
                                <button class="btn-icon sm" onclick="EmployeesModule.editEmployee('${e.id}')" title="Editar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="btn-icon sm" onclick="EmployeesModule.deleteEmployee('${e.id}')" title="Eliminar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    getById(id) {
        return this.employees.find(e => e.id === id);
    },

    async editEmployee(id) {
        const employee = this.getById(id);
        if (employee) {
            await this.openForm(employee);
        } else {
            this.showToast('Error: Empleado no encontrado');
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    bindEvents() {
        document.getElementById('newEmployeeBtn')?.addEventListener('click', () => this.openForm());
        document.getElementById('optionsBtn')?.addEventListener('click', () => this.openOptionsManager());
        
        // Filtros en tiempo real
        document.getElementById('searchInput')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('departmentFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter')?.addEventListener('change', () => this.applyFilters());

        // Limpiar filtros
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('departmentFilter').value = '';
            document.getElementById('statusFilter').value = '';
            this.applyFilters();
        });
    },

    async openForm(employee = null) {
        const isEdit = !!employee;

        const modalHtml = `
            <div class="modal-overlay active" id="employeeModal">
                <div class="modal" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2>${isEdit ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
                        <button class="modal-close" onclick="document.getElementById('employeeModal').remove()">&times;</button>
                    </div>
                    <form id="employeeForm" class="modal-body">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label>No. Empleado</label>
                                <input type="text" name="employeeNumber" value="${employee?.employeeNumber || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Nombre(s) *</label>
                                <input type="text" name="name" required value="${employee?.name || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Apellidos *</label>
                                <input type="text" name="lastName" required value="${employee?.lastName || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Correo *</label>
                                <input type="email" name="email" required value="${employee?.email || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Departamento *</label>
                                <select name="department" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    ${this.departments.map(d => `<option value="${d.id}" ${employee?.department === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Puesto *</label>
                                <input type="text" name="position" required value="${employee?.position || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Estado</label>
                                <select name="status" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    ${(this.employeeOptions.status || []).map(s => `<option value="${s.value}" ${employee?.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <input type="hidden" name="id" value="${employee?.id || ''}">
                    </form>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('employeeModal').remove()">Cancelar</button>
                        <button type="submit" form="employeeForm" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Registrar'}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('employeeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            if (data.id) {
                const existing = this.getById(data.id);
                if (existing) Object.assign(existing, data);
                await Store.saveEmployee(existing || data);
            } else {
                delete data.id;
                await Store.saveEmployee(data);
            }

            document.getElementById('employeeModal').remove();
            await this.loadData();
            this.renderStats();
            this.renderTable();
            this.showToast(isEdit ? 'Empleado actualizado' : 'Empleado registrado');
        });
    },

    async openOptionsManager() {
        const departments = await Store.getDepartments();
        const options = await Store.getEmployeeOptions();
        const statusOptions = options.status || [];

        const modalHtml = `
            <div class="modal-overlay active" id="optionsModal">
                <div class="modal" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2>Gestionar Opciones de Empleados</h2>
                        <button class="modal-close" onclick="document.getElementById('optionsModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                        <!-- Departamentos -->
                        <div style="margin-bottom: 2rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <h3 style="margin: 0; color: var(--text-primary);">Departamentos</h3>
                                <button type="button" class="btn btn-primary sm" onclick="EmployeesModule.addDepartment()">Agregar</button>
                            </div>
                            <div id="departmentsList" style="display: flex; flex-direction: column; gap: 0.5rem;">
                                ${departments.map(d => `
                                    <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                                        <div style="width: 20px; height: 20px; border-radius: 4px; background: ${d.color || '#3b82f6'};"></div>
                                        <input type="text" value="${this.escapeHtml(d.name)}" data-id="${d.id}" data-field="name" style="flex: 1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--input-bg); color: var(--text-primary);" onchange="EmployeesModule.updateDepartment('${d.id}', 'name', this.value)">
                                        <input type="color" value="${d.color || '#3b82f6'}" data-id="${d.id}" data-field="color" style="width: 50px; height: 38px; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;" onchange="EmployeesModule.updateDepartment('${d.id}', 'color', this.value)">
                                        <button type="button" class="btn-icon sm" onclick="EmployeesModule.deleteDepartment('${d.id}')" title="Eliminar">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Estados -->
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <h3 style="margin: 0; color: var(--text-primary);">Estados</h3>
                                <button type="button" class="btn btn-primary sm" onclick="EmployeesModule.addStatusOption()">Agregar</button>
                            </div>
                            <div id="statusList" style="display: flex; flex-direction: column; gap: 0.5rem;">
                                ${statusOptions.map(s => `
                                    <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                                        <input type="text" value="${this.escapeHtml(s.value)}" data-value="${s.value}" data-field="value" placeholder="Valor (ej: active)" style="flex: 1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--input-bg); color: var(--text-primary);" onchange="EmployeesModule.updateStatusOption('${s.value}', 'value', this.value)">
                                        <input type="text" value="${this.escapeHtml(s.label)}" data-value="${s.value}" data-field="label" placeholder="Etiqueta (ej: Activo)" style="flex: 1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--input-bg); color: var(--text-primary);" onchange="EmployeesModule.updateStatusOption('${s.value}', 'label', this.value)">
                                        <button type="button" class="btn-icon sm" onclick="EmployeesModule.deleteStatusOption('${s.value}')" title="Eliminar">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('optionsModal').remove()">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async addDepartment() {
        const name = prompt('Nombre del departamento:');
        if (!name || !name.trim()) return;

        const department = {
            name: name.trim(),
            color: '#3b82f6'
        };

        await Store.saveDepartment(department);
        await this.loadData();
        document.getElementById('optionsModal').remove();
        await this.openOptionsManager();
        this.showToast('Departamento agregado');
    },

    async updateDepartment(id, field, value) {
        const departments = await Store.getDepartments();
        const department = departments.find(d => d.id === id);
        if (department) {
            department[field] = value;
            await Store.saveDepartment(department);
            await this.loadData();
        }
    },

    async deleteDepartment(id) {
        const confirmed = await Modal.confirmDelete('este departamento', 'departamento');
        if (confirmed) {
            await Store.deleteDepartment(id);
            await this.loadData();
            document.getElementById('optionsModal').remove();
            await this.openOptionsManager();
            this.showToast('Departamento eliminado');
        }
    },

    async addStatusOption() {
        const value = prompt('Valor del estado (ej: active, inactive, suspended):');
        if (!value || !value.trim()) return;

        const label = prompt('Etiqueta del estado (ej: Activo, Inactivo, Suspendido):');
        if (!label || !label.trim()) return;

        const option = {
            value: value.trim().toLowerCase(),
            label: label.trim()
        };

        await Store.addEmployeeOption('status', option);
        await this.loadData();
        document.getElementById('optionsModal').remove();
        await this.openOptionsManager();
        this.showToast('Estado agregado');
    },

    async updateStatusOption(oldValue, field, newValue) {
        const options = await Store.getEmployeeOptions();
        const statusOptions = options.status || [];
        const option = statusOptions.find(o => o.value === oldValue);
        
        if (option) {
            if (field === 'value') {
                // Si cambia el valor, necesitamos actualizar todos los empleados que usan el valor anterior
                const newOption = { ...option, value: newValue.trim().toLowerCase() };
                await Store.updateEmployeeOption('status', oldValue, newOption);
                
                // Actualizar empleados que usan este estado
                const employees = await Store.getEmployees();
                for (const emp of employees) {
                    if (emp.status === oldValue) {
                        emp.status = newOption.value;
                        await Store.saveEmployee(emp);
                    }
                }
            } else {
                option[field] = newValue.trim();
                await Store.updateEmployeeOption('status', oldValue, option);
            }
            
            await this.loadData();
        }
    },

    async deleteStatusOption(value) {
        // Verificar si hay empleados usando este estado
        const employees = await Store.getEmployees();
        const usingStatus = employees.filter(e => e.status === value);
        
        if (usingStatus.length > 0) {
            this.showToast(`No se puede eliminar: ${usingStatus.length} empleado(s) usan este estado`, 'error');
            return;
        }

        const confirmed = await Modal.confirmDelete('este estado', 'estado');
        if (confirmed) {
            await Store.removeEmployeeOption('status', value);
            await this.loadData();
            document.getElementById('optionsModal').remove();
            await this.openOptionsManager();
            this.showToast('Estado eliminado');
        }
    },

    async deleteEmployee(id) {
        const employee = this.getById(id);
        const name = employee ? `${employee.name} ${employee.lastName || ''}` : 'este empleado';
        
        const confirmed = await Modal.confirmDelete(name, 'empleado');
        if (confirmed) {
            await Store.deleteEmployee(id);
            await this.loadData();
            this.renderStats();
            this.renderTable();
            this.showToast('Empleado eliminado');
        }
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.textContent = message;
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f97316',
            info: '#3b82f6'
        };
        toast.style.cssText = `position: fixed; bottom: 20px; right: 20px; background: ${colors[type] || colors.success}; color: white; padding: 1rem 1.5rem; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => EmployeesModule.init(), 100);
});

window.EmployeesModule = EmployeesModule;
