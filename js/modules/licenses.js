// ========================================
// LICENSES MODULE
// Gestion de licencias de software
// ========================================

const LicensesModule = {
    table: null,

    init() {
        if (!Auth.requireAuth()) return;
        this.renderStats();
        this.renderAlerts();
        this.renderFilters();
        this.initTable();
        this.bindEvents();
    },

    renderStats() {
        const container = document.getElementById('licenseStats');
        if (!container) return;

        const licenses = Store.getLicenses();
        const expiring = Store.getExpiringLicenses(30);
        const expired = licenses.filter(l => l.expirationDate && new Date(l.expirationDate) < new Date());
        const totalAssigned = licenses.reduce((sum, l) => sum + (l.assignedCount || 0), 0);

        container.innerHTML = `
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${licenses.length}</span>
                    <span class="mini-stat-label">Total Licencias</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #22c55e;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${totalAssigned}</span>
                    <span class="mini-stat-label">Asignadas</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(249, 115, 22, 0.1); color: #f97316;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${expiring.length}</span>
                    <span class="mini-stat-label">Por Vencer</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${expired.length}</span>
                    <span class="mini-stat-label">Vencidas</span>
                </div>
            </div>
        `;
    },

    renderAlerts() {
        const container = document.getElementById('expirationAlerts');
        if (!container) return;

        const expiring = Store.getExpiringLicenses(30);
        if (expiring.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = `
            <span class="alert-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </span>
            <span class="alert-text">Tienes <strong>${expiring.length}</strong> licencia${expiring.length > 1 ? 's' : ''} proxima${expiring.length > 1 ? 's' : ''} a vencer en los proximos 30 dias</span>
        `;
        container.classList.add('warning');
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
                    <option value="per_user">Por Usuario</option>
                    <option value="per_device">Por Dispositivo</option>
                </select>
            </div>
            <button class="filter-btn" id="clearFilters">Limpiar</button>
        `;
    },

    initTable() {
        const container = document.querySelector('.data-table-container') || document.querySelector('.page-content');
        if (!container) return;

        if (!document.getElementById('licensesTableContainer')) {
            const tableContainer = document.createElement('div');
            tableContainer.id = 'licensesTableContainer';
            container.appendChild(tableContainer);
        }

        this.table = new DataTable({
            container: document.getElementById('licensesTableContainer'),
            columns: [
                { key: 'software', label: 'Software', className: 'cell-primary' },
                { key: 'type', label: 'Tipo', render: (v) => this.getTypeLabel(v) },
                { key: 'quantity', label: 'Cantidad', render: (v) => v || 'Ilimitada' },
                { key: 'assignedCount', label: 'Asignadas', render: (v) => v || 0 },
                { key: 'expirationDate', label: 'Vencimiento', type: 'date', render: (v) => this.renderExpiration(v) },
                { key: 'cost', label: 'Costo', type: 'currency' },
                TableActions.createActionsColumn(['view', 'edit', 'delete'])
            ],
            data: Store.getLicenses(),
            searchFields: ['software', 'licenseKey', 'vendor'],
            perPage: 10,
            emptyMessage: 'No hay licencias registradas',
            onAction: (action, row) => this.handleAction(action, row)
        });
    },

    getTypeLabel(type) {
        const labels = { perpetual: 'Perpetua', subscription: 'Suscripcion', per_user: 'Por Usuario', per_device: 'Por Dispositivo' };
        return labels[type] || type || '-';
    },

    renderExpiration(date) {
        if (!date) return '-';
        const days = Utils.daysUntil(date);
        const formatted = Utils.formatDate(date);
        if (days < 0) return `<span class="badge badge-expired">${formatted}</span>`;
        if (days <= 30) return `<span class="badge badge-expiring">${formatted}</span>`;
        return formatted;
    },

    bindEvents() {
        document.getElementById('searchInput')?.addEventListener('input', Utils.debounce((e) => {
            this.table?.search(e.target.value);
        }, 300));

        document.getElementById('typeFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('typeFilter').value = '';
            this.table?.setData(Store.getLicenses());
        });
        document.getElementById('newLicenseBtn')?.addEventListener('click', () => this.openLicenseForm());
    },

    applyFilters() {
        const filters = { type: document.getElementById('typeFilter')?.value };
        this.table?.filter(filters);
    },

    handleAction(action, license) {
        switch (action) {
            case 'view': this.viewLicense(license.id); break;
            case 'edit': this.openLicenseForm(license); break;
            case 'delete': this.deleteLicense(license); break;
        }
    },

    async openLicenseForm(license = null) {
        const isEdit = !!license;
        const fields = [
            { name: 'software', label: 'Software/Producto', type: 'text', required: true, placeholder: 'Ej: Microsoft Office 365' },
            { name: 'licenseKey', label: 'Clave de Licencia', type: 'text', placeholder: 'XXXXX-XXXXX-XXXXX' },
            { name: 'type', label: 'Tipo', type: 'select', required: true, options: [
                { value: 'perpetual', label: 'Perpetua' },
                { value: 'subscription', label: 'Suscripcion' },
                { value: 'per_user', label: 'Por Usuario' },
                { value: 'per_device', label: 'Por Dispositivo' }
            ]},
            { name: 'quantity', label: 'Cantidad', type: 'number', min: 1, placeholder: 'Dejar vacio si ilimitada' },
            { name: 'expirationDate', label: 'Fecha de Vencimiento', type: 'date' },
            { name: 'cost', label: 'Costo', type: 'number', min: 0, placeholder: '0.00' },
            { name: 'vendor', label: 'Proveedor', type: 'text' },
            { name: 'notes', label: 'Notas', type: 'textarea', fullWidth: true }
        ];

        const result = await Modal.form({
            title: isEdit ? 'Editar Licencia' : 'Nueva Licencia',
            fields, data: license || { type: 'subscription' },
            submitText: isEdit ? 'Actualizar' : 'Registrar', size: 'lg'
        });

        if (result) {
            if (isEdit) result.id = license.id;
            if (result.quantity) result.quantity = parseInt(result.quantity);
            if (result.cost) result.cost = parseFloat(result.cost);

            Store.saveLicense(result);
            this.table?.setData(Store.getLicenses());
            this.renderStats();
            this.renderAlerts();
            Toast.success(isEdit ? 'Licencia actualizada' : 'Licencia registrada');
        }
    },

    viewLicense(licenseId) {
        const license = Store.getLicenseById(licenseId);
        if (!license) return;

        const assignments = Store.getLicenseAssignments().filter(a => a.licenseId === licenseId && !a.endDate);
        const employees = assignments.map(a => Store.getEmployeeById(a.employeeId)).filter(Boolean);

        Modal.open({
            title: license.software, size: 'lg',
            content: `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div><label style="font-size: 0.75rem; color: var(--text-tertiary);">Tipo</label><p style="font-weight: 500;">${this.getTypeLabel(license.type)}</p></div>
                    <div><label style="font-size: 0.75rem; color: var(--text-tertiary);">Cantidad</label><p style="font-weight: 500;">${license.quantity || 'Ilimitada'}</p></div>
                    <div><label style="font-size: 0.75rem; color: var(--text-tertiary);">Asignadas</label><p style="font-weight: 500;">${license.assignedCount || 0}</p></div>
                    <div><label style="font-size: 0.75rem; color: var(--text-tertiary);">Vencimiento</label><p style="font-weight: 500;">${license.expirationDate ? Utils.formatDate(license.expirationDate) : 'Sin vencimiento'}</p></div>
                </div>
                ${employees.length > 0 ? `
                    <h4 style="font-size: 0.875rem; margin-bottom: 0.5rem;">Empleados con esta licencia</h4>
                    <div style="max-height: 150px; overflow-y: auto;">
                        ${employees.map(e => `<div style="padding: 0.5rem; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 0.5rem;">${e.name} ${e.lastName || ''}</div>`).join('')}
                    </div>
                ` : '<p class="text-muted">Sin asignaciones</p>'}
            `,
            buttons: [{ label: 'Cerrar', action: 'close' }, { label: 'Editar', action: 'edit', variant: 'btn-primary' }]
        });

        Modal.getActiveModal()?.addEventListener('modal-action', (e) => {
            if (e.detail.action === 'edit') { Modal.close(); this.openLicenseForm(license); }
        });
    },

    async deleteLicense(license) {
        if (await Modal.confirmDelete(license.software)) {
            Store.deleteLicense(license.id);
            this.table?.setData(Store.getLicenses());
            this.renderStats();
            Toast.success('Licencia eliminada');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => LicensesModule.init());
window.LicensesModule = LicensesModule;

