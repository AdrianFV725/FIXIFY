// ========================================
// CHARTS - Wrapper para graficas con Chart.js
// ========================================

const Charts = {
    // Instancias de graficas activas
    instances: {},

    // Colores por defecto
    colors: {
        primary: '#c9a86c',
        secondary: '#b8956a',
        success: '#22c55e',
        warning: '#f97316',
        danger: '#ef4444',
        info: '#3b82f6',
        purple: '#a855f7',
        cyan: '#06b6d4',
        pink: '#ec4899',
        lime: '#84cc16'
    },

    // Paleta para multiples series
    palette: [
        '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444',
        '#eab308', '#06b6d4', '#ec4899', '#84cc16', '#6366f1'
    ],

    // ========================================
    // CONFIGURACION BASE
    // ========================================

    /**
     * Obtiene configuracion base adaptada al tema
     */
    getBaseConfig() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: isDark ? '#b0b0b0' : '#5c5c5c',
                        font: {
                            family: 'Outfit, sans-serif',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                    titleColor: isDark ? '#f5f5f5' : '#1a1a1a',
                    bodyColor: isDark ? '#b0b0b0' : '#5c5c5c',
                    borderColor: isDark ? '#2a2a2a' : '#e8e4dc',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    titleFont: {
                        family: 'Outfit, sans-serif',
                        weight: '600'
                    },
                    bodyFont: {
                        family: 'Outfit, sans-serif'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                    },
                    ticks: {
                        color: isDark ? '#707070' : '#8a8a8a',
                        font: {
                            family: 'Outfit, sans-serif',
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                    },
                    ticks: {
                        color: isDark ? '#707070' : '#8a8a8a',
                        font: {
                            family: 'Outfit, sans-serif',
                            size: 11
                        }
                    }
                }
            }
        };
    },

    // ========================================
    // CREAR GRAFICAS
    // ========================================

    /**
     * Crea una grafica de linea
     * @param {string} canvasId - ID del canvas
     * @param {Object} data - Datos de la grafica
     * @param {Object} options - Opciones adicionales
     */
    line(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        // Destruir instancia previa
        this.destroy(canvasId);

        const config = {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: (data.datasets || []).map((ds, i) => ({
                    ...ds,
                    borderColor: ds.borderColor || this.palette[i % this.palette.length],
                    backgroundColor: ds.backgroundColor || `${this.palette[i % this.palette.length]}20`,
                    tension: ds.tension ?? 0.3,
                    fill: ds.fill ?? true,
                    pointRadius: ds.pointRadius ?? 4,
                    pointHoverRadius: ds.pointHoverRadius ?? 6,
                    pointBorderWidth: 2,
                    pointBackgroundColor: '#ffffff'
                }))
            },
            options: this.mergeOptions({
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: data.datasets?.length > 1,
                        position: 'top',
                        align: 'center',
                        labels: {
                            padding: 12,
                            usePointStyle: true,
                            boxWidth: 8,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }, options)
        };

        this.instances[canvasId] = new Chart(canvas, config);
        return this.instances[canvasId];
    },

    /**
     * Crea una grafica de barras
     * @param {string} canvasId - ID del canvas
     * @param {Object} data - Datos de la grafica
     * @param {Object} options - Opciones adicionales
     */
    bar(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        this.destroy(canvasId);

        const config = {
            type: 'bar',
            data: {
                labels: data.labels || [],
                datasets: (data.datasets || []).map((ds, i) => ({
                    ...ds,
                    backgroundColor: ds.backgroundColor || this.palette[i % this.palette.length],
                    borderRadius: ds.borderRadius ?? 6
                }))
            },
            options: this.mergeOptions({
                plugins: {
                    legend: {
                        display: data.datasets?.length > 1
                    }
                }
            }, options)
        };

        this.instances[canvasId] = new Chart(canvas, config);
        return this.instances[canvasId];
    },

    /**
     * Crea una grafica de barras horizontales
     * @param {string} canvasId - ID del canvas
     * @param {Object} data - Datos de la grafica
     * @param {Object} options - Opciones adicionales
     */
    horizontalBar(canvasId, data, options = {}) {
        return this.bar(canvasId, data, {
            indexAxis: 'y',
            ...options
        });
    },

    /**
     * Crea una grafica de dona
     * @param {string} canvasId - ID del canvas
     * @param {Object} data - Datos de la grafica
     * @param {Object} options - Opciones adicionales
     */
    doughnut(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        this.destroy(canvasId);

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const borderColor = isDark ? '#1a1a1a' : '#ffffff';

        const config = {
            type: 'doughnut',
            data: {
                labels: data.labels || [],
                datasets: [{
                    data: data.values || [],
                    backgroundColor: data.colors || this.palette.slice(0, data.values?.length || 5),
                    borderWidth: options.borderWidth !== undefined ? options.borderWidth : 2,
                    borderColor: options.borderColor || borderColor,
                    hoverOffset: options.hoverOffset || 12,
                    hoverBorderWidth: options.hoverBorderWidth || 3
                }]
            },
            options: {
                ...this.getBaseConfig(),
                cutout: options.cutout || '70%',
                plugins: {
                    ...this.getBaseConfig().plugins,
                    legend: {
                        position: options.legendPosition || 'right',
                        align: options.legendAlign || 'center',
                        labels: {
                            ...this.getBaseConfig().plugins.legend.labels,
                            padding: options.legendPadding !== undefined ? options.legendPadding : 16,
                            usePointStyle: options.usePointStyle !== undefined ? options.usePointStyle : true,
                            pointStyle: options.pointStyle || 'circle',
                            boxWidth: options.boxWidth || 12,
                            boxHeight: options.boxHeight || 12
                        },
                        ...(options.legend || {})
                    },
                    tooltip: {
                        ...this.getBaseConfig().plugins.tooltip,
                        ...(options.tooltip || {})
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: options.animationDuration || 1000,
                    easing: options.animationEasing || 'easeOutQuart',
                    ...(options.animation || {})
                },
                ...options
            }
        };

        // Remover scales para graficas circulares
        delete config.options.scales;

        this.instances[canvasId] = new Chart(canvas, config);
        return this.instances[canvasId];
    },

    /**
     * Crea una grafica de pie
     */
    pie(canvasId, data, options = {}) {
        return this.doughnut(canvasId, data, {
            cutout: 0,
            ...options
        });
    },

    // ========================================
    // UTILIDADES
    // ========================================

    /**
     * Mezcla opciones con configuracion base
     */
    mergeOptions(baseOptions, customOptions) {
        const base = this.getBaseConfig();
        return this.deepMerge(base, baseOptions, customOptions);
    },

    /**
     * Deep merge de objetos
     */
    deepMerge(...objects) {
        const result = {};
        
        objects.forEach(obj => {
            Object.keys(obj || {}).forEach(key => {
                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    result[key] = this.deepMerge(result[key] || {}, obj[key]);
                } else {
                    result[key] = obj[key];
                }
            });
        });

        return result;
    },

    /**
     * Actualiza datos de una grafica existente
     * @param {string} canvasId - ID del canvas
     * @param {Object} newData - Nuevos datos
     */
    update(canvasId, newData) {
        const chart = this.instances[canvasId];
        if (!chart) return;

        if (newData.labels) {
            chart.data.labels = newData.labels;
        }

        if (newData.datasets) {
            newData.datasets.forEach((ds, i) => {
                if (chart.data.datasets[i]) {
                    Object.assign(chart.data.datasets[i], ds);
                }
            });
        }

        if (newData.values && chart.data.datasets[0]) {
            chart.data.datasets[0].data = newData.values;
        }

        chart.update('active');
    },

    /**
     * Destruye una grafica
     * @param {string} canvasId - ID del canvas
     */
    destroy(canvasId) {
        if (this.instances[canvasId]) {
            this.instances[canvasId].destroy();
            delete this.instances[canvasId];
        }
    },

    /**
     * Destruye todas las graficas
     */
    destroyAll() {
        Object.keys(this.instances).forEach(id => {
            this.destroy(id);
        });
    },

    /**
     * Actualiza colores cuando cambia el tema
     */
    updateTheme() {
        Object.keys(this.instances).forEach(id => {
            const chart = this.instances[id];
            if (!chart) return;

            const base = this.getBaseConfig();
            
            // Actualizar colores de legend
            if (chart.options.plugins?.legend?.labels) {
                chart.options.plugins.legend.labels.color = base.plugins.legend.labels.color;
            }

            // Actualizar colores de tooltip
            if (chart.options.plugins?.tooltip) {
                Object.assign(chart.options.plugins.tooltip, base.plugins.tooltip);
            }

            // Actualizar colores de ejes
            if (chart.options.scales?.x) {
                chart.options.scales.x.grid.color = base.scales.x.grid.color;
                chart.options.scales.x.ticks.color = base.scales.x.ticks.color;
            }
            if (chart.options.scales?.y) {
                chart.options.scales.y.grid.color = base.scales.y.grid.color;
                chart.options.scales.y.ticks.color = base.scales.y.ticks.color;
            }

            chart.update();
        });
    },

    // ========================================
    // HELPERS PARA DATOS
    // ========================================

    /**
     * Genera etiquetas de meses
     * @param {number} count - Cantidad de meses
     * @returns {Array} - Array de nombres de meses
     */
    getMonthLabels(count = 12) {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const now = new Date();
        const currentMonth = now.getMonth();
        
        const labels = [];
        for (let i = count - 1; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            labels.push(months[monthIndex]);
        }
        
        return labels;
    },

    /**
     * Genera etiquetas de dias
     * @param {number} count - Cantidad de dias
     * @returns {Array} - Array de fechas formateadas
     */
    getDayLabels(count = 7) {
        const labels = [];
        const now = new Date();
        
        for (let i = count - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }));
        }
        
        return labels;
    }
};

// Escuchar cambios de tema para actualizar graficas
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                Charts.updateTheme();
            }
        });
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });
});

// Exportar para uso global
window.Charts = Charts;

