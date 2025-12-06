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

        // Ocultar botón de categorías si es empleado
        const currentUser = Auth.getCurrentUser();
        if (currentUser && currentUser.role === 'employee') {
            const categoriesBtn = document.getElementById('manageCategoriesBtn');
            if (categoriesBtn) {
                categoriesBtn.style.display = 'none';
            }
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
            // En móvil, siempre usar vista de tarjetas
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                this.currentView = 'cards';
                return;
            }
            
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
            const currentUser = Auth.getCurrentUser();
            
            // Si es empleado, solo cargar sus tickets
            if (currentUser && currentUser.role === 'employee') {
                this.tickets = await Store.getTicketsByEmployeeEmail(currentUser.email) || [];
            } else {
                // Usuarios y admin ven todos los tickets
                this.tickets = await Store.getTickets() || [];
            }
            
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.total}</span>
                    <span class="mini-stat-label">Total Tickets</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.open}</span>
                    <span class="mini-stat-label">Abiertos</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(249, 115, 22, 0.1); color: #f97316;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.inProgress}</span>
                    <span class="mini-stat-label">En Progreso</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #22c55e;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
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
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" id="searchInput" placeholder="Buscar...">
            </div>
            <div class="filter-divider"></div>
            <div class="filter-selects">
                <select class="filter-select-compact" id="tipoFilter" data-default="true">
                    <option value="">Tipo</option>
                    <option value="incidencia">Incidencia</option>
                    <option value="requerimiento">Requerimiento</option>
                </select>
                <select class="filter-select-compact" id="statusFilter" data-default="true">
                    <option value="">Estado</option>
                    <option value="open">Abierto</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="resolved">Resuelto</option>
                    <option value="closed">Cerrado</option>
                </select>
                <select class="filter-select-compact" id="temaFilter" data-default="true">
                    <option value="">Tema</option>
                    ${temas.map(t => `<option value="${this.escapeHtml(t)}">${this.escapeHtml(t)}</option>`).join('')}
                </select>
                <select class="filter-select-compact" id="servicioFilter" data-default="true">
                    <option value="">Servicio</option>
                    <option value="hardware">Hardware</option>
                    <option value="software">Software</option>
                    <option value="network">Red</option>
                    <option value="other">Otro</option>
                </select>
                <select class="filter-select-compact" id="priorityFilter" data-default="true">
                    <option value="">Prioridad</option>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="critical">Critica</option>
                </select>
            </div>
            <button class="filter-clear-btn" id="clearFilters" title="Limpiar filtros">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
        `;
        
        // Agregar listener para resaltar filtros activos
        container.querySelectorAll('.filter-select-compact').forEach(select => {
            select.addEventListener('change', (e) => {
                if (e.target.value) {
                    e.target.removeAttribute('data-default');
                } else {
                    e.target.setAttribute('data-default', 'true');
                }
            });
        });
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
                (t.title || '').toLowerCase().includes(searchTerm) ||
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
        // Normalizar el valor de category
        if (!category) return this.getCategoryIcon('other');
        
        const normalizedCategory = String(category).toLowerCase().trim();
        
        const icons = {
            hardware: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
            software: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
            network: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
            red: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
            otro: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            other: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
        };
        return icons[normalizedCategory] || icons.other;
    },

    getCategoryColor(category) {
        // Normalizar el valor de category
        if (!category) return '#6b7280';
        
        const normalizedCategory = String(category).toLowerCase().trim();
        
        const colors = {
            hardware: '#3b82f6',
            software: '#a855f7',
            network: '#22c55e',
            red: '#22c55e',
            otro: '#6b7280',
            other: '#6b7280'
        };
        return colors[normalizedCategory] || colors.other;
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
                                    ${this.escapeHtml(t.title || t.categoriaElemento || '')}
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
                            ${(() => {
                                const currentUser = Auth?.getCurrentUser();
                                const isEmployee = currentUser?.role === 'employee';
                                const isAssigned = t.asignadoId === currentUser?.id;
                                const canTake = !isEmployee && !t.asignadoId && (t.status === 'open' || t.status === 'in_progress');
                                
                                let actions = '';
                                
                                // Botón "Tomar Ticket" para usuarios/admin
                                if (canTake) {
                                    actions += `<button class="btn btn-sm" style="background: #3b82f6; color: white; padding: 0.35rem 0.6rem; font-size: 0.75rem; margin-right: 0.25rem;" onclick="TicketsModule.takeTicket('${t.id}')" title="Tomar Ticket">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                                        Tomar
                                    </button>`;
                                }
                                
                                // Botón "Resolver" solo para usuarios/admin y si está asignado o es admin
                                if (!isEmployee && canResolve(t.status) && (isAssigned || currentUser?.role === 'admin')) {
                                    actions += `<button class="btn btn-sm" style="background: #22c55e; color: white; padding: 0.35rem 0.6rem; font-size: 0.75rem; margin-right: 0.25rem;" onclick="TicketsModule.resolveTicket('${t.id}')" title="Resolver">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        Resolver
                                    </button>`;
                                }
                                
                                // Botones de editar y eliminar solo para usuarios/admin
                                if (!isEmployee) {
                                    actions += `<button class="btn-icon btn-ghost sm" onclick="TicketsModule.editTicket('${t.id}')" title="Editar">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </button>
                                    <button class="btn-icon btn-ghost sm" onclick="TicketsModule.deleteTicket('${t.id}')" title="Eliminar">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>`;
                                }
                                
                                return actions;
                            })()}
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
            <div class="card ticket-card" data-id="${t.id}" style="border-left: 4px solid ${this.getPriorityColor(t.priority)}; cursor: pointer;" data-ticket-id="${t.id}">
                <div class="card-header">
                    <div class="card-icon" style="background: ${this.getCategoryColor(t.servicio || t.category)}20; color: ${this.getCategoryColor(t.servicio || t.category)};">
                        ${this.getCategoryIcon(t.servicio || t.category || 'other')}
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
                    <h3 class="card-title">${this.escapeHtml(t.title || t.categoriaElemento || 'Sin titulo')}</h3>
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
                <div class="card-footer" style="flex-wrap: wrap;" onclick="event.stopPropagation();">
                    ${(() => {
                        const currentUser = Auth?.getCurrentUser();
                        const isEmployee = currentUser?.role === 'employee';
                        const isAssigned = t.asignadoId === currentUser?.id;
                        const canTake = !isEmployee && !t.asignadoId && (t.status === 'open' || t.status === 'in_progress');
                        
                        let actions = '';
                        
                        // Botón "Tomar Ticket" para usuarios/admin
                        if (canTake) {
                            actions += `<button class="btn btn-sm" style="background: #3b82f6; color: white;" onclick="TicketsModule.takeTicket('${t.id}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                                Tomar Ticket
                            </button>`;
                        }
                        
                        // Botón "Resolver" solo para usuarios/admin y si está asignado o es admin
                        if (!isEmployee && canResolve(t.status) && (isAssigned || currentUser?.role === 'admin')) {
                            actions += `<button class="btn btn-sm" style="background: #22c55e; color: white;" onclick="TicketsModule.resolveTicket('${t.id}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Resolver
                            </button>`;
                        }
                        
                        // Botones de editar y eliminar solo para usuarios/admin
                        if (!isEmployee) {
                            actions += `<button class="btn btn-ghost btn-sm" onclick="TicketsModule.editTicket('${t.id}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Editar
                            </button>
                            <button class="btn btn-ghost btn-sm" onclick="TicketsModule.deleteTicket('${t.id}')" style="color: #ef4444;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                Eliminar
                            </button>`;
                        }
                        
                        return actions;
                    })()}
                </div>
            </div>
        `).join('');

        // Agregar event listeners para clicks en las cards
        container.querySelectorAll('.ticket-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // No abrir detalle si se hizo clic en un botón
                if (e.target.closest('button')) return;
                
                const ticketId = card.getAttribute('data-ticket-id');
                if (ticketId) {
                    this.showTicketDetail(ticketId);
                }
            });
        });
    },

    // ========================================
    // TOGGLE DE VISTAS
    // ========================================

    setView(view) {
        // En móvil, forzar siempre vista de tarjetas
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            this.currentView = 'cards';
        } else {
            this.currentView = view;
            this.saveViewPreference(); // Guardar la preferencia solo en desktop
        }
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

        // Boton de exportar
        document.getElementById('exportTicketsBtn')?.addEventListener('click', () => {
            this.openExportModal();
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

    async showTicketDetail(id) {
        const ticket = this.getTicketById(id);
        if (!ticket) {
            this.showToast('Error: Ticket no encontrado', 'error');
            return;
        }

        const currentUser = Auth?.getCurrentUser();
        const isEmployee = currentUser?.role === 'employee';
        const isAssigned = ticket.asignadoId === currentUser?.id;
        const canResolve = (status) => status === 'open' || status === 'in_progress';
        const canTake = !isEmployee && !ticket.asignadoId && (ticket.status === 'open' || ticket.status === 'in_progress');
        const canEdit = !isEmployee;
        const canDelete = !isEmployee;

        const getTipoLabel = (tipo) => {
            return tipo === 'requerimiento' ? 'Requerimiento' : 'Incidencia';
        };

        const getTipoColor = (tipo) => {
            return tipo === 'requerimiento' ? '#8b5cf6' : '#ef4444';
        };

        const formatDateTime = (date) => {
            if (!date) return '-';
            return new Date(date).toLocaleString('es-MX', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const modalContent = `
            <div class="ticket-detail-container">
                <!-- Header con información principal -->
                <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border-left: 4px solid ${this.getPriorityColor(ticket.priority)};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                                <span style="font-family: monospace; font-size: 0.85rem; color: var(--text-tertiary); background: var(--bg-tertiary); padding: 0.25rem 0.5rem; border-radius: 4px;">${ticket.folio || '-'}</span>
                                ${ticket.categoriaClave ? `<span style="font-family: monospace; font-size: 0.75rem; background: var(--bg-tertiary); padding: 0.25rem 0.5rem; border-radius: 4px;">${this.escapeHtml(ticket.categoriaClave)}</span>` : ''}
                                <span class="badge" style="background: ${getTipoColor(ticket.tipo)}15; color: ${getTipoColor(ticket.tipo)}; font-size: 0.75rem;">${getTipoLabel(ticket.tipo)}</span>
                            </div>
                            <h2 style="margin: 0; font-size: 1.5rem; color: var(--text-primary);">${this.escapeHtml(ticket.title || ticket.categoriaElemento || 'Sin titulo')}</h2>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                            ${this.getStatusBadge(ticket.status)}
                            ${this.getPriorityBadge(ticket.priority)}
                        </div>
                    </div>
                </div>

                <!-- Información del ticket -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: var(--card-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Tema</div>
                        <div style="font-weight: 600; color: var(--text-primary);">${this.escapeHtml(ticket.tema || '-')}</div>
                    </div>
                    <div style="background: var(--card-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Servicio</div>
                        <div style="font-weight: 600; color: var(--text-primary);">${this.getCategoryLabel(ticket.servicio || ticket.category)}</div>
                    </div>
                    <div style="background: var(--card-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Contacto</div>
                        <div style="font-weight: 600; color: var(--text-primary);">${this.escapeHtml(ticket.contactoNombre || '-')}</div>
                    </div>
                    ${ticket.machineSerial ? `
                    <div style="background: var(--card-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Máquina</div>
                        <div style="font-weight: 600; color: var(--text-primary); font-family: monospace; font-size: 0.9rem;">${this.escapeHtml(ticket.machineSerial)}</div>
                    </div>
                    ` : ''}
                    <div style="background: var(--card-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Asignado a</div>
                        <div style="font-weight: 600; color: var(--text-primary);">${this.escapeHtml(ticket.asignadoNombre || 'Sin asignar')}</div>
                    </div>
                    <div style="background: var(--card-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Creado</div>
                        <div style="font-weight: 600; color: var(--text-primary);">${formatDateTime(ticket.createdAt)}</div>
                    </div>
                    ${ticket.resolvedAt ? `
                    <div style="background: var(--card-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Resuelto</div>
                        <div style="font-weight: 600; color: var(--text-primary);">${formatDateTime(ticket.resolvedAt)}</div>
                    </div>
                    ` : ''}
                    ${ticket.resolvedBy ? `
                    <div style="background: var(--card-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 0.25rem;">Resuelto por</div>
                        <div style="font-weight: 600; color: var(--text-primary);">${this.escapeHtml(ticket.resolvedBy)}</div>
                    </div>
                    ` : ''}
                </div>

                <!-- Descripción -->
                <div style="background: var(--card-bg); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
                    <h3 style="margin: 0 0 1rem 0; font-size: 1rem; color: var(--text-primary);">Descripción</h3>
                    <p style="margin: 0; color: var(--text-secondary); white-space: pre-wrap; line-height: 1.6;">${this.escapeHtml(ticket.description || 'Sin descripción')}</p>
                </div>

                <!-- Solución (si existe) -->
                ${ticket.resolution ? `
                <div style="background: var(--card-bg); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
                    <h3 style="margin: 0 0 1rem 0; font-size: 1rem; color: var(--text-primary);">Solución</h3>
                    <p style="margin: 0; color: var(--text-secondary); white-space: pre-wrap; line-height: 1.6;">${this.escapeHtml(ticket.resolution)}</p>
                </div>
                ` : ''}

                <!-- Acciones -->
                <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    ${canTake ? `
                    <button class="btn btn-primary" data-action="take-ticket" data-ticket-id="${ticket.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                        Tomar Ticket
                    </button>
                    ` : ''}
                    ${!isEmployee && canResolve(ticket.status) && (isAssigned || currentUser?.role === 'admin') ? `
                    <button class="btn" style="background: #22c55e; color: white;" data-action="resolve-ticket" data-ticket-id="${ticket.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Resolver
                    </button>
                    ` : ''}
                    ${canEdit ? `
                    <button class="btn btn-secondary" data-action="edit-ticket" data-ticket-id="${ticket.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Editar
                    </button>
                    ` : ''}
                    ${canDelete ? `
                    <button class="btn btn-danger" data-action="delete-ticket" data-ticket-id="${ticket.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Eliminar
                    </button>
                    ` : ''}
                </div>
            </div>
        `;

        // Crear overlay del modal
        const overlayId = 'ticketDetailModalOverlay';
        let overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.remove();
        }

        overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = overlayId;
        document.body.appendChild(overlay);

        overlay.innerHTML = `
            <div class="modal modal-xl">
                <div class="modal-header">
                    <h2 class="modal-title">Detalle del Ticket</h2>
                    <button class="modal-close" data-action="close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    ${modalContent}
                </div>
            </div>
        `;

        // Mostrar modal
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });

        // Función para cerrar el modal
        const closeModal = () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
                // Solo restaurar overflow si no hay otros modales abiertos
                if (!document.querySelector('.modal-overlay.active')) {
                    document.body.style.overflow = '';
                }
            }, 300);
        };

        // Event listeners
        overlay.querySelector('[data-action="close"]')?.addEventListener('click', closeModal);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Manejar acciones de los botones
        overlay.querySelectorAll('[data-action]').forEach(btn => {
            if (btn.dataset.action === 'close') return;
            
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const ticketId = btn.dataset.ticketId;
                
                closeModal();
                
                // Pequeño delay para que el modal se cierre antes de abrir otro
                setTimeout(() => {
                    if (action === 'take-ticket') {
                        this.takeTicket(ticketId);
                    } else if (action === 'resolve-ticket') {
                        this.resolveTicket(ticketId);
                    } else if (action === 'edit-ticket') {
                        this.editTicket(ticketId);
                    } else if (action === 'delete-ticket') {
                        this.deleteTicket(ticketId);
                    }
                }, 100);
            });
        });

        document.body.style.overflow = 'hidden';
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
                            <div style="font-weight: 600; margin-top: 0.25rem;">${this.escapeHtml(ticket.title || ticket.categoriaElemento || 'Sin titulo')}</div>
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

    async takeTicket(id) {
        const ticket = this.getTicketById(id);
        if (!ticket) {
            this.showToast('Error: Ticket no encontrado', 'error');
            return;
        }

        const currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            this.showToast('Error: No hay sesión activa', 'error');
            return;
        }

        if (currentUser.role === 'employee') {
            this.showToast('Los empleados no pueden tomar tickets', 'error');
            return;
        }

        if (ticket.asignadoId && ticket.asignadoId !== currentUser.id) {
            this.showToast('Este ticket ya está asignado a otro usuario', 'error');
            return;
        }

        // Cargar todos los datos necesarios (igual que en openTicketForm)
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
            console.error('Error cargando datos para tomar ticket:', e);
        }

        // Obtener usuario actual de la lista de usuarios
        const user = users.find(u => 
            u.id === currentUser.id || 
            (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
        );
        const userName = user?.name || currentUser.name || 'Usuario';
        const currentUserId = user?.id || currentUser.id;

        // Determinar si se debe pre-seleccionar el usuario actual al tomar el ticket
        // Se pre-selecciona si no hay asignado previo o si el asignado previo es el mismo usuario
        const shouldPreselectCurrentUser = !ticket.asignadoId || ticket.asignadoId === currentUserId;

        // Obtener temas unicos de las categorias
        const temas = [...new Set(categories.map(c => c.tema))].filter(Boolean);
        
        // Servicios disponibles
        const servicios = [
            { value: 'software', label: 'Software' },
            { value: 'hardware', label: 'Hardware' },
            { value: 'network', label: 'Red' },
            { value: 'other', label: 'Otro' }
        ];

        // Pre-llenar título y descripción con los datos del empleado
        const prefillTitle = ticket.title || ticket.categoriaElemento || '';
        const prefillDescription = ticket.description || '';

        // Mostrar modal para tomar ticket con la misma estructura que crear ticket
        const modalHtml = `
            <div class="modal-overlay active" id="takeTicketModal">
                <div class="modal modal-lg" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Tomar Ticket</h2>
                        <button class="modal-close" onclick="document.getElementById('takeTicketModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                        <form id="takeTicketForm" class="form">
                            <!-- Tipo de Ticket -->
                            <div class="form-group">
                                <label class="form-label">Tipo de Ticket <span class="required">*</span></label>
                                <div class="ticket-type-toggle" style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                                    <label class="type-option ${ticket?.tipo === 'incidencia' || !ticket?.tipo ? 'active' : ''}" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1rem; border: 2px solid var(--border-color); border-radius: 10px; cursor: pointer; transition: all 0.2s ease;">
                                        <input type="radio" name="tipo" value="incidencia" ${ticket?.tipo === 'incidencia' || !ticket?.tipo ? 'checked' : ''} style="display: none;">
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

                            <!-- Titulo -->
                            <div class="form-group">
                                <label class="form-label">Titulo <span class="required">*</span></label>
                                <input type="text" name="title" class="form-input" required value="${this.escapeHtml(prefillTitle)}" placeholder="Escribe un titulo descriptivo para el ticket...">
                            </div>

                            <!-- Categoria: Tema > Servicio > Elemento -->
                                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                    <div style="font-weight: 600; color: var(--text-primary);">Clasificacion del Ticket</div>
                                    <button type="button" class="btn btn-secondary btn-sm" id="takeTicketCreateCategoryBtn" style="padding: 0.4rem 0.75rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                        Nueva Categoria
                                    </button>
                                </div>
                                    <div class="form-row" style="margin-bottom: 0.75rem;">
                                        <div class="form-group" style="margin-bottom: 0;">
                                        <label class="form-label">Tema <span class="required">*</span></label>
                                        <select name="tema" id="takeTicketTema" class="form-select" required>
                                                <option value="">Seleccionar tema...</option>
                                                ${temas.map(t => `<option value="${this.escapeHtml(t)}" ${ticket?.tema === t ? 'selected' : ''}>${this.escapeHtml(t)}</option>`).join('')}
                                            </select>
                                        </div>
                                        <div class="form-group" style="margin-bottom: 0;">
                                        <label class="form-label">Servicio <span class="required">*</span></label>
                                        <select name="servicio" id="takeTicketServicio" class="form-select" required>
                                                <option value="">Seleccionar servicio...</option>
                                                ${servicios.map(s => `<option value="${s.value}" ${ticket?.servicio === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
                                            </select>
                                        </div>
                                    </div>
                                <div class="form-group" style="margin-bottom: 0; position: relative;">
                                    <label class="form-label">Elemento <span class="required">*</span></label>
                                    <div style="position: relative;">
                                        <input type="text" id="takeTicketElementoSearch" class="form-input" placeholder="Buscar por elemento..." autocomplete="off" style="padding-right: 2.5rem;" value="${ticket?.categoriaId ? (() => { const cat = categories.find(c => c.id === ticket.categoriaId); return cat ? `[${cat.clave}] ${cat.elemento}` : ''; })() : ''}">
                                        <input type="hidden" name="categoriaId" id="takeTicketElemento" value="${ticket?.categoriaId || ''}">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none;">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <path d="m21 21-4.35-4.35"></path>
                                        </svg>
                                    </div>
                                    <div id="takeTicketElementoDropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; margin-top: 0.25rem; max-height: 200px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></div>
                                    <small style="color: var(--text-tertiary); font-size: 0.75rem; margin-top: 0.25rem; display: block;">Selecciona un elemento de la lista</small>
                                </div>
                            </div>

                            <!-- Descripcion -->
                            <div class="form-group">
                                <label class="form-label">Descripcion <span class="required">*</span></label>
                                <textarea name="description" class="form-textarea" required rows="3" placeholder="Describe el problema o requerimiento detalladamente...">${this.escapeHtml(prefillDescription)}</textarea>
                            </div>

                            <!-- Contacto y Maquina -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Contacto (Empleado) <span class="required">*</span></label>
                                    <select name="contactoId" id="takeTicketContacto" class="form-select" required>
                                        <option value="">Seleccionar empleado...</option>
                                        ${employees.map(e => `<option value="${e.id}" ${ticket?.contactoId === e.id ? 'selected' : ''}>${this.escapeHtml(e.name || '')} ${this.escapeHtml(e.lastName || '')}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Maquina Asignada</label>
                                    <input type="text" id="takeTicketMachineDisplay" class="form-input" readonly placeholder="Se llenara automaticamente" value="${ticket?.machineSerial || ''}" style="background: var(--bg-tertiary);">
                                    <input type="hidden" name="machineId" id="takeTicketMachineId" value="${ticket?.machineId || ''}">
                                    <input type="hidden" name="machineSerial" id="takeTicketMachineSerial" value="${ticket?.machineSerial || ''}">
                                </div>
                            </div>

                            <!-- Asignado a y Prioridad -->
                            <div class="form-row">
                            <div class="form-group">
                                    <label class="form-label">Asignado a (Tecnico)</label>
                                    <select name="asignadoId" class="form-select">
                                        <option value="">Sin asignar</option>
                                        ${users.filter(u => u.status === 'active' && (u.role === 'user' || u.role === 'admin')).map(u => {
                                            // Pre-seleccionar el usuario actual al tomar el ticket si aplica
                                            const isCurrentUser = u.id === currentUserId || (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase());
                                            const shouldSelect = isCurrentUser && shouldPreselectCurrentUser;
                                            return `<option value="${u.id}" ${shouldSelect ? 'selected' : ''}>${this.escapeHtml(u.name || u.email)}</option>`;
                                        }).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Prioridad <span class="required">*</span></label>
                                    <select name="priority" class="form-select" required>
                                        <option value="low" ${ticket.priority === 'low' ? 'selected' : ''}>Baja</option>
                                        <option value="medium" ${ticket.priority === 'medium' || !ticket.priority ? 'selected' : ''}>Media</option>
                                        <option value="high" ${ticket.priority === 'high' ? 'selected' : ''}>Alta</option>
                                        <option value="critical" ${ticket.priority === 'critical' ? 'selected' : ''}>Critica</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Estado -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Estado <span class="required">*</span></label>
                                    <select name="status" class="form-select" required>
                                        <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>Abierto</option>
                                        <option value="in_progress" ${ticket.status === 'in_progress' || ticket.status === 'open' ? 'selected' : ''}>En Progreso</option>
                                        <option value="resolved" ${ticket.status === 'resolved' ? 'selected' : ''}>Resuelto</option>
                                        <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>Cerrado</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Comentario de Cierre / Resolucion</label>
                                    <textarea name="resolution" class="form-textarea" rows="2" placeholder="Describe la solucion aplicada...">${this.escapeHtml(ticket.resolution || '')}</textarea>
                                </div>
                            </div>

                            <input type="hidden" name="ticketId" value="${ticket.id}">
                            <input type="hidden" name="contactoNombre" id="takeTicketContactoNombre" value="${ticket?.contactoNombre || ''}">
                            <input type="hidden" name="asignadoNombre" id="takeTicketAsignadoNombre" value="${shouldPreselectCurrentUser ? userName : (ticket?.asignadoNombre || '')}">
                            <input type="hidden" name="categoriaClave" id="takeTicketCategoriaClave" value="${ticket?.categoriaClave || ''}">
                            <input type="hidden" name="categoriaElemento" id="takeTicketCategoriaElemento" value="${ticket?.categoriaElemento || ''}">
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('takeTicketModal').remove()">Cancelar</button>
                        <button type="submit" form="takeTicketForm" class="btn btn-primary">Tomar Ticket</button>
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

        // Referencias a elementos (igual que en openTicketForm)
        const temaSelect = document.getElementById('takeTicketTema');
        const servicioSelect = document.getElementById('takeTicketServicio');
        const elementoSearchInput = document.getElementById('takeTicketElementoSearch');
        const elementoHiddenInput = document.getElementById('takeTicketElemento');
        const elementoDropdown = document.getElementById('takeTicketElementoDropdown');
        const contactoSelect = document.getElementById('takeTicketContacto');
        const machineDisplay = document.getElementById('takeTicketMachineDisplay');
        const machineIdInput = document.getElementById('takeTicketMachineId');
        const machineSerialInput = document.getElementById('takeTicketMachineSerial');
        const contactoNombreInput = document.getElementById('takeTicketContactoNombre');
        const asignadoSelect = document.querySelector('#takeTicketForm select[name="asignadoId"]');
        const asignadoNombreInput = document.getElementById('takeTicketAsignadoNombre');
        const categoriaClaveInput = document.getElementById('takeTicketCategoriaClave');
        const categoriaElementoInput = document.getElementById('takeTicketCategoriaElemento');
        const createCategoryBtn = document.getElementById('takeTicketCreateCategoryBtn');

        // Si hay un elemento seleccionado, mostrar su nombre
        if (ticket?.categoriaId) {
            const selectedCategory = categories.find(c => c.id === ticket.categoriaId);
            if (selectedCategory && elementoSearchInput) {
                elementoSearchInput.value = `[${selectedCategory.clave}] ${selectedCategory.elemento}`;
                categoriaClaveInput.value = selectedCategory.clave || '';
                categoriaElementoInput.value = selectedCategory.elemento || '';
            }
        }

        // Función para buscar elementos (igual que en openTicketForm)
        const searchElementos = (query = '') => {
            const searchTerm = query.toLowerCase().trim();
                const tema = temaSelect.value;
                const servicio = servicioSelect.value;
            
            let filtered = categories.filter(c => {
                const matchesSearch = !searchTerm || 
                    (c.elemento || '').toLowerCase().includes(searchTerm) ||
                    (c.clave || '').toLowerCase().includes(searchTerm) ||
                    (c.tema || '').toLowerCase().includes(searchTerm);
                
                const matchesTema = !tema || c.tema === tema;
                const matchesServicio = !servicio || c.servicio === servicio;
                
                return matchesSearch && matchesTema && matchesServicio;
            });
            
            if (searchTerm) {
                filtered = categories.filter(c => 
                    (c.elemento || '').toLowerCase().includes(searchTerm) ||
                    (c.clave || '').toLowerCase().includes(searchTerm) ||
                    (c.tema || '').toLowerCase().includes(searchTerm)
                );
            }
            
            return filtered.slice(0, 10);
        };

        // Función para mostrar dropdown de resultados
        const showElementoDropdown = (results) => {
            if (results.length === 0) {
                elementoDropdown.innerHTML = '<div style="padding: 0.75rem; text-align: center; color: var(--text-tertiary); font-size: 0.85rem;">No se encontraron elementos</div>';
                elementoDropdown.style.display = 'block';
                return;
            }
            
            elementoDropdown.innerHTML = results.map(cat => `
                <div class="elemento-option" data-id="${cat.id}" style="padding: 0.75rem; cursor: pointer; border-bottom: 1px solid var(--border-color); transition: background 0.2s ease;" 
                     onmouseover="this.style.background='var(--bg-tertiary)'" 
                     onmouseout="this.style.background=''">
                    <div style="font-weight: 500; color: var(--text-primary); margin-bottom: 0.25rem;">
                        <code style="font-size: 0.75rem; background: var(--bg-secondary); padding: 0.15rem 0.35rem; border-radius: 4px; margin-right: 0.5rem;">${this.escapeHtml(cat.clave)}</code>
                        ${this.escapeHtml(cat.elemento)}
                    </div>
                    <div style="font-size: 0.7rem; color: var(--text-tertiary);">
                        ${this.escapeHtml(cat.tema)} • ${servicios.find(s => s.value === cat.servicio)?.label || cat.servicio}
                    </div>
                </div>
            `).join('');
            
            elementoDropdown.style.display = 'block';
            
            elementoDropdown.querySelectorAll('.elemento-option').forEach(option => {
                option.addEventListener('click', () => {
                    const categoryId = option.dataset.id;
                    const selected = categories.find(c => c.id === categoryId);
                    
                if (selected) {
                        elementoHiddenInput.value = selected.id;
                        elementoSearchInput.value = `[${selected.clave}] ${selected.elemento}`;
                        elementoDropdown.style.display = 'none';
                        
                        temaSelect.value = selected.tema || '';
                        servicioSelect.value = selected.servicio || '';
                        
                    categoriaClaveInput.value = selected.clave || '';
                    categoriaElementoInput.value = selected.elemento || '';
                    }
                });
            });
        };

        // Event listener para búsqueda de elementos
        elementoSearchInput?.addEventListener('input', (e) => {
            const query = e.target.value;
            if (query.length === 0) {
                elementoDropdown.style.display = 'none';
                elementoHiddenInput.value = '';
                    categoriaClaveInput.value = '';
                    categoriaElementoInput.value = '';
                return;
            }
            
            const results = searchElementos(query);
            showElementoDropdown(results);
        });

        // Event listener para cuando cambian tema o servicio
        temaSelect?.addEventListener('change', () => {
            if (elementoSearchInput.value) {
                const results = searchElementos(elementoSearchInput.value);
                showElementoDropdown(results);
            }
        });
        
        servicioSelect?.addEventListener('change', () => {
            if (elementoSearchInput.value) {
                const results = searchElementos(elementoSearchInput.value);
                showElementoDropdown(results);
            }
        });

        // Cerrar dropdown al hacer click fuera
        document.addEventListener('click', (e) => {
            if (elementoSearchInput && elementoDropdown && !elementoSearchInput.contains(e.target) && !elementoDropdown.contains(e.target)) {
                elementoDropdown.style.display = 'none';
            }
        });

        // Botón para crear nueva categoría
        createCategoryBtn?.addEventListener('click', async () => {
            await this.openQuickCategoryModal(categories, temas, servicios, async (newCategory) => {
                // Recargar categorías para asegurar que la nueva esté disponible
                categories = await Store.getCategories() || [];
                
                // Actualizar select de temas con la nueva lista
                temas = [...new Set(categories.map(c => c.tema))].filter(Boolean);
                temaSelect.innerHTML = '<option value="">Seleccionar tema...</option>' +
                    temas.map(t => `<option value="${this.escapeHtml(t)}">${this.escapeHtml(t)}</option>`).join('');
                
                // Rellenar automáticamente todos los campos con la nueva categoría
                if (newCategory.tema) {
                    temaSelect.value = newCategory.tema;
                }
                if (newCategory.servicio) {
                    servicioSelect.value = newCategory.servicio;
                }
                
                // Establecer todos los valores de la categoría creada
                elementoHiddenInput.value = newCategory.id;
                elementoSearchInput.value = `[${newCategory.clave}] ${newCategory.elemento}`;
                categoriaClaveInput.value = newCategory.clave || '';
                categoriaElementoInput.value = newCategory.elemento || '';
                
                // Cerrar el dropdown si está abierto
                if (elementoDropdown) {
                    elementoDropdown.style.display = 'none';
                }
            });
        });

        // Auto-llenado de maquina cuando se selecciona contacto
        contactoSelect?.addEventListener('change', async () => {
            const employeeId = contactoSelect.value;
            const employee = employees.find(e => e.id === employeeId);
            
            if (employee) {
                contactoNombreInput.value = `${employee.name || ''} ${employee.lastName || ''}`.trim();
            } else {
                contactoNombreInput.value = '';
            }
            
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
        document.querySelectorAll('#takeTicketForm .type-option input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                document.querySelectorAll('#takeTicketForm .type-option').forEach(opt => opt.classList.remove('active'));
                radio.closest('.type-option').classList.add('active');
            });
        });

        // Auto-ejecutar lógica de contacto si ya hay uno seleccionado
        if (contactoSelect && contactoSelect.value) {
            contactoSelect.dispatchEvent(new Event('change'));
        }

        // Auto-ejecutar lógica de asignado - asegurar que el nombre se actualice automáticamente
        if (asignadoSelect) {
            // Si hay un valor seleccionado (incluyendo el usuario actual pre-seleccionado), ejecutar el evento change
            if (asignadoSelect.value) {
                asignadoSelect.dispatchEvent(new Event('change'));
            } else if (shouldPreselectCurrentUser && currentUserId) {
                // Si debería estar pre-seleccionado pero no se seleccionó automáticamente, asegurarse de que el nombre esté correcto
                asignadoNombreInput.value = userName;
            }
        }
        
        // Asegurar que si el usuario actual está pre-seleccionado, el nombre también esté actualizado
        if (shouldPreselectCurrentUser && currentUserId && asignadoNombreInput) {
            asignadoNombreInput.value = userName;
        }

        // Submit del formulario
        document.getElementById('takeTicketForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            // Validar que se haya seleccionado un elemento
            if (!elementoHiddenInput.value) {
                this.showToast('Por favor selecciona un elemento', 'error');
                elementoSearchInput?.focus();
                return;
            }

            try {
                // Actualizar el ticket con todos los datos del formulario
                if (data.title) ticket.title = data.title;
                if (data.description) ticket.description = data.description;
                if (data.tipo) ticket.tipo = data.tipo;
                
                // Actualizar contacto y máquina
                if (data.contactoId) {
                    ticket.contactoId = data.contactoId;
                    ticket.contactoNombre = data.contactoNombre || ticket.contactoNombre;
                }
                if (data.machineId) {
                    ticket.machineId = data.machineId;
                    ticket.machineSerial = data.machineSerial || ticket.machineSerial;
                }
                
                // Actualizar asignado
                ticket.asignadoId = data.asignadoId || currentUser.id;
                ticket.asignadoNombre = data.asignadoNombre || userName;
                
                // Actualizar estado y prioridad
                ticket.status = data.status;
                ticket.priority = data.priority;

                // Actualizar tema, servicio y categoría
                if (data.tema) ticket.tema = data.tema;
                if (data.servicio) {
                    ticket.servicio = data.servicio;
                    ticket.category = data.servicio; // Compatibilidad
                }
                if (data.categoriaId) {
                    ticket.categoriaId = data.categoriaId;
                    ticket.categoriaClave = data.categoriaClave || ticket.categoriaClave;
                    ticket.categoriaElemento = data.categoriaElemento || ticket.categoriaElemento;
                }

                // Actualizar resolución
                if (data.resolution) {
                    ticket.resolution = data.resolution;
                    if (data.status === 'resolved' || data.status === 'closed') {
                        ticket.resolvedAt = new Date().toISOString();
                        ticket.resolvedBy = userName;
                    }
                }

                // Agregar al historial
                ticket.history = ticket.history || [];
                ticket.history.push({
                    action: 'taken',
                    timestamp: new Date().toISOString(),
                    user: userName,
                    note: `Ticket tomado por ${userName}`
                });

                await Store.saveTicket(ticket);

                document.getElementById('takeTicketModal').remove();
                await this.loadData();
                this.filteredTickets = [...this.tickets];
                this.renderStats();
                this.applyFilters();
                this.showToast('Ticket tomado y actualizado correctamente', 'success');
            } catch (error) {
                console.error('Error al tomar ticket:', error);
                this.showToast('Error al tomar el ticket', 'error');
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
        const currentUser = Auth?.getCurrentUser();
        const isEmployee = currentUser?.role === 'employee';
        
        // Los empleados solo pueden crear tickets, no editarlos
        if (isEmployee && isEdit) {
            this.showToast('Los empleados solo pueden crear tickets, no editarlos', 'error');
            return;
        }
        
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

        // Auto-detectar empleado basado en el usuario autenticado (solo para nuevos tickets)
        let defaultContactoId = ticket?.contactoId || '';
        let defaultContactoNombre = ticket?.contactoNombre || '';
        if (!isEdit && Auth && Auth.getCurrentUser) {
            if (currentUser && currentUser.email) {
                // Buscar empleado con el mismo email
                const matchingEmployee = employees.find(e => 
                    e.email && e.email.toLowerCase() === currentUser.email.toLowerCase()
                );
                if (matchingEmployee) {
                    defaultContactoId = matchingEmployee.id;
                    defaultContactoNombre = `${matchingEmployee.name || ''} ${matchingEmployee.lastName || ''}`.trim();
                }
            }
        }

        // Auto-detectar usuario asignado basado en el usuario autenticado (solo para nuevos tickets)
        // Solo usuarios y administradores pueden ser asignados, no empleados
        let defaultAsignadoId = ticket?.asignadoId || '';
        let defaultAsignadoNombre = ticket?.asignadoNombre || '';
        if (!isEdit && currentUser && (currentUser.role === 'user' || currentUser.role === 'admin')) {
            // Buscar usuario con el mismo ID o email
            const matchingUser = users.find(u => 
                (u.id === currentUser.id) || 
                (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
            );
            // Verificar que el usuario encontrado sea activo y tenga rol user o admin (no employee)
            if (matchingUser && matchingUser.status === 'active' && (matchingUser.role === 'user' || matchingUser.role === 'admin')) {
                defaultAsignadoId = matchingUser.id;
                defaultAsignadoNombre = matchingUser.name || matchingUser.email || '';
            }
        }
        
        // Si es empleado, mostrar formulario simplificado
        if (isEmployee && !isEdit) {
            return this.openSimpleTicketForm(defaultContactoId, defaultContactoNombre, employees, machines, machineAssignments);
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

                            <!-- Titulo -->
                            <div class="form-group">
                                <label class="form-label">Titulo <span class="required">*</span></label>
                                <input type="text" name="title" class="form-input" required value="${this.escapeHtml(ticket?.title || '')}" placeholder="Escribe un titulo descriptivo para el ticket...">
                            </div>

                            <!-- Categoria: Tema > Servicio > Elemento -->
                            <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                    <div style="font-weight: 600; color: var(--text-primary);">Clasificacion del Ticket</div>
                                    <button type="button" class="btn btn-secondary btn-sm" id="createCategoryBtn" style="padding: 0.4rem 0.75rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                        Nueva Categoria
                                    </button>
                                </div>
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
                                <div class="form-group" style="margin-bottom: 0; position: relative;">
                                    <label class="form-label">Elemento <span class="required">*</span></label>
                                    <div style="position: relative;">
                                        <input type="text" id="ticketElementoSearch" class="form-input" placeholder="Buscar por elemento..." autocomplete="off" style="padding-right: 2.5rem;">
                                        <input type="hidden" name="categoriaId" id="ticketElemento" value="${ticket?.categoriaId || ''}">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none;">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <path d="m21 21-4.35-4.35"></path>
                                        </svg>
                                    </div>
                                    <div id="elementoDropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; margin-top: 0.25rem; max-height: 200px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></div>
                                    <small style="color: var(--text-tertiary); font-size: 0.75rem; margin-top: 0.25rem; display: block;">Selecciona un elemento de la lista</small>
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
                                        ${employees.map(e => `<option value="${e.id}" ${(isEdit ? ticket?.contactoId === e.id : defaultContactoId === e.id) ? 'selected' : ''}>${this.escapeHtml(e.name || '')} ${this.escapeHtml(e.lastName || '')}</option>`).join('')}
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
                                        ${users.filter(u => u.status === 'active' && (u.role === 'user' || u.role === 'admin')).map(u => `<option value="${u.id}" ${(isEdit ? ticket?.asignadoId === u.id : defaultAsignadoId === u.id) ? 'selected' : ''}>${this.escapeHtml(u.name || u.email)}</option>`).join('')}
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
                            <input type="hidden" name="contactoNombre" id="ticketContactoNombre" value="${isEdit ? (ticket?.contactoNombre || '') : (defaultContactoNombre || ticket?.contactoNombre || '')}">
                            <input type="hidden" name="asignadoNombre" id="ticketAsignadoNombre" value="${isEdit ? (ticket?.asignadoNombre || '') : (defaultAsignadoNombre || ticket?.asignadoNombre || '')}">
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
        const elementoSearchInput = document.getElementById('ticketElementoSearch');
        const elementoHiddenInput = document.getElementById('ticketElemento');
        const elementoDropdown = document.getElementById('elementoDropdown');
        const contactoSelect = document.getElementById('ticketContacto');
        const machineDisplay = document.getElementById('ticketMachineDisplay');
        const machineIdInput = document.getElementById('ticketMachineId');
        const machineSerialInput = document.getElementById('ticketMachineSerial');
        const contactoNombreInput = document.getElementById('ticketContactoNombre');
        const asignadoSelect = document.querySelector('select[name="asignadoId"]');
        const asignadoNombreInput = document.getElementById('ticketAsignadoNombre');
        const categoriaClaveInput = document.getElementById('ticketCategoriaClave');
        const categoriaElementoInput = document.getElementById('ticketCategoriaElemento');
        const createCategoryBtn = document.getElementById('createCategoryBtn');

        // Si hay un elemento seleccionado en modo edición, mostrar su nombre
        if (ticket?.categoriaId) {
            const selectedCategory = categories.find(c => c.id === ticket.categoriaId);
            if (selectedCategory) {
                elementoSearchInput.value = `[${selectedCategory.clave}] ${selectedCategory.elemento}`;
            }
        }

        // Función para buscar elementos
        const searchElementos = (query = '') => {
            const searchTerm = query.toLowerCase().trim();
            const tema = temaSelect.value;
            const servicio = servicioSelect.value;
            
            // Filtrar por búsqueda, tema y servicio
            let filtered = categories.filter(c => {
                const matchesSearch = !searchTerm || 
                    (c.elemento || '').toLowerCase().includes(searchTerm) ||
                    (c.clave || '').toLowerCase().includes(searchTerm) ||
                    (c.tema || '').toLowerCase().includes(searchTerm);
                
                const matchesTema = !tema || c.tema === tema;
                const matchesServicio = !servicio || c.servicio === servicio;
                
                return matchesSearch && matchesTema && matchesServicio;
            });
            
            // Si hay búsqueda, mostrar todos los resultados relevantes sin filtrar por tema/servicio
            if (searchTerm) {
                filtered = categories.filter(c => 
                    (c.elemento || '').toLowerCase().includes(searchTerm) ||
                    (c.clave || '').toLowerCase().includes(searchTerm) ||
                    (c.tema || '').toLowerCase().includes(searchTerm)
                );
            }
            
            return filtered.slice(0, 10); // Limitar a 10 resultados
        };

        // Función para mostrar dropdown de resultados
        const showElementoDropdown = (results) => {
            if (results.length === 0) {
                elementoDropdown.innerHTML = '<div style="padding: 0.75rem; text-align: center; color: var(--text-tertiary); font-size: 0.85rem;">No se encontraron elementos</div>';
                elementoDropdown.style.display = 'block';
                return;
            }
            
            elementoDropdown.innerHTML = results.map(cat => `
                <div class="elemento-option" data-id="${cat.id}" style="padding: 0.75rem; cursor: pointer; border-bottom: 1px solid var(--border-color); transition: background 0.2s ease;" 
                     onmouseover="this.style.background='var(--bg-tertiary)'" 
                     onmouseout="this.style.background=''">
                    <div style="font-weight: 500; color: var(--text-primary); margin-bottom: 0.25rem;">
                        <code style="font-size: 0.75rem; background: var(--bg-secondary); padding: 0.15rem 0.35rem; border-radius: 4px; margin-right: 0.5rem;">${this.escapeHtml(cat.clave)}</code>
                        ${this.escapeHtml(cat.elemento)}
                    </div>
                    <div style="font-size: 0.7rem; color: var(--text-tertiary);">
                        ${this.escapeHtml(cat.tema)} • ${servicios.find(s => s.value === cat.servicio)?.label || cat.servicio}
                    </div>
                </div>
            `).join('');
            
            elementoDropdown.style.display = 'block';
            
            // Agregar event listeners a las opciones
            elementoDropdown.querySelectorAll('.elemento-option').forEach(option => {
                option.addEventListener('click', () => {
                    const categoryId = option.dataset.id;
                    const selected = categories.find(c => c.id === categoryId);
                    
                    if (selected) {
                        elementoHiddenInput.value = selected.id;
                        elementoSearchInput.value = `[${selected.clave}] ${selected.elemento}`;
                        elementoDropdown.style.display = 'none';
                        
                        // Auto-llenar tema y servicio
                        temaSelect.value = selected.tema || '';
                        servicioSelect.value = selected.servicio || '';
                        
                        // Actualizar campos ocultos
                        categoriaClaveInput.value = selected.clave || '';
                        categoriaElementoInput.value = selected.elemento || '';
                    }
                });
            });
        };

        // Event listener para búsqueda de elementos
        elementoSearchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            if (query.length === 0) {
                elementoDropdown.style.display = 'none';
                elementoHiddenInput.value = '';
                categoriaClaveInput.value = '';
                categoriaElementoInput.value = '';
                return;
            }
            
            const results = searchElementos(query);
            showElementoDropdown(results);
        });

        // Event listener para cuando cambian tema o servicio (filtrar resultados si hay búsqueda)
        temaSelect.addEventListener('change', () => {
            if (elementoSearchInput.value) {
                const results = searchElementos(elementoSearchInput.value);
                showElementoDropdown(results);
            }
        });
        
        servicioSelect.addEventListener('change', () => {
            if (elementoSearchInput.value) {
                const results = searchElementos(elementoSearchInput.value);
                showElementoDropdown(results);
            }
        });

        // Cerrar dropdown al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!elementoSearchInput.contains(e.target) && !elementoDropdown.contains(e.target)) {
                elementoDropdown.style.display = 'none';
            }
        });

        // Botón para crear nueva categoría
        createCategoryBtn.addEventListener('click', async () => {
            await this.openQuickCategoryModal(categories, temas, servicios, async (newCategory) => {
                // Recargar categorías para asegurar que la nueva esté disponible
                categories = await Store.getCategories() || [];
                
                // Actualizar select de temas con la nueva lista
                temas = [...new Set(categories.map(c => c.tema))].filter(Boolean);
                temaSelect.innerHTML = '<option value="">Seleccionar tema...</option>' +
                    temas.map(t => `<option value="${this.escapeHtml(t)}">${this.escapeHtml(t)}</option>`).join('');
                
                // Rellenar automáticamente todos los campos con la nueva categoría
                if (newCategory.tema) {
                    temaSelect.value = newCategory.tema;
                }
                if (newCategory.servicio) {
                    servicioSelect.value = newCategory.servicio;
                }
                
                // Establecer todos los valores de la categoría creada
                elementoHiddenInput.value = newCategory.id;
                elementoSearchInput.value = `[${newCategory.clave}] ${newCategory.elemento}`;
                categoriaClaveInput.value = newCategory.clave || '';
                categoriaElementoInput.value = newCategory.elemento || '';
                
                // Cerrar el dropdown si está abierto
                if (elementoDropdown) {
                    elementoDropdown.style.display = 'none';
                }
            });
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

        // Auto-seleccionar contacto si fue detectado automaticamente (solo para nuevos tickets)
        if (!isEdit && defaultContactoId && contactoSelect) {
            // Si el valor ya está seleccionado en el HTML, solo necesitamos ejecutar la lógica de auto-llenado
            const currentValue = contactoSelect.value;
            if (currentValue !== defaultContactoId) {
                contactoSelect.value = defaultContactoId;
            }
            // Disparar el evento change para que se ejecute la lógica de auto-llenado (máquina, etc.)
            contactoSelect.dispatchEvent(new Event('change'));
        } else if (contactoSelect && contactoSelect.value) {
            // Si ya hay un contacto seleccionado (desde el HTML en modo edición), también ejecutar la lógica
            contactoSelect.dispatchEvent(new Event('change'));
        }

        // Auto-seleccionar asignado si fue detectado automaticamente (solo para nuevos tickets)
        if (!isEdit && defaultAsignadoId && asignadoSelect) {
            // Si el valor ya está seleccionado en el HTML, solo necesitamos ejecutar la lógica de actualización
            const currentValue = asignadoSelect.value;
            if (currentValue !== defaultAsignadoId) {
                asignadoSelect.value = defaultAsignadoId;
            }
            // Disparar el evento change para que se actualice el campo hidden asignadoNombre
            asignadoSelect.dispatchEvent(new Event('change'));
        } else if (asignadoSelect && asignadoSelect.value) {
            // Si ya hay un asignado seleccionado (desde el HTML en modo edición), también ejecutar la lógica
            asignadoSelect.dispatchEvent(new Event('change'));
        }

        // Submit del formulario
        document.getElementById('ticketForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            // Validar que se haya seleccionado un elemento
            if (!elementoHiddenInput.value) {
                this.showToast('Por favor selecciona un elemento', 'error');
                elementoSearchInput.focus();
                return;
            }
            
            // Obtener servicio del select (para guardar como category tambien por compatibilidad)
            data.category = data.servicio;
            
            // Agregar campo createdBy si es un nuevo ticket
            if (!data.id) {
                const currentUser = Auth.getCurrentUser();
                data.createdBy = currentUser?.email || '';
            }
            
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

    // Modal rápido para crear categoría desde el modal de tickets
    async openQuickCategoryModal(categories, temas, servicios, onSuccess) {
        const servicioLabels = {
            software: 'Software',
            hardware: 'Hardware',
            network: 'Red',
            other: 'Otro'
        };

        // Función para generar la siguiente clave consecutiva
        const generateNextClave = (tema) => {
            if (!tema) return '';
            
            const temasCategories = categories.filter(c => c.tema === tema);
            if (temasCategories.length === 0) return '';
            
            const claves = temasCategories.map(c => c.clave).filter(Boolean);
            if (claves.length === 0) return '';
            
            const firstClave = claves[0];
            const patterns = [
                { regex: /^([A-Za-z]+)-(\d+)$/, separator: '-' },
                { regex: /^([A-Za-z]+)\.(\d+)$/, separator: '.' },
                { regex: /^([A-Za-z]+)_(\d+)$/, separator: '_' },
                { regex: /^([A-Za-z]+)(\d+)$/, separator: '' }
            ];
            
            let detectedPrefix = '';
            let detectedSeparator = '.';
            let numberLength = 1;
            let maxNumber = 0;
            
            for (const { regex, separator } of patterns) {
                const match = firstClave.match(regex);
                if (match) {
                    detectedPrefix = match[1];
                    detectedSeparator = separator;
                    numberLength = match[2].length;
                    break;
                }
            }
            
            if (!detectedPrefix) return '';
            
            for (const clave of claves) {
                for (const { regex } of patterns) {
                    const match = clave.match(regex);
                    if (match && match[1].toUpperCase() === detectedPrefix.toUpperCase()) {
                        const num = parseInt(match[2], 10);
                        if (match[2].length > numberLength) {
                            numberLength = match[2].length;
                        }
                        if (num > maxNumber) maxNumber = num;
                    }
                }
            }
            
            const nextNumber = maxNumber + 1;
            const paddedNumber = String(nextNumber).padStart(numberLength, '0');
            return `${detectedPrefix}${detectedSeparator}${paddedNumber}`;
        };

        const modalHtml = `
            <div class="modal-overlay active" id="quickCategoryModal">
                <div class="modal" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Nueva Categoria</h2>
                        <button class="modal-close" onclick="document.getElementById('quickCategoryModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="quickCategoryForm" class="form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Tema <span class="required">*</span></label>
                                    <input type="text" name="tema" id="quickCategoryTema" class="form-input" required placeholder="Ej: Soporte" list="quickTemasDatalist">
                                    <datalist id="quickTemasDatalist">
                                        ${temas.map(t => `<option value="${this.escapeHtml(t)}">`).join('')}
                                    </datalist>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Servicio <span class="required">*</span></label>
                                    <select name="servicio" id="quickCategoryServicio" class="form-select" required>
                                        <option value="">Seleccionar...</option>
                                        ${servicios.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Clave <span class="required">*</span></label>
                                    <input type="text" name="clave" id="quickCategoryClave" class="form-input" required placeholder="Se generará automáticamente" style="font-family: monospace;">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Elemento <span class="required">*</span></label>
                                    <input type="text" name="elemento" id="quickCategoryElemento" class="form-input" required placeholder="Nombre del elemento">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('quickCategoryModal').remove()">Cancelar</button>
                        <button type="submit" form="quickCategoryForm" class="btn btn-primary">Crear Categoria</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const temaInput = document.getElementById('quickCategoryTema');
        const claveInput = document.getElementById('quickCategoryClave');
        let isAutoGeneratedClave = false;

        // Auto-generar clave cuando cambia el tema
        temaInput.addEventListener('input', () => {
            const tema = temaInput.value.trim();
            if (tema && !isAutoGeneratedClave) {
                const nextClave = generateNextClave(tema);
                if (nextClave) {
                    claveInput.value = nextClave;
                    isAutoGeneratedClave = true;
                }
            }
        });

        // Si el usuario modifica manualmente la clave, desactivar auto-generación
        claveInput.addEventListener('input', () => {
            if (document.activeElement === claveInput) {
                isAutoGeneratedClave = false;
            }
        });

        // Submit del formulario
        document.getElementById('quickCategoryForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                delete data.id;
                const newCategory = await Store.saveCategory(data);
                this.showToast('Categoria creada correctamente', 'success');
                
                document.getElementById('quickCategoryModal').remove();
                
                // Llamar callback con la nueva categoría
                // Envolver en try-catch para que errores en el callback no muestren mensaje de error
                // ya que la categoría ya se creó exitosamente
                if (onSuccess) {
                    try {
                        await onSuccess(newCategory);
                    } catch (callbackError) {
                        console.error('Error en callback después de crear categoria:', callbackError);
                        // No mostramos toast de error porque la categoría ya se creó exitosamente
                    }
                }
            } catch (error) {
                console.error('Error al crear categoria:', error);
                this.showToast('Error al crear la categoria', 'error');
            }
        });
    },

    // Formulario simplificado para empleados
    async openSimpleTicketForm(contactoId, contactoNombre, employees, machines, machineAssignments) {
        const modalHtml = `
            <div class="modal-overlay active" id="ticketModal">
                <div class="modal" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2 class="modal-title">Solicitar Ayuda</h2>
                        <button class="modal-close" onclick="document.getElementById('ticketModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="ticketForm" class="form">
                            <div class="form-group">
                                <label class="form-label">Título del problema <span class="required">*</span></label>
                                <input type="text" name="title" class="form-input" required placeholder="Ej: Mi computadora no enciende">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Descripción del problema <span class="required">*</span></label>
                                <textarea name="description" class="form-textarea" required rows="5" placeholder="Describe detalladamente el problema que estás experimentando..."></textarea>
                            </div>
                            
                            <input type="hidden" name="contactoId" value="${contactoId}">
                            <input type="hidden" name="contactoNombre" value="${this.escapeHtml(contactoNombre || '')}">
                            <input type="hidden" name="tipo" value="incidencia">
                            <input type="hidden" name="priority" value="medium">
                            <input type="hidden" name="status" value="open">
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('ticketModal').remove()">Cancelar</button>
                        <button type="submit" form="ticketForm" class="btn btn-primary">Enviar Solicitud</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Submit del formulario
        document.getElementById('ticketForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                // Obtener máquina asignada al empleado si existe
                if (contactoId) {
                    const activeAssignment = machineAssignments.find(a => 
                        a.employeeId === contactoId && !a.endDate
                    );
                    
                    if (activeAssignment) {
                        const machine = machines.find(m => m.id === activeAssignment.machineId);
                        if (machine) {
                            data.machineId = machine.id;
                            data.machineSerial = machine.serialNumber || '';
                        }
                    }
                }
                
                // Agregar campo createdBy
                const currentUser = Auth.getCurrentUser();
                data.createdBy = currentUser?.email || '';
                
                delete data.id;
                await Store.saveTicket(data);

                document.getElementById('ticketModal').remove();
                await this.loadData();
                this.filteredTickets = [...this.tickets];
                this.renderStats();
                this.applyFilters();
                this.showToast('Solicitud enviada correctamente. Un técnico se pondrá en contacto contigo.', 'success');
            } catch (error) {
                console.error('Error al guardar ticket:', error);
                this.showToast('Error al enviar la solicitud', 'error');
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
                return `<div style="text-align: center; padding: 3rem 2rem; color: var(--text-tertiary);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem; opacity: 0.5;">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <p style="font-weight: 500; margin-bottom: 0.25rem;">No hay categorias registradas</p>
                    <p style="font-size: 0.8rem;">Usa el formulario para crear la primera categoria</p>
                </div>`;
            }

            // Crear tabla compacta
            html += `<table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color);">
                        <th style="text-align: left; padding: 0.5rem 0.75rem; font-weight: 600; color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase;">Tema</th>
                        <th style="text-align: left; padding: 0.5rem 0.75rem; font-weight: 600; color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase;">Servicio</th>
                        <th style="text-align: left; padding: 0.5rem 0.75rem; font-weight: 600; color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase;">Clave</th>
                        <th style="text-align: left; padding: 0.5rem 0.75rem; font-weight: 600; color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase;">Elemento</th>
                        <th style="width: 70px;"></th>
                    </tr>
                </thead>
                <tbody>`;

            temas.forEach(tema => {
                const servicios = Object.keys(grouped[tema]).sort();
                servicios.forEach(servicio => {
                    grouped[tema][servicio].forEach((cat, idx) => {
                        const isFirst = idx === 0;
                        const rowCount = grouped[tema][servicio].length;
                        html += `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                ${isFirst ? `<td style="padding: 0.5rem 0.75rem; vertical-align: top; font-weight: 500;" rowspan="${rowCount}">${this.escapeHtml(tema)}</td>` : ''}
                                ${isFirst ? `<td style="padding: 0.5rem 0.75rem; vertical-align: top;" rowspan="${rowCount}">
                                    <span style="display: inline-flex; align-items: center; gap: 0.35rem;">
                                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${this.getCategoryColor(servicio)};"></span>
                                        ${servicioLabels[servicio] || servicio}
                                    </span>
                                </td>` : ''}
                                <td style="padding: 0.5rem 0.75rem;">
                                    <code style="font-size: 0.75rem; background: var(--bg-tertiary); padding: 0.15rem 0.4rem; border-radius: 4px;">${this.escapeHtml(cat.clave)}</code>
                                </td>
                                <td style="padding: 0.5rem 0.75rem;">${this.escapeHtml(cat.elemento)}</td>
                                <td style="padding: 0.5rem 0.75rem;">
                                    <div style="display: flex; gap: 0.25rem; justify-content: flex-end;">
                                        <button class="btn-icon btn-ghost sm" onclick="TicketsModule.editCategory('${cat.id}')" title="Editar" style="width: 26px; height: 26px;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                        <button class="btn-icon btn-ghost sm" onclick="TicketsModule.deleteCategory('${cat.id}')" title="Eliminar" style="color: #ef4444; width: 26px; height: 26px;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    });
                });
            });

            html += `</tbody></table>`;
            return html;
        };

        const modalHtml = `
            <div class="modal-overlay active" id="categoriesModal">
                <div class="modal" style="max-width: 950px; width: 95%; height: auto; max-height: 85vh; display: flex; flex-direction: column;">
                    <div class="modal-header" style="padding: 1rem 1.5rem; flex-shrink: 0;">
                        <div>
                            <h2 class="modal-title" style="margin-bottom: 0.15rem;">Gestionar Categorias</h2>
                            <p style="font-size: 0.75rem; color: var(--text-tertiary); margin: 0;">${categories.length} categoria${categories.length !== 1 ? 's' : ''} registrada${categories.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button class="modal-close" onclick="document.getElementById('categoriesModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body" id="categoriesModalBody" style="display: grid; grid-template-columns: 1fr 280px; gap: 1.25rem; padding: 1rem 1.5rem; flex: 1; min-height: 0; overflow: hidden; transition: grid-template-columns 0.3s ease;">
                        <!-- Lista de categorias (con scroll) -->
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <!-- Buscador de categorias -->
                            <div style="position: relative;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none;">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="m21 21-4.35-4.35"></path>
                                </svg>
                                <input type="text" id="categoriesSearchInput" placeholder="Buscar por tema, servicio, clave o elemento..." style="width: 100%; padding: 0.6rem 0.75rem 0.6rem 2.5rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary); font-size: 0.85rem; outline: none; transition: border-color 0.2s ease;" onfocus="this.style.borderColor='var(--accent-primary)'" onblur="this.style.borderColor='var(--border-color)'">
                            </div>
                            <div style="overflow-y: auto; border: 1px solid var(--border-color); border-radius: 10px; background: var(--card-bg); min-height: 200px; max-height: 100%; flex: 1;" id="categoriesList">
                                ${renderCategoriesList()}
                            </div>
                        </div>
                        
                        <!-- Panel lateral: Formulario (sin scroll) -->
                        <div id="categoryFormPanel" style="display: flex; flex-direction: column; gap: 0.75rem; overflow: visible; transition: opacity 0.3s ease, transform 0.3s ease;">
                            <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 10px;">
                                <div style="font-weight: 600; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    <span id="formTitle">Nueva Categoria</span>
                                </div>
                                <form id="categoryForm" class="form">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                                        <div class="form-group" style="margin: 0;">
                                            <label class="form-label" style="font-size: 0.7rem; margin-bottom: 0.2rem;">Tema <span class="required">*</span></label>
                                            <input type="text" name="tema" id="categoryTemaInput" class="form-input" required placeholder="Ej: Soporte" list="temasDatalist" style="font-size: 0.8rem; padding: 0.4rem 0.6rem;">
                                            <datalist id="temasDatalist">
                                                ${[...new Set(categories.map(c => c.tema))].filter(Boolean).map(t => `<option value="${this.escapeHtml(t)}">`).join('')}
                                            </datalist>
                                        </div>
                                        <div class="form-group" style="margin: 0;">
                                            <label class="form-label" style="font-size: 0.7rem; margin-bottom: 0.2rem;">Servicio <span class="required">*</span></label>
                                            <select name="servicio" class="form-input" required style="font-size: 0.8rem; padding: 0.4rem 0.6rem; cursor: pointer;">
                                                <option value="">Seleccionar...</option>
                                                <option value="software">Software</option>
                                                <option value="hardware">Hardware</option>
                                                <option value="network">Red</option>
                                                <option value="other">Otro</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 90px 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                                        <div class="form-group" style="margin: 0;">
                                            <label class="form-label" style="font-size: 0.7rem; margin-bottom: 0.2rem;">Clave <span class="required">*</span></label>
                                            <div style="position: relative;">
                                                <input type="text" name="clave" id="categoryClaveInput" class="form-input" required placeholder="AP.01" style="font-size: 0.8rem; padding: 0.4rem 0.6rem; font-family: monospace;">
                                                <span id="claveAutoIndicator" style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); font-size: 0.55rem; color: var(--accent-primary); background: var(--accent-light); padding: 0.1rem 0.25rem; border-radius: 3px; display: none;">Auto</span>
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin: 0;">
                                            <label class="form-label" style="font-size: 0.7rem; margin-bottom: 0.2rem;">Elemento <span class="required">*</span></label>
                                            <input type="text" name="elemento" class="form-input" required placeholder="Nombre del elemento" style="font-size: 0.8rem; padding: 0.4rem 0.6rem;">
                                        </div>
                                    </div>
                                    <input type="hidden" name="id" id="categoryId" value="">
                                    <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                                        <button type="button" class="btn btn-secondary btn-sm" id="cancelCategoryEdit" style="display: none; flex: 1; padding: 0.4rem 0.75rem; font-size: 0.75rem;">Cancelar</button>
                                        <button type="submit" class="btn btn-primary btn-sm" style="flex: 1; padding: 0.4rem 0.75rem; font-size: 0.75rem;" id="saveCategoryBtn">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                            Agregar
                                        </button>
                                    </div>
                                </form>
                            </div>
                            
                            <!-- Tip compacto -->
                            <div style="background: var(--bg-tertiary); padding: 0.6rem 0.75rem; border-radius: 8px; border-left: 3px solid var(--accent-primary);">
                                <p style="font-size: 0.7rem; color: var(--text-tertiary); line-height: 1.35; margin: 0;">
                                    <strong style="color: var(--text-secondary);">Tip:</strong> La clave se genera automaticamente al elegir un tema existente.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="padding: 0.75rem 1.5rem; border-top: 1px solid var(--border-color); flex-shrink: 0;">
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
        const categoriesSearchInput = document.getElementById('categoriesSearchInput');

        // Funcion para filtrar categorias en la tabla
        const filterCategoriesTable = () => {
            const searchQuery = (categoriesSearchInput?.value || '').toLowerCase().trim();
            const table = document.querySelector('#categoriesList table tbody');
            const modalBody = document.getElementById('categoriesModalBody');
            const formPanel = document.getElementById('categoryFormPanel');
            
            if (!table) return;
            
            // Ocultar/mostrar formulario según si hay búsqueda activa
            if (searchQuery) {
                // Hay búsqueda: ocultar formulario y expandir tabla
                if (modalBody) {
                    modalBody.style.gridTemplateColumns = '1fr';
                }
                if (formPanel) {
                    formPanel.style.display = 'none';
                }
            } else {
                // No hay búsqueda: mostrar formulario y layout normal
                if (modalBody) {
                    modalBody.style.gridTemplateColumns = '1fr 280px';
                }
                if (formPanel) {
                    formPanel.style.display = 'flex';
                }
            }
            
            const rows = table.querySelectorAll('tr');
            let visibleCount = 0;
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length === 0) return;
                
                // Obtener texto de todas las celdas relevantes (tema, servicio, clave, elemento)
                const tema = (cells[0]?.textContent || '').toLowerCase();
                const servicio = (cells[1]?.textContent || '').toLowerCase();
                const clave = (cells[2]?.textContent || '').toLowerCase();
                const elemento = (cells[3]?.textContent || '').toLowerCase();
                
                const matches = !searchQuery || 
                    tema.includes(searchQuery) || 
                    servicio.includes(searchQuery) || 
                    clave.includes(searchQuery) || 
                    elemento.includes(searchQuery);
                
                row.style.display = matches ? '' : 'none';
                if (matches) visibleCount++;
            });
        };

        // Event listener para el buscador de categorias
        if (categoriesSearchInput) {
            categoriesSearchInput.addEventListener('input', filterCategoriesTable);
        }

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
            saveCategoryBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Agregar';
            cancelCategoryEdit.style.display = 'none';
            claveAutoIndicator.style.display = 'none';
            isAutoGeneratedClave = false;
            const formTitle = document.getElementById('formTitle');
            if (formTitle) formTitle.textContent = 'Nueva Categoria';
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
                
                // Aplicar filtro si hay texto en el buscador
                if (categoriesSearchInput && categoriesSearchInput.value) {
                    filterCategoriesTable();
                }
                
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
                saveCategoryBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Guardar';
                cancelCategoryEdit.style.display = 'block';
                const formTitle = document.getElementById('formTitle');
                if (formTitle) formTitle.textContent = 'Editar Categoria';
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
    // EXPORTACION CSV
    // ========================================

    openExportModal() {
        // Definir todas las columnas disponibles
        const availableColumns = [
            { key: 'folio', label: 'Folio' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'title', label: 'Título' },
            { key: 'categoriaElemento', label: 'Elemento' },
            { key: 'categoriaClave', label: 'Clave Categoría' },
            { key: 'description', label: 'Descripción' },
            { key: 'tema', label: 'Tema' },
            { key: 'servicio', label: 'Servicio' },
            { key: 'contactoNombre', label: 'Contacto' },
            { key: 'machineSerial', label: 'Serial Máquina' },
            { key: 'priority', label: 'Prioridad' },
            { key: 'status', label: 'Estado' },
            { key: 'asignadoNombre', label: 'Asignado a' },
            { key: 'createdAt', label: 'Fecha Creación' },
            { key: 'resolvedAt', label: 'Fecha Resolución' },
            { key: 'resolvedBy', label: 'Resuelto por' },
            { key: 'resolution', label: 'Solución' }
        ];

        // Columnas seleccionadas por defecto (las que están visibles en la tabla)
        const defaultSelected = ['folio', 'tipo', 'title', 'contactoNombre', 'priority', 'status', 'createdAt'];
        
        // Cargar selección guardada o usar la predeterminada
        let selectedColumns = defaultSelected;
        try {
            const saved = localStorage.getItem('fixify-export-columns');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Validar que las columnas guardadas aún existan
                selectedColumns = parsed.filter(col => availableColumns.some(ac => ac.key === col));
                if (selectedColumns.length === 0) {
                    selectedColumns = defaultSelected;
                }
            }
        } catch (e) {
            console.warn('Error al cargar columnas guardadas:', e);
        }

        const modalContent = `
            <div class="modal-header">
                <h2 class="modal-title">Exportar Tickets a CSV</h2>
                <button class="modal-close" data-action="close">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <p style="margin: 0 0 1.5rem 0; color: var(--text-secondary);">
                    Selecciona las columnas que deseas incluir en la exportación CSV. 
                    Se exportarán ${this.filteredTickets.length} ticket${this.filteredTickets.length !== 1 ? 's' : ''} (filtros aplicados).
                </p>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
                    <span style="font-weight: 600; color: var(--text-primary);">Columnas disponibles</span>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm" id="selectAllColumns" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                            Seleccionar todas
                        </button>
                        <button class="btn btn-sm btn-secondary" id="deselectAllColumns" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                            Deseleccionar todas
                        </button>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem;">
                    ${availableColumns.map(col => `
                        <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--bg-secondary); border-radius: 6px; cursor: pointer; transition: background 0.2s; border: 1px solid var(--border-color);"
                               onmouseover="this.style.background='var(--bg-tertiary)'"
                               onmouseout="this.style.background='var(--bg-secondary)'">
                            <input type="checkbox" 
                                   class="export-column-checkbox" 
                                   data-column="${col.key}" 
                                   ${selectedColumns.includes(col.key) ? 'checked' : ''}
                                   style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="font-size: 0.9rem; color: var(--text-primary); cursor: pointer;">${col.label}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                <button class="btn btn-secondary" data-action="close">Cancelar</button>
                <button class="btn btn-primary" id="confirmExportBtn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Exportar CSV
                </button>
            </div>
        `;

        // Crear overlay del modal
        const overlayId = 'exportTicketsModalOverlay';
        let overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.remove();
        }

        overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = overlayId;
        document.body.appendChild(overlay);

        overlay.innerHTML = `
            <div class="modal" style="max-width: 800px; width: 95%;">
                ${modalContent}
            </div>
        `;

        // Mostrar modal
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });

        // Función para cerrar el modal
        const closeModal = () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
                if (!document.querySelector('.modal-overlay.active')) {
                    document.body.style.overflow = '';
                }
            }, 300);
        };

        // Event listeners
        overlay.querySelector('[data-action="close"]')?.addEventListener('click', closeModal);
        overlay.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Seleccionar/Deseleccionar todas
        overlay.querySelector('#selectAllColumns')?.addEventListener('click', () => {
            overlay.querySelectorAll('.export-column-checkbox').forEach(cb => {
                cb.checked = true;
            });
        });

        overlay.querySelector('#deselectAllColumns')?.addEventListener('click', () => {
            overlay.querySelectorAll('.export-column-checkbox').forEach(cb => {
                cb.checked = false;
            });
        });

        // Confirmar exportación
        overlay.querySelector('#confirmExportBtn')?.addEventListener('click', () => {
            const selected = Array.from(overlay.querySelectorAll('.export-column-checkbox:checked'))
                .map(cb => cb.dataset.column);
            
            if (selected.length === 0) {
                this.showToast('Por favor selecciona al menos una columna', 'warning');
                return;
            }

            // Guardar selección
            try {
                localStorage.setItem('fixify-export-columns', JSON.stringify(selected));
            } catch (e) {
                console.warn('Error al guardar columnas:', e);
            }

            closeModal();
            this.exportToCSV(selected);
        });
    },

    exportToCSV(selectedColumns) {
        if (!selectedColumns || selectedColumns.length === 0) {
            this.showToast('No se seleccionaron columnas', 'error');
            return;
        }

        if (this.filteredTickets.length === 0) {
            this.showToast('No hay tickets para exportar', 'warning');
            return;
        }

        // Mapeo de claves a etiquetas
        const columnLabels = {
            'folio': 'Folio',
            'tipo': 'Tipo',
            'title': 'Título',
            'categoriaElemento': 'Elemento',
            'categoriaClave': 'Clave Categoría',
            'description': 'Descripción',
            'tema': 'Tema',
            'servicio': 'Servicio',
            'contactoNombre': 'Contacto',
            'machineSerial': 'Serial Máquina',
            'priority': 'Prioridad',
            'status': 'Estado',
            'asignadoNombre': 'Asignado a',
            'createdAt': 'Fecha Creación',
            'resolvedAt': 'Fecha Resolución',
            'resolvedBy': 'Resuelto por',
            'resolution': 'Solución'
        };

        // Mapeo de valores para formateo
        const formatValue = (key, value) => {
            if (value === null || value === undefined || value === '') {
                return '';
            }

            switch (key) {
                case 'tipo':
                    return value === 'requerimiento' ? 'Requerimiento' : 'Incidencia';
                case 'priority':
                    const priorityMap = {
                        'low': 'Baja',
                        'medium': 'Media',
                        'high': 'Alta',
                        'critical': 'Crítica'
                    };
                    return priorityMap[value] || value;
                case 'status':
                    const statusMap = {
                        'open': 'Abierto',
                        'in_progress': 'En Progreso',
                        'resolved': 'Resuelto',
                        'closed': 'Cerrado'
                    };
                    return statusMap[value] || value;
                case 'createdAt':
                case 'resolvedAt':
                    if (value) {
                        return new Date(value).toLocaleString('es-MX', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                    return '';
                case 'description':
                case 'resolution':
                    // Limpiar saltos de línea y comillas para CSV
                    return String(value).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
                default:
                    // Escapar comillas y saltos de línea
                    return String(value).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
            }
        };

        // Crear encabezados
        const headers = selectedColumns.map(col => columnLabels[col] || col);

        // Crear filas de datos
        const rows = this.filteredTickets.map(ticket => {
            return selectedColumns.map(col => {
                let value = ticket[col];
                return formatValue(col, value);
            });
        });

        // Convertir a CSV
        const csvContent = [
            headers.map(h => `"${h}"`).join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Crear blob y descargar
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Nombre del archivo con fecha
        const date = new Date().toISOString().split('T')[0];
        link.download = `tickets_${date}.csv`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showToast(`Exportados ${this.filteredTickets.length} tickets exitosamente`, 'success');
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
