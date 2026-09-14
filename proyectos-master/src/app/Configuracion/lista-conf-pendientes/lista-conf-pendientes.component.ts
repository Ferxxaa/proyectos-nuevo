import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { sTarea } from '../../services/sTarea.service';
import { sProyecto } from '../../services/sProyecto.service';
import { sSubProyecto } from '../../services/sSubProyecto.service';
import { sDetalleSubProyecto } from '../../services/sDetalleSubProyecto.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { Observable } from 'rxjs/Observable';
import { mSubProyecto } from '../../models/mSubProyecto';
import { mProyecto } from '../../models/mProyecto';

@Component({
  selector: 'app-lista-conf-pendientes',
  templateUrl: './lista-conf-pendientes.component.html',
  styleUrls: ['./lista-conf-pendientes.component.css'],
  providers: [
    sProyecto,
    sSubProyecto,
    sDetalleSubProyecto,
    NotificacionesService,
    sUsuariosPerfiles,
    sTarea
  ]
})
export class ListaConfPendientesComponent implements OnInit {

  usuario;
  misProyectos$: Observable<mProyecto[]>;
  allSubProyecto$: Observable<mSubProyecto[]>;

  allSubProyectos: mSubProyecto[];
  cargando: boolean;
  subProyectoSeleccionado: mSubProyecto = null;  // 👈 aquí

  @Output() selectSubProyecto = new EventEmitter()

  constructor(
    private _sProyectos: sProyecto,
    private _sSubProyecto: sSubProyecto,
    private _sDetalleSubProyecto: sDetalleSubProyecto,
    private _notificacionesService: NotificacionesService,
    private _sUsuariosPerfiles: sUsuariosPerfiles,
    private _sTarea: sTarea
  ) {
    this.allSubProyectos = [];
    this.usuario = JSON.parse(localStorage.usuario);
    this.misProyectos$ = this._sProyectos.getProyectobyidUsuarioDirector(this.usuario.idUsuario);
    this.allSubProyecto$ = this._sSubProyecto.getSubProyectobyvalidado(true);
    this.cargando = true;
  }

  ngOnInit() {
    // ❌ NO limpiar notificaciones existentes - pueden ser de TARAPACA u otros datos importantes
    // Preservar notificaciones manuales y solo agregar/actualizar con datos reales
    console.log('🔄 Preservando notificaciones existentes y agregando datos reales...');
    
    this.misProyectos$.subscribe(res => {
      this.cargando = true;
      this.getAllMisSubProyectos(res);
    });
  }

  getAllMisSubProyectos(proyectos: mProyecto[]) {
    proyectos.forEach((proyecto, index, arr) => {
      this._sSubProyecto.getSubProyectobyidProyecto(proyecto.idProyecto).subscribe(subProy => {
        this.allSubProyectos.push(...subProy);
      });
    });
    setTimeout(async () => {
      this.allSubProyectos = this.retPendientesValidacion(this.allSubProyectos);
      
      // Generar notificaciones automáticas para elementos pendientes
      if (this.allSubProyectos && this.allSubProyectos.length > 0) {
        console.log(`🔔 ${this.allSubProyectos.length} subproyectos pendientes de validación encontrados`);
        await this.generarNotificacionesPendientes(this.allSubProyectos);
      }
      
      this.cargando = false;
    }, 2000);
  }

  retPendientesValidacion(subProyectos: mSubProyecto[]): mSubProyecto[] {
  if (subProyectos)
    return subProyectos.filter(subProy => 
      subProy.idEstadoProyecto == 4 &&  // ✅ Solo los que están pendientes de validación
      (!subProy.ponderadoValidado || !subProy.presupuestoValidado || !subProy.ritmoValidado)
    );
  return null;
}

  selectSP(subProyecto: mSubProyecto) {
  this.subProyectoSeleccionado = subProyecto;
  this.selectSubProyecto.emit(subProyecto);
}

