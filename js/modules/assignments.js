// ========================================
// ASSIGNMENTS MODULE
// Centro de asignaciones de maquinas y licencias
// ========================================

const AssignmentsModule = {
    currentTab: 'machines',
    selectedEmployee: null,
    selectedResource: null,

    init() {
        if (!Auth.requireAuth()) return;
        this.bindEvents();
        this.renderEmployeesList();
        this.renderResourcesList();
        this.renderHistory();
    },

    bindEvents() {
        // Tabs
        document.querySelectorAll('.tab')?.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Busqueda de empleados
        document.getElementById('searchEmployee')?.addEventListener('input', Utils.debounce((e) => {
            this.renderEmployeesList(e.target.value);
        }, 300));

        document.getElementById('searchEmployeeLic')?.addEventListener('input', Utils.debounce((e) => {
            this.renderEmployeesList(e.target.value, 'licensesPanel');
        }, 300));

        // Busqueda de recursos
        document.getElementById('searchMachine')?.addEventListener('input', Utils.debounce((e) => {
            this.renderMachinesList(e.target.value);
        }, 300));

        document.getElementById('searchLicense')?.addEventListener('input', Utils.debounce((e) => {
            this.renderLicensesList(e.target.value);
        }, 300));

        // Botones de asignacion
        document.getElementById('assignMachineBtn')?.addEventListener('click', () => this.assignMachine());
        document.getElementById('unassignMachineBtn')?.addEventListener('click', () => this.unassignMachine());
        document.getElementById('assignLicenseBtn')?.addEventListener('click', () => this.assignLicense());
        document.getElementById('unassignLicenseBtn')?.addEventListener('click', () => this.unassignLicense());
    },

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        document.getElementById('machinesPanel')?.classList.toggle('hidden', tab !== 'machines');
        document.getElementById('licensesPanel')?.classList.toggle('hidden', tab !== 'licenses');
        
        this.selectedEmployee = null;
        this.selectedResource = null;
        this.updateButtons();

        if (tab === 'machines') {
            this.renderEmployeesList();
            this.renderMachinesList();
        } else {
            this.renderEmployeesList('', 'licensesPanel');
            this.renderLicensesList();
        }
    },

    renderEmployeesList(search = '', panel = 'machinesPanel') {
        const containerId = panel === 'machinesPanel' ? 'employeesList' : 'employeesListLic';
        const container = document.getElementById(containerId);
        if (!container) return;

        let employees = Store.getEmployees().filter(e => e.status === 'active');
        if (search) {
            employees = Utils.searchInFields(employees, search, ['name', 'lastName', 'email']);
        }

        container.innerHTML = employees.map(emp => {
            const machines = Store.getMachinesByEmployee(emp.id);
            const licenses = Store.getLicensesByEmployee(emp.id);
            
            return `
                <div class="selection-item" data-id="${emp.id}">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="avatar sm">${Utils.getInitials(`${emp.name} ${emp.lastName || ''}`)}</div>
                        <div>
                            <div style="font-weight: 500; font-size: 0.875rem;">${emp.name} ${emp.lastName || ''}</div>
                            <div style="font-size: 0.75rem; color: var(--text-tertiary);">
                                ${machines.length} maq. / ${licenses.length} lic.
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('') || '<p class="text-muted" style="padding: 1rem;">No hay empleados</p>';

        container.querySelectorAll('.selection-item').forEach(item => {
            item.addEventListener('click', () => this.selectEmployee(item.dataset.id, containerId));
        });
    },

    renderMachinesList(search = '') {
        const container = document.getElementById('machinesList');
        if (!container) return;

        let machines = Store.getMachines().filter(m => m.status === 'available' || m.status === 'assigned');
        if (search) {
            machines = Utils.searchInFields(machines, search, ['name', 'serialNumber', 'brand']);
        }

        container.innerHTML = machines.map(m => `
            <div class="selection-item ${m.assignedTo ? 'assigned' : ''}" data-id="${m.id}">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line></svg>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 500; font-size: 0.875rem;">${m.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-tertiary);">${m.serialNumber}</div>
                    </div>
                    <span class="badge ${m.assignedTo ? 'badge-open' : 'badge-active'}">${m.assignedTo ? 'Asignada' : 'Disponible'}</span>
                </div>
            </div>
        `).join('') || '<p class="text-muted" style="padding: 1rem;">No hay maquinas</p>';

        container.querySelectorAll('.selection-item').forEach(item => {
            item.addEventListener('click', () => this.selectResource(item.dataset.id, 'machine'));
        });
    },

    renderLicensesList(search = '') {
        const container = document.getElementById('licensesList');
        if (!container) return;

        let licenses = Store.getLicenses();
        if (search) {
            licenses = Utils.searchInFields(licenses, search, ['software', 'vendor']);
        }

        container.innerHTML = licenses.map(l => {
            const available = l.quantity ? l.quantity - (l.assignedCount || 0) : 'Ilimitadas';
            return `
                <div class="selection-item" data-id="${l.id}">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline></svg>
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500; font-size: 0.875rem;">${l.software}</div>
                            <div style="font-size: 0.75rem; color: var(--text-tertiary);">Disponibles: ${available}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('') || '<p class="text-muted" style="padding: 1rem;">No hay licencias</p>';

        container.querySelectorAll('.selection-item').forEach(item => {
            item.addEventListener('click', () => this.selectResource(item.dataset.id, 'license'));
        });
    },

    selectEmployee(id, containerId) {
        this.selectedEmployee = id;
        document.querySelectorAll(`#${containerId} .selection-item`).forEach(item => {
            item.classList.toggle('selected', item.dataset.id === id);
        });
        this.updateButtons();
    },

    selectResource(id, type) {
        this.selectedResource = { id, type };
        const containerId = type === 'machine' ? 'machinesList' : 'licensesList';
        document.querySelectorAll(`#${containerId} .selection-item`).forEach(item => {
            item.classList.toggle('selected', item.dataset.id === id);
        });
        this.updateButtons();
    },

    updateButtons() {
        const hasSelection = this.selectedEmployee && this.selectedResource;
        
        if (this.currentTab === 'machines') {
            const assignBtn = document.getElementById('assignMachineBtn');
            const unassignBtn = document.getElementById('unassignMachineBtn');
            if (assignBtn) assignBtn.disabled = !hasSelection;
            if (unassignBtn) unassignBtn.disabled = !hasSelection;
        } else {
            const assignBtn = document.getElementById('assignLicenseBtn');
            const unassignBtn = document.getElementById('unassignLicenseBtn');
            if (assignBtn) assignBtn.disabled = !hasSelection;
            if (unassignBtn) unassignBtn.disabled = !hasSelection;
        }
    },

    async assignMachine() {
        if (!this.selectedEmployee || !this.selectedResource) return;

        const employee = Store.getEmployeeById(this.selectedEmployee);
        const machine = Store.getMachineById(this.selectedResource.id);

        const confirmed = await Modal.confirm({
            title: 'Confirmar Asignacion',
            message: `Asignar <strong>${machine.name}</strong> a <strong>${employee.name} ${employee.lastName || ''}</strong>?`
        });

        if (confirmed) {
            Store.assignMachineToEmployee(this.selectedResource.id, this.selectedEmployee);
            this.renderMachinesList();
            this.renderHistory();
            Toast.success('Maquina asignada correctamente');
            this.selectedResource = null;
            this.updateButtons();
        }
    },

    async unassignMachine() {
        if (!this.selectedResource) return;

        const machine = Store.getMachineById(this.selectedResource.id);
        if (!machine.assignedTo) {
            Toast.warning('Esta maquina no esta asignada');
            return;
        }

        const confirmed = await Modal.confirm({
            title: 'Confirmar Desasignacion',
            message: `Desasignar <strong>${machine.name}</strong>?`
        });

        if (confirmed) {
            Store.unassignMachine(this.selectedResource.id);
            this.renderMachinesList();
            this.renderHistory();
            Toast.success('Maquina desasignada');
        }
    },

    async assignLicense() {
        if (!this.selectedEmployee || !this.selectedResource) return;

        try {
            Store.assignLicenseToEmployee(this.selectedResource.id, this.selectedEmployee);
            this.renderLicensesList();
            this.renderHistory();
            Toast.success('Licencia asignada correctamente');
            this.selectedResource = null;
            this.updateButtons();
        } catch (error) {
            Toast.error(error.message);
        }
    },

    async unassignLicense() {
        if (!this.selectedEmployee || !this.selectedResource) return;

        const confirmed = await Modal.confirm({
            title: 'Confirmar Desasignacion',
            message: 'Desasignar esta licencia del empleado seleccionado?'
        });

        if (confirmed) {
            Store.unassignLicense(this.selectedResource.id, this.selectedEmployee);
            this.renderLicensesList();
            this.renderHistory();
            Toast.success('Licencia desasignada');
        }
    },

    renderHistory() {
        const container = document.getElementById('assignmentsHistoryTable');
        if (!container) return;

        const machineAssignments = Store.getMachineAssignments().slice(-10).reverse();
        const licenseAssignments = Store.getLicenseAssignments().slice(-10).reverse();

        const all = [...machineAssignments.map(a => ({ ...a, type: 'machine' })),
                     ...licenseAssignments.map(a => ({ ...a, type: 'license' }))]
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
            .slice(0, 10);

        if (all.length === 0) {
            container.innerHTML = '<p class="text-muted" style="padding: 1rem;">No hay historial de asignaciones</p>';
            return;
        }

        container.innerHTML = `
            <thead><tr>
                <th>Fecha</th><th>Tipo</th><th>Recurso</th><th>Empleado</th><th>Accion</th>
            </tr></thead>
            <tbody>
                ${all.map(a => {
                    const resource = a.type === 'machine' 
                        ? Store.getMachineById(a.machineId) 
                        : Store.getLicenseById(a.licenseId);
                    const employee = Store.getEmployeeById(a.employeeId);
                    return `<tr>
                        <td>${Utils.formatDate(a.startDate)}</td>
                        <td>${a.type === 'machine' ? 'Maquina' : 'Licencia'}</td>
                        <td>${resource?.name || resource?.software || '-'}</td>
                        <td>${employee ? `${employee.name} ${employee.lastName || ''}` : '-'}</td>
                        <td><span class="badge badge-active">${a.endDate ? 'Desasignacion' : 'Asignacion'}</span></td>
                    </tr>`;
                }).join('')}
            </tbody>
        `;
    }
};

document.addEventListener('DOMContentLoaded', () => AssignmentsModule.init());
window.AssignmentsModule = AssignmentsModule;

