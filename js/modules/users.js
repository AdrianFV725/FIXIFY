// ========================================
// USERS MODULE - Gestion de usuarios del sistema
// ========================================

const UsersModule = {
    users: [],
    filteredUsers: [],
    departments: [],
    employeeOptions: {},
    currentView: 'table', // Vista actual: 'table' o 'cards'

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
        this.loadViewPreference();
        this.renderStats();
        this.renderFilters();
        this.setView(this.currentView);
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
            this.users = [];
            
            // Asegurarnos de que todos los usuarios se agreguen correctamente
            if (users && Array.isArray(users) && users.length > 0) {
                users.forEach(user => {
                    if (user && (user.id || user.email)) {
                        // Asegurar que tenga un ID si no lo tiene
                        if (!user.id) {
                            user.id = Store.generateId('USR');
                        }
                        // Asegurar que tenga un rol
                        if (!user.role) {
                            user.role = 'user';
                        }
                        // Asegurar que tenga estado
                        if (!user.status) {
                            user.status = 'active';
                        }
                        this.users.push(user);
                    }
                });
            }
            
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
            
            // Asegurar que todos los usuarios tengan un rol válido
            this.users = this.users.map(user => {
                if (!user.role) {
                    user.role = 'user'; // Rol por defecto si no tiene
                }
                return user;
            });
            
            // Ordenar usuarios por fecha de creación (más recientes primero)
            this.users.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
            });
            
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

        this.renderView();
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

        const percentageActive = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

        container.innerHTML = `
            <div class="mini-stat stat-total">
                <div class="mini-stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.total}</span>
                    <span class="mini-stat-label">Total</span>
                </div>
            </div>
            <div class="mini-stat stat-active">
                <div class="mini-stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.active}</span>
                    <span class="mini-stat-label">Activos</span>
                    <span class="mini-stat-percentage">${percentageActive}%</span>
                </div>
            </div>
            <div class="mini-stat stat-admin">
                <div class="mini-stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                    </svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.admins}</span>
                    <span class="mini-stat-label">Admins</span>
                </div>
            </div>
            <div class="mini-stat stat-user">
                <div class="mini-stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.users}</span>
                    <span class="mini-stat-label">Usuarios</span>
                </div>
            </div>
            <div class="mini-stat stat-employee">
                <div class="mini-stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.employees}</span>
                    <span class="mini-stat-label">Empleados</span>
                </div>
            </div>
        `;
    },

    renderFilters() {
        const container = document.getElementById('filtersBar');
        if (!container) return;

        container.innerHTML = `
            <div class="filters-wrapper">
                <div class="filters-grid">
                    <div class="filter-group">
                        <div class="filter-input-wrapper">
                            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="M21 21l-4.35-4.35"></path>
                            </svg>
                            <input type="text" class="filter-input" id="searchInput" placeholder="Nombre, correo...">
                        </div>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Rol</label>
                        <select class="filter-select" id="roleFilter">
                            <option value="">Todos</option>
                            <option value="admin">Admin</option>
                            <option value="user">Usuario</option>
                            <option value="employee">Empleado</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Estado</label>
                        <select class="filter-select" id="statusFilter">
                            <option value="">Todos</option>
                            ${(this.employeeOptions.status || [
                                { value: 'active', label: 'Activo' },
                                { value: 'inactive', label: 'Inactivo' }
                            ]).map(s => `<option value="${s.value}">${this.escapeHtml(s.label)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Depto.</label>
                        <select class="filter-select" id="departmentFilter">
                            <option value="">Todos</option>
                            ${this.departments.map(d => `<option value="${d.id}">${this.escapeHtml(d.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Puesto</label>
                        <input type="text" class="filter-input" id="positionFilter" placeholder="Buscar...">
                    </div>
                    <button class="filter-clear-btn" id="clearFilters">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Limpiar
                    </button>
                </div>
            </div>
        `;
    },

    renderTable() {
        const container = document.getElementById('tableView');
        if (!container) return;

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
                            <td style="padding: 0.75rem 0.5rem; overflow: hidden;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; min-width: 0;">
                                    <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.75rem; flex-shrink: 0; box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);">
                                        ${(u.name || 'U')[0].toUpperCase()}
                                    </div>
                                    <div style="min-width: 0; flex: 1; overflow: hidden;">
                                        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem;">${self.escapeHtml(u.name || 'Usuario')} ${u.lastName ? self.escapeHtml(u.lastName) : ''}</div>
                                        ${u.employeeNumber ? `<div style="font-size: 0.65rem; color: var(--text-tertiary); font-family: 'Monaco', 'Menlo', monospace; background: var(--bg-tertiary); padding: 0.125rem 0.375rem; border-radius: 4px; display: inline-block;">#${self.escapeHtml(u.employeeNumber)}</div>` : ''}
                                    </div>
                                </div>
                            </td>
                            <td style="padding: 0.75rem 0.5rem; overflow: hidden;">
                                <div style="display: flex; align-items: center; gap: 0.375rem; min-width: 0;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-tertiary); flex-shrink: 0;">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                    <span style="color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; display: block; min-width: 0; flex: 1;">${u.email || '-'}</span>
                                </div>
                            </td>
                            <td style="padding: 0.75rem 0.5rem; overflow: hidden;">${roleBadge(u.role)}</td>
                            ${hasEmployees ? `
                                <td style="padding: 0.75rem 0.5rem; overflow: hidden;">
                                    ${u.role === 'employee' && u.department ? `
                                        <div style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; background: ${getDeptColor(u.department)}15; border: 1px solid ${getDeptColor(u.department)}40; border-radius: 6px; font-size: 0.7rem; font-weight: 500; color: ${getDeptColor(u.department)}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                            <div style="width: 5px; height: 5px; border-radius: 50%; background: ${getDeptColor(u.department)}; flex-shrink: 0;"></div>
                                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${getDeptName(u.department)}</span>
                                        </div>
                                    ` : '<span style="color: var(--text-tertiary); font-size: 0.75rem;">-</span>'}
                                </td>
                                <td style="padding: 0.75rem 0.5rem; overflow: hidden;">
                                    ${u.role === 'employee' && u.position ? `
                                        <span style="color: var(--text-primary); font-weight: 500; font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;">${self.escapeHtml(u.position)}</span>
                                    ` : '<span style="color: var(--text-tertiary); font-size: 0.75rem;">-</span>'}
                                </td>
                            ` : ''}
                            <td style="padding: 0.75rem 0.5rem; overflow: hidden;">${statusBadge(u.status)}</td>
                            <td style="padding: 0.75rem 0.5rem; overflow: hidden;">
                                <span style="color: var(--text-primary); font-size: 0.75rem; white-space: nowrap;">${self.formatDate(u.createdAt)}</span>
                            </td>
                            <td style="padding: 0.75rem 0.5rem; overflow: hidden;">
                                <div style="display: flex; align-items: center; gap: 0.25rem; min-width: 0;">
                                    ${u.lastLogin ? `
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-tertiary); flex-shrink: 0;">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                        <span style="color: var(--text-secondary); font-size: 0.7rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${self.timeAgo(u.lastLogin)}</span>
                                    ` : '<span style="color: var(--text-tertiary); font-size: 0.7rem; font-style: italic;">Nunca</span>'}
                                </div>
                            </td>
                            <td style="padding: 0.75rem 0.5rem; overflow: hidden;">
                                <div style="display: flex; align-items: center; justify-content: center; gap: 0.25rem; flex-wrap: wrap;">
                                    ${u.role === 'employee' ? `
                                        <button class="btn-icon sm" onclick="window.location.href='user-detail.html?id=${u.id}'" title="Ver detalle" style="width: 24px; height: 24px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 6px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;" onmouseover="this.style.background='rgba(59, 130, 246, 0.2)'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.1)'; this.style.transform='scale(1)'">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        </button>
                                    ` : ''}
                                    <button class="btn-icon sm" onclick="UsersModule.editUser('${u.id}')" title="Editar" style="width: 24px; height: 24px; background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 6px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;" onmouseover="this.style.background='rgba(34, 197, 94, 0.2)'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='rgba(34, 197, 94, 0.1)'; this.style.transform='scale(1)'">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </button>
                                    <button class="btn-icon sm" onclick="UsersModule.openPasswordForm('${u.id}')" title="Cambiar contraseña" style="width: 24px; height: 24px; background: rgba(168, 85, 247, 0.1); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 6px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;" onmouseover="this.style.background='rgba(168, 85, 247, 0.2)'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='rgba(168, 85, 247, 0.1)'; this.style.transform='scale(1)'">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                    </button>
                                    ${u.email !== currentUser?.email ? `
                                        <button class="btn-icon sm" onclick="UsersModule.deleteUser('${u.id}')" title="Eliminar" style="width: 24px; height: 24px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 6px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.transform='scale(1)'">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `;
            }).join('');
        }

        container.innerHTML = `
            <div style="overflow-x: hidden; overflow-y: auto; max-height: calc(100vh - 480px); width: 100%; position: relative; -webkit-overflow-scrolling: touch; scrollbar-width: thin;">
                <table class="data-table" style="width: 100%; table-layout: fixed;">
                    <thead style="position: sticky; top: 0; z-index: 10; background: var(--card-bg); backdrop-filter: blur(10px);">
                        <tr>
                            <th style="width: ${hasEmployees ? '18%' : '22%'}; padding: 0.75rem 0.5rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); border-bottom: 2px solid var(--border-color);">Usuario</th>
                            <th style="width: ${hasEmployees ? '18%' : '22%'}; padding: 0.75rem 0.5rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); border-bottom: 2px solid var(--border-color);">Correo</th>
                            <th style="width: ${hasEmployees ? '10%' : '12%'}; padding: 0.75rem 0.5rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); border-bottom: 2px solid var(--border-color);">Rol</th>
                            ${hasEmployees ? '<th style="width: 12%; padding: 0.75rem 0.5rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); border-bottom: 2px solid var(--border-color);">Depto.</th><th style="width: 12%; padding: 0.75rem 0.5rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); border-bottom: 2px solid var(--border-color);">Puesto</th>' : ''}
                            <th style="width: ${hasEmployees ? '8%' : '10%'}; padding: 0.75rem 0.5rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); border-bottom: 2px solid var(--border-color);">Estado</th>
                            <th style="width: ${hasEmployees ? '10%' : '12%'}; padding: 0.75rem 0.5rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); border-bottom: 2px solid var(--border-color);">Creado</th>
                            <th style="width: ${hasEmployees ? '10%' : '12%'}; padding: 0.75rem 0.5rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); border-bottom: 2px solid var(--border-color);">Último Acceso</th>
                            <th style="width: ${hasEmployees ? '12%' : '10%'}; padding: 0.75rem 0.5rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); border-bottom: 2px solid var(--border-color); text-align: center;">Acciones</th>
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

    // ========================================
    // VISTA DE TARJETAS
    // ========================================

    renderCards() {
        const container = document.getElementById('cardsView');
        if (!container) return;

        if (this.filteredUsers.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 2rem;">
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
                    </div>
                </div>
            `;
            return;
        }

        const self = this;
        const currentUser = Auth.getCurrentUser();

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

        const getDeptName = (deptId) => {
            const dept = self.departments.find(d => d.id === deptId);
            return dept ? dept.name : '-';
        };

        const getDeptColor = (deptId) => {
            const dept = self.departments.find(d => d.id === deptId);
            return dept?.color || '#3b82f6';
        };

        container.innerHTML = this.filteredUsers.map(u => `
            <div class="card" style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem; display: flex; flex-direction: column; transition: all 0.2s ease; border-left: 4px solid ${u.role === 'admin' ? '#3b82f6' : u.role === 'employee' ? '#a855f7' : '#f97316'};">
                <div class="card-header" style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.875rem; flex: 1; min-width: 0;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.1rem; flex-shrink: 0; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                            ${(u.name || 'U')[0].toUpperCase()}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${self.escapeHtml(u.name || 'Usuario')} ${u.lastName ? self.escapeHtml(u.lastName) : ''}
                            </div>
                            ${u.employeeNumber ? `<div style="font-size: 0.7rem; color: var(--text-tertiary); font-family: 'Monaco', 'Menlo', monospace;">#${self.escapeHtml(u.employeeNumber)}</div>` : ''}
                        </div>
                    </div>
                    ${roleBadge(u.role)}
                </div>
                <div class="card-body" style="flex: 1;">
                    <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-tertiary); flex-shrink: 0;">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            <span style="color: var(--text-primary); font-size: 0.875rem; word-break: break-word;">${u.email || '-'}</span>
                        </div>
                        ${u.role === 'employee' && u.department ? `
                            <div style="display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; background: ${getDeptColor(u.department)}15; border: 1px solid ${getDeptColor(u.department)}40; border-radius: 8px; font-size: 0.75rem; font-weight: 500; color: ${getDeptColor(u.department)}; width: fit-content;">
                                <div style="width: 6px; height: 6px; border-radius: 50%; background: ${getDeptColor(u.department)};"></div>
                                ${getDeptName(u.department)}
                            </div>
                        ` : ''}
                        ${u.role === 'employee' && u.position ? `
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-tertiary); flex-shrink: 0;">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <span style="color: var(--text-primary); font-size: 0.875rem; font-weight: 500;">${self.escapeHtml(u.position)}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                            <span style="color: var(--text-tertiary);">Estado:</span>
                            ${statusBadge(u.status)}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                            <span style="color: var(--text-tertiary);">Creado:</span>
                            <span style="color: var(--text-primary);">${self.formatDate(u.createdAt)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                            <span style="color: var(--text-tertiary);">Último acceso:</span>
                            ${u.lastLogin ? `
                                <span style="color: var(--text-secondary);">${self.timeAgo(u.lastLogin)}</span>
                            ` : '<span style="color: var(--text-tertiary); font-style: italic;">Nunca</span>'}
                        </div>
                    </div>
                </div>
                <div class="card-footer" style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    ${u.role === 'employee' ? `
                        <button class="btn-icon sm" onclick="window.location.href='user-detail.html?id=${u.id}'" title="Ver detalle" style="width: 32px; height: 32px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; cursor: pointer;" onmouseover="this.style.background='rgba(59, 130, 246, 0.2)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.1)'">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                    ` : ''}
                    <button class="btn-icon sm" onclick="UsersModule.editUser('${u.id}')" title="Editar" style="width: 32px; height: 32px; background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 8px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; cursor: pointer;" onmouseover="this.style.background='rgba(34, 197, 94, 0.2)'" onmouseout="this.style.background='rgba(34, 197, 94, 0.1)'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-icon sm" onclick="UsersModule.openPasswordForm('${u.id}')" title="Cambiar contraseña" style="width: 32px; height: 32px; background: rgba(168, 85, 247, 0.1); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 8px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; cursor: pointer;" onmouseover="this.style.background='rgba(168, 85, 247, 0.2)'" onmouseout="this.style.background='rgba(168, 85, 247, 0.1)'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </button>
                    ${u.email !== currentUser?.email ? `
                        <button class="btn-icon sm" onclick="UsersModule.deleteUser('${u.id}')" title="Eliminar" style="width: 32px; height: 32px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; cursor: pointer;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    },

    // ========================================
    // TOGGLE DE VISTAS
    // ========================================

    loadViewPreference() {
        const saved = localStorage.getItem('fixify-users-view');
        if (saved === 'table' || saved === 'cards') {
            this.currentView = saved;
        }
    },

    saveViewPreference() {
        localStorage.setItem('fixify-users-view', this.currentView);
    },

    setView(view) {
        this.currentView = view;
        this.saveViewPreference();
        this.updateViewVisibility();
        this.updateViewToggleButtons();
        this.renderView();
    },

    updateViewVisibility() {
        const tableView = document.getElementById('tableView');
        const cardsView = document.getElementById('cardsView');

        if (tableView && cardsView) {
            if (this.currentView === 'table') {
                tableView.classList.remove('hidden');
                cardsView.classList.add('hidden');
            } else {
                tableView.classList.add('hidden');
                cardsView.classList.remove('hidden');
            }
        }
    },

    updateViewToggleButtons() {
        const viewToggle = document.getElementById('viewToggle');
        if (!viewToggle) return;

        const buttons = viewToggle.querySelectorAll('.view-btn');
        buttons.forEach(btn => {
            const view = btn.getAttribute('data-view');
            if (view === this.currentView) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    renderView() {
        if (this.currentView === 'cards') {
            this.renderCards();
        } else {
            this.renderTable();
        }
    },

    bindEvents() {
        document.getElementById('newUserBtn')?.addEventListener('click', () => this.openForm());
        document.getElementById('manageDepartmentsBtn')?.addEventListener('click', () => this.openDepartmentsManager());
        document.getElementById('optionsBtn')?.addEventListener('click', () => this.openOptionsManager());
        
        // Toggle de vistas
        const viewToggle = document.getElementById('viewToggle');
        if (viewToggle) {
            viewToggle.addEventListener('click', (e) => {
                const btn = e.target.closest('.view-btn');
                if (btn) {
                    const view = btn.getAttribute('data-view');
                    if (view) {
                        this.setView(view);
                    }
                }
            });
        }
        
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
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label>Número de Empleado</label>
                                <input type="text" name="employeeNumber" value="${user?.employeeNumber || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
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
                delete data.department;
                delete data.position;
                delete data.startDate;
                delete data.notes;
            }
            
            // Eliminar lastName ya que no se usa (el nombre completo está en el campo name)
            delete data.lastName;
            
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
                // Asegurar que el usuario tenga los campos necesarios
                if (!data.role) data.role = 'user';
                if (!data.status) data.status = 'active';
                
                // Agregar fecha de creacion para nuevos usuarios
                data.createdAt = new Date().toISOString();
                
                let savedUser;
                let emailExistsInAuth = false;
                try {
                    console.log('Intentando guardar usuario:', { email: data.email, role: data.role, name: data.name });
                    savedUser = await Store.saveUser(data);
                    console.log('Usuario guardado:', savedUser);
                    
                    // Verificar que el usuario se haya guardado correctamente
                    if (!savedUser || !savedUser.id) {
                        Modal.alert({
                            title: 'Error',
                            message: 'No se pudo guardar el usuario correctamente. El usuario no tiene ID.',
                            type: 'error'
                        });
                        return;
                    }
                } catch (error) {
                    console.error('Error al guardar usuario:', error);
                    
                    // Verificar si el error es porque el email ya existe en Firebase Auth
                    if (error.message && error.message.includes('Ya existe una cuenta con este correo en Firebase')) {
                        // Intentar crear solo en Firestore sin password
                        console.log('Email existe en Firebase Auth, intentando crear solo en Firestore...');
                        try {
                            const { password, ...dataWithoutPassword } = data;
                            savedUser = await Store.saveUser(dataWithoutPassword);
                            emailExistsInAuth = true;
                            console.log('Usuario creado solo en Firestore:', savedUser);
                            
                            // Verificar que el usuario se haya guardado correctamente
                            if (!savedUser || !savedUser.id) {
                                Modal.alert({
                                    title: 'Error',
                                    message: 'No se pudo guardar el usuario correctamente. El usuario no tiene ID.',
                                    type: 'error'
                                });
                                return;
                            }
                        } catch (firestoreError) {
                            console.error('Error al crear en Firestore:', firestoreError);
                            Modal.alert({
                                title: 'Error al crear usuario',
                                message: firestoreError.message || 'Ocurrió un error al intentar crear el usuario. Por favor, verifica la consola para más detalles.',
                                type: 'error'
                            });
                            return;
                        }
                    } else {
                        Modal.alert({
                            title: 'Error al crear usuario',
                            message: error.message || 'Ocurrió un error al intentar crear el usuario. Por favor, verifica la consola para más detalles.',
                            type: 'error'
                        });
                        return;
                    }
                }
                
                // Si es empleado, también guardar en la colección de empleados
                if (savedUser && data.role === 'employee') {
                    try {
                        const employeeData = {
                            id: savedUser.id,
                            name: savedUser.name,
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
                    } catch (employeeError) {
                        console.error('Error al guardar empleado:', employeeError);
                        // No bloqueamos la creación del usuario si falla guardar el empleado
                    }
                }
                
                // Mostrar mensaje informativo si el email ya existía en Firebase Auth
                if (emailExistsInAuth) {
                    Modal.alert({
                        title: 'Usuario creado',
                        message: 'El usuario se creó exitosamente en el sistema. Nota: Este correo ya existe en Firebase Authentication. El usuario deberá usar la contraseña original para iniciar sesión.',
                        type: 'info'
                    });
                }
            }

            document.getElementById('userModal').remove();
            
            // Limpiar filtros después de crear/editar para que se vea el usuario nuevo
            if (!isEdit) {
                if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
                if (document.getElementById('roleFilter')) document.getElementById('roleFilter').value = '';
                if (document.getElementById('statusFilter')) document.getElementById('statusFilter').value = '';
                if (document.getElementById('departmentFilter')) document.getElementById('departmentFilter').value = '';
                if (document.getElementById('positionFilter')) document.getElementById('positionFilter').value = '';
            }
            
            // Pequeño delay para asegurar que los datos se hayan guardado completamente
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Recargar todos los datos
            await this.loadData();
            
            // Asegurar que filteredUsers esté actualizado después de cargar datos
            // Si es edición, aplicar filtros actuales; si es creación, mostrar todos
            if (isEdit) {
                this.applyFilters();
            } else {
                // Después de crear, mostrar todos los usuarios sin filtros
                this.filteredUsers = [...this.users];
            }
            
            // Actualizar la vista
            this.renderStats();
            this.renderView();
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
            this.renderView();
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

