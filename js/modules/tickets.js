// ========================================
// TICKETS MODULE
// Gestion de tickets de soporte
// ========================================

const TicketsModule = {
    table: null,
    currentFilters: {},

    // ========================================
    // INICIALIZACION
    // ========================================

    init() {
        if (!Auth.requireAuth()) return;

        this.renderFilters();
        this.initTable();
        this.bindEvents();
    },

    // ========================================
    // FILTROS
    // ========================================

    renderFilters() {
        const container = document.getElementById('filtersBar');
        if (!container) return;

        const categories = [
            { value: '', label: 'Todas' },
            { value: 'hardware', label: 'Hardware' },
            { value: 'software', label: 'Software' },
            { value: 'network', label: 'Red' },
            { value: 'other', label: 'Otro' }
        ];

        const statuses = [
            { value: '', label: 'Todos' },
            { value: 'open', label: 'Abierto' },
            { value: 'in_progress', label: 'En Progreso' },
            { value: 'resolved', label: 'Resuelto' },
            { value: 'closed', label: 'Cerrado' }
        ];

        const priorities = [
            { value: '', label: 'Todas' },
            { value: 'low', label: 'Baja' },
            { value: 'medium', label: 'Media' },
            { value: 'high', label: 'Alta' },
            { value: 'critical', label: 'Critica' }
        ];

        container.innerHTML = `
            <div class="filter-group">
                <input type="text" class="filter-input" id="searchInput" placeholder="Buscar por folio, titulo...">
            </div>
            <div class="filter-group">
                <label class="filter-label">Estado:</label>
                <select class="filter-select" id="statusFilter">
                    ${statuses.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Categoria:</label>
                <select class="filter-select" id="categoryFilter">
                    ${categories.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Prioridad:</label>
                <select class="filter-select" id="priorityFilter">
                    ${priorities.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
                </select>
            </div>
            <button class="filter-btn" id="clearFilters">Limpiar filtros</button>
        `;
    },

    // ========================================
    // TABLA
    // ========================================

    initTable() {
        const container = document.querySelector('.data-table-container') || document.querySelector('.page-content');
        if (!container) return;

        // Si no existe el contenedor de tabla, crearlo
        if (!document.getElementById('ticketsTableContainer')) {
            const tableContainer = document.createElement('section');
            tableContainer.id = 'ticketsTableContainer';
            tableContainer.className = 'data-table-container';
            container.appendChild(tableContainer);
        }

        const statusBadge = TableActions.createStatusBadge({
            open: { label: 'Abierto', class: 'badge-open' },
            in_progress: { label: 'En Progreso', class: 'badge-in-progress' },
            resolved: { label: 'Resuelto', class: 'badge-resolved' },
            closed: { label: 'Cerrado', class: 'badge-closed' }
        });

        this.table = new DataTable({
            container: document.getElementById('ticketsTableContainer'),
            columns: [
                { key: 'folio', label: 'Folio', className: 'cell-id' },
                { key: 'title', label: 'Titulo', className: 'cell-primary' },
                { key: 'category', label: 'Categoria', render: (v) => this.getCategoryLabel(v) },
                { key: 'priority', label: 'Prioridad', render: TableActions.priorityBadge },
                { key: 'status', label: 'Estado', render: statusBadge },
                { key: 'createdAt', label: 'Fecha', type: 'date' },
                TableActions.createActionsColumn(['view', 'edit', 'delete'])
            ],
            data: Store.getTickets(),
            searchFields: ['folio', 'title', 'description'],
            perPage: 10,
            emptyMessage: 'No hay tickets registrados',
            onRowClick: (row) => this.viewTicket(row.id),
            onAction: (action, row) => this.handleAction(action, row)
        });
    },

    getCategoryLabel(category) {
        const labels = {
            hardware: 'Hardware',
            software: 'Software',
            network: 'Red',
            other: 'Otro'
        };
        return labels[category] || category || '-';
    },

    // ========================================
    // EVENTOS
    // ========================================

    bindEvents() {
        // Busqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.table?.search(e.target.value);
            }, 300));
        }

        // Filtros
        ['statusFilter', 'categoryFilter', 'priorityFilter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.applyFilters());
            }
        });

        // Limpiar filtros
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('statusFilter').value = '';
            document.getElementById('categoryFilter').value = '';
            document.getElementById('priorityFilter').value = '';
            this.table?.setData(Store.getTickets());
        });

        // Nuevo ticket
        document.getElementById('newTicketBtn')?.addEventListener('click', () => {
            this.openTicketForm();
        });
    },

    applyFilters() {
        const filters = {
            status: document.getElementById('statusFilter')?.value,
            category: document.getElementById('categoryFilter')?.value,
            priority: document.getElementById('priorityFilter')?.value
        };

        this.table?.filter(filters);
    },

    // ========================================
    // ACCIONES
    // ========================================

    handleAction(action, ticket) {
        switch (action) {
            case 'view':
                this.viewTicket(ticket.id);
                break;
            case 'edit':
                this.openTicketForm(ticket);
                break;
            case 'delete':
                this.deleteTicket(ticket);
                break;
        }
    },

    // ========================================
    // FORMULARIO DE TICKET
    // ========================================

    async openTicketForm(ticket = null) {
        const isEdit = !!ticket;
        const employees = Store.getEmployees();
        const machines = Store.getMachines();

        const fields = [
            {
                name: 'title',
                label: 'Titulo',
                type: 'text',
                required: true,
                fullWidth: true,
                placeholder: 'Describe brevemente el problema'
            },
            {
                name: 'description',
                label: 'Descripcion',
                type: 'textarea',
                required: true,
                fullWidth: true,
                rows: 4,
                placeholder: 'Describe el problema con detalle'
            },
            {
                name: 'category',
                label: 'Categoria',
                type: 'select',
                required: true,
                options: [
                    { value: 'hardware', label: 'Hardware' },
                    { value: 'software', label: 'Software' },
                    { value: 'network', label: 'Red' },
                    { value: 'other', label: 'Otro' }
                ]
            },
            {
                name: 'priority',
                label: 'Prioridad',
                type: 'select',
                required: true,
                options: [
                    { value: 'low', label: 'Baja' },
                    { value: 'medium', label: 'Media' },
                    { value: 'high', label: 'Alta' },
                    { value: 'critical', label: 'Critica' }
                ]
            },
            {
                name: 'requesterId',
                label: 'Solicitante',
                type: 'select',
                options: employees.map(e => ({
                    value: e.id,
                    label: `${e.name} ${e.lastName || ''}`
                }))
            },
            {
                name: 'machineId',
                label: 'Maquina Relacionada',
                type: 'select',
                options: machines.map(m => ({
                    value: m.id,
                    label: `${m.name} (${m.serialNumber})`
                }))
            }
        ];

        if (isEdit) {
            fields.push({
                name: 'status',
                label: 'Estado',
                type: 'select',
                options: [
                    { value: 'open', label: 'Abierto' },
                    { value: 'in_progress', label: 'En Progreso' },
                    { value: 'resolved', label: 'Resuelto' },
                    { value: 'closed', label: 'Cerrado' }
                ]
            });
        }

        const result = await Modal.form({
            title: isEdit ? 'Editar Ticket' : 'Nuevo Ticket',
            fields,
            data: ticket || { priority: 'medium', category: 'software' },
            submitText: isEdit ? 'Actualizar' : 'Crear Ticket',
            size: 'lg'
        });

        if (result) {
            if (isEdit) {
                result.id = ticket.id;
            }
            
            const saved = Store.saveTicket(result);
            this.table?.setData(Store.getTickets());
            Sidebar.updateBadges();
            
            Toast.success(
                isEdit ? 'Ticket actualizado correctamente' : `Ticket ${saved.folio} creado correctamente`
            );
        }
    },

    // ========================================
    // VER TICKET
    // ========================================

    viewTicket(ticketId) {
        const ticket = Store.getTicketById(ticketId);
        if (!ticket) return;

        const requester = ticket.requesterId ? Store.getEmployeeById(ticket.requesterId) : null;
        const machine = ticket.machineId ? Store.getMachineById(ticket.machineId) : null;

        Modal.open({
            title: `Ticket ${ticket.folio}`,
            size: 'lg',
            content: `
                <div class="ticket-detail">
                    <div class="ticket-header" style="margin-bottom: 1.5rem;">
                        <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">${Utils.escapeHtml(ticket.title)}</h3>
                        <div style="display: flex; gap: 0.5rem;">
                            ${TableActions.priorityBadge(ticket.priority)}
                            ${TableActions.createStatusBadge({
                                open: { label: 'Abierto', class: 'badge-open' },
                                in_progress: { label: 'En Progreso', class: 'badge-in-progress' },
                                resolved: { label: 'Resuelto', class: 'badge-resolved' },
                                closed: { label: 'Cerrado', class: 'badge-closed' }
                            })(ticket.status)}
                        </div>
                    </div>
                    
                    <div class="ticket-info" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Categoria</label>
                            <p style="font-weight: 500;">${this.getCategoryLabel(ticket.category)}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Fecha de Creacion</label>
                            <p style="font-weight: 500;">${Utils.formatDateTime(ticket.createdAt)}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Solicitante</label>
                            <p style="font-weight: 500;">${requester ? `${requester.name} ${requester.lastName || ''}` : '-'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Maquina</label>
                            <p style="font-weight: 500;">${machine ? `${machine.name} (${machine.serialNumber})` : '-'}</p>
                        </div>
                    </div>
                    
                    <div class="ticket-description" style="margin-bottom: 1.5rem;">
                        <label style="font-size: 0.75rem; color: var(--text-tertiary);">Descripcion</label>
                        <p style="margin-top: 0.5rem; white-space: pre-wrap;">${Utils.escapeHtml(ticket.description || 'Sin descripcion')}</p>
                    </div>
                    
                    ${ticket.history?.length > 0 ? `
                        <div class="ticket-history">
                            <label style="font-size: 0.75rem; color: var(--text-tertiary);">Historial</label>
                            <div style="margin-top: 0.5rem; max-height: 200px; overflow-y: auto;">
                                ${ticket.history.map(h => `
                                    <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); font-size: 0.875rem;">
                                        <span style="color: var(--text-tertiary);">${Utils.formatDateTime(h.timestamp)}</span>
                                        <span> - ${this.getHistoryActionLabel(h)}</span>
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

        // Manejar accion de editar
        Modal.getActiveModal()?.addEventListener('modal-action', (e) => {
            if (e.detail.action === 'edit') {
                Modal.close();
                this.openTicketForm(ticket);
            }
        });
    },

    getHistoryActionLabel(history) {
        if (history.action === 'created') return 'Ticket creado';
        if (history.action === 'status_change') {
            return `Estado cambiado de "${this.getStatusLabel(history.from)}" a "${this.getStatusLabel(history.to)}"`;
        }
        return history.action;
    },

    getStatusLabel(status) {
        const labels = {
            open: 'Abierto',
            in_progress: 'En Progreso',
            resolved: 'Resuelto',
            closed: 'Cerrado'
        };
        return labels[status] || status;
    },

    // ========================================
    // ELIMINAR TICKET
    // ========================================

    async deleteTicket(ticket) {
        const confirmed = await Modal.confirmDelete(`Ticket ${ticket.folio}`);
        
        if (confirmed) {
            Store.deleteTicket(ticket.id);
            this.table?.setData(Store.getTickets());
            Sidebar.updateBadges();
            Toast.success('Ticket eliminado correctamente');
        }
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    TicketsModule.init();
});

window.TicketsModule = TicketsModule;

