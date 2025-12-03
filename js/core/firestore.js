// ========================================
// FIRESTORE SERVICE
// Servicio para operaciones CRUD con Firestore
// ========================================

const FirestoreService = {
    // Colecciones
    COLLECTIONS: {
        USERS: 'users',
        EMPLOYEES: 'employees',
        MACHINES: 'machines',
        LICENSES: 'licenses',
        TICKETS: 'tickets',
        CATEGORIES: 'categories',
        ASSIGNMENTS_MACHINES: 'assignments_machines',
        ASSIGNMENTS_LICENSES: 'assignments_licenses',
        DEPARTMENTS: 'departments',
        SETTINGS: 'settings',
        ACTIVITY_LOG: 'activity_log'
    },

    // ========================================
    // METODOS GENERICOS
    // ========================================

    /**
     * Convierte Timestamps de Firestore a strings ISO
     */
    convertTimestamps(data) {
        if (!data) return data;
        
        const result = { ...data };
        for (const key in result) {
            const value = result[key];
            // Verificar si es un Timestamp de Firestore
            if (value && typeof value === 'object') {
                if (value.toDate && typeof value.toDate === 'function') {
                    // Es un Timestamp de Firestore
                    result[key] = value.toDate().toISOString();
                } else if (value.seconds !== undefined && value.nanoseconds !== undefined) {
                    // Es un objeto con estructura de Timestamp
                    result[key] = new Date(value.seconds * 1000).toISOString();
                }
            }
        }
        return result;
    },

    /**
     * Obtiene todos los documentos de una coleccion
     */
    async getAll(collection) {
        try {
            console.log(`FirestoreService.getAll - Obteniendo documentos de colección: ${collection}`);
            const db = getFirebaseDb();
            if (!db) {
                console.error('FirestoreService.getAll - Firestore no inicializado');
                throw new Error('Firestore no inicializado');
            }

            const snapshot = await db.collection(collection).get();
            console.log(`FirestoreService.getAll - Snapshot obtenido: ${snapshot.docs.length} documentos`);
            const results = snapshot.docs.map(doc => {
                const data = this.convertTimestamps({
                    id: doc.id,
                    ...doc.data()
                });
                console.log(`FirestoreService.getAll - Documento ${doc.id}:`, data);
                return data;
            });
            console.log(`FirestoreService.getAll - Total documentos retornados: ${results.length}`);
            return results;
        } catch (error) {
            console.error(`FirestoreService.getAll - Error al obtener ${collection}:`, error);
            return [];
        }
    },

    /**
     * Obtiene un documento por ID
     */
    async getById(collection, id) {
        try {
            const db = getFirebaseDb();
            if (!db) throw new Error('Firestore no inicializado');

            const doc = await db.collection(collection).doc(id).get();
            if (doc.exists) {
                return this.convertTimestamps({ id: doc.id, ...doc.data() });
            }
            return null;
        } catch (error) {
            console.error(`Error al obtener documento ${id}:`, error);
            return null;
        }
    },

    /**
     * Busca documentos por un campo
     */
    async getByField(collection, field, value) {
        try {
            const db = getFirebaseDb();
            if (!db) throw new Error('Firestore no inicializado');

            const snapshot = await db.collection(collection)
                .where(field, '==', value)
                .get();

            return snapshot.docs.map(doc => this.convertTimestamps({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`Error al buscar por ${field}:`, error);
            return [];
        }
    },

    /**
     * Crea o actualiza un documento
     */
    async save(collection, data, id = null) {
        try {
            console.log(`FirestoreService.save - Colección: ${collection}, ID: ${id || 'nuevo'}, Datos:`, data);
            const db = getFirebaseDb();
            if (!db) {
                console.error('FirestoreService.save - Firestore no inicializado');
                throw new Error('Firestore no inicializado');
            }

            const now = new Date().toISOString();

            if (id) {
                // Actualizar existente
                console.log(`FirestoreService.save - Actualizando documento ${id} en colección ${collection}`);
                await db.collection(collection).doc(id).set({
                    ...data,
                    updatedAt: now
                }, { merge: true });
                const result = { id, ...data, updatedAt: now };
                console.log(`FirestoreService.save - Documento actualizado:`, result);
                return result;
            } else {
                // Crear nuevo - asegurar que tenga createdAt
                const dataToSave = {
                    ...data,
                    createdAt: data.createdAt || now,
                    updatedAt: now
                };
                console.log(`FirestoreService.save - Creando nuevo documento en colección ${collection}:`, dataToSave);
                const docRef = await db.collection(collection).add(dataToSave);
                const result = { id: docRef.id, ...dataToSave };
                console.log(`FirestoreService.save - Documento creado con ID ${docRef.id}:`, result);
                return result;
            }
        } catch (error) {
            console.error(`FirestoreService.save - Error al guardar en ${collection}:`, error);
            throw error;
        }
    },

    /**
     * Elimina un documento
     */
    async delete(collection, id) {
        try {
            const db = getFirebaseDb();
            if (!db) throw new Error('Firestore no inicializado');

            await db.collection(collection).doc(id).delete();
            return true;
        } catch (error) {
            console.error(`Error al eliminar documento ${id}:`, error);
            return false;
        }
    },

    /**
     * Escucha cambios en tiempo real de una coleccion
     */
    onSnapshot(collection, callback) {
        try {
            const db = getFirebaseDb();
            if (!db) throw new Error('Firestore no inicializado');

            return db.collection(collection).onSnapshot(snapshot => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(data);
            });
        } catch (error) {
            console.error(`Error al escuchar ${collection}:`, error);
            return null;
        }
    },

    // ========================================
    // METODOS ESPECIFICOS PARA USUARIOS
    // ========================================

    async getUserByEmail(email) {
        const users = await this.getByField(this.COLLECTIONS.USERS, 'email', email.toLowerCase());
        return users.length > 0 ? users[0] : null;
    },

    async saveUser(userData) {
        try {
            console.log('FirestoreService.saveUser - Iniciando:', { email: userData.email, role: userData.role, hasPassword: !!userData.password });
            
            // Normalizar email
            userData.email = userData.email.toLowerCase();
            
            // Si tiene ID, actualizar (no crear en Firebase Auth)
            if (userData.id) {
                console.log('FirestoreService.saveUser - Actualizando usuario existente:', userData.id);
                // No guardar password en texto plano si ya esta migrado
                const existingUser = await this.getById(this.COLLECTIONS.USERS, userData.id);
                if (existingUser?.firebaseUid) {
                    // Usuario migrado, no guardar password
                    const { password, ...safeData } = userData;
                    const result = await this.save(this.COLLECTIONS.USERS, safeData, userData.id);
                    console.log('FirestoreService.saveUser - Usuario actualizado:', result);
                    return result;
                }
                const result = await this.save(this.COLLECTIONS.USERS, userData, userData.id);
                console.log('FirestoreService.saveUser - Usuario actualizado:', result);
                return result;
            }
            
            // Verificar que no exista el email
            console.log('FirestoreService.saveUser - Verificando email único:', userData.email);
            const existing = await this.getUserByEmail(userData.email);
            if (existing) {
                console.warn('FirestoreService.saveUser - Email ya existe:', userData.email);
                throw new Error('Ya existe un usuario con ese correo');
            }

            // Intentar crear en Firebase Auth si esta disponible
            const auth = getFirebaseAuth();
            console.log('FirestoreService.saveUser - Firebase Auth disponible:', !!auth, 'Password disponible:', !!userData.password);
            
            if (auth && userData.password) {
                try {
                    console.log('FirestoreService.saveUser - Intentando crear en Firebase Auth');
                    const userCredential = await auth.createUserWithEmailAndPassword(
                        userData.email,
                        userData.password
                    );
                    const firebaseUser = userCredential.user;

                    // Actualizar displayName
                    await firebaseUser.updateProfile({
                        displayName: userData.name || 'Usuario'
                    });

                    // Guardar en Firestore sin password (Firebase Auth lo maneja)
                    const { password, ...safeUserData } = userData;
                    const firestoreData = {
                        ...safeUserData,
                        firebaseUid: firebaseUser.uid,
                        createdAt: new Date().toISOString()
                    };

                    console.log('FirestoreService.saveUser - Guardando en Firestore (colección:', this.COLLECTIONS.USERS, '):', firestoreData);
                    const result = await this.save(this.COLLECTIONS.USERS, firestoreData);
                    console.log('FirestoreService.saveUser - Usuario creado en Firebase Auth y Firestore:', result);
                    return result;

                } catch (authError) {
                    console.error('FirestoreService.saveUser - Error al crear en Firebase Auth:', authError);
                    
                    if (authError.code === 'auth/email-already-in-use') {
                        // El email ya existe en Firebase Auth pero puede que no exista en Firestore
                        console.warn('FirestoreService.saveUser - Email ya existe en Firebase Auth, verificando en Firestore...');
                        
                        // Verificar si ya existe en Firestore
                        const existingInFirestore = await this.getUserByEmail(userData.email);
                        if (existingInFirestore) {
                            console.warn('FirestoreService.saveUser - Usuario ya existe en Firestore también');
                            throw new Error('Ya existe un usuario con ese correo');
                        }
                        
                        // El usuario existe en Firebase Auth pero no en Firestore
                        // Crear solo en Firestore sin password (Firebase Auth ya lo maneja)
                        console.log('FirestoreService.saveUser - Creando registro en Firestore para usuario existente en Firebase Auth');
                        const { password, ...safeUserData } = userData;
                        const firestoreData = {
                            ...safeUserData,
                            // No podemos obtener el UID sin la contraseña, pero podemos crear el registro
                            // El UID se actualizará cuando el usuario haga login
                            createdAt: new Date().toISOString()
                        };
                        
                        const result = await this.save(this.COLLECTIONS.USERS, firestoreData);
                        console.log('FirestoreService.saveUser - Usuario creado en Firestore (email ya existe en Auth):', result);
                        return result;
                    } else if (authError.code === 'auth/weak-password') {
                        throw new Error('La contrasena debe tener al menos 6 caracteres');
                    } else if (authError.code === 'auth/invalid-email') {
                        throw new Error('Correo electronico invalido');
                    } else if (authError.code === 'auth/network-request-failed') {
                        // Error de red: crear en Firestore y el usuario se migrará automáticamente al hacer login
                        console.warn('FirestoreService.saveUser - Error de red al crear en Firebase Auth, creando en Firestore. El usuario se migrará automáticamente al hacer login.');
                        const result = await this.save(this.COLLECTIONS.USERS, userData);
                        console.log('FirestoreService.saveUser - Usuario creado en Firestore (se migrará al login):', result);
                        return result;
                    }
                    
                    // Si falla Firebase Auth por otra razón, crear solo en Firestore (modo legacy)
                    // El usuario se migrará automáticamente cuando intente hacer login
                    console.warn('FirestoreService.saveUser - Error al crear en Firebase Auth:', authError.code, '- Creando usuario solo en Firestore. El usuario se migrará automáticamente al hacer login.');
                    const result = await this.save(this.COLLECTIONS.USERS, userData);
                    console.log('FirestoreService.saveUser - Usuario creado en Firestore (legacy, se migrará al login):', result);
                    return result;
                }
            }

            // Fallback: crear solo en Firestore
            console.log('FirestoreService.saveUser - Creando usuario solo en Firestore (sin password):', userData);
            const result = await this.save(this.COLLECTIONS.USERS, userData);
            console.log('FirestoreService.saveUser - Usuario creado en Firestore:', result);
            return result;
        } catch (error) {
            console.error('FirestoreService.saveUser - Error general:', error);
            throw error;
        }
    },

    async updateUserLastLogin(email) {
        const user = await this.getUserByEmail(email);
        if (user) {
            await this.save(this.COLLECTIONS.USERS, {
                lastLogin: new Date().toISOString()
            }, user.id);
        }
    },

    // ========================================
    // METODOS ESPECIFICOS PARA EMPLEADOS
    // ========================================

    async getEmployees() {
        return await this.getAll(this.COLLECTIONS.EMPLOYEES);
    },

    async saveEmployee(data) {
        return await this.save(this.COLLECTIONS.EMPLOYEES, data, data.id || null);
    },

    async deleteEmployee(id) {
        return await this.delete(this.COLLECTIONS.EMPLOYEES, id);
    },

    // ========================================
    // METODOS ESPECIFICOS PARA MAQUINAS
    // ========================================

    async getMachines() {
        return await this.getAll(this.COLLECTIONS.MACHINES);
    },

    async saveMachine(data) {
        return await this.save(this.COLLECTIONS.MACHINES, data, data.id || null);
    },

    async deleteMachine(id) {
        return await this.delete(this.COLLECTIONS.MACHINES, id);
    },

    // ========================================
    // METODOS ESPECIFICOS PARA LICENCIAS
    // ========================================

    async getLicenses() {
        return await this.getAll(this.COLLECTIONS.LICENSES);
    },

    async saveLicense(data) {
        return await this.save(this.COLLECTIONS.LICENSES, data, data.id || null);
    },

    async deleteLicense(id) {
        return await this.delete(this.COLLECTIONS.LICENSES, id);
    },

    // ========================================
    // METODOS ESPECIFICOS PARA TICKETS
    // ========================================

    async getTickets() {
        return await this.getAll(this.COLLECTIONS.TICKETS);
    },

    async saveTicket(data) {
        return await this.save(this.COLLECTIONS.TICKETS, data, data.id || null);
    },

    async deleteTicket(id) {
        return await this.delete(this.COLLECTIONS.TICKETS, id);
    },

    // ========================================
    // METODOS ESPECIFICOS PARA CATEGORIAS
    // ========================================

    async getCategories() {
        return await this.getAll(this.COLLECTIONS.CATEGORIES);
    },

    async getCategoryById(id) {
        return await this.getById(this.COLLECTIONS.CATEGORIES, id);
    },

    async saveCategory(data) {
        return await this.save(this.COLLECTIONS.CATEGORIES, data, data.id || null);
    },

    async deleteCategory(id) {
        return await this.delete(this.COLLECTIONS.CATEGORIES, id);
    },

    // ========================================
    // METODOS ESPECIFICOS PARA ASIGNACIONES
    // ========================================

    async getMachineAssignments() {
        return await this.getAll(this.COLLECTIONS.ASSIGNMENTS_MACHINES);
    },

    async saveMachineAssignment(data) {
        return await this.save(this.COLLECTIONS.ASSIGNMENTS_MACHINES, data, data.id || null);
    },

    async getLicenseAssignments() {
        return await this.getAll(this.COLLECTIONS.ASSIGNMENTS_LICENSES);
    },

    async saveLicenseAssignment(data) {
        return await this.save(this.COLLECTIONS.ASSIGNMENTS_LICENSES, data, data.id || null);
    },

    // ========================================
    // METODOS PARA ACTIVIDAD
    // ========================================

    async logActivity(type, details = {}) {
        const auth = getFirebaseAuth();
        const currentUser = auth?.currentUser;

        await this.save(this.COLLECTIONS.ACTIVITY_LOG, {
            type,
            details,
            userId: currentUser?.uid || 'anonymous',
            userEmail: currentUser?.email || 'unknown',
            timestamp: new Date().toISOString()
        });
    },

    async getActivityLog(limit = 50) {
        try {
            const db = getFirebaseDb();
            if (!db) return [];

            const snapshot = await db.collection(this.COLLECTIONS.ACTIVITY_LOG)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error al obtener actividad:', error);
            return [];
        }
    },

    // ========================================
    // INICIALIZACION DE DATOS POR DEFECTO
    // ========================================

    async ensureAdminExists() {
        const adminEmail = 'admin@brands.mx';
        const adminPassword = '3lN3g0c10d3tuV1d4';
        const existingAdmin = await this.getUserByEmail(adminEmail);

        if (!existingAdmin) {
            // Crear admin usando el metodo saveUser que maneja Firebase Auth
            try {
                await this.saveUser({
                    email: adminEmail,
                    password: adminPassword,
                    name: 'Administrador',
                    role: 'admin',
                    status: 'active'
                });
                console.log('Usuario administrador creado');
            } catch (error) {
                // Si ya existe en Firebase Auth pero no en Firestore
                if (error.message.includes('Firebase')) {
                    await this.save(this.COLLECTIONS.USERS, {
                        email: adminEmail,
                        name: 'Administrador',
                        role: 'admin',
                        status: 'active',
                        createdAt: new Date().toISOString()
                    });
                    console.log('Usuario administrador sincronizado en Firestore');
                }
            }
        }
    }
};

// Exportar globalmente
window.FirestoreService = FirestoreService;

