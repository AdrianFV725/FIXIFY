// ========================================
// EMPLOYEES MODULE
// ========================================

const EmployeesModule = {
    employees: [],
    filteredEmployees: [],
    departments: [],

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
            this.filteredEmployees = [...this.employees];
        } catch (e) {
            console.error('Error cargando empleados:', e);
            this.employees = [];
            this.filteredEmployees = [];
            this.departments = [];
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
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                </select>
            </div>
            <button class="filter-btn" id="clearFilters">Limpiar</button>
        `;
    },

    renderTable() {
        const container = document.querySelector('.data-table-container') || document.querySelector('.page-content');
        if (!container) return;

        const statusBadge = (status) => {
            const config = {
                active: { label: 'Activo', class: 'badge-active' },
                inactive: { label: 'Inactivo', class: 'badge-inactive' }
            };
            const c = config[status] || { label: status || '-', class: 'badge' };
            return `<span class="badge ${c.class}">${c.label}</span>`;
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
                                    <option value="active" ${employee?.status === 'active' ? 'selected' : ''}>Activo</option>
                                    <option value="inactive" ${employee?.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
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

    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #22c55e; color: white; padding: 1rem 1.5rem; border-radius: 8px; z-index: 9999;';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => EmployeesModule.init(), 100);
});

window.EmployeesModule = EmployeesModule;
