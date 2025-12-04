// ========================================
// NOTIFICATIONS CENTER
// Centro de notificaciones del sistema
// ========================================

const NotificationsCenter = {
    notifications: [],
    unreadCount: 0,
    isOpen: false,
    updateInterval: null,

    async init() {
        try {
            if (!Auth || !Auth.isAuthenticated || !Auth.isAuthenticated()) {
                console.log('NotificationsCenter: Usuario no autenticado');
                return;
            }

            console.log('NotificationsCenter: Inicializando...');
            await this.loadNotifications();
            this.renderButton();
            this.bindEvents();
            this.startAutoUpdate();
            console.log('NotificationsCenter: Inicializado correctamente');
        } catch (e) {
            console.error('NotificationsCenter: Error en init:', e);
        }
    },

    async loadNotifications() {
        try {
            const currentUser = Auth.getCurrentUser();
            if (!currentUser) return;

            const userRole = currentUser.role || 'user';
            const userEmail = currentUser.email;
            const allTickets = await Store.getTickets() || [];
            
            this.notifications = [];

            if (userRole === 'employee') {
                // Para empleados: mostrar estado de sus tickets
                const employeeTickets = allTickets.filter(t => 
                    t.contactoEmail?.toLowerCase() === userEmail.toLowerCase()
                );

                employeeTickets.forEach(ticket => {
                    if (ticket.status === 'open') {
                        this.notifications.push({
                            id: `ticket-${ticket.id}-open`,
                            type: 'info',
                            title: 'Ticket Abierto',
                            message: `Tu ticket "${ticket.title || ticket.folio}" está abierto y esperando atención`,
                            link: `tickets.html#${ticket.id}`,
                            timestamp: ticket.createdAt || new Date().toISOString(),
                            read: false,
                            urgent: ticket.priority === 'critical' || ticket.priority === 'high',
                            category: 'ticket'
                        });
                    } else if (ticket.status === 'in_progress') {
                        this.notifications.push({
                            id: `ticket-${ticket.id}-progress`,
                            type: 'warning',
                            title: 'Ticket en Progreso',
                            message: `Tu ticket "${ticket.title || ticket.folio}" está siendo atendido`,
                            link: `tickets.html#${ticket.id}`,
                            timestamp: ticket.updatedAt || ticket.createdAt || new Date().toISOString(),
                            read: false,
                            urgent: false,
                            category: 'ticket'
                        });
                    } else if (ticket.status === 'resolved' || ticket.status === 'closed') {
                        this.notifications.push({
                            id: `ticket-${ticket.id}-resolved`,
                            type: 'success',
                            title: 'Ticket Resuelto',
                            message: `Tu ticket "${ticket.title || ticket.folio}" ha sido resuelto`,
                            link: `tickets.html#${ticket.id}`,
                            timestamp: ticket.resolvedAt || ticket.updatedAt || new Date().toISOString(),
                            read: false,
                            urgent: false,
                            category: 'ticket'
                        });
                    }
                });
            } else if (userRole === 'admin' || userRole === 'user') {
                // Para admin y usuarios: tickets pendientes por tomar y resolver
                const openTickets = allTickets.filter(t => t.status === 'open');
                const inProgressTickets = allTickets.filter(t => t.status === 'in_progress');

                if (openTickets.length > 0) {
                    this.notifications.push({
                        id: 'tickets-open-summary',
                        type: 'warning',
                        title: 'Tickets Pendientes',
                        message: `${openTickets.length} ticket(s) abierto(s) esperando atención`,
                        link: 'tickets.html?status=open',
                        timestamp: new Date().toISOString(),
                        read: false,
                        urgent: openTickets.some(t => t.priority === 'critical' || t.priority === 'high'),
                        category: 'tickets'
                    });
                }

                if (inProgressTickets.length > 0) {
                    this.notifications.push({
                        id: 'tickets-progress-summary',
                        type: 'info',
                        title: 'Tickets en Progreso',
                        message: `${inProgressTickets.length} ticket(s) en progreso que requieren resolución`,
                        link: 'tickets.html?status=in_progress',
                        timestamp: new Date().toISOString(),
                        read: false,
                        urgent: false,
                        category: 'tickets'
                    });
                }

                // Notificaciones individuales para tickets urgentes
                const urgentTickets = allTickets.filter(t => 
                    (t.status === 'open' || t.status === 'in_progress') && 
                    (t.priority === 'critical' || t.priority === 'high')
                ).slice(0, 5);

                urgentTickets.forEach(ticket => {
                    this.notifications.push({
                        id: `ticket-${ticket.id}-urgent`,
                        type: 'danger',
                        title: `Ticket ${ticket.priority === 'critical' ? 'Crítico' : 'Alta Prioridad'}`,
                        message: `${ticket.title || ticket.folio} - ${ticket.status === 'open' ? 'Pendiente' : 'En progreso'}`,
                        link: `tickets.html#${ticket.id}`,
                        timestamp: ticket.updatedAt || ticket.createdAt || new Date().toISOString(),
                        read: false,
                        urgent: true,
                        category: 'ticket'
                    });
                });
            }

            // Cargar notificaciones leídas desde localStorage
            const readNotifications = this.getReadNotifications();
            this.notifications.forEach(notif => {
                if (readNotifications.includes(notif.id)) {
                    notif.read = true;
                }
            });

            // Ordenar: urgentes primero, luego por fecha
            this.notifications.sort((a, b) => {
                if (a.urgent && !b.urgent) return -1;
                if (!a.urgent && b.urgent) return 1;
                return new Date(b.timestamp) - new Date(a.timestamp);
            });

            this.updateUnreadCount();
            // Asegurar que el badge se actualice después de cargar
            setTimeout(() => this.updateBadge(), 100);
        } catch (e) {
            console.error('Error cargando notificaciones:', e);
        }
    },

    getReadNotifications() {
        try {
            const read = localStorage.getItem('fixify-read-notifications');
            return read ? JSON.parse(read) : [];
        } catch (e) {
            return [];
        }
    },

    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            const readNotifications = this.getReadNotifications();
            if (!readNotifications.includes(notificationId)) {
                readNotifications.push(notificationId);
                localStorage.setItem('fixify-read-notifications', JSON.stringify(readNotifications));
            }
            this.updateUnreadCount();
            this.renderPanel();
            this.updateBadge();
        }
    },

    markAsUnread(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = false;
            const readNotifications = this.getReadNotifications();
            const index = readNotifications.indexOf(notificationId);
            if (index > -1) {
                readNotifications.splice(index, 1);
                localStorage.setItem('fixify-read-notifications', JSON.stringify(readNotifications));
            }
            this.updateUnreadCount();
            this.renderPanel();
            this.updateBadge();
        }
    },

    markAsUrgent(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.urgent = !notification.urgent;
            this.renderPanel();
        }
    },

    markAllAsRead() {
        this.notifications.forEach(notif => {
            if (!notif.read) {
                notif.read = true;
            }
        });
        const allIds = this.notifications.map(n => n.id);
        localStorage.setItem('fixify-read-notifications', JSON.stringify(allIds));
        this.updateUnreadCount();
        this.renderPanel();
        this.updateBadge();
    },

    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.updateBadge();
    },

    updateBadge() {
        const badge = document.getElementById('notificationsBadge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
                badge.style.visibility = 'visible';
            } else {
                badge.style.display = 'none';
                badge.style.visibility = 'hidden';
            }
        } else {
            // Si el badge no existe, intentar renderizar el botón de nuevo
            const button = document.getElementById('notificationsToggle');
            if (button && !button.querySelector('#notificationsBadge')) {
                // El badge no existe, agregarlo
                const badgeElement = document.createElement('span');
                badgeElement.id = 'notificationsBadge';
                badgeElement.className = 'notifications-badge';
                if (this.unreadCount > 0) {
                    badgeElement.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                    badgeElement.style.display = 'flex';
                } else {
                    badgeElement.style.display = 'none';
                }
                button.appendChild(badgeElement);
            }
        }
    },

    renderButton() {
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) {
            console.warn('NotificationsCenter: No se encontró .header-right');
            return;
        }

        // Verificar si ya existe el botón
        let button = document.getElementById('notificationsToggle');
        if (button) {
            // Si ya existe, solo actualizar el badge
            this.updateBadge();
            return;
        }

        button = document.createElement('button');
        button.id = 'notificationsToggle';
        button.className = 'notifications-toggle';
        button.setAttribute('aria-label', 'Notificaciones');
        button.type = 'button';
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span id="notificationsBadge" class="notifications-badge" style="display: ${this.unreadCount > 0 ? 'flex' : 'none'};">${this.unreadCount > 99 ? '99+' : this.unreadCount}</span>
        `;

        // Insertar después del theme-toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            // Insertar después del theme-toggle
            if (themeToggle.nextSibling) {
                headerRight.insertBefore(button, themeToggle.nextSibling);
            } else {
                headerRight.appendChild(button);
            }
        } else {
            // Si no hay theme-toggle, insertar al principio
            if (headerRight.firstChild) {
                headerRight.insertBefore(button, headerRight.firstChild);
            } else {
                headerRight.appendChild(button);
            }
        }

        this.updateBadge();
        console.log('NotificationsCenter: Botón renderizado correctamente');
    },

    renderPanel() {
        let panel = document.getElementById('notificationsPanel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'notificationsPanel';
            panel.className = 'notifications-panel';
            document.body.appendChild(panel);
        }

        const urgentNotifications = this.notifications.filter(n => n.urgent && !n.read);
        const otherNotifications = this.notifications.filter(n => !n.urgent || n.read);

        panel.innerHTML = `
            <div class="notifications-header">
                <h3>Notificaciones</h3>
                ${this.unreadCount > 0 ? `
                    <button class="notifications-mark-all" onclick="NotificationsCenter.markAllAsRead()" title="Marcar todas como leídas">
                        Marcar todas como leídas
                    </button>
                ` : ''}
            </div>
            <div class="notifications-content">
                ${this.notifications.length === 0 ? `
                    <div class="notifications-empty">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <p>No hay notificaciones</p>
                    </div>
                ` : `
                    ${urgentNotifications.length > 0 ? `
                        <div class="notifications-section">
                            <div class="notifications-section-title">Urgentes</div>
                            ${urgentNotifications.map(n => this.renderNotification(n)).join('')}
                        </div>
                    ` : ''}
                    ${otherNotifications.length > 0 ? `
                        <div class="notifications-section">
                            ${urgentNotifications.length > 0 ? '<div class="notifications-section-title">Todas</div>' : ''}
                            ${otherNotifications.map(n => this.renderNotification(n)).join('')}
                        </div>
                    ` : ''}
                `}
            </div>
        `;
    },

    renderNotification(notification) {
        const timeAgo = this.getTimeAgo(notification.timestamp);
        const typeClass = notification.type || 'info';
        const readClass = notification.read ? 'read' : '';
        const urgentClass = notification.urgent ? 'urgent' : '';

        return `
            <div class="notification-item ${readClass} ${urgentClass}" data-id="${notification.id}">
                <div class="notification-icon ${typeClass}">
                    ${this.getNotificationIcon(notification.type)}
                </div>
                <div class="notification-content" onclick="NotificationsCenter.openNotification('${notification.link}', '${notification.id}')">
                    <div class="notification-title">${this.escapeHtml(notification.title)}</div>
                    <div class="notification-message">${this.escapeHtml(notification.message)}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                <div class="notification-actions">
                    ${!notification.read ? `
                        <button class="notification-action" onclick="NotificationsCenter.markAsRead('${notification.id}')" title="Marcar como leída">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                    ` : `
                        <button class="notification-action" onclick="NotificationsCenter.markAsUnread('${notification.id}')" title="Marcar como no leída">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
                            </svg>
                        </button>
                    `}
                    <button class="notification-action" onclick="NotificationsCenter.markAsUrgent('${notification.id}')" title="${notification.urgent ? 'Quitar urgente' : 'Marcar como urgente'}" style="color: ${notification.urgent ? '#ef4444' : 'var(--text-tertiary)'};">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${notification.urgent ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    },

    getNotificationIcon(type) {
        const icons = {
            success: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
            warning: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            danger: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };
        return icons[type] || icons.info;
    },

    getTimeAgo(timestamp) {
        if (!timestamp) return 'Hace un momento';
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        if (seconds < 60) return 'Hace un momento';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `Hace ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `Hace ${days}d`;
        const weeks = Math.floor(days / 7);
        return `Hace ${weeks} sem`;
    },

    openNotification(link, notificationId) {
        if (link) {
            this.markAsRead(notificationId);
            window.location.href = link;
        }
    },

    toggle() {
        console.log('NotificationsCenter: toggle llamado, estado actual:', this.isOpen);
        this.isOpen = !this.isOpen;
        let panel = document.getElementById('notificationsPanel');
        
        // Crear el panel si no existe
        if (!panel) {
            console.log('NotificationsCenter: Creando panel...');
            panel = document.createElement('div');
            panel.id = 'notificationsPanel';
            panel.className = 'notifications-panel';
            document.body.appendChild(panel);
        }
        
        if (this.isOpen) {
            console.log('NotificationsCenter: Abriendo panel...');
            panel.classList.add('active');
            this.renderPanel();
        } else {
            console.log('NotificationsCenter: Cerrando panel...');
            panel.classList.remove('active');
            // Actualizar badge cuando se cierra el panel
            this.updateBadge();
        }
    },

    bindEvents() {
        // Event listener directo en el botón
        const toggle = document.getElementById('notificationsToggle');
        if (toggle) {
            // Remover listeners anteriores si existen
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            
            newToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('NotificationsCenter: Click en botón detectado');
                this.toggle();
            });
            console.log('NotificationsCenter: Event listener agregado al botón');
        } else {
            console.warn('NotificationsCenter: No se encontró el botón para agregar event listener');
        }

        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notificationsPanel');
            const toggleBtn = document.getElementById('notificationsToggle');
            if (panel && this.isOpen && toggleBtn) {
                if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
                    this.isOpen = false;
                    panel.classList.remove('active');
                }
            }
        });

        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.isOpen = false;
                const panel = document.getElementById('notificationsPanel');
                if (panel) panel.classList.remove('active');
            }
        });
    },

    startAutoUpdate() {
        // Actualizar cada 30 segundos
        this.updateInterval = setInterval(async () => {
            await this.loadNotifications();
            if (this.isOpen) {
                this.renderPanel();
            }
        }, 30000);
    },

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    async refresh() {
        await this.loadNotifications();
        this.renderPanel();
        this.updateBadge();
    }
};

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que Auth y Store estén disponibles
    const initNotifications = () => {
        if (typeof Auth !== 'undefined' && Auth.isAuthenticated && Auth.isAuthenticated()) {
            if (typeof Store !== 'undefined') {
                setTimeout(() => {
                    try {
                        NotificationsCenter.init();
                    } catch (e) {
                        console.error('Error inicializando notificaciones:', e);
                        // Reintentar después de un segundo
                        setTimeout(() => {
                            try {
                                NotificationsCenter.init();
                            } catch (e2) {
                                console.error('Error en segundo intento:', e2);
                            }
                        }, 1000);
                    }
                }, 500);
            } else {
                // Si Store no está disponible, reintentar
                setTimeout(initNotifications, 200);
            }
        } else {
            // Si Auth no está disponible, reintentar
            setTimeout(initNotifications, 200);
        }
    };
    
    initNotifications();
});

// También intentar inicializar cuando la ventana esté completamente cargada
window.addEventListener('load', () => {
    if (typeof Auth !== 'undefined' && Auth.isAuthenticated && Auth.isAuthenticated()) {
        if (typeof NotificationsCenter !== 'undefined' && !document.getElementById('notificationsToggle')) {
            setTimeout(() => {
                try {
                    NotificationsCenter.init();
                } catch (e) {
                    console.error('Error inicializando notificaciones en load:', e);
                }
            }, 300);
        }
    }
});

// Exportar para uso global
window.NotificationsCenter = NotificationsCenter;
