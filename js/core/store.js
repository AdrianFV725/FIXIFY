// ========================================
// STORE - Gestion de datos con localStorage
// Maneja la persistencia de todos los datos de la aplicacion
// ========================================

const Store = {
    // Prefijo para las keys en localStorage
    prefix: 'fixify_',

    // ========================================
    // KEYS DE ALMACENAMIENTO
    // ========================================
    KEYS: {
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
    // METODOS GENERICOS DE STORAGE
    // ========================================

    /**
     * Obtiene datos del localStorage
     * @param {string} key - Clave de almacenamiento
     * @returns {Array|Object|null} - Datos almacenados o null
     */
    get(key) {
        try {
            const data = localStorage.getItem(this.prefix + key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error al obtener ${key}:`, error);
            return null;
        }
    },

    /**
     * Guarda datos en localStorage
     * @param {string} key - Clave de almacenamiento
     * @param {any} data - Datos a guardar
     */
    set(key, data) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error al guardar ${key}:`, error);
            return false;
        }
    },

    /**
     * Elimina datos del localStorage
     * @param {string} key - Clave a eliminar
     */
    remove(key) {
        localStorage.removeItem(this.prefix + key);
    },

    /**
     * Limpia todos los datos de la aplicacion
     */
    clearAll() {
        Object.keys(localStorage)
            .filter(key => key.startsWith(this.prefix))
            .forEach(key => localStorage.removeItem(key));
    },

    // ========================================
    // METODOS PARA USUARIOS DEL SISTEMA
    // ========================================

    getUsers() {
        const users = this.get(this.KEYS.USERS) || [];
        
        // Asegurar que existe el admin por defecto
        if (users.length === 0) {
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
            this.set(this.KEYS.USERS, users);
        }
        
        return users;
    },

    getUserById(id) {
        const users = this.getUsers();
        return users.find(u => u.id === id) || null;
    },

    getUserByEmail(email) {
        const users = this.getUsers();
        return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    },

    saveUser(user) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === user.id);
        
        if (index >= 0) {
            // Actualizar existente
            users[index] = { ...users[index], ...user, updatedAt: new Date().toISOString() };
        } else {
            // Crear nuevo
            user.id = this.generateId('USR');
            user.createdAt = new Date().toISOString();
            users.push(user);
        }
        
        this.set(this.KEYS.USERS, users);
        this.logActivity('user_saved', { email: user.email });
        return user;
    },

    deleteUser(id) {
        const users = this.getUsers().filter(u => u.id !== id);
        this.set(this.KEYS.USERS, users);
        this.logActivity('user_deleted', { userId: id });
    },

    updateUserLastLogin(email) {
        const user = this.getUserByEmail(email);
        if (user) {
            user.lastLogin = new Date().toISOString();
            this.saveUser(user);
        }
    },

    // ========================================
    // METODOS PARA EMPLEADOS
    // ========================================

    getEmployees() {
        return this.get(this.KEYS.EMPLOYEES) || [];
    },

    getEmployeeById(id) {
        const employees = this.getEmployees();
        return employees.find(e => e.id === id) || null;
    },

    saveEmployee(employee) {
        const employees = this.getEmployees();
        const index = employees.findIndex(e => e.id === employee.id);
        
        if (index >= 0) {
            // Actualizar existente
            employees[index] = { ...employees[index], ...employee, updatedAt: new Date().toISOString() };
        } else {
            // Crear nuevo
            employee.id = this.generateId('EMP');
            employee.createdAt = new Date().toISOString();
            employees.push(employee);
        }
        
        this.set(this.KEYS.EMPLOYEES, employees);
        return employee;
    },

    deleteEmployee(id) {
        const employees = this.getEmployees().filter(e => e.id !== id);
        this.set(this.KEYS.EMPLOYEES, employees);
        // TODO: Desasignar maquinas y licencias del empleado
    },

    // ========================================
    // METODOS PARA MAQUINAS
    // ========================================

    getMachines() {
        return this.get(this.KEYS.MACHINES) || [];
    },

    getMachineById(id) {
        const machines = this.getMachines();
        return machines.find(m => m.id === id) || null;
    },

    getMachineBySerial(serial) {
        const machines = this.getMachines();
        return machines.find(m => m.serialNumber === serial) || null;
    },

    saveMachine(machine) {
        const machines = this.getMachines();
        const index = machines.findIndex(m => m.id === machine.id);
        
        if (index >= 0) {
            machines[index] = { ...machines[index], ...machine, updatedAt: new Date().toISOString() };
        } else {
            machine.id = this.generateId('MAC');
            machine.createdAt = new Date().toISOString();
            machine.ticketCount = 0;
            machines.push(machine);
        }
        
        this.set(this.KEYS.MACHINES, machines);
        return machine;
    },

    deleteMachine(id) {
        const machines = this.getMachines().filter(m => m.id !== id);
        this.set(this.KEYS.MACHINES, machines);
        // TODO: Desasignar de empleados
    },

    // ========================================
    // METODOS PARA LICENCIAS
    // ========================================

    getLicenses() {
        return this.get(this.KEYS.LICENSES) || [];
    },

    getLicenseById(id) {
        const licenses = this.getLicenses();
        return licenses.find(l => l.id === id) || null;
    },

    saveLicense(license) {
        const licenses = this.getLicenses();
        const index = licenses.findIndex(l => l.id === license.id);
        
        if (index >= 0) {
            licenses[index] = { ...licenses[index], ...license, updatedAt: new Date().toISOString() };
        } else {
            license.id = this.generateId('LIC');
            license.createdAt = new Date().toISOString();
            license.assignedCount = 0;
            licenses.push(license);
        }
        
        this.set(this.KEYS.LICENSES, licenses);
        return license;
    },

    deleteLicense(id) {
        const licenses = this.getLicenses().filter(l => l.id !== id);
        this.set(this.KEYS.LICENSES, licenses);
    },

    getExpiringLicenses(days = 30) {
        const licenses = this.getLicenses();
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

    getTickets() {
        return this.get(this.KEYS.TICKETS) || [];
    },

    getTicketById(id) {
        const tickets = this.getTickets();
        return tickets.find(t => t.id === id) || null;
    },

    saveTicket(ticket) {
        const tickets = this.getTickets();
        const index = tickets.findIndex(t => t.id === ticket.id);
        
        if (index >= 0) {
            tickets[index] = { ...tickets[index], ...ticket, updatedAt: new Date().toISOString() };
        } else {
            ticket.id = this.generateId('TKT');
            ticket.folio = this.generateFolio();
            ticket.createdAt = new Date().toISOString();
            ticket.status = ticket.status || 'open';
            ticket.comments = [];
            ticket.history = [{
                action: 'created',
                timestamp: new Date().toISOString(),
                user: 'Admin' // TODO: Usuario actual
            }];
            tickets.push(ticket);
            
            // Incrementar contador de tickets de la maquina
            if (ticket.machineId) {
                this.incrementMachineTicketCount(ticket.machineId);
            }
        }
        
        this.set(this.KEYS.TICKETS, tickets);
        return ticket;
    },

    deleteTicket(id) {
        const tickets = this.getTickets().filter(t => t.id !== id);
        this.set(this.KEYS.TICKETS, tickets);
    },

    addTicketComment(ticketId, comment) {
        const ticket = this.getTicketById(ticketId);
        if (!ticket) return null;
        
        comment.id = this.generateId('CMT');
        comment.createdAt = new Date().toISOString();
        ticket.comments.push(comment);
        
        return this.saveTicket(ticket);
    },

    updateTicketStatus(ticketId, newStatus, note = '') {
        const ticket = this.getTicketById(ticketId);
        if (!ticket) return null;
        
        const oldStatus = ticket.status;
        ticket.status = newStatus;
        ticket.history.push({
            action: 'status_change',
            from: oldStatus,
            to: newStatus,
            note,
            timestamp: new Date().toISOString(),
            user: 'Admin' // TODO: Usuario actual
        });
        
        if (newStatus === 'resolved' || newStatus === 'closed') {
            ticket.resolvedAt = new Date().toISOString();
        }
        
        return this.saveTicket(ticket);
    },

    incrementMachineTicketCount(machineId) {
        const machine = this.getMachineById(machineId);
        if (machine) {
            machine.ticketCount = (machine.ticketCount || 0) + 1;
            this.saveMachine(machine);
        }
    },

    // ========================================
    // METODOS PARA ASIGNACIONES
    // ========================================

    // Asignaciones de maquinas
    getMachineAssignments() {
        return this.get(this.KEYS.ASSIGNMENTS_MACHINES) || [];
    },

    assignMachineToEmployee(machineId, employeeId, notes = '') {
        const assignments = this.getMachineAssignments();
        
        // Verificar si la maquina ya esta asignada
        const existing = assignments.find(a => a.machineId === machineId && !a.endDate);
        if (existing) {
            // Terminar asignacion anterior
            existing.endDate = new Date().toISOString();
        }
        
        // Nueva asignacion
        const assignment = {
            id: this.generateId('ASM'),
            machineId,
            employeeId,
            startDate: new Date().toISOString(),
            endDate: null,
            notes,
            assignedBy: 'Admin' // TODO: Usuario actual
        };
        
        assignments.push(assignment);
        this.set(this.KEYS.ASSIGNMENTS_MACHINES, assignments);
        
        // Actualizar estado de la maquina
        const machine = this.getMachineById(machineId);
        if (machine) {
            machine.assignedTo = employeeId;
            machine.status = 'assigned';
            this.saveMachine(machine);
        }
        
        this.logActivity('machine_assigned', { machineId, employeeId });
        return assignment;
    },

    unassignMachine(machineId) {
        const assignments = this.getMachineAssignments();
        const assignment = assignments.find(a => a.machineId === machineId && !a.endDate);
        
        if (assignment) {
            assignment.endDate = new Date().toISOString();
            this.set(this.KEYS.ASSIGNMENTS_MACHINES, assignments);
            
            // Actualizar estado de la maquina
            const machine = this.getMachineById(machineId);
            if (machine) {
                machine.assignedTo = null;
                machine.status = 'available';
                this.saveMachine(machine);
            }
            
            this.logActivity('machine_unassigned', { machineId });
        }
        
        return assignment;
    },

    getMachinesByEmployee(employeeId) {
        const assignments = this.getMachineAssignments()
            .filter(a => a.employeeId === employeeId && !a.endDate);
        
        return assignments.map(a => this.getMachineById(a.machineId)).filter(Boolean);
    },

    // Asignaciones de licencias
    getLicenseAssignments() {
        return this.get(this.KEYS.ASSIGNMENTS_LICENSES) || [];
    },

    assignLicenseToEmployee(licenseId, employeeId, notes = '') {
        const assignments = this.getLicenseAssignments();
        const license = this.getLicenseById(licenseId);
        
        if (!license) return null;
        
        // Verificar disponibilidad
        const currentAssigned = assignments.filter(a => a.licenseId === licenseId && !a.endDate).length;
        if (license.quantity && currentAssigned >= license.quantity) {
            throw new Error('No hay licencias disponibles');
        }
        
        // Verificar si ya tiene esta licencia
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
            assignedBy: 'Admin'
        };
        
        assignments.push(assignment);
        this.set(this.KEYS.ASSIGNMENTS_LICENSES, assignments);
        
        // Actualizar contador de licencia
        license.assignedCount = currentAssigned + 1;
        this.saveLicense(license);
        
        this.logActivity('license_assigned', { licenseId, employeeId });
        return assignment;
    },

    unassignLicense(licenseId, employeeId) {
        const assignments = this.getLicenseAssignments();
        const assignment = assignments.find(
            a => a.licenseId === licenseId && a.employeeId === employeeId && !a.endDate
        );
        
        if (assignment) {
            assignment.endDate = new Date().toISOString();
            this.set(this.KEYS.ASSIGNMENTS_LICENSES, assignments);
            
            // Actualizar contador de licencia
            const license = this.getLicenseById(licenseId);
            if (license) {
                license.assignedCount = Math.max(0, (license.assignedCount || 1) - 1);
                this.saveLicense(license);
            }
            
            this.logActivity('license_unassigned', { licenseId, employeeId });
        }
        
        return assignment;
    },

    getLicensesByEmployee(employeeId) {
        const assignments = this.getLicenseAssignments()
            .filter(a => a.employeeId === employeeId && !a.endDate);
        
        return assignments.map(a => this.getLicenseById(a.licenseId)).filter(Boolean);
    },

    // ========================================
    // METODOS PARA DEPARTAMENTOS
    // ========================================

    getDepartments() {
        return this.get(this.KEYS.DEPARTMENTS) || [
            { id: 'DEP001', name: 'TI', color: '#3b82f6' },
            { id: 'DEP002', name: 'Recursos Humanos', color: '#22c55e' },
            { id: 'DEP003', name: 'Finanzas', color: '#f97316' },
            { id: 'DEP004', name: 'Marketing', color: '#a855f7' },
            { id: 'DEP005', name: 'Operaciones', color: '#ef4444' },
            { id: 'DEP006', name: 'Ventas', color: '#eab308' }
        ];
    },

    saveDepartment(department) {
        const departments = this.getDepartments();
        const index = departments.findIndex(d => d.id === department.id);
        
        if (index >= 0) {
            departments[index] = department;
        } else {
            department.id = this.generateId('DEP');
            departments.push(department);
        }
        
        this.set(this.KEYS.DEPARTMENTS, departments);
        return department;
    },

    // ========================================
    // LOG DE ACTIVIDAD
    // ========================================

    logActivity(action, data = {}) {
        const log = this.get(this.KEYS.ACTIVITY_LOG) || [];
        
        log.unshift({
            id: this.generateId('LOG'),
            action,
            data,
            timestamp: new Date().toISOString(),
            user: 'Admin' // TODO: Usuario actual
        });
        
        // Mantener solo los ultimos 500 registros
        if (log.length > 500) {
            log.pop();
        }
        
        this.set(this.KEYS.ACTIVITY_LOG, log);
    },

    getActivityLog(limit = 50) {
        const log = this.get(this.KEYS.ACTIVITY_LOG) || [];
        return log.slice(0, limit);
    },

    // ========================================
    // UTILIDADES
    // ========================================

    /**
     * Genera un ID unico con prefijo
     * @param {string} prefix - Prefijo del ID
     * @returns {string} - ID generado
     */
    generateId(prefix = 'ID') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}${timestamp}${random}`.toUpperCase();
    },

    /**
     * Genera un folio para tickets
     * @returns {string} - Folio generado
     */
    generateFolio() {
        const tickets = this.getTickets();
        const year = new Date().getFullYear();
        const count = tickets.filter(t => t.folio && t.folio.includes(year)).length + 1;
        return `TKT-${year}-${count.toString().padStart(5, '0')}`;
    },

    // ========================================
    // ESTADISTICAS PARA ANALYTICS
    // ========================================

    getStats() {
        const employees = this.getEmployees();
        const machines = this.getMachines();
        const licenses = this.getLicenses();
        const tickets = this.getTickets();

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
                expiring: this.getExpiringLicenses(30).length,
                expired: licenses.filter(l => new Date(l.expirationDate) < new Date()).length
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

    getMostProblematicMachines(limit = 10) {
        const machines = this.getMachines();
        return machines
            .filter(m => m.ticketCount > 0)
            .sort((a, b) => b.ticketCount - a.ticketCount)
            .slice(0, limit);
    },

    getMostUsedLicenses(limit = 10) {
        const licenses = this.getLicenses();
        return licenses
            .sort((a, b) => (b.assignedCount || 0) - (a.assignedCount || 0))
            .slice(0, limit);
    },

    getTicketsByDateRange(startDate, endDate) {
        const tickets = this.getTickets();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return tickets.filter(t => {
            const created = new Date(t.createdAt);
            return created >= start && created <= end;
        });
    },

    // ========================================
    // SEED DATA (Datos de prueba)
    // ========================================

    seedDemoData() {
        // Solo si no hay datos
        if (this.getEmployees().length > 0) return;

        // Empleados de ejemplo
        const demoEmployees = [
            { name: 'Juan', lastName: 'Perez', email: 'juan.perez@brands.mx', department: 'DEP001', position: 'Developer', status: 'active' },
            { name: 'Maria', lastName: 'Garcia', email: 'maria.garcia@brands.mx', department: 'DEP002', position: 'HR Manager', status: 'active' },
            { name: 'Carlos', lastName: 'Lopez', email: 'carlos.lopez@brands.mx', department: 'DEP003', position: 'Accountant', status: 'active' }
        ];

        demoEmployees.forEach(e => this.saveEmployee(e));

        // Maquinas de ejemplo
        const demoMachines = [
            { name: 'MacBook Pro 16', serialNumber: 'SN001234', type: 'laptop', brand: 'Apple', model: 'MacBook Pro 16 2023', status: 'available' },
            { name: 'Dell XPS 15', serialNumber: 'SN005678', type: 'laptop', brand: 'Dell', model: 'XPS 15 9520', status: 'available' },
            { name: 'iMac 27', serialNumber: 'SN009012', type: 'desktop', brand: 'Apple', model: 'iMac 27 2023', status: 'available' }
        ];

        demoMachines.forEach(m => this.saveMachine(m));

        // Licencias de ejemplo
        const demoLicenses = [
            { software: 'Microsoft Office 365', type: 'subscription', quantity: 50, expirationDate: '2025-12-31', cost: 15000 },
            { software: 'Adobe Creative Cloud', type: 'subscription', quantity: 10, expirationDate: '2025-06-30', cost: 8000 },
            { software: 'Slack', type: 'subscription', quantity: 100, expirationDate: '2025-03-15', cost: 5000 }
        ];

        demoLicenses.forEach(l => this.saveLicense(l));

        console.log('Datos de demo cargados');
    }
};

// Exportar para uso global
window.Store = Store;

