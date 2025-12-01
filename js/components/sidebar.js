// ========================================
// SIDEBAR - Componente de navegacion lateral
// ========================================

const Sidebar = {
    // Elementos del sidebar
    container: null,
    
    // Items de navegacion
    navItems: [
        {
            section: 'Principal',
            items: [
                {
                    id: 'dashboard',
                    label: 'Dashboard',
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
                    href: 'dashboard.html'
                },
                {
                    id: 'tickets',
                    label: 'Tickets',
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>`,
                    href: 'tickets.html',
                    badge: null // Se actualizara con tickets abiertos
                }
            ]
        },
        {
            section: 'Inventario',
            items: [
                {
                    id: 'machines',
                    label: 'Maquinas',
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
                    href: 'machines.html'
                },
                {
                    id: 'licenses',
                    label: 'Licencias',
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
                    href: 'licenses.html',
                    badge: null // Se actualizara con licencias por vencer
                }
            ]
        },
        {
            section: 'Personal',
            items: [
                {
                    id: 'employees',
                    label: 'Empleados',
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
                    href: 'employees.html'
                },
                {
                    id: 'assignments',
                    label: 'Asignaciones',
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
                    href: 'assignments.html'
                }
            ]
        },
        {
            section: 'Reportes',
            items: [
                {
                    id: 'analytics',
                    label: 'Analitica',
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
                    href: 'analytics.html'
                }
            ]
        },
        {
            section: 'Configuracion',
            adminOnly: true,
            items: [
                {
                    id: 'users',
                    label: 'Usuarios',
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 0-5 5v4a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"></path><path d="M19 15v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4"></path><path d="M12 12v4"></path><circle cx="12" cy="7" r="1"></circle></svg>`,
                    href: 'users.html'
                }
            ]
        }
    ],

    // ========================================
    // INICIALIZACION
    // ========================================

    /**
     * Inicializa el sidebar
     * @param {string} containerId - ID del contenedor
     */
    init(containerId = 'sidebar') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Sidebar container not found');
            return;
        }

        this.render();
        this.bindEvents();
        this.updateBadges();
        this.setActiveItem();
    },

    // ========================================
    // RENDER
    // ========================================

    /**
     * Renderiza el sidebar completo
     */
    render() {
        this.container.innerHTML = `
            <div class="sidebar-header">
                <a href="dashboard.html" class="sidebar-logo">
                    <span class="logo-icon">F</span>
                    <span class="logo-text">FIXIFY</span>
                </a>
            </div>
            
            <nav class="sidebar-nav">
                ${this.renderNavSections()}
            </nav>
            
            <div class="sidebar-footer">
                <div class="sidebar-user" id="sidebarUser">
                    ${this.renderUserInfo()}
                </div>
            </div>
        `;
    },

    /**
     * Renderiza las secciones de navegacion
     */
    renderNavSections() {
        const user = Auth?.getCurrentUser();
        const isAdmin = user?.role === 'admin';

        return this.navItems
            .filter(section => !section.adminOnly || isAdmin)
            .map(section => `
                <div class="nav-section">
                    <span class="nav-section-title">${section.section}</span>
                    ${section.items.map(item => this.renderNavItem(item)).join('')}
                </div>
            `).join('');
    },

    /**
     * Renderiza un item de navegacion
     */
    renderNavItem(item) {
        const badgeHtml = item.badge !== null && item.badge !== undefined
            ? `<span class="nav-item-badge">${item.badge}</span>`
            : '';

        return `
            <a href="${item.href}" class="nav-item" data-nav="${item.id}">
                ${item.icon}
                <span class="nav-item-label">${item.label}</span>
                ${badgeHtml}
            </a>
        `;
    },

    /**
     * Renderiza info del usuario en el footer
     */
    renderUserInfo() {
        const user = Auth?.getCurrentUser();
        if (!user) return '';

        const initials = Auth?.getUserInitials() || '?';
        
        return `
            <div class="user-avatar">${initials}</div>
            <div class="user-info">
                <span class="user-name">${Utils?.escapeHtml(user.name) || 'Usuario'}</span>
                <span class="user-role">${Auth?.getRoleName(user.role) || 'Usuario'}</span>
            </div>
        `;
    },

    // ========================================
    // EVENTOS
    // ========================================

    /**
     * Configura los event listeners
     */
    bindEvents() {
        // Toggle en mobile
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggle());
        }

        // Cerrar sidebar al hacer click fuera en mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                this.container.classList.contains('open') &&
                !this.container.contains(e.target) &&
                !menuToggle?.contains(e.target)) {
                this.close();
            }
        });

        // Ajustar al cambiar tamano de ventana
        window.addEventListener('resize', Utils?.debounce(() => {
            if (window.innerWidth > 768) {
                this.container.classList.remove('open', 'collapsed');
                document.querySelector('.main-content')?.classList.remove('expanded');
            }
        }, 200));
    },

    // ========================================
    // METODOS PUBLICOS
    // ========================================

    /**
     * Abre el sidebar (mobile)
     */
    open() {
        this.container.classList.add('open');
        this.container.classList.remove('collapsed');
    },

    /**
     * Cierra el sidebar (mobile)
     */
    close() {
        this.container.classList.remove('open');
    },

    /**
     * Toggle sidebar
     */
    toggle() {
        if (this.container.classList.contains('open')) {
            this.close();
        } else {
            this.open();
        }
    },

    /**
     * Marca el item activo segun la URL actual
     */
    setActiveItem() {
        const currentPath = window.location.pathname;
        const navItems = this.container.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (currentPath.includes(href) || currentPath.endsWith(href)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    /**
     * Actualiza los badges con datos actuales
     */
    updateBadges() {
        if (!window.Store) return;

        // Badge de tickets abiertos
        const stats = Store.getStats();
        const openTickets = stats.tickets.open;
        
        const ticketBadge = this.container.querySelector('[data-nav="tickets"] .nav-item-badge');
        if (ticketBadge) {
            if (openTickets > 0) {
                ticketBadge.textContent = openTickets;
                ticketBadge.style.display = 'block';
            } else {
                ticketBadge.style.display = 'none';
            }
        } else if (openTickets > 0) {
            const ticketItem = this.container.querySelector('[data-nav="tickets"]');
            if (ticketItem) {
                ticketItem.insertAdjacentHTML('beforeend', 
                    `<span class="nav-item-badge">${openTickets}</span>`
                );
            }
        }

        // Badge de licencias por vencer
        const expiringLicenses = Store.getExpiringLicenses(30).length;
        const licenseBadge = this.container.querySelector('[data-nav="licenses"] .nav-item-badge');
        
        if (licenseBadge) {
            if (expiringLicenses > 0) {
                licenseBadge.textContent = expiringLicenses;
                licenseBadge.style.display = 'block';
            } else {
                licenseBadge.style.display = 'none';
            }
        } else if (expiringLicenses > 0) {
            const licenseItem = this.container.querySelector('[data-nav="licenses"]');
            if (licenseItem) {
                licenseItem.insertAdjacentHTML('beforeend', 
                    `<span class="nav-item-badge" style="background: #f97316;">${expiringLicenses}</span>`
                );
            }
        }
    },

    /**
     * Refresca el sidebar
     */
    refresh() {
        this.render();
        this.bindEvents();
        this.updateBadges();
        this.setActiveItem();
    }
};

// Auto-inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    const sidebarEl = document.getElementById('sidebar');
    if (sidebarEl) {
        Sidebar.init();
    }
});

// Exportar para uso global
window.Sidebar = Sidebar;