  /**
   * Genera notificaciones automáticas para subproyectos pendientes de validación
   * Estas notificaciones se basan en datos REALES del sistema, no en archivos HTML
   * Las notificaciones PERSISTEN hasta que el usuario las elimine manualmente
   */
  async generarNotificacionesPendientes(subproyectosPendientes: mSubProyecto[]) {
    try {
      console.log(`🔔 SISTEMA AUTOMÁTICO: ${subproyectosPendientes.length} subproyectos con validaciones pendientes detectados`);
      
      if (subproyectosPendientes.length === 0) {
        console.log('✅ No hay validaciones pendientes actuales');
        return;
      }

      // 🔒 NO LIMPIAR notificaciones existentes - deben persistir hasta que el usuario las elimine
      console.log('🔒 Manteniendo todas las notificaciones existentes - no se eliminan automáticamente');
      
      // Crear notificaciones reales basadas en el estado actual del sistema
      const validacionesReales = subproyectosPendientes.map((subproyecto) => {
        const tiposPendientes = this.determinarValidacionesPendientes(subproyecto);
        const prioridadCalculada = this.calcularPrioridadValidacion(subproyecto, tiposPendientes);
        
        return {
          id: `validacion_${subproyecto.idSubProyecto}`, // ID único y predecible
          nombre: `🔔 ${subproyecto.nombreSubProyecto}`,
          descripcion: `Validaciones pendientes: ${tiposPendientes.join(', ')}`,
          detalle: `El subproyecto "${subproyecto.nombreSubProyecto}" requiere validación urgente de: ${tiposPendientes.join(', ')}. Haga clic para proceder.`,
          fechaCreacion: new Date().toISOString(),
          fechaDeteccion: new Date().toISOString(),
          tiposPendientes: tiposPendientes,
          prioridad: prioridadCalculada,
          // Información completa del subproyecto
          idSubProyecto: subproyecto.idSubProyecto,
          nombreSubProyecto: subproyecto.nombreSubProyecto,
          idProyecto: subproyecto.idProyecto,
          ponderadoValidado: subproyecto.ponderadoValidado,
          presupuestoValidado: subproyecto.presupuestoValidado,
          ritmoValidado: subproyecto.ritmoValidado,
          estadoProyecto: subproyecto.idEstadoProyecto,
          sistemaAutomatico: true, // Marcador para distinguir de notificaciones manuales
          enlace: `/Configuracion-ValidacionSubProyecto?subproyecto=${subproyecto.idSubProyecto}&autoselect=true`
        };
      });

      // 🔒 SOLO AGREGAR nuevas notificaciones, NUNCA eliminar las existentes
      await this.agregarNuevasValidacionesSinBorrar(validacionesReales);
      
      // Crear notificaciones en el servicio de notificaciones para cada usuario autorizado
      await this.crearNotificacionesParaUsuarios(subproyectosPendientes);
      
      console.log(`✅ SISTEMA: ${validacionesReales.length} notificaciones persistentes creadas (se mantienen hasta eliminar manualmente)`);
      
    } catch (error) {
      console.error('❌ Error al generar notificaciones automáticas de validaciones pendientes:', error);
    }
  }

  /**
   * Agrega nuevas validaciones sin borrar las existentes (persistencia total)
   * Las notificaciones se acumulan hasta que el usuario las elimine manualmente
   */
  private async agregarNuevasValidacionesSinBorrar(validacionesNuevas: any[]) {
    const validacionesExistentes = JSON.parse(localStorage.getItem('validacionesPendientes') || '[]');
    
    console.log(`📋 Validaciones existentes: ${validacionesExistentes.length}`);
    console.log(`📝 Validaciones nuevas a evaluar: ${validacionesNuevas.length}`);
    
    // Filtrar solo las validaciones que realmente son nuevas (no duplicadas)
    const validacionesRealmenteNuevas = validacionesNuevas.filter(nueva => {
      return !validacionesExistentes.some((existente: any) => {
        // Evitar duplicados por ID de subproyecto o ID único
        return existente.idSubProyecto === nueva.idSubProyecto || 
               existente.id === nueva.id;
      });
    });
    
    // 🔒 SOLO AGREGAR, NUNCA ELIMINAR - Combinar todas las notificaciones
    const todasLasValidaciones = [...validacionesExistentes, ...validacionesRealmenteNuevas];
    
    localStorage.setItem('validacionesPendientes', JSON.stringify(todasLasValidaciones));
    
    console.log(`💾 PERSISTENCIA TOTAL: ${todasLasValidaciones.length} validaciones guardadas`);
    console.log(`   - ${validacionesExistentes.length} existentes (preservadas)`);
    console.log(`   - ${validacionesRealmenteNuevas.length} nuevas agregadas`);
    console.log(`   - ${validacionesNuevas.length - validacionesRealmenteNuevas.length} duplicados evitados`);
  }

