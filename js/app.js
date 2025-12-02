// ========================================
// CONFIGURACION Y CREDENCIALES
// ========================================

const CONFIG = {
    validEmail: 'admin@brands.mx',
    validPassword: '3lN3g0c10d3tuV1d4',
    loadingDelay: 1500,
    notificationDuration: 4000
};

// ========================================
// ELEMENTOS DEL DOM
// ========================================

const elements = {
    html: document.documentElement,
    themeToggle: document.getElementById('themeToggle'),
    loginForm: document.getElementById('loginForm'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    emailError: document.getElementById('emailError'),
    passwordError: document.getElementById('passwordError'),
    passwordToggle: document.getElementById('passwordToggle'),
    submitBtn: document.getElementById('submitBtn'),
    googleLoginBtn: document.getElementById('googleLoginBtn'),
    notification: document.getElementById('notification'),
    notificationText: document.getElementById('notificationText'),
    loginCard: document.querySelector('.login-card')
};

// ========================================
// GESTION DEL TEMA
// ========================================

class ThemeManager {
    constructor() {
        this.storageKey = 'fixify-theme';
        this.init();
    }

    init() {
        // Cargar tema guardado o usar preferencia del sistema
        const savedTheme = localStorage.getItem(this.storageKey);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else if (prefersDark) {
            this.setTheme('dark');
        }

        // Escuchar cambios en la preferencia del sistema
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
        inputElement.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.add('visible');
    }

    static hideError(inputElement, errorElement) {
        inputElement.classList.remove('error');
        errorElement.classList.remove('visible');
    }
}

// ========================================
// NOTIFICACIONES
// ========================================

class NotificationManager {
    static show(message, type = 'success') {
        elements.notification.className = 'notification';
        elements.notificationText.textContent = message;
        elements.notification.classList.add(type, 'show');

        // Auto-hide
        setTimeout(() => {
            this.hide();
        }, CONFIG.notificationDuration);
    }

    static hide() {
        elements.notification.classList.remove('show');
    }
}

// ========================================
// AUTENTICACION
// ========================================

class AuthManager {
    static async authenticate(email, password) {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, CONFIG.loadingDelay));

        console.log('=== AUTENTICACION ===');
        console.log('Email:', email);

        // PRIMERO: Verificar credenciales hardcodeadas (admin por defecto)
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

        // SEGUNDO: Verificar contra el Store (Firestore o localStorage)
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

                        // Actualizar ultimo login
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
}

// ========================================
// CONTROLADOR DEL LOGIN
// ========================================

class LoginController {
    constructor() {
        this.themeManager = new ThemeManager();
        this.isLoading = false;
        this.isGoogleLoading = false;
        this.bindEvents();
    }

