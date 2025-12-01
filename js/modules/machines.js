// ========================================
// MACHINES MODULE
// Gestion de inventario de maquinas
// ========================================

const MachinesModule = {
    machines: [],

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
            this.machines = await Store.getMachines() || [];
        } catch (e) {
            console.error('Error cargando maquinas:', e);
            this.machines = [];
        }
    },

    renderStats() {
        const container = document.getElementById('machineStats');
        if (!container) return;

        const stats = {
            total: this.machines.length,
            assigned: this.machines.filter(m => m.assignedTo).length,
            available: this.machines.filter(m => !m.assignedTo && m.status !== 'maintenance').length,
            maintenance: this.machines.filter(m => m.status === 'maintenance').length
        };

        container.innerHTML = `
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.total}</span>
                    <span class="mini-stat-label">Total Maquinas</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #22c55e;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.assigned}</span>
                    <span class="mini-stat-label">Asignadas</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(249, 115, 22, 0.1); color: #f97316;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.available}</span>
                    <span class="mini-stat-label">Disponibles</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(168, 85, 247, 0.1); color: #a855f7;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.maintenance}</span>
                    <span class="mini-stat-label">Mantenimiento</span>
                </div>
            </div>
        `;
    },

    renderFilters() {
        const container = document.getElementById('filtersBar');
        if (!container) return;

        container.innerHTML = `
            <div class="filter-group">
                <input type="text" class="filter-input" id="searchInput" placeholder="Buscar por nombre, serie, marca...">
            </div>
            <div class="filter-group">
                <label class="filter-label">Tipo:</label>
                <select class="filter-select" id="typeFilter">
                    <option value="">Todos</option>
                    <option value="laptop">Laptop</option>
                    <option value="desktop">Desktop</option>
                    <option value="server">Servidor</option>
                    <option value="printer">Impresora</option>
                    <option value="other">Otro</option>
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Estado:</label>
                <select class="filter-select" id="statusFilter">
                    <option value="">Todos</option>
                    <option value="available">Disponible</option>
                    <option value="assigned">Asignada</option>
                    <option value="maintenance">Mantenimiento</option>
                    <option value="retired">Dada de baja</option>
                </select>
            </div>
            <button class="filter-btn" id="clearFilters">Limpiar</button>
        `;
    },

    renderTable() {
        const container = document.getElementById('tableView') || document.querySelector('.page-content');
        if (!container) return;

        const statusBadge = (status) => {
            const config = {
                available: { label: 'Disponible', class: 'badge-active' },
                assigned: { label: 'Asignada', class: 'badge-open' },
                maintenance: { label: 'Mantenimiento', class: 'badge-maintenance' },
                retired: { label: 'Baja', class: 'badge-inactive' }
            };
            const c = config[status] || { label: status || '-', class: 'badge' };
            return `<span class="badge ${c.class}">${c.label}</span>`;
        };

        const typeLabel = (type) => {
            const labels = { laptop: 'Laptop', desktop: 'Desktop', server: 'Servidor', printer: 'Impresora', other: 'Otro' };
            return labels[type] || type || '-';
        };

        let tableContainer = document.getElementById('machinesTableContainer');
        if (!tableContainer) {
            tableContainer = document.createElement('div');
            tableContainer.id = 'machinesTableContainer';
            container.appendChild(tableContainer);
        }

        tableContainer.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>No. Serie</th>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Marca</th>
                        <th>Modelo</th>
                        <th>Estado</th>
                        <th>Tickets</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.machines.length === 0 ? `
                        <tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">No hay maquinas registradas</td></tr>
                    ` : this.machines.map(m => `
                        <tr data-id="${m.id}">
                            <td style="font-family: monospace;">${m.serialNumber || '-'}</td>
                            <td>${this.escapeHtml(m.name || '')}</td>
                            <td>${typeLabel(m.type)}</td>
                            <td>${m.brand || '-'}</td>
                            <td>${m.model || '-'}</td>
                            <td>${statusBadge(m.status)}</td>
                            <td>${m.ticketCount || 0}</td>
                            <td>
                                <button class="btn-icon sm" onclick="MachinesModule.editMachine('${m.id}')" title="Editar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="btn-icon sm" onclick="MachinesModule.deleteMachine('${m.id}')" title="Eliminar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    getMachineById(id) {
        return this.machines.find(m => m.id === id);
    },

    async editMachine(id) {
        const machine = this.getMachineById(id);
        if (machine) {
            await this.openForm(machine);
        } else {
            this.showToast('Error: Maquina no encontrada');
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    bindEvents() {
        document.getElementById('newMachineBtn')?.addEventListener('click', () => this.openForm());
        
        document.getElementById('clearFilters')?.addEventListener('click', async () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('typeFilter').value = '';
            document.getElementById('statusFilter').value = '';
            await this.loadData();
            this.renderTable();
        });
    },

    async openForm(machine = null) {
        const isEdit = !!machine;

        const modalHtml = `
            <div class="modal-overlay active" id="machineModal">
                <div class="modal" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2>${isEdit ? 'Editar Maquina' : 'Nueva Maquina'}</h2>
                        <button class="modal-close" onclick="document.getElementById('machineModal').remove()">&times;</button>
                    </div>
                    <form id="machineForm" class="modal-body">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label>Numero de Serie *</label>
                                <input type="text" name="serialNumber" required value="${machine?.serialNumber || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Nombre *</label>
                                <input type="text" name="name" required value="${machine?.name || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Tipo *</label>
                                <select name="type" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    <option value="laptop" ${machine?.type === 'laptop' ? 'selected' : ''}>Laptop</option>
                                    <option value="desktop" ${machine?.type === 'desktop' ? 'selected' : ''}>Desktop</option>
                                    <option value="server" ${machine?.type === 'server' ? 'selected' : ''}>Servidor</option>
                                    <option value="printer" ${machine?.type === 'printer' ? 'selected' : ''}>Impresora</option>
                                    <option value="other" ${machine?.type === 'other' ? 'selected' : ''}>Otro</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Estado *</label>
                                <select name="status" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    <option value="available" ${machine?.status === 'available' ? 'selected' : ''}>Disponible</option>
                                    <option value="assigned" ${machine?.status === 'assigned' ? 'selected' : ''}>Asignada</option>
                                    <option value="maintenance" ${machine?.status === 'maintenance' ? 'selected' : ''}>Mantenimiento</option>
                                    <option value="retired" ${machine?.status === 'retired' ? 'selected' : ''}>Dada de Baja</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Marca</label>
                                <input type="text" name="brand" value="${machine?.brand || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Modelo</label>
                                <input type="text" name="model" value="${machine?.model || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                        </div>
                        <input type="hidden" name="id" value="${machine?.id || ''}">
                    </form>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('machineModal').remove()">Cancelar</button>
                        <button type="submit" form="machineForm" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Registrar'}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('machineForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            if (data.id) {
                const existing = this.getMachineById(data.id);
                if (existing) Object.assign(existing, data);
                await Store.saveMachine(existing || data);
            } else {
                delete data.id;
                await Store.saveMachine(data);
            }

            document.getElementById('machineModal').remove();
            await this.loadData();
            this.renderStats();
            this.renderTable();
            this.showToast(isEdit ? 'Maquina actualizada' : 'Maquina registrada');
        });
    },

    async deleteMachine(id) {
        if (confirm('¿Estas seguro de eliminar esta maquina?')) {
            await Store.deleteMachine(id);
            await this.loadData();
            this.renderStats();
            this.renderTable();
            this.showToast('Maquina eliminada');
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
    setTimeout(() => MachinesModule.init(), 100);
});

window.MachinesModule = MachinesModule;
