import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { mNotificacion } from '../../models/mNotificacion';
import { NotificacionesService } from '../../services/notificaciones.service';
import { spMis_Tareas } from '../../services/Personalizados/spMis_Tareas.service';
import { sDetalleSubProyecto } from '../../services/sDetalleSubProyecto.service';
import { sSubProyecto } from '../../services/sSubProyecto.service';

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.css']
})
export class NotificacionesComponent implements OnInit, OnDestroy {

  notificaciones: mNotificacion[] = [];
  notificacionesFiltradas: mNotificacion[] = [];
  conteoNoLeidas: number = 0;
  
  // Filtros
  filtroTipoNotificacion: string = 'todas';
  filtroTipo: string = 'todas';
  filtroEstado: string = 'todas';
  busqueda: string = '';
  
  // Estados de la tabla
  ordenarPor: string = 'fechaCreacion';
  ordenAscendente: boolean = false;
  paginaActual: number = 1;
  itemsPorPagina: number = 10;
  
  // Exponer Math para usar en el template
  Math = Math;
  
  private subscripciones: Subscription[] = [];

  constructor(
    private notificacionesService: NotificacionesService,
    private router: Router,
    private spMisTareasService: spMis_Tareas,
    private sDetalleSubProyecto: sDetalleSubProyecto,
    private sSubProyecto: sSubProyecto
  ) { }

  ngOnInit() {
    this.cargarNotificaciones();
    this.actualizarNotificacionesCompletas();
  }

  ngOnDestroy() {
    this.subscripciones.forEach(sub => sub.unsubscribe());
  }

  cargarNotificaciones() {
    const subNotificaciones = this.notificacionesService.obtenerNotificaciones()
      .subscribe(notificaciones => {
        console.log('📨 Notificaciones recibidas en componente:', notificaciones.length);
        // Filtrar tipos y estados no deseados desde el inicio
        this.notificaciones = notificaciones.filter(n => {
          const tipo = (n.tipo || '').toLowerCase();
          const estado = (n.nombreEstadoTarea || n.estado || '').toLowerCase();
          // Excluir todas las notificaciones de tipo 'validacion' y 'licitacion'
          if (tipo === 'validacion' || tipo === 'licitacion') {
            return false;
          }
          return estado !== 'sin estado';
        });
        // Debug: mostrar las notificaciones recibidas
        if (this.notificaciones.length > 0) {
          console.log('🔍 Primera notificación:', this.notificaciones[0]);
          const tipos = this.notificaciones.map(n => n.tipo);
          console.log('📋 Tipos en las notificaciones:', tipos);
        }
        this.aplicarFiltros();
      });

    const subConteo = this.notificacionesService.obtenerConteoNoLeidas()
      .subscribe(conteo => {
        console.log('🔢 Conteo no leídas actualizado:', conteo);
        this.conteoNoLeidas = conteo;
      });

    this.subscripciones.push(subNotificaciones, subConteo);
  }

  /**
   * Actualiza las notificaciones completas (tareas)
   */
  actualizarNotificacionesCompletas() {
    const usuario = this.obtenerUsuarioActual();
    console.log('🔄 actualizarNotificacionesCompletas llamado. Usuario:', usuario);
    if (usuario && usuario.idUsuario) {
      console.log('🔄 Actualizando notificaciones completas de tareas... ID usuario:', usuario.idUsuario);
      
      // Usar el método del servicio que genera notificaciones de tareas
      this.notificacionesService.generarNotificacionesCompletas(usuario.idUsuario);
      
      // Generar notificaciones de subproyectos pendientes de validación
      this.notificacionesService.generarNotificacionesSubproyectosPendientes(usuario.idUsuario);
    } else {
      console.warn('⚠️ No se puede actualizar notificaciones: usuario no válido');
    }
  }

