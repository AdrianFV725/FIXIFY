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
        if (!container || !user) return;

        container.innerHTML = `
            <div class="user-avatar">${this.getUserInitials()}</div>
            <div class="user-info">
                <span class="user-name">${Utils.escapeHtml(user.name)}</span>
                <span class="user-role">${this.getRoleName(user.role)}</span>
            </div>
            <div class="user-dropdown">
                <button class="dropdown-toggle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
                <div class="dropdown-menu">
                    <a href="#" class="dropdown-item" data-action="profile">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        Mi Perfil
                    </a>
                    <a href="#" class="dropdown-item" data-action="settings">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        Configuracion
                    </a>
                    <div class="dropdown-divider"></div>
                    <a href="#" class="dropdown-item danger" data-action="logout">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Cerrar Sesion
                    </a>
                </div>
            </div>
        `;

        // Event listeners
        container.querySelector('[data-action="logout"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Toggle dropdown
        const toggle = container.querySelector('.dropdown-toggle');
        const dropdown = container.querySelector('.user-dropdown');
        
        toggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });

        // Cerrar al hacer click fuera
        document.addEventListener('click', () => {
            dropdown?.classList.remove('open');
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

