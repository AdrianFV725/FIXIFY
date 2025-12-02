// ========================================
// AUTH - Gestion de autenticacion con Firebase Auth
// Sistema seguro con recuperacion de contrasena
// ========================================

const Auth = {
    // Configuracion
    SESSION_KEY: 'fixify-session',
    USER_KEY: 'fixify-user',
    useFirebase: false,

    // ========================================
    // INICIALIZACION
    // ========================================

    init() {
        this.useFirebase = typeof firebase !== 'undefined' && getFirebaseAuth && getFirebaseAuth();
        
        if (this.useFirebase) {
            console.log('Auth: Usando Firebase Authentication');
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

    isAuthenticated() {
        if (this.useFirebase) {
            const auth = getFirebaseAuth();
            return !!auth?.currentUser;
        }
        return !!(localStorage.getItem(this.SESSION_KEY) || sessionStorage.getItem(this.SESSION_KEY));
    },

    getCurrentUser() {
        const userJson = localStorage.getItem(this.USER_KEY) || sessionStorage.getItem(this.USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    },

    async syncUserData(firebaseUser) {
        if (!firebaseUser) return;

        try {
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

    // ========================================
    // LOGIN CON FIREBASE AUTH
    // ========================================

    async login(email, password, remember = false) {
        if (this.useFirebase) {
            return await this.loginWithFirebase(email, password, remember);
        }
        return await this.loginWithLocalStorage(email, password, remember);
    },

    async loginWithFirebase(email, password, remember = false) {
        try {
            const auth = getFirebaseAuth();
            
            // Primero verificar si el usuario existe en Firestore y esta activo
            const userData = await FirestoreService.getUserByEmail(email);
            
            if (!userData) {
                return { success: false, message: 'Usuario no encontrado' };
            }

            if (userData.status === 'inactive') {
                return { success: false, message: 'Usuario inactivo. Contacta al administrador.' };
            }

            // Intentar login con Firebase Auth
            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const firebaseUser = userCredential.user;

                // Crear sesion
                const sessionUser = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email,
                    name: userData.name || firebaseUser.displayName || 'Usuario',
                    role: userData.role || 'user',
                    loginAt: new Date().toISOString()
                };

                const storage = remember ? localStorage : sessionStorage;
                storage.setItem(this.SESSION_KEY, 'active');
                storage.setItem(this.USER_KEY, JSON.stringify(sessionUser));

                // Actualizar ultimo login
                try {
                    await FirestoreService.updateUserLastLogin(email);
                    await FirestoreService.logActivity('user_login', { email: email });
                } catch (e) {
                    console.warn('No se pudo actualizar ultimo login');
                }

                return { success: true, message: 'Inicio de sesion exitoso', user: sessionUser };

            } catch (authError) {
                console.log('Error de Firebase Auth:', authError.code);
                
                // Si el usuario no existe en Firebase Auth, intentar crearlo
                if (authError.code === 'auth/user-not-found') {
                    // Verificar contrasena contra Firestore (migracion)
                    if (userData.password === password) {
                        // Crear usuario en Firebase Auth
                        const migrationResult = await this.migrateUserToFirebaseAuth(email, password, userData);
                        if (migrationResult.success) {
                            return migrationResult;
                        }
                    }
                    return { success: false, message: 'Credenciales incorrectas' };
                }
                
                if (authError.code === 'auth/wrong-password') {
                    return { success: false, message: 'Contrasena incorrecta' };
                }
                
                if (authError.code === 'auth/invalid-email') {
                    return { success: false, message: 'Correo electronico invalido' };
                }

                if (authError.code === 'auth/too-many-requests') {
                    return { success: false, message: 'Demasiados intentos fallidos. Intenta mas tarde.' };
                }

                return { success: false, message: 'Error al iniciar sesion' };
            }

        } catch (error) {
            console.error('Error de login:', error);
            return { success: false, message: error.message || 'Error al iniciar sesion' };
        }
    },

    /**
     * Migra un usuario existente a Firebase Auth
     */
    async migrateUserToFirebaseAuth(email, password, userData) {
        try {
            const auth = getFirebaseAuth();
            
            // Crear usuario en Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const firebaseUser = userCredential.user;

            // Actualizar displayName
            await firebaseUser.updateProfile({
                displayName: userData.name || 'Usuario'
            });

            // Actualizar documento en Firestore (remover password en texto plano)
            await FirestoreService.save(FirestoreService.COLLECTIONS.USERS, {
                firebaseUid: firebaseUser.uid,
                migratedAt: new Date().toISOString()
            }, userData.id);

            const sessionUser = {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                name: userData.name || 'Usuario',
                role: userData.role || 'user',
                loginAt: new Date().toISOString()
            };

            localStorage.setItem(this.SESSION_KEY, 'active');
            localStorage.setItem(this.USER_KEY, JSON.stringify(sessionUser));

            console.log('Usuario migrado exitosamente a Firebase Auth');
            return { success: true, message: 'Inicio de sesion exitoso', user: sessionUser };

        } catch (error) {
            console.error('Error al migrar usuario:', error);
            return { success: false, message: 'Error al migrar cuenta' };
        }
    },

    /**
     * Login con localStorage (fallback cuando no hay Firebase)
     */
    async loginWithLocalStorage(email, password, remember = false) {
        let user = null;
        
        if (window.FirestoreService) {
            try {
                user = await FirestoreService.getUserByEmail(email);
            } catch (e) {
                console.warn('No se pudo conectar a Firestore, usando localStorage');
            }
        }

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

        const sessionUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            loginAt: new Date().toISOString()
        };

        const storage = remember ? localStorage : sessionStorage;
        storage.setItem(this.SESSION_KEY, 'active');
        storage.setItem(this.USER_KEY, JSON.stringify(sessionUser));

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

    // ========================================
    // RECUPERACION DE CONTRASENA
    // ========================================

    /**
     * Envia un correo para restablecer la contrasena
     */
    async resetPassword(email) {
        try {
            if (!this.useFirebase) {
                return { 
                    success: false, 
                    message: 'La recuperacion de contrasena requiere conexion a Firebase' 
                };
            }

            const auth = getFirebaseAuth();
            
            // Verificar que el usuario exista en Firestore
            const userData = await FirestoreService.getUserByEmail(email);
            if (!userData) {
                return { success: false, message: 'No existe una cuenta con este correo' };
            }

            // Configurar idioma del email
            auth.languageCode = 'es';

            // Intentar enviar correo de recuperacion
            try {
                await auth.sendPasswordResetEmail(email);
                
                // Registrar actividad
                try {
                    await FirestoreService.logActivity('password_reset_requested', { email: email });
                } catch (e) {}

                return { 
                    success: true, 
                    message: 'Se ha enviado un correo para restablecer tu contrasena' 
                };

            } catch (authError) {
                console.log('Error de Firebase Auth:', authError.code);
                
                // Si el usuario no existe en Firebase Auth, crearlo primero
                if (authError.code === 'auth/user-not-found') {
                    // Si tiene contrasena en Firestore, crear usuario en Firebase Auth
                    if (userData.password) {
                        try {
                            console.log('Migrando usuario a Firebase Auth...');
                            await auth.createUserWithEmailAndPassword(email, userData.password);
                            
                            // Ahora enviar el correo de recuperacion
                            await auth.sendPasswordResetEmail(email);
                            
                            // Actualizar Firestore para marcar como migrado
                            await FirestoreService.save(FirestoreService.COLLECTIONS.USERS, {
                                firebaseUid: auth.currentUser?.uid,
                                migratedAt: new Date().toISOString()
                            }, userData.id);
                            
                            // Cerrar sesion del usuario recien creado
                            await auth.signOut();
                            
                            return { 
                                success: true, 
                                message: 'Se ha enviado un correo para restablecer tu contrasena' 
                            };
                        } catch (createError) {
                            console.error('Error al migrar usuario:', createError);
                            if (createError.code === 'auth/email-already-in-use') {
                                // El email ya existe, intentar enviar de nuevo
                                await auth.sendPasswordResetEmail(email);
                                return { 
                                    success: true, 
                                    message: 'Se ha enviado un correo para restablecer tu contrasena' 
                                };
                            }
                            return { 
                                success: false, 
                                message: 'Error al procesar la solicitud. Intenta de nuevo.' 
                            };
                        }
                    } else {
                        return { 
                            success: false, 
                            message: 'Tu cuenta necesita ser configurada. Contacta al administrador.' 
                        };
                    }
                }
                
                // Manejar error de dominio no autorizado
                if (authError.code === 'auth/unauthorized-continue-uri') {
                    return { 
                        success: false, 
                        message: 'Error de configuracion. El dominio no esta autorizado en Firebase.' 
                    };
                }
                
                throw authError;
            }

        } catch (error) {
            console.error('Error al enviar correo de recuperacion:', error);
            
            let message = 'Error al enviar el correo';
            
            if (error.code === 'auth/invalid-email') {
                message = 'Correo electronico invalido';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Demasiados intentos. Intenta mas tarde.';
            }
            
            return { success: false, message };
        }
    },

    // ========================================
    // CREAR USUARIO CON FIREBASE AUTH
    // ========================================

    /**
     * Crea un nuevo usuario con Firebase Auth
     */
    async createUser(userData) {
        try {
            if (!this.useFirebase) {
                // Fallback: crear solo en Firestore
                return await FirestoreService.saveUser(userData);
            }

            const auth = getFirebaseAuth();
            
            // Crear usuario en Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(
                userData.email, 
                userData.password
            );
            const firebaseUser = userCredential.user;

            // Actualizar displayName
            await firebaseUser.updateProfile({
                displayName: userData.name || 'Usuario'
            });

            // Guardar datos adicionales en Firestore (sin password)
            const firestoreData = {
                email: userData.email.toLowerCase(),
                name: userData.name || 'Usuario',
                role: userData.role || 'user',
                status: userData.status || 'active',
                firebaseUid: firebaseUser.uid,
                createdAt: new Date().toISOString()
            };

            const savedUser = await FirestoreService.save(
                FirestoreService.COLLECTIONS.USERS, 
                firestoreData
            );

            // Cerrar sesion del nuevo usuario (el admin esta creando cuentas)
            // No queremos que el admin pierda su sesion
            // await auth.signOut(); // Comentado para evitar cerrar sesion del admin

            return { success: true, user: savedUser };

        } catch (error) {
            console.error('Error al crear usuario:', error);
            
            let message = 'Error al crear usuario';
            
            if (error.code === 'auth/email-already-in-use') {
                message = 'Ya existe una cuenta con este correo';
            } else if (error.code === 'auth/weak-password') {
                message = 'La contrasena debe tener al menos 6 caracteres';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Correo electronico invalido';
            }
            
            throw new Error(message);
        }
    },

    // ========================================
    // CERRAR SESION
    // ========================================

    async logout() {
        const user = this.getCurrentUser();

        if (window.FirestoreService && user) {
            try {
                await FirestoreService.logActivity('user_logout', { email: user.email });
            } catch (e) {}
        }

        if (this.useFirebase) {
            try {
                await getFirebaseAuth().signOut();
            } catch (e) {
                console.error('Error al cerrar sesion en Firebase:', e);
            }
        }

        localStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem(this.USER_KEY);
        sessionStorage.removeItem(this.SESSION_KEY);
        sessionStorage.removeItem(this.USER_KEY);

        window.location.href = '../index.html';
    },

    // ========================================
    // PERMISOS Y PROTECCION
    // ========================================

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

    requireAuth() {
        if (!this.isAuthenticated()) {
            sessionStorage.setItem('fixify-redirect', window.location.href);
            window.location.href = '../index.html';
            return false;
        }
        return true;
    },

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

        container.querySelector('[data-action="profile"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = 'profile.html';
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