  /**
   * Método legacy mantenido para compatibilidad
   */
  actualizarNotificacionesDeTareas() {
    const usuario = this.obtenerUsuarioActual();
    if (usuario && usuario.idUsuario) {
      console.log('Actualizando notificaciones usando el mismo servicio que Mis Tareas...');
      
      // Verificar si el usuario puede ver todas las tareas (jolivares o gerencia)
      const esJolivares = usuario.nombreUsuario && 
        usuario.nombreUsuario.toLowerCase().includes('jolivares');
      const esGerencia = usuario.idPerfil === 1 || 
        usuario.idPerfil === 2 || 
        usuario.idPerfil === 11;
      
      const puedeVerTodas = usuario && (esJolivares || esGerencia);
      console.log(`Usuario: ${usuario.nombreUsuario}, Puede ver todas las tareas: ${puedeVerTodas}`);

      if (puedeVerTodas) {
        // Para jolivares y gerencia, obtener tareas de múltiples usuarios
        this.obtenerTareasGlobalesParaNotificaciones(usuario);
      } else {
        // USAR EXACTAMENTE LA MISMA LÓGICA QUE MIS TAREAS
        this.spMisTareasService.getMis_TareasbyIdUsuario(usuario.idUsuario)
          .subscribe(
            (tareas) => {
              if (tareas && Array.isArray(tareas)) {
                console.log('=== SINCRONIZACIÓN NOTIFICACIONES ===');
                console.log('Tareas obtenidas del servicio:', tareas.length);
                
                // INCLUIR TODAS LAS TAREAS (incluyendo canceladas) para que los filtros funcionen
                // Filtrar solo por permisos, NO por estado (el estado se filtra en la UI)
                const tareasFiltradas = tareas.filter(el => {
                  const esResponsable = el.idUsuarioResponsable == usuario.idUsuario;
                  const esCreador = el.idUsuarioCreador == usuario.idUsuario;
                  return esResponsable || esCreador;
                });
                
                console.log('=== NOTIFICACIONES CON TODAS LAS TAREAS ===');
                console.log('Total tareas del usuario (todas):', tareasFiltradas.length);
                console.log('Activas:', tareasFiltradas.filter(t => t.idEstadoTarea == 1 || t.idEstadoTarea == 2).length);
                console.log('Canceladas:', tareasFiltradas.filter(t => t.idEstadoTarea == 3).length);
                console.log('Usuario es responsable O creador');
                
                // Crear notificaciones directamente aquí
                this.crearNotificacionesDirectas(tareasFiltradas, usuario.idUsuario);
              }
            },
            (error) => {
              console.error('Error al obtener tareas para notificaciones:', error);
            }
          );
      }
    }
  }

  // Método para obtener tareas de múltiples usuarios (jolivares y gerencia)
  private obtenerTareasGlobalesParaNotificaciones(usuario: any) {
    console.log('Obteniendo tareas globales para notificaciones de usuario privilegiado:', usuario.nombreUsuario);
    
    const usuariosComunes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    let todasLasTareas = [];
    let usuariosProcessados = 0;
    
    usuariosComunes.forEach((idUsuarioTareas) => {
      this.spMisTareasService.getMis_TareasbyIdUsuario(idUsuarioTareas)
        .subscribe(
          (tareas) => {
            usuariosProcessados++;
            
            if (tareas && Array.isArray(tareas)) {
              // INCLUIR TODAS LAS TAREAS (incluyendo canceladas) para filtros
              console.log(`Usuario ${idUsuarioTareas}: ${tareas.length} tareas (todas incluidas)`);
              console.log(`  - Activas: ${tareas.filter(t => t.idEstadoTarea == 1 || t.idEstadoTarea == 2).length}`);
              console.log(`  - Canceladas: ${tareas.filter(t => t.idEstadoTarea == 3).length}`);
              todasLasTareas = todasLasTareas.concat(tareas);
            }
            
            // Si ya procesamos todos los usuarios, crear notificaciones
            if (usuariosProcessados >= usuariosComunes.length) {
              // Eliminar duplicados por idTarea
              const tareasUnicas = todasLasTareas.filter((tarea, index, self) => 
                index === self.findIndex(t => t.idTarea === tarea.idTarea)
              );
              
              console.log('=== NOTIFICACIONES (GERENCIA) - TODAS LAS TAREAS ===');
              console.log('Total tareas globales únicas:', tareasUnicas.length);
              console.log('Activas disponibles:', tareasUnicas.filter(t => t.idEstadoTarea == 1 || t.idEstadoTarea == 2).length);
              console.log('Canceladas disponibles:', tareasUnicas.filter(t => t.idEstadoTarea == 3).length);
              console.log('Filtrado por estado se aplica en la UI');
              this.crearNotificacionesDirectas(tareasUnicas, usuario.idUsuario);
            }
          },
          (error) => {
            usuariosProcessados++;
            console.log(`Error obteniendo tareas del usuario ${idUsuarioTareas}:`, error);
            
            // Si terminamos de procesar todos, continuar con lo que tengamos
            if (usuariosProcessados >= usuariosComunes.length && todasLasTareas.length > 0) {
              const tareasUnicas = todasLasTareas.filter((tarea, index, self) => 
                index === self.findIndex(t => t.idTarea === tarea.idTarea)
              );
              console.log('Total tareas globales únicas (con errores):', tareasUnicas.length);
              this.crearNotificacionesDirectas(tareasUnicas, usuario.idUsuario);
            }
          }
        );
    });
  }

