# Instrucciones para Configurar GitHub Pages y Reset Password

## Problema Actual
El enlace `https://adrianfv725.github.io/pages/reset-password.html` está dando 404.

## Posibles Causas

### 1. GitHub Pages está configurado para servir desde el repositorio (no desde usuario)
Si GitHub Pages está configurado para el repositorio `FIXIFY`, la URL correcta sería:
```
https://adrianfv725.github.io/FIXIFY/pages/reset-password.html
```

### 2. GitHub Pages está configurado para servir desde la raíz del usuario
Si está configurado para el usuario, la URL sería:
```
https://adrianfv725.github.io/pages/reset-password.html
```

## Pasos para Verificar y Solucionar

### Paso 1: Verificar Configuración de GitHub Pages

1. Ve a tu repositorio: https://github.com/AdrianFV725/FIXIFY
2. Ve a **Settings** > **Pages**
3. Verifica la sección **Source**:
   - Si dice "Deploy from a branch" y la rama es `main`:
     - Si el folder es `/ (root)`: La URL será `adrianfv725.github.io/FIXIFY/...`
     - Si el folder es `/docs`: La URL será `adrianfv725.github.io/FIXIFY/...`
   - Si dice "GitHub Actions": Verifica el workflow

### Paso 2: Probar Ambas URLs

Prueba estas URLs en tu navegador:

**Opción A (con nombre del repositorio):**
```
https://adrianfv725.github.io/FIXIFY/pages/reset-password.html
```

**Opción B (sin nombre del repositorio):**
```
https://adrianfv725.github.io/pages/reset-password.html
```

**La que funcione es la correcta.**

### Paso 3: Actualizar la Configuración si es Necesario

Si la URL correcta es la **Opción A** (con `/FIXIFY/`), necesitas:

1. Ir a Firebase Console > Authentication > Settings > Authorized domains
2. Asegurarte de que `adrianfv725.github.io` esté autorizado (ya lo está)
3. El código ya está actualizado para detectar automáticamente la ruta correcta

### Paso 4: Subir los Cambios

```bash
cd /Users/adrianfloresvillatoro/Documents/PROYECTOS/FIXIFY-1
git add js/core/auth.js pages/reset-password.html
git commit -m "Mejorar detección de ruta de GitHub Pages para reset password"
git push origin main
```

### Paso 5: Probar con un Nuevo Enlace

1. Solicita un nuevo restablecimiento de contraseña
2. Abre la consola del navegador (F12) y busca el mensaje:
   ```
   Reset password - Action URL: ...
   ```
3. Verifica que la URL generada sea correcta
4. Prueba el enlace del email

## Solución Alternativa: Configurar GitHub Pages para Usuario

Si quieres que la URL sea `adrianfv725.github.io/pages/...` (sin el nombre del repositorio):

1. Crea un repositorio llamado `adrianfv725.github.io` (debe ser exactamente ese nombre)
2. Configura GitHub Pages para ese repositorio
3. Mueve o copia los archivos allí
4. Actualiza la configuración de Firebase para usar esa URL

## Verificación Rápida

Abre la consola del navegador (F12) cuando solicites un reset password y verifica:
- El mensaje `Reset password - Action URL:` mostrará la URL que se está generando
- Compara esa URL con las opciones A y B de arriba
- Si no coincide, el código se actualizará automáticamente en la próxima versión

