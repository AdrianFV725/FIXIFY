// ========================================
// LICENSES MODULE
// ========================================

const LicensesModule = {
    licenses: [],
    filteredLicenses: [],
    licenseAssignments: [],
    employees: [],

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

    async refresh() {
        // Método público para refrescar los datos y la vista
        await this.loadData();
        this.renderStats();
        this.renderAlerts();
        this.renderTable();
    },

    async loadData() {
        try {
            // Cargar datos frescos desde el store
            const [licenses, assignments, employees] = await Promise.all([
                Store.getLicenses(),
                Store.getLicenseAssignments(),
                Store.getEmployees()
            ]);
            
            // Asegurar que siempre sean arrays
            this.licenses = Array.isArray(licenses) ? licenses : [];
            this.licenseAssignments = Array.isArray(assignments) ? assignments : [];
            this.employees = Array.isArray(employees) ? employees : [];
            this.filteredLicenses = [...this.licenses];
            
            // Limpiar asignaciones inválidas (sin licenseId, sin employeeId o con datos corruptos)
            this.licenseAssignments = this.licenseAssignments.filter(a => {
                return a && a.licenseId && a.employeeId && typeof a.licenseId === 'string' && typeof a.employeeId === 'string';
            });
        } catch (e) {
            console.error('Error cargando licencias:', e);
            this.licenses = [];
            this.licenseAssignments = [];
            this.employees = [];
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
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const nextMonth = new Date(currentYear, currentMonth + 1, 1);
        
        // Calcular estadísticas basadas en facturación
        const totalCost = this.licenses.reduce((sum, l) => {
            if (l.isBilling && l.cost) {
                // Calcular costo mensual según periodicidad
                const monthlyCost = this.getMonthlyCost(l);
                return sum + monthlyCost;
            }
            return sum;
        }, 0);
        
        const billingThisMonth = this.licenses.filter(l => {
            if (!l.billingDate || !l.isBilling) return false;
            const billDate = new Date(l.billingDate);
            return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
        }).length;
        
        const billingNextMonth = this.licenses.filter(l => {
            if (!l.billingDate || !l.isBilling) return false;
            const billDate = new Date(l.billingDate);
            return billDate.getMonth() === nextMonth.getMonth() && billDate.getFullYear() === nextMonth.getFullYear();
        }).length;
        
        const assignedCount = this.licenses.reduce((sum, l) => {
            const assigned = (this.licenseAssignments || []).filter(a => 
                a && a.licenseId === l.id && !a.endDate
            ).length;
            return sum + assigned;
        }, 0);

        container.innerHTML = `
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${this.licenses.length}</span>
                    <span class="mini-stat-label">Total Licencias</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #22c55e;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${assignedCount}</span>
                    <span class="mini-stat-label">Asignadas</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(249, 115, 22, 0.1); color: #f97316;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M12 14h.01"></path><path d="M8 18h8"></path></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${billingThisMonth}</span>
                    <span class="mini-stat-label">Facturación Este Mes</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${this.formatCurrency(totalCost)}</span>
                    <span class="mini-stat-label">Costo Mensual</span>
                </div>
            </div>
        `;
    },
    
    getMonthlyCost(license) {
        if (!license.cost || !license.periodicity) return 0;
        
        const cost = parseFloat(license.cost) || 0;
        const periodicity = license.periodicity;
        
        switch(periodicity) {
            case 'monthly': return cost;
            case 'quarterly': return cost / 3;
            case 'semiannual': return cost / 6;
            case 'annual': return cost / 12;
            case 'one-time': return 0; // Pago único no se cuenta como mensual
            default: return cost;
        }
    },
    
    formatCurrency(amount) {
        if (amount === 0) return '$0';
        if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
        if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
        return `$${Math.round(amount).toLocaleString('es-MX')}`;
    },

    renderAlerts() {
        const container = document.getElementById('expirationAlerts');
        if (!container) return;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        // Mostrar alertas de facturación próxima (próximos 7 días)
        const upcomingBilling = this.licenses.filter(l => {
            if (!l.billingDate || !l.isBilling) return false;
            const billDate = new Date(l.billingDate);
            return billDate >= now && billDate <= nextWeek;
        });
        
        // Mostrar alertas de facturación sin tarjeta registrada
        const missingCard = this.licenses.filter(l => 
            l.isBilling && (!l.cardLastFour || l.cardLastFour.length !== 4)
        );

        // Ocultar si no hay alertas
        if (upcomingBilling.length === 0 && missingCard.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        
        if (missingCard.length > 0) {
            container.className = 'alerts-banner warning';
            container.innerHTML = `
                <div class="alert-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <span class="alert-text">${missingCard.length} licencia(s) en facturación sin tarjeta registrada.</span>
            `;
        } else if (upcomingBilling.length > 0) {
            container.className = 'alerts-banner';
            container.innerHTML = `
                <div class="alert-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </div>
                <span class="alert-text">${upcomingBilling.length} licencia(s) con facturación en los próximos 7 días.</span>
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
        // Filtrar solo asignaciones que:
        // 1. Tienen un licenseId válido
        // 2. Tienen un employeeId válido
        // 3. No tienen endDate (asignación activa)
        // 4. El licenseId coincide con una licencia existente
        // 5. El employeeId coincide con un empleado existente
        const activeAssignments = (this.licenseAssignments || []).filter(a => {
            // Validar que la asignación tenga los campos necesarios
            if (!a || !a.licenseId || !a.employeeId) return false;
            // Solo asignaciones activas (sin endDate)
            if (a.endDate) return false;
            // Verificar que el licenseId coincida con una licencia existente
            const hasValidLicense = this.licenses.some(l => l && l.id === a.licenseId);
            if (!hasValidLicense) return false;
            // Verificar que el employeeId coincida con un empleado existente
            return this.employees.some(e => e && e.id === a.employeeId);
        });
        
        const formatDate = (date) => date ? new Date(date).toLocaleDateString('es-MX') : '-';
        
        const getStatus = (license) => {
            if (!license.isBilling) return '<span class="badge badge-active">Activa</span>';
            if (!license.billingDate) return '<span class="badge badge-active">Activa</span>';
            
            // Verificar si tiene tarjeta registrada
            if (!license.cardLastFour || license.cardLastFour.length !== 4) {
                return '<span class="badge badge-maintenance">Sin Tarjeta</span>';
            }
            
            return '<span class="badge badge-active">En Facturación</span>';
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
                        <th>Facturación</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredLicenses.length === 0 ? `
                        <tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">${this.licenses.length === 0 ? 'No hay licencias registradas' : 'No se encontraron resultados'}</td></tr>
                    ` : this.filteredLicenses.map(l => {
                        if (!l || !l.id) return '';
                        
                        // Calcular asignaciones activas para esta licencia específica
                        // Filtrar por licenseId exacto y asegurar que no tenga endDate
                        const assignedCount = activeAssignments.filter(a => {
                            return a && a.licenseId === l.id && !a.endDate;
                        }).length;
                        
                        const totalQuantity = l.quantity || 0;
                        const usagePercent = totalQuantity > 0 ? Math.min(100, (assignedCount / totalQuantity) * 100) : 0;
                        
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
                            <td>${formatDate(l.billingDate)}</td>
                            <td>${getStatus(l)}</td>
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
                <div class="modal" style="max-width: 700px;">
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
                                <label>Fecha de Facturación</label>
                                <input type="date" name="billingDate" value="${license?.billingDate?.split('T')[0] || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Costo *</label>
                                <input type="number" name="cost" min="0" step="0.01" required value="${license?.cost || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            </div>
                            <div class="form-group">
                                <label>Tipo de Moneda *</label>
                                <select name="currency" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    <option value="MXN" ${license?.currency === 'MXN' ? 'selected' : ''}>MXN - Peso Mexicano</option>
                                    <option value="USD" ${license?.currency === 'USD' ? 'selected' : ''}>USD - Dólar Estadounidense</option>
                                    <option value="EUR" ${license?.currency === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                                    <option value="GBP" ${license?.currency === 'GBP' ? 'selected' : ''}>GBP - Libra Esterlina</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Periodicidad *</label>
                                <select name="periodicity" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    <option value="monthly" ${license?.periodicity === 'monthly' ? 'selected' : ''}>Mensual</option>
                                    <option value="quarterly" ${license?.periodicity === 'quarterly' ? 'selected' : ''}>Trimestral</option>
                                    <option value="semiannual" ${license?.periodicity === 'semiannual' ? 'selected' : ''}>Semestral</option>
                                    <option value="annual" ${license?.periodicity === 'annual' ? 'selected' : ''}>Anual</option>
                                    <option value="one-time" ${license?.periodicity === 'one-time' ? 'selected' : ''}>Pago Único</option>
                                </select>
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label>Link de Inicio de Sesión</label>
                                <div style="display: flex; gap: 0.5rem;">
                                    <input type="url" name="loginUrl" placeholder="https://ejemplo.com/login" value="${license?.loginUrl || ''}" style="flex: 1; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    ${license?.loginUrl ? `
                                        <a href="${license.loginUrl}" target="_blank" class="btn btn-primary" style="white-space: nowrap;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                <polyline points="15 3 21 3 21 9"></polyline>
                                                <line x1="10" y1="14" x2="21" y2="3"></line>
                                            </svg>
                                            Abrir
                                        </a>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Terminación de Tarjeta</label>
                                <input type="text" name="cardLastFour" maxlength="4" pattern="[0-9]{4}" placeholder="1234" value="${license?.cardLastFour || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                <small style="color: var(--text-tertiary); font-size: 0.8rem;">Últimos 4 dígitos de la tarjeta de pago</small>
                            </div>
                            <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1.5rem;">
                                <input type="checkbox" name="isBilling" id="isBilling" ${license?.isBilling ? 'checked' : ''} style="width: auto;">
                                <label for="isBilling" style="margin: 0; cursor: pointer;">Se está facturando</label>
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

        // Agregar listener para mostrar botón de link dinámicamente
        const loginUrlInput = document.querySelector('input[name="loginUrl"]');
        const loginUrlContainer = loginUrlInput?.parentElement;
        
        if (loginUrlInput && loginUrlContainer) {
            const updateLinkButton = () => {
                const url = loginUrlInput.value.trim();
                let existingBtn = loginUrlContainer.querySelector('a.btn');
                
                if (url && url.startsWith('http')) {
                    if (!existingBtn) {
                        const btn = document.createElement('a');
                        btn.href = url;
                        btn.target = '_blank';
                        btn.className = 'btn btn-primary';
                        btn.style.cssText = 'white-space: nowrap;';
                        btn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            Abrir
                        `;
                        loginUrlContainer.appendChild(btn);
                    } else {
                        existingBtn.href = url;
                    }
                } else if (existingBtn) {
                    existingBtn.remove();
                }
            };
            
            loginUrlInput.addEventListener('input', updateLinkButton);
            loginUrlInput.addEventListener('blur', updateLinkButton);
            
            // Inicializar si ya hay un valor
            if (loginUrlInput.value) {
                updateLinkButton();
            }
        }

        document.getElementById('licenseForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            if (data.quantity) data.quantity = parseInt(data.quantity);
            if (data.cost) data.cost = parseFloat(data.cost);
            
            // Manejar checkbox de facturación
            data.isBilling = document.getElementById('isBilling')?.checked || false;
            
            // Validar y formatear terminación de tarjeta (solo números, máximo 4 dígitos)
            if (data.cardLastFour) {
                data.cardLastFour = data.cardLastFour.replace(/\D/g, '').substring(0, 4);
            }
            
            // Agregar botón de link dinámicamente si hay URL
            if (data.loginUrl && data.loginUrl.trim()) {
                // El link ya está guardado, se mostrará en el detalle
            }
            
            if (data.id) {
                const existing = this.getById(data.id);
                if (existing) Object.assign(existing, data);
                await Store.saveLicense(existing || data);
            } else {
                delete data.id;
                await Store.saveLicense(data);
            }

            document.getElementById('licenseModal').remove();
            // Recargar datos frescos antes de renderizar
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
            // Recargar datos frescos antes de renderizar
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
