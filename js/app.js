// ========================================
// CONFIGURACION Y CREDENCIALES
// ========================================

const CONFIG = {
    validEmail: 'admin@brands.mx',
    validPassword: '3lN3g0c10d3tuV1d4',
    loadingDelay: 800,
    notificationDuration: 4000
};

// ========================================
// ELEMENTOS DEL DOM (se inicializan despues)
// ========================================

let elements = {};

function initElements() {
    elements = {
        html: document.documentElement,
        themeToggle: document.getElementById('themeToggle'),
        loginForm: document.getElementById('loginForm'),
        emailInput: document.getElementById('email'),
        passwordInput: document.getElementById('password'),
        emailError: document.getElementById('emailError'),
        passwordError: document.getElementById('passwordError'),
        passwordToggle: document.getElementById('passwordToggle'),
        submitBtn: document.getElementById('submitBtn'),
        notification: document.getElementById('notification'),
        notificationText: document.getElementById('notificationText'),
        loginCard: document.querySelector('.login-card'),
        forgotLink: document.querySelector('.forgot-link'),
        // Modal de recuperacion
        resetModal: document.getElementById('resetPasswordModal'),
        resetForm: document.getElementById('resetPasswordForm'),
        resetEmailInput: document.getElementById('resetEmail'),
        resetEmailError: document.getElementById('resetEmailError'),
        resetSubmitBtn: document.getElementById('resetSubmitBtn'),
        closeModalBtn: document.getElementById('closeResetModal'),
        backToLoginBtn: document.getElementById('backToLogin')
    };
}

// ========================================
// GESTION DEL TEMA
// ========================================

class ThemeManager {
    constructor() {
        this.storageKey = 'fixify-theme';
        this.init();
    }

    init() {
        const savedTheme = localStorage.getItem(this.storageKey);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else if (prefersDark) {
            this.setTheme('dark');
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(this.storageKey)) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    setTheme(theme) {
        elements.html.setAttribute('data-theme', theme);
        localStorage.setItem(this.storageKey, theme);
    }

    toggle() {
        const currentTheme = elements.html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
}

// ========================================
// VALIDACION DE FORMULARIO
// ========================================

class FormValidator {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            return { valid: false, message: 'El correo es requerido' };
        }
        
        if (!emailRegex.test(email)) {
            return { valid: false, message: 'Ingresa un correo valido' };
        }
        
        return { valid: true, message: '' };
    }

    static validatePassword(password) {
        if (!password) {
            return { valid: false, message: 'La contrasena es requerida' };
        }
        
        if (password.length < 6) {
            return { valid: false, message: 'La contrasena debe tener al menos 6 caracteres' };
        }
        
        return { valid: true, message: '' };
    }

    static showError(inputElement, errorElement, message) {
        if (inputElement && errorElement) {
            inputElement.classList.add('error');
            errorElement.textContent = message;
            errorElement.classList.add('visible');
        }
    }

    static hideError(inputElement, errorElement) {
        if (inputElement && errorElement) {
            inputElement.classList.remove('error');
            errorElement.classList.remove('visible');
        }
    }
}

// ========================================
// NOTIFICACIONES
// ========================================

class NotificationManager {
    static show(message, type = 'success') {
        if (!elements.notification || !elements.notificationText) return;
        
        elements.notification.className = 'notification';
        elements.notificationText.textContent = message;
        elements.notification.classList.add(type, 'show');

        setTimeout(() => {
            this.hide();
        }, CONFIG.notificationDuration);
    }

    static hide() {
        if (elements.notification) {
            elements.notification.classList.remove('show');
        }
    }
}

// ========================================
// AUTENTICACION CON FIREBASE AUTH
// ========================================