  /**
   * Crea notificaciones en el servicio para usuarios con permisos de validación
   * Evita duplicar notificaciones ya existentes
   */
  private async crearNotificacionesParaUsuarios(subproyectosPendientes: mSubProyecto[]) {
    try {
      // Obtener usuarios con permisos para validar
      const usuariosConPermisos = await this.obtenerUsuariosConPermisosValidacion();
      
      if (usuariosConPermisos.length === 0) {
        console.warn('⚠️ No se encontraron usuarios con permisos de validación');
        return;
      }

      console.log(`👥 Evaluando notificaciones para ${usuariosConPermisos.length} usuarios con permisos`);
      
      let notificacionesCreadas = 0;
      let notificacionesEvitadas = 0;
      
      for (const subproyecto of subproyectosPendientes) {
        const tiposPendientes = this.determinarValidacionesPendientes(subproyecto);
        const prioridad = this.calcularPrioridadValidacion(subproyecto, tiposPendientes);
        
        // Crear identificador único para esta notificación
        const idNotificacionUnico = `validacion_${subproyecto.idSubProyecto}_${Date.now()}`;
        
        // Verificar si ya existe una notificación similar reciente (últimas 24 horas)
        const notificacionExiste = await this.verificarNotificacionExistente(subproyecto.idSubProyecto);
        
        if (notificacionExiste) {
          console.log(`⏭️ Notificación ya existe para subproyecto: ${subproyecto.nombreSubProyecto} - omitiendo`);
          notificacionesEvitadas++;
          continue;
        }
        
        // Crear notificación para cada usuario autorizado
        for (const usuario of usuariosConPermisos) {
          const titulo = `🔔 Validación Requerida: ${subproyecto.nombreSubProyecto}`;
          const descripcion = `Pendiente: ${tiposPendientes.join(', ')}. Estado: ${this.obtenerTextoEstado(subproyecto.idEstadoProyecto)}`;
          const enlace = `/Configuracion-ValidacionSubProyecto?subproyecto=${subproyecto.idSubProyecto}&autoselect=true`;
          
          // Crear notificación persistente (se mantiene hasta eliminar manualmente)
          this._notificacionesService.crearNotificacionPersonalizada(
            usuario.idUsuario,
            'validacion',
            titulo,
            descripcion,
            prioridad,
            enlace
          );
          
          notificacionesCreadas++;
        }
        
        console.log(`✅ Nueva notificación persistente creada para: ${subproyecto.nombreSubProyecto} (${tiposPendientes.join(', ')})`);
      }
      
      console.log(`📊 Resumen de notificaciones: ${notificacionesCreadas} creadas, ${notificacionesEvitadas} evitadas (ya existían)`);
      
    } catch (error) {
      console.error('❌ Error al crear notificaciones para usuarios:', error);
    }
  }

  /**
   * Verifica si ya existe una notificación reciente para un subproyecto específico
   */
  private async verificarNotificacionExistente(idSubProyecto: number): Promise<boolean> {
    try {
      const ahora = new Date().getTime();
      const hace24Horas = ahora - (24 * 60 * 60 * 1000); // 24 horas en millisegundos
      
      // Verificar en localStorage si hay notificaciones recientes
      const validacionesExistentes = JSON.parse(localStorage.getItem('validacionesPendientes') || '[]');
      
      const notificacionReciente = validacionesExistentes.some((validacion: any) => {
        if (validacion.idSubProyecto === idSubProyecto) {
          const fechaCreacion = new Date(validacion.fechaCreacion || validacion.fechaDeteccion).getTime();
          return fechaCreacion > hace24Horas; // Notificación creada en las últimas 24 horas
        }
        return false;
      });
      
      return notificacionReciente;
    } catch (error) {
      console.error('❌ Error al verificar notificación existente:', error);
      return false; // En caso de error, permitir crear la notificación
    }
  }

  /**
   * Determina qué tipos de validación están pendientes para un subproyecto
   */
  private determinarValidacionesPendientes(subproyecto: mSubProyecto): string[] {
    const pendientes: string[] = [];
    
    if (!subproyecto.ponderadoValidado) {
      pendientes.push('Ponderado');
    }
    
    if (!subproyecto.presupuestoValidado) {
      pendientes.push('Presupuesto');
    }
    
    if (!subproyecto.ritmoValidado) {
      pendientes.push('Ritmo');
    }
    
    return pendientes;
  }

  /**
   * Calcula la prioridad de la validación según los tipos pendientes y el estado
   */
  private calcularPrioridadValidacion(subproyecto: mSubProyecto, tiposPendientes: string[]): 'alta' | 'media' | 'baja' {
    // Prioridad alta si:
    // - Tiene múltiples validaciones pendientes (2 o más)
    // - O está en estado crítico (idEstadoProyecto == 4 significa pendiente de validación)
    if (tiposPendientes.length >= 2 || subproyecto.idEstadoProyecto === 4) {
      return 'alta';
    }
    
    // Prioridad media si tiene al menos una validación pendiente
    if (tiposPendientes.length === 1) {
      return 'media';
    }
    
    // Prioridad baja por defecto (aunque no debería llegar aquí si hay pendientes)
    return 'baja';
  }

  /**
   * Obtiene el texto descriptivo del estado del proyecto
   */
  private obtenerTextoEstado(idEstadoProyecto: number): string {
    switch (idEstadoProyecto) {
      case 1: return 'En Planificación';
      case 2: return 'En Ejecución';
      case 3: return 'Completado';
      case 4: return 'Pendiente de Validación';
      case 5: return 'Suspendido';
      case 6: return 'Cancelado';
      default: return `Estado ${idEstadoProyecto}`;
    }
  }

