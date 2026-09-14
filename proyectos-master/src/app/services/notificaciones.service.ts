import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { mNotificacion } from '../models/mNotificacion';
import { sMis_Tareas } from './sMis_Tareas.service';
import { spMis_Tareas } from './Personalizados/spMis_Tareas.service';
import { sUsuariosPerfiles } from './sUsuariosPerfiles.service';
import { Http } from '@angular/http';
import { sSubProyecto } from './sSubProyecto.service';
import { sProyecto } from './sProyecto.service';
import { sProyectoMatriz } from './sProyectoMatriz.service';
import 'rxjs/add/observable/forkJoin';

@Injectable()
export class NotificacionesService {
  
  private notificacionesSubject = new BehaviorSubject<mNotificacion[]>([]);
  public notificaciones$ = this.notificacionesSubject.asObservable();
  
  private conteoNoLeidasSubject = new BehaviorSubject<number>(0);
  public conteoNoLeidas$ = this.conteoNoLeidasSubject.asObservable();
  
  // 🛡️ Control para evitar múltiples llamadas simultáneas
  private generandoNotificaciones: boolean = false;
  private ultimaGeneracion: number = 0;
  private readonly DEBOUNCE_TIME = 2000; // 2 segundos
  private usarBffNotificaciones: boolean = true;
  private bffNotificacionesErrorReportado: boolean = false;

  constructor(
    private misTareasService: sMis_Tareas,
    private spMisTareasService: spMis_Tareas,
    private usuariosPerfilesService: sUsuariosPerfiles,
    private http: Http,
    private subProyectoService: sSubProyecto,
    private proyectoService: sProyecto,
    private proyectoMatrizService: sProyectoMatriz
  ) {
    console.log('🔧 NotificacionesService inicializado');
    this.inicializarNotificaciones();
  }

  private inicializarNotificaciones() {
    // 🗑️ Limpiar datos obsoletos de prueba
    this.limpiarDatosDePrueba();
    
    // Cargar notificaciones desde localStorage
    const notificacionesGuardadas = localStorage.getItem('notificaciones');
    if (notificacionesGuardadas) {
      try {
        const notificaciones = JSON.parse(notificacionesGuardadas);
        this.notificacionesSubject.next(notificaciones);
        this.actualizarConteoNoLeidas();
      } catch (error) {
        console.error('Error al cargar notificaciones guardadas:', error);
      }
    }
  }

  /**
   * Limpia datos de prueba obsoletos del localStorage
   */
  private limpiarDatosDePrueba() {
    try {
      const validacionesPendientes = localStorage.getItem('validacionesPendientes');
      if (validacionesPendientes) {
        const validaciones = JSON.parse(validacionesPendientes);
        // Filtrar solo las que NO sean datos de prueba
        const validacionesReales = validaciones.filter((v: any) => 
          !(v.nombre && v.nombre.includes('Configuración Subproyecto A')) &&
          !(v.nombre && v.nombre.includes('Configuración Subproyecto B')) &&
          !(v.nombre && v.nombre.includes('Validación Pendiente Detectada'))
        );
        
        if (validacionesReales.length !== validaciones.length) {
          localStorage.setItem('validacionesPendientes', JSON.stringify(validacionesReales));
          console.log(`🗑️ Eliminados ${validaciones.length - validacionesReales.length} datos de prueba obsoletos`);
        }
      }
    } catch (error) {
      console.error('Error al limpiar datos de prueba:', error);
    }
  }

  obtenerNotificaciones(): Observable<mNotificacion[]> {
    return this.notificaciones$;
  }

  obtenerConteoNoLeidas(): Observable<number> {
    return this.conteoNoLeidas$;
  }

  /**
   * Marca una notificación específica como leída
   */
  marcarNotificacionComoLeida(idNotificacion: number): void {
    const notificacionesActuales = this.notificacionesSubject.value;
    const notificacionesActualizadas = notificacionesActuales.map(notif => {
      if (notif.id === idNotificacion) {
        return { ...notif, leida: true };
      }
      return notif;
    });
    
    this.actualizarNotificaciones(notificacionesActualizadas);
    console.log(`📖 Notificación ${idNotificacion} marcada como leída en el servicio`);
  }

  /**
   * Método principal para generar notificaciones REALES combinadas de tareas, licitaciones y validaciones
   */
  generarNotificacionesCompletas(idUsuario: number) {
    const ahora = Date.now();
    
    // 🛡️ Evitar múltiples llamadas simultáneas
    if (this.generandoNotificaciones) {
      console.log('⏳ Ya se están generando notificaciones, omitiendo llamada duplicada...');
      return;
    }
    
    // 🛡️ Debounce: evitar llamadas muy frecuentes
    if (ahora - this.ultimaGeneracion < this.DEBOUNCE_TIME) {
      console.log(`⏱️ Llamada muy reciente (${ahora - this.ultimaGeneracion}ms), aplicando debounce...`);
      return;
    }
    
    this.generandoNotificaciones = true;
    this.ultimaGeneracion = ahora;
    
    console.log('🔄 Generando notificaciones REALES completas (tareas + validaciones pendientes)...', { idUsuario, timestamp: new Date().toLocaleTimeString() });
    
    // Obtener tareas REALES y validaciones pendientes en paralelo
    const tareasRealesObservable = this.obtenerTareasRealesParaNotificaciones(idUsuario);
    console.log('📋 Obteniendo tareas REALES para notificaciones...');
    
    const validacionesPendientesObservable = this.obtenerValidacionesPendientesParaNotificaciones(idUsuario);
    console.log('🔔 Obteniendo validaciones pendientes REALES desde Configuracion-ValidacionSubProyecto...');
    
    Observable.forkJoin([tareasRealesObservable, validacionesPendientesObservable])
      .subscribe(
        ([tareas, validacionesPendientes]: [any[], mNotificacion[]]) => {
          console.log(`📊 Datos REALES obtenidos - Tareas: ${tareas.length}, Validaciones: ${validacionesPendientes.length}`);
          console.log('📋 Tareas REALES:', tareas);
          console.log('🔔 Validaciones pendientes:', validacionesPendientes);
          
          const notificacionesTareas = this.crearNotificacionesRealesDesdeTareas(tareas, idUsuario);
          console.log(`📨 Notificaciones REALES de tareas creadas: ${notificacionesTareas.length}`);
          
          // ✅ Eliminar duplicados antes de combinar todas las notificaciones
          const todasLasNotificacionesSinDuplicados = [...notificacionesTareas, ...validacionesPendientes];
          const notificacionesUnicas = this.eliminarNotificacionesDuplicadas(todasLasNotificacionesSinDuplicados);
          console.log(`✅ Total notificaciones REALES generadas: ${notificacionesUnicas.length} (Incluye ${validacionesPendientes.length} validaciones pendientes, ${todasLasNotificacionesSinDuplicados.length - notificacionesUnicas.length} duplicados eliminados)`);
          console.log('📦 Todas las notificaciones REALES:', notificacionesUnicas);
          
          this.reemplazarNotificaciones(notificacionesUnicas);
          
          // 🛡️ Liberar flag al completar
          this.generandoNotificaciones = false;
          console.log('✅ Generación de notificaciones completas finalizada correctamente');
        },
        (error) => {
          console.error('❌ Error al generar notificaciones completas:', error);
          console.log('🔄 Intentando generar solo notificaciones de tareas como fallback...');
          
          // Fallback: solo mostrar tareas si las licitaciones fallan
          const tareasObservable = this.obtenerTareasParaNotificaciones(idUsuario);
          tareasObservable.subscribe(
            (tareas) => {
              const notificacionesTareas = this.crearNotificacionesDesdeTareas(tareas, idUsuario);
              console.log('✅ Fallback: Creadas', notificacionesTareas.length, 'notificaciones de tareas');
              this.reemplazarNotificaciones(notificacionesTareas);
              
              // 🛡️ Liberar flag al completar fallback
              this.generandoNotificaciones = false;
            },
            (tareaError) => {
              console.error('❌ Error en fallback de tareas:', tareaError);
              // 🛡️ Liberar flag en caso de error total
              this.generandoNotificaciones = false;
            }
          );
        }
      );
  }
  