  private obtenerUsuarioActual() {
    try {
      if (localStorage.hasOwnProperty('usuario')) {
        return JSON.parse(localStorage.usuario);
      }
    } catch (error) {
      console.error('Error al obtener usuario:', error);
    }
    return null;
  }

  aplicarFiltros() {
    console.log('🔍 Aplicando filtros a', this.notificaciones.length, 'notificaciones');
    console.log('🔧 Filtros aplicados:', {
      tipo: this.filtroTipoNotificacion,
      prioridad: this.filtroTipo,
      estado: this.filtroEstado,
      busqueda: this.busqueda
    });
    
    // Debug: mostrar cuántas canceladas hay en el total
    const totalCanceladas = this.notificaciones.filter(notif => {
      const estadoTarea = (notif.nombreEstadoTarea || '').toLowerCase();
      const estadoGeneral = (notif.estado || '').toLowerCase();
      const estadoFinal = estadoTarea || estadoGeneral;
      return estadoFinal.includes('cancelad');
    }).length;
    console.log('📊 Total de tareas canceladas disponibles:', totalCanceladas);
    
    let resultado = [...this.notificaciones]
      // Excluir tipos y estados no deseados en cada filtrado
      .filter(notif => {
        const tipo = (notif.tipo || '').toLowerCase();
        const estado = (notif.nombreEstadoTarea || notif.estado || '').toLowerCase();
        return tipo !== 'validacion' && estado !== 'sin estado';
      });

    // PRIMERO: Filtrar las tareas canceladas (solo mostrarlas si se filtran específicamente)
    if (this.filtroEstado !== 'canceladas') {
      resultado = resultado.filter(notif => {
        // Excluir tareas canceladas si no se está filtrando específicamente por ellas
        const estadoTarea = (notif.nombreEstadoTarea || '').toLowerCase();
        const estadoGeneral = (notif.estado || '').toLowerCase();
        const estadoFinal = estadoTarea || estadoGeneral;
        
        return !estadoFinal.includes('cancelad');
      });
      console.log('🚫 Después de excluir canceladas (sin filtro específico):', resultado.length);
    }
    
    // Filtro por tipo de notificación
    if (this.filtroTipoNotificacion && this.filtroTipoNotificacion !== 'todas') {
      resultado = resultado.filter(notif => {
        const tipo = (notif.tipo || '').toLowerCase();
        return tipo === this.filtroTipoNotificacion.toLowerCase();
      });
      console.log('📋 Después de filtro por tipo:', resultado.length);
    }
    
    // Filtro por prioridad
    if (this.filtroTipo && this.filtroTipo !== 'todas') {
      resultado = resultado.filter(notif => {
        const prioridad = (notif.prioridad || '').toLowerCase();
        return prioridad === this.filtroTipo.toLowerCase();
      });
      console.log('⚡ Después de filtro por prioridad:', resultado.length);
    }
    
    // Filtro por estado (usando diferentes campos según el tipo de notificación)
    if (this.filtroEstado && this.filtroEstado !== 'todas') {
      resultado = resultado.filter(notif => {
        const estadoTarea = (notif.nombreEstadoTarea || '').toLowerCase();
        const estadoGeneral = (notif.estado || '').toLowerCase();
        const estadoFinal = estadoTarea || estadoGeneral;
        const estadoNormalizado = this.normalizarEstado(estadoFinal);
        const filtroNormalizado = this.normalizarEstado(this.filtroEstado.toLowerCase());
        
        return estadoNormalizado === filtroNormalizado;
      });
      console.log('📊 Después de filtro por estado específico:', resultado.length, '(filtro:', this.filtroEstado, ')');
    }
    
    // Filtro por búsqueda de texto
    if (this.busqueda && this.busqueda.trim()) {
      const busquedaLower = this.busqueda.toLowerCase().trim();
      resultado = resultado.filter(notif => {
        const titulo = (notif.titulo || '').toLowerCase();
        const descripcion = (notif.descripcion || '').toLowerCase();
        const nombreSubProyecto = (notif.nombreSubProyecto || '').toLowerCase();
        return titulo.includes(busquedaLower) || 
               descripcion.includes(busquedaLower) || 
               nombreSubProyecto.includes(busquedaLower);
      });
      console.log('🔍 Después de filtro por búsqueda:', resultado.length);
    }
    
    // Ordenar por fecha (más recientes primero)
    resultado.sort((a, b) => {
      const valorA = new Date(a.fechaCreacionTarea || a.fechaCreacion).getTime();
      const valorB = new Date(b.fechaCreacionTarea || b.fechaCreacion).getTime();
      
      if (this.ordenarPor === 'fechaCreacion') {
        return this.ordenAscendente ? valorA - valorB : valorB - valorA;
      } else if (this.ordenarPor === 'prioridad') {
        const prioridadA = this.getPrioridadNumerica(a.prioridad);
        const prioridadB = this.getPrioridadNumerica(b.prioridad);
        return this.ordenAscendente ? prioridadA - prioridadB : prioridadB - prioridadA;
      }
      
      return valorB - valorA; // Por defecto más recientes primero
    });

    this.notificacionesFiltradas = resultado;
    this.paginaActual = 1;
    
    console.log('✅ Notificaciones filtradas:', this.notificacionesFiltradas.length);
  }
  
