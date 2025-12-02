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
    forgotPasswordLink: document.getElementById('forgotPasswordLink'),
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

        // Olvidé mi contraseña
        if (elements.forgotPasswordLink) {
            elements.forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPasswordModal();
            });
        }
    }

    // ========================================
    // RECUPERACION DE CONTRASENA
    // ========================================

    showForgotPasswordModal() {
        // Obtener el email si ya está escrito
        const currentEmail = elements.emailInput?.value || '';

        const modalHtml = `
            <div class="forgot-modal-overlay" id="forgotPasswordModal">
                <div class="forgot-modal">
                    <button class="forgot-modal-close" id="closeForgotModal">&times;</button>
                    
                    <div class="forgot-modal-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    
                    <h2 class="forgot-modal-title">Recuperar Contraseña</h2>
                    <p class="forgot-modal-subtitle">Ingresa tu correo electronico y te enviaremos un enlace para restablecer tu contraseña.</p>
                    
                    <form id="forgotPasswordForm" class="forgot-form">
                        <div class="forgot-form-group">
                            <label for="forgotEmail">Correo electronico</label>
                            <input 
                                type="email" 
                                id="forgotEmail" 
                                class="forgot-input"
                                placeholder="tucorreo@ejemplo.com"
                                value="${this.escapeHtml(currentEmail)}"
                                required
                            >
                            <span class="forgot-error" id="forgotEmailError"></span>
                        </div>
                        
                        <button type="submit" class="forgot-submit-btn" id="forgotSubmitBtn">
                            <span class="forgot-btn-text">Enviar Enlace</span>
                            <span class="forgot-btn-loader">
                                <svg class="spinner" viewBox="0 0 50 50">
                                    <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
                                </svg>
                            </span>
                        </button>
                    </form>
                    
                    <a href="#" class="forgot-back-link" id="backToLoginLink">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Volver al inicio de sesion
                    </a>
                </div>
            </div>
        `;

        // Agregar estilos del modal si no existen
        if (!document.getElementById('forgotModalStyles')) {
            const styles = document.createElement('style');
            styles.id = 'forgotModalStyles';
            styles.textContent = `
                .forgot-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    opacity: 0;
                    animation: fadeIn 0.3s ease forwards;
                }
                
                @keyframes fadeIn {
                    to { opacity: 1; }
                }
                
                .forgot-modal {
                    background: var(--card-bg, #fff);
                    border-radius: 20px;
                    padding: 2.5rem;
                    max-width: 420px;
                    width: 90%;
                    position: relative;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    transform: scale(0.9) translateY(20px);
                    animation: slideUp 0.3s ease forwards;
                }
                
                @keyframes slideUp {
                    to { transform: scale(1) translateY(0); }
                }
                
                .forgot-modal-close {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    width: 36px;
                    height: 36px;
                    border: none;
                    background: var(--bg-tertiary, #f3f4f6);
                    border-radius: 50%;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--text-secondary, #6b7280);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                
                .forgot-modal-close:hover {
                    background: var(--accent-primary, #3b82f6);
                    color: white;
                }
                
                .forgot-modal-icon {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--accent-primary, #3b82f6), var(--accent-secondary, #8b5cf6));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                    color: white;
                }
                
                .forgot-modal-title {
                    text-align: center;
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--text-primary, #111827);
                    margin-bottom: 0.5rem;
                }
                
                .forgot-modal-subtitle {
                    text-align: center;
                    color: var(--text-secondary, #6b7280);
                    font-size: 0.9rem;
                    margin-bottom: 1.5rem;
                    line-height: 1.5;
                }
                
                .forgot-form-group {
                    margin-bottom: 1.5rem;
                }
                
                .forgot-form-group label {
                    display: block;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--text-primary, #111827);
                    margin-bottom: 0.5rem;
                }
                
                .forgot-input {
                    width: 100%;
                    padding: 0.875rem 1rem;
                    border: 2px solid var(--border-color, #e5e7eb);
                    border-radius: 12px;
                    font-size: 1rem;
                    color: var(--text-primary, #111827);
                    background: var(--input-bg, #fff);
                    transition: all 0.2s ease;
                    outline: none;
                }
                
                .forgot-input:focus {
                    border-color: var(--accent-primary, #3b82f6);
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                }
                
                .forgot-input.error {
                    border-color: #ef4444;
                }
                
                .forgot-error {
                    display: block;
                    color: #ef4444;
                    font-size: 0.8rem;
                    margin-top: 0.5rem;
                    min-height: 1.2em;
                }
                
                .forgot-submit-btn {
                    width: 100%;
                    padding: 1rem;
                    border: none;
                    border-radius: 12px;
                    background: linear-gradient(135deg, var(--accent-primary, #3b82f6), var(--accent-secondary, #8b5cf6));
                    color: white;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                
                .forgot-submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
                }
                
                .forgot-submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                
                .forgot-submit-btn.loading .forgot-btn-text {
                    opacity: 0;
                }
                
                .forgot-submit-btn.loading .forgot-btn-loader {
                    opacity: 1;
                }
                
                .forgot-btn-loader {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }
                
                .forgot-btn-loader .spinner {
                    width: 24px;
                    height: 24px;
                    animation: rotate 1s linear infinite;
                }
                
                .forgot-btn-loader .path {
                    stroke: white;
                    stroke-linecap: round;
                    animation: dash 1.5s ease-in-out infinite;
                }
                
                .forgot-back-link {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-top: 1.5rem;
                    color: var(--text-secondary, #6b7280);
                    text-decoration: none;
                    font-size: 0.9rem;
                    transition: color 0.2s ease;
                }
                
                .forgot-back-link:hover {
                    color: var(--accent-primary, #3b82f6);
                }
                
                /* Estado de éxito */
                .forgot-success {
                    text-align: center;
                    padding: 1rem 0;
                }
                
                .forgot-success-icon {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #22c55e, #16a34a);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                    color: white;
                    animation: scaleIn 0.3s ease;
                }
                
                @keyframes scaleIn {
                    from { transform: scale(0); }
                    to { transform: scale(1); }
                }
                
                .forgot-success-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-primary, #111827);
                    margin-bottom: 0.5rem;
                }
                
                .forgot-success-text {
                    color: var(--text-secondary, #6b7280);
                    font-size: 0.9rem;
                    line-height: 1.5;
                }
                
                .forgot-success-email {
                    font-weight: 600;
                    color: var(--accent-primary, #3b82f6);
                }
            `;
            document.head.appendChild(styles);
        }

        // Insertar modal en el DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Event listeners del modal
        const modal = document.getElementById('forgotPasswordModal');
        const closeBtn = document.getElementById('closeForgotModal');
        const backLink = document.getElementById('backToLoginLink');
        const form = document.getElementById('forgotPasswordForm');

        const closeModal = () => {
            modal.style.animation = 'fadeIn 0.2s ease reverse forwards';
            setTimeout(() => modal.remove(), 200);
        };

        closeBtn.addEventListener('click', closeModal);
        backLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal();
        });

        // Cerrar al hacer click fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Cerrar con ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // Manejar envio del formulario
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleForgotPassword(modal);
        });

        // Focus en el input
        setTimeout(() => {
            document.getElementById('forgotEmail')?.focus();
        }, 100);
    }

    async handleForgotPassword(modal) {
        const emailInput = document.getElementById('forgotEmail');
        const errorSpan = document.getElementById('forgotEmailError');
        const submitBtn = document.getElementById('forgotSubmitBtn');
        const email = emailInput.value.trim();

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            emailInput.classList.add('error');
            errorSpan.textContent = 'El correo es requerido';
            return;
        }
        if (!emailRegex.test(email)) {
            emailInput.classList.add('error');
            errorSpan.textContent = 'Ingresa un correo valido';
            return;
        }

        // Limpiar error
        emailInput.classList.remove('error');
        errorSpan.textContent = '';

        // Mostrar loading
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            let result;

            // Usar Auth.resetPassword si está disponible
            if (window.Auth && typeof Auth.resetPassword === 'function') {
                result = await Auth.resetPassword(email);
            } else if (window.getFirebaseAuth) {
                // Usar Firebase Auth directamente
                const auth = getFirebaseAuth();
                if (auth) {
                    auth.languageCode = 'es';
                    await auth.sendPasswordResetEmail(email);
                    result = { success: true, message: 'Correo enviado' };
                } else {
                    result = { success: false, message: 'Firebase no esta disponible' };
                }
            } else {
                result = { success: false, message: 'Sistema de autenticacion no disponible' };
            }

            if (result.success) {
                // Mostrar estado de éxito
                const modalContent = modal.querySelector('.forgot-modal');
                modalContent.innerHTML = `
                    <button class="forgot-modal-close" onclick="this.closest('.forgot-modal-overlay').remove()">&times;</button>
                    
                    <div class="forgot-success">
                        <div class="forgot-success-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </div>
                        
                        <h3 class="forgot-success-title">Correo enviado!</h3>
                        <p class="forgot-success-text">
                            Hemos enviado un enlace de recuperacion a<br>
                            <span class="forgot-success-email">${this.escapeHtml(email)}</span>
                        </p>
                        <p class="forgot-success-text" style="margin-top: 1rem; font-size: 0.8rem;">
                            Revisa tu bandeja de entrada y spam. El enlace expira en 1 hora.
                        </p>
                    </div>
                    
                    <a href="#" class="forgot-back-link" onclick="this.closest('.forgot-modal-overlay').remove(); return false;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Volver al inicio de sesion
                    </a>
                `;
            } else {
                emailInput.classList.add('error');
                errorSpan.textContent = result.message || 'Error al enviar el correo';
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }

        } catch (error) {
            console.error('Error al enviar correo de recuperacion:', error);
            
            let errorMessage = 'Error al enviar el correo';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No existe una cuenta con este correo';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Demasiados intentos. Intenta mas tarde.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Correo electronico invalido';
            }
            
            emailInput.classList.add('error');
            errorSpan.textContent = errorMessage;
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
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
            const email = elements.emailInput.value;
            const password = elements.passwordInput.value;
            const rememberMe = document.getElementById('remember').checked;
            
            let result;

            // Usar Auth.login() si esta disponible (usa Firebase Auth)
            if (window.Auth && typeof Auth.login === 'function') {
                console.log('Usando Auth.login con Firebase Auth');
                result = await Auth.login(email, password, rememberMe);
            } else {
                // Fallback al AuthManager local
                console.log('Usando AuthManager local (fallback)');
                result = await AuthManager.authenticate(email, password);
                
                // Si el AuthManager funciona, guardar sesion manualmente
                if (result.success) {
                    const storage = rememberMe ? localStorage : sessionStorage;
                    let userData = result.user;
                    if (!userData) {
                        try {
                            userData = await Store.getUserByEmail(email);
                        } catch (e) {
                            console.warn('No se pudo obtener datos del usuario');
                        }
                    }
                    
                    storage.setItem('fixify-session', 'active');
                    storage.setItem('fixify-user', JSON.stringify({
                        id: userData?.id || 'unknown',
                        email: userData?.email || email,
                        name: userData?.name || 'Usuario',
                        role: userData?.role || 'user',
                        loginAt: new Date().toISOString()
                    }));
                }
            }

            if (result.success) {
                // Obtener el rol del usuario para redirigir correctamente
                const userJson = localStorage.getItem('fixify-user') || sessionStorage.getItem('fixify-user');
                const user = userJson ? JSON.parse(userJson) : null;
                const userRole = user?.role || result.user?.role || 'user';
                
                // Mostrar mensaje de redireccion y redirigir al dashboard correcto
                this.showSuccessState();
                setTimeout(() => {
                    const dashboardUrl = userRole === 'employee' 
                        ? './pages/employee-dashboard.html' 
                        : './pages/dashboard.html';
                    window.location.href = dashboardUrl;
                }, 4000);
            } else {
                NotificationManager.show(result.message, 'error');
                this.shakeCard();
            }
        } catch (error) {
            console.error('Error en login:', error);
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
                // Obtener el rol del usuario para redirigir correctamente
                const userJson = localStorage.getItem('fixify-user') || sessionStorage.getItem('fixify-user');
                const user = userJson ? JSON.parse(userJson) : null;
                const userRole = user?.role || result.user?.role || 'user';
                
                this.showSuccessState();
                setTimeout(() => {
                    const dashboardUrl = userRole === 'employee' 
                        ? './pages/employee-dashboard.html' 
                        : './pages/dashboard.html';
                    window.location.href = dashboardUrl;
                }, 4000);
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
        // Obtener nombre del usuario
        const userJson = localStorage.getItem('fixify-user') || sessionStorage.getItem('fixify-user');
        const user = userJson ? JSON.parse(userJson) : null;
        const userName = user?.name || 'Usuario';
        const userInitials = userName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);

        // Crear estructura de la pantalla de exito
        elements.loginCard.innerHTML = `
            <div class="success-screen">
                <!-- Fondo con efecto glow -->
                <div class="success-bg-glow"></div>
                
                <!-- Contenedor de particulas -->
                <div class="success-particles" id="successParticles"></div>
                
                <!-- Contenedor de confetti -->
                <div class="confetti-container" id="confettiContainer"></div>
                
                <!-- Lineas de celebracion -->
                <div class="celebration-lines" id="celebrationLines"></div>
                
                <!-- Icono de exito animado -->
                <div class="success-icon-container">
                    <div class="success-ring"></div>
                    <div class="success-circle">
                        <svg class="success-checkmark" viewBox="0 0 24 24">
                            <path class="checkmark-path" d="M20 6L9 17L4 12"></path>
                        </svg>
                    </div>
                </div>
                
                <!-- Contenido textual -->
                <div class="success-content">
                    <h2 class="success-title">Bienvenido!</h2>
                    <p class="success-subtitle">Inicio de sesion exitoso</p>
                    <p class="success-redirect-text">Preparando tu espacio de trabajo...</p>
                    
                    <!-- Badge del usuario -->
                    <div class="success-user-greeting">
                        <div class="success-user-avatar">${userInitials}</div>
                        <span class="success-user-name">${this.escapeHtml(userName)}</span>
                    </div>
                    
                    <!-- Barra de progreso -->
                    <div class="success-progress-container">
                        <div class="success-progress-bar">
                            <div class="success-progress-fill"></div>
                        </div>
                        <div class="success-dots">
                            <div class="success-dot"></div>
                            <div class="success-dot"></div>
                            <div class="success-dot"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Generar particulas flotantes
        this.generateParticles();
        
        // Generar confetti con explosion
        setTimeout(() => this.generateConfetti(), 600);
        
        // Generar lineas de celebracion
        setTimeout(() => this.generateCelebrationLines(), 400);

        // Agregar transicion de salida antes de redirigir
        setTimeout(() => {
            elements.loginCard.classList.add('transitioning-out');
        }, 3500);
    }

    generateParticles() {
        const container = document.getElementById('successParticles');
        if (!container) return;

        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Posicion aleatoria en la parte inferior
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.bottom = `${Math.random() * 30}%`;
            
            // Delay aleatorio para escalonar la animacion
            particle.style.animationDelay = `${Math.random() * 2}s`;
            particle.style.animationDuration = `${2 + Math.random() * 2}s`;
            
            container.appendChild(particle);
        }
    }

    generateConfetti() {
        const container = document.getElementById('confettiContainer');
        if (!container) return;

        const confettiCount = 30;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            // Direccion aleatoria de explosion
            const angle = (Math.PI * 2 / confettiCount) * i + (Math.random() - 0.5);
            const distance = 80 + Math.random() * 120;
            const endDistance = 150 + Math.random() * 100;
            
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const xEnd = Math.cos(angle) * endDistance;
            const yEnd = Math.sin(angle) * endDistance + 100; // Caida por gravedad
            const rotation = Math.random() * 720 - 360;
            
            confetti.style.setProperty('--x', `${x}px`);
            confetti.style.setProperty('--y', `${y}px`);
            confetti.style.setProperty('--x-end', `${xEnd}px`);
            confetti.style.setProperty('--y-end', `${yEnd}px`);
            confetti.style.setProperty('--rotation', `${rotation}deg`);
            confetti.style.animationDelay = `${Math.random() * 0.2}s`;
            
            container.appendChild(confetti);
        }
    }

    generateCelebrationLines() {
        const container = document.getElementById('celebrationLines');
        if (!container) return;

        const lineCount = 12;
        
        for (let i = 0; i < lineCount; i++) {
            const line = document.createElement('div');
            line.className = 'celebration-line';
            
            const angle = (360 / lineCount) * i;
            line.style.setProperty('--angle', `${angle}deg`);
            line.style.animationDelay = `${i * 0.05}s`;
            
            container.appendChild(line);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