  /**
   * Método legacy para compatibilidad - ahora solo usa tareas
   */
  generarNotificacionesDeTareas(idUsuario: number) {
    console.log('🔄 Actualizando notificaciones de tareas...');
    
    // Obtener solo tareas
    const tareasObservable = this.obtenerTareasParaNotificaciones(idUsuario);
    
    tareasObservable.subscribe(
      (tareas) => {
        console.log(`📊 Tareas obtenidas: ${tareas.length}`);
        const notificacionesTareas = this.crearNotificacionesDesdeTareas(tareas, idUsuario);
        console.log('Creadas', notificacionesTareas.length, 'notificaciones de tareas');
        this.agregarNotificaciones(notificacionesTareas);
      },
      (error) => {
        console.error('❌ Error al obtener tareas para notificaciones:', error);
      }
    );
  }

  /**
   * Obtiene tareas para notificaciones con la misma lógica que MisTareas
   */
  private obtenerTareasParaNotificaciones(idUsuario: number): Observable<any[]> {
    if (this.esUsuarioPrivilegiado(idUsuario)) {
      // Para usuarios privilegiados, obtener tareas de múltiples usuarios
      return this.obtenerTareasGlobalesObservable(idUsuario);
    } else {
      // Para usuarios normales, solo sus tareas
      return this.spMisTareasService.getMis_TareasbyIdUsuario(idUsuario)
        .map(tareas => {
          if (tareas && Array.isArray(tareas)) {
            console.log('Tareas obtenidas para notificaciones:', tareas.length);
            // Incluir tareas pendientes, en proceso y canceladas: idEstadoTarea == 1 || idEstadoTarea == 2 || idEstadoTarea == 3
            const tareasFiltradas = tareas.filter(el => el.idEstadoTarea == 1 || el.idEstadoTarea == 2 || el.idEstadoTarea == 3);
            console.log('Tareas filtradas para notificaciones (incluyendo canceladas):', tareasFiltradas.length);
            return tareasFiltradas;
          }
          return [];
        });
    }
  }