  // Método auxiliar para normalizar estados
  private normalizarEstado(estado: string): string {
    if (!estado) return '';
    
    const estadoLimpio = estado.toLowerCase().trim();
    const estadosMap: { [key: string]: string } = {
      // Estados de tareas
      'pendiente': 'pendiente',
      'en proceso': 'enproceso',
      'enproceso': 'enproceso',
      'en_proceso': 'enproceso',
      'en progreso': 'enproceso',
      'enprogreso': 'enproceso',
      'proceso': 'enproceso',
      'activa': 'enproceso',
      'activo': 'enproceso',
      
      // Estados cancelados/cerrados
      'cancelada': 'canceladas',
      'cancelado': 'canceladas',
      'canceladas': 'canceladas',
      'cerrada': 'canceladas',
      'cerrado': 'canceladas',
      'finalizada': 'canceladas',
      'finalizado': 'canceladas',
      'terminada': 'canceladas',
      'terminado': 'canceladas',
      'completada': 'canceladas',
      'completado': 'canceladas'
    };
    
    return estadosMap[estadoLimpio] || estadoLimpio;
  }
  
  // Método auxiliar para obtener valor numérico de prioridad
  private getPrioridadNumerica(prioridad: string): number {
    const prioridadMap: { [key: string]: number } = {
      'alta': 3,
      'media': 2,
      'baja': 1
    };
    
    return prioridadMap[(prioridad || '').toLowerCase()] || 0;
  }

