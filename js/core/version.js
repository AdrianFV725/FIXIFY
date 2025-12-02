/**
 * FIXIFY - Cache Control & Version Management
 * 
 * Este archivo maneja el versionado de recursos para evitar problemas de cache.
 * 
 * MODO DESARROLLO: Cambia DEV_MODE a true para forzar recarga de recursos
 * MODO PRODUCCION: Cambia DEV_MODE a false y actualiza VERSION cuando hagas deploy
 */

const FIXIFY_VERSION = {
    // Numero de version para produccion (cambiar con cada deploy)
    VERSION: '1.0.0',
    
    // Modo desarrollo: true = agrega timestamp, false = usa VERSION
    DEV_MODE: true,
    
    // Obtener el query string para cache busting
    getVersionQuery() {
        if (this.DEV_MODE) {
            // En desarrollo, usar timestamp para siempre recargar
            return `?v=${Date.now()}`;
        }
        return `?v=${this.VERSION}`;
    },
    
    // Aplicar version a todos los recursos CSS y JS locales
    applyToResources() {
        const query = this.getVersionQuery();
        
        // Aplicar a stylesheets
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const href = link.getAttribute('href');
            // Solo aplicar a recursos locales (no CDNs)
            if (href && !href.startsWith('http') && !href.includes('googleapis') && !href.includes('gstatic')) {
                // Remover version anterior si existe
                const cleanHref = href.split('?')[0];
                link.setAttribute('href', cleanHref + query);
            }
        });
        
        // Aplicar a scripts (excepto el actual)
        document.querySelectorAll('script[src]').forEach(script => {
            const src = script.getAttribute('src');
            // Solo aplicar a recursos locales
            if (src && !src.startsWith('http') && !src.includes('gstatic') && !src.includes('jsdelivr') && !src.includes('version.js')) {
                const cleanSrc = src.split('?')[0];
                script.setAttribute('src', cleanSrc + query);
            }
        });
    },
    
    // Forzar recarga completa (util para debugging)
    forceReload() {
        // Limpiar cache de service workers si existen
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }
        
        // Recargar sin cache
        window.location.reload(true);
    },
    
    // Limpiar storage local si hay problemas
    clearStorage() {
        // No eliminar datos importantes como theme
        const keysToKeep = ['fixify-theme'];
        const savedValues = {};
        
        keysToKeep.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) savedValues[key] = value;
        });
        
        localStorage.clear();
        sessionStorage.clear();
        
        // Restaurar valores importantes
        Object.entries(savedValues).forEach(([key, value]) => {
            localStorage.setItem(key, value);
        });
        
        console.log('[FIXIFY] Storage limpiado');
    }
};

// Auto-ejecutar al cargar (solo en modo desarrollo)
if (FIXIFY_VERSION.DEV_MODE) {
    // Ejecutar lo antes posible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            FIXIFY_VERSION.applyToResources();
        });
    } else {
        FIXIFY_VERSION.applyToResources();
    }
    
    console.log('[FIXIFY] Modo desarrollo activo - Cache busting habilitado');
}

// Exponer globalmente para debugging
window.FIXIFY_VERSION = FIXIFY_VERSION;

