# FIXIFY - Sistema de Gestion de Activos IT

Sistema web para la gestion de activos de TI, tickets de soporte, empleados, usuarios y licencias de software. Desarrollado para Brands&People.

## Caracteristicas Principales

- **Gestion de Tickets**: Crear, asignar y dar seguimiento a tickets de soporte con historial de cambios
- **Inventario de Maquinas**: Registro completo de equipos de computo con estado y asignaciones
- **Registro de Empleados**: Base de datos de empleados con departamentos y cargos
- **Gestion de Licencias**: Control de licencias de software, vencimientos y disponibilidad
- **Centro de Asignaciones**: Sistema para asignar maquinas y licencias a empleados
- **Gestion de Usuarios**: Administracion de usuarios del sistema con roles y permisos
- **Perfil de Usuario**: Vista y edicion del perfil personal
- **Analitica**: Dashboard con metricas, graficas e insights en tiempo real
- **Tema Claro/Oscuro**: Soporte completo para modo claro y oscuro

## Arquitectura

El sistema utiliza una arquitectura hibrida que prioriza Firebase pero funciona offline con localStorage:

- **Firebase Authentication**: Autenticacion segura con recuperacion de contrasena por email
- **Cloud Firestore**: Base de datos NoSQL en tiempo real con persistencia offline
- **localStorage Fallback**: Modo offline completo cuando no hay conexion a Firebase

## Estructura del Proyecto

```
FIXIFY-1/
├── index.html                 # Pagina de login
├── pages/
│   ├── dashboard.html         # Dashboard principal con KPIs
│   ├── tickets.html           # Gestion de tickets de soporte
│   ├── machines.html          # Inventario de maquinas
│   ├── employees.html         # Registro de empleados
│   ├── licenses.html          # Gestion de licencias
│   ├── assignments.html       # Centro de asignaciones
│   ├── users.html             # Gestion de usuarios (solo admin)
│   ├── profile.html           # Perfil del usuario
│   └── analytics.html         # Reportes y analitica
├── css/
│   ├── styles.css             # Estilos base, variables y login
│   ├── dashboard.css          # Layout del dashboard
│   └── components.css         # Componentes reutilizables
├── js/
│   ├── app.js                 # Login controller
│   ├── core/
│   │   ├── firebase-config.js # Configuracion de Firebase
│   │   ├── firestore.js       # Servicio CRUD para Firestore
│   │   ├── store.js           # Capa de datos (Firestore + localStorage)
│   │   ├── auth.js            # Autenticacion con Firebase Auth
│   │   └── utils.js           # Funciones utilitarias
│   ├── components/
│   │   ├── sidebar.js         # Navegacion lateral
│   │   ├── modal.js           # Sistema de modales
│   │   ├── table.js           # Tablas de datos con ordenamiento
│   │   ├── notifications.js   # Toast notifications
│   │   └── charts.js          # Graficas con Chart.js
│   └── modules/
│       ├── dashboard.js       # Logica del dashboard
│       ├── tickets.js         # CRUD de tickets
│       ├── machines.js        # CRUD de maquinas
│       ├── employees.js       # CRUD de empleados
│       ├── licenses.js        # CRUD de licencias
│       ├── assignments.js     # Sistema de asignaciones
│       ├── users.js           # Gestion de usuarios
│       ├── profile.js         # Perfil de usuario
│       └── analytics.js       # Reportes y metricas
└── README.md
```

## Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla ES6+)
- **Backend**: Firebase (Authentication, Firestore)
- **Estilos**: CSS Variables, Flexbox, Grid, Media Queries
- **Graficas**: Chart.js (CDN)
- **Fuentes**: Google Fonts (Outfit, Playfair Display)
- **Persistencia**: Cloud Firestore + localStorage fallback
- **Hosting**: Compatible con Firebase Hosting o cualquier servidor estatico

## Colecciones de Firestore

El sistema utiliza las siguientes colecciones en Firestore:

| Coleccion | Descripcion |
|-----------|-------------|
| `users` | Usuarios del sistema con roles |
| `employees` | Empleados de la organizacion |
| `machines` | Inventario de equipos |
| `licenses` | Licencias de software |
| `tickets` | Tickets de soporte |
| `assignments_machines` | Historial de asignaciones de maquinas |
| `assignments_licenses` | Historial de asignaciones de licencias |
| `departments` | Departamentos de la organizacion |
| `activity_log` | Log de actividad del sistema |

## Modelos de Datos

### Usuario
```javascript
{
    id: string,
    email: string,
    name: string,
    role: 'admin' | 'manager' | 'user',
    status: 'active' | 'inactive',
    firebaseUid: string,        // UID de Firebase Auth
    lastLogin: datetime,
    createdAt: datetime
}
```

### Empleado
```javascript
{
    id: string,
    employeeNumber: string,
    name: string,
    lastName: string,
    email: string,
    phone: string,
    department: string,         // ID del departamento
    position: string,
    startDate: date,
    status: 'active' | 'inactive',
    notes: string
}
```

### Maquina
```javascript
{
    id: string,
    serialNumber: string,
    name: string,
    type: 'laptop' | 'desktop' | 'server' | 'printer' | 'other',
    brand: string,
    model: string,
    status: 'available' | 'assigned' | 'maintenance' | 'retired',
    assignedTo: string,         // ID del empleado
    acquisitionDate: date,
    cost: number,
    warrantyEnd: date,
    ticketCount: number,        // Contador de tickets asociados
    notes: string
}
```