  ordenarPorColumna(columna: string) {
    console.log('🔄 Ordenando por columna:', columna);
    if (this.ordenarPor === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenarPor = columna;
      this.ordenAscendente = false;
    }
    this.aplicarFiltros();
  }

  get notificacionesPaginadas(): mNotificacion[] {
    if (!this.notificacionesFiltradas || !Array.isArray(this.notificacionesFiltradas)) {
      return [];
    }
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.notificacionesFiltradas.slice(inicio, fin);
  }

  get totalPaginas(): number {
    if (!this.notificacionesFiltradas || !Array.isArray(this.notificacionesFiltradas)) {
      return 1;
    }
    return Math.ceil(this.notificacionesFiltradas.length / this.itemsPorPagina);
  }

  irAPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  marcarComoLeida(notificacion: mNotificacion) {
    if (!notificacion.leida) {
      this.notificacionesService.marcarComoLeida(notificacion.id);
    }
  }

  marcarTodasComoLeidas() {
    this.notificacionesService.marcarTodasComoLeidas();
  }

  eliminarNotificacion(notificacion: mNotificacion) {
    if (confirm('¿Estás seguro de que deseas eliminar esta notificación?')) {
      this.notificacionesService.eliminarNotificacion(notificacion.id);
    }
  }

  limpiarNotificacionesLeidas() {
    if (confirm('¿Estás seguro de que deseas eliminar todas las notificaciones leídas?')) {
      this.notificacionesService.limpiarNotificacionesLeidas();
    }
  }

  navegarANotificacion(notificacion: mNotificacion, event?: Event) {
    // Evitar que otros handlers (o enlaces por defecto) intercepten el click
    if (event) {
      try {
        event.stopPropagation();
        event.preventDefault();
      } catch (err) {
        // algunos entornos pueden lanzar si el event es nulo o inmutable
      }
    }

    this.marcarComoLeida(notificacion);
    if (notificacion.enlace) {
      // Solo navegar a Tablero-Control si la tarea tiene origen tablero-control y subproyecto válido
      if (
        notificacion["idSubProyecto"] &&
        notificacion["idSubProyecto"] > 0 &&
        notificacion["origen"] === 'tablero-control'
      ) {
        this.router.navigate([`/Tablero-Control/${notificacion["idSubProyecto"]}`], {
          queryParams: {
            destacarTarea: notificacion.idReferencia,
            tab: 'tareas'
          }
        });
      } else {
        // Todas las demás notificaciones van a Ver-Tareas y destacan la tarea
        if (notificacion.enlace !== '/Ver-Tareas') {
          notificacion.enlace = '/Ver-Tareas';
        }
        if (notificacion.tipo === 'tarea' && notificacion.idReferencia) {
          const queryParams = {
            destacarTarea: notificacion.idReferencia,
            tab: 'tareas'
          };
          // Navegar usando Router y forzar reemplazo de historia para evitar dobles handlers
          this.router.navigate([notificacion.enlace], { queryParams });
        } else {
          this.router.navigate([notificacion.enlace]);
        }
      }
    }
  }

  obtenerIconoPrioridad(prioridad: string): string {
    switch (prioridad) {
      case 'alta': return 'fa-exclamation-circle text-danger';
      case 'media': return 'fa-info-circle text-warning';
      case 'baja': return 'fa-circle text-success';
      default: return 'fa-circle text-muted';
    }
  }

  obtenerIconoTipo(tipo: string): string {
    switch (tipo) {
      case 'tarea': return 'fa-tasks';
      case 'proyecto': return 'fa-folder-open';
      case 'reunion': return 'fa-calendar';
      case 'vencimiento': return 'fa-clock-o';
      case 'ritmo': return 'fa-clock-o';
      case 'validacion': return 'fa-check-circle';
      case 'bitacora': return 'fa-file-text-o';
      default: return 'fa-bell';
    }
  }

