// ========================================
// USERS MODULE - Gestion de usuarios del sistema
// ========================================

const UsersModule = {
    users: [],
    filteredUsers: [],

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
            this.users = await Store.getUsers() || [];
            
            // Actualizar usuarios que no tienen fecha de creacion
            for (const user of this.users) {
                if (!user.createdAt) {
                    user.createdAt = new Date().toISOString();
                    await Store.saveUser(user);
                    console.log(`Fecha de creacion agregada a usuario: ${user.email}`);
                }
            }
            
            this.filteredUsers = [...this.users];
        } catch (e) {
            console.error('Error cargando usuarios:', e);
            this.users = [];
            this.filteredUsers = [];
        }
    },

    applyFilters() {
        const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
        const roleFilter = document.getElementById('roleFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';

        this.filteredUsers = this.users.filter(u => {
            const matchesSearch = !searchTerm || 
                (u.name || '').toLowerCase().includes(searchTerm) ||
                (u.email || '').toLowerCase().includes(searchTerm);

            const matchesRole = !roleFilter || u.role === roleFilter;
            const matchesStatus = !statusFilter || u.status === statusFilter;

            return matchesSearch && matchesRole && matchesStatus;
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
            users: this.users.filter(u => u.role === 'user').length
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
                    <option value="employee">Empleado</option>
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

    renderTable() {
        const container = document.getElementById('usersTableContainer') || document.querySelector('.page-content');
        if (!container) return;

        let tableContainer = document.getElementById('usersTableContainer');
        if (!tableContainer) {
            tableContainer = document.createElement('div');
            tableContainer.id = 'usersTableContainer';
            container.appendChild(tableContainer);
        }

        const statusBadge = (status) => {
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

        tableContainer.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Correo</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Creado</th>
                        <th>Ultimo Acceso</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredUsers.length === 0 ? `
                        <tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">${this.users.length === 0 ? 'No hay usuarios registrados' : 'No se encontraron resultados'}</td></tr>
                    ` : this.filteredUsers.map(u => `
                        <tr data-id="${u.id}">
                            <td>
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.75rem;">
                                        ${(u.name || 'U')[0].toUpperCase()}
                                    </div>
                                    <span>${this.escapeHtml(u.name || 'Usuario')}</span>
                                </div>
                            </td>
                            <td>${u.email || '-'}</td>
                            <td>${roleBadge(u.role)}</td>
                            <td>${statusBadge(u.status)}</td>
                            <td>${this.formatDate(u.createdAt)}</td>
                            <td>${u.lastLogin ? this.timeAgo(u.lastLogin) : 'Nunca'}</td>
                            <td>
                                <button class="btn-icon sm" onclick="UsersModule.editUser('${u.id}')" title="Editar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button class="btn-icon sm" onclick="UsersModule.openPasswordForm('${u.id}')" title="Cambiar contrasena">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                </button>
                                ${u.email !== currentUser?.email ? `
                                    <button class="btn-icon sm" onclick="UsersModule.deleteUser('${u.id}')" title="Eliminar">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
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
        
        // Filtros en tiempo real
        document.getElementById('searchInput')?.addEventListener('input', () => this.applyFilters());
        document.getElementById('roleFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter')?.addEventListener('change', () => this.applyFilters());

        // Limpiar filtros
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('roleFilter').value = '';
            document.getElementById('statusFilter').value = '';
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
                                <select name="role" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    <option value="user" ${user?.role === 'user' ? 'selected' : ''}>Usuario</option>
                                    <option value="employee" ${user?.role === 'employee' ? 'selected' : ''}>Empleado</option>
                                    <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Administrador</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Estado *</label>
                                <select name="status" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary);">
                                    <option value="active" ${user?.status === 'active' ? 'selected' : ''}>Activo</option>
                                    <option value="inactive" ${user?.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
                                </select>
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

        document.getElementById('userForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
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
                }
            } else {
                delete data.id;
                // Agregar fecha de creacion para nuevos usuarios
                data.createdAt = new Date().toISOString();
                await Store.saveUser(data);
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
            await this.loadData();
            this.renderStats();
            this.renderTable();
            this.showToast('Usuario eliminado');
        }
    },

    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #22c55e; color: white; padding: 1rem 1.5rem; border-radius: 8px; z-index: 9999;';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => UsersModule.init(), 100);
});

window.UsersModule = UsersModule;
