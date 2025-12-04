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
                    <th class="actions-header">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${this.filteredMachines.length === 0 ? `
                    <tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                        ${this.machines.length === 0 ? 'No hay maquinas registradas' : 'No se encontraron resultados'}
                    </td></tr>
                ` : this.filteredMachines.map(m => `
                    <tr data-id="${m.id}">
                        <td class="cell-serial" title="${m.serialNumber || '-'}">${m.serialNumber || '-'}</td>
                        <td class="cell-name" title="${this.escapeHtml(m.name || '')}">${this.escapeHtml(m.name || '')}</td>
                        <td class="cell-model" title="${m.model || '-'}">${m.model || '-'}</td>
                        <td class="cell-year">${m.year || '-'}</td>
                        <td class="cell-ram">${m.ram || '-'}</td>
                        <td class="cell-disk">${m.disk || '-'}</td>
                        <td class="cell-os">${this.getOSLabel(m.operatingSystem)}</td>
                        <td class="cell-status">${this.getStatusBadge(m.status)}</td>
                        <td class="cell-actions">
                            <button class="btn-icon btn-ghost sm action-btn" onclick="MachinesModule.viewMachine('${m.id}')" title="Ver detalles">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                            <button class="btn-icon btn-ghost sm action-btn" onclick="MachinesModule.editMachine('${m.id}')" title="Editar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn-icon btn-ghost sm action-btn action-btn-danger" onclick="MachinesModule.deleteMachine('${m.id}')" title="Eliminar">
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

        container.innerHTML = this.filteredMachines.map(m => {
            const osColor = this.getOSColor(m.operatingSystem);
            const isMacOS = m.operatingSystem === 'macos';
            // Para macOS, usar un estilo especial que se adapte mejor al tema
            const iconStyle = isMacOS 
                ? 'background: rgba(107, 114, 128, 0.15); color: var(--text-primary);' 
                : `background: ${osColor}20; color: ${osColor};`;
            
            return `
            <div class="card machine-card" data-id="${m.id}">
                <div class="card-header">
                    <div class="card-icon" style="${iconStyle}">
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
        `;
        }).join('');
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
            macos: '#6b7280', // Gris medio que funciona bien en ambos temas (se adapta mejor)
            windows: '#0078d4',
            linux: '#f97316',
            chromeos: '#4285f4',
            other: '#6b7280'
        };
        return colors[os] || colors.other;
    },

    getOSIcon(os) {
        const icons = {
            macos: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>',
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
        
        // Boton importar CSV
        document.getElementById('importBtn')?.addEventListener('click', () => this.openImportModal());
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
            
            // Limpiar datos antes de guardar (eliminar campos vacíos/undefined)
            const cleanedData = this.cleanMachineData(data);
            
            try {
                if (cleanedData.id) {
                    const existing = this.getMachineById(cleanedData.id);
                    if (existing) {
                        Object.assign(existing, cleanedData);
                        await Store.saveMachine(existing);
                    } else {
                        await Store.saveMachine(cleanedData);
                    }
                } else {
                    delete cleanedData.id;
                    await Store.saveMachine(cleanedData);
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
    // IMPORTAR CSV
    // ========================================

    openImportModal() {
        const modalHtml = `
            <div class="modal-overlay active" id="importModal">
                <div class="modal modal-lg" style="max-width: 900px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Importar Máquinas desde CSV</h2>
                        <button class="modal-close" onclick="document.getElementById('importModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                        <div style="margin-bottom: 1.5rem;">
                            <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                                Sube un archivo CSV con las máquinas a importar. El archivo debe incluir las columnas requeridas.
                            </p>
                            <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                                <strong style="display: block; margin-bottom: 0.5rem;">Columnas requeridas:</strong>
                                <code style="font-size: 0.85rem; color: var(--text-secondary);">
                                    serialNumber, name, status
                                </code>
                                <strong style="display: block; margin-top: 1rem; margin-bottom: 0.5rem;">Columnas opcionales:</strong>
                                <code style="font-size: 0.85rem; color: var(--text-secondary);">
                                    year, cost, model, diskType, disk, ramType, ram, operatingSystem, osVersion, monitor, openCoreVersion, comments
                                </code>
                            </div>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="MachinesModule.downloadExampleCSV()" style="margin-bottom: 1rem;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Descargar CSV de Ejemplo
                            </button>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Seleccionar archivo CSV <span class="required">*</span></label>
                            <input type="file" id="csvFileInput" accept=".csv" class="form-input" style="padding: 0.5rem;">
                        </div>
                        <div id="importPreview" style="margin-top: 1.5rem; display: none;">
                            <h3 style="font-size: 1rem; margin-bottom: 1rem;">Vista Previa de Datos</h3>
                            <div id="importPreviewContent"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('importModal').remove()">Cancelar</button>
                        <button type="button" class="btn btn-primary" id="importConfirmBtn" onclick="MachinesModule.confirmImport()" disabled>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Importar Máquinas
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const fileInput = document.getElementById('csvFileInput');
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processCSVFile(file);
            }
        });
    },

    async processCSVFile(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const csvText = e.target.result;
                const machines = this.parseCSV(csvText);
                
                if (machines.length === 0) {
                    this.showToast('El archivo CSV está vacío o no tiene el formato correcto', 'error');
                    return;
                }

                // Validar datos
                const validation = this.validateMachines(machines);
                
                if (validation.errors.length > 0) {
                    this.showPreview(machines, validation);
                } else {
                    this.showPreview(machines, validation);
                    document.getElementById('importConfirmBtn').disabled = false;
                }
            } catch (error) {
                console.error('Error procesando CSV:', error);
                this.showToast('Error al procesar el archivo CSV: ' + error.message, 'error');
            }
        };
        reader.readAsText(file, 'UTF-8');
    },

    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        // Parsear encabezados
        const headers = this.parseCSVLine(lines[0]);
        const machines = [];

        // Parsear filas
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === 0) continue;

            const machine = {};
            headers.forEach((header, index) => {
                const key = header.trim().toLowerCase();
                const value = values[index] ? values[index].trim() : '';
                machine[key] = value;
            });

            machines.push(machine);
        }

        return machines;
    },

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Comilla escapada
                    current += '"';
                    i++; // Saltar la siguiente comilla
                } else {
                    // Inicio o fin de campo entre comillas
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);

        return values.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    },

    validateMachines(machines) {
        const errors = [];
        const warnings = [];
        const existingSerials = this.machines.map(m => m.serialNumber?.toLowerCase());

        machines.forEach((machine, index) => {
            const row = index + 2; // +2 porque la fila 1 es el encabezado

            // Validar campos requeridos
            if (!machine.serialnumber || !machine.serialnumber.trim()) {
                errors.push(`Fila ${row}: El número de serie es requerido`);
            } else {
                const serialLower = machine.serialnumber.toLowerCase();
                if (existingSerials.includes(serialLower)) {
                    warnings.push(`Fila ${row}: El número de serie "${machine.serialnumber}" ya existe. Se actualizará la máquina existente.`);
                }
            }

            if (!machine.name || !machine.name.trim()) {
                errors.push(`Fila ${row}: El nombre es requerido`);
            }

            // Validar estado
            if (machine.status) {
                const validStatuses = ['available', 'assigned', 'maintenance', 'retired'];
                const statusLower = machine.status.toLowerCase();
                if (!validStatuses.includes(statusLower)) {
                    warnings.push(`Fila ${row}: Estado "${machine.status}" no es válido. Se usará "available" por defecto.`);
                    machine.status = 'available';
                } else {
                    machine.status = statusLower;
                }
            } else {
                machine.status = 'available';
            }

            // Validar año si existe
            if (machine.year && isNaN(parseInt(machine.year))) {
                warnings.push(`Fila ${row}: El año "${machine.year}" no es válido. Se ignorará.`);
                delete machine.year;
            }

            // Validar costo si existe
            if (machine.cost && isNaN(parseFloat(machine.cost))) {
                warnings.push(`Fila ${row}: El costo "${machine.cost}" no es válido. Se ignorará.`);
                delete machine.cost;
            }
        });

        return { errors, warnings, valid: errors.length === 0 };
    },

    showPreview(machines, validation) {
        const previewDiv = document.getElementById('importPreview');
        const previewContent = document.getElementById('importPreviewContent');
        
        previewDiv.style.display = 'block';

        let html = '';

        // Mostrar errores
        if (validation.errors.length > 0) {
            html += `
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                    <strong style="color: #ef4444; display: block; margin-bottom: 0.5rem;">Errores encontrados:</strong>
                    <ul style="margin: 0; padding-left: 1.5rem; color: #ef4444;">
                        ${validation.errors.map(e => `<li>${this.escapeHtml(e)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Mostrar advertencias
        if (validation.warnings.length > 0) {
            html += `
                <div style="background: rgba(249, 115, 22, 0.1); border: 1px solid #f97316; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                    <strong style="color: #f97316; display: block; margin-bottom: 0.5rem;">Advertencias:</strong>
                    <ul style="margin: 0; padding-left: 1.5rem; color: #f97316;">
                        ${validation.warnings.map(w => `<li>${this.escapeHtml(w)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Mostrar resumen
        html += `
            <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <strong>Resumen:</strong> ${machines.length} máquina(s) encontrada(s)
            </div>
        `;

        // Mostrar tabla de vista previa
        html += `
            <div style="overflow-x: auto;">
                <table class="data-table" style="font-size: 0.85rem;">
                    <thead>
                        <tr>
                            <th>Serie</th>
                            <th>Nombre</th>
                            <th>Modelo</th>
                            <th>Año</th>
                            <th>Estado</th>
                            <th>RAM</th>
                            <th>Disco</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${machines.slice(0, 10).map(m => `
                            <tr>
                                <td>${this.escapeHtml(m.serialnumber || '-')}</td>
                                <td>${this.escapeHtml(m.name || '-')}</td>
                                <td>${this.escapeHtml(m.model || '-')}</td>
                                <td>${m.year || '-'}</td>
                                <td>${this.escapeHtml(m.status || 'available')}</td>
                                <td>${this.escapeHtml(m.ram || '-')}</td>
                                <td>${this.escapeHtml(m.disk || '-')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${machines.length > 10 ? `<p style="text-align: center; margin-top: 0.5rem; color: var(--text-tertiary);">Mostrando 10 de ${machines.length} máquinas</p>` : ''}
            </div>
        `;

        previewContent.innerHTML = html;
        
        // Guardar máquinas para importación
        this.pendingImport = { machines, validation };
    },

    async confirmImport() {
        if (!this.pendingImport || !this.pendingImport.validation.valid) {
            this.showToast('No se pueden importar máquinas con errores', 'error');
            return;
        }

        const { machines } = this.pendingImport;
        let successCount = 0;
        let errorCount = 0;

        // Deshabilitar botón durante importación
        const importBtn = document.getElementById('importConfirmBtn');
        importBtn.disabled = true;
        importBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
            </svg>
            Importando...
        `;

        try {
            for (const machineData of machines) {
                try {
                    // Normalizar campos
                    const machine = {
                        serialNumber: machineData.serialnumber || machineData.serialNumber,
                        name: machineData.name,
                        status: machineData.status || 'available'
                    };

                    // Agregar campos opcionales solo si tienen valor
                    if (machineData.year && machineData.year.trim()) {
                        const year = parseInt(machineData.year);
                        if (!isNaN(year)) machine.year = year;
                    }
                    
                    if (machineData.cost && machineData.cost.trim()) {
                        const cost = parseFloat(machineData.cost);
                        if (!isNaN(cost)) machine.cost = cost;
                    }
                    
                    if (machineData.model && machineData.model.trim()) {
                        machine.model = machineData.model.trim();
                    }
                    
                    if (machineData.disktype || machineData.diskType) {
                        machine.diskType = (machineData.disktype || machineData.diskType).trim();
                    }
                    
                    if (machineData.disk && machineData.disk.trim()) {
                        machine.disk = machineData.disk.trim();
                    }
                    
                    if (machineData.ramtype || machineData.ramType) {
                        machine.ramType = (machineData.ramtype || machineData.ramType).trim();
                    }
                    
                    if (machineData.ram && machineData.ram.trim()) {
                        machine.ram = machineData.ram.trim();
                    }
                    
                    if (machineData.operatingsystem || machineData.operatingSystem) {
                        machine.operatingSystem = (machineData.operatingsystem || machineData.operatingSystem).trim();
                    }
                    
                    if (machineData.osversion || machineData.osVersion) {
                        machine.osVersion = (machineData.osversion || machineData.osVersion).trim();
                    }
                    
                    if (machineData.monitor && machineData.monitor.trim()) {
                        machine.monitor = machineData.monitor.trim();
                    }
                    
                    if (machineData.opencoreversion || machineData.openCoreVersion) {
                        machine.openCoreVersion = (machineData.opencoreversion || machineData.openCoreVersion).trim();
                    }
                    
                    if (machineData.comments && machineData.comments.trim()) {
                        machine.comments = machineData.comments.trim();
                    }

                    // Eliminar campos undefined/vacíos para Firestore
                    const cleanedMachine = this.cleanMachineData(machine);

                    // Verificar si ya existe
                    const existing = await Store.getMachineBySerial(cleanedMachine.serialNumber);
                    if (existing) {
                        // Actualizar máquina existente
                        Object.assign(existing, cleanedMachine);
                        await Store.saveMachine(existing);
                    } else {
                        // Crear nueva máquina
                        await Store.saveMachine(cleanedMachine);
                    }
                    successCount++;
                } catch (error) {
                    console.error('Error importando máquina:', error);
                    errorCount++;
                }
            }

            // Cerrar modal y actualizar vista
            document.getElementById('importModal').remove();
            await this.loadData();
            this.filteredMachines = [...this.machines];
            this.renderStats();
            this.applyFilters();
            
            if (errorCount === 0) {
                this.showToast(`${successCount} máquina(s) importada(s) correctamente`, 'success');
            } else {
                this.showToast(`${successCount} máquina(s) importada(s), ${errorCount} error(es)`, 'warning');
            }
        } catch (error) {
            console.error('Error en importación:', error);
            this.showToast('Error al importar máquinas', 'error');
        } finally {
            this.pendingImport = null;
        }
    },

    cleanMachineData(machine) {
        // Eliminar campos undefined, null o cadenas vacías para Firestore
        const cleaned = {};
        for (const [key, value] of Object.entries(machine)) {
            // Saltar campos especiales que deben manejarse por separado
            if (key === 'id' && value) {
                cleaned[key] = value;
                continue;
            }
            
            // Solo incluir si el valor no es undefined, null o cadena vacía
            if (value !== undefined && value !== null && value !== '') {
                // Para campos numéricos, asegurar que sean números válidos
                if ((key === 'year' || key === 'cost') && typeof value === 'string') {
                    const numValue = key === 'year' ? parseInt(value) : parseFloat(value);
                    if (!isNaN(numValue)) {
                        cleaned[key] = numValue;
                    }
                } else {
                    cleaned[key] = value;
                }
            }
        }
        return cleaned;
    },

    downloadExampleCSV() {
        const exampleData = [
            ['serialNumber', 'name', 'status', 'year', 'cost', 'model', 'diskType', 'disk', 'ramType', 'ram', 'operatingSystem', 'osVersion', 'monitor', 'openCoreVersion', 'comments'],
            ['SN-001234', 'MacBook Pro IT-01', 'available', '2023', '25000', 'MacBook Pro 16 M2 Max', 'ssd', '1TB', 'lpddr5', '32GB', 'macos', 'Sonoma 14.2', 'Retina 16', '0.9.7', 'Máquina nueva para desarrollo'],
            ['SN-001235', 'Dell XPS IT-02', 'available', '2023', '18000', 'Dell XPS 15', 'nvme', '512GB', 'ddr5', '16GB', 'windows', 'Windows 11 Pro', '15.6 4K', '', 'Laptop para diseño'],
            ['SN-001236', 'HP EliteBook IT-03', 'assigned', '2022', '15000', 'HP EliteBook 840', 'ssd', '256GB', 'ddr4', '8GB', 'windows', 'Windows 10 Pro', '14 FHD', '', 'Asignada a desarrollo'],
            ['SN-001237', 'iMac IT-04', 'maintenance', '2021', '35000', 'iMac 24 M1', 'ssd', '512GB', 'unified', '16GB', 'macos', 'Ventura 13.5', '24 4.5K', '', 'En reparación de pantalla']
        ];

        const csvContent = exampleData.map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'ejemplo_maquinas.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showToast('CSV de ejemplo descargado', 'success');
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
