// ========================================
// STORE - Gestion de datos
// Usa Firestore cuando esta disponible, localStorage como fallback
// ========================================

const Store = {
    // Prefijo para localStorage
    prefix: 'fixify_',
    useFirestore: false,
    
    // Cache local para mejorar rendimiento
    cache: {},
    cacheTimeout: 5000, // 5 segundos

    // ========================================
    // KEYS DE ALMACENAMIENTO
    // ========================================
    KEYS: {
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
        ACTIVITY_LOG: 'activity_log',
        MACHINE_OPTIONS: 'machine_options',
        EMPLOYEE_OPTIONS: 'employee_options'
    },

    // ========================================
    // INICIALIZACION
    // ========================================

    async init() {
        // Verificar si Firebase y Firestore estan disponibles
        this.useFirestore = typeof firebase !== 'undefined' && 
                           typeof getFirebaseDb === 'function' && 
                           getFirebaseDb();
        
        if (this.useFirestore) {
            console.log('Store: Intentando usar Firestore');
            // Probar conexion con Firestore
            const firestoreWorks = await this.testFirestoreConnection();
            if (!firestoreWorks) {
                console.warn('Store: Firestore no disponible, usando localStorage');
                this.useFirestore = false;
            }
        }
        
        if (!this.useFirestore) {
            console.log('Store: Usando localStorage (modo offline)');
        }
        
        // Asegurar que existe el admin
        await this.ensureAdminExists();
    },

    async testFirestoreConnection() {
        try {
            const db = getFirebaseDb();
            // Intentar una lectura simple para verificar permisos
            await db.collection('_test_connection').limit(1).get();
            console.log('Store: Firestore conectado correctamente');
            return true;
        } catch (error) {
            console.warn('Store: Error de conexion a Firestore:', error.message);
            return false;
        }
    },

    async ensureAdminExists() {
        try {
            const adminEmail = 'admin@brands.mx';
            let admin = await this.getUserByEmail(adminEmail);
            
            if (!admin) {
                // Crear admin localmente primero
                const adminData = {
                    email: adminEmail,
                    password: '3lN3g0c10d3tuV1d4',
                    name: 'Administrador',
                    role: 'admin',
                    status: 'active'
                };
                
                // Guardar en localStorage siempre como respaldo
                const users = this.getLocal(this.KEYS.USERS) || [];
                if (!users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase())) {
                    adminData.id = this.generateId('USR');
                    adminData.createdAt = new Date().toISOString();
                    users.push(adminData);
                    this.setLocal(this.KEYS.USERS, users);
                }
                
                // Intentar guardar en Firestore si esta disponible
                if (this.useFirestore) {
                    try {
                        await FirestoreService.saveUser(adminData);
                    } catch (e) {
                        console.warn('No se pudo crear admin en Firestore');
                    }
                }
                
                console.log('Usuario administrador creado');
            }
        } catch (error) {
            console.error('Error al verificar admin:', error);
            // Asegurar admin en localStorage como ultimo recurso
            this.ensureLocalAdmin();
        }
    },

    ensureLocalAdmin() {
        const adminEmail = 'admin@brands.mx';
        const users = this.getLocal(this.KEYS.USERS) || [];
        
        if (!users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase())) {
            users.push({
                id: this.generateId('USR'),
                email: adminEmail,
                password: '3lN3g0c10d3tuV1d4',
                name: 'Administrador',
                role: 'admin',
                status: 'active',
                createdAt: new Date().toISOString()
            });
            this.setLocal(this.KEYS.USERS, users);
            console.log('Admin creado en localStorage');
        }
    },

    // ========================================
    // METODOS GENERICOS
    // ========================================

    // LocalStorage
    getLocal(key) {
        try {
            const data = localStorage.getItem(this.prefix + key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error al obtener ${key}:`, error);
            return null;
        }
    },

    setLocal(key, data) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error al guardar ${key}:`, error);
            return false;
        }
    },

    // ========================================
    // METODOS PARA USUARIOS
    // ========================================

    async getUsers() {
        let firestoreUsers = [];
        
        // Intentar Firestore primero
        if (this.useFirestore && window.FirestoreService) {
            try {
                console.log('Store.getUsers - Obteniendo usuarios de Firestore (colección:', FirestoreService.COLLECTIONS.USERS, ')');
                firestoreUsers = await FirestoreService.getAll(FirestoreService.COLLECTIONS.USERS);
                console.log('Store.getUsers - Usuarios obtenidos de Firestore:', firestoreUsers.length, firestoreUsers);
                // Retornar usuarios de Firestore incluso si está vacío (para mantener consistencia)
                return firestoreUsers || [];
            } catch (e) {
                console.warn('Store.getUsers - Firestore no disponible, usando localStorage:', e);
            }
        } else {
            console.log('Store.getUsers - Firestore no está habilitado, usando localStorage');
        }
        
        // Usar localStorage
        let users = this.getLocal(this.KEYS.USERS) || [];
        console.log('Store.getUsers - Usuarios de localStorage:', users.length, users);
        
        // Asegurar admin existe
        if (!users.find(u => u.email.toLowerCase() === 'admin@brands.mx')) {
            const adminUser = {
                id: this.generateId('USR'),
                email: 'admin@brands.mx',
                password: '3lN3g0c10d3tuV1d4',
                name: 'Administrador',
                role: 'admin',
                status: 'active',
                createdAt: new Date().toISOString()
            };
            users.push(adminUser);
            this.setLocal(this.KEYS.USERS, users);
        }
        
        return users;
    },

    async getUserById(id) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                return await FirestoreService.getById(FirestoreService.COLLECTIONS.USERS, id);
            } catch (e) {}
        }
        const users = await this.getUsers();
        return users.find(u => u.id === id) || null;
    },

    async getUserByEmail(email) {
        // Intentar Firestore primero
        if (this.useFirestore && window.FirestoreService) {
            try {
                const user = await FirestoreService.getUserByEmail(email);
                if (user) return user;
            } catch (e) {
                console.warn('Firestore error, buscando en localStorage');
            }
        }
        
        // Buscar en localStorage
        const users = this.getLocal(this.KEYS.USERS) || [];
        return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    },

    async saveUser(user) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                return await FirestoreService.saveUser(user);
            } catch (e) {
                console.warn('Error Firestore, guardando localmente:', e);
            }
        }
        
        // Fallback localStorage
        const users = await this.getUsers();
        const index = users.findIndex(u => u.id === user.id);
        
        if (index >= 0) {
            users[index] = { ...users[index], ...user, updatedAt: new Date().toISOString() };
        } else {
            user.id = this.generateId('USR');
            user.createdAt = new Date().toISOString();
            users.push(user);
        }
        
        this.setLocal(this.KEYS.USERS, users);
        return user;
    },

    async deleteUser(id) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                await FirestoreService.delete(FirestoreService.COLLECTIONS.USERS, id);
                return;
            } catch (e) {}
        }
        const users = (await this.getUsers()).filter(u => u.id !== id);
        this.setLocal(this.KEYS.USERS, users);
    },

    async updateUserLastLogin(email) {
        const user = await this.getUserByEmail(email);
        if (user) {
            user.lastLogin = new Date().toISOString();
            await this.saveUser(user);
        }
    },

    // ========================================
    // METODOS PARA EMPLEADOS
    // ========================================

    async getEmployees() {
        if (this.useFirestore && window.FirestoreService) {
            try {
                return await FirestoreService.getEmployees();
            } catch (e) {}
        }
        return this.getLocal(this.KEYS.EMPLOYEES) || [];
    },

    async getEmployeeById(id) {
        const employees = await this.getEmployees();
        return employees.find(e => e.id === id) || null;
    },

    async saveEmployee(employee) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                return await FirestoreService.saveEmployee(employee);
            } catch (e) {}
        }
        
        const employees = await this.getEmployees();
        const index = employees.findIndex(e => e.id === employee.id);
        
        if (index >= 0) {
            employees[index] = { ...employees[index], ...employee, updatedAt: new Date().toISOString() };
        } else {
            employee.id = this.generateId('EMP');
            employee.createdAt = new Date().toISOString();
            employees.push(employee);
        }
        
        this.setLocal(this.KEYS.EMPLOYEES, employees);
        return employee;
    },

    async deleteEmployee(id) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                await FirestoreService.deleteEmployee(id);
                return;
            } catch (e) {}
        }
        const employees = (await this.getEmployees()).filter(e => e.id !== id);
        this.setLocal(this.KEYS.EMPLOYEES, employees);
    },

    // ========================================
    // METODOS PARA MAQUINAS
    // ========================================

    async getMachines() {
        if (this.useFirestore && window.FirestoreService) {
            try {
                return await FirestoreService.getMachines();
            } catch (e) {}
        }
        return this.getLocal(this.KEYS.MACHINES) || [];
    },

    async getMachineById(id) {
        const machines = await this.getMachines();
        return machines.find(m => m.id === id) || null;
    },

    async getMachineBySerial(serial) {
        const machines = await this.getMachines();
        return machines.find(m => m.serialNumber === serial) || null;
    },

    async saveMachine(machine) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                return await FirestoreService.saveMachine(machine);
            } catch (e) {}
        }
        
        const machines = await this.getMachines();
        const index = machines.findIndex(m => m.id === machine.id);
        
        if (index >= 0) {
            machines[index] = { ...machines[index], ...machine, updatedAt: new Date().toISOString() };
        } else {
            machine.id = this.generateId('MAC');
            machine.createdAt = new Date().toISOString();
            machine.ticketCount = 0;
            machines.push(machine);
        }
        
        this.setLocal(this.KEYS.MACHINES, machines);
        return machine;
    },

    async deleteMachine(id) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                await FirestoreService.deleteMachine(id);
                return;
            } catch (e) {}
        }
        const machines = (await this.getMachines()).filter(m => m.id !== id);
        this.setLocal(this.KEYS.MACHINES, machines);
    },

    // ========================================
    // METODOS PARA OPCIONES DE MAQUINAS
    // ========================================

    getDefaultMachineOptions() {
        return {
            diskType: [
                { value: 'ssd', label: 'SSD' },
                { value: 'hdd', label: 'HDD' },
                { value: 'nvme', label: 'NVMe' },
                { value: 'hybrid', label: 'Hibrido' }
            ],
            ramType: [
                { value: 'ddr3', label: 'DDR3' },
                { value: 'ddr4', label: 'DDR4' },
                { value: 'ddr5', label: 'DDR5' },
                { value: 'lpddr4', label: 'LPDDR4' },
                { value: 'lpddr5', label: 'LPDDR5' },
                { value: 'unified', label: 'Memoria Unificada' }
            ],
            operatingSystem: [
                { value: 'macos', label: 'macOS' },
                { value: 'windows', label: 'Windows' },
                { value: 'linux', label: 'Linux' },
                { value: 'chromeos', label: 'ChromeOS' },
                { value: 'other', label: 'Otro' }
            ],
            status: [
                { value: 'available', label: 'Disponible' },
                { value: 'assigned', label: 'Asignada' },
                { value: 'maintenance', label: 'Mantenimiento' },
                { value: 'retired', label: 'Dada de Baja' }
            ]
        };
    },

    async getMachineOptions() {
        const saved = this.getLocal(this.KEYS.MACHINE_OPTIONS);
        if (saved) return saved;
        
        // Devolver opciones por defecto si no hay guardadas
        const defaults = this.getDefaultMachineOptions();
        this.setLocal(this.KEYS.MACHINE_OPTIONS, defaults);
        return defaults;
    },

    async saveMachineOptions(options) {
        this.setLocal(this.KEYS.MACHINE_OPTIONS, options);
        return options;
    },

    async addMachineOption(category, option) {
        const options = await this.getMachineOptions();
        if (!options[category]) {
            options[category] = [];
        }
        
        // Verificar si ya existe
        const exists = options[category].find(o => o.value === option.value);
        if (!exists) {
            options[category].push(option);
            await this.saveMachineOptions(options);
        }
        return options;
    },

    async removeMachineOption(category, value) {
        const options = await this.getMachineOptions();
        if (options[category]) {
            options[category] = options[category].filter(o => o.value !== value);
            await this.saveMachineOptions(options);
        }
        return options;
    },

    async updateMachineOption(category, oldValue, newOption) {
        const options = await this.getMachineOptions();
        if (options[category]) {
            const index = options[category].findIndex(o => o.value === oldValue);
            if (index >= 0) {
                options[category][index] = newOption;
                await this.saveMachineOptions(options);
            }
        }
        return options;
    },

    // ========================================
    // METODOS PARA LICENCIAS
    // ========================================

    async getLicenses() {
        if (this.useFirestore && window.FirestoreService) {
            try {
                return await FirestoreService.getLicenses();
            } catch (e) {}
        }
        return this.getLocal(this.KEYS.LICENSES) || [];
    },

    async getLicenseById(id) {
        const licenses = await this.getLicenses();
        return licenses.find(l => l.id === id) || null;
    },

    async saveLicense(license) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                return await FirestoreService.saveLicense(license);
            } catch (e) {}
        }
        
        const licenses = await this.getLicenses();
        const index = licenses.findIndex(l => l.id === license.id);
        
        if (index >= 0) {
            licenses[index] = { ...licenses[index], ...license, updatedAt: new Date().toISOString() };
        } else {
            license.id = this.generateId('LIC');
            license.createdAt = new Date().toISOString();
            license.assignedCount = 0;
            licenses.push(license);
        }
        
        this.setLocal(this.KEYS.LICENSES, licenses);
        return license;
    },

    async deleteLicense(id) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                await FirestoreService.deleteLicense(id);
                return;
            } catch (e) {}
        }
        const licenses = (await this.getLicenses()).filter(l => l.id !== id);
        this.setLocal(this.KEYS.LICENSES, licenses);
    },

    async getExpiringLicenses(days = 30) {
        const licenses = await this.getLicenses();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        
        return licenses.filter(l => {
            if (!l.expirationDate) return false;
            const expDate = new Date(l.expirationDate);
            return expDate <= futureDate && expDate >= new Date();
        });
    },

    // ========================================
    // METODOS PARA TICKETS
    // ========================================

    async getTickets() {
        if (this.useFirestore && window.FirestoreService) {
            try {
                return await FirestoreService.getTickets();
            } catch (e) {}
        }
        return this.getLocal(this.KEYS.TICKETS) || [];
    },

    async getTicketById(id) {
        const tickets = await this.getTickets();
        return tickets.find(t => t.id === id) || null;
    },

    async saveTicket(ticket) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                if (!ticket.id) {
                    ticket.folio = await this.generateFolio();
                    ticket.status = ticket.status || 'open';
                    ticket.createdAt = new Date().toISOString();
                    ticket.comments = [];
                    ticket.history = [{
                        action: 'created',
                        timestamp: new Date().toISOString(),
                        user: Auth?.getCurrentUser()?.name || 'Admin'
                    }];
                }
                return await FirestoreService.saveTicket(ticket);
            } catch (e) {}
        }
        
        const tickets = await this.getTickets();
        const index = tickets.findIndex(t => t.id === ticket.id);
        
        if (index >= 0) {
            tickets[index] = { ...tickets[index], ...ticket, updatedAt: new Date().toISOString() };
        } else {
            ticket.id = this.generateId('TKT');
            ticket.folio = await this.generateFolio();
            ticket.createdAt = new Date().toISOString();
            ticket.status = ticket.status || 'open';
            ticket.comments = [];
            ticket.history = [{
                action: 'created',
                timestamp: new Date().toISOString(),
                user: Auth?.getCurrentUser()?.name || 'Admin'
            }];
            tickets.push(ticket);
            
            if (ticket.machineId) {
                await this.incrementMachineTicketCount(ticket.machineId);
            }
        }
        
        this.setLocal(this.KEYS.TICKETS, tickets);
        return ticket;
    },

    async deleteTicket(id) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                await FirestoreService.deleteTicket(id);
                return;
            } catch (e) {}
        }
        const tickets = (await this.getTickets()).filter(t => t.id !== id);
        this.setLocal(this.KEYS.TICKETS, tickets);
    },

    async addTicketComment(ticketId, comment) {
        const ticket = await this.getTicketById(ticketId);
        if (!ticket) return null;
        
        comment.id = this.generateId('CMT');
        comment.createdAt = new Date().toISOString();
        ticket.comments = ticket.comments || [];
        ticket.comments.push(comment);
        
        return await this.saveTicket(ticket);
    },

    async updateTicketStatus(ticketId, newStatus, note = '') {
        const ticket = await this.getTicketById(ticketId);
        if (!ticket) return null;
        
        const oldStatus = ticket.status;
        ticket.status = newStatus;
        ticket.history = ticket.history || [];
        ticket.history.push({
            action: 'status_change',
            from: oldStatus,
            to: newStatus,
            note,
            timestamp: new Date().toISOString(),
            user: Auth?.getCurrentUser()?.name || 'Admin'
        });
        
        if (newStatus === 'resolved' || newStatus === 'closed') {
            ticket.resolvedAt = new Date().toISOString();
        }
        
        return await this.saveTicket(ticket);
    },

    async incrementMachineTicketCount(machineId) {
        const machine = await this.getMachineById(machineId);
        if (machine) {
            machine.ticketCount = (machine.ticketCount || 0) + 1;
            await this.saveMachine(machine);
        }
    },

    // Obtener tickets creados por un empleado (por email)
    async getTicketsByEmployeeEmail(employeeEmail) {
        const tickets = await this.getTickets();
        const employees = await this.getEmployees();
        const employee = employees.find(e => e.email && e.email.toLowerCase() === employeeEmail.toLowerCase());
        
        if (!employee) {
            // Si no encontramos el empleado, buscar por email directamente en tickets
            return tickets.filter(t => {
                const contactoEmail = t.contactoEmail || '';
                const contactoNombre = t.contactoNombre || '';
                return contactoEmail.toLowerCase() === employeeEmail.toLowerCase() ||
                       contactoNombre.toLowerCase().includes(employeeEmail.toLowerCase());
            });
        }
        
        // Buscar por contactoId del empleado
        return tickets.filter(t => t.contactoId === employee.id);
    },

    // Obtener tickets por empleado (versión simplificada usando contactoId)
    async getTicketsByEmployeeId(employeeId) {
        const tickets = await this.getTickets();
        return tickets.filter(t => t.contactoId === employeeId);
    },

    // ========================================
    // METODOS PARA CATEGORIAS DE TICKETS
    // ========================================

    async getCategories() {
        if (this.useFirestore && window.FirestoreService) {
            try {
                return await FirestoreService.getCategories();
            } catch (e) {}
        }
        return this.getLocal(this.KEYS.CATEGORIES) || [];
    },

    async getCategoryById(id) {
        const categories = await this.getCategories();
        return categories.find(c => c.id === id) || null;
    },

    async getCategoriesByTema(tema) {
        const categories = await this.getCategories();
        return categories.filter(c => c.tema === tema);
    },

    async getCategoriesByServicio(servicio) {
        const categories = await this.getCategories();
        return categories.filter(c => c.servicio === servicio);
    },

    async getCategoriesByTemaAndServicio(tema, servicio) {
        const categories = await this.getCategories();
        return categories.filter(c => c.tema === tema && c.servicio === servicio);
    },

    async getUniqueTemas() {
        const categories = await this.getCategories();
        return [...new Set(categories.map(c => c.tema))].filter(Boolean);
    },

    async saveCategory(category) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                return await FirestoreService.saveCategory(category);
            } catch (e) {
                console.warn('Error Firestore, guardando categoria localmente:', e);
            }
        }
        
        const categories = await this.getCategories();
        const index = categories.findIndex(c => c.id === category.id);
        
        if (index >= 0) {
            categories[index] = { ...categories[index], ...category, updatedAt: new Date().toISOString() };
        } else {
            category.id = this.generateId('CAT');
            category.createdAt = new Date().toISOString();
            categories.push(category);
        }
        
        this.setLocal(this.KEYS.CATEGORIES, categories);
        return category;
    },

    async deleteCategory(id) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                await FirestoreService.deleteCategory(id);
                return;
            } catch (e) {}
        }
        const categories = (await this.getCategories()).filter(c => c.id !== id);
        this.setLocal(this.KEYS.CATEGORIES, categories);
    },

    // ========================================
    // METODOS PARA ASIGNACIONES
    // ========================================

    async getMachineAssignments() {
        if (this.useFirestore && window.FirestoreService) {
            try {
                return await FirestoreService.getMachineAssignments();
            } catch (e) {}
        }
        return this.getLocal(this.KEYS.ASSIGNMENTS_MACHINES) || [];
    },

    async assignMachineToEmployee(machineId, employeeId, notes = '') {
        const assignments = await this.getMachineAssignments();
        const now = new Date().toISOString();
        const assignedBy = Auth?.getCurrentUser()?.name || 'Admin';
        
        // IMPORTANTE: Cerrar TODAS las asignaciones activas de esta máquina (no solo la primera)
        // Esto previene inconsistencias donde hay múltiples asignaciones activas
        const activeAssignments = assignments.filter(a => a.machineId === machineId && !a.endDate);
        activeAssignments.forEach(existing => {
            existing.endDate = now;
            existing.unassignedBy = assignedBy;
            
            // Guardar en Firestore si está disponible
            if (this.useFirestore && window.FirestoreService) {
                try {
                    FirestoreService.saveMachineAssignment(existing).catch(e => console.error('Error guardando asignación en Firestore:', e));
                } catch (e) {}
            }
        });
        
        const assignment = {
            id: this.generateId('ASM'),
            machineId,
            employeeId,
            startDate: now,
            endDate: null,
            notes,
            assignedBy
        };
        
        assignments.push(assignment);
        
        if (this.useFirestore && window.FirestoreService) {
            try {
                await FirestoreService.saveMachineAssignment(assignment);
            } catch (e) {}
        }
        this.setLocal(this.KEYS.ASSIGNMENTS_MACHINES, assignments);
        
        const machine = await this.getMachineById(machineId);
        if (machine) {
            machine.assignedTo = employeeId;
            machine.status = 'assigned';
            await this.saveMachine(machine);
        }
        
        await this.logActivity('machine_assigned', { machineId, employeeId });
        return assignment;
    },

    async unassignMachine(machineId) {
        const assignments = await this.getMachineAssignments();
        
        // IMPORTANTE: Cerrar TODAS las asignaciones activas de esta máquina, no solo la primera
        // Esto previene inconsistencias donde hay múltiples asignaciones activas
        const activeAssignments = assignments.filter(a => a.machineId === machineId && !a.endDate);
        
        const now = new Date().toISOString();
        const unassignedBy = Auth?.getCurrentUser()?.name || 'Admin';
        
        // Marcar todas las asignaciones activas como finalizadas
        activeAssignments.forEach(assignment => {
            assignment.endDate = now;
            assignment.unassignedBy = unassignedBy;
            
            // Guardar en Firestore si está disponible
            if (this.useFirestore && window.FirestoreService) {
                try {
                    FirestoreService.saveMachineAssignment(assignment).catch(e => console.error('Error guardando asignación en Firestore:', e));
                } catch (e) {}
            }
        });
        
        this.setLocal(this.KEYS.ASSIGNMENTS_MACHINES, assignments);
        
        const machine = await this.getMachineById(machineId);
        if (machine) {
            machine.assignedTo = null;
            machine.status = 'available';
            await this.saveMachine(machine);
        }
        
        await this.logActivity('machine_unassigned', { machineId });
        
        return activeAssignments[0] || null;
    },

    async getMachinesByEmployee(employeeId) {
        const assignments = (await this.getMachineAssignments())
            .filter(a => a.employeeId === employeeId && !a.endDate);
        
        const machines = [];
        for (const a of assignments) {
            const machine = await this.getMachineById(a.machineId);
            if (machine) machines.push(machine);
        }
        return machines;
    },

    async getLicenseAssignments() {
        if (this.useFirestore && window.FirestoreService) {
            try {
                return await FirestoreService.getLicenseAssignments();
            } catch (e) {}
        }
        return this.getLocal(this.KEYS.ASSIGNMENTS_LICENSES) || [];
    },

    async assignLicenseToEmployee(licenseId, employeeId, notes = '') {
        const assignments = await this.getLicenseAssignments();
        const license = await this.getLicenseById(licenseId);
        
        if (!license) return null;
        
        const currentAssigned = assignments.filter(a => a.licenseId === licenseId && !a.endDate).length;
        if (license.quantity && currentAssigned >= license.quantity) {
            throw new Error('No hay licencias disponibles');
        }
        
        const alreadyHas = assignments.find(
            a => a.licenseId === licenseId && a.employeeId === employeeId && !a.endDate
        );
        if (alreadyHas) {
            throw new Error('El empleado ya tiene esta licencia asignada');
        }
        
        const assignment = {
            id: this.generateId('ASL'),
            licenseId,
            employeeId,
            startDate: new Date().toISOString(),
            endDate: null,
            notes,
            assignedBy: Auth?.getCurrentUser()?.name || 'Admin'
        };
        
        assignments.push(assignment);
        
        if (this.useFirestore && window.FirestoreService) {
            try {
                await FirestoreService.saveLicenseAssignment(assignment);
            } catch (e) {}
        }
        this.setLocal(this.KEYS.ASSIGNMENTS_LICENSES, assignments);
        
        license.assignedCount = currentAssigned + 1;
        await this.saveLicense(license);
        
        await this.logActivity('license_assigned', { licenseId, employeeId });
        return assignment;
    },

    async unassignLicense(licenseId, employeeId) {
        console.log('Store.unassignLicense llamado con:', { licenseId, employeeId });
        
        const assignments = await this.getLicenseAssignments();
        const assignment = assignments.find(
            a => a.licenseId === licenseId && a.employeeId === employeeId && !a.endDate
        );
        
        console.log('Asignacion encontrada:', assignment);
        
        if (assignment) {
            assignment.endDate = new Date().toISOString();
            assignment.unassignedBy = Auth?.getCurrentUser()?.name || 'Admin';
            
            // Guardar en Firestore si esta disponible
            if (this.useFirestore && window.FirestoreService) {
                try {
                    await FirestoreService.saveLicenseAssignment(assignment);
                    console.log('Asignacion actualizada en Firestore');
                } catch (e) {
                    console.warn('Error guardando en Firestore, usando localStorage:', e);
                }
            }
            
            // Siempre guardar en localStorage como respaldo
            this.setLocal(this.KEYS.ASSIGNMENTS_LICENSES, assignments);
            console.log('Asignacion actualizada en localStorage');
            
            const license = await this.getLicenseById(licenseId);
            if (license) {
                license.assignedCount = Math.max(0, (license.assignedCount || 1) - 1);
                await this.saveLicense(license);
                console.log('Contador de licencia actualizado:', license.assignedCount);
            }
            
            await this.logActivity('license_unassigned', { licenseId, employeeId });
        } else {
            console.warn('No se encontro asignacion activa para desasignar');
        }
        
        return assignment;
    },

    async getLicensesByEmployee(employeeId) {
        const assignments = (await this.getLicenseAssignments())
            .filter(a => a.employeeId === employeeId && !a.endDate);
        
        const licenses = [];
        for (const a of assignments) {
            const license = await this.getLicenseById(a.licenseId);
            if (license) licenses.push(license);
        }
        return licenses;
    },

    // ========================================
    // METODOS PARA DEPARTAMENTOS
    // ========================================

    async getDepartments() {
        const saved = this.getLocal(this.KEYS.DEPARTMENTS);
        if (saved) return saved;
        
        return [
            { id: 'DEP001', name: 'TI', color: '#3b82f6' },
            { id: 'DEP002', name: 'Recursos Humanos', color: '#22c55e' },
            { id: 'DEP003', name: 'Finanzas', color: '#f97316' },
            { id: 'DEP004', name: 'Marketing', color: '#a855f7' },
            { id: 'DEP005', name: 'Operaciones', color: '#ef4444' },
            { id: 'DEP006', name: 'Ventas', color: '#eab308' }
        ];
    },

    async saveDepartment(department) {
        const departments = await this.getDepartments();
        const index = departments.findIndex(d => d.id === department.id);
        
        if (index >= 0) {
            departments[index] = department;
        } else {
            department.id = this.generateId('DEP');
            departments.push(department);
        }
        
        this.setLocal(this.KEYS.DEPARTMENTS, departments);
        return department;
    },

    async deleteDepartment(id) {
        const departments = await this.getDepartments();
        const filtered = departments.filter(d => d.id !== id);
        this.setLocal(this.KEYS.DEPARTMENTS, filtered);
        return filtered;
    },

    // ========================================
    // METODOS PARA OPCIONES DE EMPLEADOS
    // ========================================

    getDefaultEmployeeOptions() {
        return {
            status: [
                { value: 'active', label: 'Activo' },
                { value: 'inactive', label: 'Inactivo' }
            ]
        };
    },

    async getEmployeeOptions() {
        const saved = this.getLocal(this.KEYS.EMPLOYEE_OPTIONS);
        if (saved) return saved;
        
        // Devolver opciones por defecto si no hay guardadas
        const defaults = this.getDefaultEmployeeOptions();
        this.setLocal(this.KEYS.EMPLOYEE_OPTIONS, defaults);
        return defaults;
    },

    async saveEmployeeOptions(options) {
        this.setLocal(this.KEYS.EMPLOYEE_OPTIONS, options);
        return options;
    },

    async addEmployeeOption(category, option) {
        const options = await this.getEmployeeOptions();
        if (!options[category]) {
            options[category] = [];
        }
        
        // Verificar si ya existe
        const exists = options[category].find(o => o.value === option.value);
        if (!exists) {
            options[category].push(option);
            await this.saveEmployeeOptions(options);
        }
        return options;
    },

    async removeEmployeeOption(category, value) {
        const options = await this.getEmployeeOptions();
        if (options[category]) {
            options[category] = options[category].filter(o => o.value !== value);
            await this.saveEmployeeOptions(options);
        }
        return options;
    },

    async updateEmployeeOption(category, oldValue, newOption) {
        const options = await this.getEmployeeOptions();
        if (options[category]) {
            const index = options[category].findIndex(o => o.value === oldValue);
            if (index >= 0) {
                options[category][index] = newOption;
                await this.saveEmployeeOptions(options);
            }
        }
        return options;
    },

    // ========================================
    // LOG DE ACTIVIDAD
    // ========================================

    async logActivity(action, data = {}) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                await FirestoreService.logActivity(action, data);
                return;
            } catch (e) {}
        }
        
        const log = this.getLocal(this.KEYS.ACTIVITY_LOG) || [];
        
        log.unshift({
            id: this.generateId('LOG'),
            action,
            data,
            timestamp: new Date().toISOString(),
            user: Auth?.getCurrentUser()?.name || 'Admin'
        });
        
        if (log.length > 500) {
            log.pop();
        }
        
        this.setLocal(this.KEYS.ACTIVITY_LOG, log);
    },

    async getActivityLog(limit = 50) {
        if (this.useFirestore && window.FirestoreService) {
            try {
                return await FirestoreService.getActivityLog(limit);
            } catch (e) {}
        }
        const log = this.getLocal(this.KEYS.ACTIVITY_LOG) || [];
        return log.slice(0, limit);
    },

    // ========================================
    // UTILIDADES
    // ========================================

    generateId(prefix = 'ID') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}${timestamp}${random}`.toUpperCase();
    },

    async generateFolio() {
        const tickets = await this.getTickets();
        const year = new Date().getFullYear();
        const count = tickets.filter(t => t.folio && t.folio.includes(year)).length + 1;
        return `TKT-${year}-${count.toString().padStart(5, '0')}`;
    },

    // ========================================
    // ESTADISTICAS
    // ========================================

    async getStats() {
        const [employees, machines, licenses, tickets] = await Promise.all([
            this.getEmployees(),
            this.getMachines(),
            this.getLicenses(),
            this.getTickets()
        ]);

        // Calcular licencias en facturación (con tarjeta domiciliada)
        const billingLicenses = licenses.filter(l => 
            l.isBilling && l.cardLastFour && l.cardLastFour.length === 4
        );

        return {
            employees: {
                total: employees.length,
                active: employees.filter(e => e.status === 'active').length
            },
            machines: {
                total: machines.length,
                assigned: machines.filter(m => m.assignedTo).length,
                available: machines.filter(m => !m.assignedTo && m.status !== 'maintenance').length,
                maintenance: machines.filter(m => m.status === 'maintenance').length
            },
            licenses: {
                total: licenses.length,
                billing: billingLicenses.length
            },
            tickets: {
                total: tickets.length,
                open: tickets.filter(t => t.status === 'open').length,
                inProgress: tickets.filter(t => t.status === 'in_progress').length,
                resolved: tickets.filter(t => t.status === 'resolved').length,
                closed: tickets.filter(t => t.status === 'closed').length
            }
        };
    },

    async getMostProblematicMachines(limit = 10) {
        const machines = await this.getMachines();
        return machines
            .filter(m => m.ticketCount > 0)
            .sort((a, b) => b.ticketCount - a.ticketCount)
            .slice(0, limit);
    },

    async getMostUsedLicenses(limit = 10) {
        const licenses = await this.getLicenses();
        return licenses
            .sort((a, b) => (b.assignedCount || 0) - (a.assignedCount || 0))
            .slice(0, limit);
    },

    async getTicketsByDateRange(startDate, endDate) {
        const tickets = await this.getTickets();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return tickets.filter(t => {
            const created = new Date(t.createdAt);
            return created >= start && created <= end;
        });
    },

    // ========================================
    // DATOS DE PRUEBA
    // ========================================

    async seedDemoData() {
        const employees = await this.getEmployees();
        if (employees.length > 0) return;

        const demoEmployees = [
            { name: 'Juan', lastName: 'Perez', email: 'juan.perez@brands.mx', department: 'DEP001', position: 'Developer', status: 'active' },
            { name: 'Maria', lastName: 'Garcia', email: 'maria.garcia@brands.mx', department: 'DEP002', position: 'HR Manager', status: 'active' },
            { name: 'Carlos', lastName: 'Lopez', email: 'carlos.lopez@brands.mx', department: 'DEP003', position: 'Accountant', status: 'active' }
        ];

        for (const e of demoEmployees) {
            await this.saveEmployee(e);
        }

        const demoMachines = [
            { name: 'MacBook Pro 16', serialNumber: 'SN001234', type: 'laptop', brand: 'Apple', model: 'MacBook Pro 16 2023', status: 'available' },
            { name: 'Dell XPS 15', serialNumber: 'SN005678', type: 'laptop', brand: 'Dell', model: 'XPS 15 9520', status: 'available' },
            { name: 'iMac 27', serialNumber: 'SN009012', type: 'desktop', brand: 'Apple', model: 'iMac 27 2023', status: 'available' }
        ];

        for (const m of demoMachines) {
            await this.saveMachine(m);
        }

        const demoLicenses = [
            { software: 'Microsoft Office 365', type: 'subscription', quantity: 50, expirationDate: '2025-12-31', cost: 15000 },
            { software: 'Adobe Creative Cloud', type: 'subscription', quantity: 10, expirationDate: '2025-06-30', cost: 8000 },
            { software: 'Slack', type: 'subscription', quantity: 100, expirationDate: '2025-03-15', cost: 5000 }
        ];

        for (const l of demoLicenses) {
            await this.saveLicense(l);
        }

        console.log('Datos de demo cargados');
    },

    // ========================================
    // METODOS PARA CONFIGURACION DE SLACK
    // ========================================

    async getSlackSettings() {
        if (this.useFirestore && window.FirestoreService) {
            try {
                const settings = await FirestoreService.getById(this.KEYS.SETTINGS, 'slack');
                return settings || { slackUserIds: [], customMessage: '' };
            } catch (e) {
                console.error('Error al obtener configuración de Slack:', e);
            }
        }
        
        const settings = this.getLocal('slack_settings');
        return settings || { slackUserIds: [], customMessage: '' };
    },

    async saveSlackSettings(settings) {
        const slackSettings = {
            id: 'slack',
            slackUserIds: settings.slackUserIds || [],
            customMessage: settings.customMessage || '',
            updatedAt: new Date().toISOString(),
            updatedBy: Auth?.getCurrentUser()?.name || 'Admin'
        };

        if (this.useFirestore && window.FirestoreService) {
            try {
                await FirestoreService.save(this.KEYS.SETTINGS, slackSettings, 'slack');
            } catch (e) {
                console.error('Error al guardar configuración de Slack:', e);
            }
        }
        
        this.setLocal('slack_settings', slackSettings);
        await this.logActivity('slack_settings_updated', {});
        return slackSettings;
    }
};

// Exportar para uso global
window.Store = Store;
