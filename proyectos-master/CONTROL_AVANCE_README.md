# Control de Avance - Gestión de Documentos

## 📋 Descripción

Sistema de control de avance para gestión de documentos de proyectos con edición inline tipo Excel. Permite al usuario crear, editar y eliminar registros de documentos directamente en una tabla editable.

## ✨ Características

- ✅ **Edición inline**: Modifica directamente en las celdas como en Excel
- ✅ **Guardado automático**: Los cambios se guardan automáticamente después de 1.5 segundos
- ✅ **Campos personalizables**: El usuario escribe manualmente la mayoría de campos
- ✅ **Selectores para tipos**: Dropdown para Estado y Tipo de documento
- ✅ **Validación visual**: Estados con colores según tipo (VA, VC, NV, NR, etc.)
- ✅ **Agregar filas fácilmente**: Botón para agregar nuevas filas vacías
- ✅ **Eliminar con confirmación**: Modal de confirmación antes de eliminar

## 🎯 Campos de la Tabla

### Campos Manuales (Usuario escribe):
- **% Avance**: Número del 0 al 100
- **Código**: Texto libre (ej: TZS-BE-PRY26-001-ARQ-00.00)
- **Descripción**: Textarea para descripción detallada
- **Revisión Actual**: Número
- **Clasificación**: Texto libre (ej: Pas Validar, Pas Informar)
- **Correo N**: Número de correo
- **Todas las fechas**: Date pickers

### Campos con Selector:
- **Tipo**: 
  - Plano
  - Especificaciones Técnicas
  - Regularización
  - R - Regularización

- **Estado**:
  - **VA** - Validado (verde)
  - **VC** - Validado con Observaciones (amarillo)
  - **NV** - No Validado (rojo)
  - **NR** - Revisión (azul)
  - **EP** - En Progreso (azul claro)
  - **MC** - Muestra de Obra (amarillo)
  - **PI** - Por Iniciar
  - **PR** - Regularización

## 🔧 Cómo Usarlo en un Proyecto

### 1. En el HTML del componente padre (ej: proyecto.component.html):

```html
<app-control-avance [idProyecto]="Proyecto.idProyecto"></app-control-avance>
```

### 2. Ejemplo en un Tab o Sección:

```html
<mat-tab label="Control de Avance">
  <app-control-avance [idProyecto]="idProyectoSeleccionado"></app-control-avance>
</mat-tab>
```

### 3. Como sección separada:

```html
<div *ngIf="mostrarControlAvance">
  <app-control-avance [idProyecto]="proyectoActual.idProyecto"></app-control-avance>
</div>
```

## 💾 Backend Necesario

### Endpoints requeridos en el API:

```csharp
// GET - Obtener controles de avance por proyecto
/ControlAvance/get/ControlAvancebyidProyecto?json={"idProyecto":123}

// POST - Agregar nuevo control
/ControlAvance/post/AddControlAvance

// POST - Actualizar o eliminar (marcar inactivo)
/ControlAvance/post/UpdDelControlAvance
```

### Estructura del objeto mControlAvance:

```typescript
{
  idControlAvance: number,
  idProyecto: number,
  numeroAvance: number,      // % Avance
  codigo: string,
  tipo: string,
  descripcion: string,
  revisionActual: number,
  estado: string,
  clasificacion: string,
  fechaInicioContrato: string,
  fechaTerminoContrato: string,
  fechaTerminoReal: string,
  fechaCierre: string,
  correoN: string,
  fechaRespuesta: string,
  correoM: string,
  fechaCierre2: string,
  correoN2: string,
  fechaRespuesta2: string,
  observaciones: string,
  activo: boolean,
  fechaCreacion: string,
  fechaRemocion: string,
  idUsuarioCreador: number,
  idUsuarioRemovedor: number
}
```

## 📝 Flujo de Uso

1. **Agregar Documento**:
   - Click en "Agregar Fila"
   - Se agrega una fila vacía (color amarillo claro)
   - Completar Código, Tipo y Descripción (obligatorios)
   - Click en botón "Guardar" (💾)
   - Se guarda en BD y la fila cambia de color

2. **Editar Documento**:
   - Click en cualquier celda
   - Modificar el valor
   - Esperar 1.5 segundos
   - Se guarda automáticamente

3. **Eliminar Documento**:
   - Click en botón "Eliminar" (🗑️)
   - Confirmar en modal
   - Se marca como inactivo en BD

## 🎨 Personalización

### Modificar Estados Disponibles

En el archivo `control-avance.component.ts`:

```typescript
estadosDisponibles = [
  { value: 'VA', label: 'VA' },
  { value: 'VC', label: 'VC' },
  // Agregar más estados aquí
];
```

### Modificar Tipos de Documento

```typescript
tiposDocumento = [
  'Plano',
  'Especificaciones Técnicas',
  // Agregar más tipos aquí
];
```

### Cambiar Tiempo de Guardado Automático

En el método `OnCambio()`:

```typescript
setTimeout(() => {
  // Cambiar 1500 a los milisegundos deseados
}, 1500);
```

## 🐛 Troubleshooting

### No se guardan los cambios
- Verificar que Código, Tipo y Descripción estén completos
- Revisar consola del navegador para errores
- Verificar que el servicio de backend esté respondiendo

### Los estados no tienen color
- Verificar que el archivo CSS esté importado correctamente
- Asegurarse que el estado tenga un valor válido (VA, VC, NV, etc.)

### El componente no aparece
- Verificar que `ControlAvanceComponent` esté en `declarations` del módulo
- Verificar que el import esté correcto en app.module.ts
- Asegurarse de pasar el `[idProyecto]` correctamente

## 📚 Archivos Creados

```
src/app/
├── models/
│   ├── mControlAvance.ts
│   └── mTabla_ControlAvance.ts
├── services/
│   └── sControlAvance.service.ts
└── Proyectos/
    └── control-avance/
        ├── control-avance.component.ts
        ├── control-avance.component.html
        └── control-avance.component.css
```

## 🚀 Próximas Mejoras Posibles

- [ ] Exportar a Excel
- [ ] Importar desde Excel
- [ ] Filtros por estado, tipo, fechas
- [ ] Ordenar columnas
- [ ] Historial de cambios
- [ ] Adjuntar archivos a cada documento
- [ ] Comentarios por documento
- [ ] Notificaciones por cambio de estado

---

**Desarrollado para:** Sistema de Gestión de Proyectos  
**Versión:** 1.0  
**Fecha:** Febrero 2026
