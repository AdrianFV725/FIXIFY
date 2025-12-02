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
        await this.renderFilters();
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
        const osFilter = document.getElementById('osFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';

        this.filteredMachines = this.machines.filter(m => {
            // Filtro de busqueda
            const matchesSearch = !searchTerm || 
                (m.name || '').toLowerCase().includes(searchTerm) ||
                (m.serialNumber || '').toLowerCase().includes(searchTerm) ||
                (m.model || '').toLowerCase().includes(searchTerm) ||
                (m.ram || '').toLowerCase().includes(searchTerm) ||
                (m.disk || '').toLowerCase().includes(searchTerm) ||
                (m.osVersion || '').toLowerCase().includes(searchTerm) ||
                (m.year ? String(m.year) : '').includes(searchTerm);

            // Filtro de sistema operativo
            const matchesOS = !osFilter || m.operatingSystem === osFilter;

            // Filtro de estado
            const matchesStatus = !statusFilter || m.status === statusFilter;

            return matchesSearch && matchesOS && matchesStatus;
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

    async renderFilters() {
        const container = document.getElementById('filtersBar');
        if (!container) return;

        // Obtener opciones dinamicas
        const options = await Store.getMachineOptions();
        const osOptions = options.operatingSystem || [];
        const statusOptions = options.status || [];

        container.innerHTML = `
            <div class="filter-group">
                <input type="text" class="filter-input" id="searchInput" placeholder="Buscar por nombre, serie, modelo, RAM, disco...">
            </div>
            <div class="filter-group">
                <label class="filter-label">SO:</label>
                <select class="filter-select" id="osFilter">
                    <option value="">Todos</option>
                    ${osOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Estado:</label>
                <select class="filter-select" id="statusFilter">
                    <option value="">Todos</option>
                    ${statusOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
                </select>
            </div>
            <button class="filter-btn" id="clearFilters">Limpiar</button>
        `;
    },

    // ========================================
    // HELPERS DE RENDERIZADO
    // ========================================

    getStatusBadge(status) {
        // Obtener etiqueta dinamica
        const label = this.getStatusLabel(status);
        
        // Clases predefinidas para los estados base
        const classMap = {
            available: 'badge-active',
            assigned: 'badge-open',
            maintenance: 'badge-maintenance',
            retired: 'badge-inactive'
        };
        const badgeClass = classMap[status] || 'badge';
        
        return `<span class="badge ${badgeClass}">${label}</span>`;
    },

    getTypeLabel(type) {
        const labels = { laptop: 'Laptop', desktop: 'Desktop', server: 'Servidor', printer: 'Impresora', other: 'Otro' };
        return labels[type] || type || '-';
    },

    getOSLabel(os) {
        // Buscar en opciones guardadas
        const options = Store.getLocal(Store.KEYS.MACHINE_OPTIONS);
        if (options?.operatingSystem) {
            const opt = options.operatingSystem.find(o => o.value === os);
            if (opt) return opt.label;
        }
        // Fallback a valores por defecto
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
        // Buscar en opciones guardadas
        const options = Store.getLocal(Store.KEYS.MACHINE_OPTIONS);
        if (options?.diskType) {
            const opt = options.diskType.find(o => o.value === diskType);
            if (opt) return opt.label;
        }
        // Fallback a valores por defecto
        const labels = { ssd: 'SSD', hdd: 'HDD', nvme: 'NVMe', hybrid: 'Hibrido' };
        return labels[diskType] || diskType || '-';
    },

    getRamTypeLabel(ramType) {
        // Buscar en opciones guardadas
        const options = Store.getLocal(Store.KEYS.MACHINE_OPTIONS);
        if (options?.ramType) {
            const opt = options.ramType.find(o => o.value === ramType);
            if (opt) return opt.label;
        }
        // Fallback a valores por defecto
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
                    <th>Modelo</th>
                    <th>Año</th>
                    <th>RAM</th>
                    <th>Disco</th>
                    <th>SO</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${this.filteredMachines.length === 0 ? `
                    <tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                        ${this.machines.length === 0 ? 'No hay maquinas registradas' : 'No se encontraron resultados'}
                    </td></tr>
                ` : this.filteredMachines.map(m => `
                    <tr data-id="${m.id}">
                        <td style="font-family: monospace;">${m.serialNumber || '-'}</td>
                        <td>${this.escapeHtml(m.name || '')}</td>
                        <td>${m.model || '-'}</td>
                        <td>${m.year || '-'}</td>
                        <td>${m.ram || '-'}</td>
                        <td>${m.disk || '-'}</td>
                        <td>${this.getOSLabel(m.operatingSystem)}</td>
                        <td>${this.getStatusBadge(m.status)}</td>
                        <td class="cell-actions">
                            <button class="btn-icon btn-ghost sm" onclick="MachinesModule.viewMachine('${m.id}')" title="Ver detalles">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
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
                    <div class="card-icon" style="background: ${this.getOSColor(m.operatingSystem)}20; color: ${this.getOSColor(m.operatingSystem)};">
                        ${this.getOSIcon(m.operatingSystem)}
                    </div>
                    ${this.getStatusBadge(m.status)}
                </div>
                <div class="card-body">
                    <h3 class="card-title">${this.escapeHtml(m.name || 'Sin nombre')}</h3>
                    <p class="card-subtitle">${m.model || ''} ${m.year ? '(' + m.year + ')' : ''}</p>
                    <div class="card-details">
                        <div class="card-detail">
                            <span class="detail-label">Serie:</span>
                            <span class="detail-value" style="font-family: monospace;">${m.serialNumber || '-'}</span>
                        </div>
                        <div class="card-detail">
                            <span class="detail-label">RAM:</span>
                            <span class="detail-value">${m.ram || '-'}</span>
                        </div>
                        <div class="card-detail">
                            <span class="detail-label">Disco:</span>
                            <span class="detail-value">${m.disk || '-'}</span>
                        </div>
                        <div class="card-detail">
                            <span class="detail-label">SO:</span>
                            <span class="detail-value">${this.getOSLabel(m.operatingSystem)} ${m.osVersion || ''}</span>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-ghost btn-sm" onclick="MachinesModule.viewMachine('${m.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        Ver
                    </button>
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

    getOSColor(os) {
        const colors = {
            macos: '#000000',
            windows: '#0078d4',
            linux: '#f97316',
            chromeos: '#4285f4',
            other: '#6b7280'
        };
        return colors[os] || colors.other;
    },

    getOSIcon(os) {
        const icons = {
            macos: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 4-3 4-6 0-4.5-2.5-6-4.5-6-.5 0-1.5.5-2.5.5s-2-.5-2.5-.5c-2 0-4.5 1.5-4.5 6 0 3 1 6 4 6 1.25 0 2.5-1.06 4-1.06z"/><path d="M12 7c1.5 0 3-1.5 3-3.5 0-.5 0-1-.5-1.5-1.5 0-3 1.5-3 3.5 0 .5 0 1 .5 1.5z"/></svg>',
            windows: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8"></rect><rect x="13" y="3" width="8" height="8"></rect><rect x="3" y="13" width="8" height="8"></rect><rect x="13" y="13" width="8" height="8"></rect></svg>',
            linux: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"></circle><path d="M3 21v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2"></path></svg>',
            chromeos: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>',
            other: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>'
        };
        return icons[os] || icons.other;
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

    viewMachine(id) {
        // Redirigir a la página de detalle
        window.location.href = `machine-detail.html?id=${id}`;
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
        document.getElementById('osFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter')?.addEventListener('change', () => this.applyFilters());

        // Limpiar filtros
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('osFilter').value = '';
            document.getElementById('statusFilter').value = '';
            this.applyFilters();
        });

        // Boton exportar
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportMachines());
    },

    async openForm(machine = null) {
        const isEdit = !!machine;
        
        // Obtener opciones dinamicas
        const options = await Store.getMachineOptions();

        const renderSelectOptions = (category, selectedValue) => {
            const opts = options[category] || [];
            return opts.map(o => 
                `<option value="${o.value}" ${selectedValue === o.value ? 'selected' : ''}>${o.label}</option>`
            ).join('');
        };

        const createSelectWithManage = (name, label, category, selectedValue, required = false) => {
            return `
                <div class="form-group">
                    <label class="form-label">${label}${required ? ' <span class="required">*</span>' : ''}</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <select name="${name}" ${required ? 'required' : ''} class="form-select" style="flex: 1;">
                            <option value="">Seleccionar</option>
                            ${renderSelectOptions(category, selectedValue)}
                        </select>
                        <button type="button" class="btn btn-ghost btn-sm" onclick="MachinesModule.openOptionsManager('${category}', '${label}')" title="Administrar opciones" style="padding: 0.5rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </button>
                    </div>
                </div>
            `;
        };

        const modalHtml = `
            <div class="modal-overlay active" id="machineModal">
                <div class="modal modal-lg" style="max-width: 800px;">
                    <div class="modal-header">
                        <h2 class="modal-title">${isEdit ? 'Editar Maquina' : 'Nueva Maquina'}</h2>
                        <button class="modal-close" onclick="document.getElementById('machineModal').remove()">&times;</button>
                    </div>
                    <form id="machineForm" class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                        <div class="form">
                            <!-- Fila 1: Serie y Nombre -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Numero de Serie <span class="required">*</span></label>
                                    <input type="text" name="serialNumber" required value="${machine?.serialNumber || ''}" class="form-input" placeholder="Ej: SN-001234">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Nombre de Maquina <span class="required">*</span></label>
                                    <input type="text" name="name" required value="${this.escapeHtml(machine?.name || '')}" class="form-input" placeholder="Ej: MacBook Pro IT-01">
                                </div>
                            </div>
                            <!-- Fila 2: Año, Estado, Costo -->
                            <div class="form-row" style="grid-template-columns: 1fr 1fr 1fr;">
                                <div class="form-group">
                                    <label class="form-label">Año</label>
                                    <input type="number" name="year" value="${machine?.year || ''}" class="form-input" placeholder="Ej: 2023" min="1990" max="2099">
                                </div>
                                ${createSelectWithManage('status', 'Estado', 'status', machine?.status || 'available', true)}
                                <div class="form-group">
                                    <label class="form-label">Costo</label>
                                    <input type="number" name="cost" value="${machine?.cost || ''}" class="form-input" placeholder="Ej: 15000" step="0.01" min="0">
                                </div>
                            </div>
                            <!-- Fila 3: Modelo -->
                            <div class="form-row">
                                <div class="form-group" style="grid-column: 1 / -1;">
                                    <label class="form-label">Modelo</label>
                                    <input type="text" name="model" value="${this.escapeHtml(machine?.model || '')}" class="form-input" placeholder="Ej: MacBook Pro 16 M2 Max">
                                </div>
                            </div>
                            <!-- Fila 4: Tipo de Disco y Disco -->
                            <div class="form-row">
                                ${createSelectWithManage('diskType', 'Tipo de Disco', 'diskType', machine?.diskType)}
                                <div class="form-group">
                                    <label class="form-label">Capacidad de Disco</label>
                                    <input type="text" name="disk" value="${this.escapeHtml(machine?.disk || '')}" class="form-input" placeholder="Ej: 512GB, 1TB">
                                </div>
                            </div>
                            <!-- Fila 5: Tipo de RAM y RAM -->
                            <div class="form-row">
                                ${createSelectWithManage('ramType', 'Tipo de RAM', 'ramType', machine?.ramType)}
                                <div class="form-group">
                                    <label class="form-label">Capacidad de RAM</label>
                                    <input type="text" name="ram" value="${this.escapeHtml(machine?.ram || '')}" class="form-input" placeholder="Ej: 8GB, 16GB, 32GB">
                                </div>
                            </div>
                            <!-- Fila 6: Sistema Operativo y Versión -->
                            <div class="form-row">
                                ${createSelectWithManage('operatingSystem', 'Sistema Operativo', 'operatingSystem', machine?.operatingSystem)}
                                <div class="form-group">
                                    <label class="form-label">Version del SO</label>
                                    <input type="text" name="osVersion" value="${this.escapeHtml(machine?.osVersion || '')}" class="form-input" placeholder="Ej: Sonoma 14.2, Windows 11 Pro">
                                </div>
                            </div>
                            <!-- Fila 7: Monitor y OpenCore -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Monitor</label>
                                    <input type="text" name="monitor" value="${this.escapeHtml(machine?.monitor || '')}" class="form-input" placeholder="Ej: 27 4K, Retina 16">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Version de OpenCore</label>
                                    <input type="text" name="openCoreVersion" value="${this.escapeHtml(machine?.openCoreVersion || '')}" class="form-input" placeholder="Ej: 0.9.7 (si aplica)">
                                </div>
                            </div>
                            <!-- Fila 8: Comentarios -->
                            <div class="form-group full-width">
                                <label class="form-label">Comentarios</label>
                                <textarea name="comments" class="form-textarea" rows="3" placeholder="Comentarios adicionales sobre la maquina...">${this.escapeHtml(machine?.comments || '')}</textarea>
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

    // ========================================
    // ADMINISTRADOR DE OPCIONES
    // ========================================

    async openOptionsManager(category, label) {
        const options = await Store.getMachineOptions();
        const categoryOptions = options[category] || [];

        const getCategoryTitle = () => {
            const titles = {
                diskType: 'Tipos de Disco',
                ramType: 'Tipos de RAM',
                operatingSystem: 'Sistemas Operativos',
                status: 'Estados'
            };
            return titles[category] || label;
        };

        const renderOptionsList = () => {
            if (categoryOptions.length === 0) {
                return '<p style="color: var(--text-tertiary); text-align: center; padding: 1rem;">No hay opciones configuradas</p>';
            }
            return categoryOptions.map((opt, index) => `
                <div class="option-item" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 0.5rem;">
                    <div style="flex: 1;">
                        <span style="font-weight: 500;">${opt.label}</span>
                        <span style="color: var(--text-tertiary); font-size: 0.8rem; margin-left: 0.5rem;">(${opt.value})</span>
                    </div>
                    <button type="button" class="btn-icon btn-ghost sm" onclick="MachinesModule.editOption('${category}', '${opt.value}')" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button type="button" class="btn-icon btn-ghost sm" onclick="MachinesModule.deleteOption('${category}', '${opt.value}')" title="Eliminar" style="color: #ef4444;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `).join('');
        };

        const modalHtml = `
            <div class="modal-overlay active" id="optionsManagerModal" style="z-index: 10001;">
                <div class="modal" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Administrar ${getCategoryTitle()}</h2>
                        <button class="modal-close" onclick="document.getElementById('optionsManagerModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <!-- Formulario agregar nueva opcion -->
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
                            <input type="text" id="newOptionValue" class="form-input" placeholder="Valor (ej: ddr6)" style="flex: 1;">
                            <input type="text" id="newOptionLabel" class="form-input" placeholder="Etiqueta (ej: DDR6)" style="flex: 1;">
                            <button type="button" class="btn btn-primary" onclick="MachinesModule.addNewOption('${category}')" style="white-space: nowrap;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Agregar
                            </button>
                        </div>
                        
                        <!-- Lista de opciones -->
                        <div id="optionsList" style="max-height: 300px; overflow-y: auto;">
                            ${renderOptionsList()}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('optionsManagerModal').remove()">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async addNewOption(category) {
        const valueInput = document.getElementById('newOptionValue');
        const labelInput = document.getElementById('newOptionLabel');
        
        const value = valueInput.value.trim().toLowerCase().replace(/\s+/g, '_');
        const label = labelInput.value.trim();

        if (!value || !label) {
            this.showToast('Ingresa valor y etiqueta', 'warning');
            return;
        }

        try {
            await Store.addMachineOption(category, { value, label });
            this.showToast('Opcion agregada correctamente', 'success');
            
            // Cerrar y reabrir el modal para actualizar
            document.getElementById('optionsManagerModal').remove();
            await this.openOptionsManager(category, '');
            
            // Actualizar el select en el formulario de maquina si esta abierto
            await this.refreshFormSelects();
        } catch (error) {
            console.error('Error agregando opcion:', error);
            this.showToast('Error al agregar opcion', 'error');
        }
    },

    async editOption(category, oldValue) {
        const options = await Store.getMachineOptions();
        const opt = options[category]?.find(o => o.value === oldValue);
        
        if (!opt) return;

        const newLabel = prompt('Nueva etiqueta:', opt.label);
        if (newLabel && newLabel.trim()) {
            try {
                await Store.updateMachineOption(category, oldValue, { 
                    value: oldValue, 
                    label: newLabel.trim() 
                });
                this.showToast('Opcion actualizada', 'success');
                document.getElementById('optionsManagerModal').remove();
                await this.openOptionsManager(category, '');
                await this.refreshFormSelects();
            } catch (error) {
                console.error('Error actualizando opcion:', error);
                this.showToast('Error al actualizar opcion', 'error');
            }
        }
    },

    async deleteOption(category, value) {
        // Verificar si esta en uso
        const inUse = this.machines.some(m => {
            if (category === 'diskType') return m.diskType === value;
            if (category === 'ramType') return m.ramType === value;
            if (category === 'operatingSystem') return m.operatingSystem === value;
            if (category === 'status') return m.status === value;
            return false;
        });

        if (inUse) {
            this.showToast('No se puede eliminar: esta opcion esta en uso', 'warning');
            return;
        }

        if (confirm('¿Eliminar esta opcion?')) {
            try {
                await Store.removeMachineOption(category, value);
                this.showToast('Opcion eliminada', 'success');
                document.getElementById('optionsManagerModal').remove();
                await this.openOptionsManager(category, '');
                await this.refreshFormSelects();
            } catch (error) {
                console.error('Error eliminando opcion:', error);
                this.showToast('Error al eliminar opcion', 'error');
            }
        }
    },

    async refreshFormSelects() {
        const machineModal = document.getElementById('machineModal');
        if (!machineModal) return;

        const options = await Store.getMachineOptions();
        
        const categories = ['diskType', 'ramType', 'operatingSystem', 'status'];
        
        categories.forEach(category => {
            const select = machineModal.querySelector(`select[name="${category}"]`);
            if (select) {
                const currentValue = select.value;
                const opts = options[category] || [];
                
                select.innerHTML = '<option value="">Seleccionar</option>' + 
                    opts.map(o => 
                        `<option value="${o.value}" ${currentValue === o.value ? 'selected' : ''}>${o.label}</option>`
                    ).join('');
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

        const headers = [
            'No. Serie', 
            'Nombre', 
            'Año', 
            'Estado', 
            'Costo', 
            'Modelo', 
            'Tipo Disco', 
            'Disco', 
            'Tipo RAM', 
            'RAM', 
            'Sistema Operativo', 
            'Version SO', 
            'Monitor', 
            'Version OpenCore', 
            'Comentarios',
            'Fecha Creacion'
        ];
        const rows = this.filteredMachines.map(m => [
            m.serialNumber || '',
            m.name || '',
            m.year || '',
            this.getStatusLabel(m.status),
            m.cost || '',
            m.model || '',
            this.getDiskTypeLabel(m.diskType),
            m.disk || '',
            this.getRamTypeLabel(m.ramType),
            m.ram || '',
            this.getOSLabel(m.operatingSystem),
            m.osVersion || '',
            m.monitor || '',
            m.openCoreVersion || '',
            (m.comments || '').replace(/"/g, '""'),
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
        // Buscar en opciones guardadas
        const options = Store.getLocal(Store.KEYS.MACHINE_OPTIONS);
        if (options?.status) {
            const opt = options.status.find(o => o.value === status);
            if (opt) return opt.label;
        }
        // Fallback a valores por defecto
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
