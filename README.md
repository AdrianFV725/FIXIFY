# FIXIFY

Aplicacion Web para IT Brands&People

## Pagina de Login

Pagina de inicio de sesion moderna y elegante con las siguientes caracteristicas:

- Diseno limpio con colores claros y acentos dorados
- Modo oscuro completamente funcional
- Animaciones suaves y fluidas
- Validacion de formularios en tiempo real
- Completamente responsive
- Compatible con GitHub Pages

## Credenciales de Acceso

- **Correo:** admin@brands.mx
- **Contrasena:** 3lN3g0c10d3tuV1d4

## Tecnologias

- HTML5
- CSS3 (Variables CSS, Flexbox, Animaciones)
- JavaScript Vanilla (ES6+)
- Google Fonts (Outfit, Playfair Display)

## Despliegue en GitHub Pages

### Opcion 1: Desde la interfaz de GitHub

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuracion)
3. En el menu lateral, click en **Pages**
4. En **Source**, selecciona **Deploy from a branch**
5. Selecciona la rama `main` y la carpeta `/ (root)`
6. Click en **Save**
7. Espera unos minutos y tu sitio estara disponible en `https://tu-usuario.github.io/FIXIFY-1/`

### Opcion 2: Usando GitHub Actions (recomendado)

1. Ve a **Settings** > **Pages**
2. En **Source**, selecciona **GitHub Actions**
3. GitHub detectara automaticamente que es un sitio estatico
4. El sitio se desplegara automaticamente con cada push

## Estructura del Proyecto

```
FIXIFY-1/
├── index.html          # Pagina principal de login
├── css/
│   └── styles.css      # Estilos con temas claro/oscuro
├── js/
│   └── app.js          # Logica de autenticacion y UI
└── README.md           # Este archivo
```

## Caracteristicas del Modo Oscuro

El modo oscuro se activa/desactiva con el boton en la esquina superior derecha. La preferencia se guarda en localStorage y respeta la configuracion del sistema operativo si no hay preferencia guardada.

## Desarrollo Local

Simplemente abre el archivo `index.html` en tu navegador o usa un servidor local:

```bash
# Con Python 3
python -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con VS Code
# Instala la extension "Live Server" y haz click derecho en index.html > "Open with Live Server"
```

## Licencia

Proyecto privado para IT Brands&People
