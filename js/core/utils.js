// ========================================
// UTILS - Funciones utilitarias
// ========================================

const Utils = {
    // ========================================
    // FORMATO DE FECHAS
    // ========================================

    /**
     * Formatea una fecha a formato legible
     * @param {string|Date} date - Fecha a formatear
     * @param {Object} options - Opciones de formato
     * @returns {string} - Fecha formateada
     */
    formatDate(date, options = {}) {
        if (!date) return '-';
        
        const d = new Date(date);
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        };
        
        return d.toLocaleDateString('es-MX', defaultOptions);
    },

    /**
     * Formatea fecha con hora
     * @param {string|Date} date - Fecha a formatear
     * @returns {string} - Fecha y hora formateadas
     */
    formatDateTime(date) {
        if (!date) return '-';
        
        const d = new Date(date);
        return d.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Calcula tiempo relativo (hace X dias, etc)
     * @param {string|Date} date - Fecha
     * @returns {string} - Tiempo relativo
     */
    timeAgo(date) {
        if (!date) return '-';
        
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        
        if (diffSecs < 60) return 'Hace un momento';
        if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
        if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        if (diffDays < 7) return `Hace ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
        if (diffWeeks < 4) return `Hace ${diffWeeks} semana${diffWeeks > 1 ? 's' : ''}`;
        if (diffMonths < 12) return `Hace ${diffMonths} mes${diffMonths > 1 ? 'es' : ''}`;
        
        return this.formatDate(date);
    },

    /**
     * Calcula dias hasta una fecha
     * @param {string|Date} date - Fecha futura
     * @returns {number} - Dias restantes (negativo si ya paso)
     */
    daysUntil(date) {
        if (!date) return null;
        
        const now = new Date();
        const target = new Date(date);
        const diffMs = target - now;
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    },

    // ========================================
    // FORMATO DE MONEDA
    // ========================================

    /**
     * Formatea numero como moneda
     * @param {number} amount - Cantidad
     * @param {string} currency - Moneda (default MXN)
     * @returns {string} - Cantidad formateada
     */
    formatCurrency(amount, currency = 'MXN') {
        if (amount === null || amount === undefined) return '-';
        
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency
        }).format(amount);
    },

    /**
     * Formatea numero con separadores de miles
     * @param {number} number - Numero a formatear
     * @returns {string} - Numero formateado
     */
    formatNumber(number) {
        if (number === null || number === undefined) return '-';
        return new Intl.NumberFormat('es-MX').format(number);
    },

    // ========================================
    // STRINGS
    // ========================================

    /**
     * Capitaliza primera letra
     * @param {string} str - String
     * @returns {string} - String capitalizado
     */
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    /**
     * Trunca texto con ellipsis
     * @param {string} str - String a truncar
     * @param {number} length - Longitud maxima
     * @returns {string} - String truncado
     */
    truncate(str, length = 50) {
        if (!str) return '';
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    },

    /**
     * Genera iniciales de un nombre
     * @param {string} name - Nombre completo
     * @returns {string} - Iniciales
     */
    getInitials(name) {
        if (!name) return '?';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    },

    /**
     * Genera slug de un string
     * @param {string} str - String
     * @returns {string} - Slug
     */
    slugify(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    // ========================================
    // VALIDACIONES
    // ========================================

    /**
     * Valida email
     * @param {string} email - Email a validar
     * @returns {boolean} - Es valido
     */
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * Valida que un objeto tenga campos requeridos
     * @param {Object} obj - Objeto a validar
     * @param {Array} requiredFields - Campos requeridos
     * @returns {Object} - { valid: boolean, missing: string[] }
     */
    validateRequired(obj, requiredFields) {
        const missing = requiredFields.filter(field => {
            const value = obj[field];
            return value === null || value === undefined || value === '';
        });
        
        return {
            valid: missing.length === 0,
            missing
        };
    },

    // ========================================
    // ARRAYS Y OBJETOS
    // ========================================

    /**
     * Agrupa array por propiedad
     * @param {Array} array - Array a agrupar
     * @param {string} key - Propiedad para agrupar
     * @returns {Object} - Objeto agrupado
     */
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key] || 'undefined';
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    },

    /**
     * Ordena array por propiedad
     * @param {Array} array - Array a ordenar
     * @param {string} key - Propiedad para ordenar
     * @param {string} order - 'asc' o 'desc'
     * @returns {Array} - Array ordenado
     */
    sortBy(array, key, order = 'asc') {
        return [...array].sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];
            
            // Manejar strings
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
    },

    /**
     * Filtra array por busqueda en multiples campos
     * @param {Array} array - Array a filtrar
     * @param {string} search - Termino de busqueda
     * @param {Array} fields - Campos donde buscar
     * @returns {Array} - Array filtrado
     */
    searchInFields(array, search, fields) {
        if (!search) return array;
        
        const term = search.toLowerCase();
        return array.filter(item => {
            return fields.some(field => {
                const value = item[field];
                if (!value) return false;
                return value.toString().toLowerCase().includes(term);
            });
        });
    },

    /**
     * Paginacion de array
     * @param {Array} array - Array a paginar
     * @param {number} page - Pagina actual (1-based)
     * @param {number} perPage - Items por pagina
     * @returns {Object} - { data, totalPages, total, page }
     */
    paginate(array, page = 1, perPage = 10) {
        const total = array.length;
        const totalPages = Math.ceil(total / perPage);
        const start = (page - 1) * perPage;
        const end = start + perPage;
        
        return {
            data: array.slice(start, end),
            totalPages,
            total,
            page,
            perPage,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };
    },

    // ========================================
    // DOM HELPERS
    // ========================================

    /**
     * Escapa HTML para prevenir XSS
     * @param {string} str - String a escapar
     * @returns {string} - String escapado
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Crea elemento con atributos
     * @param {string} tag - Tag HTML
     * @param {Object} attrs - Atributos
     * @param {string|Array} children - Contenido
     * @returns {HTMLElement} - Elemento creado
     */
    createElement(tag, attrs = {}, children = null) {
        const el = document.createElement(tag);
        
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'className') {
                el.className = value;
            } else if (key.startsWith('on')) {
                el.addEventListener(key.substring(2).toLowerCase(), value);
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    el.dataset[dataKey] = dataValue;
                });
            } else {
                el.setAttribute(key, value);
            }
        });
        
        if (children) {
            if (Array.isArray(children)) {
                children.forEach(child => {
                    if (typeof child === 'string') {
                        el.appendChild(document.createTextNode(child));
                    } else if (child instanceof HTMLElement) {
                        el.appendChild(child);
                    }
                });
            } else if (typeof children === 'string') {
                el.innerHTML = children;
            }
        }
        
        return el;
    },

    // ========================================
    // EXPORTACION
    // ========================================

    /**
     * Exporta datos a CSV
     * @param {Array} data - Array de objetos
     * @param {string} filename - Nombre del archivo
     * @param {Array} columns - Columnas a exportar { key, label }
     */
    exportToCSV(data, filename, columns) {
        const headers = columns.map(c => c.label).join(',');
        const rows = data.map(item => {
            return columns.map(c => {
                let value = item[c.key];
                if (value === null || value === undefined) value = '';
                // Escapar comillas y comas
                value = value.toString().replace(/"/g, '""');
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    value = `"${value}"`;
                }
                return value;
            }).join(',');
        });
        
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    },

    /**
     * Importa datos desde CSV
     * @param {File} file - Archivo CSV
     * @returns {Promise<Array>} - Array de objetos
     */
    importFromCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n').filter(line => line.trim());
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
                    
                    const data = lines.slice(1).map(line => {
                        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                        const obj = {};
                        headers.forEach((header, i) => {
                            obj[header] = values[i] || '';
                        });
                        return obj;
                    });
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsText(file);
        });
    },

    // ========================================
    // DEBOUNCE Y THROTTLE
    // ========================================

    /**
     * Debounce - Retrasa ejecucion hasta que pase el delay sin llamadas
     * @param {Function} func - Funcion a ejecutar
     * @param {number} delay - Delay en ms
     * @returns {Function} - Funcion debounced
     */
    debounce(func, delay = 300) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    /**
     * Throttle - Limita ejecucion a una vez por intervalo
     * @param {Function} func - Funcion a ejecutar
     * @param {number} limit - Intervalo en ms
     * @returns {Function} - Funcion throttled
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // ========================================
    // COLORES
    // ========================================

    /**
     * Genera color aleatorio
     * @returns {string} - Color hex
     */
    randomColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    },

    /**
     * Genera colores para graficas
     * @param {number} count - Cantidad de colores
     * @returns {Array} - Array de colores
     */
    chartColors(count) {
        const baseColors = [
            '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444',
            '#eab308', '#06b6d4', '#ec4899', '#84cc16', '#6366f1'
        ];
        
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        return colors;
    }
};

// Exportar para uso global
window.Utils = Utils;