    bindEvents() {
        // Toggle de tema
        elements.themeToggle.addEventListener('click', () => {
            this.themeManager.toggle();
        });

        // Toggle de password
        elements.passwordToggle.addEventListener('click', () => {
            this.togglePasswordVisibility();
        });

        // Boton de Google
        if (elements.googleLoginBtn) {
            elements.googleLoginBtn.addEventListener('click', () => {
                this.handleGoogleLogin();
            });
        }

        // Validacion en tiempo real
        elements.emailInput.addEventListener('blur', () => {
            this.validateEmailField();
        });

        elements.passwordInput.addEventListener('blur', () => {
            this.validatePasswordField();
        });

        // Limpiar errores al escribir
        elements.emailInput.addEventListener('input', () => {
            FormValidator.hideError(elements.emailInput, elements.emailError);
        });

        elements.passwordInput.addEventListener('input', () => {
            FormValidator.hideError(elements.passwordInput, elements.passwordError);
        });

        // Submit del formulario
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

    togglePasswordVisibility() {
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
        const result = FormValidator.validateEmail(elements.emailInput.value);
        
        if (!result.valid) {
            FormValidator.showError(elements.emailInput, elements.emailError, result.message);
        }
        
        return result.valid;
    }

    validatePasswordField() {
        const result = FormValidator.validatePassword(elements.passwordInput.value);
        
        if (!result.valid) {
            FormValidator.showError(elements.passwordInput, elements.passwordError, result.message);
        }
        
        return result.valid;
    }

    async handleSubmit() {
        if (this.isLoading) return;

        // Validar campos
        const emailValid = this.validateEmailField();
        const passwordValid = this.validatePasswordField();

        if (!emailValid || !passwordValid) {
            this.shakeCard();
            return;
        }

        // Iniciar loading
        this.setLoading(true);

        try {
            const result = await AuthManager.authenticate(
                elements.emailInput.value,
                elements.passwordInput.value
            );

            if (result.success) {
                NotificationManager.show(result.message, 'success');
                
                // Guardar estado de sesion si "recordarme" esta activo
                const rememberMe = document.getElementById('remember').checked;
                const storage = rememberMe ? localStorage : sessionStorage;
                
                // Usar datos del usuario del resultado
                let userData = result.user;
                if (!userData) {
                    try {
                        userData = await Store.getUserByEmail(elements.emailInput.value);
                    } catch (e) {
                        console.warn('No se pudo obtener datos del usuario');
                    }
                }
                
                // Guardar sesion y datos del usuario
                storage.setItem('fixify-session', 'active');
                storage.setItem('fixify-user', JSON.stringify({
                    id: userData?.id || 'unknown',
                    email: userData?.email || elements.emailInput.value,
                    name: userData?.name || 'Usuario',
                    role: userData?.role || 'user',
                    loginAt: new Date().toISOString()
                }));

                // Mostrar mensaje de redireccion y redirigir al dashboard
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
        elements.submitBtn.classList.toggle('loading', loading);
        elements.submitBtn.disabled = loading;
        elements.emailInput.disabled = loading;
        elements.passwordInput.disabled = loading;
        if (elements.googleLoginBtn) {
            elements.googleLoginBtn.disabled = loading;
        }
    }

    setGoogleLoading(loading) {
        this.isGoogleLoading = loading;
        if (elements.googleLoginBtn) {
            elements.googleLoginBtn.classList.toggle('loading', loading);
            elements.googleLoginBtn.disabled = loading;
        }
        if (elements.submitBtn) {
            elements.submitBtn.disabled = loading;
        }
        if (elements.emailInput) {
            elements.emailInput.disabled = loading;
        }
        if (elements.passwordInput) {
            elements.passwordInput.disabled = loading;
        }
    }

    async handleGoogleLogin() {
        if (this.isGoogleLoading || this.isLoading) return;

        // Verificar que Auth este disponible
        if (!window.Auth) {
            NotificationManager.show('Error: Sistema de autenticacion no disponible', 'error');
            return;
        }

        this.setGoogleLoading(true);

        try {
            const result = await Auth.loginWithGoogle();

            if (result.success) {
                NotificationManager.show(result.message, 'success');
                
                this.showSuccessState();
                setTimeout(() => {
                    window.location.href = './pages/dashboard.html';
                }, 2000);
            } else {
                NotificationManager.show(result.message, 'error');
                if (result.message !== 'Inicio de sesion cancelado') {
                    this.shakeCard();
                }
            }
        } catch (error) {
            console.error('Error en Google Login:', error);
            NotificationManager.show('Error al iniciar sesion con Google', 'error');
            this.shakeCard();
        } finally {
            this.setGoogleLoading(false);
        }
    }

    shakeCard() {
        elements.loginCard.classList.add('shake');
        setTimeout(() => {
            elements.loginCard.classList.remove('shake');
        }, 500);
    }

    showSuccessState() {
        // Cambiar la UI para mostrar que el login fue exitoso
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

        // Agregar estilos de animacion
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
    // Verificar sesion existente y redirigir al dashboard
    const hasSession = localStorage.getItem('fixify-session') || sessionStorage.getItem('fixify-session');
    if (hasSession) {
        window.location.href = './pages/dashboard.html';
        return;
    }
    
    // Inicializar controlador solo si no hay sesion
    new LoginController();
});

// ========================================
// PREVENIR FLASH DE TEMA INCORRECTO
// ========================================

// Este script se ejecuta antes del DOMContentLoaded
(function() {
    const savedTheme = localStorage.getItem('fixify-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
})();