  /**
   * Obtiene usuarios con permisos de validación (Directores y Sub-Gerentes)
   */
      /**
       * Crea una tarea automática cuando se detecta una validación pendiente
       * Incluye nombre y origen (proyecto/subproyecto) en la tarea
       */
      async crearTareaPorValidacionPendiente(subproyecto: mSubProyecto, proyecto: mProyecto) {
        try {
          // Datos para la tarea
          const nombreTarea = `Validación pendiente: ${subproyecto.nombreSubProyecto}`;
          const descripcionTarea = `El subproyecto "${subproyecto.nombreSubProyecto}" del proyecto "${proyecto.nombreProyecto}" requiere validación. Origen: Proyecto ${proyecto.nombreProyecto}`;
          const tarea = new (window as any).mTarea(
            null, // idTarea
            subproyecto.idSubProyecto, // idDetalleSubProyecto (ajustar si corresponde)
            nombreTarea,
            descripcionTarea,
            proyecto.idUsuarioDirector || 0, // Responsable: director del proyecto
            null, // fechaInicioProgramado
            null, // fechaTerminoProgramado
            null, // fechaInicioReal
            null, // fechaTerminoReal
            1, // idEstadoTarea (pendiente)
            new Date().toISOString(), // fechaCreacion
            true, // activo
            null, // fechaRemocion
            this.usuario.idUsuario, // idUsuarioCreador
            null, // idUsuarioRemovedor
            'media', // prioridad
            'Validación' // área
          );
          // Crear tarea usando el servicio
          if (this._sTarea && this._sTarea.postAddTarea) {
            await this._sTarea.postAddTarea(tarea);
            console.log('✅ Tarea automática creada por validación pendiente:', tarea);
            // Crear notificación tipo tarea para mostrar en el panel de notificaciones
            if (this._notificacionesService && this._notificacionesService.crearNotificacionPersonalizada) {
              // Formato compatible con el panel de notificaciones
              const notificacion = {
                id: tarea.idTarea || Math.floor(Math.random() * 1000000),
                tipo: 'tarea',
                titulo: tarea.nombreTarea,
                descripcion: tarea.descripcionTarea,
                fechaCreacion: tarea.fechaCreacion,
                fechaCompromiso: tarea.fechaTerminoProgramado,
                leida: false,
                prioridad: tarea.prioridad || 'media',
                idEstadoTarea: tarea.idEstadoTarea,
                nombreEstadoTarea: 'Pendiente',
                idUsuarioResponsable: tarea.idUsuarioResponsable,
                idUsuarioCreador: tarea.idUsuarioCreador,
                activo: tarea.activo,
                tarea: tarea.idTarea,
                idReferencia: tarea.idTarea,
                tipoReferencia: 'tarea',
                enlace: '/Mis-Tareas',
                idSubProyecto: subproyecto.idSubProyecto,
                origen: 'validacion-pendiente'
              };
              // Usar el método personalizado para agregar la notificación
              // Usar tipo 'general' si 'tarea' no es permitido
              this._notificacionesService.crearNotificacionPersonalizada(
                tarea.idUsuarioResponsable || this.usuario.idUsuario,
                'general',
                notificacion.titulo,
                notificacion.descripcion,
                notificacion.prioridad,
                notificacion.enlace
              );
              // Forzar actualización del panel de notificaciones
              if (this._notificacionesService.generarNotificacionesCompletas) {
                this._notificacionesService.generarNotificacionesCompletas(tarea.idUsuarioResponsable || this.usuario.idUsuario);
                console.log('🔄 Panel de notificaciones actualizado tras crear tarea automática.');
              }
            }
          } else {
            console.warn('⚠️ Servicio de tareas no disponible');
          }
        } catch (error) {
          console.error('❌ Error al crear tarea automática por validación pendiente:', error);
        }
      }
  private async obtenerUsuariosConPermisosValidacion(): Promise<any[]> {
    try {
      const directores = await this._sUsuariosPerfiles.getUsuariosPerfilesbyidPerfil(2).toPromise(); // Directores
      const subGerentes = await this._sUsuariosPerfiles.getUsuariosPerfilesbyidPerfil(1).toPromise(); // Sub-Gerentes
      
      const todosLosUsuarios = [...directores, ...subGerentes];
      console.log(`👥 Usuarios con permisos de validación encontrados: ${todosLosUsuarios.length}`);
      
      return todosLosUsuarios;
    } catch (error) {
      console.error('❌ Error al obtener usuarios con permisos:', error);
      return [];
    }
  }

}