class AuthManager {
    static async authenticate(email, password) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.loadingDelay));

        console.log('=== AUTENTICACION ===');
        console.log('Email:', email);

        // Usar el modulo Auth si esta disponible
        if (window.Auth && window.Auth.useFirebase) {
            console.log('Usando Firebase Auth...');
            const result = await Auth.login(email, password, document.getElementById('remember')?.checked);
            return result;
        }

        // Fallback: Verificar credenciales hardcodeadas (admin por defecto)
        if (email === CONFIG.validEmail && password === CONFIG.validPassword) {
            console.log('Login con credenciales por defecto');
            return { 
                success: true, 
                message: 'Inicio de sesion exitoso!',
                user: {
                    id: 'admin-default',
                    email: CONFIG.validEmail,
                    name: 'Administrador',
                    role: 'admin'
                }
            };
        }

        // Verificar contra el Store (Firestore o localStorage)
        if (window.Store) {
            try {
                console.log('Buscando usuario en Store...');
                const user = await Store.getUserByEmail(email);
                
                console.log('Usuario encontrado:', user ? 'Si' : 'No');
                
                if (user) {
                    console.log('Verificando contrasena...');
                    if (user.password === password) {
                        if (user.status === 'inactive') {
                            return { success: false, message: 'Usuario inactivo. Contacta al administrador.' };
                        }

                        try {
                            await Store.updateUserLastLogin(user.email);
                        } catch (e) {}

                        console.log('Login exitoso con Store!');
                        return { 
                            success: true, 
                            message: 'Inicio de sesion exitoso!',
                            user: {
                                id: user.id,
                                email: user.email,
                                name: user.name || 'Usuario',
                                role: user.role || 'user'
                            }
                        };
                    } else {
                        console.log('Contrasena incorrecta');
                    }
                }
            } catch (error) {
                console.error('Error en autenticacion con Store:', error);
            }
        }

        return { success: false, message: 'Credenciales incorrectas' };
    }

    /**
     * Envia correo de recuperacion de contrasena
     */
    static async sendPasswordReset(email) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.loadingDelay));

        if (window.Auth && window.Auth.useFirebase) {
            return await Auth.resetPassword(email);
        }

        return { 
            success: false, 
            message: 'La recuperacion de contrasena no esta disponible en modo offline' 
        };
    }
}

// ========================================
// CONTROLADOR DEL MODAL DE RECUPERACION
// ========================================

class ResetPasswordController {
    constructor() {
        this.isLoading = false;
        this.bindEvents();
    }

