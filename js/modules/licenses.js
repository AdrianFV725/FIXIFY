// ========================================
// LICENSES MODULE
// ========================================

const LicensesModule = {
    licenses: [],
    filteredLicenses: [],
    licenseAssignments: [],

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }

        await this.loadData();
        this.renderStats();
        this.renderAlerts();
        this.renderFilters();
        this.renderTable();
        this.bindEvents();
    },

    async loadData() {
        try {
            this.licenses = await Store.getLicenses() || [];
            this.licenseAssignments = await Store.getLicenseAssignments() || [];
            this.filteredLicenses = [...this.licenses];
        } catch (e) {
            console.error('Error cargando licencias:', e);
            this.licenses = [];
            this.licenseAssignments = [];
            this.filteredLicenses = [];
        }
    },

    applyFilters() {
        const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
        const typeFilter = document.getElementById('typeFilter')?.value || '';

        this.filteredLicenses = this.licenses.filter(l => {
            const matchesSearch = !searchTerm || 
                (l.software || '').toLowerCase().includes(searchTerm) ||
                (l.key || '').toLowerCase().includes(searchTerm);

            const matchesType = !typeFilter || l.type === typeFilter;

            return matchesSearch && matchesType;
        });

        this.renderTable();
    },

    renderStats() {
        const container = document.getElementById('licenseStats');
        if (!container) return;

        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const stats = {
            total: this.licenses.length,
            active: this.licenses.filter(l => !l.expirationDate || new Date(l.expirationDate) > now).length,
            expiring: this.licenses.filter(l => l.expirationDate && new Date(l.expirationDate) <= in30Days && new Date(l.expirationDate) > now).length,
            expired: this.licenses.filter(l => l.expirationDate && new Date(l.expirationDate) < now).length
        };

        container.innerHTML = `
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.total}</span>
                    <span class="mini-stat-label">Total Licencias</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #22c55e;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.active}</span>
                    <span class="mini-stat-label">Activas</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(249, 115, 22, 0.1); color: #f97316;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.expiring}</span>
                    <span class="mini-stat-label">Por Vencer (30d)</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.expired}</span>
                    <span class="mini-stat-label">Vencidas</span>
                </div>
            </div>
        `;
    },

    renderAlerts() {
        const container = document.getElementById('expirationAlerts');
        if (!container) return;

        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const expiring = this.licenses.filter(l => 
            l.expirationDate && 
            new Date(l.expirationDate) <= in30Days && 
            new Date(l.expirationDate) > now
        );
        
        const expired = this.licenses.filter(l => 
            l.expirationDate && 
            new Date(l.expirationDate) < now
        );

        // Ocultar si no hay alertas
        if (expiring.length === 0 && expired.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        
        if (expired.length > 0) {
            container.className = 'alerts-banner';
            container.innerHTML = `
                <div class="alert-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>
                <span class="alert-text">Tienes ${expired.length} licencia(s) vencida(s) que requieren atencion.</span>
            `;
        } else if (expiring.length > 0) {
            container.className = 'alerts-banner warning';
            container.innerHTML = `
                <div class="alert-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <span class="alert-text">Tienes ${expiring.length} licencia(s) por vencer en los proximos 30 dias.</span>
            `;
        }
    },

    renderFilters() {
        const container = document.getElementById('filtersBar');
        if (!container) return;

        container.innerHTML = `
            <div class="filter-group">
                <input type="text" class="filter-input" id="searchInput" placeholder="Buscar por software, clave...">
            </div>
            <div class="filter-group">
                <label class="filter-label">Tipo:</label>
                <select class="filter-select" id="typeFilter">
                    <option value="">Todos</option>
                    <option value="perpetual">Perpetua</option>
                    <option value="subscription">Suscripcion</option>
                    <option value="volume">Por Volumen</option>
                </select>
            </div>
            <button class="filter-btn" id="clearFilters">Limpiar</button>
        `;
    },

    renderTable() {
        const container = document.querySelector('.data-table-container') || document.querySelector('.page-content');
        if (!container) return;

        let tableContainer = document.getElementById('licensesTableContainer');
        if (!tableContainer) {
            tableContainer = document.createElement('div');
            tableContainer.id = 'licensesTableContainer';
            container.appendChild(tableContainer);
        }

        // Calcular asignaciones activas por licencia dinámicamente
        const activeAssignments = this.licenseAssignments.filter(a => !a.endDate);
        
        const formatDate = (date) => date ? new Date(date).toLocaleDateString('es-MX') : '-';
        
        const getStatus = (expirationDate) => {
            if (!expirationDate) return '<span class="badge badge-active">Activa</span>';
            const exp = new Date(expirationDate);
            const now = new Date();
            const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            
            if (exp < now) return '<span class="badge badge-inactive">Vencida</span>';
            if (exp <= in30Days) return '<span class="badge badge-maintenance">Por Vencer</span>';
            return '<span class="badge badge-active">Activa</span>';
        };

        tableContainer.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Software</th>
                        <th>Tipo</th>
                        <th>Cantidad</th>
                        <th>Asignadas</th>
                        <th>Uso</th>
                        <th>Vencimiento</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredLicenses.length === 0 ? `
                        <tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">${this.licenses.length === 0 ? 'No hay licencias registradas' : 'No se encontraron resultados'}</td></tr>
                    ` : this.filteredLicenses.map(l => {
                        // Calcular asignaciones activas para esta licencia
                        const assignedCount = activeAssignments.filter(a => a.licenseId === l.id).length;
                        const totalQuantity = l.quantity || 0;
                        const usagePercent = totalQuantity > 0 ? (assignedCount / totalQuantity) * 100 : 0;
                        
                        return `
                        <tr data-id="${l.id}" class="license-row-clickable" style="cursor: pointer;" onclick="LicensesModule.viewLicenseDetail('${l.id}')">
                            <td><strong>${this.escapeHtml(l.software || '')}</strong></td>
                            <td>${l.type || '-'}</td>
                            <td>${totalQuantity || '-'}</td>
                            <td>
                                <span class="assigned-count ${assignedCount > 0 ? 'has-assignments' : ''}">${assignedCount}</span>
                            </td>
                            <td>
                                <div class="license-progress-cell">
                                    <div class="license-progress-bar-small">
                                        <div class="license-progress-fill-small" style="width: ${usagePercent}%"></div>
                                    </div>
                                    <span class="license-progress-text">${assignedCount}/${totalQuantity}</span>
                                </div>
                            </td>
                            <td>${formatDate(l.expirationDate)}</td>
                            <td>${getStatus(l.expirationDate)}</td>
                            <td onclick="event.stopPropagation();">
                                <button class="btn-icon sm" onclick="LicensesModule.editLicense('${l.id}')" title="Editar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="btn-icon sm" onclick="LicensesModule.deleteLicense('${l.id}')" title="Eliminar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </td>
                        </tr>
                    `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },

    getById(id) {
        return this.licenses.find(l => l.id === id);
    },

    viewLicenseDetail(id) {
        window.location.href = `license-detail.html?id=${id}`;
    },

    async editLicense(id) {
        const license = this.getById(id);
        if (license) {
            await this.openForm(license);
        } else {
            this.showToast('Error: Licencia no encontrada');
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    bindEvents() {
        document.getElementById('newLicenseBtn')?.addEventListener('click', () => this.openForm());
        
        // Filtros en tiempo real
        document.getElementById('searchInput')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('typeFilter')?.addEventListener('change', () => this.applyFilters());

        // Limpiar filtros
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('typeFilter').value = '';
            this.applyFilters();
        });
    },

    async openForm(license = null) {
        const isEdit = !!license;

        const modalHtml = `
            <div class="modal-overlay active" id="licenseModal">
                <div class="modal" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2>${isEdit ? 'Editar Licencia' : 'Nueva Licencia'}</h2>
                        <button class="modal-close" onclick="document.getElementById('licenseModal').remove()">&times;</button>
                    </div>
                    <form id="licenseForm" class="modal-body">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group" style="grid-column: span 2;">
                                <label>Software/Producto *</label>
                                <input type="text" name="software" required value="${license?.software || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Tipo *</label>
                                <select name="type" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    <option value="subscription" ${license?.type === 'subscription' ? 'selected' : ''}>Suscripcion</option>
                                    <option value="perpetual" ${license?.type === 'perpetual' ? 'selected' : ''}>Perpetua</option>
                                    <option value="volume" ${license?.type === 'volume' ? 'selected' : ''}>Por Volumen</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Cantidad</label>
                                <input type="number" name="quantity" min="1" value="${license?.quantity || 1}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Fecha de Vencimiento</label>
                                <input type="date" name="expirationDate" value="${license?.expirationDate?.split('T')[0] || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Costo</label>
                                <input type="number" name="cost" min="0" step="0.01" value="${license?.cost || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                        </div>
                        <input type="hidden" name="id" value="${license?.id || ''}">
                    </form>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('licenseModal').remove()">Cancelar</button>
                        <button type="submit" form="licenseForm" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Registrar'}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('licenseForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            if (data.quantity) data.quantity = parseInt(data.quantity);
            if (data.cost) data.cost = parseFloat(data.cost);
            
            if (data.id) {
                const existing = this.getById(data.id);
                if (existing) Object.assign(existing, data);
                await Store.saveLicense(existing || data);
            } else {
                delete data.id;
                await Store.saveLicense(data);
            }

            document.getElementById('licenseModal').remove();
            await this.loadData();
            this.renderStats();
            this.renderAlerts();
            this.renderTable();
            this.showToast(isEdit ? 'Licencia actualizada' : 'Licencia registrada');
        });
    },

    async deleteLicense(id) {
        const license = this.getById(id);
        const name = license?.software || 'esta licencia';
        
        const confirmed = await Modal.confirmDelete(name, 'licencia');
        if (confirmed) {
            await Store.deleteLicense(id);
            await this.loadData();
            this.renderStats();
            this.renderAlerts();
            this.renderTable();
            this.showToast('Licencia eliminada');
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
    setTimeout(() => LicensesModule.init(), 100);
});

window.LicensesModule = LicensesModule;
