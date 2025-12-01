# FIXIFY - Sistema de Gestion de Activos IT

Sistema web para la gestion de activos de TI, tickets de soporte, empleados y licencias de software. Desarrollado para Brands&People.

## Caracteristicas

- **Gestion de Tickets**: Crear, asignar y dar seguimiento a tickets de soporte
- **Inventario de Maquinas**: Registro completo de equipos de computo
- **Registro de Empleados**: Base de datos de empleados con departamentos
- **Gestion de Licencias**: Control de licencias de software y vencimientos
- **Asignaciones**: Sistema para asignar maquinas y licencias a empleados
- **Analitica**: Dashboard con metricas, graficas e insights

## Estructura del Proyecto

```
FIXIFY-1/
├── index.html                 # Pagina de login
├── pages/
│   ├── dashboard.html         # Dashboard principal
│   ├── tickets.html           # Gestion de tickets
│   ├── machines.html          # Inventario de maquinas
│   ├── employees.html         # Registro de empleados
│   ├── licenses.html          # Gestion de licencias
│   ├── assignments.html       # Centro de asignaciones
│   └── analytics.html         # Reportes y analitica
├── css/
│   ├── styles.css             # Estilos base y del login
│   ├── dashboard.css          # Layout del dashboard
│   └── components.css         # Componentes reutilizables
├── js/
│   ├── app.js                 # Login controller
│   ├── core/
│   │   ├── store.js           # Manejo de datos (localStorage)
│   │   ├── utils.js           # Funciones utilitarias
│   │   └── auth.js            # Autenticacion y sesion
│   ├── components/
│   │   ├── sidebar.js         # Navegacion lateral
│   │   ├── modal.js           # Sistema de modales
│   │   ├── table.js           # Tablas de datos
│   │   ├── notifications.js   # Toast notifications
│   │   └── charts.js          # Graficas (Chart.js)
│   └── modules/
│       ├── dashboard.js       # Logica del dashboard
│       ├── tickets.js         # CRUD de tickets
│       ├── machines.js        # CRUD de maquinas
│       ├── employees.js       # CRUD de empleados
│       ├── licenses.js        # CRUD de licencias
│       ├── assignments.js     # Asignaciones
│       └── analytics.js       # Reportes y metricas
└── README.md
```

## Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Estilos**: CSS Variables, Flexbox, Grid
- **Graficas**: Chart.js (CDN)
- **Persistencia**: localStorage
- **Hosting**: Compatible con GitHub Pages

## Credenciales de Acceso

```
Email: admin@brands.mx
Password: 3lN3g0c10d3tuV1d4
```

## Modelos de Datos

### Empleado
```javascript
{
    id: string,
    employeeNumber: string,
    name: string,
    lastName: string,
    email: string,
    phone: string,
    department: string,
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
    assignedTo: string, // employeeId
    acquisitionDate: date,
    cost: number,
    warrantyEnd: date,
    ticketCount: number,
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
    quantity: number,
    assignedCount: number,
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
    folio: string,
    title: string,
    description: string,
    category: 'hardware' | 'software' | 'network' | 'other',
    priority: 'low' | 'medium' | 'high' | 'critical',
    status: 'open' | 'in_progress' | 'resolved' | 'closed',
    requesterId: string, // employeeId
    machineId: string,
    assignedTo: string, // employeeId (tecnico)
    comments: array,
    history: array,
    createdAt: datetime,
    resolvedAt: datetime
}
```

## Funcionalidades por Modulo

### Dashboard
- KPIs principales (tickets abiertos, maquinas, empleados, licencias por vencer)
- Graficas de tendencia de tickets
- Maquinas con mas fallas
- Lista de ultimos tickets
- Licencias proximas a vencer

### Tickets
- Tabla con filtros y busqueda
- Crear/editar tickets con formulario
- Estados y prioridades
- Historial de cambios
- Asignacion a tecnicos

### Maquinas
- Inventario completo
- Filtros por tipo y estado
- Vista de tabla o tarjetas
- Exportacion a CSV
- Historial de tickets por maquina

### Empleados
- Directorio de empleados
- Filtro por departamento
- Importacion desde CSV
- Vista de activos asignados

### Licencias
- Control de licencias
- Alertas de vencimiento
- Cantidad y disponibilidad
- Historial de asignaciones

### Asignaciones
- Interface drag-and-drop style
- Asignar maquinas a empleados
- Asignar licencias a empleados
- Historial de asignaciones

### Analitica
- Graficas de tickets por categoria, prioridad
- Maquinas problematicas
- Licencias mas utilizadas
- Insights automaticos
- Exportacion de reportes

## Instalacion

1. Clonar el repositorio
2. Abrir `index.html` en el navegador
3. O publicar en GitHub Pages

No requiere instalacion de dependencias. Todo funciona con archivos estaticos.

## Desarrollo

Para continuar el desarrollo:

1. Los datos de prueba se cargan automaticamente al primer login (ver `Store.seedDemoData()`)
2. Todos los datos persisten en localStorage
3. Para limpiar datos: `Store.clearAll()` en la consola
4. El tema claro/oscuro se guarda automaticamente

## Proximos Pasos

- [ ] Completar validaciones de formularios
- [ ] Agregar mas graficas en analitica
- [ ] Sistema de notificaciones en tiempo real
- [ ] Exportacion a PDF
- [ ] Drag and drop para asignaciones
- [ ] Busqueda global
- [ ] Modo offline completo

---

Desarrollado para IT Brands&People
