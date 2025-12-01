// ========================================
// MACHINES MODULE
// Gestion de inventario de maquinas
// ========================================

const MachinesModule = {
    table: null,
    viewMode: 'table',

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
        const container = document.getElementById('machineStats');
        if (!container) return;

        const stats = Store.getStats().machines;

        container.innerHTML = `
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
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

    // ========================================
    // FILTROS
    // ========================================

    renderFilters() {
        const container = document.getElementById('filtersBar');
        if (!container) return;

        const types = [
            { value: '', label: 'Todos' },
            { value: 'laptop', label: 'Laptop' },
            { value: 'desktop', label: 'Desktop' },
            { value: 'server', label: 'Servidor' },
            { value: 'printer', label: 'Impresora' },
            { value: 'other', label: 'Otro' }
        ];

        const statuses = [
            { value: '', label: 'Todos' },
            { value: 'available', label: 'Disponible' },
            { value: 'assigned', label: 'Asignada' },
            { value: 'maintenance', label: 'Mantenimiento' },
            { value: 'retired', label: 'Dada de baja' }
        ];

        container.innerHTML = `
            <div class="filter-group">
                <input type="text" class="filter-input" id="searchInput" placeholder="Buscar por nombre, serie, marca...">
            </div>
            <div class="filter-group">
                <label class="filter-label">Tipo:</label>
                <select class="filter-select" id="typeFilter">
                    ${types.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Estado:</label>
                <select class="filter-select" id="statusFilter">
                    ${statuses.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
                </select>
            </div>
            <button class="filter-btn" id="clearFilters">Limpiar</button>
        `;
    },

    // ========================================
    // TABLA
    // ========================================

    initTable() {
        const container = document.getElementById('tableView') || document.querySelector('.page-content');
        if (!container) return;

        if (!document.getElementById('machinesTableContainer')) {
            const tableContainer = document.createElement('div');
            tableContainer.id = 'machinesTableContainer';
            container.appendChild(tableContainer);
        }

        const statusBadge = TableActions.createStatusBadge({
            available: { label: 'Disponible', class: 'badge-active' },
            assigned: { label: 'Asignada', class: 'badge-open' },
            maintenance: { label: 'Mantenimiento', class: 'badge-maintenance' },
            retired: { label: 'Baja', class: 'badge-inactive' }
        });

        this.table = new DataTable({
            container: document.getElementById('machinesTableContainer'),
            columns: [
                { key: 'serialNumber', label: 'No. Serie', className: 'cell-id' },
                { key: 'name', label: 'Nombre', className: 'cell-primary' },
                { key: 'type', label: 'Tipo', render: (v) => this.getTypeLabel(v) },
                { key: 'brand', label: 'Marca' },
                { key: 'model', label: 'Modelo' },
                { key: 'status', label: 'Estado', render: statusBadge },
                { 
                    key: 'assignedTo', 
                    label: 'Asignada a', 
                    render: (v) => {
                        if (!v) return '-';
                        const emp = Store.getEmployeeById(v);
                        return emp ? `${emp.name} ${emp.lastName || ''}` : '-';
                    }
                },
                { key: 'ticketCount', label: 'Tickets', render: (v) => v || 0 },
                TableActions.createActionsColumn(['view', 'edit', 'delete'])
            ],
            data: Store.getMachines(),
            searchFields: ['serialNumber', 'name', 'brand', 'model'],
            perPage: 10,
            emptyMessage: 'No hay maquinas registradas',
            onRowClick: (row) => this.viewMachine(row.id),
            onAction: (action, row) => this.handleAction(action, row)
        });
    },

    getTypeLabel(type) {
        const labels = {
            laptop: 'Laptop',
            desktop: 'Desktop',
            server: 'Servidor',
            printer: 'Impresora',
            other: 'Otro'
        };
        return labels[type] || type || '-';
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
        ['typeFilter', 'statusFilter'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.applyFilters());
        });

        // Limpiar filtros
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('typeFilter').value = '';
            document.getElementById('statusFilter').value = '';
            this.table?.setData(Store.getMachines());
        });

        // Nueva maquina
        document.getElementById('newMachineBtn')?.addEventListener('click', () => {
            this.openMachineForm();
        });

        // Exportar
        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportMachines();
        });

        // Toggle vista
        document.querySelectorAll('.view-btn')?.forEach(btn => {
            btn.addEventListener('click', () => {
                this.toggleView(btn.dataset.view);
            });
        });
    },

    applyFilters() {
        const filters = {
            type: document.getElementById('typeFilter')?.value,
            status: document.getElementById('statusFilter')?.value
        };
        this.table?.filter(filters);
    },

    toggleView(view) {
        this.viewMode = view;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        const tableView = document.getElementById('tableView');
        const cardsView = document.getElementById('cardsView');

        if (view === 'table') {
            tableView?.classList.remove('hidden');
            cardsView?.classList.add('hidden');
        } else {
            tableView?.classList.add('hidden');
            cardsView?.classList.remove('hidden');
            this.renderCards();
        }
    },

    // ========================================
    // ACCIONES
    // ========================================

    handleAction(action, machine) {
        switch (action) {
            case 'view':
                this.viewMachine(machine.id);
                break;
            case 'edit':
                this.openMachineForm(machine);
                break;
            case 'delete':
                this.deleteMachine(machine);
                break;
        }
    },

    // ========================================
    // FORMULARIO
    // ========================================

    async openMachineForm(machine = null) {
        const isEdit = !!machine;

        const fields = [
            { name: 'serialNumber', label: 'Numero de Serie', type: 'text', required: true, placeholder: 'Ej: SN001234' },
            { name: 'name', label: 'Nombre/Identificador', type: 'text', required: true, placeholder: 'Ej: MacBook Pro 16' },
            {
                name: 'type',
                label: 'Tipo',
                type: 'select',
                required: true,
                options: [
                    { value: 'laptop', label: 'Laptop' },
                    { value: 'desktop', label: 'Desktop' },
                    { value: 'server', label: 'Servidor' },
                    { value: 'printer', label: 'Impresora' },
                    { value: 'other', label: 'Otro' }
                ]
            },
            { name: 'brand', label: 'Marca', type: 'text', placeholder: 'Ej: Apple, Dell, HP' },
            { name: 'model', label: 'Modelo', type: 'text', placeholder: 'Ej: MacBook Pro 16 2023' },
            {
                name: 'status',
                label: 'Estado',
                type: 'select',
                required: true,
                options: [
                    { value: 'available', label: 'Disponible' },
                    { value: 'assigned', label: 'Asignada' },
                    { value: 'maintenance', label: 'En Mantenimiento' },
                    { value: 'retired', label: 'Dada de Baja' }
                ]
            },
            { name: 'acquisitionDate', label: 'Fecha de Adquisicion', type: 'date' },
            { name: 'cost', label: 'Costo de Adquisicion', type: 'number', min: 0, placeholder: '0.00' },
            { name: 'warrantyEnd', label: 'Garantia hasta', type: 'date' },
            { name: 'notes', label: 'Notas', type: 'textarea', fullWidth: true, rows: 3 }
        ];

        const result = await Modal.form({
            title: isEdit ? 'Editar Maquina' : 'Nueva Maquina',
            fields,
            data: machine || { status: 'available', type: 'laptop' },
            submitText: isEdit ? 'Actualizar' : 'Registrar',
            size: 'lg'
        });

        if (result) {
            // Validar numero de serie unico
            if (!isEdit) {
                const existing = Store.getMachineBySerial(result.serialNumber);
                if (existing) {
                    Toast.error('Ya existe una maquina con ese numero de serie');
                    return;
                }
            }

            if (isEdit) result.id = machine.id;
            if (result.cost) result.cost = parseFloat(result.cost);

            Store.saveMachine(result);
            this.table?.setData(Store.getMachines());
            this.renderStats();
            
            Toast.success(isEdit ? 'Maquina actualizada' : 'Maquina registrada correctamente');
        }
    },

    // ========================================
    // VER MAQUINA
    // ========================================

    viewMachine(machineId) {
        const machine = Store.getMachineById(machineId);
        if (!machine) return;

        const assignedTo = machine.assignedTo ? Store.getEmployeeById(machine.assignedTo) : null;
        const tickets = Store.getTickets().filter(t => t.machineId === machineId);

        Modal.open({
            title: machine.name,
            size: 'lg',
            content: `
                <div class="machine-detail">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Numero de Serie</label>
                            <p style="font-weight: 500; font-family: monospace;">${machine.serialNumber}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Tipo</label>
                            <p style="font-weight: 500;">${this.getTypeLabel(machine.type)}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Marca / Modelo</label>
                            <p style="font-weight: 500;">${machine.brand || '-'} ${machine.model || ''}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Estado</label>
                            <p>${TableActions.createStatusBadge({
                                available: { label: 'Disponible', class: 'badge-active' },
                                assigned: { label: 'Asignada', class: 'badge-open' },
                                maintenance: { label: 'Mantenimiento', class: 'badge-maintenance' },
                                retired: { label: 'Baja', class: 'badge-inactive' }
                            })(machine.status)}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Asignada a</label>
                            <p style="font-weight: 500;">${assignedTo ? `${assignedTo.name} ${assignedTo.lastName || ''}` : 'Sin asignar'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Tickets Registrados</label>
                            <p style="font-weight: 500;">${machine.ticketCount || 0}</p>
                        </div>
                        ${machine.acquisitionDate ? `
                            <div>
                                <label style="font-size: 0.75rem; color: var(--text-tertiary);">Fecha Adquisicion</label>
                                <p style="font-weight: 500;">${Utils.formatDate(machine.acquisitionDate)}</p>
                            </div>
                        ` : ''}
                        ${machine.warrantyEnd ? `
                            <div>
                                <label style="font-size: 0.75rem; color: var(--text-tertiary);">Garantia hasta</label>
                                <p style="font-weight: 500;">${Utils.formatDate(machine.warrantyEnd)}</p>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${machine.notes ? `
                        <div style="margin-bottom: 1.5rem;">
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Notas</label>
                            <p style="margin-top: 0.5rem;">${Utils.escapeHtml(machine.notes)}</p>
                        </div>
                    ` : ''}

                    ${tickets.length > 0 ? `
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Ultimos Tickets</label>
                            <div style="margin-top: 0.5rem; max-height: 150px; overflow-y: auto;">
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
                this.openMachineForm(machine);
            }
        });
    },

    // ========================================
    // ELIMINAR
    // ========================================

    async deleteMachine(machine) {
        const confirmed = await Modal.confirmDelete(`${machine.name} (${machine.serialNumber})`);
        
        if (confirmed) {
            Store.deleteMachine(machine.id);
            this.table?.setData(Store.getMachines());
            this.renderStats();
            Toast.success('Maquina eliminada');
        }
    },

    // ========================================
    // EXPORTAR
    // ========================================

    exportMachines() {
        const machines = this.table?.getFilteredData() || Store.getMachines();
        
        Utils.exportToCSV(machines, 'maquinas', [
            { key: 'serialNumber', label: 'Numero de Serie' },
            { key: 'name', label: 'Nombre' },
            { key: 'type', label: 'Tipo' },
            { key: 'brand', label: 'Marca' },
            { key: 'model', label: 'Modelo' },
            { key: 'status', label: 'Estado' },
            { key: 'acquisitionDate', label: 'Fecha Adquisicion' },
            { key: 'cost', label: 'Costo' }
        ]);

        Toast.success('Archivo exportado correctamente');
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    MachinesModule.init();
});

window.MachinesModule = MachinesModule;

