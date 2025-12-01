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
     * Obtiene todos los documentos de una coleccion
     */
    async getAll(collection) {
        try {
            const db = getFirebaseDb();
            if (!db) throw new Error('Firestore no inicializado');

            const snapshot = await db.collection(collection).get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`Error al obtener ${collection}:`, error);
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
                return { id: doc.id, ...doc.data() };
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

            return snapshot.docs.map(doc => ({
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
            const db = getFirebaseDb();
            if (!db) throw new Error('Firestore no inicializado');

            const timestamp = firebase.firestore.FieldValue.serverTimestamp();

            if (id) {
                // Actualizar existente
                await db.collection(collection).doc(id).set({
                    ...data,
                    updatedAt: timestamp
                }, { merge: true });
                return { id, ...data };
            } else {
                // Crear nuevo
                const docRef = await db.collection(collection).add({
                    ...data,
                    createdAt: timestamp,
                    updatedAt: timestamp
                });
                return { id: docRef.id, ...data };
            }
        } catch (error) {
            console.error(`Error al guardar en ${collection}:`, error);
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
        // Normalizar email
        userData.email = userData.email.toLowerCase();
        
        // Si tiene ID, actualizar
        if (userData.id) {
            return await this.save(this.COLLECTIONS.USERS, userData, userData.id);
        }
        
        // Verificar que no exista el email
        const existing = await this.getUserByEmail(userData.email);
        if (existing) {
            throw new Error('Ya existe un usuario con ese correo');
        }

        return await this.save(this.COLLECTIONS.USERS, userData);
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
        const existingAdmin = await this.getUserByEmail(adminEmail);

        if (!existingAdmin) {
            await this.save(this.COLLECTIONS.USERS, {
                email: adminEmail,
                password: '3lN3g0c10d3tuV1d4',
                name: 'Administrador',
                role: 'admin',
                status: 'active',
                createdAt: new Date().toISOString()
            });
            console.log('Usuario administrador creado');
        }
    }
};

// Exportar globalmente
window.FirestoreService = FirestoreService;