### Licencia
```javascript
{
    id: string,
    software: string,
    licenseKey: string,
    type: 'perpetual' | 'subscription' | 'per_user' | 'per_device',
    quantity: number,           // Total de licencias
    assignedCount: number,      // Licencias asignadas
    expirationDate: date,
    cost: number,
    vendor: string,
    notes: string
}
```

### Ticket
```javascript
{
    id: string,
    folio: string,              // Formato: TKT-YYYY-00001
    title: string,
    description: string,
    category: 'hardware' | 'software' | 'network' | 'other',
    priority: 'low' | 'medium' | 'high' | 'critical',
    status: 'open' | 'in_progress' | 'resolved' | 'closed',
    requesterId: string,        // ID del empleado solicitante
    machineId: string,          // ID de la maquina relacionada
    assignedTo: string,         // ID del tecnico asignado
    comments: array,            // Historial de comentarios
    history: array,             // Historial de cambios de estado
    createdAt: datetime,
    resolvedAt: datetime
}
```

## Funcionalidades por Modulo

### Dashboard
- KPIs principales (tickets abiertos, maquinas activas, empleados, licencias por vencer)
- Graficas de tendencia de tickets
- Maquinas con mas fallas
- Lista de ultimos tickets
- Licencias proximas a vencer
- Actualizacion automatica cada 5 minutos

### Tickets
- Tabla con filtros y busqueda
- Crear/editar tickets con formulario
- Estados y prioridades con colores
- Sistema de comentarios
- Historial completo de cambios
- Asignacion a tecnicos
- Generacion automatica de folio

### Maquinas
- Inventario completo con busqueda
- Filtros por tipo y estado
- Vista de tabla con ordenamiento
- Exportacion a CSV
- Historial de tickets por maquina
- Control de garantias

### Empleados
- Directorio de empleados
- Filtro por departamento y estado
- Importacion desde CSV
- Vista de activos asignados por empleado

### Licencias
- Control de licencias de software
- Alertas de vencimiento (30 dias)
- Cantidad total vs disponibles
- Historial de asignaciones

### Asignaciones
- Asignar maquinas a empleados
- Asignar licencias a empleados
- Desasignar activos
- Historial completo de asignaciones

### Usuarios
- Solo accesible para administradores
- Crear usuarios con autenticacion Firebase
- Asignar roles (admin, manager, user)
- Activar/desactivar usuarios

### Perfil
- Ver informacion del usuario actual
- Cambiar contrasena (via Firebase Auth)

### Analitica
- Graficas de tickets por categoria y prioridad
- Maquinas problematicas (mas tickets)
- Licencias mas utilizadas
- Insights automaticos
- Exportacion de reportes

## Sistema de Roles y Permisos

| Rol | Permisos |
|-----|----------|
| `admin` | Acceso total a todas las funcionalidades |
| `manager` | Ver, crear y editar (sin acceso a usuarios) |
| `user` | Solo lectura |

## Caracteristicas de Seguridad

- Autenticacion con Firebase Authentication
- Recuperacion de contrasena por email
- Sesiones seguras con opcion "Recordarme"
- Migracion automatica de usuarios legacy a Firebase Auth
- Validacion de formularios en cliente
- Proteccion de rutas por autenticacion
- Log de actividad (login, logout, asignaciones)

## Instalacion

### Requisitos
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Conexion a internet (para Firebase) o modo offline

### Pasos

1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd FIXIFY-1
```

2. Configurar Firebase (opcional, si usas tu propio proyecto):
   - Crear proyecto en [Firebase Console](https://console.firebase.google.com)
   - Habilitar Authentication (Email/Password)
   - Crear base de datos Firestore
   - Copiar configuracion a `js/core/firebase-config.js`

3. Desplegar:
   - **Local**: Abrir `index.html` en el navegador
   - **Firebase Hosting**: `firebase deploy`
   - **GitHub Pages**: Subir archivos al repositorio

No requiere instalacion de dependencias. Todo funciona con archivos estaticos.

## Modo Offline

El sistema detecta automaticamente si Firebase esta disponible:

- **Con Firebase**: Usa Firestore con sincronizacion en tiempo real
- **Sin Firebase**: Usa localStorage como almacenamiento local

Los datos de localStorage se mantienen entre sesiones pero no se sincronizan entre dispositivos.

## Desarrollo

### Comandos utiles en consola del navegador

```javascript
// Ver estadisticas del sistema
await Store.getStats()

// Cargar datos de demo
await Store.seedDemoData()

// Limpiar todos los datos de localStorage
localStorage.clear()

// Ver usuario actual
Auth.getCurrentUser()

// Verificar si usa Firestore
Store.useFirestore
```

### Convencion de IDs

El sistema genera IDs con prefijos descriptivos:
- `USR` - Usuarios
- `EMP` - Empleados
- `MAC` - Maquinas
- `LIC` - Licencias
- `TKT` - Tickets
- `ASM` - Asignaciones de maquinas
- `ASL` - Asignaciones de licencias
- `DEP` - Departamentos
- `LOG` - Registros de actividad
- `CMT` - Comentarios

## Temas

El sistema soporta tema claro y oscuro:
- Se guarda la preferencia en localStorage (`fixify-theme`)
- Detecta automaticamente la preferencia del sistema operativo
- Toggle disponible en header de todas las paginas

## Proximos Pasos

- [ ] Notificaciones push para tickets urgentes
- [ ] Exportacion de reportes a PDF
- [ ] Dashboard personalizable
- [ ] API REST para integraciones
- [ ] App movil con React Native
- [ ] Reportes programados por email

---

Desarrollado para IT Brands&People