    bindEvents() {
        // Abrir modal
        if (elements.forgotLink) {
            console.log('Enlace de recuperacion encontrado, agregando evento...');
            elements.forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Clic en olvidaste tu contrasena');
                this.openModal();
            });
        } else {
            console.error('No se encontro el enlace de recuperacion de contrasena');
        }

        // Cerrar modal
        if (elements.closeModalBtn) {
            elements.closeModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }

        if (elements.backToLoginBtn) {
            elements.backToLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }

        // Cerrar al hacer clic fuera del modal
        if (elements.resetModal) {
            elements.resetModal.addEventListener('click', (e) => {
                if (e.target === elements.resetModal) {
                    this.closeModal();
                }
            });
        }

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.resetModal?.classList.contains('show')) {
                this.closeModal();
            }
        });

        // Validacion en tiempo real
        if (elements.resetEmailInput) {
            elements.resetEmailInput.addEventListener('input', () => {
                FormValidator.hideError(elements.resetEmailInput, elements.resetEmailError);
            });
        }

        // Submit del formulario
        if (elements.resetForm) {
            elements.resetForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }
    }

    openModal() {
        console.log('Abriendo modal de recuperacion...');
        if (elements.resetModal) {
            // Mostrar el modal
            elements.resetModal.style.display = 'flex';
            // Forzar reflow para que la transicion funcione
            elements.resetModal.offsetHeight;
            // Agregar clase para animacion
            elements.resetModal.classList.add('show');
            // Focus en el input
            setTimeout(() => {
                if (elements.resetEmailInput) {
                    elements.resetEmailInput.focus();
                }
            }, 100);
            // Pre-llenar con el email del login si existe
            if (elements.emailInput?.value && elements.resetEmailInput) {
                elements.resetEmailInput.value = elements.emailInput.value;
            }
            // Prevenir scroll del body
            document.body.style.overflow = 'hidden';
            console.log('Modal abierto');
        } else {
            console.error('No se encontro el modal de recuperacion');
        }
    }

    closeModal() {
        if (elements.resetModal) {
            elements.resetModal.classList.remove('show');
            // Esperar a que termine la animacion antes de ocultar
            setTimeout(() => {
                if (elements.resetModal) {
                    elements.resetModal.style.display = 'none';
                }
            }, 300);
            // Limpiar formulario
            if (elements.resetForm) {
                elements.resetForm.reset();
            }
            if (elements.resetEmailInput && elements.resetEmailError) {
                FormValidator.hideError(elements.resetEmailInput, elements.resetEmailError);
            }
            // Restaurar estado del boton si estaba en success
            this.resetButtonState();
            // Restaurar scroll del body
            document.body.style.overflow = '';
        }
    }

    validateEmailField() {
        const result = FormValidator.validateEmail(elements.resetEmailInput?.value);
        
        if (!result.valid) {
            FormValidator.showError(elements.resetEmailInput, elements.resetEmailError, result.message);
        }
        
        return result.valid;
    }

    async handleSubmit() {
        if (this.isLoading) return;

        if (!this.validateEmailField()) {
            return;
        }

        this.setLoading(true);

        try {
            const result = await AuthManager.sendPasswordReset(elements.resetEmailInput.value);

            if (result.success) {
                this.showSuccessState();
                NotificationManager.show(result.message, 'success');
            } else {
                NotificationManager.show(result.message, 'error');
            }
        } catch (error) {
            NotificationManager.show('Error al enviar el correo. Intenta de nuevo.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        if (elements.resetSubmitBtn) {
            elements.resetSubmitBtn.classList.toggle('loading', loading);
            elements.resetSubmitBtn.disabled = loading;
        }
        if (elements.resetEmailInput) {
            elements.resetEmailInput.disabled = loading;
        }
    }

    showSuccessState() {
        if (elements.resetSubmitBtn) {
            elements.resetSubmitBtn.classList.add('success');
            elements.resetSubmitBtn.innerHTML = `
                <span class="btn-text">Correo enviado</span>
                <svg class="btn-check" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
        }
        // Cerrar modal despues de 3 segundos
        setTimeout(() => {
            this.closeModal();
        }, 3000);
    }

    resetButtonState() {
        if (elements.resetSubmitBtn) {
            elements.resetSubmitBtn.classList.remove('success', 'loading');
            elements.resetSubmitBtn.disabled = false;
            elements.resetSubmitBtn.innerHTML = `
                <span class="btn-text">Enviar enlace de recuperacion</span>
                <span class="btn-loader">
                    <svg class="spinner" viewBox="0 0 50 50">
                        <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
                    </svg>
                </span>
            `;
        }
    }
}

// ========================================
// CONTROLADOR DEL LOGIN
// ========================================

class LoginController {
    constructor() {
        this.themeManager = new ThemeManager();
        this.resetPasswordController = new ResetPasswordController();
        this.isLoading = false;
        this.bindEvents();
    }

    bindEvents() {
        // Toggle de tema
        if (elements.themeToggle) {
            elements.themeToggle.addEventListener('click', () => {
                this.themeManager.toggle();
            });
        }

        // Toggle de password
        if (elements.passwordToggle) {
            elements.passwordToggle.addEventListener('click', () => {
                this.togglePasswordVisibility();
            });
        }

        // Validacion en tiempo real
        if (elements.emailInput) {
            elements.emailInput.addEventListener('blur', () => {
                this.validateEmailField();
            });
            elements.emailInput.addEventListener('input', () => {
                FormValidator.hideError(elements.emailInput, elements.emailError);
            });
        }

        if (elements.passwordInput) {
            elements.passwordInput.addEventListener('blur', () => {
                this.validatePasswordField();
            });
            elements.passwordInput.addEventListener('input', () => {
                FormValidator.hideError(elements.passwordInput, elements.passwordError);
            });
        }

        // Submit del formulario
        if (elements.loginForm) {
            elements.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });

            // Permitir submit con Enter
            elements.loginForm.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !this.isLoading) {
                    e.preventDefault();
                    this.handleSubmit();
                }
            });
        }
    }

    togglePasswordVisibility() {
        if (!elements.passwordInput || !elements.passwordToggle) return;
        
        const type = elements.passwordInput.getAttribute('type');
        
        if (type === 'password') {
            elements.passwordInput.setAttribute('type', 'text');
            elements.passwordToggle.classList.add('active');
        } else {
            elements.passwordInput.setAttribute('type', 'password');
            elements.passwordToggle.classList.remove('active');
        }
    }

    validateEmailField() {
        if (!elements.emailInput) return false;
        
        const result = FormValidator.validateEmail(elements.emailInput.value);
        
        if (!result.valid) {
            FormValidator.showError(elements.emailInput, elements.emailError, result.message);
        }
        
        return result.valid;
    }

    validatePasswordField() {
        if (!elements.passwordInput) return false;
        
        const result = FormValidator.validatePassword(elements.passwordInput.value);
        
        if (!result.valid) {
            FormValidator.showError(elements.passwordInput, elements.passwordError, result.message);
        }
        
        return result.valid;
    }

    async handleSubmit() {
        if (this.isLoading) return;

        const emailValid = this.validateEmailField();
        const passwordValid = this.validatePasswordField();

        if (!emailValid || !passwordValid) {
            this.shakeCard();
            return;
        }

        this.setLoading(true);

        try {
            const result = await AuthManager.authenticate(
                elements.emailInput.value,
                elements.passwordInput.value
            );

            if (result.success) {
                NotificationManager.show(result.message, 'success');
                
                const rememberMe = document.getElementById('remember')?.checked || false;
                const storage = rememberMe ? localStorage : sessionStorage;
                
                let userData = result.user;
                if (!userData) {
                    try {
                        userData = await Store.getUserByEmail(elements.emailInput.value);
                    } catch (e) {
                        console.warn('No se pudo obtener datos del usuario');
                    }
                }
                
                storage.setItem('fixify-session', 'active');
                storage.setItem('fixify-user', JSON.stringify({
                    id: userData?.id || 'unknown',
                    email: userData?.email || elements.emailInput.value,
                    name: userData?.name || 'Usuario',
                    role: userData?.role || 'user',
                    loginAt: new Date().toISOString()
                }));

                this.showSuccessState();
                setTimeout(() => {
                    window.location.href = './pages/dashboard.html';
                }, 2000);
            } else {
                NotificationManager.show(result.message, 'error');
                this.shakeCard();
            }
        } catch (error) {
            NotificationManager.show('Error de conexion. Intenta de nuevo.', 'error');
            this.shakeCard();
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        if (elements.submitBtn) {
            elements.submitBtn.classList.toggle('loading', loading);
            elements.submitBtn.disabled = loading;
        }
        if (elements.emailInput) {
            elements.emailInput.disabled = loading;
        }
        if (elements.passwordInput) {
            elements.passwordInput.disabled = loading;
        }
    }

    shakeCard() {
        if (elements.loginCard) {
            elements.loginCard.classList.add('shake');
            setTimeout(() => {
                elements.loginCard.classList.remove('shake');
            }, 500);
        }
    }

    showSuccessState() {
        if (!elements.loginCard) return;
        
        elements.loginCard.innerHTML = `
            <div class="success-state" style="text-align: center; padding: 2rem 0;">
                <div style="
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                    animation: scaleIn 0.5s ease forwards;
                ">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <h2 style="
                    font-family: 'Playfair Display', serif;
                    font-size: 1.75rem;
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                ">Bienvenido!</h2>
                <p style="
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                ">Redirigiendo al Dashboard...</p>
                <div style="
                    margin-top: 1.5rem;
                ">
                    <div class="spinner" style="
                        width: 24px;
                        height: 24px;
                        border: 3px solid var(--border-color);
                        border-top-color: var(--accent-primary);
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                        margin: 0 auto;
                    "></div>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes scaleIn {
                from {
                    transform: scale(0);
                    opacity: 0;
                }
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// ========================================
// INICIALIZACION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, inicializando app...');
    
    // Inicializar elementos del DOM
    initElements();
    
    // Debug: verificar elementos
    console.log('Elementos inicializados:', {
        forgotLink: elements.forgotLink ? 'OK' : 'NO ENCONTRADO',
        resetModal: elements.resetModal ? 'OK' : 'NO ENCONTRADO',
        loginForm: elements.loginForm ? 'OK' : 'NO ENCONTRADO'
    });
    
    // Verificar sesion existente y redirigir al dashboard
    const hasSession = localStorage.getItem('fixify-session') || sessionStorage.getItem('fixify-session');
    if (hasSession) {
        window.location.href = './pages/dashboard.html';
        return;
    }
    
    // Inicializar controlador solo si no hay sesion
    new LoginController();
    
    console.log('App inicializada correctamente');
});

// ========================================
// PREVENIR FLASH DE TEMA INCORRECTO
// ========================================

(function() {
    const savedTheme = localStorage.getItem('fixify-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
})();
