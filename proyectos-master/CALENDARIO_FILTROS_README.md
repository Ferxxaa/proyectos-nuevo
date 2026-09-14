# Filtros de Calendario de Tareas

## Funcionalidades Agregadas

Se han agregado filtros avanzados de búsqueda al calendario de tareas para facilitar la localización rápida de tareas específicas, incluyendo filtros por tipo de usuario.

### Características principales:

1. **Filtro por Nombre de Tarea**: Busca en:
   - Título de la tarea (`title`)
   - Descripción de la tarea (`descripcionTarea`)
   - Nombre de la tarea (`nombreTarea`)

2. **Filtro por Responsable**: Busca en:
   - Campo título que contiene el responsable (`title`)
   - Campo responsable específico (`responsable`)

3. **Filtro por Tipo de Usuario** (con sistema de permisos):
   - **Todas disponibles**: Muestra todas las tareas que el usuario puede ver según sus permisos
   - **Solo tareas propias**: Tareas donde el usuario actual es responsable
   - **Tareas que creé**: Solo tareas creadas por el usuario actual
   - **Tareas asignadas a mí**: Tareas donde soy responsable pero no fui el creador
   - **Mis responsabilidades**: Tareas donde soy responsable O que creé

4. **Filtro por Estado**: Dropdown con opciones predefinidas:
   - Todos los estados (opción por defecto)
   - Pendiente, En Proceso, Cancelada, Terminada

5. **Búsqueda en Tiempo Real**: 
   - Los filtros se aplican automáticamente mientras el usuario escribe
   - Incluye un retraso de 300ms para mejor rendimiento
   - También funciona al presionar Enter

6. **Botones de Filtro Rápido**:
   - **"Vista Global"** (amarillo): Solo visible para Gerencia - Muestra todas las tareas del sistema
   - **"Tareas Propias"** (azul): Para usuarios normales: Mis responsabilidades / Para gerencia: Solo tareas donde soy responsable
   - **"Tareas Asignadas"** (verde): Solo tareas que creé para otros usuarios

7. **Contador de Resultados**: 
   - Muestra cuántas tareas coinciden con los filtros aplicados
   - Solo aparece cuando hay filtros activos

8. **Panel de Detalles Automático**:
   - **Vista automática**: Al aplicar filtros, se muestran automáticamente los detalles de las tareas filtradas
   - **Información completa**: Cada tarea muestra descripción, estado, responsable, fechas y prioridad
   - **Diseño intuitivo**: Tarjetas con colores según estado y prioridad
   - **Efectos visuales**: Hover effects y animaciones suaves

9. **Botón Limpiar Filtros**: 
   - Permite resetear todos los filtros de una vez
   - Restaura la vista completa del calendario
   - Limpia el panel de detalles

### Cómo usar:

1. **Buscar por tarea**: Escriba el nombre o parte del nombre de la tarea en el campo "Buscar por Tarea"
2. **Buscar por responsable**: Escriba el nombre o parte del nombre del responsable en el campo "Buscar por Responsable"
3. **Filtrar por usuario**: Use el dropdown "Filtrar por Usuario" para mostrar:
   - **Usuarios normales**: Todas disponibles, Mis responsabilidades, Tareas Asignadas
   - **Gerencia**: Vista Global (Todas las tareas), Tareas Propias, Tareas Asignadas
4. **Filtrar por estado**: Seleccione el estado de la tarea del dropdown "Estado"
5. **Filtros rápidos**: Use los botones de colores para aplicar filtros comunes rápidamente (Gerencia tiene botón amarillo adicional para Vista Global)
6. **Combinar filtros**: Puede usar múltiples filtros simultáneamente para búsquedas más específicas
7. **Panel de detalles automático**: Al aplicar cualquier filtro, el panel lateral muestra automáticamente los detalles de todas las tareas que coincidan
8. **Limpiar**: Use el botón "Limpiar Filtros" para eliminar todos los filtros activos

### Panel de Detalles Automático:

- **Se activa automáticamente** al aplicar cualquier filtro
- **Muestra información completa** de cada tarea: descripción, estado, responsable, fechas, prioridad
- **Códigos de colores** para estados y prioridades para identificación rápida
- **Efectos visuales** al pasar el mouse sobre cada tarea
- **Scroll personalizado** si hay muchas tareas
- **Contador de resultados** en el encabezado

### Sistema de Permisos por Rol:

#### **👤 Usuarios Normales** (Personal, Coordinadores, etc.):
- **Solo ven**: Tareas donde son responsables + Tareas que crearon/asignaron
- **No pueden ver**: Tareas de otros usuarios donde no tienen participación

#### **👑 Gerencia** (Sub Gerente, Director, Gerente-Admin):
- **Ven todo**: Todas las tareas del sistema completo (sin restricciones de usuario)
- **Vista privilegiada**: Indicador visual "Vista Gerencial" 
- **Botón exclusivo**: "Vista Global" (amarillo) para acceso rápido a todas las tareas
- **Perfiles con acceso total**: idPerfil 1, 2, 11
- **Filtros personales**: Pueden usar "Tareas Propias" y "Tareas Asignadas" aplicados sobre todas las tareas del sistema

### Filtros por Usuario Explicados:

#### **Para Usuarios Normales:**
- **Todas disponibles**: Solo sus tareas (donde son responsables + que crearon)
- **Mis responsabilidades**: Tareas asignadas a mí + tareas que me creé para mí mismo
- **Tareas Asignadas**: Solo tareas que creé para otros usuarios

#### **Para Gerencia:**
- **Vista Global (Todas las tareas)**: TODAS las tareas del sistema completo (sin restricciones)
- **Tareas Propias**: Solo tareas donde el usuario de gerencia es responsable
- **Tareas Asignadas**: Solo tareas que el usuario de gerencia creó para otros usuarios

### Estilos:

- Los filtros están contenidos en una caja con fondo gris claro para mejor visualización
- Los campos de entrada tienen efectos de hover y focus para mejor experiencia de usuario
- El contador de resultados aparece en color gris para no distraer

### Mejoras de Usabilidad:

- **Filtros inteligentes**: Los dropdowns cambian inmediatamente, los inputs de texto tienen debounce
- **Indicadores visuales**: Borde azul en controles con filtros activos
- **Opciones predefinidas**: Estados comunes disponibles en dropdown
- **Combinación libre**: Todos los filtros pueden usarse juntos

### Implementación Técnica:

- **Frontend**: Angular + jQuery/JavaScript
- **Sistema de permisos**: Verificación de perfiles de usuario al cargar
- **API de permisos**: `GetUsuariosPerfilesByIdUsuario` para obtener roles
- **Filtrado automático**: Los datos se filtran según permisos antes de mostrar
- **Estilos**: CSS personalizado con Bootstrap
- **Filtrado**: Función de filtrado en tiempo real con debounce para inputs, inmediato para selects
- **Calendario**: Compatible con FullCalendar.js
- **Indicadores visuales**: Badge de "Vista Gerencial" para usuarios con permisos especiales

### Archivos Modificados:

- `calendario-tareas.component.html` - Agregados controles de filtro
- `calendario-tareas.component.ts` - Agregadas funciones de filtrado
- `calendario-tareas.component.css` - Agregados estilos para los filtros

### Compatibilidad:

- Compatible con la estructura existente del proyecto
- No interfiere con otras funcionalidades del calendario
- Mantiene el estilo visual del proyecto