  obtenerTextoTipo(tipo: string): string {
    switch (tipo) {
      case 'tarea': return 'Tarea';
      case 'proyecto': return 'Proyecto';
      case 'reunion': return 'Reunión';
      case 'vencimiento': return 'Vencimiento';
      case 'general': return 'General';
      case 'ritmo': return 'Ritmo';
      case 'validacion': return 'Validación';
      case 'bitacora': return 'Bitácora';
      default: return tipo;
    }
  }

  estaVencida(notificacion: mNotificacion): boolean {
    const fecha = notificacion.fechaCompromiso || notificacion.fechaVencimiento;
    if (!fecha) return false;
    return new Date(fecha) < new Date();
  }

  diasHastaVencimiento(notificacion: mNotificacion): number {
    const fecha = notificacion.fechaCompromiso || notificacion.fechaVencimiento;
    if (!fecha) return 0;
    const ahora = new Date();
    const vencimiento = new Date(fecha);
    const diferencia = vencimiento.getTime() - ahora.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  actualizarNotificaciones() {
    this.actualizarNotificacionesCompletas();
  }

  debugNotificaciones() {
    console.log('🐛 DEBUG NOTIFICACIONES:');
    console.log('📊 Total notificaciones:', this.notificaciones.length);
    console.log('🔍 Notificaciones filtradas:', this.notificacionesFiltradas.length);
    console.log('📋 Estado de filtros:', {
      tipoNotificacion: this.filtroTipoNotificacion,
      prioridad: this.filtroTipo,
      estado: this.filtroEstado,
      busqueda: this.busqueda
    });
    console.log('📄 Notificaciones completas:', this.notificaciones);
    console.log('🎯 Notificaciones filtradas:', this.notificacionesFiltradas);
  }

  onFiltroChange() {
    this.aplicarFiltros();
  }

  onBusquedaChange() {
    this.aplicarFiltros();
  }

  limpiarFiltros() {
    // Resetear todos los filtros a sus valores por defecto
    this.filtroTipoNotificacion = 'todas';
    this.filtroTipo = 'todas';
    this.filtroEstado = 'todas';
    this.busqueda = '';
    this.paginaActual = 1;
    
    // Aplicar filtros con los valores resetados
    this.aplicarFiltros();
    
    console.log('Filtros limpiados - mostrando todas las notificaciones activas');
  }

  volverAMisTareas() {
    // Navegar a la página de Mis Tareas
    this.router.navigate(['/Ver-Tareas']);
    console.log('Navegando a Mis Tareas');
  }

  crearNotificacionesDirectas(tareas: any[], idUsuario: number) {
    const notificacionesActuales = this.notificaciones.filter(n => n.tipo !== 'tarea');
    const nuevasNotificaciones: mNotificacion[] = [];
    const ahora = new Date();
    let tareasPendientes = tareas.length;
    if (tareasPendientes === 0) {
      this.notificaciones = [...notificacionesActuales];
      this.aplicarFiltros();
      return;
    }
    tareas.forEach(tarea => {
      // Si la tarea no tiene campo 'origen', asignar según si tiene subproyecto
      if (!('origen' in tarea)) {
        if (tarea.idDetalleSubProyecto && tarea.idDetalleSubProyecto > 0) {
          tarea.origen = 'tablero-control';
        } else {
          tarea.origen = 'mis-tareas';
        }
      }
      const notificacion = new mNotificacion();
      notificacion.id = Date.now() + Math.random(); // ID temporal único
      notificacion.idUsuario = idUsuario;
      notificacion.tipo = 'tarea';
      // Mostrar el origen en el título para diferenciar visualmente
      let destinoLabel = '';
      // No prefix for any task titles — keep titles concise
      destinoLabel = '';
      notificacion.titulo = `${destinoLabel}Tarea: ${tarea.descripcionTarea || tarea.nombreTarea || 'Sin nombre'}`;
      notificacion.descripcion = tarea.observacionTarea || tarea.descripcionTarea || 'Sin descripción';
      notificacion.fechaCreacion = new Date();
      // Prefer task's creation date to display in the Fecha column
      if (tarea.fechaCreacion) {
        notificacion.fechaCreacionTarea = new Date(tarea.fechaCreacion);
      }
      notificacion.idReferencia = tarea.idTarea;
      notificacion.tipoReferencia = 'tarea';
      notificacion.enlace = '/Ver-Tareas';
      // Propagar el idEstadoTarea para que la plantilla pueda mostrar la misma clase/icono
      if (tarea.idEstadoTarea !== undefined && tarea.idEstadoTarea !== null) {
        notificacion.idEstadoTarea = tarea.idEstadoTarea;
      }
      // Asignar estado visible en la notificación si viene de la tarea
      if (tarea.nombreEstadoTarea) {
        notificacion.nombreEstadoTarea = tarea.nombreEstadoTarea;
      }
      // Asignar origen si la tarea viene de tablero-control
      if (tarea.origen === 'tablero-control') {
        notificacion["origen"] = 'tablero-control';
      } else {
        notificacion["origen"] = 'mis-tareas';
      }

      // Verificar si está vencida
      // Asignar fecha de compromiso si existe (fechaTerminoProgramado), si no, usar fechaVencimiento
      if (tarea.fechaTerminoProgramado) {
        const fechaCompromiso = new Date(tarea.fechaTerminoProgramado);
        notificacion.fechaCompromiso = fechaCompromiso;
      } else if (tarea.fechaVencimiento) {
        const fechaVencimiento = new Date(tarea.fechaVencimiento);
        notificacion.fechaVencimiento = fechaVencimiento;
      }
      // Verificar si está vencida (usar fechaCompromiso preferentemente)
      const fechaCheck = notificacion.fechaCompromiso || notificacion.fechaVencimiento;
      if (fechaCheck) {
        const fechaObj = new Date(fechaCheck);
        if (fechaObj < ahora) {
          notificacion.prioridad = 'alta';
          notificacion.titulo = `${destinoLabel}⚠️ VENCIDA: ${tarea.descripcionTarea || tarea.nombreTarea}`;
          notificacion.colorFondo = '';
          notificacion.colorTexto = '#dc3545';
          notificacion.icono = 'fa-exclamation-triangle';
        } else {
          const diasRestantes = Math.ceil((fechaObj.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
          if (diasRestantes <= 3) {
            notificacion.prioridad = 'alta';
            notificacion.titulo = `${destinoLabel}🔔 Próxima a vencer: ${tarea.descripcionTarea || tarea.nombreTarea}`;
            notificacion.colorFondo = '';
            notificacion.colorTexto = '#026aa7';
            notificacion.icono = 'fa-clock-o';
          } else {
            // Usar prioridad de la tarea si existe, sino 'media' por defecto
            if (tarea.prioridad) {
              switch (tarea.prioridad) {
                case 3:
                case 'alta':
                  notificacion.prioridad = 'alta';
                  break;
                case 2:
                case 'media':
                  notificacion.prioridad = 'media';
                  break;
                case 1:
                case 'baja':
                  notificacion.prioridad = 'baja';
                  break;
                default:
                  notificacion.prioridad = 'media';
              }
            } else {
              notificacion.prioridad = 'media';
            }
            
            notificacion.titulo = `${destinoLabel}Tarea: ${tarea.descripcionTarea || tarea.nombreTarea || 'Sin nombre'}`;
            notificacion.colorFondo = '';
            notificacion.colorTexto = '#026aa7';
            notificacion.icono = 'fa-tasks';
          }
        }
      } else {
        // Usar prioridad de la tarea si existe, sino 'media' por defecto
        if (tarea.prioridad) {
          // Convertir prioridad numérica a texto si es necesario
          switch (tarea.prioridad) {
            case 3:
            case 'alta':
              notificacion.prioridad = 'alta';
              break;
            case 2:
            case 'media':
              notificacion.prioridad = 'media';
              break;
            case 1:
            case 'baja':
              notificacion.prioridad = 'baja';
              break;
            default:
              notificacion.prioridad = 'media';
          }
        } else {
          notificacion.prioridad = 'media';
        }
        
        notificacion.titulo = `${destinoLabel}Tarea: ${tarea.descripcionTarea || tarea.nombreTarea || 'Sin nombre'}`;
        notificacion.colorFondo = '';
        notificacion.colorTexto = '#026aa7';
        notificacion.icono = 'fa-tasks';
      }

      // Si la tarea tiene subproyecto, agregar info SOLO si el idSubProyecto es válido (>0)
      if (tarea.idDetalleSubProyecto && tarea.idDetalleSubProyecto > 0) {
        this.sDetalleSubProyecto.getDetalleSubProyectobyID(tarea.idDetalleSubProyecto).subscribe(detalle => {
          if (detalle && detalle.idSubProyecto && detalle.idSubProyecto > 0) {
            this.sSubProyecto.getSubProyectobyID(detalle.idSubProyecto).subscribe(subproyecto => {
              if (subproyecto && subproyecto.idSubProyecto && subproyecto.idSubProyecto > 0 && subproyecto.nombreSubProyecto) {
                notificacion.titulo += ` (Subproyecto: ${subproyecto.nombreSubProyecto})`;
                notificacion["idSubProyecto"] = subproyecto.idSubProyecto;
                notificacion["nombreSubProyecto"] = subproyecto.nombreSubProyecto;
                // Solo si la tarea viene de Tablero-Control, el enlace será Tablero-Control
                if (tarea.origen === 'tablero-control') {
                  notificacion.enlace = `/Tablero-Control/${subproyecto.idSubProyecto}`;
                }
              }
              nuevasNotificaciones.push(notificacion);
              tareasPendientes--;
              if (tareasPendientes === 0) {
                this.notificaciones = [...nuevasNotificaciones, ...notificacionesActuales];
                // Mostrar primero las más recientes (por fecha de creación de la tarea)
                this.ordenarPor = 'fechaCreacion';
                this.ordenAscendente = false;
                this.aplicarFiltros();
                console.log(`Creadas ${nuevasNotificaciones.length} notificaciones de tareas`);
              }
            });
          } else {
            // No es válido, eliminar idSubProyecto y dejar enlace a Ver-Tareas
            delete notificacion["idSubProyecto"];
            notificacion.enlace = '/Ver-Tareas';
            nuevasNotificaciones.push(notificacion);
            tareasPendientes--;
            if (tareasPendientes === 0) {
              this.notificaciones = [...nuevasNotificaciones, ...notificacionesActuales];
              // Mostrar primero las más recientes (por fecha de creación de la tarea)
              this.ordenarPor = 'fechaCreacion';
              this.ordenAscendente = false;
              this.aplicarFiltros();
              console.log(`Creadas ${nuevasNotificaciones.length} notificaciones de tareas`);
            }
          }
        });
      } else {
  // No tiene subproyecto, eliminar idSubProyecto y dejar enlace a Ver-Tareas
  delete notificacion["idSubProyecto"];
  notificacion.enlace = '/Ver-Tareas';
        nuevasNotificaciones.push(notificacion);
        tareasPendientes--;
        if (tareasPendientes === 0) {
          this.notificaciones = [...nuevasNotificaciones, ...notificacionesActuales];
          // Mostrar primero las más recientes (por fecha de creación de la tarea)
          this.ordenarPor = 'fechaCreacion';
          this.ordenAscendente = false;
          this.aplicarFiltros();
          console.log(`Creadas ${nuevasNotificaciones.length} notificaciones de tareas`);
        }
      }
    });
  }


  }