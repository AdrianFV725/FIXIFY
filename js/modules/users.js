// ========================================
// USERS MODULE
// Gestion de usuarios del sistema
// ========================================

const UsersModule = {
    table: null,

    // ========================================
    // INICIALIZACION
    // ========================================

    init() {
        if (!Auth.requireAuth()) return;
        
        // Verificar que sea admin
        const currentUser = Auth.getCurrentUser();
        if (currentUser?.role !== 'admin') {
            Toast.error('No tienes permisos para acceder a esta seccion');
            window.location.href = 'dashboard.html';
            return;
        }

        // Inicializar usuario admin por defecto si no existe
        this.ensureAdminExists();
        
        this.renderStats();
        this.renderFilters();
        this.initTable();
        this.bindEvents();
    },

    ensureAdminExists() {
        const users = Store.getUsers();
        const adminExists = users.some(u => u.email === 'admin@brands.mx');
        
        if (!adminExists) {
            Store.saveUser({
                email: 'admin@brands.mx',
                password: '3lN3g0c10d3tuV1d4',
                name: 'Administrador',
                role: 'admin',
                status: 'active'
            });
        }
    },

    // ========================================
    // ESTADISTICAS
    // ========================================

    renderStats() {
        const container = document.getElementById('userStats');
        if (!container) return;

        const users = Store.getUsers();
        const stats = {
            total: users.length,
            active: users.filter(u => u.status === 'active').length,
            admins: users.filter(u => u.role === 'admin').length,
            users: users.filter(u => u.role === 'user').length
        };

        container.innerHTML = `
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.total}</span>
                    <span class="mini-stat-label">Total Usuarios</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(34, 197, 94, 0.1); color: #22c55e;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.active}</span>
                    <span class="mini-stat-label">Activos</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(168, 85, 247, 0.1); color: #a855f7;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.admins}</span>
                    <span class="mini-stat-label">Administradores</span>
                </div>
            </div>
            <div class="mini-stat">
                <div class="mini-stat-icon" style="background: rgba(249, 115, 22, 0.1); color: #f97316;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div class="mini-stat-content">
                    <span class="mini-stat-value">${stats.users}</span>
                    <span class="mini-stat-label">Usuarios</span>
                </div>
            </div>
        `;
    },

    // ========================================
    // FILTROS
    // ========================================

    renderFilters() {
        const container = document.getElementById('filtersBar');
        if (!container) return;

        container.innerHTML = `
            <div class="filter-group">
                <input type="text" class="filter-input" id="searchInput" placeholder="Buscar por nombre, correo...">
            </div>
            <div class="filter-group">
                <label class="filter-label">Rol:</label>
                <select class="filter-select" id="roleFilter">
                    <option value="">Todos</option>
                    <option value="admin">Administrador</option>
                    <option value="user">Usuario</option>
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Estado:</label>
                <select class="filter-select" id="statusFilter">
                    <option value="">Todos</option>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                </select>
            </div>
            <button class="filter-btn" id="clearFilters">Limpiar</button>
        `;
    },

    // ========================================
    // TABLA
    // ========================================

    initTable() {
        const container = document.getElementById('usersTableContainer');
        if (!container) return;

        const statusBadge = TableActions.createStatusBadge({
            active: { label: 'Activo', class: 'badge-active' },
            inactive: { label: 'Inactivo', class: 'badge-inactive' }
        });

        const roleBadge = (role) => {
            const config = {
                admin: { label: 'Administrador', class: 'badge-open' },
                user: { label: 'Usuario', class: 'badge-resolved' }
            };
            const c = config[role] || { label: role, class: 'badge' };
            return `<span class="badge ${c.class}">${c.label}</span>`;
        };

        this.table = new DataTable({
            container,
            columns: [
                { 
                    key: 'name', 
                    label: 'Usuario', 
                    className: 'cell-primary',
                    render: (v, row) => `
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div class="avatar sm">${Utils.getInitials(v)}</div>
                            <div>
                                <div style="font-weight: 500;">${Utils.escapeHtml(v)}</div>
                                <div style="font-size: 0.75rem; color: var(--text-tertiary);">${Utils.escapeHtml(row.email)}</div>
                            </div>
                        </div>
                    `
                },
                { key: 'role', label: 'Rol', render: roleBadge },
                { key: 'status', label: 'Estado', render: statusBadge },
                { key: 'createdAt', label: 'Creado', type: 'date' },
                { key: 'lastLogin', label: 'Ultimo Acceso', render: (v) => v ? Utils.timeAgo(v) : 'Nunca' },
                {
                    key: 'actions',
                    label: 'Acciones',
                    sortable: false,
                    className: 'cell-actions',
                    render: (_, row) => {
                        const currentUser = Auth.getCurrentUser();
                        const isCurrentUser = row.email === currentUser?.email;
                        
                        return `
                            <button class="btn-icon sm btn-ghost" data-action="edit" data-tooltip="Editar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn-icon sm btn-ghost" data-action="password" data-tooltip="Cambiar contrasena">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </button>
                            ${!isCurrentUser ? `
                                <button class="btn-icon sm btn-ghost" data-action="delete" data-tooltip="Eliminar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            ` : ''}
                        `;
                    }
                }
            ],
            data: Store.getUsers(),
            searchFields: ['name', 'email'],
            perPage: 10,
            emptyMessage: 'No hay usuarios registrados',
            onAction: (action, row) => this.handleAction(action, row)
        });
    },

    // ========================================
    // EVENTOS
    // ========================================

    bindEvents() {
        // Busqueda
        document.getElementById('searchInput')?.addEventListener('input', Utils.debounce((e) => {
            this.table?.search(e.target.value);
        }, 300));

        // Filtros
        ['roleFilter', 'statusFilter'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.applyFilters());
        });

        // Limpiar filtros
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('roleFilter').value = '';
            document.getElementById('statusFilter').value = '';
            this.table?.setData(Store.getUsers());
        });

        // Nuevo usuario
        document.getElementById('newUserBtn')?.addEventListener('click', () => {
            this.openUserForm();
        });
    },

    applyFilters() {
        const filters = {
            role: document.getElementById('roleFilter')?.value,
            status: document.getElementById('statusFilter')?.value
        };
        this.table?.filter(filters);
    },

    // ========================================
    // ACCIONES
    // ========================================

    handleAction(action, user) {
        switch (action) {
            case 'edit':
                this.openUserForm(user);
                break;
            case 'password':
                this.openPasswordForm(user);
                break;
            case 'delete':
                this.deleteUser(user);
                break;
        }
    },

    // ========================================
    // FORMULARIO DE USUARIO
    // ========================================

    async openUserForm(user = null) {
        const isEdit = !!user;

        const fields = [
            { 
                name: 'name', 
                label: 'Nombre completo', 
                type: 'text', 
                required: true, 
                fullWidth: true,
                placeholder: 'Ej: Juan Perez' 
            },
            { 
                name: 'email', 
                label: 'Correo electronico', 
                type: 'email', 
                required: true, 
                placeholder: 'correo@empresa.com' 
            },
            {
                name: 'role',
                label: 'Rol',
                type: 'select',
                required: true,
                options: [
                    { value: 'user', label: 'Usuario' },
                    { value: 'admin', label: 'Administrador' }
                ]
            },
            {
                name: 'status',
                label: 'Estado',
                type: 'select',
                required: true,
                options: [
                    { value: 'active', label: 'Activo' },
                    { value: 'inactive', label: 'Inactivo' }
                ]
            }
        ];

        // Solo mostrar campo de password en creacion
        if (!isEdit) {
            fields.splice(2, 0, {
                name: 'password',
                label: 'Contrasena',
                type: 'password',
                required: true,
                placeholder: 'Minimo 6 caracteres',
                hint: 'La contrasena debe tener al menos 6 caracteres'
            });
        }

        const result = await Modal.form({
            title: isEdit ? 'Editar Usuario' : 'Nuevo Usuario',
            fields,
            data: user || { role: 'user', status: 'active' },
            submitText: isEdit ? 'Actualizar' : 'Crear Usuario',
            size: 'md'
        });

        if (result) {
            // Validaciones
            if (!isEdit && result.password.length < 6) {
                Toast.error('La contrasena debe tener al menos 6 caracteres');
                return;
            }

            // Verificar email unico
            const existingUser = Store.getUserByEmail(result.email);
            if (existingUser && (!isEdit || existingUser.id !== user.id)) {
                Toast.error('Ya existe un usuario con ese correo');
                return;
            }

            if (isEdit) {
                result.id = user.id;
                // Mantener password existente
                result.password = user.password;
            }

            Store.saveUser(result);
            this.table?.setData(Store.getUsers());
            this.renderStats();
            
            Toast.success(isEdit ? 'Usuario actualizado' : 'Usuario creado correctamente');
        }
    },

    // ========================================
    // CAMBIAR CONTRASENA
    // ========================================

    async openPasswordForm(user) {
        const fields = [
            {
                name: 'newPassword',
                label: 'Nueva contrasena',
                type: 'password',
                required: true,
                placeholder: 'Ingresa la nueva contrasena',
                hint: 'Minimo 6 caracteres'
            },
            {
                name: 'confirmPassword',
                label: 'Confirmar contrasena',
                type: 'password',
                required: true,
                placeholder: 'Confirma la nueva contrasena'
            }
        ];

        const result = await Modal.form({
            title: `Cambiar contrasena de ${user.name}`,
            fields,
            data: {},
            submitText: 'Cambiar Contrasena',
            size: 'sm'
        });

        if (result) {
            if (result.newPassword.length < 6) {
                Toast.error('La contrasena debe tener al menos 6 caracteres');
                return;
            }

            if (result.newPassword !== result.confirmPassword) {
                Toast.error('Las contrasenas no coinciden');
                return;
            }

            // Actualizar contrasena
            user.password = result.newPassword;
            Store.saveUser(user);
            
            Toast.success('Contrasena actualizada correctamente');
        }
    },

    // ========================================
    // ELIMINAR USUARIO
    // ========================================

    async deleteUser(user) {
        const currentUser = Auth.getCurrentUser();
        
        if (user.email === currentUser?.email) {
            Toast.error('No puedes eliminar tu propio usuario');
            return;
        }

        const confirmed = await Modal.confirmDelete(user.name);
        
        if (confirmed) {
            Store.deleteUser(user.id);
            this.table?.setData(Store.getUsers());
            this.renderStats();
            Toast.success('Usuario eliminado');
        }
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    UsersModule.init();
});

window.UsersModule = UsersModule;

