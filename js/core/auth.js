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
            
            // Mostrar informacion de configuracion para el administrador
            const currentDomain = window.location.hostname;
            console.log('%c[Firebase Auth Config]', 'color: #3b82f6; font-weight: bold');
            console.log('Dominio actual:', currentDomain);
            console.log('Para que el restablecimiento de contrasena funcione, asegurate de:');
            console.log('1. Ir a Firebase Console > Authentication > Settings > Authorized domains');
            console.log('2. Agregar este dominio:', currentDomain);
            console.log('3. Si usas localhost, agregar: localhost');
            console.log('Action URL para reset:', this.getActionCodeUrl());
            
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

            // Verificar si el usuario ya esta migrado a Firebase Auth
            const isUserMigrated = !!userData.firebaseUid || !!userData.migratedAt;

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

                // Si no tenia firebaseUid, actualizarlo ahora
                if (!userData.firebaseUid) {
                    try {
                        await FirestoreService.save(FirestoreService.COLLECTIONS.USERS, {
                            firebaseUid: firebaseUser.uid
                        }, userData.id);
                    } catch (e) {
                        console.warn('No se pudo actualizar firebaseUid');
                    }
                }

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
                
                // Si el usuario no existe en Firebase Auth
                if (authError.code === 'auth/user-not-found') {
                    // Solo intentar migrar si el usuario NO esta marcado como migrado
                    // y tiene una contrasena legacy en Firestore
                    if (!isUserMigrated && userData.password) {
                        // Verificar contrasena contra Firestore (migracion)
                        if (userData.password === password) {
                            console.log('Usuario no migrado encontrado, migrando a Firebase Auth...');
                            // Crear usuario en Firebase Auth
                            const migrationResult = await this.migrateUserToFirebaseAuth(email, password, userData);
                            if (migrationResult.success) {
                                return migrationResult;
                            } else {
                                // Si la migración falla, permitir login con contraseña de Firestore
                                console.log('Migración falló, usando login con contraseña de Firestore');
                                return await this.loginWithLocalStorage(email, password, remember);
                            }
                        } else {
                            return { success: false, message: 'Contrasena incorrecta' };
                        }
                    } else if (!isUserMigrated && userData.password) {
                        // Usuario tiene contraseña en Firestore pero no coincide
                        return { success: false, message: 'Contrasena incorrecta' };
                    } else {
                        // Usuario no existe en Firebase Auth y no tiene contraseña en Firestore
                        return { success: false, message: 'Credenciales incorrectas' };
                    }
                }
                
                // Contraseña incorrecta - NO intentar con contraseña de Firestore
                // porque el usuario podria haber reseteado su contraseña
                if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
                    // Si el usuario restableció su contraseña, la contraseña de Firestore es obsoleta
                    if (isUserMigrated || userData.passwordResetAt) {
                        return { success: false, message: 'Contrasena incorrecta. Si olvidaste tu contrasena, usa "Olvide mi contrasena".' };
                    }
                    return { success: false, message: 'Contrasena incorrecta' };
                }
                
                if (authError.code === 'auth/invalid-email') {
                    return { success: false, message: 'Correo electronico invalido' };
                }

                if (authError.code === 'auth/too-many-requests') {
                    return { success: false, message: 'Demasiados intentos fallidos. Intenta mas tarde.' };
                }

                if (authError.code === 'auth/user-disabled') {
                    return { success: false, message: 'Esta cuenta ha sido deshabilitada. Contacta al administrador.' };
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

            // Actualizar documento en Firestore y remover password en texto plano
            try {
                const db = getFirebaseDb();
                await db.collection(FirestoreService.COLLECTIONS.USERS).doc(userData.id).update({
                    firebaseUid: firebaseUser.uid,
                    migratedAt: new Date().toISOString(),
                    // Eliminar el campo password usando FieldValue.delete()
                    password: firebase.firestore.FieldValue.delete()
                });
                console.log('Contrasena legacy eliminada de Firestore tras migracion');
            } catch (updateError) {
                // Si falla el delete, al menos guardar el firebaseUid
                console.warn('No se pudo eliminar password legacy, guardando firebaseUid:', updateError);
                await FirestoreService.save(FirestoreService.COLLECTIONS.USERS, {
                    firebaseUid: firebaseUser.uid,
                    migratedAt: new Date().toISOString()
                }, userData.id);
            }

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
            
            // Registrar actividad
            try {
                await FirestoreService.logActivity('user_migrated_to_firebase_auth', { email: email });
            } catch (e) {}

            return { success: true, message: 'Inicio de sesion exitoso', user: sessionUser };

        } catch (error) {
            console.error('Error al migrar usuario:', error);
            
            if (error.code === 'auth/email-already-in-use') {
                return { success: false, message: 'Esta cuenta ya existe. Intenta recuperar tu contrasena.' };
            }
            
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
    // LOGIN CON GOOGLE
    // ========================================

    async loginWithGoogle() {
        try {
            if (!this.useFirebase) {
                return { success: false, message: 'Google Sign-In requiere Firebase' };
            }

            const auth = getFirebaseAuth();
            const provider = new firebase.auth.GoogleAuthProvider();
            
            // Forzar seleccion de cuenta
            provider.setCustomParameters({ prompt: 'select_account' });
            
            const result = await auth.signInWithPopup(provider);
            const firebaseUser = result.user;
            
            // Verificar si el usuario ya existe en Firestore
            let userData = await FirestoreService.getUserByEmail(firebaseUser.email);
            
            // Si no existe usuario, verificar si existe un empleado con el mismo email
            if (!userData) {
                try {
                    const employees = await Store.getEmployees();
                    const matchingEmployee = employees.find(e => 
                        e.email && e.email.toLowerCase() === firebaseUser.email.toLowerCase()
                    );
                    
                    if (matchingEmployee) {
                        // Crear usuario automáticamente con rol employee
                        const newUserData = {
                            email: firebaseUser.email.toLowerCase(),
                            name: `${matchingEmployee.name || ''} ${matchingEmployee.lastName || ''}`.trim() || firebaseUser.displayName || 'Empleado',
                            role: 'employee',
                            status: 'active',
                            firebaseUid: firebaseUser.uid,
                            provider: 'google',
                            createdAt: new Date().toISOString(),
                            lastLogin: new Date().toISOString()
                        };
                        
                        const savedUser = await FirestoreService.save(
                            FirestoreService.COLLECTIONS.USERS,
                            newUserData
                        );
                        
                        userData = savedUser;
                        console.log('Usuario empleado creado automáticamente:', firebaseUser.email);
                    } else {
                        // No existe ni usuario ni empleado
                await auth.signOut();
                return { 
                    success: false, 
                    message: 'Tu cuenta no esta registrada en el sistema. Contacta al administrador.' 
                };
                    }
                } catch (e) {
                    console.error('Error al verificar empleado:', e);
                    await auth.signOut();
                    return { 
                        success: false, 
                        message: 'Error al verificar tu cuenta. Contacta al administrador.' 
                    };
                }
            }
            
            if (userData.status === 'inactive') {
                await auth.signOut();
                return { success: false, message: 'Usuario inactivo. Contacta al administrador.' };
            }
            
            // Actualizar el firebaseUid si no lo tiene (primera vez con Google)
            if (!userData.firebaseUid) {
                try {
                    await FirestoreService.save(FirestoreService.COLLECTIONS.USERS, {
                        firebaseUid: firebaseUser.uid,
                        provider: 'google',
                        lastLogin: new Date().toISOString()
                    }, userData.id);
                } catch (e) {
                    console.warn('No se pudo actualizar firebaseUid');
                }
            }
            
            const sessionUser = {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                name: userData.name || firebaseUser.displayName || 'Usuario',
                role: userData.role || 'user',
                loginAt: new Date().toISOString()
            };
            
            localStorage.setItem(this.SESSION_KEY, 'active');
            localStorage.setItem(this.USER_KEY, JSON.stringify(sessionUser));
            
            // Registrar actividad
            try {
                await FirestoreService.updateUserLastLogin(firebaseUser.email);
                await FirestoreService.logActivity('user_login_google', { email: firebaseUser.email });
            } catch (e) {
                console.warn('No se pudo registrar actividad');
            }
            
            return { success: true, message: 'Inicio de sesion exitoso', user: sessionUser };
            
        } catch (error) {
            console.error('Error en Google Sign-In:', error);
            
            if (error.code === 'auth/popup-closed-by-user') {
                return { success: false, message: 'Inicio de sesion cancelado' };
            }
            
            if (error.code === 'auth/popup-blocked') {
                return { success: false, message: 'El navegador bloqueo la ventana emergente. Permite las ventanas emergentes e intenta de nuevo.' };
            }
            
            return { success: false, message: 'Error al iniciar sesion con Google' };
        }
    },

    // ========================================
    // RECUPERACION DE CONTRASENA
    // ========================================

    /**
     * Obtiene la URL base para los action codes de Firebase
     */
    getActionCodeUrl() {
        // Detectar la URL base del sitio
        const currentUrl = window.location.href;
        const urlParts = currentUrl.split('/');
        const protocol = urlParts[0];
        const host = urlParts[2];
        
        // Si estamos en localhost o desarrollo
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
            // Usar la URL base actual
            const baseUrl = urlParts.slice(0, 3).join('/');
            const pathParts = window.location.pathname.split('/').filter(p => p);
            
            // Determinar si estamos en la raiz o en pages/
            if (pathParts.includes('pages')) {
                const pagesIndex = pathParts.indexOf('pages');
                const pathBeforePages = pathParts.slice(0, pagesIndex).join('/');
                return `${baseUrl}/${pathBeforePages ? pathBeforePages + '/' : ''}pages/reset-password.html`;
            } else {
                // Encontrar el path del proyecto
                const projectPath = pathParts.slice(0, -1).join('/');
                return `${baseUrl}/${projectPath ? projectPath + '/' : ''}pages/reset-password.html`;
            }
        }
        
        // Para produccion, usar el dominio actual
        // Esto debe coincidir con los dominios autorizados en Firebase Console
        const baseUrl = `${protocol}//${host}`;
        const pathParts = window.location.pathname.split('/').filter(p => p);
        
        // Si estamos en pages/, usar la ruta relativa
        if (pathParts.includes('pages')) {
            const pagesIndex = pathParts.indexOf('pages');
            const pathBeforePages = pathParts.slice(0, pagesIndex).join('/');
            return `${baseUrl}/${pathBeforePages ? pathBeforePages + '/' : ''}pages/reset-password.html`;
        }
        
        // Si estamos en la raiz o en otra ruta, construir la ruta completa
        const projectPath = pathParts.slice(0, -1).join('/');
        return `${baseUrl}/${projectPath ? projectPath + '/' : ''}pages/reset-password.html`;
    },

    /**
     * Envia un correo para restablecer la contrasena
     * Mejorado para asegurar que siempre funcione
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

            // Configurar action code settings para el enlace de reset
            const actionCodeSettings = {
                url: this.getActionCodeUrl(),
                handleCodeInApp: true
            };

            console.log('Reset password - Action URL:', actionCodeSettings.url);

            // Función auxiliar para enviar el correo con reintentos
            const sendEmailWithRetry = async (maxRetries = 3) => {
                let lastError = null;
                
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        // Intentar con actionCodeSettings primero
                        try {
                            await auth.sendPasswordResetEmail(email, actionCodeSettings);
                            console.log(`Correo enviado exitosamente (intento ${attempt})`);
                            return true;
                        } catch (settingsError) {
                            // Si falla por dominio no autorizado, mostrar error más claro
                            if (settingsError.code === 'auth/unauthorized-continue-uri') {
                                console.error('ERROR: Dominio no autorizado en Firebase Console');
                                console.error('URL intentada:', actionCodeSettings.url);
                                console.error('Para solucionar:');
                                console.error('1. Ve a Firebase Console > Authentication > Settings > Authorized domains');
                                console.error('2. Agrega el dominio:', window.location.hostname);
                                console.error('3. Si usas un dominio personalizado, agrégalo también');
                                // Lanzar error en lugar de enviar sin settings para que el usuario sepa
                                throw {
                                    code: 'auth/unauthorized-continue-uri',
                                    message: `El dominio ${window.location.hostname} no está autorizado en Firebase Console. Por favor, autoriza este dominio en Firebase Console > Authentication > Settings > Authorized domains para usar la página personalizada de restablecimiento de contraseña.`
                                };
                            }
                            throw settingsError;
                        }
                    } catch (error) {
                        lastError = error;
                        console.warn(`Intento ${attempt} falló:`, error.code, error.message);
                        
                        // Si es un error que no se puede resolver con reintentos, lanzar inmediatamente
                        if (error.code === 'auth/user-not-found' || 
                            error.code === 'auth/invalid-email' ||
                            error.code === 'auth/too-many-requests') {
                            throw error;
                        }
                        
                        // Esperar antes del siguiente intento (exponencial backoff)
                        if (attempt < maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                        }
                    }
                }
                
                throw lastError;
            };

            // Verificar si el usuario está en Firebase Auth
            let userExistsInAuth = false;
            if (userData.firebaseUid) {
                userExistsInAuth = true;
            } else {
                // Intentar verificar si existe en Firebase Auth
                try {
                    // Intentar enviar correo directamente - si falla con user-not-found, sabremos que no existe
                    await auth.sendPasswordResetEmail(email, actionCodeSettings);
                    userExistsInAuth = true;
                } catch (checkError) {
                    if (checkError.code === 'auth/user-not-found') {
                        userExistsInAuth = false;
                    } else if (checkError.code === 'auth/unauthorized-continue-uri') {
                        // Dominio no autorizado - no intentar sin settings
                        console.error('ERROR: Dominio no autorizado en Firebase Console');
                        console.error('URL intentada:', actionCodeSettings.url);
                        console.error('Para solucionar, agrega el dominio en Firebase Console > Authentication > Settings > Authorized domains');
                        // Continuar con la migración, pero el correo se enviará con la URL personalizada si el dominio está autorizado
                        userExistsInAuth = false;
                    } else {
                        // Otro error, asumir que no existe y migrar
                        userExistsInAuth = false;
                    }
                }
            }

            // Si el usuario no existe en Firebase Auth, migrarlo primero
            if (!userExistsInAuth && userData.password) {
                try {
                    console.log('Usuario no existe en Firebase Auth, migrando...');
                    
                    // Crear usuario en Firebase Auth
                    const userCredential = await auth.createUserWithEmailAndPassword(email, userData.password);
                    const firebaseUser = userCredential.user;
                    
                    // Actualizar displayName
                    if (userData.name) {
                        await firebaseUser.updateProfile({
                            displayName: userData.name
                        });
                    }
                    
                    // Actualizar Firestore para marcar como migrado
                    await FirestoreService.save(FirestoreService.COLLECTIONS.USERS, {
                        firebaseUid: firebaseUser.uid,
                        migratedAt: new Date().toISOString()
                    }, userData.id);
                    
                    console.log('Usuario migrado con UID:', firebaseUser.uid);
                    
                    // Cerrar sesion del usuario recien creado
                    await auth.signOut();
                    
                    // Pequeña pausa para asegurar que Firebase procese la creación
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                } catch (createError) {
                    console.error('Error al migrar usuario:', createError);
                    
                    if (createError.code === 'auth/email-already-in-use') {
                        // El email ya existe en Firebase Auth, continuar con el envío
                        console.log('Usuario ya existe en Firebase Auth, continuando...');
                    } else if (createError.code === 'auth/weak-password') {
                        return { 
                            success: false, 
                            message: 'Tu cuenta tiene una contrasena muy corta. Contacta al administrador.' 
                        };
                    } else {
                        // Si no se puede migrar, intentar enviar de todas formas
                        console.warn('No se pudo migrar usuario, intentando enviar correo de todas formas...');
                    }
                }
            } else if (!userExistsInAuth && !userData.password) {
                return { 
                    success: false, 
                    message: 'Tu cuenta necesita ser configurada. Contacta al administrador.' 
                };
            }

            // Enviar el correo con reintentos
            try {
                await sendEmailWithRetry();
                
                // Registrar actividad
                try {
                    await FirestoreService.logActivity('password_reset_requested', { 
                        email: email,
                        migrated: !userExistsInAuth
                    });
                } catch (e) {
                    console.warn('No se pudo registrar actividad:', e);
                }
                
                return { 
                    success: true, 
                    message: 'Se ha enviado un correo para restablecer tu contrasena. Revisa tu bandeja de entrada y spam. El correo puede tardar unos minutos en llegar.' 
                };

            } catch (sendError) {
                console.error('Error final al enviar correo:', sendError);
                
                let message = 'Error al enviar el correo';
                
                if (sendError.code === 'auth/invalid-email') {
                    message = 'Correo electronico invalido';
                } else if (sendError.code === 'auth/too-many-requests') {
                    message = 'Demasiados intentos. Intenta mas tarde.';
                } else if (sendError.code === 'auth/network-request-failed') {
                    message = 'Error de conexion. Verifica tu internet e intenta de nuevo.';
                } else if (sendError.code === 'auth/user-not-found') {
                    message = 'Usuario no encontrado en Firebase Auth. Contacta al administrador.';
                } else {
                    message = `Error al enviar el correo: ${sendError.message || 'Error desconocido'}`;
                }
                
                return { success: false, message };
            }

        } catch (error) {
            console.error('Error general al enviar correo de recuperacion:', error);
            
            let message = 'Error al enviar el correo';
            
            if (error.code === 'auth/invalid-email') {
                message = 'Correo electronico invalido';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Demasiados intentos. Intenta mas tarde.';
            } else if (error.code === 'auth/network-request-failed') {
                message = 'Error de conexion. Verifica tu internet.';
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
    // CAMBIO DE CONTRASENA
    // ========================================

    /**
     * Cambia la contrasena del usuario actual (cuando el usuario cambia su propia contrasena)
     */
    async changeOwnPassword(currentPassword, newPassword) {
        try {
            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                return { success: false, message: 'No hay sesion activa' };
            }

            if (this.useFirebase) {
                const auth = getFirebaseAuth();
                const firebaseUser = auth.currentUser;

                if (firebaseUser) {
                    // Re-autenticar al usuario antes de cambiar la contrasena
                    const credential = firebase.auth.EmailAuthProvider.credential(
                        firebaseUser.email,
                        currentPassword
                    );

                    try {
                        await firebaseUser.reauthenticateWithCredential(credential);
                    } catch (reAuthError) {
                        console.error('Error de re-autenticacion:', reAuthError);
                        if (reAuthError.code === 'auth/wrong-password') {
                            return { success: false, message: 'La contrasena actual es incorrecta' };
                        }
                        return { success: false, message: 'Error de autenticacion. Intenta cerrar sesion y volver a entrar.' };
                    }

                    // Cambiar la contrasena en Firebase Auth
                    try {
                        await firebaseUser.updatePassword(newPassword);
                        
                        // Registrar la actividad
                        try {
                            await FirestoreService.logActivity('password_changed', { email: currentUser.email });
                        } catch (e) {}

                        return { success: true, message: 'Contrasena actualizada correctamente' };
                    } catch (updateError) {
                        console.error('Error al actualizar contrasena:', updateError);
                        if (updateError.code === 'auth/weak-password') {
                            return { success: false, message: 'La contrasena debe tener al menos 6 caracteres' };
                        }
                        return { success: false, message: 'Error al actualizar la contrasena' };
                    }
                }
            }

            // Fallback: actualizar solo en Firestore/localStorage
            const users = await Store.getUsers() || [];
            const userToUpdate = users.find(u => u.email?.toLowerCase() === currentUser.email?.toLowerCase());
            
            if (!userToUpdate) {
                return { success: false, message: 'Usuario no encontrado' };
            }

            if (userToUpdate.password !== currentPassword) {
                return { success: false, message: 'La contrasena actual es incorrecta' };
            }

            userToUpdate.password = newPassword;
            await Store.saveUser(userToUpdate);

            return { success: true, message: 'Contrasena actualizada correctamente' };

        } catch (error) {
            console.error('Error al cambiar contrasena:', error);
            return { success: false, message: error.message || 'Error al cambiar la contrasena' };
        }
    },

    /**
     * Envia un correo de restablecimiento de contrasena (para admin cambiando contrasena de otro usuario)
     * Mejorado para asegurar que siempre funcione
     */
    async sendPasswordResetToUser(userEmail) {
        try {
            if (!this.useFirebase) {
                return { 
                    success: false, 
                    message: 'El restablecimiento de contrasena requiere Firebase' 
                };
            }

            const auth = getFirebaseAuth();
            auth.languageCode = 'es';

            // Verificar que el usuario existe
            const userData = await FirestoreService.getUserByEmail(userEmail);
            if (!userData) {
                return { success: false, message: 'Usuario no encontrado' };
            }

            // Configurar action code settings
            const actionCodeSettings = {
                url: this.getActionCodeUrl(),
                handleCodeInApp: true
            };

            // Función auxiliar para enviar el correo con reintentos
            const sendEmailWithRetry = async (maxRetries = 3) => {
                let lastError = null;
                
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        // Intentar con actionCodeSettings primero
                        try {
                            await auth.sendPasswordResetEmail(userEmail, actionCodeSettings);
                            console.log(`Correo enviado exitosamente a ${userEmail} (intento ${attempt})`);
                            return true;
                        } catch (settingsError) {
                            // Si falla por dominio no autorizado, mostrar error más claro
                            if (settingsError.code === 'auth/unauthorized-continue-uri') {
                                console.error('ERROR: Dominio no autorizado en Firebase Console');
                                console.error('URL intentada:', actionCodeSettings.url);
                                console.error('Para solucionar:');
                                console.error('1. Ve a Firebase Console > Authentication > Settings > Authorized domains');
                                console.error('2. Agrega el dominio:', window.location.hostname);
                                // Lanzar error en lugar de enviar sin settings
                                throw {
                                    code: 'auth/unauthorized-continue-uri',
                                    message: `El dominio ${window.location.hostname} no está autorizado en Firebase Console. Por favor, autoriza este dominio en Firebase Console > Authentication > Settings > Authorized domains para usar la página personalizada de restablecimiento de contraseña.`
                                };
                            }
                            throw settingsError;
                        }
                    } catch (error) {
                        lastError = error;
                        console.warn(`Intento ${attempt} falló para ${userEmail}:`, error.code, error.message);
                        
                        // Si es un error que no se puede resolver con reintentos, lanzar inmediatamente
                        if (error.code === 'auth/user-not-found' || 
                            error.code === 'auth/invalid-email' ||
                            error.code === 'auth/too-many-requests') {
                            throw error;
                        }
                        
                        // Esperar antes del siguiente intento (exponencial backoff)
                        if (attempt < maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                        }
                    }
                }
                
                throw lastError;
            };

            // Si el usuario tiene firebaseUid, está migrado
            if (userData.firebaseUid) {
                try {
                    await sendEmailWithRetry();
                    
                    try {
                        await FirestoreService.logActivity('password_reset_sent_by_admin', { 
                            targetEmail: userEmail,
                            adminEmail: this.getCurrentUser()?.email 
                        });
                    } catch (e) {
                        console.warn('No se pudo registrar actividad:', e);
                    }
                    
                    return { 
                        success: true, 
                        message: `Se ha enviado un correo a ${userEmail} para restablecer la contrasena. El correo puede tardar unos minutos en llegar.`,
                        method: 'email'
                    };
                } catch (sendError) {
                    console.error('Error al enviar correo a usuario migrado:', sendError);
                    return { 
                        success: false, 
                        message: `Error al enviar el correo: ${sendError.message || 'Error desconocido'}` 
                    };
                }
            } else {
                // Usuario no migrado a Firebase Auth
                // Intentar migrarlo primero si tiene password
                if (userData.password) {
                    try {
                        console.log(`Migrando usuario ${userEmail} a Firebase Auth...`);
                        
                        // Crear en Firebase Auth
                        const userCredential = await auth.createUserWithEmailAndPassword(userEmail, userData.password);
                        
                        // Actualizar Firestore
                        await FirestoreService.save(FirestoreService.COLLECTIONS.USERS, {
                            firebaseUid: userCredential.user.uid,
                            migratedAt: new Date().toISOString()
                        }, userData.id);
                        
                        // Cerrar sesion
                        await auth.signOut();
                        
                        // Pequeña pausa para asegurar que Firebase procese la creación
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // Ahora enviar email de reset con reintentos
                        await sendEmailWithRetry();
                        
                        try {
                            await FirestoreService.logActivity('password_reset_sent_by_admin', { 
                                targetEmail: userEmail,
                                adminEmail: this.getCurrentUser()?.email,
                                migrated: true
                            });
                        } catch (e) {
                            console.warn('No se pudo registrar actividad:', e);
                        }
                        
                        return { 
                            success: true, 
                            message: `Se ha enviado un correo a ${userEmail} para restablecer la contrasena. El correo puede tardar unos minutos en llegar.`,
                            method: 'email'
                        };
                    } catch (migrateError) {
                        console.error('Error al migrar usuario para reset:', migrateError);
                        
                        if (migrateError.code === 'auth/email-already-in-use') {
                            // El usuario ya existe en Firebase Auth, intentar enviar email
                            try {
                                await sendEmailWithRetry();
                                
                                try {
                                    await FirestoreService.logActivity('password_reset_sent_by_admin', { 
                                        targetEmail: userEmail,
                                        adminEmail: this.getCurrentUser()?.email
                                    });
                                } catch (e) {
                                    console.warn('No se pudo registrar actividad:', e);
                                }
                                
                                return { 
                                    success: true, 
                                    message: `Se ha enviado un correo a ${userEmail} para restablecer la contrasena. El correo puede tardar unos minutos en llegar.`,
                                    method: 'email'
                                };
                            } catch (sendError) {
                                console.error('Error al enviar correo después de detectar usuario existente:', sendError);
                                return { 
                                    success: false, 
                                    message: `Error al enviar el correo: ${sendError.message || 'Error desconocido'}` 
                                };
                            }
                        }
                        
                        // Si no se puede migrar, permitir actualizacion directa
                        return { 
                            success: true, 
                            message: 'Usuario en modo legacy - puede actualizar la contrasena directamente',
                            method: 'direct',
                            userId: userData.id
                        };
                    }
                } else {
                    return { 
                        success: false, 
                        message: 'El usuario no tiene contrasena configurada. Debe establecer una nueva.' 
                    };
                }
            }

        } catch (error) {
            console.error('Error al enviar correo de reset:', error);
            
            let message = 'Error al enviar el correo';
            if (error.code === 'auth/user-not-found') {
                message = 'Usuario no encontrado en Firebase Auth';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Demasiados intentos. Intenta mas tarde.';
            } else if (error.code === 'auth/network-request-failed') {
                message = 'Error de conexion. Verifica tu internet e intenta de nuevo.';
            } else {
                message = `Error al enviar el correo: ${error.message || 'Error desconocido'}`;
            }
            
            return { success: false, message };
        }
    },

    /**
     * Actualiza la contrasena directamente
     * Si el usuario está migrado a Firebase Auth, también actualiza allí
     * Si no está migrado, actualiza en Firestore y migra a Firebase Auth
     */
    async updatePasswordDirect(userId, newPassword) {
        try {
            const user = await Store.getUserById(userId);
            if (!user) {
                return { success: false, message: 'Usuario no encontrado' };
            }

            // Validar longitud de contraseña
            if (newPassword.length < 6) {
                return { success: false, message: 'La contrasena debe tener al menos 6 caracteres' };
            }

            const auth = getFirebaseAuth();
            const useFirebase = this.useFirebase && auth;

            // Si el usuario ya está migrado a Firebase Auth
            if (user.firebaseUid && useFirebase) {
                try {
                    // Intentar actualizar la contraseña en Firebase Auth
                    // Como no podemos actualizar la contraseña de otro usuario desde el cliente,
                    // necesitamos usar un enfoque diferente: eliminar y recrear el usuario
                    // O mejor: usar una Cloud Function
                    
                    // Por ahora, actualizamos en Firestore y el usuario deberá usar reset de contraseña
                    // O intentamos crear el usuario de nuevo (fallará si ya existe, pero podemos manejarlo)
                    
                    // Intentar crear el usuario con la nueva contraseña
                    // Si ya existe, eso significa que el usuario está en Firebase Auth
                    // En ese caso, solo actualizamos en Firestore y el usuario usará reset de contraseña
                    try {
                        // Intentar crear usuario (fallará si ya existe, que es lo esperado)
                        await auth.createUserWithEmailAndPassword(user.email, newPassword);
                        // Si llegamos aquí, el usuario no existía en Firebase Auth (caso raro)
                        // Actualizar firebaseUid
                        const firebaseUser = auth.currentUser;
                        if (firebaseUser) {
                            await FirestoreService.save(FirestoreService.COLLECTIONS.USERS, {
                                firebaseUid: firebaseUser.uid
                            }, user.id);
                        }
                    } catch (createError) {
                        if (createError.code === 'auth/email-already-in-use') {
                            // El usuario ya existe en Firebase Auth, no podemos actualizar desde el cliente
                            // Actualizar solo en Firestore para mantener consistencia
                            user.password = newPassword;
                            await Store.saveUser(user);
                            
                            try {
                                await FirestoreService.logActivity('password_updated_by_admin', { 
                                    targetUserId: userId,
                                    adminEmail: this.getCurrentUser()?.email,
                                    note: 'Contrasena actualizada en Firestore. El usuario debe usar reset de contrasena para actualizar en Firebase Auth.'
                                });
                            } catch (e) {}
                            
                            return { 
                                success: true, 
                                message: 'Contrasena actualizada en el sistema. El usuario debe usar "Olvide mi contrasena" para actualizar su contrasena en Firebase Auth.' 
                            };
                        } else {
                            throw createError;
                        }
                    }
                } catch (authError) {
                    console.error('Error al actualizar en Firebase Auth:', authError);
                    // Fallback: actualizar solo en Firestore
                    user.password = newPassword;
                    await Store.saveUser(user);
                    
                    try {
                        await FirestoreService.logActivity('password_updated_by_admin', { 
                            targetUserId: userId,
                            adminEmail: this.getCurrentUser()?.email,
                            note: 'Contrasena actualizada solo en Firestore debido a error en Firebase Auth'
                        });
                    } catch (e) {}
                    
                    return { 
                        success: true, 
                        message: 'Contrasena actualizada en el sistema. Si el usuario tiene problemas para iniciar sesion, debe usar "Olvide mi contrasena".' 
                    };
                }
            }

            // Usuario NO migrado: actualizar en Firestore y migrar a Firebase Auth
            user.password = newPassword;
            await Store.saveUser(user);

            // Intentar migrar a Firebase Auth si está disponible
            if (useFirebase) {
                try {
                    console.log('Migrando usuario a Firebase Auth con nueva contraseña...');
                    const migrationResult = await this.migrateUserToFirebaseAuth(user.email, newPassword, user);
                    if (migrationResult.success) {
                        try {
                            await FirestoreService.logActivity('password_updated_by_admin', { 
                                targetUserId: userId,
                                adminEmail: this.getCurrentUser()?.email,
                                migrated: true
                            });
                        } catch (e) {}
                        
                        return { 
                            success: true, 
                            message: 'Contrasena actualizada y usuario migrado a Firebase Auth correctamente' 
                        };
                    }
                } catch (migrationError) {
                    console.warn('No se pudo migrar usuario a Firebase Auth:', migrationError);
                    // Continuar con el éxito porque al menos se actualizó en Firestore
                }
            }

            try {
                await FirestoreService.logActivity('password_updated_by_admin', { 
                    targetUserId: userId,
                    adminEmail: this.getCurrentUser()?.email 
                });
            } catch (e) {}

            return { success: true, message: 'Contrasena actualizada correctamente' };

        } catch (error) {
            console.error('Error al actualizar contrasena:', error);
            return { success: false, message: error.message || 'Error al actualizar la contrasena' };
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
            user: ['view'],
            employee: ['view', 'create'] // Empleados pueden ver y crear tickets
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
            const currentUser = this.getCurrentUser();
            const redirect = sessionStorage.getItem('fixify-redirect') || 
                (currentUser?.role === 'employee' ? './pages/employee-dashboard.html' : './pages/dashboard.html');
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
            user: 'Usuario',
            employee: 'Empleado'
        };
        return roleNames[role] || role;
    }
};

// Exportar para uso global
window.Auth = Auth;

