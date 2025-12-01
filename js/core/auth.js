// ========================================
// AUTH - Gestion de autenticacion y sesion
// Soporta Firebase Auth y fallback a localStorage
// ========================================

const Auth = {
    // Configuracion
    SESSION_KEY: 'fixify-session',
    USER_KEY: 'fixify-user',
    useFirebase: false, // Se activa cuando Firebase esta disponible

    // ========================================
    // INICIALIZACION
    // ========================================

    init() {
        // Verificar si Firebase esta disponible
        this.useFirebase = typeof firebase !== 'undefined' && getFirebaseAuth && getFirebaseAuth();
        
        if (this.useFirebase) {
            console.log('Auth: Usando Firebase Authentication');
            // Escuchar cambios de autenticacion
            getFirebaseAuth().onAuthStateChanged((user) => {
                if (user) {
                    this.syncUserData(user);
                }
            });
        } else {
            console.log('Auth: Usando localStorage (modo offline)');
        }
    },

    // ========================================
    // METODOS DE SESION
    // ========================================

    /**
     * Verifica si hay una sesion activa
     */
    isAuthenticated() {
        if (this.useFirebase) {
            const auth = getFirebaseAuth();
            return !!auth?.currentUser;
        }
        return !!(localStorage.getItem(this.SESSION_KEY) || sessionStorage.getItem(this.SESSION_KEY));
    },

    /**
     * Obtiene el usuario actual
     */
    getCurrentUser() {
        // Primero intentar desde el storage local (mas rapido)
        const userJson = localStorage.getItem(this.USER_KEY) || sessionStorage.getItem(this.USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    },

    /**
     * Sincroniza datos del usuario de Firebase con localStorage
     */
    async syncUserData(firebaseUser) {
        if (!firebaseUser) return;

        try {
            // Buscar datos adicionales en Firestore
            const userData = await FirestoreService.getUserByEmail(firebaseUser.email);
            
            const sessionUser = {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                name: userData?.name || firebaseUser.displayName || 'Usuario',
                role: userData?.role || 'user',
                loginAt: new Date().toISOString()
            };

            localStorage.setItem(this.USER_KEY, JSON.stringify(sessionUser));
            localStorage.setItem(this.SESSION_KEY, 'active');
        } catch (error) {
            console.error('Error al sincronizar usuario:', error);
        }
    },

    /**
     * Inicia sesion
     */
    async login(email, password, remember = false) {
        // Si Firebase esta disponible, usar Firebase Auth
        if (this.useFirebase) {
            return await this.loginWithFirebase(email, password, remember);
        }
        
        // Fallback a localStorage
        return await this.loginWithLocalStorage(email, password, remember);
    },

    /**
     * Login con Firebase Authentication
     */
    async loginWithFirebase(email, password, remember = false) {
        try {
            // Buscar usuario en Store (Firestore o localStorage)
            const userData = await Store.getUserByEmail(email);
            
            console.log('Usuario encontrado:', userData ? 'Si' : 'No');
            
            if (!userData) {
                return { success: false, message: 'Usuario no encontrado' };
            }

            if (userData.status === 'inactive') {
                return { success: false, message: 'Usuario inactivo. Contacta al administrador.' };
            }

            // Verificar contrasena directamente contra los datos del usuario
            console.log('Verificando contrasena...');
            if (userData.password !== password) {
                console.log('Contrasena no coincide');
                return { success: false, message: 'Contrasena incorrecta' };
            }

            console.log('Contrasena correcta, creando sesion...');

            // Crear sesion
            const sessionUser = {
                id: userData.id,
                email: userData.email,
                name: userData.name || 'Usuario',
                role: userData.role || 'user',
                loginAt: new Date().toISOString()
            };

            const storage = remember ? localStorage : sessionStorage;
            storage.setItem(this.SESSION_KEY, 'active');
            storage.setItem(this.USER_KEY, JSON.stringify(sessionUser));

            // Intentar actualizar ultimo login (no bloquea si falla)
            try {
                await Store.updateUserLastLogin(email);
            } catch (e) {
                console.warn('No se pudo actualizar ultimo login');
            }

            return { success: true, message: 'Inicio de sesion exitoso', user: sessionUser };
        } catch (error) {
            console.error('Error de login:', error);
            return { success: false, message: error.message || 'Error al iniciar sesion' };
        }
    },

    /**
     * Login con localStorage (fallback)
     */
    async loginWithLocalStorage(email, password, remember = false) {
        // Intentar buscar en Firestore primero
        let user = null;
        
        if (window.FirestoreService) {
            try {
                user = await FirestoreService.getUserByEmail(email);
            } catch (e) {
                console.warn('No se pudo conectar a Firestore, usando localStorage');
            }
        }

        // Fallback a Store local
        if (!user && window.Store) {
            user = Store.getUserByEmail(email);
        }

        if (!user) {
            return { success: false, message: 'Usuario no encontrado' };
        }

        if (user.password !== password) {
            return { success: false, message: 'Contrasena incorrecta' };
        }

        if (user.status === 'inactive') {
            return { success: false, message: 'Usuario inactivo. Contacta al administrador.' };
        }

        // Crear datos de sesion
        const sessionUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            loginAt: new Date().toISOString()
        };

        // Guardar sesion
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem(this.SESSION_KEY, 'active');
        storage.setItem(this.USER_KEY, JSON.stringify(sessionUser));

        // Actualizar ultimo login
        if (window.FirestoreService) {
            try {
                await FirestoreService.updateUserLastLogin(user.email);
                await FirestoreService.logActivity('user_login', { email: user.email });
            } catch (e) {}
        } else if (window.Store) {
            Store.updateUserLastLogin(user.email);
            Store.logActivity('user_login', { email: user.email });
        }

        return { success: true, message: 'Inicio de sesion exitoso', user: sessionUser };
    },

    /**
     * Cierra sesion
     */
    async logout() {
        const user = this.getCurrentUser();

        // Log de actividad
        if (window.FirestoreService && user) {
            try {
                await FirestoreService.logActivity('user_logout', { email: user.email });
            } catch (e) {}
        }

        // Cerrar sesion en Firebase
        if (this.useFirebase) {
            try {
                await getFirebaseAuth().signOut();
            } catch (e) {
                console.error('Error al cerrar sesion en Firebase:', e);
            }
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
     */
    hasPermission(permission) {
        const user = this.getCurrentUser();
        if (!user) return false;

        if (user.role === 'admin') return true;

        const rolePermissions = {
            admin: ['*'],
            manager: ['view', 'create', 'edit'],
            user: ['view']
        };

        const permissions = rolePermissions[user.role] || [];
        return permissions.includes('*') || permissions.includes(permission);
    },

    /**
     * Protege una pagina
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            sessionStorage.setItem('fixify-redirect', window.location.href);
            window.location.href = '../index.html';
            return false;
        }
        return true;
    },

    /**
     * Redirige si ya esta autenticado
     */
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            const redirect = sessionStorage.getItem('fixify-redirect') || './pages/dashboard.html';
            sessionStorage.removeItem('fixify-redirect');
            window.location.href = redirect;
            return true;
        }
        return false;
    },

    // ========================================
    // HELPERS PARA UI
    // ========================================

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

    renderUserMenu(container) {
        const user = this.getCurrentUser();
        if (!container) return;
        
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

        const trigger = container.querySelector('#userMenuTrigger');
        trigger?.addEventListener('click', (e) => {
            e.stopPropagation();
            container.classList.toggle('open');
        });

        container.querySelector('[data-action="logout"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.logout();
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                container.classList.remove('open');
            }
        });
    },

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
