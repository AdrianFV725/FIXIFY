// ========================================
// TICKETS MODULE
// Gestion de tickets de soporte
// ========================================

const TicketsModule = {
    tickets: [],
    filteredTickets: [],
    currentView: 'table', // 'table' o 'cards'
    VIEW_PREFERENCE_KEY: 'fixify-tickets-view', // Key para localStorage

    // ========================================
    // INICIALIZACION
    // ========================================

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        // Cargar la preferencia de vista guardada
        this.loadViewPreference();

        await this.loadData();
        this.filteredTickets = [...this.tickets];
        this.renderStats();
        this.renderFilters();
        this.renderTable();
        this.renderCards();
        this.bindEvents();
        this.updateViewVisibility();
        this.updateViewToggleButtons();
    },

    // Cargar preferencia de vista desde localStorage
    loadViewPreference() {
        const savedView = localStorage.getItem(this.VIEW_PREFERENCE_KEY);
        if (savedView && (savedView === 'table' || savedView === 'cards')) {
            this.currentView = savedView;
        }
    },

    // Guardar preferencia de vista en localStorage
    saveViewPreference() {
        localStorage.setItem(this.VIEW_PREFERENCE_KEY, this.currentView);
    },

    async loadData() {
        try {
            this.tickets = await Store.getTickets() || [];
            this.filteredTickets = [...this.tickets];
        } catch (e) {
            console.error('Error al obtener tickets:', e);
            this.tickets = [];
            this.filteredTickets = [];
        }
    },

    // ========================================
    // ESTADISTICAS
    // ========================================

    renderStats() {
        const container = document.getElementById('ticketStats');
        if (!container) return;

        const stats = {
            total: this.tickets.length,
            open: this.tickets.filter(t => t.status === 'open').length,
            inProgress: this.tickets.filter(t => t.status === 'in_progress').length,
            resolved: this.tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
        };

        container.innerHTML = `
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.total}</span>
                    <span class="mini-stat-label">Total Tickets</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.open}</span>
                    <span class="mini-stat-label">Abiertos</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(249, 115, 22, 0.1); color: #f97316;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.inProgress}</span>
                    <span class="mini-stat-label">En Progreso</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #22c55e;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.resolved}</span>
                    <span class="mini-stat-label">Resueltos</span>
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

        container.innerHTML = `
            <div class="filter-group">
                <input type="text" class="filter-input" id="searchInput" placeholder="Buscar por folio, titulo...">
            </div>
            <div class="filter-group">
                <label class="filter-label">Estado:</label>
                <select class="filter-select" id="statusFilter">
                    <option value="">Todos</option>
                    <option value="open">Abierto</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="resolved">Resuelto</option>
                    <option value="closed">Cerrado</option>
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Categoria:</label>
                <select class="filter-select" id="categoryFilter">
                    <option value="">Todas</option>
                    <option value="hardware">Hardware</option>
                    <option value="software">Software</option>
                    <option value="network">Red</option>
                    <option value="other">Otro</option>
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Prioridad:</label>
                <select class="filter-select" id="priorityFilter">
                    <option value="">Todas</option>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="critical">Critica</option>
                </select>
            </div>
            <button class="filter-btn" id="clearFilters">Limpiar</button>
        `;
    },

    applyFilters() {
        const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const priorityFilter = document.getElementById('priorityFilter')?.value || '';

        this.filteredTickets = this.tickets.filter(t => {
            const matchesSearch = !searchTerm || 
                (t.folio || '').toLowerCase().includes(searchTerm) ||
                (t.title || '').toLowerCase().includes(searchTerm) ||
                (t.description || '').toLowerCase().includes(searchTerm);

            const matchesStatus = !statusFilter || t.status === statusFilter;
            const matchesCategory = !categoryFilter || t.category === categoryFilter;
            const matchesPriority = !priorityFilter || t.priority === priorityFilter;

            return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
        });

        this.renderTable();
        this.renderCards();
    },

    // ========================================
    // HELPERS DE RENDERIZADO
    // ========================================

    getStatusBadge(status) {
        const config = {
            open: { label: 'Abierto', class: 'badge-open' },
            in_progress: { label: 'En Progreso', class: 'badge-in-progress' },
            resolved: { label: 'Resuelto', class: 'badge-resolved' },
            closed: { label: 'Cerrado', class: 'badge-closed' }
        };
        const c = config[status] || { label: status, class: 'badge' };
        return `<span class="badge ${c.class}">${c.label}</span>`;
    },

    getPriorityBadge(priority) {
        const config = {
            low: { label: 'Baja', class: 'badge-low' },
            medium: { label: 'Media', class: 'badge-medium' },
            high: { label: 'Alta', class: 'badge-high' },
            critical: { label: 'Critica', class: 'badge-critical' }
        };
        const c = config[priority] || { label: priority, class: 'badge' };
        return `<span class="badge ${c.class}">${c.label}</span>`;
    },

    getCategoryLabel(category) {
        const labels = { hardware: 'Hardware', software: 'Software', network: 'Red', other: 'Otro' };
        return labels[category] || category || '-';
    },

    getCategoryIcon(category) {
        const icons = {
            hardware: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
            software: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
            network: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
            other: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
        };
        return icons[category] || icons.other;
    },

    getCategoryColor(category) {
        const colors = {
            hardware: '#3b82f6',
            software: '#a855f7',
            network: '#22c55e',
            other: '#6b7280'
        };
        return colors[category] || colors.other;
    },

    getPriorityColor(priority) {
        const colors = {
            low: '#6b7280',
            medium: '#f97316',
            high: '#ef4444',
            critical: '#dc2626'
        };
        return colors[priority] || colors.low;
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-MX', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    },

    formatTimeAgo(date) {
        if (!date) return '-';
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `hace ${diffMins} min`;
        if (diffHours < 24) return `hace ${diffHours}h`;
        if (diffDays < 7) return `hace ${diffDays}d`;
        return this.formatDate(date);
    },

    // ========================================
    // VISTA DE TABLA
    // ========================================

    renderTable() {
        const table = document.getElementById('ticketsTable');
        if (!table) return;

        const canResolve = (status) => status === 'open' || status === 'in_progress';

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Folio</th>
                    <th>Titulo</th>
                    <th>Categoria</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${this.filteredTickets.length === 0 ? `
                    <tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                        ${this.tickets.length === 0 ? 'No hay tickets registrados' : 'No se encontraron resultados'}
                    </td></tr>
                ` : this.filteredTickets.map(t => `
                    <tr data-id="${t.id}">
                        <td style="font-family: monospace; font-size: 0.8rem;">${t.folio || '-'}</td>
                        <td>
                            <div style="max-width: 250px;">
                                <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(t.title || '')}</div>
                                <div style="font-size: 0.75rem; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(t.description || '').substring(0, 50)}${(t.description || '').length > 50 ? '...' : ''}</div>
                            </div>
                        </td>
                        <td>${this.getCategoryLabel(t.category)}</td>
                        <td>${this.getPriorityBadge(t.priority)}</td>
                        <td>${this.getStatusBadge(t.status)}</td>
                        <td style="font-size: 0.8rem;">${this.formatTimeAgo(t.createdAt)}</td>
                        <td class="cell-actions">
                            ${canResolve(t.status) ? `
                                <button class="btn btn-sm" style="background: #22c55e; color: white; padding: 0.35rem 0.6rem; font-size: 0.75rem;" onclick="TicketsModule.resolveTicket('${t.id}')" title="Resolver">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    Resolver
                                </button>
                            ` : ''}
                            <button class="btn-icon btn-ghost sm" onclick="TicketsModule.editTicket('${t.id}')" title="Editar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn-icon btn-ghost sm" onclick="TicketsModule.deleteTicket('${t.id}')" title="Eliminar">
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

        if (this.filteredTickets.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    </div>
                    <h3 class="empty-state-title">${this.tickets.length === 0 ? 'No hay tickets registrados' : 'No se encontraron resultados'}</h3>
                    <p class="empty-state-text">${this.tickets.length === 0 ? 'Crea un nuevo ticket para comenzar' : 'Intenta con otros filtros'}</p>
                </div>
            `;
            return;
        }

        const canResolve = (status) => status === 'open' || status === 'in_progress';

        container.innerHTML = this.filteredTickets.map(t => `
            <div class="card ticket-card" data-id="${t.id}" style="border-left: 4px solid ${this.getPriorityColor(t.priority)};">
                <div class="card-header">
                    <div class="card-icon" style="background: ${this.getCategoryColor(t.category)}20; color: ${this.getCategoryColor(t.category)};">
                        ${this.getCategoryIcon(t.category)}
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem;">
                        ${this.getStatusBadge(t.status)}
                        ${this.getPriorityBadge(t.priority)}
                    </div>
                </div>
                <div class="card-body">
                    <div style="font-family: monospace; font-size: 0.7rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">${t.folio || '-'}</div>
                    <h3 class="card-title">${this.escapeHtml(t.title || 'Sin titulo')}</h3>
                    <p class="card-subtitle" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${this.escapeHtml(t.description || 'Sin descripcion')}</p>
                    <div class="card-details" style="margin-top: 1rem;">
                        <div class="card-detail">
                            <span class="detail-label">Categoria:</span>
                            <span class="detail-value">${this.getCategoryLabel(t.category)}</span>
                        </div>
                        <div class="card-detail">
                            <span class="detail-label">Creado:</span>
                            <span class="detail-value">${this.formatTimeAgo(t.createdAt)}</span>
                        </div>
                    </div>
                </div>
                <div class="card-footer" style="flex-wrap: wrap;">
                    ${canResolve(t.status) ? `
                        <button class="btn btn-sm" style="background: #22c55e; color: white;" onclick="TicketsModule.resolveTicket('${t.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Resolver
                        </button>
                    ` : ''}
                    <button class="btn btn-ghost btn-sm" onclick="TicketsModule.editTicket('${t.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Editar
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="TicketsModule.deleteTicket('${t.id}')" style="color: #ef4444;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    },

    // ========================================
    // TOGGLE DE VISTAS
    // ========================================

    setView(view) {
        this.currentView = view;
        this.saveViewPreference(); // Guardar la preferencia
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

    // ========================================
    // EVENTOS
    // ========================================

    bindEvents() {
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
        document.getElementById('statusFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('categoryFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('priorityFilter')?.addEventListener('change', () => this.applyFilters());

        // Limpiar filtros
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('statusFilter').value = '';
            document.getElementById('categoryFilter').value = '';
            document.getElementById('priorityFilter').value = '';
            this.applyFilters();
        });

        // Nuevo ticket
        document.getElementById('newTicketBtn')?.addEventListener('click', () => {
            this.openTicketForm();
        });
    },

    // ========================================
    // CRUD OPERATIONS
    // ========================================

    getTicketById(id) {
        return this.tickets.find(t => t.id === id);
    },

    async editTicket(id) {
        const ticket = this.getTicketById(id);
        if (ticket) {
            await this.openTicketForm(ticket);
        } else {
            this.showToast('Error: Ticket no encontrado', 'error');
        }
    },

    async resolveTicket(id) {
        const ticket = this.getTicketById(id);
        if (!ticket) {
            this.showToast('Error: Ticket no encontrado', 'error');
            return;
        }

        // Mostrar modal de resolucion
        const modalHtml = `
            <div class="modal-overlay active" id="resolveModal">
                <div class="modal" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Resolver Ticket</h2>
                        <button class="modal-close" onclick="document.getElementById('resolveModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                            <div style="font-family: monospace; font-size: 0.75rem; color: var(--text-tertiary);">${ticket.folio}</div>
                            <div style="font-weight: 600; margin-top: 0.25rem;">${this.escapeHtml(ticket.title)}</div>
                        </div>
                        <form id="resolveForm" class="form">
                            <div class="form-group">
                                <label class="form-label">Descripcion de la solucion <span class="required">*</span></label>
                                <textarea name="resolution" class="form-textarea" required rows="4" placeholder="Describe como se resolvio el problema...">${ticket.resolution || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Marcar como:</label>
                                <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                        <input type="radio" name="newStatus" value="resolved" checked style="accent-color: var(--accent-primary);">
                                        <span>Resuelto</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                        <input type="radio" name="newStatus" value="closed" style="accent-color: var(--accent-primary);">
                                        <span>Cerrado</span>
                                    </label>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('resolveModal').remove()">Cancelar</button>
                        <button type="submit" form="resolveForm" class="btn btn-primary" style="background: #22c55e;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Resolver Ticket
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('resolveForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const resolution = formData.get('resolution');
            const newStatus = formData.get('newStatus');

            try {
                ticket.status = newStatus;
                ticket.resolution = resolution;
                ticket.resolvedAt = new Date().toISOString();
                ticket.resolvedBy = Auth?.getCurrentUser()?.name || 'Admin';

                await Store.saveTicket(ticket);

                document.getElementById('resolveModal').remove();
                await this.loadData();
                this.filteredTickets = [...this.tickets];
                this.renderStats();
                this.applyFilters();
                this.showToast('Ticket resuelto correctamente', 'success');
            } catch (error) {
                console.error('Error al resolver ticket:', error);
                this.showToast('Error al resolver el ticket', 'error');
            }
        });
    },

    async deleteTicket(id) {
        const ticket = this.getTicketById(id);
        const name = ticket?.folio ? `${ticket.folio} - ${ticket.title || 'Sin titulo'}` : 'este ticket';
        
        const confirmed = await Modal.confirmDelete(name, 'ticket');
        if (confirmed) {
            try {
                await Store.deleteTicket(id);
                await this.loadData();
                this.filteredTickets = [...this.tickets];
                this.renderStats();
                this.applyFilters();
                this.showToast('Ticket eliminado correctamente', 'success');
            } catch (error) {
                console.error('Error al eliminar ticket:', error);
                this.showToast('Error al eliminar el ticket', 'error');
            }
        }
    },

    // ========================================
    // FORMULARIO DE TICKET
    // ========================================

    async openTicketForm(ticket = null) {
        const isEdit = !!ticket;
        let employees = [], machines = [];
        
        try {
            employees = await Store.getEmployees() || [];
            machines = await Store.getMachines() || [];
        } catch (e) {}

        const modalHtml = `
            <div class="modal-overlay active" id="ticketModal">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h2 class="modal-title">${isEdit ? 'Editar Ticket' : 'Nuevo Ticket'}</h2>
                        <button class="modal-close" onclick="document.getElementById('ticketModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="ticketForm" class="form">
                            <div class="form-group">
                                <label class="form-label">Titulo <span class="required">*</span></label>
                                <input type="text" name="title" class="form-input" required value="${this.escapeHtml(ticket?.title || '')}" placeholder="Ej: Pantalla no enciende">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Descripcion <span class="required">*</span></label>
                                <textarea name="description" class="form-textarea" required rows="3" placeholder="Describe el problema detalladamente...">${this.escapeHtml(ticket?.description || '')}</textarea>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Categoria <span class="required">*</span></label>
                                    <select name="category" class="form-select" required>
                                        <option value="">Seleccionar...</option>
                                        <option value="hardware" ${ticket?.category === 'hardware' ? 'selected' : ''}>Hardware</option>
                                        <option value="software" ${ticket?.category === 'software' ? 'selected' : ''}>Software</option>
                                        <option value="network" ${ticket?.category === 'network' ? 'selected' : ''}>Red</option>
                                        <option value="other" ${ticket?.category === 'other' ? 'selected' : ''}>Otro</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Prioridad <span class="required">*</span></label>
                                    <select name="priority" class="form-select" required>
                                        <option value="low" ${ticket?.priority === 'low' ? 'selected' : ''}>Baja</option>
                                        <option value="medium" ${ticket?.priority === 'medium' || !ticket ? 'selected' : ''}>Media</option>
                                        <option value="high" ${ticket?.priority === 'high' ? 'selected' : ''}>Alta</option>
                                        <option value="critical" ${ticket?.priority === 'critical' ? 'selected' : ''}>Critica</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Reportado por</label>
                                    <select name="reportedBy" class="form-select">
                                        <option value="">Sin asignar</option>
                                        ${employees.map(e => `<option value="${e.id}" ${ticket?.reportedBy === e.id ? 'selected' : ''}>${this.escapeHtml(e.name || '')} ${this.escapeHtml(e.lastName || '')}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Maquina relacionada</label>
                                    <select name="machineId" class="form-select">
                                        <option value="">Ninguna</option>
                                        ${machines.map(m => `<option value="${m.id}" ${ticket?.machineId === m.id ? 'selected' : ''}>${this.escapeHtml(m.name || '')} (${m.serialNumber || 'S/N'})</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            
                            ${isEdit ? `
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Estado</label>
                                        <select name="status" class="form-select">
                                            <option value="open" ${ticket?.status === 'open' ? 'selected' : ''}>Abierto</option>
                                            <option value="in_progress" ${ticket?.status === 'in_progress' ? 'selected' : ''}>En Progreso</option>
                                            <option value="resolved" ${ticket?.status === 'resolved' ? 'selected' : ''}>Resuelto</option>
                                            <option value="closed" ${ticket?.status === 'closed' ? 'selected' : ''}>Cerrado</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Resolucion / Notas</label>
                                    <textarea name="resolution" class="form-textarea" rows="2" placeholder="Describe la solucion aplicada...">${this.escapeHtml(ticket?.resolution || '')}</textarea>
                                </div>
                            ` : ''}
                            
                            <input type="hidden" name="id" value="${ticket?.id || ''}">
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('ticketModal').remove()">Cancelar</button>
                        <button type="submit" form="ticketForm" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear Ticket'}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('ticketForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                if (data.id) {
                    const existing = this.getTicketById(data.id);
                    if (existing) {
                        Object.assign(existing, data);
                        await Store.saveTicket(existing);
                    }
                } else {
                    delete data.id;
                    await Store.saveTicket(data);
                }

                document.getElementById('ticketModal').remove();
                await this.loadData();
                this.filteredTickets = [...this.tickets];
                this.renderStats();
                this.applyFilters();
                this.showToast(isEdit ? 'Ticket actualizado correctamente' : 'Ticket creado correctamente', 'success');
            } catch (error) {
                console.error('Error al guardar ticket:', error);
                this.showToast('Error al guardar el ticket', 'error');
            }
        });
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

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(() => TicketsModule.init(), 100);
});

window.TicketsModule = TicketsModule;
