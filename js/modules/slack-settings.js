// ========================================
// SLACK SETTINGS MODULE - Configuración de notificaciones de Slack
// ========================================

const SlackSettingsModule = {
    settings: {
        slackUserIds: [],
        customMessage: ''
    },
    userCounter: 0,

    async init() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../index.html';
            return;
        }
        
        // Solo admins pueden acceder
        const currentUser = Auth.getCurrentUser();
        if (currentUser?.role !== 'admin') {
            if (window.Modal) {
                Modal.alert({
                    title: 'Acceso denegado',
                    message: 'No tienes permisos para acceder a esta sección',
                    type: 'warning'
                }).then(() => {
                    window.location.href = 'dashboard.html';
                });
            } else {
                window.location.href = 'dashboard.html';
            }
            return;
        }

        await this.loadSettings();
        this.renderUsers();
        this.bindEvents();
    },

    async loadSettings() {
        try {
            this.settings = await Store.getSlackSettings();
            if (!this.settings.slackUserIds) {
                this.settings.slackUserIds = [];
            }
            if (!this.settings.customMessage) {
                this.settings.customMessage = '';
            }

            // Cargar valores en el formulario
            const customMessageInput = document.getElementById('customMessage');
            if (customMessageInput) {
                customMessageInput.value = this.settings.customMessage || '';
            }

            // Inicializar contador basado en la cantidad de usuarios
            this.userCounter = this.settings.slackUserIds.length > 0 
                ? this.settings.slackUserIds.length 
                : 0;
            
            console.log('Configuración de Slack cargada:', {
                usuarios: this.settings.slackUserIds.length,
                tieneMensaje: !!this.settings.customMessage
            });
        } catch (error) {
            console.error('Error al cargar configuración de Slack:', error);
            Notifications.error('Error al cargar la configuración');
        }
    },

    renderUsers() {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;

        usersList.innerHTML = '';

        // Siempre mostrar los usuarios que están guardados
        if (this.settings.slackUserIds.length > 0) {
            this.settings.slackUserIds.forEach((userId, index) => {
                this.addUserInput(userId, index);
            });
        }
        
        // Agregar siempre un campo vacío al final para agregar nuevos usuarios
        this.addUserInput();
    },

    addUserInput(userId = '', index = null) {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;

        const userIndex = index !== null ? index : this.userCounter++;
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.dataset.index = userIndex;
        
        // Escapar el userId para evitar problemas con comillas
        const safeUserId = (userId || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const isEmpty = !userId || userId.trim() === '';
        
        userItem.innerHTML = `
            <input 
                type="text" 
                class="slack-user-input" 
                placeholder="ID de usuario de Slack (ej: U06L3SJANAD)" 
                value="${safeUserId}"
                data-index="${userIndex}"
            />
            <div class="user-item-actions">
                ${!isEmpty ? `
                <button type="button" class="btn-icon danger" data-action="remove" data-index="${userIndex}" title="Eliminar usuario">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                ` : ''}
            </div>
        `;

        usersList.appendChild(userItem);

        // Agregar event listener al input para mostrar/ocultar botón eliminar y check
        const input = userItem.querySelector('.slack-user-input');
        if (input) {
            // Si ya tiene un valor, mostrar confirmación
            if (!isEmpty) {
                this.showUserConfirmation(userItem, userIndex);
            }

            let wasEmpty = isEmpty;
            let hasBeenConfirmed = !isEmpty;

            input.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                const isEmptyNow = !value;
                
                // Si estaba vacío y ahora tiene valor, mostrar el botón de eliminar
                if (wasEmpty && !isEmptyNow) {
                    hasBeenConfirmed = false;
                    userItem.classList.remove('added');
                    const checkIcon = userItem.querySelector('[data-action="check"]');
                    if (checkIcon) checkIcon.remove();
                }
                
                this.updateUserActions(userItem, userIndex, value);
                wasEmpty = isEmptyNow;
            });

            // Al salir del campo (blur), confirmar si tiene valor y guardar automáticamente
            input.addEventListener('blur', async (e) => {
                const value = e.target.value.trim();
                if (value && !hasBeenConfirmed) {
                    this.confirmUserAdded(userItem, userIndex, true);
                    hasBeenConfirmed = true;
                    // Guardar usuarios automáticamente
                    await this.saveUsers();
                } else if (!value) {
                    userItem.classList.remove('added');
                    hasBeenConfirmed = false;
                    // Guardar usuarios (para eliminar el vacío)
                    await this.saveUsers();
                }
            });

            // Al presionar Enter, confirmar y agregar nuevo campo si es necesario
            input.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = e.target.value.trim();
                    if (value) {
                        // Confirmar este usuario
                        const allInputs = document.querySelectorAll('.slack-user-input');
                        const wasLast = allInputs[allInputs.length - 1] === input;
                        const wasNew = !userItem.classList.contains('added');
                        
                        if (wasNew) {
                            this.confirmUserAdded(userItem, userIndex, true);
                            hasBeenConfirmed = true;
                            // Guardar usuarios automáticamente
                            await this.saveUsers();
                        }
                        
                        // Si es el último campo y tiene valor, agregar uno nuevo
                        if (wasLast) {
                            setTimeout(() => {
                                this.addUserInput();
                                const newInputs = document.querySelectorAll('.slack-user-input');
                                if (newInputs.length > 0) {
                                    newInputs[newInputs.length - 1].focus();
                                }
                            }, 150);
                        } else {
                            // Mover al siguiente campo
                            const currentIndex = Array.from(allInputs).indexOf(input);
                            if (currentIndex < allInputs.length - 1) {
                                allInputs[currentIndex + 1].focus();
                            }
                        }
                    }
                }
            });
        }

        // Agregar event listener al botón de eliminar si existe
        const removeBtn = userItem.querySelector('[data-action="remove"]');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.removeUser(userIndex);
            });
        }
    },

    updateUserActions(userItem, userIndex, value) {
        const actions = userItem.querySelector('.user-item-actions');
        let removeBtn = actions.querySelector('[data-action="remove"]');
        let checkIcon = actions.querySelector('[data-action="check"]');
        
        if (value) {
            // Si tiene valor y no tiene botón eliminar, agregarlo
            if (!removeBtn) {
                const removeBtnHtml = `
                    <button type="button" class="btn-icon danger" data-action="remove" data-index="${userIndex}" title="Eliminar usuario">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                `;
                
                if (checkIcon) {
                    checkIcon.insertAdjacentHTML('afterend', removeBtnHtml);
                } else {
                    actions.innerHTML = removeBtnHtml;
                }
                
                removeBtn = actions.querySelector('[data-action="remove"]');
                if (removeBtn) {
                    removeBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.removeUser(userIndex);
                    });
                }
            }
        } else {
            // Si está vacío, quitar botones y clase
            if (removeBtn) removeBtn.remove();
            if (checkIcon) checkIcon.remove();
            userItem.classList.remove('added');
        }
    },

    showUserConfirmation(userItem, userIndex) {
        userItem.classList.add('added');
        const actions = userItem.querySelector('.user-item-actions');
        if (actions && !actions.querySelector('[data-action="check"]')) {
            const checkIcon = document.createElement('div');
            checkIcon.className = 'check-icon';
            checkIcon.setAttribute('data-action', 'check');
            checkIcon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
            checkIcon.style.cssText = 'display: flex; align-items: center; color: #22c55e; margin-right: 0.25rem;';
            actions.insertBefore(checkIcon, actions.firstChild);
        }
    },

    confirmUserAdded(userItem, userIndex, showMessage = true) {
        const input = userItem.querySelector('.slack-user-input');
        const value = input ? input.value.trim() : '';
        
        if (value) {
            this.showUserConfirmation(userItem, userIndex);
            if (showMessage) {
                this.showSuccessMessage(`✓ Usuario agregado: ${value}`);
            }
        }
    },

    showSuccessMessage(message) {
        // Eliminar mensaje anterior si existe
        const existingMessage = document.querySelector('.user-confirmation');
        if (existingMessage) {
            existingMessage.style.opacity = '0';
            existingMessage.style.transform = 'translateY(100%)';
            setTimeout(() => existingMessage.remove(), 300);
        }

        // Crear nuevo mensaje
        const confirmation = document.createElement('div');
        confirmation.className = 'user-confirmation';
        confirmation.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>${message}</span>
        `;

        document.body.appendChild(confirmation);

        // Remover después de 2.5 segundos
        setTimeout(() => {
            confirmation.style.transition = 'all 0.3s ease';
            confirmation.style.opacity = '0';
            confirmation.style.transform = 'translateY(100%)';
            setTimeout(() => {
                confirmation.remove();
            }, 300);
        }, 2500);
    },

    removeUser(index) {
        const userItem = document.querySelector(`.user-item[data-index="${index}"]`);
        if (!userItem) return;
        
        const input = userItem.querySelector('.slack-user-input');
        const userValue = input ? input.value.trim() : '';
        
        // Si el campo está vacío, simplemente limpiarlo en lugar de eliminarlo
        if (!userValue) {
            if (input) {
                input.value = '';
                input.focus();
            }
            return;
        }
        
        // Agregar animación de salida
        userItem.style.transition = 'all 0.3s ease';
        userItem.style.opacity = '0';
        userItem.style.transform = 'translateX(-20px)';
        
        setTimeout(async () => {
            userItem.remove();
            this.updateUserNumbers();
            this.collectUsers();
            
            // Guardar usuarios automáticamente después de eliminar
            await this.saveUsers();
            
            // Asegurar que siempre haya al menos un campo vacío
            const remainingItems = document.querySelectorAll('.user-item');
            if (remainingItems.length === 0 || 
                Array.from(remainingItems).every(item => {
                    const inp = item.querySelector('.slack-user-input');
                    return inp && inp.value.trim() !== '';
                })) {
                this.addUserInput();
            }
        }, 300);
    },

    updateUserNumbers() {
        const userItems = document.querySelectorAll('.user-item');
        userItems.forEach((item, index) => {
            // Actualizar el índice del dataset
            const input = item.querySelector('.slack-user-input');
            if (input) {
                item.dataset.index = index;
                input.dataset.index = index;
            }
            // Actualizar el botón de eliminar
            const removeBtn = item.querySelector('[data-action="remove"]');
            if (removeBtn) {
                removeBtn.dataset.index = index;
            }
        });
    },

    collectUsers() {
        const inputs = document.querySelectorAll('.slack-user-input');
        this.settings.slackUserIds = [];
        
        inputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                this.settings.slackUserIds.push(value);
            }
        });
    },

    async saveUsers() {
        try {
            this.collectUsers();
            // Filtrar IDs vacíos o inválidos
            const validUserIds = this.settings.slackUserIds
                .filter(id => id && typeof id === 'string' && id.trim() !== '')
                .map(id => id.trim());
            
            // Guardar solo los usuarios (mantener el mensaje actual)
            const currentSettings = await Store.getSlackSettings();
            this.settings.slackUserIds = validUserIds; // Array puede estar vacío
            this.settings.customMessage = currentSettings.customMessage || '';
            
            console.log('Guardando configuración de Slack:', {
                userIdsCount: validUserIds.length,
                userIds: validUserIds,
                isEmpty: validUserIds.length === 0
            });
            
            await Store.saveSlackSettings(this.settings);
            
            console.log('Usuarios guardados automáticamente en Firestore:', {
                userIdsCount: validUserIds.length,
                userIds: validUserIds,
                isEmpty: validUserIds.length === 0
            });
            
            // Mostrar notificación si se eliminaron todos
            if (validUserIds.length === 0) {
                this.showSuccessMessage('✓ Todos los usuarios de Slack eliminados. No se enviarán notificaciones.');
            }
        } catch (error) {
            console.error('Error al guardar usuarios:', error);
            Notifications.error('Error al guardar la configuración de Slack');
        }
    },

    async saveMessage() {
        try {
            const customMessageInput = document.getElementById('customMessage');
            if (!customMessageInput) return;
            
            const message = customMessageInput.value.trim();
            
            // Obtener configuración actual y actualizar solo el mensaje
            const currentSettings = await Store.getSlackSettings();
            this.settings.slackUserIds = currentSettings.slackUserIds || [];
            this.settings.customMessage = message;
            
            await Store.saveSlackSettings(this.settings);
            Notifications.success('Mensaje personalizado guardado exitosamente');
        } catch (error) {
            console.error('Error al guardar mensaje:', error);
            Notifications.error('Error al guardar el mensaje');
        }
    },

    bindEvents() {
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', async () => {
                // Confirmar y guardar todos los usuarios que tengan valor antes de agregar uno nuevo
                const inputs = document.querySelectorAll('.slack-user-input');
                let needsSave = false;
                
                inputs.forEach((input, idx) => {
                    const value = input.value.trim();
                    if (value) {
                        const userItem = input.closest('.user-item');
                        if (userItem && !userItem.classList.contains('added')) {
                            const index = parseInt(userItem.dataset.index);
                            this.confirmUserAdded(userItem, index, false);
                            needsSave = true;
                        }
                    }
                });
                
                // Guardar usuarios si se confirmaron nuevos
                if (needsSave) {
                    await this.saveUsers();
                }
                
                // Verificar si ya hay un campo vacío
                const hasEmptyField = Array.from(inputs).some(input => !input.value.trim());
                
                if (!hasEmptyField) {
                    this.addUserInput();
                    // Hacer scroll al final de la lista
                    setTimeout(() => {
                        const usersList = document.getElementById('usersList');
                        if (usersList) {
                            usersList.scrollTop = usersList.scrollHeight;
                        }
                        // Enfocar el nuevo input
                        const newInputs = document.querySelectorAll('.slack-user-input');
                        if (newInputs.length > 0) {
                            newInputs[newInputs.length - 1].focus();
                        }
                    }, 100);
                } else {
                    // Si ya hay un campo vacío, enfocarlo
                    const emptyInput = Array.from(inputs).find(input => !input.value.trim());
                    if (emptyInput) {
                        emptyInput.focus();
                    }
                }
            });
        }

        const saveMessageBtn = document.getElementById('saveMessageBtn');
        if (saveMessageBtn) {
            saveMessageBtn.addEventListener('click', () => {
                this.saveMessage();
            });
        }

        // Delegación de eventos para los botones de eliminar (por si se agregan dinámicamente)
        const usersList = document.getElementById('usersList');
        if (usersList) {
            usersList.addEventListener('click', (e) => {
                if (e.target.closest('[data-action="remove"]')) {
                    const btn = e.target.closest('[data-action="remove"]');
                    const index = parseInt(btn.dataset.index);
                    this.removeUser(index);
                }
            });
        }
    }
};

// Exportar globalmente
window.SlackSettingsModule = SlackSettingsModule;

