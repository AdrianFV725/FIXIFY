// ========================================
// MACHINES MODULE
// Gestion de inventario de maquinas
// ========================================

const MachinesModule = {
    machines: [],
    filteredMachines: [],
    currentView: 'table', // 'table' o 'cards'

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        await this.loadData();
        this.filteredMachines = [...this.machines];
        this.renderStats();
        this.renderFilters();
        this.renderTable();
        this.renderCards();
        this.bindEvents();
        this.updateViewVisibility();
    },

    async loadData() {
        try {
            this.machines = await Store.getMachines() || [];
            this.filteredMachines = [...this.machines];
        } catch (e) {
            console.error('Error cargando maquinas:', e);
            this.machines = [];
            this.filteredMachines = [];
        }
    },

    // ========================================
    // FILTROS
    // ========================================

    applyFilters() {
        const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
        const typeFilter = document.getElementById('typeFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';

        this.filteredMachines = this.machines.filter(m => {
            // Filtro de busqueda
            const matchesSearch = !searchTerm || 
                (m.name || '').toLowerCase().includes(searchTerm) ||
                (m.serialNumber || '').toLowerCase().includes(searchTerm) ||
                (m.brand || '').toLowerCase().includes(searchTerm) ||
                (m.model || '').toLowerCase().includes(searchTerm);

            // Filtro de tipo
            const matchesType = !typeFilter || m.type === typeFilter;

            // Filtro de estado
            const matchesStatus = !statusFilter || m.status === statusFilter;

            return matchesSearch && matchesType && matchesStatus;
        });

        this.renderTable();
        this.renderCards();
    },

    renderStats() {
        const container = document.getElementById('machineStats');
        if (!container) return;

        const stats = {
            total: this.machines.length,
            assigned: this.machines.filter(m => m.assignedTo || m.status === 'assigned').length,
            available: this.machines.filter(m => !m.assignedTo && m.status === 'available').length,
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

    // ========================================
    // HELPERS DE RENDERIZADO
    // ========================================

    getStatusBadge(status) {
        const config = {
            available: { label: 'Disponible', class: 'badge-active' },
            assigned: { label: 'Asignada', class: 'badge-open' },
            maintenance: { label: 'Mantenimiento', class: 'badge-maintenance' },
            retired: { label: 'Baja', class: 'badge-inactive' }
        };
        const c = config[status] || { label: status || '-', class: 'badge' };
        return `<span class="badge ${c.class}">${c.label}</span>`;
    },

    getTypeLabel(type) {
        const labels = { laptop: 'Laptop', desktop: 'Desktop', server: 'Servidor', printer: 'Impresora', other: 'Otro' };
        return labels[type] || type || '-';
    },

    getTypeIcon(type) {
        const icons = {
            laptop: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="2" y1="20" x2="22" y2="20"></line></svg>',
            desktop: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
            server: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"></rect><rect x="2" y="14" width="20" height="8" rx="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>',
            printer: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>',
            other: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>'
        };
        return icons[type] || icons.other;
    },

    // ========================================
    // VISTA DE TABLA
    // ========================================

    renderTable() {
        const table = document.getElementById('machinesTable');
        if (!table) return;

        table.innerHTML = `
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
                ${this.filteredMachines.length === 0 ? `
                    <tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                        ${this.machines.length === 0 ? 'No hay maquinas registradas' : 'No se encontraron resultados'}
                    </td></tr>
                ` : this.filteredMachines.map(m => `
                    <tr data-id="${m.id}">
                        <td style="font-family: monospace;">${m.serialNumber || '-'}</td>
                        <td>${this.escapeHtml(m.name || '')}</td>
                        <td>${this.getTypeLabel(m.type)}</td>
                        <td>${m.brand || '-'}</td>
                        <td>${m.model || '-'}</td>
                        <td>${this.getStatusBadge(m.status)}</td>
                        <td>${m.ticketCount || 0}</td>
                        <td class="cell-actions">
                            <button class="btn-icon btn-ghost sm" onclick="MachinesModule.editMachine('${m.id}')" title="Editar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn-icon btn-ghost sm" onclick="MachinesModule.deleteMachine('${m.id}')" title="Eliminar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
    },

    // ========================================
    // VISTA DE TARJETAS
    // ========================================

    renderCards() {
        const container = document.getElementById('cardsView');
        if (!container) return;

        if (this.filteredMachines.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                    </div>
                    <h3 class="empty-state-title">${this.machines.length === 0 ? 'No hay maquinas registradas' : 'No se encontraron resultados'}</h3>
                    <p class="empty-state-text">${this.machines.length === 0 ? 'Agrega una nueva maquina para comenzar' : 'Intenta con otros filtros'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredMachines.map(m => `
            <div class="card machine-card" data-id="${m.id}">
                <div class="card-header">
                    <div class="card-icon" style="background: ${this.getTypeColor(m.type)}20; color: ${this.getTypeColor(m.type)};">
                        ${this.getTypeIcon(m.type)}
                    </div>
                    ${this.getStatusBadge(m.status)}
                </div>
                <div class="card-body">
                    <h3 class="card-title">${this.escapeHtml(m.name || 'Sin nombre')}</h3>
                    <p class="card-subtitle">${m.brand || ''} ${m.model || ''}</p>
                    <div class="card-details">
                        <div class="card-detail">
                            <span class="detail-label">Serie:</span>
                            <span class="detail-value" style="font-family: monospace;">${m.serialNumber || '-'}</span>
                        </div>
                        <div class="card-detail">
                            <span class="detail-label">Tipo:</span>
                            <span class="detail-value">${this.getTypeLabel(m.type)}</span>
                        </div>
                        <div class="card-detail">
                            <span class="detail-label">Tickets:</span>
                            <span class="detail-value">${m.ticketCount || 0}</span>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-ghost btn-sm" onclick="MachinesModule.editMachine('${m.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Editar
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="MachinesModule.deleteMachine('${m.id}')" style="color: #ef4444;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    },

    getTypeColor(type) {
        const colors = {
            laptop: '#3b82f6',
            desktop: '#22c55e',
            server: '#a855f7',
            printer: '#f97316',
            other: '#6b7280'
        };
        return colors[type] || colors.other;
    },

    // ========================================
    // TOGGLE DE VISTAS
    // ========================================

    setView(view) {
        this.currentView = view;
        this.updateViewVisibility();
        this.updateViewToggleButtons();
    },

    updateViewVisibility() {
        const tableView = document.getElementById('tableView');
        const cardsView = document.getElementById('cardsView');

        if (tableView && cardsView) {
            if (this.currentView === 'table') {
                tableView.classList.remove('hidden');
                cardsView.classList.add('hidden');
            } else {
                tableView.classList.add('hidden');
                cardsView.classList.remove('hidden');
            }
        }
    },

    updateViewToggleButtons() {
        const viewToggle = document.getElementById('viewToggle');
        if (!viewToggle) return;

        const buttons = viewToggle.querySelectorAll('.view-btn');
        buttons.forEach(btn => {
            const view = btn.getAttribute('data-view');
            if (view === this.currentView) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    getMachineById(id) {
        return this.machines.find(m => m.id === id);
    },

    async editMachine(id) {
        const machine = this.getMachineById(id);
        if (machine) {
            await this.openForm(machine);
        } else {
            this.showToast('Error: Maquina no encontrada', 'error');
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    bindEvents() {
        // Boton nueva maquina
        document.getElementById('newMachineBtn')?.addEventListener('click', () => this.openForm());
        
        // Toggle de vistas
        const viewToggle = document.getElementById('viewToggle');
        if (viewToggle) {
            viewToggle.addEventListener('click', (e) => {
                const btn = e.target.closest('.view-btn');
                if (btn) {
                    const view = btn.getAttribute('data-view');
                    if (view) {
                        this.setView(view);
                    }
                }
            });
        }

        // Filtros en tiempo real
        document.getElementById('searchInput')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('typeFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter')?.addEventListener('change', () => this.applyFilters());

        // Limpiar filtros
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('typeFilter').value = '';
            document.getElementById('statusFilter').value = '';
            this.applyFilters();
        });

        // Boton exportar
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportMachines());
    },

    async openForm(machine = null) {
        const isEdit = !!machine;

        const modalHtml = `
            <div class="modal-overlay active" id="machineModal">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h2 class="modal-title">${isEdit ? 'Editar Maquina' : 'Nueva Maquina'}</h2>
                        <button class="modal-close" onclick="document.getElementById('machineModal').remove()">&times;</button>
                    </div>
                    <form id="machineForm" class="modal-body">
                        <div class="form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Numero de Serie <span class="required">*</span></label>
                                    <input type="text" name="serialNumber" required value="${machine?.serialNumber || ''}" class="form-input" placeholder="Ej: SN-001234">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Nombre <span class="required">*</span></label>
                                    <input type="text" name="name" required value="${this.escapeHtml(machine?.name || '')}" class="form-input" placeholder="Ej: MacBook Pro IT-01">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Tipo <span class="required">*</span></label>
                                    <select name="type" required class="form-select">
                                        <option value="">Seleccionar tipo</option>
                                        <option value="laptop" ${machine?.type === 'laptop' ? 'selected' : ''}>Laptop</option>
                                        <option value="desktop" ${machine?.type === 'desktop' ? 'selected' : ''}>Desktop</option>
                                        <option value="server" ${machine?.type === 'server' ? 'selected' : ''}>Servidor</option>
                                        <option value="printer" ${machine?.type === 'printer' ? 'selected' : ''}>Impresora</option>
                                        <option value="other" ${machine?.type === 'other' ? 'selected' : ''}>Otro</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Estado <span class="required">*</span></label>
                                    <select name="status" required class="form-select">
                                        <option value="available" ${machine?.status === 'available' || !machine ? 'selected' : ''}>Disponible</option>
                                        <option value="assigned" ${machine?.status === 'assigned' ? 'selected' : ''}>Asignada</option>
                                        <option value="maintenance" ${machine?.status === 'maintenance' ? 'selected' : ''}>Mantenimiento</option>
                                        <option value="retired" ${machine?.status === 'retired' ? 'selected' : ''}>Dada de Baja</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Marca</label>
                                    <input type="text" name="brand" value="${this.escapeHtml(machine?.brand || '')}" class="form-input" placeholder="Ej: Apple, Dell, HP">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Modelo</label>
                                    <input type="text" name="model" value="${this.escapeHtml(machine?.model || '')}" class="form-input" placeholder="Ej: MacBook Pro 16 2023">
                                </div>
                            </div>
                            <div class="form-group full-width">
                                <label class="form-label">Notas</label>
                                <textarea name="notes" class="form-textarea" placeholder="Notas adicionales sobre la maquina...">${this.escapeHtml(machine?.notes || '')}</textarea>
                            </div>
                        </div>
                        <input type="hidden" name="id" value="${machine?.id || ''}">
                    </form>
                    <div class="modal-footer">
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
            
            try {
                if (data.id) {
                    const existing = this.getMachineById(data.id);
                    if (existing) {
                        Object.assign(existing, data);
                        await Store.saveMachine(existing);
                    } else {
                        await Store.saveMachine(data);
                    }
                } else {
                    delete data.id;
                    await Store.saveMachine(data);
                }

                document.getElementById('machineModal').remove();
                await this.loadData();
                this.filteredMachines = [...this.machines];
                this.renderStats();
                this.applyFilters();
                this.showToast(isEdit ? 'Maquina actualizada correctamente' : 'Maquina registrada correctamente', 'success');
            } catch (error) {
                console.error('Error guardando maquina:', error);
                this.showToast('Error al guardar la maquina', 'error');
            }
        });
    },

    async deleteMachine(id) {
        const machine = this.getMachineById(id);
        const name = machine?.name || 'esta maquina';
        
        const confirmed = await Modal.confirmDelete(name, 'maquina');
        if (confirmed) {
            try {
                await Store.deleteMachine(id);
                await this.loadData();
                this.filteredMachines = [...this.machines];
                this.renderStats();
                this.applyFilters();
                this.showToast('Maquina eliminada correctamente', 'success');
            } catch (error) {
                console.error('Error eliminando maquina:', error);
                this.showToast('Error al eliminar la maquina', 'error');
            }
        }
    },

    // ========================================
    // EXPORTAR
    // ========================================

    exportMachines() {
        if (this.filteredMachines.length === 0) {
            this.showToast('No hay datos para exportar', 'warning');
            return;
        }

        const headers = ['No. Serie', 'Nombre', 'Tipo', 'Marca', 'Modelo', 'Estado', 'Tickets', 'Fecha Creacion'];
        const rows = this.filteredMachines.map(m => [
            m.serialNumber || '',
            m.name || '',
            this.getTypeLabel(m.type),
            m.brand || '',
            m.model || '',
            this.getStatusLabel(m.status),
            m.ticketCount || 0,
            m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `inventario_maquinas_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast('Archivo exportado correctamente', 'success');
    },

    getStatusLabel(status) {
        const labels = {
            available: 'Disponible',
            assigned: 'Asignada',
            maintenance: 'Mantenimiento',
            retired: 'Dada de baja'
        };
        return labels[status] || status || '-';
    },

    // ========================================
    // NOTIFICACIONES
    // ========================================

    showToast(message, type = 'success') {
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f97316',
            info: '#3b82f6'
        };

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${colors[type] || colors.success};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => MachinesModule.init(), 100);
});

window.MachinesModule = MachinesModule;
