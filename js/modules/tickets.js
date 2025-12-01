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

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        this.renderFilters();
        await this.initTable();
        this.bindEvents();
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
            <button class="filter-btn" id="clearFilters">Limpiar filtros</button>
        `;
    },

    // ========================================
    // TABLA
    // ========================================

    async initTable() {
        const container = document.querySelector('.data-table-container') || document.querySelector('.page-content');
        if (!container) return;

        if (!document.getElementById('ticketsTableContainer')) {
            const tableContainer = document.createElement('section');
            tableContainer.id = 'ticketsTableContainer';
            tableContainer.className = 'data-table-container';
            container.appendChild(tableContainer);
        }

        let tickets = [];
        try {
            tickets = await Store.getTickets() || [];
        } catch (e) {
            console.error('Error al obtener tickets:', e);
        }

        const statusBadge = (status) => {
            const config = {
                open: { label: 'Abierto', class: 'badge-open' },
                in_progress: { label: 'En Progreso', class: 'badge-in-progress' },
                resolved: { label: 'Resuelto', class: 'badge-resolved' },
                closed: { label: 'Cerrado', class: 'badge-closed' }
            };
            const c = config[status] || { label: status, class: 'badge' };
            return `<span class="badge ${c.class}">${c.label}</span>`;
        };

        const priorityBadge = (priority) => {
            const config = {
                low: { label: 'Baja', class: 'badge-low' },
                medium: { label: 'Media', class: 'badge-medium' },
                high: { label: 'Alta', class: 'badge-high' },
                critical: { label: 'Critica', class: 'badge-critical' }
            };
            const c = config[priority] || { label: priority, class: 'badge' };
            return `<span class="badge ${c.class}">${c.label}</span>`;
        };

        // Renderizar tabla simple
        const tableContainer = document.getElementById('ticketsTableContainer');
        tableContainer.innerHTML = `
            <table class="data-table">
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
                    ${tickets.length === 0 ? `
                        <tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">No hay tickets registrados</td></tr>
                    ` : tickets.map(t => `
                        <tr data-id="${t.id}">
                            <td style="font-family: monospace;">${t.folio || '-'}</td>
                            <td>${this.escapeHtml(t.title || '')}</td>
                            <td>${this.getCategoryLabel(t.category)}</td>
                            <td>${priorityBadge(t.priority)}</td>
                            <td>${statusBadge(t.status)}</td>
                            <td>${this.formatDate(t.createdAt)}</td>
                            <td>
                                <button class="btn-icon sm" onclick="TicketsModule.openTicketForm(TicketsModule.getTicketById('${t.id}'))">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="btn-icon sm" onclick="TicketsModule.deleteTicket('${t.id}')">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        this.tickets = tickets;
    },

    async getTicketById(id) {
        const tickets = this.tickets || await Store.getTickets();
        return tickets.find(t => t.id === id);
    },

    getCategoryLabel(category) {
        const labels = { hardware: 'Hardware', software: 'Software', network: 'Red', other: 'Otro' };
        return labels[category] || category || '-';
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-MX');
    },

    // ========================================
    // EVENTOS
    // ========================================

    bindEvents() {
        document.getElementById('searchInput')?.addEventListener('input', () => this.applyFilters());
        ['statusFilter', 'categoryFilter', 'priorityFilter'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.applyFilters());
        });

        document.getElementById('clearFilters')?.addEventListener('click', async () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('statusFilter').value = '';
            document.getElementById('categoryFilter').value = '';
            document.getElementById('priorityFilter').value = '';
            await this.initTable();
        });

        document.getElementById('newTicketBtn')?.addEventListener('click', () => {
            this.openTicketForm();
        });
    },

    async applyFilters() {
        // Re-render table with filters
        await this.initTable();
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

        const inputStyle = "width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);";

        const modalHtml = `
            <div class="modal-overlay active" id="ticketModal">
                <div class="modal" style="max-width: 600px; max-height: 90vh; display: flex; flex-direction: column;">
                    <div class="modal-header" style="flex-shrink: 0;">
                        <h2>${isEdit ? 'Editar Ticket' : 'Nuevo Ticket'}</h2>
                        <button class="modal-close" onclick="document.getElementById('ticketModal').remove()">&times;</button>
                    </div>
                    <form id="ticketForm" class="modal-body" style="overflow-y: auto; flex: 1; padding: 1.5rem;">
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Titulo *</label>
                            <input type="text" name="title" required value="${ticket?.title || ''}" placeholder="Ej: Pantalla no enciende" style="${inputStyle}">
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Descripcion *</label>
                            <textarea name="description" required rows="3" placeholder="Describe el problema detalladamente..." style="${inputStyle} min-height: 80px; resize: vertical;">${ticket?.description || ''}</textarea>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Categoria *</label>
                                <select name="category" required style="${inputStyle}">
                                    <option value="">Seleccionar...</option>
                                    <option value="hardware" ${ticket?.category === 'hardware' ? 'selected' : ''}>Hardware</option>
                                    <option value="software" ${ticket?.category === 'software' ? 'selected' : ''}>Software</option>
                                    <option value="network" ${ticket?.category === 'network' ? 'selected' : ''}>Red</option>
                                    <option value="other" ${ticket?.category === 'other' ? 'selected' : ''}>Otro</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Prioridad *</label>
                                <select name="priority" required style="${inputStyle}">
                                    <option value="low" ${ticket?.priority === 'low' ? 'selected' : ''}>Baja</option>
                                    <option value="medium" ${ticket?.priority === 'medium' ? 'selected' : ''}>Media</option>
                                    <option value="high" ${ticket?.priority === 'high' ? 'selected' : ''}>Alta</option>
                                    <option value="critical" ${ticket?.priority === 'critical' ? 'selected' : ''}>Critica</option>
                                </select>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Reportado por</label>
                                <select name="reportedBy" style="${inputStyle}">
                                    <option value="">Sin asignar</option>
                                    ${employees.map(e => `<option value="${e.id}" ${ticket?.reportedBy === e.id ? 'selected' : ''}>${this.escapeHtml(e.name)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Maquina relacionada</label>
                                <select name="machineId" style="${inputStyle}">
                                    <option value="">Ninguna</option>
                                    ${machines.map(m => `<option value="${m.id}" ${ticket?.machineId === m.id ? 'selected' : ''}>${this.escapeHtml(m.name)} (${m.serialNumber || 'S/N'})</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        
                        ${isEdit ? `
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Estado</label>
                                <select name="status" style="${inputStyle}">
                                    <option value="open" ${ticket?.status === 'open' ? 'selected' : ''}>Abierto</option>
                                    <option value="in_progress" ${ticket?.status === 'in_progress' ? 'selected' : ''}>En Progreso</option>
                                    <option value="resolved" ${ticket?.status === 'resolved' ? 'selected' : ''}>Resuelto</option>
                                    <option value="closed" ${ticket?.status === 'closed' ? 'selected' : ''}>Cerrado</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Resolucion / Notas</label>
                                <textarea name="resolution" rows="2" placeholder="Describe la solucion aplicada..." style="${inputStyle} min-height: 60px; resize: vertical;">${ticket?.resolution || ''}</textarea>
                            </div>
                        ` : ''}
                        
                        <input type="hidden" name="id" value="${ticket?.id || ''}">
                    </form>
                    <div class="modal-footer" style="flex-shrink: 0; display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
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
            
            if (data.id) {
                // Edit
                const existing = await this.getTicketById(data.id);
                if (existing) {
                    Object.assign(existing, data);
                    await Store.saveTicket(existing);
                }
            } else {
                // New
                delete data.id;
                await Store.saveTicket(data);
            }

            document.getElementById('ticketModal').remove();
            await this.initTable();
            this.showToast(isEdit ? 'Ticket actualizado' : 'Ticket creado correctamente');
        });
    },

    async deleteTicket(id) {
        if (confirm('¿Estas seguro de eliminar este ticket?')) {
            await Store.deleteTicket(id);
            await this.initTable();
            this.showToast('Ticket eliminado');
        }
    },

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.textContent = message;
        toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #22c55e; color: white; padding: 1rem 1.5rem; border-radius: 8px; z-index: 9999;';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(() => TicketsModule.init(), 100);
});

window.TicketsModule = TicketsModule;
