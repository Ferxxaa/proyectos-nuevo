import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { sMis_Tareas } from '../../services/sMis_Tareas.service';
import { spMis_Tareas } from '../../services/Personalizados/spMis_Tareas.service';
import { NotificacionesService } from '../../services/notificaciones.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit, OnDestroy {
  get rolUsuarioTexto(): string {
    if (!this.usuario) {
      return '';
    }

    return this.usuario.rol || this.usuario.nombrePerfil || this.usuario.perfil || this.usuario.tipoUsuario || this.usuario.nombreUsuario || '';
  }

  get notificacionesTodasSinRitmo(): any[] {
    return this.notificacionesUsuario.filter(n => !this.esNotificacionRitmo(n));
  }

      esNotificacionRitmo(notif: any): boolean {
        // Oculta notificaciones de validación SOLO de ritmo
        if (notif.tipo === 'validacion' && notif.tiposPendientes && Array.isArray(notif.tiposPendientes)) {
          return notif.tiposPendientes.includes('Ritmo');
        }
        // Si la descripción o título menciona ritmo explícitamente (fallback)
        if (notif.tipo === 'validacion' && (
          (notif.descripcion && notif.descripcion.toLowerCase().includes('ritmo')) ||
          (notif.titulo && notif.titulo.toLowerCase().includes('ritmo'))
        )) {
          return true;
        }
        return false;
      }
    verTodasNotificaciones: boolean = false;
  notificacionSeleccionada: any = null;

  usuario:any={}
  sponsors: string[] = [];
  date;
  conteoTareasPendientes: number = 0;
  conteoNotificaciones: number = 0;
  mostrarNotificaciones: boolean = false;
  notificacionesUsuario: any[] = [];
  notificacionesTareasNuevas: any[] = [];
  notificacionesVistas: Set<number> = new Set(); // IDs de tareas ya vistas
  private subscripciones: Subscription[] = [];
  private clickOutsideHandler = this.clickOutside.bind(this);
  mostrarMenuUsuario = false;

  constructor(
    private route: Router, 
    private misTareasService: sMis_Tareas,
    private spMisTareasService: spMis_Tareas,
    private notificacionesService: NotificacionesService
  ) {
    if (!localStorage.hasOwnProperty('usuario')) {
      console.log("usuario no logueado");
    }else{
      try {
        this.usuario=JSON.parse(localStorage.usuario);
        console.log('Usuario cargado:', this.usuario); // Debug

        // Sponsors (opcional): intentar cargar listado desde localStorage si existe
        // Estructura esperada: localStorage['sponsors'] = JSON.stringify(string[])
        try {
          const sponsorsRaw = localStorage.getItem('sponsors');
          if (sponsorsRaw) {
            const sponsorsParsed = JSON.parse(sponsorsRaw);
            if (Array.isArray(sponsorsParsed)) {
              this.sponsors = sponsorsParsed
                .filter(s => typeof s === 'string')
                .map(s => s.trim())
                .filter(Boolean);
            }
          }
        } catch (e) {
          // Si el JSON está corrupto o no es array, se ignora y se usa lista vacía
          this.sponsors = [];
        }

        // Si el usuario ya tiene sponsor, asegurar que se vea en el select
        if (this.usuario && this.usuario.sponsor && typeof this.usuario.sponsor === 'string') {
          const sponsorUsuario = this.usuario.sponsor.trim();
          if (sponsorUsuario && !this.sponsors.includes(sponsorUsuario)) {
            this.sponsors.unshift(sponsorUsuario);
          }
        }
        
        // Cargar notificaciones vistas del localStorage
        this.cargarNotificacionesVistas();
      }
      catch(err) {
          console.log(err.message);
      }
    }
  }

  ngOnInit() {
    this.obtenerConteoTareasPendientes();
    this.inicializarNotificaciones();
    
    // Listener para cerrar dropdown al hacer clic fuera
    document.addEventListener('click', this.clickOutsideHandler);
    
    // Si después de 3 segundos no hay tareas, intentar método alternativo
    setTimeout(() => {
      console.log(`Verificando si necesitamos método alternativo. Conteo actual: ${this.conteoTareasPendientes}`);
      if (this.conteoTareasPendientes === 0) {
        console.log('Intentando método alternativo para obtener tareas...');
        this.obtenerTareasAlternativo();
      } else {
        console.log('No se necesita método alternativo, ya hay tareas contabilizadas.');
      }
    }, 3000);
    
    // Actualizar el conteo cada 5 minutos
    setInterval(() => {
      this.obtenerConteoTareasPendientes();
      this.actualizarNotificaciones();
      // ❌ ELIMINADO: No llamar métodos que sobrescriben las notificaciones completas
      // this.contarNotificacionesDirectamente();
    }, 300000); // 5 minutos = 300000 ms
  }

  ngOnDestroy() {
    this.subscripciones.forEach(sub => sub.unsubscribe());
    document.removeEventListener('click', this.clickOutsideHandler);
  }

  toggleMenuUsuario(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.mostrarMenuUsuario = !this.mostrarMenuUsuario;
  }

  clickOutside(event: Event) {
    const target = event.target as HTMLElement;
    const notificationContainer = target.closest('.notifications-container-header');
    const userMenuContainer = target.closest('.dropdown-menu') || target.closest('#notifications-dropdown-toggle');
    
    if (!notificationContainer && this.mostrarNotificaciones) {
      this.mostrarNotificaciones = false;
    }

    if (!userMenuContainer && this.mostrarMenuUsuario) {
      this.mostrarMenuUsuario = false;
    }
  }

  obtenerConteoTareasPendientes() {
    if (this.usuario && this.usuario.idUsuario) {
      console.log('Obteniendo tareas para usuario ID usando el mismo servicio que MisTareas:', this.usuario.idUsuario);
      
      // Usar el mismo servicio y filtro que usa el componente MisTareas
      this.spMisTareasService.getMis_TareasbyIdUsuario(this.usuario.idUsuario)
        .subscribe(
          (tareas) => {
            console.log('Tareas obtenidas del servicio spMisTareas:', tareas);
            
            if (tareas && Array.isArray(tareas)) {
              console.log('Total de tareas recibidas:', tareas.length);
              
              // Verificar si el usuario puede ver todas las tareas (jolivares o gerencia)
              const esJolivares = this.usuario.nombreUsuario && 
                this.usuario.nombreUsuario.toLowerCase().includes('jolivares');
              const esGerencia = this.usuario.idPerfil === 1 || 
                this.usuario.idPerfil === 2 || 
                this.usuario.idPerfil === 11;
              
              const puedeVerTodas = this.usuario && (esJolivares || esGerencia);

              let tareasPendientesConteo, tareasPendientesNotificaciones;
              
              if (puedeVerTodas) {
                // jolivares y gerencia ven todas las tareas activas
                tareasPendientesConteo = tareas.filter(el => el.idEstadoTarea == 1 || el.idEstadoTarea == 2);
                tareasPendientesNotificaciones = tareas.filter(el => el.idEstadoTarea == 1 || el.idEstadoTarea == 2);
              } else {
                // Para el CONTEO: incluir tareas asignadas Y creadas
                tareasPendientesConteo = tareas.filter(el => {
                  const estadoValido = el.idEstadoTarea == 1 || el.idEstadoTarea == 2;
                  const esResponsable = el.idUsuarioResponsable == this.usuario.idUsuario;
                  const esCreador = el.idUsuarioCreador == this.usuario.idUsuario;
                  return estadoValido && (esResponsable || esCreador);
                });
                
                // Para las NOTIFICACIONES: SOLO tareas asignadas (responsable)
                tareasPendientesNotificaciones = tareas.filter(el => {
                  const estadoValido = el.idEstadoTarea == 1 || el.idEstadoTarea == 2;
                  const esResponsable = el.idUsuarioResponsable == this.usuario.idUsuario;
                  return estadoValido && esResponsable;
                });
              }
              
              this.conteoTareasPendientes = tareasPendientesConteo.length;
              console.log(`Total tareas pendientes (badge): ${this.conteoTareasPendientes}`);
              console.log(`Total notificaciones: ${tareasPendientesNotificaciones.length}`);
              
              // Mostrar resumen de estados para debugging
              this.mostrarResumenTareas(tareas, tareasPendientesConteo);
              
            } else {
              console.log('No se recibieron tareas válidas:', tareas);
              this.conteoTareasPendientes = 0;
            }
          },
          (error) => {
            console.error('Error al obtener tareas del usuario:', error);
            this.conteoTareasPendientes = 0;
          }
        );
    } else {
      console.log('Usuario no disponible o sin ID:', this.usuario);
      this.conteoTareasPendientes = 0;
    }
  }

  CerrarSesion(){
    localStorage.removeItem("usuario");
    this.route.navigate(['/Login']);
  }

  irAMisTareas(){
    this.route.navigate(['/Ver-Tareas']);
  }

  // Método alternativo ya no es necesario porque ahora usamos el mismo servicio que MisTareas
  obtenerTareasAlternativo() {
    console.log('Método alternativo ya no es necesario - usando spMisTareas directamente');
  }

  mostrarResumenTareas(todasLasTareas: any[], tareasPendientes: any[]) {
    console.log('=== RESUMEN DE TAREAS ===');
    console.log(`Total de tareas recibidas: ${todasLasTareas.length}`);
    console.log(`Tareas pendientes filtradas: ${tareasPendientes.length}`);
    
    // Agrupar por estado
    const estadosCount = {};
    todasLasTareas.forEach(tarea => {
      const estado = tarea.nombreEstadoTarea || 'Sin estado';
      estadosCount[estado] = (estadosCount[estado] || 0) + 1;
    });
    
    console.log('Estados de tareas:');
    Object.keys(estadosCount).forEach(estado => {
      console.log(`  - ${estado}: ${estadosCount[estado]} tareas`);
    });
    
    // Mostrar tareas activas vs inactivas
    const tareasActivas = todasLasTareas.filter(t => t.activo === true || t.activo === 'true' || t.activo === 1);
    const tareasInactivas = todasLasTareas.filter(t => !(t.activo === true || t.activo === 'true' || t.activo === 1));
    
    console.log(`Tareas activas: ${tareasActivas.length}`);
    console.log(`Tareas inactivas: ${tareasInactivas.length}`);
    console.log('=== FIN RESUMEN ===');
  }

  inicializarNotificaciones() {
    if (this.usuario && this.usuario.idUsuario) {
      // Cargar notificaciones vistas si no se ha hecho ya
      if (this.notificacionesVistas.size === 0) {
        this.cargarNotificacionesVistas();
      }
      
      // Suscribirse al conteo de notificaciones no leídas del servicio
      const subConteo = this.notificacionesService.obtenerConteoNoLeidas()
        .subscribe(conteo => {
          // Solo actualizar si el servicio tiene un conteo diferente
          if (conteo !== this.conteoNotificaciones) {
            console.log(`Conteo del servicio: ${conteo}, conteo actual: ${this.conteoNotificaciones}`);
          }
        });

      this.subscripciones.push(subConteo);
      
      // ✅ Suscribirse UNA SOLA VEZ a las notificaciones completas del servicio
      const subNotificaciones = this.notificacionesService.obtenerNotificaciones()
        .subscribe(notificaciones => {
          console.log('🔄 Notificaciones recibidas del servicio:', notificaciones.length);
          console.log('📋 IDs de notificaciones vistas actualmente:', Array.from(this.notificacionesVistas));
          
          // 🔄 Preservar el estado de notificaciones leídas localmente
          const notificacionesConEstado = (notificaciones || []).map(notif => {
            const yaVista = this.notificacionesVistas.has(notif.id);
            if (yaVista) {
              console.log(`✓ Notificación ${notif.id} marcada como leída (en notificacionesVistas)`);
            }
            return { ...notif, leida: yaVista };
          });

          this.notificacionesUsuario = notificacionesConEstado;
          // Filtrar solo tareas NO leídas para la sección "Nuevas"
          this.notificacionesTareasNuevas = notificacionesConEstado.filter(n => !n.leida);
          
          this.actualizarConteoNotificaciones();
          console.log(`📨 Notificaciones totales: ${this.notificacionesUsuario.length}, Nuevas (no leídas): ${this.notificacionesTareasNuevas.length}, Contador: ${this.conteoNotificaciones}`);
        });

      this.subscripciones.push(subNotificaciones);
      
      // Generar notificaciones completas (incluye tareas, licitaciones y validaciones)
      this.actualizarNotificaciones();
    }
  }

  actualizarNotificaciones() {
    if (this.usuario && this.usuario.idUsuario) {
      // Verificar permisos antes de generar notificaciones
      const puedeVerTodas = this.usuario && (
        this.usuario.nombreUsuario === 'jolivares' ||
        this.usuario.idPerfil === 1 || 
        this.usuario.idPerfil === 2 || 
        this.usuario.idPerfil === 11
      );

      if (puedeVerTodas) {
        // Para jolivares y gerencia, generar notificaciones de todas las tareas
        console.log('Generando notificaciones para usuario con permisos especiales');
      }
      
      // Actualizar el servicio de notificaciones (incluye tareas, licitaciones y validaciones)
      this.notificacionesService.generarNotificacionesCompletas(this.usuario.idUsuario);
    }
  }

  contarNotificacionesDirectamente() {
    // ❌ MÉTODO DESHABILITADO: Este método sobrescribe las notificaciones completas
    // Ahora usamos generarNotificacionesCompletas() que maneja tareas + validaciones + licitaciones
    console.log('🚫 Método contarNotificacionesDirectamente() deshabilitado - usando notificaciones completas del servicio');
    return;
    
    /* CÓDIGO ORIGINAL COMENTADO PARA EVITAR CONFLICTOS
    if (this.usuario && this.usuario.idUsuario) {
      // Verificar si el usuario puede ver todas las tareas (jolivares o gerencia)
      const esJolivares = this.usuario.nombreUsuario && 
        this.usuario.nombreUsuario.toLowerCase().includes('jolivares');
      const esGerencia = this.usuario.idPerfil === 1 || 
        this.usuario.idPerfil === 2 || 
        this.usuario.idPerfil === 11;
      
      const puedeVerTodas = this.usuario && (esJolivares || esGerencia);

      console.log(`Usuario: ${this.usuario.nombreUsuario}, Perfil: ${this.usuario.idPerfil}, ID: ${this.usuario.idUsuario}, Puede ver todas: ${puedeVerTodas}`);

      if (puedeVerTodas) {
        // jolivares y gerencia: obtener notificaciones de todas las tareas del sistema
        console.log('Obteniendo notificaciones globales para usuario privilegiado');
        this.obtenerNotificacionesTodosUsuarios();
      } else {
        // Usuarios normales: solo sus tareas
        this.spMisTareasService.getMis_TareasbyIdUsuario(this.usuario.idUsuario)
          .subscribe(
            (tareas) => {
              if (tareas && Array.isArray(tareas)) {
                // Solo notificaciones de tareas donde es RESPONSABLE (asignadas a él)
                const tareasPendientes = tareas.filter(el => {
                  const estadoValido = el.idEstadoTarea == 1 || el.idEstadoTarea == 2;
                  const esResponsable = el.idUsuarioResponsable == this.usuario.idUsuario;
                  // NO incluir tareas creadas, solo las asignadas
                  return estadoValido && esResponsable;
                });
                
                // Crear las notificaciones para el dropdown
                this.crearNotificacionesParaDropdown(tareasPendientes);
                console.log(`Notificaciones usuario normal: ${this.conteoNotificaciones} (${tareasPendientes.length} total)`);
              }
            },
            (error) => {
              console.error('Error al contar notificaciones directamente:', error);
              this.conteoNotificaciones = 0;
              this.notificacionesUsuario = [];
            }
          );
      }
    }
    */
  }

    // Método para obtener notificaciones de todos los usuarios (jolivares y gerencia)
  obtenerNotificacionesTodosUsuarios() {
    console.log('Obteniendo notificaciones para usuario privilegiado:', this.usuario.nombreUsuario);
    
    // Estrategia: intentar obtener tareas de múltiples usuarios comunes secuencialmente
    const usuariosComunes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 42, 58, this.usuario.idUsuario]; // Más usuarios para más cobertura
    let todasLasTareasAcumuladas = [];
    let usuariosProcessados = 0;
    
    const procesarUsuario = (idUsuario: number, index: number) => {
      this.spMisTareasService.getMis_TareasbyIdUsuario(idUsuario)
        .subscribe(
          (tareas) => {
            usuariosProcessados++;
            console.log(`Usuario ${idUsuario}: ${tareas ? tareas.length : 0} tareas`);
            
            if (tareas && Array.isArray(tareas)) {
              // Filtrar solo tareas activas
              const tareasActivas = tareas.filter(el => el.idEstadoTarea == 1 || el.idEstadoTarea == 2);
              console.log(`  - Tareas activas del usuario ${idUsuario}: ${tareasActivas.length}`);
              
              // Agregar todas las tareas activas (eliminaremos duplicados al final)
              todasLasTareasAcumuladas = todasLasTareasAcumuladas.concat(tareasActivas);
            }
            
            // Si ya procesamos todos los usuarios, crear notificaciones
            if (usuariosProcessados >= usuariosComunes.length) {
              // Eliminar duplicados por idTarea al final
              const tareasUnicas = todasLasTareasAcumuladas.filter((tarea, index, self) => 
                index === self.findIndex(t => t.idTarea === tarea.idTarea)
              );
              
              console.log(`Total tareas antes de eliminar duplicados: ${todasLasTareasAcumuladas.length}`);
              console.log(`Total tareas únicas: ${tareasUnicas.length}`);
              
              this.crearNotificacionesParaDropdown(tareasUnicas);
            } else if (index + 1 < usuariosComunes.length) {
              // Procesar siguiente usuario con un pequeño delay
              setTimeout(() => procesarUsuario(usuariosComunes[index + 1], index + 1), 50);
            }
          },
          (error) => {
            usuariosProcessados++;
            console.log(`Error con usuario ${idUsuario}:`, error);
            
            // Si terminamos de procesar todos los usuarios, generar notificaciones
            if (usuariosProcessados >= usuariosComunes.length) {
              if (todasLasTareasAcumuladas.length === 0) {
                console.log('No se obtuvieron tareas, usando fallback: tareas del usuario actual');
                this.spMisTareasService.getMis_TareasbyIdUsuario(this.usuario.idUsuario)
                  .subscribe(tareas => {
                    if (tareas && Array.isArray(tareas)) {
                      const tareasActivas = tareas.filter(el => el.idEstadoTarea == 1 || el.idEstadoTarea == 2);
                      this.crearNotificacionesParaDropdown(tareasActivas);
                    }
                  });
              } else {
                // Eliminar duplicados y crear notificaciones
                const tareasUnicas = todasLasTareasAcumuladas.filter((tarea, index, self) => 
                  index === self.findIndex(t => t.idTarea === tarea.idTarea)
                );
                console.log(`Fallback - Total tareas únicas: ${tareasUnicas.length}`);
                this.crearNotificacionesParaDropdown(tareasUnicas);
              }
            } else if (index + 1 < usuariosComunes.length) {
              // Continuar con el siguiente usuario
              setTimeout(() => procesarUsuario(usuariosComunes[index + 1], index + 1), 100);
            }
          }
        );
    };
    
    // Comenzar con el primer usuario
    procesarUsuario(usuariosComunes[0], 0);
  }

  crearNotificacionesParaDropdown(tareas: any[]) {
    const ahora = new Date();
    
    this.notificacionesUsuario = tareas.map(tarea => {
      const notif: any = {
        id: tarea.idTarea,
        titulo: `${tarea.descripcionTarea || tarea.nombreTarea || 'Tarea sin nombre'}`,
        descripcion: tarea.observacionTarea || 'Sin observaciones',
        fechaCreacion: tarea.fechaCreacion || new Date(),
        fechaCompromiso: tarea.fechaTerminoProgramado, // Usar el campo correcto
        leida: this.notificacionesVistas.has(tarea.idTarea), // Marcar como leída si ya fue vista
        tipo: 'tarea',
        colorTexto: '#026aa7',
        prioridad: 'media',
        // Agregar información para navegación
        tarea: tarea.idTarea, // ID de la tarea para resaltar
        idReferencia: tarea.idTarea,
        tipoReferencia: 'tarea',
        enlace: '/Proyecto-TableroControl' // Enlace base - se podría mejorar con el proyecto específico
      };

      // Determinar prioridad y color usando la misma lógica que mis-tareas
      if (this.isOverdue(tarea.fechaTerminoProgramado)) {
        // Tarea VENCIDA: la fecha de compromiso ya pasó
        notif.prioridad = 'alta';
        notif.titulo = `⚠️ VENCIDA: ${notif.titulo}`;
        notif.colorTexto = '#dc3545';
      } else if (this.isDueSoon(tarea.fechaTerminoProgramado)) {
        // Tarea próxima a vencer (3 días o menos)
        notif.prioridad = 'alta';
        notif.titulo = `🔔 Próxima a vencer: ${notif.titulo}`;
        notif.colorTexto = '#026aa7';
        notif.colorFondo = '#e3f6fd';
      }

      return notif;
    }).slice(0, 20); // Mostrar máximo 20 notificaciones en el dropdown
    
    console.log('Notificaciones creadas para el panel:', this.notificacionesUsuario.length);
    console.log('Tipos de notificaciones:', {
      total: this.notificacionesUsuario.length,
      vencidas: this.notificacionesUsuario.filter(n => n.titulo.includes('VENCIDA')).length,
      porVencer: this.notificacionesUsuario.filter(n => n.titulo.includes('Próxima a vencer')).length,
      normales: this.notificacionesUsuario.filter(n => !n.titulo.includes('VENCIDA') && !n.titulo.includes('Próxima a vencer')).length
    });
    console.log('Usuarios responsables:', this.notificacionesUsuario.map(n => ({ 
      tarea: n.id, 
      titulo: n.titulo.substring(0, 50) + '...', 
      prioridad: n.prioridad 
    })));
    
    // Actualizar el conteo basado en las notificaciones no vistas
    this.actualizarConteoNotificaciones();
  }

  marcarComoLeida(notificacion: any) {
    console.log(`📖 Marcando como leída: ${notificacion.titulo}`);
    notificacion.leida = true;
    this.notificacionesVistas.add(notificacion.id);
    this.guardarNotificacionesVistas();
    
    // Actualizar la notificación en el servicio también
    this.notificacionesService.marcarNotificacionComoLeida(notificacion.id);
    
    // Actualizar la lista de nuevas para eliminar las leídas inmediatamente
    this.notificacionesTareasNuevas = this.notificacionesUsuario.filter(n => !n.leida);
    
    this.actualizarConteoNotificaciones();
  }

  marcarTodasComoLeidas() {
    this.notificacionesUsuario.forEach(notif => {
      notif.leida = true;
      this.notificacionesVistas.add(notif.id);
    });
    
    this.guardarNotificacionesVistas();
    
    // Actualizar la lista de nuevas para que quede vacía
    this.notificacionesTareasNuevas = [];
    
    this.actualizarConteoNotificaciones();
    console.log('Todas las notificaciones marcadas como leídas');
  }

  navegarANotificacion(notificacion: any) {
    console.log('🔔 Navegando a notificación:', notificacion);
    this.marcarComoLeida(notificacion);
    this.mostrarNotificaciones = false;

    // Si es una notificación de tarea
    if (notificacion.tipo === 'tarea') {
      const queryParams = {
        destacarTarea: notificacion.idTarea || notificacion.idReferencia || notificacion.tarea,
        tab: 'tareas'
      };
      // Navegar a Tablero-Control solo si tiene subproyecto y origen correcto
      if (
        notificacion.idSubProyecto &&
        notificacion.idSubProyecto > 0 &&
        notificacion.origen === 'tablero-control'
      ) {
        this.route.navigate([`/Tablero-Control/${notificacion.idSubProyecto}`], { queryParams });
      } else {
        // Todas las demás van a Mis Tareas y destacan la tarea
        this.route.navigate(['/Ver-Tareas'], { queryParams });
      }
    } else if (notificacion.tipo === 'validacion') {
      // Navegar a la página de validación de subproyectos para validar ritmo
      console.log('🔔 Navegando a validación de subproyecto:', notificacion.titulo);
      
      if (notificacion.enlace && notificacion.enlace.includes('?')) {
        // Si tiene enlace con parámetros, parsearlo correctamente
        const [ruta, parametros] = notificacion.enlace.split('?');
        const queryParams: any = {};
        
        // Parsear los parámetros de la URL
        parametros.split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key && value) {
            queryParams[key] = decodeURIComponent(value);
          }
        });
        
        // Agregar parámetros adicionales para mejor UX
        queryParams.focus = 'validaciones';
        queryParams.destacar = 'ritmo';
        
        this.route.navigate([ruta], { queryParams });
        console.log(`🎯 Navegando con enlace parseado: ${ruta}`, queryParams);
        
      } else if (notificacion.idReferencia) {
        // Navegar con parámetros para preseleccionar el subproyecto y mostrar validaciones
        this.route.navigate(['/Configuracion-ValidacionSubProyecto'], {
          queryParams: { 
            subproyecto: notificacion.idReferencia, 
            autoselect: 'true',
            focus: 'validaciones',
            destacar: 'ritmo'
          }
        });
        console.log(`🎯 Navegando a validación con subproyecto ID: ${notificacion.idReferencia}`);
      } else {
        // Navegar a la página general de validaciones
        this.route.navigate(['/Configuracion-ValidacionSubProyecto'], {
          queryParams: { 
            focus: 'validaciones',
            buscar: notificacion.titulo.includes('TARAPACA') ? 'TARAPACA' : ''
          }
        });
        console.log('🎯 Navegando a validaciones generales');
      }
    } else if (notificacion.tipo === 'licitacion') {
      // Navegar a la página de licitaciones
      if (notificacion.enlace) {
        this.route.navigate([notificacion.enlace]);
      } else {
        this.route.navigate(['/demo-licitaciones']);
      }
    } else {
      // Otros tipos de notificación: ir a Mis Tareas
      this.route.navigate(['/Ver-Tareas']);
    }
  }

  obtenerIconoTipo(tipo: string): string {
    switch (tipo) {
      case 'tarea': return 'fa-tasks';
      case 'proyecto': return 'fa-folder-open';
      case 'reunion': return 'fa-calendar';
      case 'vencimiento': return 'fa-clock-o';
      case 'ritmo': return 'fa-tachometer';
      case 'validacion': return 'fa-exclamation-triangle';  // Ícono más distintivo para validaciones
      case 'licitacion': return 'fa-gavel';
      case 'bitacora': return 'fa-file-text';
      default: return 'fa-bell';
    }
  }

  estaVencida(notificacion: any): boolean {
    if (!notificacion.fechaCompromiso) return false;
    return new Date(notificacion.fechaCompromiso) < new Date();
  }

  diasHastaVencimiento(notificacion: any): number {
    if (!notificacion.fechaCompromiso) return 0;
    const ahora = new Date();
    const vencimiento = new Date(notificacion.fechaCompromiso);
    const diferencia = vencimiento.getTime() - ahora.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  toggleNotificaciones() {
    this.mostrarMenuUsuario = false;
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
    console.log('Toggle notificaciones:', this.mostrarNotificaciones);
    console.log('Usuario actual:', this.usuario ? this.usuario.nombreUsuario : 'No definido');
    
    // Si se abre el dropdown, mostrar las notificaciones actuales
    if (this.mostrarNotificaciones) {
      console.log('Mostrando dropdown de notificaciones...');
      console.log('Array notificacionesUsuario actual:', this.notificacionesUsuario.length);
      // ❌ ELIMINADO: No llamar método que sobrescribe las notificaciones completas
      // this.contarNotificacionesDirectamente();
      
      // Mostrar el estado actual
      setTimeout(() => {
        console.log('Array notificacionesUsuario después:', this.notificacionesUsuario.length);
        console.log('Notificaciones actuales:', this.notificacionesUsuario.map(n => n.titulo));
      }, 1000);
      
      // Marcar como vistas después de un pequeño delay para que se rendericen
      setTimeout(() => {
        this.marcarNotificacionesComoVistas();
      }, 500);
    }
  }

  irANotificaciones() {
    this.route.navigate(['/notificaciones']);
  }

  // Cargar las notificaciones vistas desde localStorage
  cargarNotificacionesVistas() {
    if (this.usuario && this.usuario.idUsuario) {
      const key = `notificaciones_vistas_${this.usuario.idUsuario}`;
      const vistas = localStorage.getItem(key);
      
      if (vistas) {
        try {
          const idsVistas = JSON.parse(vistas);
          this.notificacionesVistas = new Set(idsVistas);
          console.log('✅ Notificaciones vistas cargadas desde localStorage:', this.notificacionesVistas.size, 'IDs:', Array.from(this.notificacionesVistas));
        } catch (error) {
          console.error('Error al cargar notificaciones vistas:', error);
          this.notificacionesVistas = new Set();
        }
      } else {
        console.log('⚠️ No hay notificaciones vistas guardadas en localStorage');
      }
    }
  }

  // Guardar las notificaciones vistas en localStorage
  guardarNotificacionesVistas() {
    if (this.usuario && this.usuario.idUsuario) {
      const key = `notificaciones_vistas_${this.usuario.idUsuario}`;
      const idsArray = Array.from(this.notificacionesVistas);
      localStorage.setItem(key, JSON.stringify(idsArray));
      console.log('💾 Notificaciones vistas guardadas en localStorage:', idsArray.length, 'IDs:', idsArray);
    }
  }

  // Marcar notificaciones como vistas cuando se abre el dropdown
  marcarNotificacionesComoVistas() {
    let hayNuevasVistas = false;
    // Solo marcar como vistas las notificaciones de tareas nuevas
    this.notificacionesUsuario.forEach(notif => {
      if (notif.tipo === 'tarea' && !this.notificacionesVistas.has(notif.id)) {
        this.notificacionesVistas.add(notif.id);
        notif.leida = true;
        hayNuevasVistas = true;
      }
    });
    if (hayNuevasVistas) {
      this.guardarNotificacionesVistas();
      this.actualizarConteoNotificaciones();
      console.log('Notificaciones de tareas nuevas marcadas como vistas:', this.notificacionesVistas.size);
    }
  }

  // Actualizar el conteo excluyendo las notificaciones ya vistas
  actualizarConteoNotificaciones() {
    // Contar solo notificaciones NO leídas
    const notificacionesNoLeidas = this.notificacionesUsuario.filter(n => !n.leida);
    this.conteoNotificaciones = notificacionesNoLeidas.length;
    console.log(`🔢 Contador actualizado: ${this.conteoNotificaciones} notificaciones no leídas`);
  }

  // Método de debug para probar manualmente
  debugNotificaciones() {
    console.log('=== DEBUG NOTIFICACIONES ===');
    console.log('Conteo tareas pendientes:', this.conteoTareasPendientes);
    console.log('Conteo notificaciones:', this.conteoNotificaciones);
    console.log('Notificaciones vistas:', this.notificacionesVistas.size);
    console.log('Total notificaciones usuario:', this.notificacionesUsuario.length);
    console.log('Usuario ID:', this.usuario ? this.usuario.idUsuario : 'undefined');
    
    // ❌ ELIMINADO: No forzar actualizaciones que sobrescriben las notificaciones completas
    // this.contarNotificacionesDirectamente();
  }

  // Métodos para verificar fechas de vencimiento (misma lógica que mis-tareas)
  isOverdue(fechaTermino: string): boolean {
    if (!fechaTermino) return false;
    const today = new Date();
    const dueDate = new Date(fechaTermino);
    return dueDate < today;
  }

  isDueSoon(fechaTermino: string): boolean {
    if (!fechaTermino) return false;
    const today = new Date();
    const dueDate = new Date(fechaTermino);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays > 0;
  }

  guardarDatosUsuario() {
    // Aquí puedes agregar la lógica para guardar los datos del usuario
    // Por ejemplo, enviar los datos a un servicio o actualizar localStorage
    // alert('Datos de usuario guardados');
  }

}