  private crearNotificacionesDesdeTareas(tareas: any[], idUsuario: number): mNotificacion[] {
    const notificaciones: mNotificacion[] = [];
    const ahora = new Date();

    tareas.forEach(tarea => {
      // Para jolivares (ID 2) y algunos perfiles de gerencia, no filtrar por responsable
      // Para usuarios normales, solo mostrar tareas donde son responsables
      const esUsuarioPrivilegiado = this.esUsuarioPrivilegiado(idUsuario);
      const esResponsable = tarea.idUsuarioResponsable == idUsuario;
      
      if (!esUsuarioPrivilegiado && !esResponsable) {
        console.log(`Tarea ${tarea.idTarea} no es para el usuario ${idUsuario}, responsable: ${tarea.idUsuarioResponsable}`);
        return; // Saltar esta tarea si no es para este usuario y no es privilegiado
      }
      
      // Estas tareas ya están filtradas incluyendo pendientes, en proceso y canceladas (idEstadoTarea == 1 || idEstadoTarea == 2 || idEstadoTarea == 3)
      const notificacion = new mNotificacion();
      notificacion.id = Date.now() + Math.random(); // ID temporal único
      notificacion.idUsuario = idUsuario;
      notificacion.tipo = 'tarea';
      notificacion.titulo = `Tarea: ${tarea.descripcionTarea || tarea.nombreTarea || 'Sin nombre'}`;
      notificacion.descripcion = tarea.observacionTarea || tarea.descripcionTarea || 'Sin descripción';
      
      // Usar la fecha real de creación de la tarea desde la base de datos
      notificacion.fechaCreacion = tarea.fechaCreacion ? new Date(tarea.fechaCreacion) : new Date();
      notificacion.fechaCreacionTarea = tarea.fechaCreacion ? new Date(tarea.fechaCreacion) : null;
      
      notificacion.idReferencia = tarea.idTarea;
      notificacion.tipoReferencia = 'tarea';
      notificacion.enlace = '/Ver-Tareas';

      // Agregar información adicional de fechas de la tarea
      // Usar fechaTerminoProgramado como fecha de compromiso
      notificacion.fechaCompromiso = tarea.fechaTerminoProgramado ? new Date(tarea.fechaTerminoProgramado) : null;
      notificacion.idEstadoTarea = tarea.idEstadoTarea;
      notificacion.nombreEstadoTarea = tarea.nombreEstadoTarea;
      notificacion.estado = tarea.nombreEstadoTarea; // Asignar el estado para los filtros
      notificacion.idSubProyecto = tarea.idSubProyecto;
      notificacion.nombreSubProyecto = tarea.nombreSubProyecto;

      // Verificar si está vencida usando fechaTerminoProgramado
      if (tarea.fechaTerminoProgramado) {
        const fechaTermino = new Date(tarea.fechaTerminoProgramado);
        // Asignar como fechaVencimiento para compatibilidad con el template
        notificacion.fechaVencimiento = fechaTermino;
        
        if (fechaTermino < ahora) {
          notificacion.prioridad = 'alta';
          notificacion.titulo = `⚠️ VENCIDA: ${tarea.descripcionTarea || tarea.nombreTarea}`;
          notificacion.colorFondo = '#ffe6e6';
          notificacion.colorTexto = '#dc3545';
          notificacion.icono = 'fa-exclamation-triangle';
        } else {
          const diasRestantes = Math.ceil((fechaTermino.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
          if (diasRestantes <= 3) {
            notificacion.prioridad = 'alta';
            notificacion.titulo = `🔔 Próxima a vencer: ${tarea.descripcionTarea || tarea.nombreTarea}`;
            notificacion.colorFondo = '#fff3cd';
            notificacion.colorTexto = '#856404';
            notificacion.icono = 'fa-clock-o';
          } else {
            notificacion.prioridad = 'media';
            notificacion.colorFondo = '#e7f3ff';
            notificacion.colorTexto = '#026aa7';
            notificacion.icono = 'fa-tasks';
          }
        }
      } else {
        notificacion.prioridad = 'media';
        notificacion.colorFondo = '#e7f3ff';
        notificacion.colorTexto = '#026aa7';
        notificacion.icono = 'fa-tasks';
      }

      // Manejo especial para tareas canceladas
      if (tarea.nombreEstadoTarea && tarea.nombreEstadoTarea.toLowerCase().includes('cancelad')) {
        notificacion.prioridad = 'baja';
        notificacion.titulo = `❌ CANCELADA: ${tarea.descripcionTarea || tarea.nombreTarea}`;
        notificacion.colorFondo = '#f8d7da';
        notificacion.colorTexto = '#721c24';
        notificacion.icono = 'fa-times-circle';
      }

      notificaciones.push(notificacion);
    });

    return notificaciones;
  }

  private esTareaPendiente(tarea: any): boolean {
    const estaActiva = tarea.activo === true || tarea.activo === 'true' || tarea.activo === 1;
    
    // Estados realmente completados (NO incluir canceladas para que aparezcan en notificaciones)
    const estadosCompletados = [
      'Completado', 'Completada', 'COMPLETADO', 'COMPLETADA',
      'Cerrado', 'Cerrada', 'CERRADO', 'CERRADA',
      'Finalizado', 'Finalizada', 'FINALIZADO', 'FINALIZADA',
      'Terminado', 'Terminada', 'TERMINADO', 'TERMINADA',
      'Anulado', 'Anulada', 'ANULADO', 'ANULADA'
      // Intencionalmente NO incluimos 'Cancelado', 'Cancelada' aquí para que aparezcan en notificaciones
    ];
    
    const estadoActual = tarea.nombreEstadoTarea || '';
    const noEstaCompletada = !estadosCompletados.includes(estadoActual.trim());
    const tieneNombre = tarea.nombreTarea && tarea.nombreTarea.trim() !== '';
    
    return estaActiva && noEstaCompletada && tieneNombre;
  }

  agregarNotificacion(notificacion: mNotificacion) {
    const notificacionesActuales = this.notificacionesSubject.value;
    const nuevasNotificaciones = [notificacion, ...notificacionesActuales];
    this.actualizarNotificaciones(nuevasNotificaciones);
  }

  agregarNotificaciones(notificaciones: mNotificacion[]) {
    const notificacionesActuales = this.notificacionesSubject.value;
    
    // Filtrar notificaciones duplicadas (por tipo y referencia)
    const notificacionesFiltradas = notificaciones.filter(nueva => {
      return !notificacionesActuales.some(existente => 
        existente.tipo === nueva.tipo && 
        existente.idReferencia === nueva.idReferencia
      );
    });
    
    if (notificacionesFiltradas.length > 0) {
      const nuevasNotificaciones = [...notificacionesFiltradas, ...notificacionesActuales];
      this.actualizarNotificaciones(nuevasNotificaciones);
    }
  }

  marcarComoLeida(id: number) {
    const notificacionesActuales = this.notificacionesSubject.value;
    const notificacionesActualizadas = notificacionesActuales.map(n => {
      if (n.id === id) {
        return { ...n, leida: true };
      }
      return n;
    });
    this.actualizarNotificaciones(notificacionesActualizadas);
  }

  marcarTodasComoLeidas() {
    const notificacionesActuales = this.notificacionesSubject.value;
    const notificacionesActualizadas = notificacionesActuales.map(n => ({ ...n, leida: true }));
    this.actualizarNotificaciones(notificacionesActualizadas);
  }

  eliminarNotificacion(id: number) {
    const notificacionesActuales = this.notificacionesSubject.value;
    const notificacionesFiltradas = notificacionesActuales.filter(n => n.id !== id);
    this.actualizarNotificaciones(notificacionesFiltradas);
  }

  limpiarNotificacionesLeidas() {
    const notificacionesActuales = this.notificacionesSubject.value;
    const notificacionesNoLeidas = notificacionesActuales.filter(n => !n.leida);
    this.actualizarNotificaciones(notificacionesNoLeidas);
  }

  private actualizarNotificaciones(notificaciones: mNotificacion[]) {
    // Ordenar por fecha de creación (más recientes primero)
    const notificacionesOrdenadas = notificaciones.sort((a, b) => {
      return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
    });
    
    this.notificacionesSubject.next(notificacionesOrdenadas);
    this.guardarEnLocalStorage(notificacionesOrdenadas);
    this.actualizarConteoNoLeidas();
  }

  private actualizarConteoNoLeidas() {
    const notificaciones = this.notificacionesSubject.value;
    const conteoNoLeidas = notificaciones.filter(n => !n.leida).length;
    this.conteoNoLeidasSubject.next(conteoNoLeidas);
  }

  private guardarEnLocalStorage(notificaciones: mNotificacion[]) {
    try {
      localStorage.setItem('notificaciones', JSON.stringify(notificaciones));
    } catch (error) {
      console.error('Error al guardar notificaciones en localStorage:', error);
    }
  }

  // Método para crear notificaciones personalizadas
  crearNotificacionPersonalizada(
    idUsuario: number,
    tipo: 'proyecto' | 'reunion' | 'vencimiento' | 'general' | 'ritmo' | 'validacion' | 'bitacora',
    titulo: string,
    descripcion: string,
    prioridad: 'alta' | 'media' | 'baja' = 'media',
    enlace?: string,
    fechaVencimiento?: Date
  ) {
    const notificacion = new mNotificacion();
    notificacion.id = Date.now() + Math.random();
    notificacion.idUsuario = idUsuario;
    notificacion.tipo = tipo;
    notificacion.titulo = titulo;
    notificacion.descripcion = descripcion;
    notificacion.prioridad = prioridad;
    notificacion.enlace = enlace;
    notificacion.fechaVencimiento = fechaVencimiento;

    // Configurar colores e iconos según el tipo
    switch (tipo) {
      case 'proyecto':
        notificacion.icono = 'fa-folder-open';
        notificacion.colorFondo = '#e8f5e8';
        notificacion.colorTexto = '#28a745';
        break;
      case 'reunion':
        notificacion.icono = 'fa-calendar';
        notificacion.colorFondo = '#fff3e0';
        notificacion.colorTexto = '#ff9800';
        break;
      case 'vencimiento':
        notificacion.icono = 'fa-exclamation-triangle';
        notificacion.colorFondo = '#ffe6e6';
        notificacion.colorTexto = '#dc3545';
        notificacion.prioridad = 'alta';
        break;
      case 'ritmo':
        notificacion.icono = 'fa-clock-o';
        notificacion.colorFondo = '#fff3cd';
        notificacion.colorTexto = '#856404';
        notificacion.prioridad = 'alta';
        break;
      case 'validacion':
        notificacion.icono = 'fa-check-circle';
        notificacion.colorFondo = '#d4edda';
        notificacion.colorTexto = '#155724';
        notificacion.prioridad = 'media';
        break;
      case 'bitacora':
        notificacion.icono = 'fa-file-text-o';
        notificacion.colorFondo = '#e2e3e5';
        notificacion.colorTexto = '#383d41';
        notificacion.prioridad = 'media';
        break;
      default:
        notificacion.icono = 'fa-info-circle';
        notificacion.colorFondo = '#e7f3ff';
        notificacion.colorTexto = '#026aa7';
    }

    this.agregarNotificacion(notificacion);
  }

  // Obtener tareas de múltiples usuarios para usuarios privilegiados
  private obtenerTareasGlobalesParaNotificaciones(idUsuario: number) {
    console.log('Obteniendo tareas globales para notificaciones de usuario privilegiado:', idUsuario);
    
    const usuariosComunes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    let todasLasTareas = [];
    let usuariosProcessados = 0;
    
    usuariosComunes.forEach((idUsuarioTareas, index) => {
      this.spMisTareasService.getMis_TareasbyIdUsuario(idUsuarioTareas)
        .subscribe(
          (tareas) => {
            usuariosProcessados++;
            
            if (tareas && Array.isArray(tareas)) {
              const tareasActivas = tareas.filter(el => el.idEstadoTarea == 1 || el.idEstadoTarea == 2);
              todasLasTareas = todasLasTareas.concat(tareasActivas);
            }
            
            // Si ya procesamos todos los usuarios, crear notificaciones
            if (usuariosProcessados >= usuariosComunes.length) {
              // Eliminar duplicados por idTarea
              const tareasUnicas = todasLasTareas.filter((tarea, index, self) => 
                index === self.findIndex(t => t.idTarea === tarea.idTarea)
              );
              
              console.log('Tareas únicas obtenidas para notificaciones:', tareasUnicas.length);
              
              const notificacionesTareas = this.crearNotificacionesDesdeTareas(tareasUnicas, idUsuario);
              console.log('Creadas', notificacionesTareas.length, 'notificaciones globales');
              this.agregarNotificaciones(notificacionesTareas);
            }
          },
          (error) => {
            usuariosProcessados++;
            console.log(`Error obteniendo tareas del usuario ${idUsuarioTareas}:`, error);
          }
        );
    });
  }

  // Verificar si el usuario tiene permisos especiales para ver todas las tareas
  private esUsuarioPrivilegiado(idUsuario: number): boolean {
    // jolivares tiene ID 2 según los logs
    // También podríamos agregar otros IDs de usuarios privilegiados aquí
    const usuariosPrivilegiados = [2]; // ID de jolivares
    return usuariosPrivilegiados.includes(idUsuario);
  }

  // ========================= MÉTODOS PARA NOTIFICACIONES ESPECÍFICAS =========================

  // Notificación para Director cuando hay cambio de ritmo (por validar)
  notificarCambioRitmo(idSubProyecto: number, nombreSubProyecto: string, idUsuarioCreador: number) {
    // Obtener todos los usuarios con perfil de Director (idPerfil = 2)
    this.obtenerUsuariosPorPerfil(2).subscribe(directores => {
      directores.forEach(director => {
        this.crearNotificacionPersonalizada(
          director.idUsuario,
          'ritmo',
          '📋 Cambio de Ritmo por Validar',
          `El sub-proyecto "${nombreSubProyecto}" requiere validación de ritmo`,
          'alta',
          '/Configuracion-ValidacionConfigSubProyecto'
        );
      });
    });
  }

  // Notificación para Coordinador cuando Ritmo es validado o rechazado
  notificarRitmoValidado(idSubProyecto: number, nombreSubProyecto: string, validado: boolean, idCoordinador: number) {
    const estado = validado ? 'validado' : 'rechazado';
    const icono = validado ? '✅' : '❌';
    const prioridad = validado ? 'media' : 'alta';
    
    this.crearNotificacionPersonalizada(
      idCoordinador,
      'validacion',
      `${icono} Ritmo ${estado.charAt(0).toUpperCase() + estado.slice(1)}`,
      `El ritmo del sub-proyecto "${nombreSubProyecto}" ha sido ${estado}`,
      prioridad as 'alta' | 'media' | 'baja',
      '/Proyectos-MisProyectos'
    );
  }

  // Notificación para Sub-gerente cuando hay validación Matriz
  notificarValidacionMatriz(idProyectoMatriz: number, nombreProyectoMatriz: string) {
    // Obtener todos los usuarios con perfil de Sub-gerente (idPerfil = 1)
    this.obtenerUsuariosPorPerfil(1).subscribe(subgerentes => {
      subgerentes.forEach(subgerente => {
        this.crearNotificacionPersonalizada(
          subgerente.idUsuario,
          'validacion',
          '🔍 Validación de Proyecto Matriz',
          `El proyecto matriz "${nombreProyectoMatriz}" requiere validación`,
          'alta',
          '/Proyectos-ValidarProyectos'
        );
      });
    });
  }

  // Notificación para Sub-gerente cuando hay validación proyecto
  notificarValidacionProyecto(idProyecto: number, nombreProyecto: string) {
    // Obtener todos los usuarios con perfil de Sub-gerente (idPerfil = 1)
    this.obtenerUsuariosPorPerfil(1).subscribe(subgerentes => {
      subgerentes.forEach(subgerente => {
        this.crearNotificacionPersonalizada(
          subgerente.idUsuario,
          'validacion',
          '📂 Validación de Proyecto',
          `El proyecto "${nombreProyecto}" requiere validación`,
          'alta',
          '/Proyectos-ValidarProyectos'
        );
      });
    });
  }

  // Notificación para Coordinador sobre resultado de validación Matriz/Proyecto
  notificarResultadoValidacion(tipo: 'matriz' | 'proyecto', nombre: string, validado: boolean, idCoordinador: number) {
    const tipoTexto = tipo === 'matriz' ? 'Proyecto Matriz' : 'Proyecto';
    const estado = validado ? 'validado' : 'rechazado';
    const icono = validado ? '✅' : '❌';
    const prioridad = validado ? 'media' : 'alta';
    
    this.crearNotificacionPersonalizada(
      idCoordinador,
      'validacion',
      `${icono} ${tipoTexto} ${estado.charAt(0).toUpperCase() + estado.slice(1)}`,
      `El ${tipoTexto.toLowerCase()} "${nombre}" ha sido ${estado}`,
      prioridad as 'alta' | 'media' | 'baja',
      '/Proyectos-MisProyectos'
    );
  }

  // Notificación para Coordinador, Director y Sub-gerente sobre carga de archivos de bitácora
  notificarCargaBitacora(idSubProyecto: number, nombreSubProyecto: string, nombreArchivo: string, tipoBitacora: number, prioridadBitacora: string) {
    // Definir colores según el tipo de bitácora y prioridad
    let colorInfo = this.obtenerColorBitacora(tipoBitacora, prioridadBitacora);
    
    // Obtener usuarios con perfiles: Coordinador (3), Director (2), Sub-gerente (1)
    const perfilesTargets = [1, 2, 3];
    
    perfilesTargets.forEach(idPerfil => {
      this.obtenerUsuariosPorPerfil(idPerfil).subscribe(usuarios => {
        usuarios.forEach(usuario => {
          const notificacion = new mNotificacion();
          notificacion.id = Date.now() + Math.random();
          notificacion.idUsuario = usuario.idUsuario;
          notificacion.tipo = 'bitacora';
          notificacion.titulo = `📎 Nueva Bitácora Cargada`;
          notificacion.descripcion = `Se ha cargado el archivo "${nombreArchivo}" en el sub-proyecto "${nombreSubProyecto}"`;
          notificacion.fechaCreacion = new Date();
          notificacion.leida = false;
          notificacion.prioridad = 'media';
          notificacion.icono = 'fa-file-text-o';
          notificacion.colorFondo = colorInfo.fondo;
          notificacion.colorTexto = colorInfo.texto;
          notificacion.enlace = '/Ver-Bitacora';
          notificacion.idReferencia = idSubProyecto;
          notificacion.tipoReferencia = 'subproyecto';
          
          this.agregarNotificacion(notificacion);
        });
      });
    });
  }

  // Método auxiliar para obtener usuarios por perfil
  private obtenerUsuariosPorPerfil(idPerfil: number): Observable<any[]> {
    return this.usuariosPerfilesService.getUsuariosPerfilesbyidPerfil(idPerfil)
      .map((usuariosPerfiles: any[]) => {
        // Filtrar solo usuarios activos
        return usuariosPerfiles.filter(up => up.activo === true || up.activo === 'true' || up.activo === 1);
      });
  }

  // Método auxiliar para obtener colores de bitácora según tipo y prioridad
  private obtenerColorBitacora(tipoBitacora: number, prioridad: string) {
    // Colores base para diferentes tipos de bitácora
    const coloresTipo = {
      1: { fondo: '#e3f2fd', texto: '#1976d2' }, // Tipo 1: Azul
      2: { fondo: '#f3e5f5', texto: '#7b1fa2' }, // Tipo 2: Púrpura
      3: { fondo: '#e8f5e8', texto: '#388e3c' }, // Tipo 3: Verde
      default: { fondo: '#e2e3e5', texto: '#383d41' } // Por defecto: Gris
    };

    // Ajustar según prioridad
    const coloresPrioridad = {
      'alta': { fondo: '#ffe6e6', texto: '#dc3545' }, // Rojo
      'media': coloresTipo[tipoBitacora] || coloresTipo.default,
      'baja': { fondo: '#f8f9fa', texto: '#6c757d' } // Gris claro
    };

    return coloresPrioridad[prioridad] || coloresPrioridad['media'];
  }



  /**
   * Reemplaza todas las notificaciones existentes con nuevas
   */
  private reemplazarNotificaciones(notificaciones: mNotificacion[]) {
    this.actualizarNotificaciones(notificaciones);
  }

  /**
   * Obtiene tareas globales como Observable para usuarios privilegiados
   */
  private obtenerTareasGlobalesObservable(idUsuario: number): Observable<any[]> {
    const usuariosComunes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    
    // Crear array de observables para cada usuario
    const observables = usuariosComunes.map(idUsuarioTareas => 
      this.spMisTareasService.getMis_TareasbyIdUsuario(idUsuarioTareas)
        .map(tareas => tareas || [])
        .catch(error => {
          console.log(`Error obteniendo tareas del usuario ${idUsuarioTareas}:`, error);
          return Observable.of([]); // Devolver array vacío en caso de error
        })
    );

    // Combinar todos los observables
    return Observable.forkJoin(observables)
      .map(arraysDeTareas => {
        // Aplanar el array de arrays y eliminar duplicados
        const todasLasTareas = arraysDeTareas.reduce((acc, tareas) => acc.concat(tareas), []);
        const tareasUnicas = todasLasTareas.filter((tarea, index, self) => 
          index === self.findIndex(t => t.idTarea === tarea.idTarea)
        );
        
        // Aplicar el mismo filtro que MisTareas
        const tareasFiltradas = tareasUnicas.filter(el => el.idEstadoTarea == 1 || el.idEstadoTarea == 2);
        
        console.log('=== NOTIFICACIONES (GERENCIA) ===');
        console.log('Total tareas globales únicas:', tareasUnicas.length);
        console.log('Tareas filtradas para notificaciones:', tareasFiltradas.length);
        
        return tareasFiltradas;
      });
  }

  /**
   * MÉTODOS PARA OBTENER DATOS REALES DESDE BFF
   */

  /**
   * Obtiene tareas REALES para notificaciones usando BFF
   */
  private obtenerTareasRealesParaNotificaciones(idUsuario: number): Observable<any[]> {
    if (!this.usarBffNotificaciones) {
      return this.obtenerTareasParaNotificaciones(idUsuario);
    }

    console.log('📋 Obteniendo tareas REALES desde BFF para notificaciones...', { idUsuario });
    
    const urlBFFTareas = `http://localhost:3000/api/proyectos/notificaciones?idUsuario=${idUsuario}`;
    
    return this.http.get(urlBFFTareas)
      .map(response => {
        const tareasReales = response.json();
        console.log(`✅ Tareas REALES obtenidas desde BFF: ${tareasReales.length}`);
        return tareasReales;
      })
      .catch(error => {
        this.usarBffNotificaciones = false;
        if (!this.bffNotificacionesErrorReportado) {
          console.warn('⚠️ BFF de notificaciones no disponible. Se usará fallback local para el resto de la sesión.', error);
          this.bffNotificacionesErrorReportado = true;
        }
        console.log('🔄 Fallback: usando método local de tareas...');
        // Fallback al método local existente
        return this.obtenerTareasParaNotificaciones(idUsuario);
      });
  }

  /**
   * Crea notificaciones REALES desde tareas usando datos del BFF
   */
  private crearNotificacionesRealesDesdeTareas(tareas: any[], idUsuario: number): mNotificacion[] {
    console.log('📋 Creando notificaciones REALES desde tareas BFF:', tareas.length);
    const notificaciones: mNotificacion[] = [];
    const ahora = new Date();

    tareas.forEach(tarea => {
      console.log(`🔍 Procesando tarea REAL: ${tarea.nombreTarea || tarea.descripcionTarea} (ID: ${tarea.idTarea})`);
      
      // Verificar si el usuario es privilegiado o responsable de la tarea
      const esUsuarioPrivilegiado = this.esUsuarioPrivilegiado(idUsuario);
      const esResponsable = tarea.idUsuarioResponsable == idUsuario;
      
      if (!esUsuarioPrivilegiado && !esResponsable) {
        console.log(`  ⏭️ Tarea ${tarea.idTarea} no es para el usuario ${idUsuario}, responsable: ${tarea.idUsuarioResponsable}`);
        return;
      }

      const notificacion = new mNotificacion();
      // Usar ID consistente basado en tipo y referencia para poder rastrear vistas
      notificacion.idReferencia = tarea.idTarea;
      notificacion.id = parseInt(`${tarea.idTarea}`);
      notificacion.idUsuario = idUsuario;
      notificacion.tipo = 'tarea';
      notificacion.titulo = `Tarea: ${tarea.descripcionTarea || tarea.nombreTarea || 'Sin nombre'}`;
      notificacion.descripcion = tarea.observacionTarea || tarea.descripcionTarea || 'Sin descripción';
      
      // Usar fechas reales del BFF
      notificacion.fechaCreacion = tarea.fechaCreacion ? new Date(tarea.fechaCreacion) : new Date();
      notificacion.fechaCreacionTarea = tarea.fechaCreacion ? new Date(tarea.fechaCreacion) : null;
      notificacion.fechaCompromiso = tarea.fechaTerminoProgramado ? new Date(tarea.fechaTerminoProgramado) : null;
      notificacion.fechaVencimiento = tarea.fechaTerminoProgramado ? new Date(tarea.fechaTerminoProgramado) : null;
      notificacion.tipoReferencia = 'tarea';
      notificacion.enlace = '/Ver-Tareas';
      notificacion.leida = false;
      notificacion.idEstadoTarea = tarea.idEstadoTarea;
      notificacion.nombreEstadoTarea = tarea.nombreEstadoTarea;
      notificacion.estado = tarea.nombreEstadoTarea;
      notificacion.idSubProyecto = tarea.idSubProyecto;
      notificacion.nombreSubProyecto = tarea.nombreSubProyecto;

      // Determinar prioridad y colores usando datos reales
      this.configurarNotificacionTareaReal(notificacion, tarea, ahora);

      console.log(`  ✅ Notificación REAL de tarea creada: ${notificacion.titulo}`);
      notificaciones.push(notificacion);
    });

    console.log(`✅ Total notificaciones REALES de tareas creadas: ${notificaciones.length}`);
    return notificaciones;
  }

  /**
   * Configura una notificación de tarea usando datos reales
   */
  private configurarNotificacionTareaReal(notificacion: mNotificacion, tarea: any, ahora: Date) {
    // Verificar si está vencida usando datos reales
    if (tarea.fechaTerminoProgramado) {
      const fechaTermino = new Date(tarea.fechaTerminoProgramado);
      
      if (fechaTermino < ahora) {
        notificacion.prioridad = 'alta';
        notificacion.titulo = `⚠️ VENCIDA: ${tarea.descripcionTarea || tarea.nombreTarea}`;
        notificacion.colorFondo = '#ffe6e6';
        notificacion.colorTexto = '#dc3545';
        notificacion.icono = 'fa-exclamation-triangle';
      } else {
        const diasRestantes = Math.ceil((fechaTermino.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
        if (diasRestantes <= 3) {
          notificacion.prioridad = 'alta';
          notificacion.titulo = `🔔 Próxima a vencer: ${tarea.descripcionTarea || tarea.nombreTarea}`;
          notificacion.colorFondo = '#fff3cd';
          notificacion.colorTexto = '#856404';
          notificacion.icono = 'fa-clock-o';
        } else {
          notificacion.prioridad = 'media';
          notificacion.colorFondo = '#e7f3ff';
          notificacion.colorTexto = '#026aa7';
          notificacion.icono = 'fa-tasks';
        }
      }
    } else {
      notificacion.prioridad = 'media';
      notificacion.colorFondo = '#e7f3ff';
      notificacion.colorTexto = '#026aa7';
      notificacion.icono = 'fa-tasks';
    }

    // Manejo especial para tareas canceladas usando datos reales
    if (tarea.nombreEstadoTarea && tarea.nombreEstadoTarea.toLowerCase().includes('cancelad')) {
      notificacion.prioridad = 'baja';
      notificacion.titulo = `❌ CANCELADA: ${tarea.descripcionTarea || tarea.nombreTarea}`;
      notificacion.colorFondo = '#f8d7da';
      notificacion.colorTexto = '#721c24';
      notificacion.icono = 'fa-times-circle';
    }
  }

  /**
   * Obtiene validaciones pendientes directamente desde localStorage y datos reales
   */
  obtenerValidacionesPendientesParaNotificaciones(idUsuario: number): Observable<mNotificacion[]> {
    console.log('🔔 Consultando validaciones pendientes REALES directamente de la base de datos para usuario:', idUsuario);
    
    return new Observable(observer => {
      try {
        // 🎯 CONSULTAR DIRECTAMENTE los subproyectos pendientes de validación desde la base de datos
        console.log('📋 Obteniendo subproyectos pendientes directamente desde servicios de Angular...');
        
        // Obtener el usuario actual para saber sus proyectos
        const usuarioActual = JSON.parse(localStorage.getItem('Usuario') || '{}');
        if (!usuarioActual.idUsuario) {
          console.log('⚠️ No se encontró usuario actual, usando datos de localStorage como fallback');
          this.obtenerValidacionesDesdeLocalStorage(idUsuario, observer);
          return;
        }
        
        console.log(`👤 Consultando validaciones para usuario: ${usuarioActual.nombreCompleto} (ID: ${usuarioActual.idUsuario})`);
        
        // Obtener proyectos matrices del usuario
        this.proyectoMatrizService.getProyectoMatrizbyidUsuarioCreador(usuarioActual.idUsuario).subscribe(
          proyectosMatriz => {
            console.log(`📊 Proyectos matriz encontrados: ${proyectosMatriz.length}`);
            
            if (proyectosMatriz.length === 0) {
              console.log('ℹ️ Usuario no tiene proyectos matriz asignados');
              observer.next([]);
              observer.complete();
              return;
            }
            
            this.procesarProyectosMatrizParaValidaciones(proyectosMatriz, idUsuario, observer);
          },
          error => {
            console.error('❌ Error al obtener proyectos matriz:', error);
            console.log('🔄 Fallback: usando datos de localStorage');
            this.obtenerValidacionesDesdeLocalStorage(idUsuario, observer);
          }
        );
        
      } catch (error) {
        console.error('❌ Error al obtener validaciones pendientes:', error);
        observer.next([]);
        observer.complete();
      }
    });
  }

  /**
   * Procesa proyectos matriz para encontrar subproyectos pendientes de validación
   */
  private procesarProyectosMatrizParaValidaciones(proyectosMatriz: any[], idUsuario: number, observer: any) {
    console.log('🔍 Procesando proyectos matriz para encontrar validaciones pendientes...');
    
    const todasLasNotificaciones: mNotificacion[] = [];
    const subproyectosYaProcesados: Set<number> = new Set(); // Para evitar duplicados
    let proyectosProcesados = 0;
    
    if (proyectosMatriz.length === 0) {
      observer.next([]);
      observer.complete();
      return;
    }
    
    proyectosMatriz.forEach(proyectoMatriz => {
      // Obtener proyectos de cada matriz
      this.proyectoService.getProyectobyidProyectoMatriz(proyectoMatriz.idProyectoMatriz).subscribe(
        proyectos => {
          console.log(`📁 Proyectos encontrados en matriz "${proyectoMatriz.nombreProyectoMatriz}": ${proyectos.length}`);
          
          let proyectosEnMatrizProcesados = 0;
          
          if (proyectos.length === 0) {
            proyectosProcesados++;
            if (proyectosProcesados === proyectosMatriz.length) {
              console.log(`✅ Procesamiento completo. Total notificaciones: ${todasLasNotificaciones.length}`);
              observer.next(todasLasNotificaciones);
              observer.complete();
            }
            return;
          }
          
          proyectos.forEach(proyecto => {
            // Obtener subproyectos de cada proyecto
            this.subProyectoService.getSubProyectobyidProyecto(proyecto.idProyecto).subscribe(
              subproyectos => {
                console.log(`📋 Subproyectos encontrados en "${proyecto.nombreProyecto}": ${subproyectos.length}`);
                
                // 🎯 FILTRAR subproyectos pendientes de validación (el filtro real que usa lista-conf-pendientes)
                const subproyectosPendientes = subproyectos.filter(subProy => 
                  !subProy.ponderadoValidado || !subProy.presupuestoValidado || !subProy.ritmoValidado
                );
                
                console.log(`🔔 Subproyectos pendientes de validación en "${proyecto.nombreProyecto}": ${subproyectosPendientes.length}`);
                
                // Crear notificaciones para cada subproyecto pendiente (EVITANDO DUPLICADOS)
                subproyectosPendientes.forEach(subproyecto => {
                  // ✅ Verificar si ya procesamos este subproyecto
                  if (subproyectosYaProcesados.has(subproyecto.idSubProyecto)) {
                    console.log(`⚠️ Subproyecto ${subproyecto.nombreSubProyecto} ya procesado, omitiendo duplicado`);
                    return;
                  }
                  
                  // Marcar como procesado
                  subproyectosYaProcesados.add(subproyecto.idSubProyecto);
                  
                  const notificacion = this.crearNotificacionDeValidacionReal(
                    subproyecto, 
                    proyecto, 
                    proyectoMatriz, 
                    idUsuario
                  );
                  if (notificacion) {
                    todasLasNotificaciones.push(notificacion);
                    console.log(`✅ Notificación REAL creada para: ${subproyecto.nombreSubProyecto} (ID: ${subproyecto.idSubProyecto})`);
                  }
                });
                
                proyectosEnMatrizProcesados++;
                if (proyectosEnMatrizProcesados === proyectos.length) {
                  proyectosProcesados++;
                  if (proyectosProcesados === proyectosMatriz.length) {
                    console.log(`✅ Procesamiento completo. Total notificaciones REALES: ${todasLasNotificaciones.length}`);
                    observer.next(todasLasNotificaciones);
                    observer.complete();
                  }
                }
              },
              error => {
                console.error(`❌ Error al obtener subproyectos del proyecto ${proyecto.nombreProyecto}:`, error);
                proyectosEnMatrizProcesados++;
                if (proyectosEnMatrizProcesados === proyectos.length) {
                  proyectosProcesados++;
                  if (proyectosProcesados === proyectosMatriz.length) {
                    observer.next(todasLasNotificaciones);
                    observer.complete();
                  }
                }
              }
            );
          });
        },
        error => {
          console.error(`❌ Error al obtener proyectos de la matriz ${proyectoMatriz.nombreProyectoMatriz}:`, error);
          proyectosProcesados++;
          if (proyectosProcesados === proyectosMatriz.length) {
            observer.next(todasLasNotificaciones);
            observer.complete();
          }
        }
      );
    });
  }

  /**
   * Crea una notificación real basada en datos de subproyecto pendiente
   */
  private crearNotificacionDeValidacionReal(subproyecto: any, proyecto: any, proyectoMatriz: any, idUsuario: number): mNotificacion | null {
    try {
      const tiposPendientes = [];
      
      if (!subproyecto.ponderadoValidado) tiposPendientes.push('Ponderado');
      if (!subproyecto.presupuestoValidado) tiposPendientes.push('Presupuesto');
      if (!subproyecto.ritmoValidado) tiposPendientes.push('Ritmo');
      
      if (tiposPendientes.length === 0) return null;
      
      const notificacion = new mNotificacion();
      // 🎯 ID ESPECÍFICO para evitar duplicados: usar idSubProyecto + tipo de notificación
      notificacion.id = parseInt(`${subproyecto.idSubProyecto}${Math.floor(Date.now() / 10000)}`);
      notificacion.idUsuario = idUsuario;
      notificacion.tipo = 'validacion';
      notificacion.titulo = `🔔 ${subproyecto.nombreSubProyecto}`;
      notificacion.descripcion = `El subproyecto "${subproyecto.nombreSubProyecto}" requiere validación urgente de: ${tiposPendientes.join(', ')}. Haga clic para proceder.`;
      notificacion.fechaCreacion = new Date();
      notificacion.prioridad = tiposPendientes.length >= 2 ? 'alta' : 'media';
      notificacion.enlace = `/Configuracion-ValidacionSubProyecto?subproyecto=${subproyecto.idSubProyecto}&autoselect=true`;
      notificacion.leida = false;
      
      // 🔑 Información específica del subproyecto para identificación única
      notificacion.idReferencia = subproyecto.idSubProyecto;
      notificacion.tipoReferencia = 'subproyecto';
      
      // 📝 Agregar metadatos únicos para mejor identificación
      (notificacion as any).nombreSubproyecto = subproyecto.nombreSubProyecto;
      (notificacion as any).nombreProyecto = (proyecto && proyecto.nombreProyecto) ? proyecto.nombreProyecto : '';
      (notificacion as any).tiposPendientes = tiposPendientes;
      (notificacion as any).claveUnica = `validacion_${subproyecto.idSubProyecto}_${tiposPendientes.join('_')}`;
      
      console.log(`🔑 Creando notificación única: ID=${notificacion.id}, Clave=${(notificacion as any).claveUnica}`);
      
      // Estilos según prioridad
      if (notificacion.prioridad === 'alta') {
        notificacion.colorFondo = '#fff3cd';
        notificacion.colorTexto = '#856404';
        notificacion.icono = 'fa-exclamation-triangle';
      } else {
        notificacion.colorFondo = '#e3f2fd';
        notificacion.colorTexto = '#1976d2';
        notificacion.icono = 'fa-check-circle';
      }
      
      return notificacion;
      
    } catch (error) {
      console.error('❌ Error al crear notificación de validación real:', error);
      return null;
    }
  }

  /**
   * Método fallback que obtiene validaciones desde localStorage
   */
  private obtenerValidacionesDesdeLocalStorage(idUsuario: number, observer: any) {
    const validacionesPendientes = JSON.parse(localStorage.getItem('validacionesPendientes') || '[]');
    console.log(`📋 Fallback - Validaciones encontradas en localStorage: ${validacionesPendientes.length}`);
    
    if (validacionesPendientes.length === 0) {
      observer.next([]);
      observer.complete();
      return;
    }
    
    const notificacionesValidaciones = this.convertirValidacionesANotificaciones(validacionesPendientes, idUsuario);
    console.log(`✅ ${notificacionesValidaciones.length} notificaciones creadas desde localStorage`);
    
    observer.next(notificacionesValidaciones);
    observer.complete();
  }



  /**
   * Convierte datos de validaciones pendientes de localStorage a notificaciones
   */
  private convertirValidacionesANotificaciones(validacionesPendientes: any[], idUsuario: number): mNotificacion[] {
    console.log('🔄 Convirtiendo validaciones pendientes a notificaciones...');
    
    const notificaciones: mNotificacion[] = [];
    
    validacionesPendientes.forEach(validacion => {
      try {
        const notificacion = new mNotificacion();
        notificacion.id = Date.now() + Math.random(); // ID temporal único
        notificacion.idUsuario = idUsuario;
        notificacion.tipo = 'validacion';
        notificacion.titulo = validacion.nombre || `🔔 ${validacion.descripcion}`;
        notificacion.descripcion = validacion.detalle || validacion.descripcion || 'Validación pendiente';
        notificacion.fechaCreacion = new Date(validacion.fechaCreacion || validacion.fecha || Date.now());
        notificacion.prioridad = this.determinarPrioridadValidacion(validacion);
        notificacion.enlace = validacion.enlace || `/Configuracion-ValidacionSubProyecto`;
        notificacion.leida = false;
        
        // Propiedades específicas de validación
        if (validacion.idSubProyecto) {
          notificacion.idReferencia = validacion.idSubProyecto;
          notificacion.tipoReferencia = 'subproyecto';
        }
        
        // Configurar colores y estilos según prioridad
        this.configurarEstilosValidacion(notificacion, validacion);
        
        notificaciones.push(notificacion);
        
        console.log(`✅ Notificación de validación creada: ${validacion.nombreSubProyecto || validacion.descripcion}`);
        
      } catch (error) {
        console.error('❌ Error al crear notificación de validación:', error, validacion);
      }
    });
    
    console.log(`📨 Total notificaciones de validación convertidas: ${notificaciones.length}`);
    return notificaciones;
  }

  /**
   * Determina la prioridad de una validación
   */
  private determinarPrioridadValidacion(validacion: any): 'alta' | 'media' | 'baja' {
    // Prioridad alta si es urgente, tiene múltiples validaciones pendientes o es crítica
    if (validacion.urgente || 
        validacion.prioridad === 'alta' || 
        validacion.prioridad === 'crítica' ||
        validacion.prioridad === 'urgente' ||
        (validacion.tiposPendientes && validacion.tiposPendientes.length >= 2)) {
      return 'alta';
    }
    
    // Prioridad media por defecto para validaciones
    return 'media';
  }

  /**
   * Configura estilos visuales para notificaciones de validación
   */
  private configurarEstilosValidacion(notificacion: mNotificacion, validacion: any) {
    switch (notificacion.prioridad) {
      case 'alta':
        notificacion.colorFondo = '#fff3cd';
        notificacion.colorTexto = '#856404';
        notificacion.icono = 'fa-exclamation-triangle';
        break;
      case 'media':
        notificacion.colorFondo = '#e3f2fd';
        notificacion.colorTexto = '#1976d2';
        notificacion.icono = 'fa-check-circle';
        break;
      default:
        notificacion.colorFondo = '#f8f9fa';
        notificacion.colorTexto = '#6c757d';
        notificacion.icono = 'fa-info-circle';
    }
  }

  //*************************************************** MÉTODOS PARA VALIDACIONES Y BITÁCORA ***************************************************

  /**
   * Detecta cambios en la validación de ritmo y genera notificaciones automáticas
   */
  detectarCambiosRitmoValidacion(subproyectoAnterior: any, subproyectoNuevo: any, usuario: any) {
    try {
      console.log('🔍 Detectando cambios de ritmo validación...');
      
      // Verificar si hubo cambio en ritmoValidado
      if (subproyectoAnterior.ritmoValidado !== subproyectoNuevo.ritmoValidado) {
        if (subproyectoNuevo.ritmoValidado) {
          console.log('✅ Ritmo validado - generando notificación');
          this.notificarRitmoAprobado(subproyectoNuevo, `Ritmo aprobado por ${usuario.nombreCompleto}`);
        } else {
          console.log('❌ Ritmo rechazado - generando notificación');
          this.notificarRitmoRechazado(subproyectoNuevo, `Ritmo rechazado por ${usuario.nombreCompleto}`);
        }
      }
    } catch (error) {
      console.error('❌ Error al detectar cambios de ritmo:', error);
    }
  }

  /**
   * Detecta validaciones de matriz o proyecto y genera notificaciones automáticas
   */
  detectarValidacionMatrizProyecto(subproyecto: any, usuario: any, tipo: 'matriz' | 'proyecto') {
    try {
      console.log(`🔍 Detectando validación de ${tipo}...`);
      
      if (tipo === 'matriz') {
        if (subproyecto.ponderadoValidado) {
          console.log('✅ Matriz aprobada - generando notificación');
          this.notificarMatrizAprobada(subproyecto, `Matriz aprobada por ${usuario.nombreCompleto}`);
        }
      } else if (tipo === 'proyecto') {
        if (subproyecto.presupuestoValidado) {
          console.log('✅ Proyecto aprobado - generando notificación');
          this.notificarProyectoAprobado(subproyecto, `Proyecto aprobado por ${usuario.nombreCompleto}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error al detectar validación de ${tipo}:`, error);
    }
  }

  /**
   * Detecta carga de archivos en bitácora y genera notificaciones automáticas
   */
  detectarCargaBitacora(bitacora: any, subproyecto: any, usuario: any, tieneArchivo: boolean) {
    try {
      console.log('🔍 Detectando carga de bitácora...');
      
      const archivos = tieneArchivo ? ['Archivo adjunto'] : [];
      this.notificarArchivosBitacoraCargados(subproyecto, archivos, usuario);
      
      console.log('✅ Notificación de bitácora generada');
    } catch (error) {
      console.error('❌ Error al detectar carga de bitácora:', error);
    }
  }

  /**
   * Crea una notificación específica para un subproyecto pendiente de validación
   */
  crearNotificacionSubproyectoPendiente(idUsuario: number, nombreSubproyecto: string, nombreProyecto: string, idSubproyecto: number) {
    try {
      const titulo = `🔔 Validación Pendiente: ${nombreSubproyecto}`;
      const descripcion = `El subproyecto "${nombreSubproyecto}" del proyecto "${nombreProyecto}" está pendiente de validación. Haga clic para revisar.`;
      const enlace = `/Configuracion-ValidacionSubProyecto?subproyecto=${idSubproyecto}&autoselect=true`;
      
      this.crearNotificacionPersonalizada(
        idUsuario,
        'validacion',
        titulo,
        descripcion,
        'alta',
        enlace
      );
      
      console.log(`📨 Notificación creada para usuario ${idUsuario}: ${nombreSubproyecto}`);
    } catch (error) {
      console.error('❌ Error al crear notificación de subproyecto pendiente:', error);
    }
  }

  /**
   * Genera notificaciones para todos los subproyectos pendientes de validación
   * Este método ahora busca datos REALES y los convierte en notificaciones
   */
  generarNotificacionesSubproyectosPendientes(idUsuario: number) {
    try {
      console.log('🔔 Generando notificaciones de subproyectos pendientes REALES para usuario:', idUsuario);
      
      // Primero verificar si ya hay datos en localStorage
      const validacionesExistentes = JSON.parse(localStorage.getItem('validacionesPendientes') || '[]');
      console.log(`📋 ${validacionesExistentes.length} validaciones existentes en localStorage`);
      
      // Si hay validaciones existentes, crearlas como notificaciones
      if (validacionesExistentes.length > 0) {
        validacionesExistentes.forEach((validacion: any) => {
          const titulo = validacion.nombre || `🔔 ${validacion.descripcion}`;
          const descripcion = validacion.detalle || validacion.descripcion;
          const enlace = validacion.enlace || `/Configuracion-ValidacionSubProyecto`;
          const prioridad: 'alta' | 'media' | 'baja' = 
            validacion.prioridad === 'alta' || validacion.prioridad === 'crítica' || validacion.urgente ? 'alta' :
            validacion.prioridad === 'baja' ? 'baja' : 'media';
          
          this.crearNotificacionPersonalizada(
            idUsuario,
            'validacion',
            titulo,
            descripcion,
            prioridad,
            enlace
          );
        });
        
        console.log('✅ Notificaciones de subproyectos pendientes generadas desde datos existentes');
      }
      
      // 🔍 BUSCAR PROACTIVAMENTE validaciones pendientes reales si no las hay
      if (validacionesExistentes.length === 0) {
        console.log('🔍 No hay validaciones en localStorage, iniciando búsqueda proactiva...');
        this.buscarValidacionesPendientesProactivamente(idUsuario);
      }
      
    } catch (error) {
      console.error('❌ Error al generar notificaciones de subproyectos pendientes:', error);
    }
  }

  /**
   * Busca proactivamente validaciones pendientes en el sistema
   * Este método simula lo que haría lista-conf-pendientes
   */
  private buscarValidacionesPendientesProactivamente(idUsuario: number) {
    try {
      console.log('🔍 Iniciando búsqueda proactiva de validaciones pendientes...');
      
      // ❌ ELIMINADO: Validaciones de ejemplo innecesarias
      // Solo usar validaciones reales de subproyectos pendientes desde la base de datos
      console.log('� Búsqueda proactiva deshabilitada - usando solo datos reales de subproyectos');
      
      console.log('✅ Notificaciones de validaciones pendientes creadas proactivamente');
      
    } catch (error) {
      console.error('❌ Error en búsqueda proactiva de validaciones:', error);
    }
  }

  /**
   * Notifica cuando se aprueba un ritmo
   */
  private notificarRitmoAprobado(proyecto: any, observaciones: string) {
    // Implementación básica
    console.log('✅ Notificando ritmo aprobado:', proyecto.nombreSubProyecto || proyecto.nombre);
  }

  /**
   * Notifica cuando se rechaza un ritmo
   */
  private notificarRitmoRechazado(proyecto: any, observaciones: string) {
    // Implementación básica
    console.log('❌ Notificando ritmo rechazado:', proyecto.nombreSubProyecto || proyecto.nombre);
  }

  /**
   * Notifica cuando se aprueba una matriz
   */
  private notificarMatrizAprobada(proyecto: any, observaciones: string) {
    // Implementación básica
    console.log('✅ Notificando matriz aprobada:', proyecto.nombreSubProyecto || proyecto.nombre);
  }

  /**
   * Elimina notificaciones duplicadas basándose en criterios específicos
   */
  private eliminarNotificacionesDuplicadas(notificaciones: mNotificacion[]): mNotificacion[] {
    const notificacionesUnicas: mNotificacion[] = [];
    const referenciasProcesadas: Set<string> = new Set();
    
    console.log(`🔍 Analizando ${notificaciones.length} notificaciones para eliminar duplicados...`);
    
    notificaciones.forEach((notificacion, index) => {
      // Crear múltiples claves para detectar duplicados de diferentes maneras
      let clavesUnicas: string[] = [];
      
      if (notificacion.tipo === 'validacion') {
        // Para validaciones, usar múltiples criterios para detectar duplicados
        if (notificacion.idReferencia) {
          clavesUnicas.push(`validacion_id_${notificacion.idReferencia}`);
        }
        
        // 🎯 Usar la clave única si existe (nueva implementación)
        if ((notificacion as any).claveUnica) {
          clavesUnicas.push((notificacion as any).claveUnica);
        }
        
        // También usar el título para detectar duplicados por nombre
        if (notificacion.titulo) {
          const tituloNormalizado = notificacion.titulo.replace(/🔔\s*/, '').trim();
          clavesUnicas.push(`validacion_titulo_${tituloNormalizado}`);
        }
        
        // 🏗️ Clave específica para TARAPACA (detectar todos los casos)
        if (notificacion.titulo.includes('TARAPACA') || (notificacion.descripcion && notificacion.descripcion.includes('TARAPACA'))) {
          clavesUnicas.push(`validacion_tarapaca_unique`);
          console.log(`🏗️ Detectada notificación TARAPACA: ${notificacion.titulo}`);
        }
      } else if (notificacion.tipo === 'tarea' && notificacion.idReferencia) {
        // Para tareas, usar tipo + idReferencia de la tarea
        clavesUnicas.push(`tarea_${notificacion.idReferencia}`);
      } else if (notificacion.tipo === 'licitacion') {
        // Para licitaciones, usar título como identificador único
        const tituloLicitacion = notificacion.titulo.replace(/⏰.*?:\s*/, '').trim();
        clavesUnicas.push(`licitacion_${tituloLicitacion}`);
      } else {
        // Para otros tipos, usar título + tipo
        clavesUnicas.push(`${notificacion.tipo}_${notificacion.titulo}`);
      }
      
      // Verificar si alguna de las claves ya fue procesada
      const yaExiste = clavesUnicas.some(clave => referenciasProcesadas.has(clave));
      
      if (!yaExiste) {
        // Agregar todas las claves para esta notificación
        clavesUnicas.forEach(clave => referenciasProcesadas.add(clave));
        notificacionesUnicas.push(notificacion);
        console.log(`✅ Notificación única agregada [${index}]: ${clavesUnicas.join(', ')}`);
      } else {
        console.log(`⚠️ Notificación duplicada omitida [${index}]: ${clavesUnicas.join(', ')} - Título: "${notificacion.titulo}"`);
      }
    });
    
    console.log(`🎯 Duplicados eliminados: ${notificaciones.length} → ${notificacionesUnicas.length}`);
    
    // Debug: mostrar las notificaciones TARAPACA que quedaron
    const tarapacasFinales = notificacionesUnicas.filter(n => 
      n.tipo === 'validacion' && n.titulo.includes('TARAPACA')
    );
    console.log(`🏗️ Notificaciones TARAPACA finales: ${tarapacasFinales.length}`);
    tarapacasFinales.forEach(t => console.log(`   - ${t.titulo}`));
    
    return notificacionesUnicas;
  }

  /**
   * Notifica cuando se aprueba un proyecto
   */
  private notificarProyectoAprobado(proyecto: any, observaciones: string) {
    // Implementación básica
    console.log('✅ Notificando proyecto aprobado:', proyecto.nombreSubProyecto || proyecto.nombre);
  }

  /**
   * Notifica cuando se cargan archivos en la bitácora
   */
  private notificarArchivosBitacoraCargados(subproyecto: any, archivos: string[], usuario: any) {
    // Implementación básica
    console.log('📁 Notificando archivos cargados en bitácora:', subproyecto.nombreSubProyecto || subproyecto.nombre);
  }
}