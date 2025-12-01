// ========================================
// TABLE - Componente de tabla de datos
// ========================================

class DataTable {
    constructor(options = {}) {
        this.container = options.container;
        this.columns = options.columns || [];
        this.data = options.data || [];
        this.filteredData = [...this.data];
        
        // Opciones
        this.perPage = options.perPage || 10;
        this.currentPage = 1;
        this.sortColumn = options.sortColumn || null;
        this.sortOrder = options.sortOrder || 'asc';
        this.searchFields = options.searchFields || [];
        this.emptyMessage = options.emptyMessage || 'No hay datos disponibles';
        
        // Callbacks
        this.onRowClick = options.onRowClick || null;
        this.onAction = options.onAction || null;

        // Inicializar
        if (this.container) {
            this.render();
        }
    }

    // ========================================
    // RENDER
    // ========================================

    render() {
        if (!this.container) return;

        // Aplicar ordenamiento
        this.sortData();

        // Paginar
        const paginated = Utils.paginate(this.filteredData, this.currentPage, this.perPage);

        this.container.innerHTML = `
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${this.renderHeaders()}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderRows(paginated.data)}
                    </tbody>
                </table>
                ${this.renderPagination(paginated)}
            </div>
        `;

        this.bindEvents();
    }

    renderHeaders() {
        return this.columns.map(col => {
            const sortable = col.sortable !== false ? 'sortable' : '';
            const sorted = this.sortColumn === col.key ? 'sorted' : '';
            const sortIcon = this.sortColumn === col.key
                ? (this.sortOrder === 'asc' ? '&uarr;' : '&darr;')
                : '';

            return `
                <th class="${sortable} ${sorted}" data-column="${col.key}">
                    ${col.label}
                    ${sortable ? `<span class="sort-icon">${sortIcon}</span>` : ''}
                </th>
            `;
        }).join('');
    }

