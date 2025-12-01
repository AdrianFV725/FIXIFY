// ========================================
// AUTH - Gestion de autenticacion y sesion
// ========================================

const Auth = {
    // Configuracion
    SESSION_KEY: 'fixify-session',
    USER_KEY: 'fixify-user',
    
    // Usuarios validos (en produccion esto seria en backend)
    validUsers: [
        {
            email: 'admin@brands.mx',
            password: '3lN3g0c10d3tuV1d4',
            name: 'Administrador',
            role: 'admin'
        }
    ],

    // ========================================
    // METODOS DE SESION
    // ========================================

    /**
     * Verifica si hay una sesion activa
     * @returns {boolean} - Hay sesion activa
     */
    isAuthenticated() {
        return !!(localStorage.getItem(this.SESSION_KEY) || sessionStorage.getItem(this.SESSION_KEY));
    },

    /**
     * Obtiene el usuario actual
     * @returns {Object|null} - Usuario logueado
     */
    getCurrentUser() {
        const userJson = localStorage.getItem(this.USER_KEY) || sessionStorage.getItem(this.USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    },

    /**
     * Inicia sesion
     * @param {string} email - Email del usuario
     * @param {string} password - Password
     * @param {boolean} remember - Recordar sesion
     * @returns {Object} - { success, message, user }
     */
    login(email, password, remember = false) {
        // Buscar usuario valido
        const user = this.validUsers.find(u => u.email === email && u.password === password);
        
        if (!user) {
            return {
                success: false,
                message: 'Credenciales incorrectas'
            };
        }

        // Crear datos de sesion (sin password)
        const sessionUser = {
            email: user.email,
            name: user.name,
            role: user.role,
            loginAt: new Date().toISOString()
        };

        // Guardar sesion
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem(this.SESSION_KEY, 'active');
        storage.setItem(this.USER_KEY, JSON.stringify(sessionUser));

        // Log de actividad
        if (window.Store) {
            Store.logActivity('user_login', { email: user.email });
        }

        return {
            success: true,
            message: 'Inicio de sesion exitoso',
            user: sessionUser
        };
    },

    /**
     * Cierra sesion
     */
    logout() {
        const user = this.getCurrentUser();
        
        // Log de actividad
        if (window.Store && user) {
            Store.logActivity('user_logout', { email: user.email });
        }

        // Limpiar storage
        localStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem(this.USER_KEY);
        sessionStorage.removeItem(this.SESSION_KEY);
        sessionStorage.removeItem(this.USER_KEY);

        // Redirigir a login
        window.location.href = '../index.html';
    },

    /**
     * Verifica permisos del usuario
     * @param {string} permission - Permiso a verificar
     * @returns {boolean} - Tiene el permiso
     */
    hasPermission(permission) {
        const user = this.getCurrentUser();
        if (!user) return false;

        // Admin tiene todos los permisos
        if (user.role === 'admin') return true;

        // TODO: Implementar sistema de permisos granular
        const rolePermissions = {
            admin: ['*'],
            manager: ['view', 'create', 'edit'],
            user: ['view']
        };

        const permissions = rolePermissions[user.role] || [];
        return permissions.includes('*') || permissions.includes(permission);
    },

    /**
     * Protege una pagina (redirige si no esta autenticado)
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            // Guardar URL actual para redirigir despues del login
            sessionStorage.setItem('fixify-redirect', window.location.href);
            window.location.href = '/index.html';
            return false;
        }
        return true;
    },

    /**
     * Redirige si ya esta autenticado (para pagina de login)
     */
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            const redirect = sessionStorage.getItem('fixify-redirect') || '/pages/dashboard.html';
            sessionStorage.removeItem('fixify-redirect');
            window.location.href = redirect;
            return true;
        }
        return false;
    },

    // ========================================
    // HELPERS PARA UI
    // ========================================

    /**
     * Obtiene las iniciales del usuario
     * @returns {string} - Iniciales
     */
    getUserInitials() {
        const user = this.getCurrentUser();
        if (!user || !user.name) return '?';
        
        return user.name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    },

    /**
     * Renderiza el menu de usuario
     * @param {HTMLElement} container - Contenedor del menu
     */
    renderUserMenu(container) {
        const user = this.getCurrentUser();
        if (!container) return;
        
        // Si no hay usuario, no mostrar nada
        if (!user) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="user-menu-trigger" id="userMenuTrigger">
                <div class="user-avatar">${this.getUserInitials()}</div>
                <div class="user-info">
                    <span class="user-name">${Utils?.escapeHtml(user.name) || user.name}</span>
                    <span class="user-role">${this.getRoleName(user.role)}</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            <div class="user-menu-dropdown">
                <div class="user-menu-header">
                    <div class="user-avatar">${this.getUserInitials()}</div>
                    <div class="user-name">${Utils?.escapeHtml(user.name) || user.name}</div>
                    <div class="user-email">${Utils?.escapeHtml(user.email) || user.email}</div>
                </div>
                <div class="user-menu-items">
                    <button class="user-menu-item" data-action="profile">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        Mi Perfil
                    </button>
                    <div class="user-menu-divider"></div>
                    <button class="user-menu-item danger" data-action="logout">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Cerrar Sesion
                    </button>
                </div>
            </div>
        `;

        // Toggle menu
        const trigger = container.querySelector('#userMenuTrigger');
        trigger?.addEventListener('click', (e) => {
            e.stopPropagation();
            container.classList.toggle('open');
        });

        // Cerrar sesion
        container.querySelector('[data-action="logout"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.logout();
        });

        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                container.classList.remove('open');
            }
        });
    },

    /**
     * Obtiene nombre legible del rol
     * @param {string} role - Rol
     * @returns {string} - Nombre del rol
     */
    getRoleName(role) {
        const roleNames = {
            admin: 'Administrador',
            manager: 'Manager',
            user: 'Usuario'
        };
        return roleNames[role] || role;
    }
};

// Exportar para uso global
window.Auth = Auth;

