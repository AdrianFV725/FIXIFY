// ========================================
// USERS MODULE - Gestion de usuarios del sistema
// ========================================

const UsersModule = {
    users: [],
    filteredUsers: [],
    departments: [],
    employeeOptions: {},

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }
        
        // Solo admins pueden ver usuarios
        const currentUser = Auth.getCurrentUser();
        if (currentUser?.role !== 'admin') {
            Modal.alert({
                title: 'Acceso denegado',
                message: 'No tienes permisos para acceder a esta seccion',
                type: 'warning'
            }).then(() => {
                window.location.href = 'dashboard.html';
            });
            return;
        }

        await this.loadData();
        this.renderStats();
        this.renderFilters();
        this.renderTable();
        this.bindEvents();
    },

    async loadData() {
        try {
            // Cargar usuarios y empleados
            const [users, employees] = await Promise.all([
                Store.getUsers() || [],
                Store.getEmployees() || []
            ]);
            
            this.departments = await Store.getDepartments() || [];
            this.employeeOptions = await Store.getEmployeeOptions() || {};
            
            // Unificar usuarios y empleados
            // Primero, agregar todos los usuarios existentes
            this.users = [...users];
            
            // Luego, convertir empleados en usuarios si no existen ya
            for (const employee of employees) {
                // Buscar si ya existe un usuario con el mismo email
                const existingUser = this.users.find(u => 
                    u.email && employee.email && 
                    u.email.toLowerCase() === employee.email.toLowerCase()
                );
                
                if (!existingUser) {
                    // Crear usuario a partir del empleado
                    const userFromEmployee = {
                        id: employee.id || Store.generateId('USR'),
                        email: employee.email || '',
                        name: employee.name || '',
                        lastName: employee.lastName || '',
                        role: 'employee',
                        status: employee.status || 'active',
                        employeeNumber: employee.employeeNumber || '',
                        department: employee.department || '',
                        position: employee.position || '',
                        phone: employee.phone || '',
                        startDate: employee.startDate || '',
                        notes: employee.notes || '',
                        createdAt: employee.createdAt || new Date().toISOString(),
                        isFromEmployee: true // Marca para identificar que viene de empleados
                    };
                    this.users.push(userFromEmployee);
                } else {
                    // Si ya existe, actualizar con datos del empleado si faltan
                    if (existingUser.role !== 'employee') {
                        existingUser.role = 'employee';
                    }
                    if (!existingUser.employeeNumber && employee.employeeNumber) {
                        existingUser.employeeNumber = employee.employeeNumber;
                    }
                    if (!existingUser.department && employee.department) {
                        existingUser.department = employee.department;
                    }
                    if (!existingUser.position && employee.position) {
                        existingUser.position = employee.position;
                    }
                    if (!existingUser.lastName && employee.lastName) {
                        existingUser.lastName = employee.lastName;
                    }
                }
            }
            
            // Actualizar usuarios que no tienen fecha de creacion
            for (const user of this.users) {
                if (!user.createdAt) {
                    user.createdAt = new Date().toISOString();
                    await Store.saveUser(user);
                }
            }
            
            this.filteredUsers = [...this.users];
        } catch (e) {
            console.error('Error cargando usuarios:', e);
            this.users = [];
            this.filteredUsers = [];
            this.departments = [];
            this.employeeOptions = {};
        }
    },

    applyFilters() {
        const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
        const roleFilter = document.getElementById('roleFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const departmentFilter = document.getElementById('departmentFilter')?.value || '';
        const positionFilter = document.getElementById('positionFilter')?.value || '';

        this.filteredUsers = this.users.filter(u => {
            const fullName = `${u.name || ''} ${u.lastName || ''}`.toLowerCase();
            const matchesSearch = !searchTerm || 
                fullName.includes(searchTerm) ||
                (u.name || '').toLowerCase().includes(searchTerm) ||
                (u.email || '').toLowerCase().includes(searchTerm) ||
                (u.employeeNumber || '').toLowerCase().includes(searchTerm) ||
                (u.position || '').toLowerCase().includes(searchTerm);

            const matchesRole = !roleFilter || u.role === roleFilter;
            const matchesStatus = !statusFilter || u.status === statusFilter;
            const matchesDepartment = !departmentFilter || u.department === departmentFilter;
            const matchesPosition = !positionFilter || (u.position || '').toLowerCase().includes(positionFilter.toLowerCase());

            return matchesSearch && matchesRole && matchesStatus && matchesDepartment && matchesPosition;
        });

        this.renderTable();
    },

    renderStats() {
        const container = document.getElementById('userStats');
        if (!container) return;

        const stats = {
            total: this.users.length,
            active: this.users.filter(u => u.status === 'active').length,
            admins: this.users.filter(u => u.role === 'admin').length,
            users: this.users.filter(u => u.role === 'user').length,
            employees: this.users.filter(u => u.role === 'employee').length
        };

        const inactive = stats.total - stats.active;
        const percentageActive = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem;">
                <div class="mini-stat" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05)); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; transition: all 0.2s ease; position: relative; overflow: hidden;" onmouseover="this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(59, 130, 246, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='rgba(59, 130, 246, 0.2)'">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div class="mini-stat-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                        </div>
                        <div style="text-align: right;">
                            <span class="mini-stat-value" style="display: block; font-size: 1.5rem; font-weight: 700; color: var(--text-primary); line-height: 1;">${stats.total}</span>
                            <span class="mini-stat-label" style="display: block; font-size: 0.7rem; color: var(--text-secondary); font-weight: 500; margin-top: 0.125rem;">Total</span>
                        </div>
                    </div>
                </div>
                <div class="mini-stat" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05)); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; transition: all 0.2s ease; position: relative; overflow: hidden;" onmouseover="this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(34, 197, 94, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='rgba(34, 197, 94, 0.2)'">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div class="mini-stat-icon" style="background: rgba(34, 197, 94, 0.15); color: #22c55e; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <div style="text-align: right;">
                            <span class="mini-stat-value" style="display: block; font-size: 1.5rem; font-weight: 700; color: var(--text-primary); line-height: 1;">${stats.active}</span>
                            <span class="mini-stat-label" style="display: block; font-size: 0.7rem; color: var(--text-secondary); font-weight: 500; margin-top: 0.125rem;">Activos</span>
                            <span style="display: block; font-size: 0.65rem; color: #22c55e; font-weight: 600; margin-top: 0.125rem;">${percentageActive}%</span>
                        </div>
                    </div>
                </div>
                <div class="mini-stat" style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.05)); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; transition: all 0.2s ease; position: relative; overflow: hidden;" onmouseover="this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(168, 85, 247, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='rgba(168, 85, 247, 0.2)'">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div class="mini-stat-icon" style="background: rgba(168, 85, 247, 0.15); color: #a855f7; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                        </div>
                        <div style="text-align: right;">
                            <span class="mini-stat-value" style="display: block; font-size: 1.5rem; font-weight: 700; color: var(--text-primary); line-height: 1;">${stats.admins}</span>
                            <span class="mini-stat-label" style="display: block; font-size: 0.7rem; color: var(--text-secondary); font-weight: 500; margin-top: 0.125rem;">Admins</span>
                        </div>
                    </div>
                </div>
                <div class="mini-stat" style="background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.05)); border: 1px solid rgba(249, 115, 22, 0.2); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; transition: all 0.2s ease; position: relative; overflow: hidden;" onmouseover="this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(249, 115, 22, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='rgba(249, 115, 22, 0.2)'">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div class="mini-stat-icon" style="background: rgba(249, 115, 22, 0.15); color: #f97316; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <div style="text-align: right;">
                            <span class="mini-stat-value" style="display: block; font-size: 1.5rem; font-weight: 700; color: var(--text-primary); line-height: 1;">${stats.users}</span>
                            <span class="mini-stat-label" style="display: block; font-size: 0.7rem; color: var(--text-secondary); font-weight: 500; margin-top: 0.125rem;">Usuarios</span>
                        </div>
                    </div>
                </div>
                <div class="mini-stat" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05)); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; transition: all 0.2s ease; position: relative; overflow: hidden;" onmouseover="this.style.transform='translateY(-2px)'; this.style.borderColor='rgba(59, 130, 246, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='rgba(59, 130, 246, 0.2)'">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div class="mini-stat-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                        </div>
                        <div style="text-align: right;">
                            <span class="mini-stat-value" style="display: block; font-size: 1.5rem; font-weight: 700; color: var(--text-primary); line-height: 1;">${stats.employees}</span>
                            <span class="mini-stat-label" style="display: block; font-size: 0.7rem; color: var(--text-secondary); font-weight: 500; margin-top: 0.125rem;">Empleados</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderFilters() {
        const container = document.getElementById('filtersBar');
        if (!container) return;

        container.innerHTML = `
            <div class="filters-wrapper" style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <h3 style="margin: 0; font-size: 0.875rem; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="M21 21l-4.35-4.35"></path>
                        </svg>
                        Filtros
                    </h3>
                    <button class="filter-btn" id="clearFilters" style="padding: 0.375rem 0.75rem; font-size: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 0.25rem;" onmouseover="this.style.background='var(--border-color)'; this.style.color='var(--text-primary)'" onmouseout="this.style.background='var(--bg-tertiary)'; this.style.color='var(--text-secondary)'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Limpiar
                    </button>
                </div>
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 0.75rem; align-items: end;">
                    <div class="filter-group" style="display: flex; flex-direction: column; gap: 0.375rem;">
                        <label class="filter-label" style="font-size: 0.7rem; font-weight: 500; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Búsqueda</label>
                        <div style="position: relative;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 0.625rem; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); pointer-events: none;">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="M21 21l-4.35-4.35"></path>
                            </svg>
                            <input type="text" class="filter-input" id="searchInput" placeholder="Nombre, correo..." style="width: 100%; padding: 0.625rem 0.625rem 0.625rem 2rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary); font-size: 0.8rem; transition: all 0.2s ease;" onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'" onblur="this.style.borderColor='var(--border-color)'; this.style.boxShadow='none'">
                        </div>
                    </div>
                    <div class="filter-group" style="display: flex; flex-direction: column; gap: 0.375rem;">
                        <label class="filter-label" style="font-size: 0.7rem; font-weight: 500; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Rol</label>
                        <select class="filter-select" id="roleFilter" style="width: 100%; padding: 0.625rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary); font-size: 0.8rem; cursor: pointer; transition: all 0.2s ease;" onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'" onblur="this.style.borderColor='var(--border-color)'; this.style.boxShadow='none'">
                            <option value="">Todos</option>
                            <option value="admin">Admin</option>
                            <option value="user">Usuario</option>
                            <option value="employee">Empleado</option>
                        </select>
                    </div>
                    <div class="filter-group" style="display: flex; flex-direction: column; gap: 0.375rem;">
                        <label class="filter-label" style="font-size: 0.7rem; font-weight: 500; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Estado</label>
                        <select class="filter-select" id="statusFilter" style="width: 100%; padding: 0.625rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary); font-size: 0.8rem; cursor: pointer; transition: all 0.2s ease;" onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'" onblur="this.style.borderColor='var(--border-color)'; this.style.boxShadow='none'">
                            <option value="">Todos</option>
                            ${(this.employeeOptions.status || [
                                { value: 'active', label: 'Activo' },
                                { value: 'inactive', label: 'Inactivo' }
                            ]).map(s => `<option value="${s.value}">${this.escapeHtml(s.label)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group" style="display: flex; flex-direction: column; gap: 0.375rem;">
                        <label class="filter-label" style="font-size: 0.7rem; font-weight: 500; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Depto.</label>
                        <select class="filter-select" id="departmentFilter" style="width: 100%; padding: 0.625rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary); font-size: 0.8rem; cursor: pointer; transition: all 0.2s ease;" onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'" onblur="this.style.borderColor='var(--border-color)'; this.style.boxShadow='none'">
                            <option value="">Todos</option>
                            ${this.departments.map(d => `<option value="${d.id}">${this.escapeHtml(d.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group" style="display: flex; flex-direction: column; gap: 0.375rem;">
                        <label class="filter-label" style="font-size: 0.7rem; font-weight: 500; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Puesto</label>
                        <input type="text" class="filter-input" id="positionFilter" placeholder="Buscar..." style="width: 100%; padding: 0.625rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary); font-size: 0.8rem; transition: all 0.2s ease;" onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 3px rgba(59, 130, 246, 0.1)'" onblur="this.style.borderColor='var(--border-color)'; this.style.boxShadow='none'">
                    </div>
                </div>
            </div>
        `;
    },

    renderTable() {
        const container = document.getElementById('usersTableContainer') || document.querySelector('.page-content');
        if (!container) return;

        let tableContainer = document.getElementById('usersTableContainer');
        if (!tableContainer) {
            tableContainer = document.createElement('div');
            tableContainer.id = 'usersTableContainer';
            container.appendChild(tableContainer);
        }

        // Capturar this para usar en funciones internas
        const self = this;

        const statusBadge = (status) => {
            const statusOptions = self.employeeOptions.status || [];
            const statusOption = statusOptions.find(s => s.value === status);
            
            if (statusOption) {
                const classMap = {
                    active: 'badge-active',
                    inactive: 'badge-inactive'
                };
                const badgeClass = classMap[status] || 'badge';
                return `<span class="badge ${badgeClass}">${self.escapeHtml(statusOption.label)}</span>`;
            }
            
            // Fallback para estados estándar
            return status === 'active' 
                ? '<span class="badge badge-active">Activo</span>'
                : '<span class="badge badge-inactive">Inactivo</span>';
        };

        const roleBadge = (role) => {
            if (role === 'admin') {
                return '<span class="badge badge-open">Administrador</span>';
            } else if (role === 'employee') {
                return '<span class="badge badge-in-progress">Empleado</span>';
            } else {
                return '<span class="badge badge-resolved">Usuario</span>';
            }
        };

        const currentUser = Auth.getCurrentUser();

        const hasEmployees = this.users.some(u => u.role === 'employee');
        const colCount = hasEmployees ? 9 : 7;

        // Generar filas de la tabla
        let tableRows = '';
        if (this.filteredUsers.length === 0) {
            tableRows = `
                <tr>
                    <td colspan="${colCount}" style="text-align: center; padding: 3rem 2rem;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                            <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-tertiary);">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                            </div>
                            <div>
                                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.125rem; font-weight: 600; color: var(--text-primary);">
                                    ${this.users.length === 0 ? 'No hay usuarios registrados' : 'No se encontraron resultados'}
                                </h3>
                                <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">
                                    ${this.users.length === 0 ? 'Comienza agregando tu primer usuario' : 'Intenta ajustar los filtros de búsqueda'}
                                </p>
                            </div>
                            ${this.users.length === 0 ? `
                                <button class="btn btn-primary" onclick="document.getElementById('newUserBtn').click()" style="margin-top: 0.5rem;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Crear Primer Usuario
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        } else {
            tableRows = this.filteredUsers.map(u => {
                const getDeptName = (deptId) => {
                    const dept = self.departments.find(d => d.id === deptId);
                    return dept ? dept.name : '-';
                };
                const getDeptColor = (deptId) => {
                    const dept = self.departments.find(d => d.id === deptId);
                    return dept?.color || '#3b82f6';
                };
                return `
                        <tr data-id="${u.id}" style="transition: all 0.2s ease;">
                            <td style="padding: 0.75rem 1rem;">
                                <div style="display: flex; align-items: center; gap: 0.625rem;">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.8rem; flex-shrink: 0; box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);">
                                        ${(u.name || 'U')[0].toUpperCase()}
                                    </div>
                                    <div style="min-width: 0; flex: 1;">
                                        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.85rem;">${self.escapeHtml(u.name || 'Usuario')} ${u.lastName ? self.escapeHtml(u.lastName) : ''}</div>
                                        ${u.employeeNumber ? `<div style="font-size: 0.65rem; color: var(--text-tertiary); font-family: 'Monaco', 'Menlo', monospace; background: var(--bg-tertiary); padding: 0.125rem 0.375rem; border-radius: 4px; display: inline-block;">#${self.escapeHtml(u.employeeNumber)}</div>` : ''}
                                    </div>
                                </div>
                            </td>
                            <td style="padding: 0.75rem 1rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-tertiary); flex-shrink: 0;">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                    <span style="color: var(--text-primary); word-break: break-word; font-size: 0.8rem;">${u.email || '-'}</span>
                                </div>
                            </td>
                            <td style="padding: 0.75rem 1rem;">${roleBadge(u.role)}</td>
                            ${hasEmployees ? `
                                <td style="padding: 0.75rem 1rem;">
                                    ${u.role === 'employee' && u.department ? `
                                        <div style="display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.625rem; background: ${getDeptColor(u.department)}15; border: 1px solid ${getDeptColor(u.department)}40; border-radius: 6px; font-size: 0.75rem; font-weight: 500; color: ${getDeptColor(u.department)};">
                                            <div style="width: 6px; height: 6px; border-radius: 50%; background: ${getDeptColor(u.department)};"></div>
                                            ${getDeptName(u.department)}
                                        </div>
                                    ` : '<span style="color: var(--text-tertiary); font-size: 0.8rem;">-</span>'}
                                </td>
                                <td style="padding: 0.75rem 1rem;">
                                    ${u.role === 'employee' && u.position ? `
                                        <span style="color: var(--text-primary); font-weight: 500; font-size: 0.8rem;">${self.escapeHtml(u.position)}</span>
                                    ` : '<span style="color: var(--text-tertiary); font-size: 0.8rem;">-</span>'}
                                </td>
                            ` : ''}
                            <td style="padding: 0.75rem 1rem;">${statusBadge(u.status)}</td>
                            <td style="padding: 0.75rem 1rem;">
                                <span style="color: var(--text-primary); font-size: 0.8rem;">${self.formatDate(u.createdAt)}</span>
                            </td>
                            <td style="padding: 0.75rem 1rem;">
                                <div style="display: flex; align-items: center; gap: 0.375rem;">
                                    ${u.lastLogin ? `
                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-tertiary);">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                        <span style="color: var(--text-secondary); font-size: 0.75rem;">${self.timeAgo(u.lastLogin)}</span>
                                    ` : '<span style="color: var(--text-tertiary); font-size: 0.75rem; font-style: italic;">Nunca</span>'}
                                </div>
                            </td>
                            <td style="padding: 0.75rem 1rem;">
                                <div style="display: flex; align-items: center; justify-content: center; gap: 0.375rem;">
                                    ${u.role === 'employee' ? `
                                        <button class="btn-icon sm" onclick="window.location.href='user-detail.html?id=${u.id}'" title="Ver detalle" style="width: 28px; height: 28px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 6px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; cursor: pointer;" onmouseover="this.style.background='rgba(59, 130, 246, 0.2)'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.1)'; this.style.transform='scale(1)'">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        </button>
                                    ` : ''}
                                    <button class="btn-icon sm" onclick="UsersModule.editUser('${u.id}')" title="Editar" style="width: 28px; height: 28px; background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 6px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; cursor: pointer;" onmouseover="this.style.background='rgba(34, 197, 94, 0.2)'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='rgba(34, 197, 94, 0.1)'; this.style.transform='scale(1)'">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </button>
                                    <button class="btn-icon sm" onclick="UsersModule.openPasswordForm('${u.id}')" title="Cambiar contraseña" style="width: 28px; height: 28px; background: rgba(168, 85, 247, 0.1); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 6px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; cursor: pointer;" onmouseover="this.style.background='rgba(168, 85, 247, 0.2)'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='rgba(168, 85, 247, 0.1)'; this.style.transform='scale(1)'">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                    </button>
                                    ${u.email !== currentUser?.email ? `
                                        <button class="btn-icon sm" onclick="UsersModule.deleteUser('${u.id}')" title="Eliminar" style="width: 28px; height: 28px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 6px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; cursor: pointer;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.transform='scale(1)'">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `;
            }).join('');
        }

        tableContainer.innerHTML = `
            <div style="overflow-x: auto; max-height: calc(100vh - 450px); overflow-y: auto;">
                <table class="data-table" style="min-width: 100%;">
                    <thead style="position: sticky; top: 0; z-index: 10; background: var(--bg-tertiary);">
                        <tr>
                            <th style="min-width: 180px; padding: 0.75rem 1rem; font-size: 0.7rem;">Usuario</th>
                            <th style="min-width: 160px; padding: 0.75rem 1rem; font-size: 0.7rem;">Correo</th>
                            <th style="min-width: 100px; padding: 0.75rem 1rem; font-size: 0.7rem;">Rol</th>
                            ${hasEmployees ? '<th style="min-width: 120px; padding: 0.75rem 1rem; font-size: 0.7rem;">Departamento</th><th style="min-width: 140px; padding: 0.75rem 1rem; font-size: 0.7rem;">Puesto</th>' : ''}
                            <th style="min-width: 90px; padding: 0.75rem 1rem; font-size: 0.7rem;">Estado</th>
                            <th style="min-width: 100px; padding: 0.75rem 1rem; font-size: 0.7rem;">Creado</th>
                            <th style="min-width: 120px; padding: 0.75rem 1rem; font-size: 0.7rem;">Último Acceso</th>
                            <th style="min-width: 100px; padding: 0.75rem 1rem; font-size: 0.7rem; text-align: center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    },

    getById(id) {
        return this.users.find(u => u.id === id);
    },

    async editUser(id) {
        const user = this.getById(id);
        if (user) {
            await this.openForm(user);
        } else {
            this.showToast('Error: Usuario no encontrado');
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatDate(date) {
        if (!date) return '-';
        
        try {
            // Manejar Timestamps de Firestore
            if (date && typeof date === 'object') {
                if (date.toDate && typeof date.toDate === 'function') {
                    return date.toDate().toLocaleDateString('es-MX');
                }
                if (date.seconds !== undefined) {
                    return new Date(date.seconds * 1000).toLocaleDateString('es-MX');
                }
            }
            
            // Manejar strings ISO o Date objects
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) {
                return '-';
            }
            return parsedDate.toLocaleDateString('es-MX');
        } catch (e) {
            console.warn('Error al formatear fecha:', date, e);
            return '-';
        }
    },

    timeAgo(date) {
        if (!date) return '';
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'Hace un momento';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Hace ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours}h`;
        const days = Math.floor(hours / 24);
        return `Hace ${days}d`;
    },

    bindEvents() {
        document.getElementById('newUserBtn')?.addEventListener('click', () => this.openForm());
        document.getElementById('manageDepartmentsBtn')?.addEventListener('click', () => this.openDepartmentsManager());
        document.getElementById('optionsBtn')?.addEventListener('click', () => this.openOptionsManager());
        
        // Filtros en tiempo real
        document.getElementById('searchInput')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('roleFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('departmentFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('positionFilter')?.addEventListener('input', () => this.applyFilters());

        // Limpiar filtros
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('roleFilter').value = '';
            document.getElementById('statusFilter').value = '';
            document.getElementById('departmentFilter').value = '';
            document.getElementById('positionFilter').value = '';
            this.applyFilters();
        });
    },

    async openForm(user = null) {
        const isEdit = !!user;

        const modalHtml = `
            <div class="modal-overlay active" id="userModal">
                <div class="modal" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2>${isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                        <button class="modal-close" onclick="document.getElementById('userModal').remove()">&times;</button>
                    </div>
                    <form id="userForm" class="modal-body">
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label>Nombre completo *</label>
                            <input type="text" name="name" required value="${user?.name || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                        </div>
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label>Correo electronico *</label>
                            <input type="email" name="email" required value="${user?.email || ''}" ${isEdit ? 'readonly' : ''} style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                        </div>
                        ${!isEdit ? `
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label>Contrasena *</label>
                                <input type="password" name="password" required minlength="6" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                <small style="color: var(--text-tertiary);">Minimo 6 caracteres</small>
                            </div>
                        ` : ''}
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label>Rol *</label>
                                <select name="role" id="userRoleSelect" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    <option value="user" ${user?.role === 'user' ? 'selected' : ''}>Usuario</option>
                                    <option value="employee" ${user?.role === 'employee' ? 'selected' : ''}>Empleado</option>
                                    <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Administrador</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Estado *</label>
                                <select name="status" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    ${(this.employeeOptions.status || [
                                        { value: 'active', label: 'Activo' },
                                        { value: 'inactive', label: 'Inactivo' }
                                    ]).map(s => `<option value="${s.value}" ${user?.status === s.value ? 'selected' : ''}>${this.escapeHtml(s.label)}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <!-- Campos de Empleado (solo si el rol es employee) -->
                        <div id="employeeFieldsSection" style="display: ${user?.role === 'employee' ? 'block' : 'none'}; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                            <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-primary);">Información de Empleado</h3>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                                <div class="form-group">
                                    <label>Número de Empleado</label>
                                    <input type="text" name="employeeNumber" value="${user?.employeeNumber || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                </div>
                                <div class="form-group">
                                    <label>Apellidos</label>
                                    <input type="text" name="lastName" value="${user?.lastName || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                </div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                                <div class="form-group">
                                    <label>Departamento</label>
                                    <select name="department" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                        <option value="">Seleccionar departamento...</option>
                                        ${this.departments.map(d => `<option value="${d.id}" ${user?.department === d.id ? 'selected' : ''}>${this.escapeHtml(d.name)}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Puesto</label>
                                    <input type="text" name="position" value="${user?.position || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                </div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                                <div class="form-group">
                                    <label>Fecha de Inicio</label>
                                    <input type="date" name="startDate" value="${user?.startDate ? user.startDate.split('T')[0] : ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                </div>
                                <div class="form-group">
                                    <label>Teléfono</label>
                                    <input type="tel" name="phone" value="${user?.phone || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Notas</label>
                                <textarea name="notes" rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary); resize: vertical;">${user?.notes || ''}</textarea>
                            </div>
                        </div>
                        
                        <input type="hidden" name="id" value="${user?.id || ''}">
                    </form>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('userModal').remove()">Cancelar</button>
                        <button type="submit" form="userForm" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear Usuario'}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Mostrar/ocultar campos de empleado según el rol seleccionado
        const roleSelect = document.getElementById('userRoleSelect');
        const employeeFieldsSection = document.getElementById('employeeFieldsSection');
        
        if (roleSelect && employeeFieldsSection) {
            roleSelect.addEventListener('change', (e) => {
                if (e.target.value === 'employee') {
                    employeeFieldsSection.style.display = 'block';
                } else {
                    employeeFieldsSection.style.display = 'none';
                    // Limpiar campos de empleado si se cambia el rol
                    const employeeFields = employeeFieldsSection.querySelectorAll('input, select, textarea');
                    employeeFields.forEach(field => {
                        if (field.name !== 'phone') { // Mantener teléfono si se desea
                            field.value = '';
                        }
                    });
                }
            });
        }

        document.getElementById('userForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            // Si el rol no es employee, limpiar campos de empleado
            if (data.role !== 'employee') {
                delete data.employeeNumber;
                delete data.lastName;
                delete data.department;
                delete data.position;
                delete data.startDate;
                delete data.notes;
            }
            
            // Verificar email unico
            if (!isEdit) {
                const existingUser = await Store.getUserByEmail(data.email);
                if (existingUser) {
                    Modal.alert({
                        title: 'Correo duplicado',
                        message: 'Ya existe un usuario con ese correo electronico',
                        type: 'warning'
                    });
                    return;
                }
            }

            if (data.id) {
                const existing = this.getById(data.id);
                if (existing) {
                    // Mantener password y createdAt existentes en edicion
                    data.password = existing.password;
                    data.createdAt = existing.createdAt;
                    Object.assign(existing, data);
                    await Store.saveUser(existing);
                    
                    // Si es empleado, también guardar en la colección de empleados
                    if (data.role === 'employee') {
                        const employeeData = {
                            id: existing.id,
                            name: existing.name,
                            lastName: existing.lastName || '',
                            email: existing.email,
                            employeeNumber: existing.employeeNumber || '',
                            department: existing.department || '',
                            position: existing.position || '',
                            phone: existing.phone || '',
                            startDate: existing.startDate || '',
                            notes: existing.notes || '',
                            status: existing.status || 'active',
                            createdAt: existing.createdAt
                        };
                        await Store.saveEmployee(employeeData);
                    }
                }
            } else {
                delete data.id;
                // Agregar fecha de creacion para nuevos usuarios
                data.createdAt = new Date().toISOString();
                const savedUser = await Store.saveUser(data);
                
                // Si es empleado, también guardar en la colección de empleados
                if (data.role === 'employee') {
                    const employeeData = {
                        id: savedUser.id,
                        name: savedUser.name,
                        lastName: savedUser.lastName || '',
                        email: savedUser.email,
                        employeeNumber: savedUser.employeeNumber || '',
                        department: savedUser.department || '',
                        position: savedUser.position || '',
                        phone: savedUser.phone || '',
                        startDate: savedUser.startDate || '',
                        notes: savedUser.notes || '',
                        status: savedUser.status || 'active',
                        createdAt: savedUser.createdAt
                    };
                    await Store.saveEmployee(employeeData);
                }
            }

            document.getElementById('userModal').remove();
            await this.loadData();
            this.renderStats();
            this.renderTable();
            this.showToast(isEdit ? 'Usuario actualizado' : 'Usuario creado');
        });
    },

    async openPasswordForm(userId) {
        const user = this.getById(userId);
        if (!user) return;

        // Verificar si el usuario esta migrado a Firebase Auth
        const isMigrated = !!user.firebaseUid;

        const modalHtml = `
            <div class="modal-overlay active" id="passwordModal">
                <div class="modal" style="max-width: 450px;">
                    <div class="modal-header">
                        <h2>Cambiar Contrasena</h2>
                        <button class="modal-close" onclick="document.getElementById('passwordModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 1rem; color: var(--text-secondary);">Usuario: <strong>${user.name}</strong> (${user.email})</p>
                        
                        ${isMigrated ? `
                            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" style="vertical-align: middle; margin-right: 0.5rem;">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="16" x2="12" y2="12"></line>
                                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                    </svg>
                                    Este usuario usa autenticacion de Firebase. Se enviara un correo para que restablezca su contrasena.
                                </p>
                            </div>
                            <button type="button" id="sendResetEmailBtn" class="btn btn-primary" style="width: 100%;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 0.5rem;">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                Enviar Correo de Restablecimiento
                            </button>
                        ` : `
                            <form id="passwordForm">
                                <div class="form-group" style="margin-bottom: 1rem;">
                                    <label>Nueva contrasena *</label>
                                    <input type="password" name="newPassword" required minlength="6" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                </div>
                                <div class="form-group">
                                    <label>Confirmar contrasena *</label>
                                    <input type="password" name="confirmPassword" required minlength="6" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                </div>
                                <input type="hidden" name="userId" value="${userId}">
                            </form>
                        `}
                    </div>
                    ${!isMigrated ? `
                        <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('passwordModal').remove()">Cancelar</button>
                            <button type="submit" form="passwordForm" class="btn btn-primary">Cambiar Contrasena</button>
                        </div>
                    ` : `
                        <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('passwordModal').remove()">Cerrar</button>
                        </div>
                    `}
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Para usuarios migrados: enviar correo de reset
        if (isMigrated) {
            document.getElementById('sendResetEmailBtn')?.addEventListener('click', async () => {
                const btn = document.getElementById('sendResetEmailBtn');
                btn.disabled = true;
                btn.innerHTML = '<span style="opacity: 0.7;">Enviando...</span>';

                const result = await Auth.sendPasswordResetToUser(user.email);
                
                document.getElementById('passwordModal').remove();

                if (result.success) {
                    Modal.alert({
                        title: 'Correo Enviado',
                        message: result.message,
                        type: 'success'
                    });
                } else {
                    Modal.alert({
                        title: 'Error',
                        message: result.message,
                        type: 'error'
                    });
                }
            });
        } else {
            // Para usuarios no migrados: formulario directo
            document.getElementById('passwordForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                
                if (data.newPassword !== data.confirmPassword) {
                    Modal.alert({
                        title: 'Error de validacion',
                        message: 'Las contrasenas no coinciden',
                        type: 'error'
                    });
                    return;
                }

                if (data.newPassword.length < 6) {
                    Modal.alert({
                        title: 'Contrasena muy corta',
                        message: 'La contrasena debe tener al menos 6 caracteres',
                        type: 'warning'
                    });
                    return;
                }

                const result = await Auth.updatePasswordDirect(data.userId, data.newPassword);
                
                document.getElementById('passwordModal').remove();

                if (result.success) {
                    this.showToast('Contrasena actualizada');
                } else {
                    Modal.alert({
                        title: 'Error',
                        message: result.message,
                        type: 'error'
                    });
                }
            });
        }
    },

    async deleteUser(id) {
        const currentUser = Auth.getCurrentUser();
        const user = this.getById(id);
        
        if (user?.email === currentUser?.email) {
            await Modal.alert({
                title: 'Accion no permitida',
                message: 'No puedes eliminar tu propio usuario',
                type: 'warning'
            });
            return;
        }

        const confirmed = await Modal.confirmDelete(user?.name || 'este usuario', 'usuario');
        if (confirmed) {
            await Store.deleteUser(id);
            
            // Si es empleado, también eliminar de la colección de empleados
            if (user?.role === 'employee') {
                try {
                    await Store.deleteEmployee(id);
                } catch (e) {
                    console.warn('No se pudo eliminar el empleado:', e);
                }
            }
            
            await this.loadData();
            this.renderStats();
            this.renderTable();
            this.showToast('Usuario eliminado');
        }
    },

    async openDepartmentsManager() {
        const departments = await Store.getDepartments();

        const modalHtml = `
            <div class="modal-overlay active" id="departmentsModal">
                <div class="modal" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2>Gestionar Departamentos</h2>
                        <button class="modal-close" onclick="document.getElementById('departmentsModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                        <div style="margin-bottom: 2rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <h3 style="margin: 0; color: var(--text-primary);">Departamentos</h3>
                                <button type="button" class="btn btn-primary sm" onclick="UsersModule.addDepartment()">Agregar</button>
                            </div>
                            <div id="departmentsList" style="display: flex; flex-direction: column; gap: 0.5rem;">
                                ${departments.map(d => `
                                    <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                                        <div style="width: 20px; height: 20px; border-radius: 4px; background: ${d.color || '#3b82f6'};"></div>
                                        <input type="text" value="${this.escapeHtml(d.name)}" data-id="${d.id}" data-field="name" style="flex: 1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--input-bg); color: var(--text-primary);" onchange="UsersModule.updateDepartment('${d.id}', 'name', this.value)">
                                        <input type="color" value="${d.color || '#3b82f6'}" data-id="${d.id}" data-field="color" style="width: 50px; height: 38px; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;" onchange="UsersModule.updateDepartment('${d.id}', 'color', this.value)">
                                        <button type="button" class="btn-icon sm" onclick="UsersModule.deleteDepartment('${d.id}')" title="Eliminar">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('departmentsModal').remove()">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async addDepartment() {
        const modalHtml = `
            <div class="modal-overlay active" id="addDepartmentModal">
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2>Agregar Departamento</h2>
                        <button class="modal-close" onclick="document.getElementById('addDepartmentModal').remove()">&times;</button>
                    </div>
                    <form id="addDepartmentForm" class="modal-body">
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label>Nombre del Departamento *</label>
                            <input type="text" name="name" required placeholder="Ej: Recursos Humanos" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                        </div>
                        <div class="form-group">
                            <label>Color</label>
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <input type="color" name="color" value="#3b82f6" style="width: 60px; height: 40px; border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer;">
                                <input type="text" id="colorHex" value="#3b82f6" readonly style="flex: 1; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary); font-family: monospace;">
                            </div>
                        </div>
                    </form>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('addDepartmentModal').remove()">Cancelar</button>
                        <button type="submit" form="addDepartmentForm" class="btn btn-primary">Agregar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Sincronizar color picker con input de texto
        const colorInput = document.querySelector('#addDepartmentModal input[type="color"]');
        const colorHex = document.getElementById('colorHex');
        
        if (colorInput && colorHex) {
            colorInput.addEventListener('input', (e) => {
                colorHex.value = e.target.value.toUpperCase();
            });

            colorHex.addEventListener('input', (e) => {
                const value = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(value)) {
                    colorInput.value = value;
                }
            });
        }

        document.getElementById('addDepartmentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const name = formData.get('name').trim();
            const color = formData.get('color');

            if (!name) {
                this.showToast('El nombre es requerido', 'error');
                return;
            }

            const department = {
                name: name,
                color: color
            };

            await Store.saveDepartment(department);
            await this.loadData();
            document.getElementById('addDepartmentModal').remove();
            document.getElementById('departmentsModal').remove();
            await this.openDepartmentsManager();
            this.showToast('Departamento agregado');
        });
    },

    async updateDepartment(id, field, value) {
        const departments = await Store.getDepartments();
        const department = departments.find(d => d.id === id);
        if (department) {
            department[field] = value;
            await Store.saveDepartment(department);
            await this.loadData();
            document.getElementById('departmentsModal').remove();
            await this.openDepartmentsManager();
        }
    },

    async deleteDepartment(id) {
        const confirmed = await Modal.confirmDelete('este departamento', 'departamento');
        if (confirmed) {
            await Store.deleteDepartment(id);
            await this.loadData();
            document.getElementById('departmentsModal').remove();
            await this.openDepartmentsManager();
            this.showToast('Departamento eliminado');
        }
    },

    async openOptionsManager() {
        const departments = await Store.getDepartments();
        const options = await Store.getEmployeeOptions();
        const statusOptions = options.status || [];

        const modalHtml = `
            <div class="modal-overlay active" id="optionsModal">
                <div class="modal" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2>Gestionar Opciones de Empleados</h2>
                        <button class="modal-close" onclick="document.getElementById('optionsModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                        <!-- Departamentos -->
                        <div style="margin-bottom: 2rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <h3 style="margin: 0; color: var(--text-primary);">Departamentos</h3>
                                <button type="button" class="btn btn-primary sm" onclick="UsersModule.addDepartment()">Agregar</button>
                            </div>
                            <div id="departmentsList" style="display: flex; flex-direction: column; gap: 0.5rem;">
                                ${departments.map(d => `
                                    <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                                        <div style="width: 20px; height: 20px; border-radius: 4px; background: ${d.color || '#3b82f6'};"></div>
                                        <input type="text" value="${this.escapeHtml(d.name)}" data-id="${d.id}" data-field="name" style="flex: 1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--input-bg); color: var(--text-primary);" onchange="UsersModule.updateDepartment('${d.id}', 'name', this.value)">
                                        <input type="color" value="${d.color || '#3b82f6'}" data-id="${d.id}" data-field="color" style="width: 50px; height: 38px; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;" onchange="UsersModule.updateDepartment('${d.id}', 'color', this.value)">
                                        <button type="button" class="btn-icon sm" onclick="UsersModule.deleteDepartment('${d.id}')" title="Eliminar">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Estados -->
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <h3 style="margin: 0; color: var(--text-primary);">Estados</h3>
                                <button type="button" class="btn btn-primary sm" onclick="UsersModule.addStatusOption()">Agregar</button>
                            </div>
                            <div id="statusList" style="display: flex; flex-direction: column; gap: 0.5rem;">
                                ${statusOptions.map(s => `
                                    <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                                        <input type="text" value="${this.escapeHtml(s.value)}" data-value="${s.value}" data-field="value" placeholder="Valor (ej: active)" style="flex: 1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--input-bg); color: var(--text-primary);" onchange="UsersModule.updateStatusOption('${s.value}', 'value', this.value)">
                                        <input type="text" value="${this.escapeHtml(s.label)}" data-value="${s.value}" data-field="label" placeholder="Etiqueta (ej: Activo)" style="flex: 1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--input-bg); color: var(--text-primary);" onchange="UsersModule.updateStatusOption('${s.value}', 'label', this.value)">
                                        <button type="button" class="btn-icon sm" onclick="UsersModule.deleteStatusOption('${s.value}')" title="Eliminar">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('optionsModal').remove()">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async addStatusOption() {
        const modalHtml = `
            <div class="modal-overlay active" id="addStatusModal">
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2>Agregar Estado</h2>
                        <button class="modal-close" onclick="document.getElementById('addStatusModal').remove()">&times;</button>
                    </div>
                    <form id="addStatusForm" class="modal-body">
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label>Valor del Estado *</label>
                            <input type="text" name="value" required placeholder="Ej: active, inactive, suspended" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);" pattern="[a-z_]+" title="Solo letras minúsculas y guiones bajos">
                            <small style="color: var(--text-tertiary); margin-top: 0.25rem; display: block;">Solo letras minúsculas y guiones bajos (ej: active, inactive)</small>
                        </div>
                        <div class="form-group">
                            <label>Etiqueta *</label>
                            <input type="text" name="label" required placeholder="Ej: Activo, Inactivo, Suspendido" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                            <small style="color: var(--text-tertiary); margin-top: 0.25rem; display: block;">Nombre que se mostrará en la interfaz</small>
                        </div>
                    </form>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('addStatusModal').remove()">Cancelar</button>
                        <button type="submit" form="addStatusForm" class="btn btn-primary">Agregar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('addStatusForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const value = formData.get('value').trim().toLowerCase();
            const label = formData.get('label').trim();

            if (!value || !label) {
                this.showToast('Todos los campos son requeridos', 'error');
                return;
            }

            // Validar formato del valor
            if (!/^[a-z_]+$/.test(value)) {
                this.showToast('El valor solo puede contener letras minúsculas y guiones bajos', 'error');
                return;
            }

            // Verificar si ya existe
            const options = await Store.getEmployeeOptions();
            const exists = (options.status || []).find(s => s.value === value);
            if (exists) {
                this.showToast('Ya existe un estado con ese valor', 'error');
                return;
            }

            const option = {
                value: value,
                label: label
            };

            await Store.addEmployeeOption('status', option);
            await this.loadData();
            document.getElementById('addStatusModal').remove();
            document.getElementById('optionsModal').remove();
            await this.openOptionsManager();
            this.showToast('Estado agregado');
        });
    },

    async updateStatusOption(oldValue, field, newValue) {
        const options = await Store.getEmployeeOptions();
        const statusOptions = options.status || [];
        const option = statusOptions.find(o => o.value === oldValue);
        
        if (option) {
            if (field === 'value') {
                // Si cambia el valor, necesitamos actualizar todos los usuarios que usan el valor anterior
                const newOption = { ...option, value: newValue.trim().toLowerCase() };
                await Store.updateEmployeeOption('status', oldValue, newOption);
                
                // Actualizar usuarios que usan este estado
                const users = await Store.getUsers();
                for (const user of users) {
                    if (user.status === oldValue) {
                        user.status = newOption.value;
                        await Store.saveUser(user);
                    }
                }
                
                // Actualizar empleados que usan este estado
                const employees = await Store.getEmployees();
                for (const emp of employees) {
                    if (emp.status === oldValue) {
                        emp.status = newOption.value;
                        await Store.saveEmployee(emp);
                    }
                }
            } else {
                option[field] = newValue.trim();
                await Store.updateEmployeeOption('status', oldValue, option);
            }
            
            await this.loadData();
            document.getElementById('optionsModal').remove();
            await this.openOptionsManager();
        }
    },

    async deleteStatusOption(value) {
        // Verificar si hay usuarios usando este estado
        const users = await Store.getUsers();
        const employees = await Store.getEmployees();
        const usingStatus = [...users, ...employees].filter(u => u.status === value);
        
        if (usingStatus.length > 0) {
            this.showToast(`No se puede eliminar: ${usingStatus.length} usuario(s) usan este estado`, 'error');
            return;
        }

        const confirmed = await Modal.confirmDelete('este estado', 'estado');
        if (confirmed) {
            await Store.removeEmployeeOption('status', value);
            await this.loadData();
            document.getElementById('optionsModal').remove();
            await this.openOptionsManager();
            this.showToast('Estado eliminado');
        }
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.textContent = message;
        const bgColor = type === 'error' ? '#ef4444' : '#22c55e';
        toast.style.cssText = `position: fixed; bottom: 20px; right: 20px; background: ${bgColor}; color: white; padding: 1rem 1.5rem; border-radius: 8px; z-index: 9999;`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => UsersModule.init(), 100);
});

window.UsersModule = UsersModule;

