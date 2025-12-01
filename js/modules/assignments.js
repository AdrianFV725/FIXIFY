// ========================================
// ASSIGNMENTS MODULE
// ========================================

const AssignmentsModule = {
    employees: [],
    machines: [],
    licenses: [],

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
            this.employees = await Store.getEmployees() || [];
            this.machines = await Store.getMachines() || [];
            this.licenses = await Store.getLicenses() || [];
        } catch (e) {
            console.error('Error cargando datos:', e);
        }
    },

    renderContent() {
        const container = document.querySelector('.page-content');
        if (!container) return;

        const assignedMachines = this.machines.filter(m => m.assignedTo);
        const availableMachines = this.machines.filter(m => !m.assignedTo && m.status === 'available');

        container.innerHTML = `
            <div class="tabs" style="display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid var(--border-color);">
                <button class="tab-btn active" data-tab="machines" style="padding: 1rem 1.5rem; background: none; border: none; border-bottom: 2px solid var(--accent-primary); color: var(--text-primary); font-weight: 500; cursor: pointer;">Asignar Maquinas</button>
                <button class="tab-btn" data-tab="licenses" style="padding: 1rem 1.5rem; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-secondary); font-weight: 500; cursor: pointer;">Asignar Licencias</button>
            </div>

            <div id="machinesTab" class="tab-content">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                    <!-- Maquinas disponibles -->
                    <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem;">
                        <h3 style="margin-bottom: 1rem; font-size: 1rem;">Maquinas Disponibles (${availableMachines.length})</h3>
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${availableMachines.length === 0 ? `
                                <p style="color: var(--text-tertiary); text-align: center; padding: 2rem;">No hay maquinas disponibles</p>
                            ` : availableMachines.map(m => `
                                <div class="assignment-item" data-machine-id="${m.id}" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer; transition: background 0.2s;">
                                    <div style="width: 40px; height: 40px; background: var(--bg-tertiary); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 500;">${this.escapeHtml(m.name)}</div>
                                        <div style="font-size: 0.75rem; color: var(--text-tertiary);">${m.serialNumber}</div>
                                    </div>
                                    <button class="btn btn-sm btn-primary" onclick="AssignmentsModule.showAssignModal('machine', '${m.id}')">Asignar</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Maquinas asignadas -->
                    <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem;">
                        <h3 style="margin-bottom: 1rem; font-size: 1rem;">Maquinas Asignadas (${assignedMachines.length})</h3>
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${assignedMachines.length === 0 ? `
                                <p style="color: var(--text-tertiary); text-align: center; padding: 2rem;">No hay maquinas asignadas</p>
                            ` : assignedMachines.map(m => {
                                const employee = this.employees.find(e => e.id === m.assignedTo);
                                return `
                                    <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.5rem;">
                                        <div style="width: 40px; height: 40px; background: rgba(34, 197, 94, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #22c55e;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                        </div>
                                        <div style="flex: 1;">
                                            <div style="font-weight: 500;">${this.escapeHtml(m.name)}</div>
                                            <div style="font-size: 0.75rem; color: var(--text-tertiary);">Asignada a: ${employee ? `${employee.name} ${employee.lastName || ''}` : 'Desconocido'}</div>
                                        </div>
                                        <button class="btn btn-sm btn-secondary" onclick="AssignmentsModule.unassignMachine('${m.id}')">Desasignar</button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <div id="licensesTab" class="tab-content" style="display: none;">
                <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem;">
                    <h3 style="margin-bottom: 1rem; font-size: 1rem;">Licencias Disponibles</h3>
                    <div style="max-height: 500px; overflow-y: auto;">
                        ${this.licenses.length === 0 ? `
                            <p style="color: var(--text-tertiary); text-align: center; padding: 2rem;">No hay licencias registradas</p>
                        ` : this.licenses.map(l => `
                            <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.5rem;">
                                <div style="width: 40px; height: 40px; background: rgba(168, 85, 247, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #a855f7;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 500;">${this.escapeHtml(l.software)}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-tertiary);">Disponibles: ${(l.quantity || 0) - (l.assignedCount || 0)} de ${l.quantity || 0}</div>
                                </div>
                                <button class="btn btn-sm btn-primary" onclick="AssignmentsModule.showAssignModal('license', '${l.id}')" ${(l.assignedCount || 0) >= (l.quantity || 0) ? 'disabled' : ''}>Asignar</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    bindEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.borderBottomColor = 'transparent';
                    b.style.color = 'var(--text-secondary)';
                });
                btn.classList.add('active');
                btn.style.borderBottomColor = 'var(--accent-primary)';
                btn.style.color = 'var(--text-primary)';

                const tab = btn.dataset.tab;
                document.getElementById('machinesTab').style.display = tab === 'machines' ? 'block' : 'none';
                document.getElementById('licensesTab').style.display = tab === 'licenses' ? 'block' : 'none';
            });
        });
    },

    showAssignModal(type, itemId) {
        const item = type === 'machine' 
            ? this.machines.find(m => m.id === itemId)
            : this.licenses.find(l => l.id === itemId);

        if (!item) return;

        const modalHtml = `
            <div class="modal-overlay active" id="assignModal">
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2>Asignar ${type === 'machine' ? 'Maquina' : 'Licencia'}</h2>
                        <button class="modal-close" onclick="document.getElementById('assignModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 1rem;">
                            <strong>${type === 'machine' ? item.name : item.software}</strong>
                        </p>
                        <div class="form-group">
                            <label>Seleccionar Empleado *</label>
                            <select id="employeeSelect" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                <option value="">-- Seleccionar --</option>
                                ${this.employees.filter(e => e.status === 'active').map(e => `
                                    <option value="${e.id}">${e.name} ${e.lastName || ''}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                        <button class="btn btn-secondary" onclick="document.getElementById('assignModal').remove()">Cancelar</button>
                        <button class="btn btn-primary" onclick="AssignmentsModule.confirmAssign('${type}', '${itemId}')">Asignar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async confirmAssign(type, itemId) {
        const employeeId = document.getElementById('employeeSelect').value;
        if (!employeeId) {
            alert('Selecciona un empleado');
            return;
        }

        try {
            if (type === 'machine') {
                await Store.assignMachineToEmployee(itemId, employeeId);
            } else {
                await Store.assignLicenseToEmployee(itemId, employeeId);
            }

            document.getElementById('assignModal').remove();
            await this.loadData();
            this.renderContent();
            this.bindEvents();
            this.showToast('Asignacion realizada correctamente');
        } catch (e) {
            alert(e.message || 'Error al realizar la asignacion');
        }
    },

    async unassignMachine(machineId) {
        if (confirm('¿Estas seguro de desasignar esta maquina?')) {
            await Store.unassignMachine(machineId);
            await this.loadData();
            this.renderContent();
            this.bindEvents();
            this.showToast('Maquina desasignada');
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
    setTimeout(() => AssignmentsModule.init(), 100);
});

window.AssignmentsModule = AssignmentsModule;
