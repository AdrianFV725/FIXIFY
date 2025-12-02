// ========================================
// TICKETS MODULE
// Gestion de tickets de soporte
// ========================================

const TicketsModule = {
    tickets: [],
    filteredTickets: [],
    currentView: 'cards', // 'table' o 'cards' - Por defecto tarjetas
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
        await this.renderFilters();
        this.renderTable();
        this.renderCards();
        this.bindEvents();
        
        // Aplicar la vista guardada
        this.updateViewVisibility();
        this.updateViewToggleButtons();
        
        console.log('[Tickets] Vista actual:', this.currentView);
    },

    // Cargar preferencia de vista desde localStorage
    loadViewPreference() {
        try {
            const savedView = localStorage.getItem(this.VIEW_PREFERENCE_KEY);
            console.log('[Tickets] Vista guardada en localStorage:', savedView);
            if (savedView && (savedView === 'table' || savedView === 'cards')) {
                this.currentView = savedView;
            }
        } catch (e) {
            console.warn('[Tickets] Error al cargar preferencia de vista:', e);
        }
    },

    // Guardar preferencia de vista en localStorage
    saveViewPreference() {
        try {
            localStorage.setItem(this.VIEW_PREFERENCE_KEY, this.currentView);
            console.log('[Tickets] Vista guardada:', this.currentView);
        } catch (e) {
            console.warn('[Tickets] Error al guardar preferencia de vista:', e);
        }
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

    async renderFilters() {
        const container = document.getElementById('filtersBar');
        if (!container) return;

        // Cargar temas unicos de las categorias
        let categories = [];
        try {
            categories = await Store.getCategories() || [];
        } catch (e) {}
        const temas = [...new Set(categories.map(c => c.tema))].filter(Boolean);

        container.innerHTML = `
            <div class="filter-search">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" id="searchInput" placeholder="Buscar...">
            </div>
            <div class="filter-selects">
                <select class="filter-select-compact" id="tipoFilter">
                    <option value="">Tipo</option>
                    <option value="incidencia">Incidencia</option>
                    <option value="requerimiento">Requerimiento</option>
                </select>
                <select class="filter-select-compact" id="statusFilter">
                    <option value="">Estado</option>
                    <option value="open">Abierto</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="resolved">Resuelto</option>
                    <option value="closed">Cerrado</option>
                </select>
                <select class="filter-select-compact" id="temaFilter">
                    <option value="">Tema</option>
                    ${temas.map(t => `<option value="${this.escapeHtml(t)}">${this.escapeHtml(t)}</option>`).join('')}
                </select>
                <select class="filter-select-compact" id="servicioFilter">
                    <option value="">Servicio</option>
                    <option value="hardware">Hardware</option>
                    <option value="software">Software</option>
                    <option value="network">Red</option>
                    <option value="other">Otro</option>
                </select>
                <select class="filter-select-compact" id="priorityFilter">
                    <option value="">Prioridad</option>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="critical">Critica</option>
                </select>
            </div>
            <button class="filter-clear-btn" id="clearFilters" title="Limpiar filtros">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
        `;
    },

    applyFilters() {
        const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
        const tipoFilter = document.getElementById('tipoFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const temaFilter = document.getElementById('temaFilter')?.value || '';
        const servicioFilter = document.getElementById('servicioFilter')?.value || '';
        const priorityFilter = document.getElementById('priorityFilter')?.value || '';

        this.filteredTickets = this.tickets.filter(t => {
            const matchesSearch = !searchTerm || 
                (t.folio || '').toLowerCase().includes(searchTerm) ||
                (t.description || '').toLowerCase().includes(searchTerm) ||
                (t.categoriaElemento || '').toLowerCase().includes(searchTerm) ||
                (t.categoriaClave || '').toLowerCase().includes(searchTerm) ||
                (t.contactoNombre || '').toLowerCase().includes(searchTerm);

            const matchesTipo = !tipoFilter || t.tipo === tipoFilter;
            const matchesStatus = !statusFilter || t.status === statusFilter;
            const matchesTema = !temaFilter || t.tema === temaFilter;
            const matchesServicio = !servicioFilter || t.servicio === servicioFilter || t.category === servicioFilter;
            const matchesPriority = !priorityFilter || t.priority === priorityFilter;

            return matchesSearch && matchesTipo && matchesStatus && matchesTema && matchesServicio && matchesPriority;
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

        const getTipoBadge = (tipo) => {
            if (tipo === 'requerimiento') {
                return '<span class="badge" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6; font-size: 0.7rem;">REQ</span>';
            }
            return '<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; font-size: 0.7rem;">INC</span>';
        };

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Folio</th>
                    <th>Tipo</th>
                    <th>Elemento</th>
                    <th>Contacto</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${this.filteredTickets.length === 0 ? `
                    <tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                        ${this.tickets.length === 0 ? 'No hay tickets registrados' : 'No se encontraron resultados'}
                    </td></tr>
                ` : this.filteredTickets.map(t => `
                    <tr data-id="${t.id}">
                        <td style="font-family: monospace; font-size: 0.8rem;">${t.folio || '-'}</td>
                        <td>${getTipoBadge(t.tipo)}</td>
                        <td>
                            <div style="max-width: 220px;">
                                <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${t.categoriaClave ? `<span style="font-family: monospace; font-size: 0.75rem; background: var(--bg-tertiary); padding: 0.1rem 0.3rem; border-radius: 3px; margin-right: 0.25rem;">${this.escapeHtml(t.categoriaClave)}</span>` : ''}
                                    ${this.escapeHtml(t.categoriaElemento || t.title || '')}
                                </div>
                                <div style="font-size: 0.75rem; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(t.description || '').substring(0, 40)}${(t.description || '').length > 40 ? '...' : ''}</div>
                            </div>
                        </td>
                        <td>
                            <div style="font-size: 0.85rem;">${this.escapeHtml(t.contactoNombre || '-')}</div>
                            ${t.machineSerial ? `<div style="font-size: 0.7rem; color: var(--text-tertiary); font-family: monospace;">${this.escapeHtml(t.machineSerial)}</div>` : ''}
                        </td>
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

        const getTipoLabel = (tipo) => {
            return tipo === 'requerimiento' ? 'Requerimiento' : 'Incidencia';
        };

        const getTipoColor = (tipo) => {
            return tipo === 'requerimiento' ? '#8b5cf6' : '#ef4444';
        };

        container.innerHTML = this.filteredTickets.map(t => `
            <div class="card ticket-card" data-id="${t.id}" style="border-left: 4px solid ${this.getPriorityColor(t.priority)};">
                <div class="card-header">
                    <div class="card-icon" style="background: ${this.getCategoryColor(t.servicio || t.category)}20; color: ${this.getCategoryColor(t.servicio || t.category)};">
                        ${this.getCategoryIcon(t.servicio || t.category)}
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem;">
                        <span class="badge" style="background: ${getTipoColor(t.tipo)}15; color: ${getTipoColor(t.tipo)}; font-size: 0.7rem;">${getTipoLabel(t.tipo)}</span>
                        ${this.getStatusBadge(t.status)}
                        ${this.getPriorityBadge(t.priority)}
                    </div>
                </div>
                <div class="card-body">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <span style="font-family: monospace; font-size: 0.7rem; color: var(--text-tertiary);">${t.folio || '-'}</span>
                        ${t.categoriaClave ? `<span style="font-family: monospace; font-size: 0.7rem; background: var(--bg-tertiary); padding: 0.15rem 0.4rem; border-radius: 4px;">${this.escapeHtml(t.categoriaClave)}</span>` : ''}
                    </div>
                    <h3 class="card-title">${this.escapeHtml(t.categoriaElemento || t.title || 'Sin titulo')}</h3>
                    <p class="card-subtitle" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${this.escapeHtml(t.description || 'Sin descripcion')}</p>
                    <div class="card-details" style="margin-top: 1rem;">
                        <div class="card-detail">
                            <span class="detail-label">Tema:</span>
                            <span class="detail-value">${this.escapeHtml(t.tema || '-')}</span>
                        </div>
                        <div class="card-detail">
                            <span class="detail-label">Servicio:</span>
                            <span class="detail-value">${this.getCategoryLabel(t.servicio || t.category)}</span>
                        </div>
                        <div class="card-detail">
                            <span class="detail-label">Contacto:</span>
                            <span class="detail-value">${this.escapeHtml(t.contactoNombre || '-')}</span>
                        </div>
                        ${t.machineSerial ? `
                        <div class="card-detail">
                            <span class="detail-label">Maquina:</span>
                            <span class="detail-value" style="font-family: monospace; font-size: 0.8rem;">${this.escapeHtml(t.machineSerial)}</span>
                        </div>
                        ` : ''}
                        <div class="card-detail">
                            <span class="detail-label">Asignado a:</span>
                            <span class="detail-value">${this.escapeHtml(t.asignadoNombre || 'Sin asignar')}</span>
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
        document.getElementById('tipoFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('temaFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('servicioFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('priorityFilter')?.addEventListener('change', () => this.applyFilters());

        // Limpiar filtros
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
            if (document.getElementById('tipoFilter')) document.getElementById('tipoFilter').value = '';
            if (document.getElementById('statusFilter')) document.getElementById('statusFilter').value = '';
            if (document.getElementById('temaFilter')) document.getElementById('temaFilter').value = '';
            if (document.getElementById('servicioFilter')) document.getElementById('servicioFilter').value = '';
            if (document.getElementById('priorityFilter')) document.getElementById('priorityFilter').value = '';
            this.applyFilters();
        });

        // Boton de categorias
        document.getElementById('manageCategoriesBtn')?.addEventListener('click', () => {
            this.openCategoriesModal();
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
        let employees = [], users = [], categories = [], machines = [], machineAssignments = [];
        
        try {
            [employees, users, categories, machines, machineAssignments] = await Promise.all([
                Store.getEmployees() || [],
                Store.getUsers() || [],
                Store.getCategories() || [],
                Store.getMachines() || [],
                Store.getMachineAssignments() || []
            ]);
        } catch (e) {
            console.error('Error cargando datos para formulario:', e);
        }

        // Obtener temas unicos de las categorias
        const temas = [...new Set(categories.map(c => c.tema))].filter(Boolean);
        
        // Servicios disponibles
        const servicios = [
            { value: 'software', label: 'Software' },
            { value: 'hardware', label: 'Hardware' },
            { value: 'network', label: 'Red' },
            { value: 'other', label: 'Otro' }
        ];

        const modalHtml = `
            <div class="modal-overlay active" id="ticketModal">
                <div class="modal modal-lg" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2 class="modal-title">${isEdit ? 'Editar Ticket' : 'Nuevo Ticket'}</h2>
                        <button class="modal-close" onclick="document.getElementById('ticketModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                        <form id="ticketForm" class="form">
                            <!-- Tipo de Ticket -->
                            <div class="form-group">
                                <label class="form-label">Tipo de Ticket <span class="required">*</span></label>
                                <div class="ticket-type-toggle" style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                                    <label class="type-option ${ticket?.tipo === 'incidencia' || !ticket ? 'active' : ''}" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1rem; border: 2px solid var(--border-color); border-radius: 10px; cursor: pointer; transition: all 0.2s ease;">
                                        <input type="radio" name="tipo" value="incidencia" ${ticket?.tipo === 'incidencia' || !ticket ? 'checked' : ''} style="display: none;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                        <span>Incidencia</span>
                                    </label>
                                    <label class="type-option ${ticket?.tipo === 'requerimiento' ? 'active' : ''}" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1rem; border: 2px solid var(--border-color); border-radius: 10px; cursor: pointer; transition: all 0.2s ease;">
                                        <input type="radio" name="tipo" value="requerimiento" ${ticket?.tipo === 'requerimiento' ? 'checked' : ''} style="display: none;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                                        <span>Requerimiento</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Categoria: Tema > Servicio > Elemento -->
                            <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
                                <div style="font-weight: 600; margin-bottom: 0.75rem; color: var(--text-primary);">Clasificacion del Ticket</div>
                                <div class="form-row" style="margin-bottom: 0.75rem;">
                                    <div class="form-group" style="margin-bottom: 0;">
                                        <label class="form-label">Tema <span class="required">*</span></label>
                                        <select name="tema" id="ticketTema" class="form-select" required>
                                            <option value="">Seleccionar tema...</option>
                                            ${temas.map(t => `<option value="${this.escapeHtml(t)}" ${ticket?.tema === t ? 'selected' : ''}>${this.escapeHtml(t)}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group" style="margin-bottom: 0;">
                                        <label class="form-label">Servicio <span class="required">*</span></label>
                                        <select name="servicio" id="ticketServicio" class="form-select" required>
                                            <option value="">Seleccionar servicio...</option>
                                            ${servicios.map(s => `<option value="${s.value}" ${ticket?.servicio === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label">Elemento <span class="required">*</span></label>
                                    <select name="categoriaId" id="ticketElemento" class="form-select" required>
                                        <option value="">Seleccionar elemento...</option>
                                        ${categories.filter(c => c.tema === ticket?.tema && c.servicio === ticket?.servicio).map(c => 
                                            `<option value="${c.id}" ${ticket?.categoriaId === c.id ? 'selected' : ''}>[${this.escapeHtml(c.clave)}] ${this.escapeHtml(c.elemento)}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Descripcion -->
                            <div class="form-group">
                                <label class="form-label">Descripcion <span class="required">*</span></label>
                                <textarea name="description" class="form-textarea" required rows="3" placeholder="Describe el problema o requerimiento detalladamente...">${this.escapeHtml(ticket?.description || '')}</textarea>
                            </div>
                            
                            <!-- Contacto y Maquina -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Contacto (Empleado) <span class="required">*</span></label>
                                    <select name="contactoId" id="ticketContacto" class="form-select" required>
                                        <option value="">Seleccionar empleado...</option>
                                        ${employees.map(e => `<option value="${e.id}" ${ticket?.contactoId === e.id ? 'selected' : ''}>${this.escapeHtml(e.name || '')} ${this.escapeHtml(e.lastName || '')}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Maquina Asignada</label>
                                    <input type="text" id="ticketMachineDisplay" class="form-input" readonly placeholder="Se llenara automaticamente" value="${ticket?.machineSerial || ''}" style="background: var(--bg-tertiary);">
                                    <input type="hidden" name="machineId" id="ticketMachineId" value="${ticket?.machineId || ''}">
                                    <input type="hidden" name="machineSerial" id="ticketMachineSerial" value="${ticket?.machineSerial || ''}">
                                </div>
                            </div>
                            
                            <!-- Asignado a y Prioridad -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Asignado a (Tecnico)</label>
                                    <select name="asignadoId" class="form-select">
                                        <option value="">Sin asignar</option>
                                        ${users.filter(u => u.status === 'active').map(u => `<option value="${u.id}" ${ticket?.asignadoId === u.id ? 'selected' : ''}>${this.escapeHtml(u.name || u.email)}</option>`).join('')}
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
                                    <label class="form-label">Comentario de Cierre / Resolucion</label>
                                    <textarea name="resolution" class="form-textarea" rows="2" placeholder="Describe la solucion aplicada...">${this.escapeHtml(ticket?.resolution || '')}</textarea>
                                </div>
                            ` : ''}
                            
                            <input type="hidden" name="id" value="${ticket?.id || ''}">
                            <input type="hidden" name="contactoNombre" id="ticketContactoNombre" value="${ticket?.contactoNombre || ''}">
                            <input type="hidden" name="asignadoNombre" id="ticketAsignadoNombre" value="${ticket?.asignadoNombre || ''}">
                            <input type="hidden" name="categoriaClave" id="ticketCategoriaClave" value="${ticket?.categoriaClave || ''}">
                            <input type="hidden" name="categoriaElemento" id="ticketCategoriaElemento" value="${ticket?.categoriaElemento || ''}">
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('ticketModal').remove()">Cancelar</button>
                        <button type="submit" form="ticketForm" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear Ticket'}</button>
                    </div>
                </div>
            </div>
            <style>
                .type-option.active {
                    border-color: var(--accent-primary) !important;
                    background: var(--accent-light) !important;
                    color: var(--accent-primary) !important;
                }
                .type-option:hover {
                    border-color: var(--accent-primary);
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Referencias a elementos
        const temaSelect = document.getElementById('ticketTema');
        const servicioSelect = document.getElementById('ticketServicio');
        const elementoSelect = document.getElementById('ticketElemento');
        const contactoSelect = document.getElementById('ticketContacto');
        const machineDisplay = document.getElementById('ticketMachineDisplay');
        const machineIdInput = document.getElementById('ticketMachineId');
        const machineSerialInput = document.getElementById('ticketMachineSerial');
        const contactoNombreInput = document.getElementById('ticketContactoNombre');
        const asignadoSelect = document.querySelector('select[name="asignadoId"]');
        const asignadoNombreInput = document.getElementById('ticketAsignadoNombre');
        const categoriaClaveInput = document.getElementById('ticketCategoriaClave');
        const categoriaElementoInput = document.getElementById('ticketCategoriaElemento');

        // Funcion para filtrar elementos por tema y servicio
        const updateElementos = () => {
            const tema = temaSelect.value;
            const servicio = servicioSelect.value;
            const filtered = categories.filter(c => 
                (!tema || c.tema === tema) && 
                (!servicio || c.servicio === servicio)
            );
            
            elementoSelect.innerHTML = '<option value="">Seleccionar elemento...</option>' +
                filtered.map(c => `<option value="${c.id}">[${this.escapeHtml(c.clave)}] ${this.escapeHtml(c.elemento)}</option>`).join('');
        };

        // Event listeners para cascada de selects
        temaSelect.addEventListener('change', updateElementos);
        servicioSelect.addEventListener('change', updateElementos);

        // Actualizar campos ocultos cuando se selecciona elemento
        elementoSelect.addEventListener('change', () => {
            const selected = categories.find(c => c.id === elementoSelect.value);
            if (selected) {
                categoriaClaveInput.value = selected.clave || '';
                categoriaElementoInput.value = selected.elemento || '';
            } else {
                categoriaClaveInput.value = '';
                categoriaElementoInput.value = '';
            }
        });

        // Auto-llenado de maquina cuando se selecciona contacto
        contactoSelect.addEventListener('change', async () => {
            const employeeId = contactoSelect.value;
            const employee = employees.find(e => e.id === employeeId);
            
            // Actualizar nombre del contacto
            if (employee) {
                contactoNombreInput.value = `${employee.name || ''} ${employee.lastName || ''}`.trim();
            } else {
                contactoNombreInput.value = '';
            }
            
            // Buscar maquina asignada al empleado
            if (employeeId) {
                const activeAssignment = machineAssignments.find(a => 
                    a.employeeId === employeeId && !a.endDate
                );
                
                if (activeAssignment) {
                    const machine = machines.find(m => m.id === activeAssignment.machineId);
                    if (machine) {
                        machineIdInput.value = machine.id;
                        machineSerialInput.value = machine.serialNumber || '';
                        machineDisplay.value = machine.serialNumber || machine.name || 'Maquina asignada';
                    } else {
                        machineIdInput.value = '';
                        machineSerialInput.value = '';
                        machineDisplay.value = '';
                    }
                } else {
                    machineIdInput.value = '';
                    machineSerialInput.value = '';
                    machineDisplay.value = 'Sin maquina asignada';
                }
            } else {
                machineIdInput.value = '';
                machineSerialInput.value = '';
                machineDisplay.value = '';
            }
        });

        // Actualizar nombre del asignado
        asignadoSelect?.addEventListener('change', () => {
            const selected = users.find(u => u.id === asignadoSelect.value);
            asignadoNombreInput.value = selected ? (selected.name || selected.email) : '';
        });

        // Toggle de tipo de ticket
        document.querySelectorAll('.type-option input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('active'));
                radio.closest('.type-option').classList.add('active');
            });
        });

        // Submit del formulario
        document.getElementById('ticketForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            // Obtener servicio del select (para guardar como category tambien por compatibilidad)
            data.category = data.servicio;
            
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
    // MODAL DE CATEGORIAS
    // ========================================

    async openCategoriesModal() {
        let categories = [];
        try {
            categories = await Store.getCategories() || [];
        } catch (e) {
            console.error('Error cargando categorias:', e);
        }

        const servicioLabels = {
            software: 'Software',
            hardware: 'Hardware',
            network: 'Red',
            other: 'Otro'
        };

        // Agrupar por tema > servicio
        const grouped = {};
        categories.forEach(c => {
            const tema = c.tema || 'Sin tema';
            const servicio = c.servicio || 'other';
            if (!grouped[tema]) grouped[tema] = {};
            if (!grouped[tema][servicio]) grouped[tema][servicio] = [];
            grouped[tema][servicio].push(c);
        });

        const renderCategoriesList = () => {
            let html = '';
            const temas = Object.keys(grouped).sort();
            
            if (temas.length === 0) {
                return `<div style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                    <p>No hay categorias registradas</p>
                    <p style="font-size: 0.85rem; margin-top: 0.5rem;">Crea una nueva categoria para comenzar</p>
                </div>`;
            }

            temas.forEach(tema => {
                html += `
                    <div class="category-tema-group" style="margin-bottom: 1rem;">
                        <div style="font-weight: 600; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); margin-bottom: 0.5rem; color: var(--text-primary);">
                            ${this.escapeHtml(tema)}
                        </div>
                `;
                
                const servicios = Object.keys(grouped[tema]).sort();
                servicios.forEach(servicio => {
                    html += `
                        <div class="category-servicio-group" style="margin-left: 1rem; margin-bottom: 0.5rem;">
                            <div style="font-size: 0.85rem; color: var(--text-secondary); padding: 0.25rem 0; display: flex; align-items: center; gap: 0.5rem;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${this.getCategoryColor(servicio)};"></span>
                                ${servicioLabels[servicio] || servicio}
                            </div>
                            <div style="margin-left: 1rem;">
                    `;
                    
                    grouped[tema][servicio].forEach(cat => {
                        html += `
                            <div class="category-item" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: var(--bg-tertiary); border-radius: 6px; margin-bottom: 0.25rem;">
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <span style="font-family: monospace; font-size: 0.8rem; background: var(--bg-secondary); padding: 0.2rem 0.5rem; border-radius: 4px;">${this.escapeHtml(cat.clave)}</span>
                                    <span>${this.escapeHtml(cat.elemento)}</span>
                                </div>
                                <div style="display: flex; gap: 0.25rem;">
                                    <button class="btn-icon btn-ghost sm" onclick="TicketsModule.editCategory('${cat.id}')" title="Editar">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </button>
                                    <button class="btn-icon btn-ghost sm" onclick="TicketsModule.deleteCategory('${cat.id}')" title="Eliminar" style="color: #ef4444;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        `;
                    });
                    
                    html += `
                            </div>
                        </div>
                    `;
                });
                
                html += `</div>`;
            });

            return html;
        };

        const modalHtml = `
            <div class="modal-overlay active" id="categoriesModal">
                <div class="modal" style="max-width: 700px; max-height: 80vh;">
                    <div class="modal-header">
                        <h2 class="modal-title">Gestionar Categorias</h2>
                        <button class="modal-close" onclick="document.getElementById('categoriesModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body" style="display: flex; gap: 1rem; max-height: 60vh;">
                        <!-- Lista de categorias -->
                        <div style="flex: 1; overflow-y: auto; padding-right: 0.5rem;" id="categoriesList">
                            ${renderCategoriesList()}
                        </div>
                        
                        <!-- Formulario para nueva categoria -->
                        <div style="width: 280px; background: var(--bg-tertiary); padding: 1rem; border-radius: 12px; height: fit-content;">
                            <div style="font-weight: 600; margin-bottom: 1rem;">Nueva Categoria</div>
                            <form id="categoryForm" class="form">
                                <div class="form-group" style="margin-bottom: 0.75rem;">
                                    <label class="form-label" style="font-size: 0.85rem;">Tema <span class="required">*</span></label>
                                    <input type="text" name="tema" id="categoryTemaInput" class="form-input" required placeholder="Ej: Soporte Tecnico" list="temasDatalist" style="font-size: 0.9rem;">
                                    <datalist id="temasDatalist">
                                        ${[...new Set(categories.map(c => c.tema))].filter(Boolean).map(t => `<option value="${this.escapeHtml(t)}">`).join('')}
                                    </datalist>
                                </div>
                                <div class="form-group" style="margin-bottom: 0.75rem;">
                                    <label class="form-label" style="font-size: 0.85rem;">Servicio <span class="required">*</span></label>
                                    <select name="servicio" class="form-select" required style="font-size: 0.9rem;">
                                        <option value="">Seleccionar...</option>
                                        <option value="software">Software</option>
                                        <option value="hardware">Hardware</option>
                                        <option value="network">Red</option>
                                        <option value="other">Otro</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom: 0.75rem;">
                                    <label class="form-label" style="font-size: 0.85rem;">Clave <span class="required">*</span></label>
                                    <div style="position: relative;">
                                        <input type="text" name="clave" id="categoryClaveInput" class="form-input" required placeholder="Se genera automaticamente" style="font-size: 0.9rem;">
                                        <span id="claveAutoIndicator" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 0.7rem; color: var(--text-tertiary); display: none;">Auto</span>
                                    </div>
                                </div>
                                <div class="form-group" style="margin-bottom: 0.75rem;">
                                    <label class="form-label" style="font-size: 0.85rem;">Elemento <span class="required">*</span></label>
                                    <input type="text" name="elemento" class="form-input" required placeholder="Ej: Actualizacion de Slack" style="font-size: 0.9rem;">
                                </div>
                                <input type="hidden" name="id" id="categoryId" value="">
                                <div style="display: flex; gap: 0.5rem;">
                                    <button type="button" class="btn btn-secondary btn-sm" id="cancelCategoryEdit" style="display: none; flex: 1;">Cancelar</button>
                                    <button type="submit" class="btn btn-primary btn-sm" style="flex: 1;" id="saveCategoryBtn">Agregar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('categoriesModal').remove()">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const categoryForm = document.getElementById('categoryForm');
        const categoryIdInput = document.getElementById('categoryId');
        const saveCategoryBtn = document.getElementById('saveCategoryBtn');
        const cancelCategoryEdit = document.getElementById('cancelCategoryEdit');
        const temaInput = document.getElementById('categoryTemaInput');
        const claveInput = document.getElementById('categoryClaveInput');
        const claveAutoIndicator = document.getElementById('claveAutoIndicator');

        // Funcion para generar la siguiente clave consecutiva
        const generateNextClave = (tema) => {
            if (!tema) return '';
            
            // Obtener todas las categorias del tema seleccionado
            const temasCategories = categories.filter(c => c.tema === tema);
            
            if (temasCategories.length === 0) {
                // No hay categorias con este tema, no podemos auto-generar
                return '';
            }
            
            // Analizar las claves existentes para encontrar el patron
            const claves = temasCategories.map(c => c.clave).filter(Boolean);
            
            if (claves.length === 0) return '';
            
            // Usar la primera clave como referencia del formato
            const firstClave = claves[0];
            
            // Regex para detectar diferentes formatos y capturar el numero con su formato original
            const patterns = [
                { regex: /^([A-Za-z]+)-(\d+)$/, separator: '-' },
                { regex: /^([A-Za-z]+)\.(\d+)$/, separator: '.' },
                { regex: /^([A-Za-z]+)_(\d+)$/, separator: '_' },
                { regex: /^([A-Za-z]+)(\d+)$/, separator: '' }
            ];
            
            let detectedPrefix = '';
            let detectedSeparator = '.';
            let numberLength = 1; // Longitud del numero (para padding con ceros)
            let maxNumber = 0;
            
            // Detectar el formato de la primera clave
            for (const { regex, separator } of patterns) {
                const match = firstClave.match(regex);
                if (match) {
                    detectedPrefix = match[1];
                    detectedSeparator = separator;
                    numberLength = match[2].length; // Guardar la longitud original (ej: "01" = 2)
                    break;
                }
            }
            
            if (!detectedPrefix) {
                // No se pudo detectar el patron
                return '';
            }
            
            // Encontrar el numero mas alto existente para este prefijo
            for (const clave of claves) {
                for (const { regex } of patterns) {
                    const match = clave.match(regex);
                    if (match && match[1].toUpperCase() === detectedPrefix.toUpperCase()) {
                        const num = parseInt(match[2], 10);
                        // Tambien actualizar numberLength si encontramos uno mas largo
                        if (match[2].length > numberLength) {
                            numberLength = match[2].length;
                        }
                        if (num > maxNumber) maxNumber = num;
                    }
                }
            }
            
            // Generar la siguiente clave con el mismo formato
            const nextNumber = maxNumber + 1;
            // Aplicar padding con ceros para mantener el mismo formato (ej: 01, 02, etc.)
            const paddedNumber = String(nextNumber).padStart(numberLength, '0');
            return `${detectedPrefix}${detectedSeparator}${paddedNumber}`;
        };

        // Listener para auto-generar clave cuando cambia el tema
        let isAutoGeneratedClave = false;
        
        temaInput.addEventListener('input', () => {
            const tema = temaInput.value.trim();
            
            // Solo auto-generar si no estamos editando y el campo de clave esta vacio o fue auto-generado
            if (!categoryIdInput.value && (claveInput.value === '' || isAutoGeneratedClave)) {
                const nextClave = generateNextClave(tema);
                if (nextClave) {
                    claveInput.value = nextClave;
                    claveAutoIndicator.style.display = 'block';
                    isAutoGeneratedClave = true;
                } else {
                    claveInput.value = '';
                    claveAutoIndicator.style.display = 'none';
                    isAutoGeneratedClave = false;
                }
            }
        });

        // Si el usuario modifica manualmente la clave, desactivar auto-generacion
        claveInput.addEventListener('input', () => {
            if (document.activeElement === claveInput) {
                isAutoGeneratedClave = false;
                claveAutoIndicator.style.display = 'none';
            }
        });

        const resetForm = () => {
            categoryForm.reset();
            categoryIdInput.value = '';
            saveCategoryBtn.textContent = 'Agregar';
            cancelCategoryEdit.style.display = 'none';
            claveAutoIndicator.style.display = 'none';
            isAutoGeneratedClave = false;
        };

        cancelCategoryEdit.addEventListener('click', resetForm);

        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                if (data.id) {
                    // Editar existente
                    await Store.saveCategory(data);
                    this.showToast('Categoria actualizada', 'success');
                } else {
                    // Nueva categoria
                    delete data.id;
                    await Store.saveCategory(data);
                    this.showToast('Categoria creada', 'success');
                }

                // Recargar lista
                categories = await Store.getCategories() || [];
                
                // Reagrupar
                Object.keys(grouped).forEach(k => delete grouped[k]);
                categories.forEach(c => {
                    const tema = c.tema || 'Sin tema';
                    const servicio = c.servicio || 'other';
                    if (!grouped[tema]) grouped[tema] = {};
                    if (!grouped[tema][servicio]) grouped[tema][servicio] = [];
                    grouped[tema][servicio].push(c);
                });

                document.getElementById('categoriesList').innerHTML = renderCategoriesList();
                
                // Actualizar datalist
                const datalist = document.getElementById('temasDatalist');
                if (datalist) {
                    datalist.innerHTML = [...new Set(categories.map(c => c.tema))].filter(Boolean).map(t => `<option value="${this.escapeHtml(t)}">`).join('');
                }

                resetForm();
            } catch (error) {
                console.error('Error al guardar categoria:', error);
                this.showToast('Error al guardar la categoria', 'error');
            }
        });

        // Exponer funcion para editar categoria desde los botones
        window.TicketsModule.editCategoryInModal = async (id) => {
            const cat = categories.find(c => c.id === id);
            if (cat) {
                categoryIdInput.value = cat.id;
                categoryForm.querySelector('[name="tema"]').value = cat.tema || '';
                categoryForm.querySelector('[name="servicio"]').value = cat.servicio || '';
                categoryForm.querySelector('[name="clave"]').value = cat.clave || '';
                categoryForm.querySelector('[name="elemento"]').value = cat.elemento || '';
                saveCategoryBtn.textContent = 'Actualizar';
                cancelCategoryEdit.style.display = 'block';
                // Desactivar auto-generacion cuando se edita
                isAutoGeneratedClave = false;
                claveAutoIndicator.style.display = 'none';
            }
        };
    },

    async editCategory(id) {
        // Si el modal ya esta abierto, editar en el modal
        if (document.getElementById('categoriesModal')) {
            this.editCategoryInModal(id);
        } else {
            // Abrir modal y luego editar
            await this.openCategoriesModal();
            setTimeout(() => this.editCategoryInModal(id), 100);
        }
    },

    async deleteCategory(id) {
        const categories = await Store.getCategories() || [];
        const category = categories.find(c => c.id === id);
        const name = category ? `${category.clave} - ${category.elemento}` : 'esta categoria';
        
        const confirmed = await Modal.confirmDelete(name, 'categoria');
        if (confirmed) {
            try {
                await Store.deleteCategory(id);
                
                // Si el modal esta abierto, actualizar la lista
                if (document.getElementById('categoriesModal')) {
                    document.getElementById('categoriesModal').remove();
                    await this.openCategoriesModal();
                }
                
                this.showToast('Categoria eliminada', 'success');
            } catch (error) {
                console.error('Error al eliminar categoria:', error);
                this.showToast('Error al eliminar la categoria', 'error');
            }
        }
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