    renderRows(data) {
        if (data.length === 0) {
            return `
                <tr>
                    <td colspan="${this.columns.length}">
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                    <polyline points="13 2 13 9 20 9"></polyline>
                                </svg>
                            </div>
                            <p class="empty-state-text">${this.emptyMessage}</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        return data.map(row => {
            const cells = this.columns.map(col => {
                let value = row[col.key];
                
                // Aplicar render personalizado si existe
                if (col.render) {
                    value = col.render(value, row);
                } else if (col.type) {
                    value = this.formatValue(value, col.type);
                }

                const className = col.className || '';
                return `<td class="${className}">${value ?? '-'}</td>`;
            }).join('');

            return `
                <tr data-id="${row.id || ''}" ${this.onRowClick ? 'class="clickable"' : ''}>
                    ${cells}
                </tr>
            `;
        }).join('');
    }

    renderPagination(paginated) {
        if (paginated.totalPages <= 1) {
            return `
                <div class="pagination">
                    <span class="pagination-info">
                        Mostrando ${paginated.total} registro${paginated.total !== 1 ? 's' : ''}
                    </span>
                </div>
            `;
        }

        const pages = this.getPaginationPages(paginated.page, paginated.totalPages);
        
        return `
            <div class="pagination">
                <span class="pagination-info">
                    Mostrando ${(paginated.page - 1) * paginated.perPage + 1} - 
                    ${Math.min(paginated.page * paginated.perPage, paginated.total)} 
                    de ${paginated.total}
                </span>
                <div class="pagination-controls">
                    <button class="pagination-btn" data-page="prev" ${!paginated.hasPrev ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    ${pages.map(p => {
                        if (p === '...') {
                            return '<span class="pagination-ellipsis">...</span>';
                        }
                        return `
                            <button class="pagination-btn ${p === paginated.page ? 'active' : ''}" data-page="${p}">
                                ${p}
                            </button>
                        `;
                    }).join('')}
                    <button class="pagination-btn" data-page="next" ${!paginated.hasNext ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    getPaginationPages(current, total) {
        const pages = [];
        const delta = 2;

        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        return pages;
    }

    // ========================================
    // EVENTOS
    // ========================================

    bindEvents() {
        // Ordenamiento
        this.container.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.column;
                if (this.sortColumn === column) {
                    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortColumn = column;
                    this.sortOrder = 'asc';
                }
                this.currentPage = 1;
                this.render();
            });
        });

        // Paginacion
        this.container.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                if (page === 'prev') {
                    this.currentPage--;
                } else if (page === 'next') {
                    this.currentPage++;
                } else {
                    this.currentPage = parseInt(page);
                }
                this.render();
            });
        });

        // Click en fila
        if (this.onRowClick) {
            this.container.querySelectorAll('tbody tr[data-id]').forEach(tr => {
                tr.addEventListener('click', (e) => {
                    // No hacer nada si clickeo en un boton de accion
                    if (e.target.closest('[data-action]')) return;
                    
                    const id = tr.dataset.id;
                    const row = this.filteredData.find(r => r.id === id);
                    if (row) this.onRowClick(row);
                });
            });
        }

        // Acciones
        if (this.onAction) {
            this.container.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    const tr = btn.closest('tr');
                    const id = tr?.dataset.id;
                    const row = this.filteredData.find(r => r.id === id);
                    if (row) this.onAction(action, row);
                });
            });
        }
    }

    // ========================================
    // METODOS PUBLICOS
    // ========================================

    /**
     * Actualiza los datos de la tabla
     * @param {Array} data - Nuevos datos
     */
    setData(data) {
        this.data = data;
        this.filteredData = [...data];
        this.currentPage = 1;
        this.render();
    }

    /**
     * Filtra los datos por busqueda
     * @param {string} search - Termino de busqueda
     */
    search(search) {
        if (!search) {
            this.filteredData = [...this.data];
        } else {
            this.filteredData = Utils.searchInFields(this.data, search, this.searchFields);
        }
        this.currentPage = 1;
        this.render();
    }

    /**
     * Aplica filtros multiples
     * @param {Object} filters - Objeto con filtros { campo: valor }
     */
    filter(filters) {
        this.filteredData = this.data.filter(row => {
            return Object.entries(filters).every(([key, value]) => {
                if (value === '' || value === null || value === undefined) return true;
                return row[key] === value;
            });
        });
        this.currentPage = 1;
        this.render();
    }

    /**
     * Ordena los datos
     */
    sortData() {
        if (!this.sortColumn) return;

        this.filteredData = Utils.sortBy(this.filteredData, this.sortColumn, this.sortOrder);
    }

    /**
     * Formatea valores segun tipo
     */
    formatValue(value, type) {
        switch (type) {
            case 'date':
                return Utils.formatDate(value);
            case 'datetime':
                return Utils.formatDateTime(value);
            case 'currency':
                return Utils.formatCurrency(value);
            case 'number':
                return Utils.formatNumber(value);
            default:
                return value;
        }
    }

    /**
     * Obtiene los datos filtrados actuales
     */
    getFilteredData() {
        return this.filteredData;
    }

    /**
     * Refresca la tabla con los datos actuales
     */
    refresh() {
        this.render();
    }
}

// Helpers para crear columnas de acciones
const TableActions = {
    /**
     * Crea columna de acciones
     * @param {Array} actions - Array de acciones ['view', 'edit', 'delete']
     */
    createActionsColumn(actions = ['view', 'edit', 'delete']) {
        const icons = {
            view: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
            edit: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
            delete: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
        };

        const tooltips = {
            view: 'Ver detalle',
            edit: 'Editar',
            delete: 'Eliminar'
        };

        return {
            key: 'actions',
            label: 'Acciones',
            sortable: false,
            className: 'cell-actions',
            render: () => {
                return actions.map(action => `
                    <button class="btn-icon sm btn-ghost" data-action="${action}" data-tooltip="${tooltips[action]}">
                        ${icons[action]}
                    </button>
                `).join('');
            }
        };
    },

    /**
     * Crea badge de estado
     */
    createStatusBadge(statusMap) {
        return (value) => {
            const config = statusMap[value] || { label: value, class: 'badge' };
            return `<span class="badge ${config.class}">${config.label}</span>`;
        };
    },

    /**
     * Crea badge de prioridad
     */
    priorityBadge(value) {
        const map = {
            low: { label: 'Baja', class: 'badge-low' },
            medium: { label: 'Media', class: 'badge-medium' },
            high: { label: 'Alta', class: 'badge-high' },
            critical: { label: 'Critica', class: 'badge-critical' }
        };
        const config = map[value] || { label: value, class: 'badge' };
        return `<span class="badge ${config.class}">${config.label}</span>`;
    }
};

// Exportar para uso global
window.DataTable = DataTable;
window.TableActions = TableActions;

