import { Component, OnInit } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/of';
import { configuracion } from '../../config';
import { spMis_Tareas } from '../../services/Personalizados/spMis_Tareas.service';
// import { Calendar } from 'Personalizado/calendar.js'; // Comentado - no se usa en el código

declare var jQuery: any;
declare var $: any;


@Component({
  selector: 'app-calendario-tareas',
  templateUrl: './calendario-tareas.component.html',
  styleUrls: ['./calendario-tareas.component.css'],
  providers: [spMis_Tareas]
})
export class CalendarioTareasComponent implements OnInit {

  Fecha: string;
  widget: boolean;
  fechaEdit: Date;
  // Filtro de estado activo para los botones
  estadoFiltroActivo: string = '';
  
  // Propiedades para el filtrado
  todosLosEventos: any[] = [];
  eventosFiltrados: any[] = [];
  eventosMisTareas: any[] = []; // Eventos construidos desde la misma fuente que "Mis Tareas"
  calendario: any; // Referencia al objeto calendario
  usuarioActual: any; // Usuario logueado
  esGerencia: boolean = false; // Si el usuario tiene permisos de gerencia
  perfilesUsuario: any[] = []; // Perfiles del usuario

  constructor(private _http: Http, private _spMis_Tareas: spMis_Tareas) { 
    // Obtener usuario actual del localStorage
    if (localStorage.getItem('usuario')) {
      this.usuarioActual = JSON.parse(localStorage.getItem('usuario'));
      console.log('Usuario cargado desde localStorage:', this.usuarioActual);
    }
  }

  private getAllTareasMisTareas(): Observable<any[]> {
    // Mis Tareas usa un muestreo de usuarios comunes y elimina duplicados por idTarea.
    const usuariosComunes = [1, 2, 3, 4, 7, 9, 42, 58];
    const observables = usuariosComunes.map(idUsuario =>
      this._spMis_Tareas.getMis_TareasbyIdUsuario(idUsuario).catch(() => Observable.of([]))
    );

    return Observable.forkJoin(observables).map((resultados: any[]) => {
      const todas = resultados.reduce((acc, tareas) => acc.concat(tareas || []), []);
      const unicas = todas.filter((tarea, index, self) =>
        index === self.findIndex(t => t && tarea && t.idTarea === tarea.idTarea)
      );
      return unicas;
    });
  }

  private tareaToEventoCalendario(tarea: any): any {
    if (!tarea) return tarea;
    const evento: any = { ...tarea };
    // Alinear campos usados por filtros y permisos
    evento.idTarea = tarea.idTarea;
    evento.idUsuarioResponsable = tarea.idUsuarioResponsable;
    evento.idUsuarioCreador = tarea.idUsuarioCreador;
    evento.descripcionTarea = tarea.descripcionTarea || tarea.descripcion || tarea.nombreTarea || '';
    evento.nombreTarea = tarea.nombreTarea || '';
    evento.fechaCreacion = tarea.fechaCreacion;
    evento.fechaInicioProgramado = tarea.fechaInicioProgramado;
    evento.fechaTerminoProgramado = tarea.fechaTerminoProgramado;
    // Campo estándar que la normalización entiende como compromiso
    evento.fechaCompromiso = tarea.fechaTerminoProgramado || tarea.fechaCompromiso;

    // En este calendario históricamente `title` suele representar al responsable
    evento.title = tarea.UsuarioResponsable || tarea.responsable || tarea.title || '';
    return evento;
  }

  private cargarTareasDesdeMisTareas(): void {
    const loc = this;
    this.getAllTareasMisTareas().subscribe(tareas => {
      const eventos = (Array.isArray(tareas) ? tareas : [])
        .map(t => loc.tareaToEventoCalendario(t))
        .map(ev => loc.normalizarEventoParaCalendario(ev));

      // Aplicar permisos iguales a la carga inicial y excluir canceladas
      const eventosConPermisos = loc.filtrarEventosSegunPermisos(eventos).filter(ev => !loc.esCancelada(ev));
      loc.eventosMisTareas = eventosConPermisos;

      // Evitar duplicados por idTarea contra lo ya cargado desde Vis_Calendario
      const idsExistentes = new Set(
        (loc.todosLosEventos || [])
          .map(e => e && (e.idTarea || e.IdTarea || e.id))
          .filter(v => v !== null && v !== undefined)
      );

      const nuevos = eventosConPermisos.filter(e => {
        const id = e && (e.idTarea || e.IdTarea || e.id);
        return id !== null && id !== undefined && !idsExistentes.has(id);
      });

      if (nuevos.length === 0) {
        console.log('Mis Tareas -> Calendario: no hay eventos nuevos para agregar');
        return;
      }

      console.log('Mis Tareas -> Calendario: agregando eventos nuevos:', nuevos.length);
      loc.todosLosEventos = [...(loc.todosLosEventos || []), ...nuevos];

      // Re-aplicar filtros para refrescar el calendario (el calendario siempre muestra todosLosEventos)
      loc.aplicarFiltros();
    }, err => {
      console.error('Error cargando tareas desde Mis Tareas:', err);
    });
  }

  private esMismoDia(a: any, b: Date): boolean {
    const da = (typeof a === 'string') ? this.parseFechaLocal(a) : (a instanceof Date ? a : null);
    if (!da || !b) return false;
    return da.getFullYear() === b.getFullYear() && da.getMonth() === b.getMonth() && da.getDate() === b.getDate();
  }

  private esCancelada(evento: any): boolean {
    if (!evento) return false;

    if (evento.idEstadoTarea !== null && evento.idEstadoTarea !== undefined) {
      return evento.idEstadoTarea == 3;
    }

    const nombre = (evento.nombreEstadoTarea || evento.estado || '').toString().toLowerCase();
    return nombre.includes('cancel');
  }

  ngOnInit() {


    // Cambiar color del nav al entrar a Calendario
    setTimeout(() => {
      if (typeof $ !== 'undefined') {
        $('#sidebar').css('background-color', '#89658f');
      } else {
        const nav = document.getElementById('sidebar');
        if (nav) nav.style.backgroundColor = '#89658f';
      }
    }, 100);

    $.getScript("http://trazas-nbi.com/Bootstrap/ajax-bootstrap4/js/settings.js");
    $.getScript("http://trazas-nbi.com/Bootstrap/ajax-bootstrap4/js/app.js");

    // Verificar permisos después de que el DOM esté listo
    if (this.usuarioActual) {
      console.log('Verificando permisos en ngOnInit para usuario:', this.usuarioActual);
      this.verificarPermisos();
    }

    this.fechaEdit = new Date()
    this.Fecha = "" + new Date();
    //Calendar()
    //let cal = Calendar;

    // Comentado para evitar errores de draggable - funcionalidad no utilizada en este contexto
    /*
    $('#external-events').find('div.external-event').each(function () {

      // create an Event Object (http://arshaw.com/fullcalendar/docs/event_data/Event_Object/)
      // it doesn't need to have a start or end
      var eventObject = {
        title: $.trim($(this).text()) // use the element's text as the event title
      };

      // store the Event Object in the DOM element so we can get to it later
      $(this).data('eventObject', eventObject);

      // make the event draggable using jQuery UI
      $(this).draggable({
        zIndex: 999,
        revert: true,      // will cause the event to go back to its
        revertDuration: 0  //  original position after the drag
      });

    });
    */

    let loc = this;

    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth();
    var y = date.getFullYear();
    var $calendar;

    $.get("http://trazas-nbi.com:1234/api/Vis_Calendario", function (data) {
      //console.log(data);
      
      // Guardar los datos originales para el filtrado
      // Aplicar filtro de permisos antes de guardar los datos
      // MODIFICACIÓN: agregar descripción al título del evento para mostrar en el calendario
      const eventosFiltradosPermisos = loc.filtrarEventosSegunPermisos(data).map(ev => {
        ev = loc.normalizarEventoParaCalendario(ev);

        // Aviso visible: tareas sin fecha de término/compromiso
        loc.aplicarAvisoSinCompromisoEnTitulo(ev);
        return ev;
      }).filter(ev => !loc.esCancelada(ev));
      loc.todosLosEventos = eventosFiltradosPermisos;
      loc.eventosFiltrados = [...eventosFiltradosPermisos];

      $calendar = $('#calendar').fullCalendar({
        header: {
          left: '',
          center: '',
          right: ''
        },

        selectable: true,
        selectHelper: true,
        select: function (start, end, allDay) {
          var fechaSeleccionada = start.getFullYear() + "-" + 
            String(start.getMonth() + 1).padStart(2, '0') + "-" + 
            String(start.getDate()).padStart(2, '0');
          
          console.log('Fecha seleccionada:', fechaSeleccionada);
          
          // Usar la nueva función para mostrar tareas de la fecha específica con formato moderno
          loc.mostrarTareasDelDia(fechaSeleccionada);
        },
        editable: false,        // Desactivar edición para evitar errores de drag
        droppable: false,       // Desactivar drop para evitar errores

        drop: function (date, allDay) { // this function is called when something is dropped

          // retrieve the dropped element's stored Event Object
          var originalEventObject = $(this).data('eventObject');

          // we need to copy it, so that multiple events don't have a reference to the same object
          var copiedEventObject = $.extend({}, originalEventObject);

          // assign it the date that was reported
          copiedEventObject.start = date;
          copiedEventObject.allDay = allDay;

          var $categoryClass = $(this).data('event-class');
          if ($categoryClass)
            copiedEventObject['className'] = [$categoryClass];

          // render the event on the calendar
          // the last `true` argument determines if the event "sticks" (http://arshaw.com/fullcalendar/docs/event_rendering/renderEvent/)
          $('#calendar').fullCalendar('renderEvent', copiedEventObject, true);

          $(this).remove();

        },

        // Eventos
        events: eventosFiltradosPermisos,

        eventClick: function (event) {
          // opens events in a popup window
          if (event.url) {
            window.open(event.url, 'gcalevent', 'width=700,height=600');
            return false
          }
          // Modal deshabilitado temporalmente por error de Bootstrap
          // Funcionalidad disponible al hacer clic en una fecha
        }

      })

      // Guardar referencia al calendario para uso en filtros
      loc.calendario = $calendar;

      // Configurar eventos de filtros
      loc.configurarEventosFiltros();
      
      // Establecer filtro por defecto como "Tareas Propias" para todos los usuarios
      setTimeout(() => {
        $('#filtroMisTareas').addClass('btn-primary active').removeClass('btn-info');
        $('#filtroTareasCreadas').removeClass('btn-primary active').addClass('btn-success');
        $('#filtroVistaGlobal').removeClass('btn-warning active');
        $('#filtroTipoUsuario').val('propias');
        loc.aplicarFiltros();
        loc.mostrarMensajeInicialWidget();
        
        // Forzar verificación de permisos después de que todo esté cargado
        loc.forzarVerificacionPermisos();

        // Cargar y agregar tareas desde la misma fuente que "Mis Tareas"
        loc.cargarTareasDesdeMisTareas();
      }, 100);

      $("#calendar-switcher").find("label").click(function () {
        $calendar.fullCalendar('changeView', $(this).find('input').val())
      });

      var currentDate = $calendar.fullCalendar('getDate');

      $('#calender-current-date').html(
        $.fullCalendar.formatDate(currentDate, "MMM yyyy") +
        " - <span class='fw-semi-bold'>" +
        $.fullCalendar.formatDate(currentDate, "dddd") +
        "</span>"
      );


      $('#calender-prev').click(function () {
        $calendar.fullCalendar('prev');
        currentDate = $calendar.fullCalendar('getDate');
        loc.Fecha = currentDate.toString();
        $('#calender-current-date').html(
          $.fullCalendar.formatDate(currentDate, "MMM yyyy") +
          " - <span class='fw-semi-bold'>" +
          $.fullCalendar.formatDate(currentDate, "dddd") +
          "</span>"
        );
      });
      $('#calender-next').click(function () {
        $calendar.fullCalendar('next');
        currentDate = $calendar.fullCalendar('getDate');
        loc.Fecha = currentDate.toString();
        $('#calender-current-date').html(
          $.fullCalendar.formatDate(currentDate, "MMM yyyy") +
          " - <span class='fw-semi-bold'>" +
          $.fullCalendar.formatDate(currentDate, "dddd") +
          "</span>"
        );
      });
    });

  }

  ViewWidgets() {
    this.widget = true;
  }

  RetFecha(Val): string {
    this.fechaEdit.setMonth(this.fechaEdit.getMonth() + Val);
    return this.fechaEdit.toString();
  }

  private agregarClaseEvento(evento: any, clase: string): void {
    if (!evento) return;
    if (Array.isArray(evento.className)) {
      if (!evento.className.includes(clase)) {
        evento.className.push(clase);
      }
      return;
    }
    if (typeof evento.className === 'string' && evento.className.trim() !== '') {
      const clases = evento.className.split(' ').filter(Boolean);
      if (!clases.includes(clase)) {
        clases.push(clase);
      }
      evento.className = clases;
      return;
    }
    evento.className = [clase];
  }

  private aplicarAvisoSinCompromisoEnTitulo(evento: any): void {
    if (!evento) return;

    const tieneClaseSinCompromiso = Array.isArray(evento.className)
      ? evento.className.includes('tarea-sin-compromiso')
      : (typeof evento.className === 'string'
        ? evento.className.split(' ').filter(Boolean).includes('tarea-sin-compromiso')
        : false);

    if (!tieneClaseSinCompromiso) return;
    if (!evento.title || typeof evento.title !== 'string') return;

    const prefijo = '[Sin Fecha] ';
    if (evento.title.startsWith(prefijo)) return;

    evento.title = prefijo + evento.title;
  }

  private obtenerFechaCompromisoValor(evento: any): any {
    if (!evento) return null;

    const candidatos = [
      evento.fechaCompromiso,
      evento.fecha_compromiso,
      evento.FechaCompromiso,
      evento.fechaCompromisoProgramado,
      evento.fechaCompromisoProgramada,
      evento.fechaCompromisoTarea,
      evento.fechaTerminoProgramado,
      evento.fechaTermino,
      evento.fecha,
      evento.Fecha
    ];

    for (let i = 0; i < candidatos.length; i++) {
      const valor = candidatos[i];
      if (valor === null || valor === undefined) continue;
      if (typeof valor === 'string' && valor.trim() === '') continue;
      return valor;
    }

    // Caso real visto: la fecha de compromiso llega como `start`.
    // Para evitar falsos positivos cuando `start` es solo la fecha de creación,
    // solo aceptamos `start` si es distinto al día de `fechaCreacion`.
    const startDate = this.parseFechaLocal(evento.start);
    if (!startDate) return null;

    const creacionDate = this.parseFechaLocal(evento.fechaCreacion);
    if (!creacionDate) return startDate;

    const mismaFecha =
      startDate.getFullYear() === creacionDate.getFullYear() &&
      startDate.getMonth() === creacionDate.getMonth() &&
      startDate.getDate() === creacionDate.getDate();

    return mismaFecha ? null : startDate;
  }

  private normalizarEventoParaCalendario(evento: any): any {
    if (!evento) return evento;

    const compromisoRaw = this.obtenerFechaCompromisoValor(evento);
    const tieneCompromiso = !(compromisoRaw === null || compromisoRaw === undefined || (typeof compromisoRaw === 'string' && compromisoRaw.trim() === ''));

    // Alinear a campo estándar para el resto del código (paneles, etc.)
    if (!evento.fechaCompromiso && compromisoRaw) {
      evento.fechaCompromiso = compromisoRaw;
    }

    // Clave: FullCalendar necesita `start`. Si hay fechaCompromiso, esa es la fecha que manda.
    const fechaCompromiso = this.parseFechaLocal(compromisoRaw);
    if (fechaCompromiso) {
      evento.start = fechaCompromiso;
      evento.allDay = true;
    } else if (!evento.start) {
      // Fallbacks para que el evento igual se vea (aunque no tenga compromiso)
      const fechaInicio = this.parseFechaLocal(evento.fechaInicioProgramado);
      const fechaCreacion = this.parseFechaLocal(evento.fechaCreacion);
      const fechaFallback = fechaInicio || fechaCreacion;
      if (fechaFallback) {
        evento.start = fechaFallback;
        evento.allDay = true;
      }
    }

    // Requisito: tareas SIN fecha de compromiso se muestran con color de alerta
    if (!tieneCompromiso) {
      this.agregarClaseEvento(evento, 'tarea-sin-compromiso');

      (evento as any)._sinCompromiso = true;

      // Fallback visual por si el CSS no aplica
      if (!evento.backgroundColor) evento.backgroundColor = '#ffa759';
      if (!evento.borderColor) evento.borderColor = '#ffa759';
      if (!evento.textColor) evento.textColor = '#6c757d';
    } else {
      (evento as any)._sinCompromiso = false;
    }

    // Para rutas donde el title no se re-escribe con el map inicial, igual mostrar aviso.
    this.aplicarAvisoSinCompromisoEnTitulo(evento);

    return evento;
  }

  private parseFechaLocal(valor: any): Date | null {
    if (!valor) return null;
    if (valor instanceof Date) {
      return isNaN(valor.getTime()) ? null : valor;
    }

    if (typeof valor === 'string') {
      const s = valor.trim();
      if (!s) return null;

      // dd/MM/yyyy
      const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m1) {
        const dd = parseInt(m1[1], 10);
        const mm = parseInt(m1[2], 10);
        const yyyy = parseInt(m1[3], 10);
        const d = new Date(yyyy, mm - 1, dd);
        return isNaN(d.getTime()) ? null : d;
      }

      // yyyy-MM-dd (sin hora)
      const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m2) {
        const yyyy = parseInt(m2[1], 10);
        const mm = parseInt(m2[2], 10);
        const dd = parseInt(m2[3], 10);
        const d = new Date(yyyy, mm - 1, dd);
        return isNaN(d.getTime()) ? null : d;
      }

      // ISO con hora u otros formatos (mantener comportamiento)
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }

    if (typeof valor === 'number') {
      const d = new Date(valor);
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  }

  // Métodos para el filtrado
  aplicarFiltros(): void {
    const filtroNombre = $('#filtroNombre').val() as string || '';
    const filtroResponsable = $('#filtroResponsable').val() as string || '';
    const filtroTipoUsuario = $('#filtroTipoUsuario').val() as string || 'propias';
    // Usar el estado del botón activo si existe
    const filtroEstado = this.estadoFiltroActivo !== undefined ? this.estadoFiltroActivo : ($('#filtroEstado').val() as string || '');
    
    // Si se selecciona Vista Global y el usuario es gerencia, cargar todas las tareas
    if (filtroTipoUsuario === 'todas' && this.esGerencia) {
      this.cargarVistaGlobalYAplicarFiltros(filtroNombre, filtroResponsable, filtroEstado);
      return;
    }
    
    if (!this.todosLosEventos || this.todosLosEventos.length === 0) {
      return;
    }

    this.eventosFiltrados = this.todosLosEventos.filter(evento => {
      // Filtro por nombre de tarea
      const nombreCoincide = !filtroNombre || 
        (evento.title && evento.title.toLowerCase().includes(filtroNombre.toLowerCase())) ||
        (evento.descripcionTarea && evento.descripcionTarea.toLowerCase().includes(filtroNombre.toLowerCase())) ||
        (evento.nombreTarea && evento.nombreTarea.toLowerCase().includes(filtroNombre.toLowerCase()));
      
      // Filtro por responsable
      const responsableCoincide = !filtroResponsable || 
        (evento.title && evento.title.toLowerCase().includes(filtroResponsable.toLowerCase())) ||
        (evento.responsable && evento.responsable.toLowerCase().includes(filtroResponsable.toLowerCase()));

      // Filtro por estado
      const estadoCoincide = !filtroEstado ||
        (evento.nombreEstadoTarea && evento.nombreEstadoTarea.toLowerCase().includes(filtroEstado.toLowerCase()));

      // Filtro por tipo de usuario
      let tipoUsuarioCoincide = true;
      if (this.usuarioActual && filtroTipoUsuario !== 'todas') {
        switch (filtroTipoUsuario) {
          case 'propias':
            // Tareas Propias: Tareas asignadas a mí O tareas que yo creé para mí mismo
            tipoUsuarioCoincide = evento.idUsuarioResponsable === this.usuarioActual.idUsuario ||
                                 (evento.idUsuarioCreador === this.usuarioActual.idUsuario && 
                                  evento.idUsuarioResponsable === this.usuarioActual.idUsuario);
            break;
          case 'creadas':
            // Tareas Asignadas: Tareas que yo creé para otras personas
            tipoUsuarioCoincide = evento.idUsuarioCreador === this.usuarioActual.idUsuario &&
                                 evento.idUsuarioResponsable !== this.usuarioActual.idUsuario;
            break;
          case 'asignadas':
            // Tareas que me asignaron (responsable pero no creador) - mantenido para compatibilidad
            tipoUsuarioCoincide = evento.idUsuarioResponsable === this.usuarioActual.idUsuario && 
                                 evento.idUsuarioCreador !== this.usuarioActual.idUsuario;
            break;
          case 'mis-tareas':
            // Alias para 'propias' - para compatibilidad con usuarios no gerencia
            tipoUsuarioCoincide = evento.idUsuarioResponsable === this.usuarioActual.idUsuario ||
                                 (evento.idUsuarioCreador === this.usuarioActual.idUsuario && 
                                  evento.idUsuarioResponsable === this.usuarioActual.idUsuario);
            break;
        }
      }

      return nombreCoincide && responsableCoincide && estadoCoincide && tipoUsuarioCoincide;
    });

    // IMPORTANTE: SIEMPRE mostrar TODAS las tareas en el calendario visual
    // Los filtros solo afectan al widget de detalles, NO al calendario.
    // Evitar refrescar fullCalendar en cada tecleo para mejorar rendimiento.
    if (this.calendario && filtroResponsable && filtroResponsable.trim() !== '') {
      if (this.eventosFiltrados && this.eventosFiltrados.length > 0) {
        this.navegarAPrimeraFechaConTareas();
      } else {
        const widget = $("#widget");
        const mensajeSinResultados = $(`
          <div class="alert alert-warning" style="margin-bottom: 15px;">
            <i class="fa fa-search"></i> 
            <strong>Sin resultados:</strong> No se encontraron tareas para el responsable 
            "<strong>${filtroResponsable}</strong>"
          </div>
        `);
        widget.prepend(mensajeSinResultados);
        setTimeout(() => {
          mensajeSinResultados.fadeOut(() => mensajeSinResultados.remove());
        }, 4000);
      }
    }

    // Actualizar contador de resultados
    this.actualizarContador();
    
    // Mostrar detalles de las tareas filtradas automáticamente
    this.mostrarDetallesTareasFiltradas();
  }

  limpiarFiltros(): void {
    // Limpiar todos los campos de filtro de texto
    $('#filtroNombre').val('');
    $('#filtroResponsable').val('');
    $('#filtroEstado').val('');
    
    // Limpiar el dropdown de tipo de vista - volver al valor por defecto
    $('#filtroTipoUsuario').val('propias'); // Establecer filtro por defecto
    
    // Remover estado activo de los botones de filtro rápido
    $('#filtroMisTareas').removeClass('active btn-primary').addClass('btn-info');
    $('#filtroTareasCreadas').removeClass('active btn-primary').addClass('btn-success');
    
    // Aplicar filtros con el filtro por defecto (Tareas Propias)
    this.aplicarFiltros();
    // Volver el calendario y el título a la fecha actual
    if (this.calendario) {
      const hoy = new Date();
      this.calendario.fullCalendar('gotoDate', hoy);
      this.Fecha = hoy.toString();
    }
    // Limpiar panel de detalles y mostrar mensaje inicial
    this.mostrarMensajeInicialWidget();
    console.log('Todos los filtros han sido limpiados');
  }

  actualizarContador(): void {
    const contador = $('#contadorResultados');
    if (this.eventosFiltrados.length !== this.todosLosEventos.length) {
      contador.text(`Mostrando ${this.eventosFiltrados.length} de ${this.todosLosEventos.length} tareas`);
      contador.show();
    } else {
      contador.hide();
    }
  }

  configurarEventosFiltros(): void {
    const loc = this;
    let timeoutId: any;

    // Evitar handlers duplicados cuando esta configuración se ejecuta más de una vez
    $('#filtroNombre, #filtroResponsable').off('input keypress');
    $('#filtroTipoUsuario').off('change');
    $('#filtroVistaGlobal').off('click');
    $('#filtroMisTareas').off('click');
    $('#filtroTareasCreadas').off('click');
    $('#filtroEstadoTodos, #filtroEstadoPendiente, #filtroEstadoEnProceso, #filtroEstadoCancelada, #filtroEstadoTerminada').off('click');
    $('#limpiarFiltros').off('click');
    
    // Configurar eventos de los filtros con debounce optimizado para respuesta rápida
    $('#filtroNombre, #filtroResponsable').on('input', function() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        loc.aplicarFiltros();
      }, 150); // Reducido a 150ms para respuesta más rápida
    });

    // Configurar eventos para los selects (sin debounce, cambio inmediato)
    $('#filtroTipoUsuario').on('change', function() {
      loc.aplicarFiltros();
    });

    // Configurar botón Vista Global
    $('#filtroVistaGlobal').on('click', function() {
      // Remover estado activo de todos los botones
      $('#filtroMisTareas').removeClass('btn-primary active').addClass('btn-info');
      $('#filtroTareasCreadas').removeClass('btn-primary active').addClass('btn-success');
      $('#filtroVistaGlobal').addClass('btn-warning active');
      // Cambiar el filtro a 'todas'
      $('#filtroTipoUsuario').val('todas');
      loc.aplicarFiltros();
    });

    // Configurar botón Tareas Propias
    $('#filtroMisTareas').on('click', function() {
      $('#filtroMisTareas').addClass('btn-primary active').removeClass('btn-info');
      $('#filtroTareasCreadas').removeClass('btn-primary active').addClass('btn-success');
      $('#filtroVistaGlobal').removeClass('btn-warning active');
      $('#filtroTipoUsuario').val('propias');
      loc.aplicarFiltros();
    });

    // Configurar botón Tareas Asignadas
    $('#filtroTareasCreadas').on('click', function() {
      $('#filtroMisTareas').removeClass('btn-primary active').addClass('btn-info');
      $('#filtroTareasCreadas').addClass('btn-primary active').removeClass('btn-success');
      $('#filtroVistaGlobal').removeClass('btn-warning active');
      $('#filtroTipoUsuario').val('creadas');
      loc.aplicarFiltros();
    });

    // Botones de filtro de estado
    $('#filtroEstadoTodos').on('click', function() {
      loc.estadoFiltroActivo = '';
      $('.btn-group[aria-label="Filtro Estado"] button').removeClass('active');
      $(this).addClass('active');
      loc.aplicarFiltros();
    });
    $('#filtroEstadoPendiente').on('click', function() {
      loc.estadoFiltroActivo = 'pendiente';
      $('.btn-group[aria-label="Filtro Estado"] button').removeClass('active');
      $(this).addClass('active');
      loc.aplicarFiltros();
    });
    $('#filtroEstadoEnProceso').on('click', function() {
      loc.estadoFiltroActivo = 'en proceso';
      $('.btn-group[aria-label="Filtro Estado"] button').removeClass('active');
      $(this).addClass('active');
      loc.aplicarFiltros();
    });
    $('#filtroEstadoCancelada').on('click', function() {
      loc.estadoFiltroActivo = 'cancelada';
      $('.btn-group[aria-label="Filtro Estado"] button').removeClass('active');
      $(this).addClass('active');
      loc.aplicarFiltros();
    });
    $('#filtroEstadoTerminada').on('click', function() {
      loc.estadoFiltroActivo = 'terminada';
      $('.btn-group[aria-label="Filtro Estado"] button').removeClass('active');
      $(this).addClass('active');
      loc.aplicarFiltros();
    });

    // También aplicar filtros al presionar Enter (solo para inputs de texto)
    $('#filtroNombre, #filtroResponsable').on('keypress', function(e) {
      if (e.which === 13) { // Enter key
        clearTimeout(timeoutId);
        loc.aplicarFiltros();
      }
    });

    // Configurar botón limpiar filtros
    $('#limpiarFiltros').on('click', function() {
      loc.limpiarFiltros();
    });

  }

  mostrarDetallesTareasFiltradas(): void {
    const widget = $("#widget");
    widget.empty();

    if (!this.eventosFiltrados || this.eventosFiltrados.length === 0) {
      const mensajeDiv = document.createElement("div");
      mensajeDiv.setAttribute("class", "alert alert-info");
      mensajeDiv.setAttribute("style", "margin: 1rem; text-align: center;");
      mensajeDiv.innerHTML = `
        <i class="fa fa-info-circle"></i> 
        <strong>No hay tareas que coincidan con los filtros aplicados</strong>
      `;
      widget.append(mensajeDiv);
      return;
    }

    // Agregar encabezado
    const encabezadoDiv = document.createElement("div");
    encabezadoDiv.setAttribute("class", "widget-header");
    encabezadoDiv.setAttribute("style", "padding: 1rem; background-color: #f8f9fa; border-radius: 8px 8px 0 0; margin-bottom: 10px;");
    encabezadoDiv.innerHTML = `
      <h5 style="margin: 0; color: #495057;">
        <i class="fa fa-filter"></i> Tareas Filtradas (${this.eventosFiltrados.length})
      </h5>
    `;
    widget.append(encabezadoDiv);

    // Mostrar cada tarea filtrada
    const self = this;
    this.eventosFiltrados.forEach(function(tarea, index) {
      const widgetbody = document.createElement("div");
      widgetbody.setAttribute("class", "widget-body tarea-filtrada");
      widgetbody.setAttribute("style", 
        "padding: 1rem; border-radius: 8px; background-color: white; " +
        "border: solid 1px #dee2e6; margin-bottom: 10px; " +
        "transition: all 0.3s ease; cursor: pointer;"
      );

      // Agregar evento hover
      widgetbody.addEventListener('mouseenter', function() {
        this.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
        this.style.transform = "translateY(-2px)";
      });
      widgetbody.addEventListener('mouseleave', function() {
        this.style.boxShadow = "none";
        this.style.transform = "translateY(0)";
      });

      // Evento click para navegar el calendario a la fecha de la tarea
      widgetbody.addEventListener('click', function() {
        var fechaCompromiso = tarea.fechaCompromiso || tarea.fechaInicioProgramado || tarea.start;
        if (fechaCompromiso) {
          const fecha = (typeof fechaCompromiso === 'string')
            ? self.parseFechaLocal(fechaCompromiso)
            : fechaCompromiso;

          if (!fecha) {
            return;
          }
          if (self.calendario) {
            self.calendario.fullCalendar('changeView', 'month');
            self.calendario.fullCalendar('gotoDate', fecha);
            // Actualizar el encabezado del mes y día
            setTimeout(() => {
              self.Fecha = fecha;
              // Resaltar el día en el calendario con el color de la prioridad
              if (tarea.prioridad) {
                const colorPrioridad = self.obtenerColorPrioridad(tarea.prioridad);
                // Buscar el día en el calendario y cambiar el fondo
                const dayCell = document.querySelector(`td[data-date='${fecha.getFullYear()}-${(fecha.getMonth()+1).toString().padStart(2,'0')}-${fecha.getDate().toString().padStart(2,'0')}'`);
                if (dayCell) {
                  (dayCell as HTMLElement).style.transition = 'background 0.3s';
                  (dayCell as HTMLElement).style.background = colorPrioridad;
                }
              }
            }, 200);
          }
        }
      });

      // Obtener fecha relevante para mostrar
      const compromisoValor = self.obtenerFechaCompromisoValor(tarea);
      const tieneCompromiso = !(compromisoValor === null || compromisoValor === undefined || (typeof compromisoValor === 'string' && compromisoValor.trim() === ''));

      let fechaObj = compromisoValor ? (typeof compromisoValor === 'string' ? self.parseFechaLocal(compromisoValor) : compromisoValor) : null;
      let fechaTexto = fechaObj ? `${fechaObj.getDate().toString().padStart(2, '0')}/${(fechaObj.getMonth()+1).toString().padStart(2, '0')}/${fechaObj.getFullYear()}` : '';
      let mesTexto = fechaObj ? fechaObj.toLocaleString('es-ES', { month: 'long' }) : '';
      let diaTexto = fechaObj ? fechaObj.toLocaleString('es-ES', { weekday: 'long' }) : '';

      let tareaHtml = `
        <div style="border-left: 4px solid #007bff; padding-left: 15px;">
          <h6 style="margin: 0 0 10px 0; color: #007bff; font-weight: bold;">
            <i class="fa fa-tasks"></i> Tarea #${index + 1}
          </h6>
          <div class="row" style="margin-bottom: 8px;">
            <div class="col-md-3"><strong>Fecha Termino:</strong></div>
            <div class="col-md-9">
              ${tieneCompromiso
                ? `<span style="font-weight:bold; color:#89658f;">${fechaTexto}</span>
                   <span style="margin-left:10px; color:#495057;">${diaTexto}, ${mesTexto}</span>`
                : `<span style="color:#6c757d; font-style:italic;">
                     <i class="fa fa-exclamation-triangle" style="color:#ffa759;"></i> (colocar fecha termino)
                   </span>`
              }
            </div>
          </div>
          <div class="row" style="margin-bottom: 8px;">
            <div class="col-md-3"><strong>Tarea:</strong></div>
            <div class="col-md-9">${tarea.descripcionTarea || tarea.title || 'Sin descripción'}</div>
          </div>
      `;

      if (tarea.fechaCreacion) {
        tareaHtml += `
          <div class="row" style="margin-bottom: 8px;">
            <div class="col-md-3"><strong>Fecha Creación:</strong></div>
            <div class="col-md-9">${tarea.fechaCreacion}</div>
          </div>
        `;
      }

      if (tarea.nombreEstadoTarea) {
        const colorEstado = self.obtenerColorEstado(tarea.nombreEstadoTarea);
        tareaHtml += `
          <div class="row" style="margin-bottom: 8px;">
            <div class="col-md-3"><strong>Estado:</strong></div>
            <div class="col-md-9">
              <span class="badge" style="background-color: ${colorEstado}; display: inline-block; min-width: 100px; text-align: center; color: white;">
                ${tarea.nombreEstadoTarea}
              </span>
            </div>
          </div>
        `;
      }

      if (tarea.title) {
        tareaHtml += `
          <div class="row" style="margin-bottom: 8px;">
            <div class="col-md-3"><strong>Responsable:</strong></div>
            <div class="col-md-9">
              <i class="fa fa-user"></i> ${tarea.title}
            </div>
          </div>
        `;
      }

      if (tarea.fechaInicioProgramado) {
        tareaHtml += `
          <div class="row" style="margin-bottom: 8px;">
            <div class="col-md-3"><strong>Fecha Inicio:</strong></div>
            <div class="col-md-9">
              <i class="fa fa-calendar"></i> ${tarea.fechaInicioProgramado}
            </div>
          </div>
        `;
      }

      if (tarea.fechaTerminoProgramado) {
        tareaHtml += `
          <div class="row" style="margin-bottom: 8px;">
            <div class="col-md-3"><strong>Fecha Término:</strong></div>
            <div class="col-md-9">
              <i class="fa fa-calendar-check-o"></i> ${tarea.fechaTerminoProgramado}
            </div>
          </div>
        `;
      }

      if (tarea.prioridad) {
        const colorPrioridad = self.obtenerColorPrioridad(tarea.prioridad);
        tareaHtml += `
          <div class="row" style="margin-bottom: 8px;">
            <div class="col-md-3"><strong>Prioridad:</strong></div>
            <div class="col-md-9">
              <span class="badge" style="background-color: ${colorPrioridad}; display: inline-block; min-width: 100px; text-align: center; color: white;">
                <i class="fa fa-exclamation-triangle"></i> ${tarea.prioridad}
              </span>
            </div>
          </div>
        `;
      }

      tareaHtml += `</div>`;
      widgetbody.innerHTML = tareaHtml;
      widget.append(widgetbody);
    });
  }

  obtenerColorEstado(estado: string): string {
    switch (estado.toLowerCase()) {
      case 'pendiente':
      case 'nuevo':
        return '#ffc107'; // Amarillo
      case 'en progreso':
      case 'en proceso':
        return '#17a2b8'; // Azul
      case 'completado':
      case 'terminado':
      case 'finalizado':
        return '#28a745'; // Verde
      case 'cancelado':
      case 'rechazado':
        return '#dc3545'; // Rojo
      case 'pausado':
        return '#6c757d'; // Gris
      default:
        return '#007bff'; // Azul por defecto
    }
  }

  obtenerColorPrioridad(prioridad: string): string {
    switch (prioridad.toLowerCase()) {
      case 'alta':
      case 'high':
        return '#dc3545'; // Rojo
      case 'media':
      case 'medium':
        return '#ffc107'; // Amarillo
      case 'baja':
      case 'low':
        return '#28a745'; // Verde
      default:
        return '#6c757d'; // Gris por defecto
    }
  }

  // Función para navegar a la primera fecha con tareas filtradas
  navegarAPrimeraFechaConTareas(): void {
    if (!this.eventosFiltrados || this.eventosFiltrados.length === 0) {
      console.log('No hay eventos filtrados para navegar');
      return;
    }

    // Obtener las fechas de los eventos filtrados y ordenarlas
    const fechasConEventos = this.eventosFiltrados
      .map(evento => {
        if (evento.start) {
          // Si el evento tiene fecha de inicio, usarla
          if (typeof evento.start === 'string') {
            return this.parseFechaLocal(evento.start);
          } else if (evento.start instanceof Date) {
            return evento.start;
          }
        }
        return null;
      })
      .filter(fecha => fecha !== null) // Filtrar fechas válidas
      .sort((a, b) => a.getTime() - b.getTime()); // Ordenar cronológicamente

    if (fechasConEventos.length === 0) {
      console.log('No se encontraron fechas válidas en los eventos filtrados');
      return;
    }

    // Obtener la primera fecha (más próxima)
    const primeraFecha = fechasConEventos[0];
    
    console.log('Navegando a la primera fecha con tareas:', primeraFecha);
    
    // Navegar el calendario a esa fecha
    if (this.calendario) {
      this.calendario.fullCalendar('gotoDate', primeraFecha);
      
      // Opcional: Mostrar un mensaje indicando la navegación
      const widget = $("#widget");
      const mensajeNavegacion = $(`
        <div class="alert alert-success" style="margin-bottom: 15px;">
          <i class="fa fa-navigation"></i> 
          <strong>Navegado automáticamente</strong> a la primera fecha con tareas del responsable: 
          <strong>${primeraFecha.toLocaleDateString()}</strong>
        </div>
      `);
      
      // Agregar el mensaje al inicio del widget y removerlo después de 3 segundos
      widget.prepend(mensajeNavegacion);
      setTimeout(() => {
        mensajeNavegacion.fadeOut(() => mensajeNavegacion.remove());
      }, 3000);
    }
  }

  // Función para mostrar tareas de un día específico con formato moderno
  mostrarTareasDelDia(fechaSeleccionada: string): void {
    const url = "http://trazas-nbi.com:1234/api/Vis_Calendario?start=" + fechaSeleccionada;
    
    console.log('Cargando tareas del día:', fechaSeleccionada);
    console.log('URL de petición:', url);

    const fechaLocal = this.parseFechaLocal(fechaSeleccionada) || new Date(fechaSeleccionada);
    const fechaLocalTexto = isNaN(fechaLocal.getTime()) ? fechaSeleccionada : fechaLocal.toLocaleDateString();
    
    $.get(url, (dataDia) => {
      const widget = $("#widget");
      widget.empty();

      // Normalizar para que siempre se muestre la fecha de compromiso aunque venga con otro nombre de campo
      if (!Array.isArray(dataDia)) {
        dataDia = [];
      }
      dataDia = dataDia.map(t => this.normalizarEventoParaCalendario(t));

      // Regla: no mostrar tareas canceladas
      dataDia = dataDia.filter(t => !this.esCancelada(t));

      // Mezclar también las tareas cargadas desde "Mis Tareas" que caen en este día
      const localesDelDia = (this.eventosMisTareas || []).filter(ev => this.esMismoDia(ev.start, fechaLocal));
      if (localesDelDia.length > 0) {
        const idsApi = new Set((dataDia || []).map(x => x && (x.idTarea || x.IdTarea || x.id)).filter(v => v !== null && v !== undefined));
        const localesNoDuplicados = localesDelDia.filter(x => {
          const id = x && (x.idTarea || x.IdTarea || x.id);
          return id !== null && id !== undefined && !idsApi.has(id);
        });
        dataDia = [...dataDia, ...localesNoDuplicados];
      }

      console.log('Tareas del día recibidas:', dataDia);

      if (!dataDia || !Array.isArray(dataDia) || dataDia.length === 0) {
        const mensajeDiv = document.createElement("div");
        mensajeDiv.setAttribute("class", "alert alert-info");
        mensajeDiv.setAttribute("style", "margin: 1rem; text-align: center;");
        mensajeDiv.innerHTML = `
          <i class="fa fa-calendar"></i> 
          <strong>No hay tareas programadas para el ${fechaLocalTexto}</strong>
        `;
        widget.append(mensajeDiv);
        return;
      }

      // Agregar encabezado con la fecha
      const encabezadoDiv = document.createElement("div");
      encabezadoDiv.setAttribute("class", "widget-header");
      encabezadoDiv.setAttribute("style", "padding: 1rem; background-color: #007bff; color: white; border-radius: 8px 8px 0 0; margin-bottom: 10px;");
      encabezadoDiv.innerHTML = `
        <h5 style="margin: 0; color: white;">
          <i class="fa fa-calendar"></i> Tareas del ${fechaLocalTexto}
          <span class="badge badge-light" style="background-color: white; color: #007bff; margin-left: 10px;">${dataDia.length}</span>
        </h5>
      `;
      widget.append(encabezadoDiv);

      // Mostrar cada tarea con formato moderno
      dataDia.forEach((tarea, index) => {
        const widgetbody = document.createElement("div");
        widgetbody.setAttribute("class", "widget-body tarea-dia");
        widgetbody.setAttribute("style", 
          "padding: 1rem; border-radius: 8px; background-color: white; " +
          "border: solid 1px #dee2e6; margin-bottom: 10px; " +
          "transition: all 0.3s ease; cursor: pointer; " +
          "box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
        );

        // Agregar eventos hover
        widgetbody.addEventListener('mouseenter', function() {
          (this as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,123,255,0.15)";
          (this as HTMLElement).style.transform = "translateY(-2px)";
        });
        widgetbody.addEventListener('mouseleave', function() {
          (this as HTMLElement).style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
          (this as HTMLElement).style.transform = "translateY(0)";
        });

        let tareaHtml = `
          <div style="border-left: 4px solid #007bff; padding-left: 15px;">
            <h6 style="margin: 0 0 10px 0; color: #007bff; font-weight: bold;">
              <i class="fa fa-tasks"></i> Tarea #${index + 1}
            </h6>

            <div class="row" style="margin-bottom: 8px;">
              <div class="col-md-3"><strong>Fecha Termino:</strong></div>
              <div class="col-md-9">
                ${(() => {
                  const compromisoValor = this.obtenerFechaCompromisoValor(tarea);
                  const tieneCompromiso = !(compromisoValor === null || compromisoValor === undefined || (typeof compromisoValor === 'string' && compromisoValor.trim() === ''));
                  if (!tieneCompromiso) {
                    return `<span style="color:#6c757d; font-style:italic;">
                              <i class="fa fa-exclamation-triangle" style="color:#ffa759;"></i> (colocar fecha termino)
                            </span>`;
                  }
                  const fechaObj = (typeof compromisoValor === 'string') ? this.parseFechaLocal(compromisoValor) : compromisoValor;
                  if (!fechaObj) return `<span style="color:#6c757d; font-style:italic;">
                                           <i class="fa fa-exclamation-triangle" style="color:#ffa759;"></i> (colocar fecha termino)
                                         </span>`;
                  const fechaTexto = `${fechaObj.getDate().toString().padStart(2, '0')}/${(fechaObj.getMonth()+1).toString().padStart(2, '0')}/${fechaObj.getFullYear()}`;
                  const diaTexto = fechaObj.toLocaleString('es-ES', { weekday: 'long' });
                  const mesTexto = fechaObj.toLocaleString('es-ES', { month: 'long' });
                  return `<span style="font-weight:bold; color:#89658f;">${fechaTexto}</span>
                          <span style="margin-left:10px; color:#495057;">${diaTexto}, ${mesTexto}</span>`;
                })()}
              </div>
            </div>
            
            <div class="row" style="margin-bottom: 8px;">
              <div class="col-md-3"><strong>Tarea:</strong></div>
              <div class="col-md-9">${tarea.descripcionTarea || 'Sin descripción'}</div>
            </div>
        `;

        if (tarea.fechaCreacion) {
          tareaHtml += `
            <div class="row" style="margin-bottom: 8px;">
              <div class="col-md-3"><strong>Fecha Creación:</strong></div>
              <div class="col-md-9">
                <i class="fa fa-calendar-plus-o"></i> ${tarea.fechaCreacion}
              </div>
            </div>
          `;
        }

        if (tarea.nombreEstadoTarea) {
          const colorEstado = this.obtenerColorEstado(tarea.nombreEstadoTarea);
          tareaHtml += `
            <div class="row" style="margin-bottom: 8px;">
              <div class="col-md-3"><strong>Estado:</strong></div>
              <div class="col-md-9">
                <span class="badge" style="background-color: ${colorEstado}; display: inline-block; min-width: 100px; text-align: center; color: white;">
                  ${tarea.nombreEstadoTarea}
                </span>
              </div>
            </div>
          `;
        }

        if (tarea.title) {
          tareaHtml += `
            <div class="row" style="margin-bottom: 8px;">
              <div class="col-md-3"><strong>Responsable:</strong></div>
              <div class="col-md-9">
                <i class="fa fa-user"></i> ${tarea.title}
              </div>
            </div>
          `;
        }

        if (tarea.fechaInicioProgramado) {
          tareaHtml += `
            <div class="row" style="margin-bottom: 8px;">
              <div class="col-md-3"><strong>Fecha Inicio:</strong></div>
              <div class="col-md-9">
                <i class="fa fa-play-circle"></i> ${tarea.fechaInicioProgramado}
              </div>
            </div>
          `;
        }

        if (tarea.fechaTerminoProgramado) {
          tareaHtml += `
            <div class="row" style="margin-bottom: 8px;">
              <div class="col-md-3"><strong>Fecha Término:</strong></div>
              <div class="col-md-9">
                <i class="fa fa-flag-checkered"></i> ${tarea.fechaTerminoProgramado}
              </div>
            </div>
          `;
        }

        if (tarea.prioridad) {
          const colorPrioridad = this.obtenerColorPrioridad(tarea.prioridad);
          tareaHtml += `
            <div class="row" style="margin-bottom: 8px;">
              <div class="col-md-3"><strong>Prioridad:</strong></div>
              <div class="col-md-9">
                <span class="badge" style="background-color: ${colorPrioridad}; display: inline-block; min-width: 100px; text-align: center; color: white;">
                  <i class="fa fa-exclamation-triangle"></i> ${tarea.prioridad}
                </span>
              </div>
            </div>
          `;
        }

        tareaHtml += `</div>`;
        widgetbody.innerHTML = tareaHtml;
        widget.append(widgetbody);
      });

    }).fail((error) => {
      console.error('Error al cargar tareas del día:', error);
      const widget = $("#widget");
      widget.empty();
      const errorDiv = document.createElement("div");
      errorDiv.setAttribute("class", "alert alert-danger");
      errorDiv.setAttribute("style", "margin: 1rem; text-align: center;");
      errorDiv.innerHTML = `
        <i class="fa fa-exclamation-triangle"></i> 
        <strong>Error al cargar las tareas del día</strong><br>
        <small>Por favor, intente nuevamente</small>
      `;
      widget.append(errorDiv);
    });
  }

  // Funciones para manejo de permisos
  verificarPermisos(): void {
    if (this.usuarioActual && this.usuarioActual.idUsuario) {
      this.cargaPerfiles().subscribe(
        perfiles => {
          this.perfilesUsuario = perfiles;
          // Verificar si el usuario tiene perfil de gerencia (perfil 1: Sub Gerente, perfil 2: Director, perfil 11: Gerente-Admin)
          this.esGerencia = perfiles.some(perfil => 
            perfil.idPerfil == 1 || perfil.idPerfil == 2 || perfil.idPerfil == 11
          );
          console.log('Perfiles cargados:', perfiles);
          console.log('Es gerencia:', this.esGerencia);
          
          // Mostrar indicador visual si es gerencia
          setTimeout(() => {
            if (this.esGerencia) {
              console.log('Usuario es gerencia, mostrando indicador...');
              $('#indicadorPermisos').show();
            } else {
              console.log('Usuario no es gerencia, ocultando indicador...');
              $('#indicadorPermisos').hide();
            }
          }, 500);
          
          // Configurar opciones del dropdown según tipo de usuario
          this.configurarOpcionesDropdown();
        },
        error => {
          console.warn('Error al cargar perfiles, usando configuración por defecto:', error);
          // En caso de error, intentar determinar permisos de forma alternativa
          this.esGerencia = this.determinarGerenciaAlternativa();
          this.perfilesUsuario = [];
          
          console.log('Gerencia determinada alternativamente:', this.esGerencia);
          
          // Mostrar indicador visual si es gerencia
          setTimeout(() => {
            if (this.esGerencia) {
              console.log('Usuario es gerencia (método alternativo), mostrando indicador...');
              $('#indicadorPermisos').show();
            } else {
              console.log('Usuario no es gerencia (método alternativo), ocultando indicador...');
              $('#indicadorPermisos').hide();
            }
          }, 500);
          
          // Configurar opciones del dropdown
          this.configurarOpcionesDropdown();
        }
      );
    } else {
      // Si no hay usuario actual, configurar como usuario normal
      this.esGerencia = false;
      this.configurarOpcionesDropdown();
    }
  }

  cargaPerfiles(): Observable<any> {
    const urlFull = configuracion.url;
    console.log('Intentando cargar perfiles desde:', urlFull + 'GetUsuariosPerfilesByIdUsuario/IdUsuario=' + this.usuarioActual.idUsuario);
    
    return this._http.get(urlFull + 'GetUsuariosPerfilesByIdUsuario/IdUsuario=' + this.usuarioActual.idUsuario)
      .map((res: Response) => res.json())
      .catch((error: any) => {
        console.error('Error en la API de perfiles:', error);
        return Observable.throw(error);
      });
  }

  configurarOpcionesDropdown(): void {
    const dropdown = $('#filtroTipoUsuario');
    dropdown.empty();

    if (this.esGerencia) {
      // Opciones para Gerencia - incluye Vista Global
      dropdown.append('<option value="todas">🌍 Vista Global (Todas las tareas)</option>');
      dropdown.append('<option value="propias">👤 Tareas Propias</option>');
      dropdown.append('<option value="creadas">📤 Tareas Asignadas</option>');
    } else {
      // Opciones para usuarios normales
      dropdown.append('<option value="propias">👤 Tareas Propias</option>');
      dropdown.append('<option value="creadas">📤 Tareas Asignadas</option>');
    }
  }

  determinarGerenciaAlternativa(): boolean {
    if (!this.usuarioActual) {
      console.log('No hay usuario actual');
      return false;
    }
    
    console.log('Determinando gerencia alternativamente para usuario:', this.usuarioActual);
    console.log('Propiedades disponibles:', Object.keys(this.usuarioActual));
    
    const usuario = this.usuarioActual;
    
    // Verificar si hay alguna propiedad que indique el perfil o rol
    if (usuario.idPerfil) {
      console.log('idPerfil encontrado:', usuario.idPerfil);
      if (usuario.idPerfil == 1 || usuario.idPerfil == 2 || usuario.idPerfil == 11) {
        console.log('Usuario es gerencia por idPerfil:', usuario.idPerfil);
        return true;
      }
    }
    
    // Verificar por nombre del perfil si existe
    if (usuario.nombrePerfil) {
      console.log('nombrePerfil encontrado:', usuario.nombrePerfil);
      const nombrePerfil = usuario.nombrePerfil.toLowerCase();
      if (nombrePerfil.includes('gerente') || nombrePerfil.includes('director') || 
          nombrePerfil.includes('admin') || nombrePerfil.includes('sub gerente')) {
        console.log('Usuario es gerencia por nombrePerfil:', usuario.nombrePerfil);
        return true;
      }
    }
    
    // Verificar por otras propiedades que podrían indicar rol
    if (usuario.perfil) {
      console.log('perfil encontrado:', usuario.perfil);
      const perfil = usuario.perfil.toLowerCase ? usuario.perfil.toLowerCase() : String(usuario.perfil).toLowerCase();
      if (perfil.includes('gerente') || perfil.includes('director') || 
          perfil.includes('admin') || perfil.includes('sub gerente')) {
        console.log('Usuario es gerencia por perfil:', usuario.perfil);
        return true;
      }
    }
    
    // Verificar por rol específico
    if (usuario.rol) {
      console.log('rol encontrado:', usuario.rol);
      const rol = usuario.rol.toLowerCase ? usuario.rol.toLowerCase() : String(usuario.rol).toLowerCase();
      if (rol.includes('gerente') || rol.includes('director') || 
          rol.includes('admin') || rol.includes('sub gerente')) {
        console.log('Usuario es gerencia por rol:', usuario.rol);
        return true;
      }
    }
    
    // Verificar por nombre completo o usuario
    if (usuario.nombreCompleto) {
      console.log('nombreCompleto encontrado:', usuario.nombreCompleto);
      const nombreCompleto = usuario.nombreCompleto.toLowerCase();
      if (nombreCompleto.includes('gerente') || nombreCompleto.includes('director') || 
          nombreCompleto.includes('admin')) {
        console.log('Usuario es gerencia por nombreCompleto:', usuario.nombreCompleto);
        return true;
      }
    }
    
    // Verificar por nombre de usuario específicos
    if (usuario.nombreUsuario) {
      console.log('nombreUsuario encontrado:', usuario.nombreUsuario);
      const nombreUsuario = usuario.nombreUsuario.toLowerCase();
      if (nombreUsuario.includes('gerente') || nombreUsuario.includes('admin') || 
          nombreUsuario.includes('director')) {
        console.log('Usuario es gerencia por nombreUsuario:', usuario.nombreUsuario);
        return true;
      }
    }
    
    // Verificar por ID de usuario específicos conocidos (puedes personalizar estos IDs)
    if (usuario.idUsuario) {
      console.log('idUsuario encontrado:', usuario.idUsuario);
      // Aquí puedes agregar IDs específicos de usuarios gerencia si los conoces
      if (usuario.idUsuario == 1 || usuario.idUsuario == 2) {
        console.log('Usuario es gerencia por idUsuario específico:', usuario.idUsuario);
        return true;
      }
    }
    
    console.log('No se pudo determinar gerencia con información disponible');
    console.log('Para debug - todas las propiedades:', usuario);
    return false; // Por defecto, no es gerencia
  }

  // Función para filtrar eventos según permisos del usuario (carga inicial)
  filtrarEventosSegunPermisos(eventos: any[]): any[] {
    if (!this.usuarioActual) return eventos;
    // Si el usuario es gerencia y el filtro está en 'todas', mostrar todas las tareas
    const filtroTipoUsuario = $('#filtroTipoUsuario').val() as string || 'propias';
    if (this.esGerencia && filtroTipoUsuario === 'todas') {
      return eventos; // Todas las tareas para gerencia
    }
    // Usuarios normales ven solo sus tareas propias
    return eventos.filter(evento => 
      evento.idUsuarioResponsable === this.usuarioActual.idUsuario ||
      evento.idUsuarioCreador === this.usuarioActual.idUsuario
    );
  }

  // Método auxiliar para mostrar mensaje cuando no hay filtros activos
  mostrarMensajeInicialWidget(): void {
    const widget = $("#widget");
    widget.empty();
    
    const mensajeDiv = document.createElement("div");
    mensajeDiv.setAttribute("class", "alert alert-light");
    mensajeDiv.setAttribute("style", 
      "margin: 1rem; text-align: center; border: 2px dashed #dee2e6; " +
      "background-color: #f8f9fa; color: #6c757d;"
    );
    mensajeDiv.innerHTML = `
      <div style="padding: 2rem;">
        <i class="fa fa-search fa-3x" style="color: #dee2e6; margin-bottom: 1rem;"></i>
        <h5>Aplicar Filtros para Ver Detalles</h5>
        <p>Use los filtros de arriba para ver los detalles de las tareas que coincidan con sus criterios.</p>
        <small>O haga clic en una fecha del calendario para ver las tareas de ese día.</small>
      </div>
    `;
    widget.append(mensajeDiv);
  }

  // Método para cargar vista global (solo para gerencia)
  cargarVistaGlobal(): void {
    if (!this.esGerencia) {
      console.warn('Vista Global solo disponible para usuarios con permisos de gerencia');
      return;
    }

    const loc = this;
    
    // Cargar todos los eventos sin filtro de permisos
    $.get("http://trazas-nbi.com:1234/api/Vis_Calendario", function (data) {
      console.log('Vista Global: Cargando todas las tareas del sistema');

      const dataNormalizada = (Array.isArray(data) ? data : []).map(ev => loc.normalizarEventoParaCalendario(ev));
      
      // Guardar TODOS los eventos sin filtrar por permisos
      loc.todosLosEventos = dataNormalizada;
      loc.eventosFiltrados = [...dataNormalizada];
      
      // Actualizar el filtro dropdown
      $('#filtroTipoUsuario').val('todas');
      
      // Actualizar el calendario con todas las tareas
      if (loc.calendario) {
        loc.calendario.fullCalendar('removeEvents');
        loc.calendario.fullCalendar('addEventSource', dataNormalizada);
      }
      
      // Actualizar contador
      loc.actualizarContador();
      
      // Mostrar mensaje en el widget
      loc.mostrarMensajeInicialWidget();
      
      console.log(`Vista Global activada: ${dataNormalizada.length} tareas cargadas`);
    }).fail(function(error) {
      console.error('Error al cargar vista global:', error);
    });
  }

  // Función optimizada para cargar vista global y aplicar filtros en una sola operación
  cargarVistaGlobalYAplicarFiltros(filtroNombre: string, filtroResponsable: string, filtroEstado: string): void {
    if (!this.esGerencia) {
      console.warn('Vista Global solo disponible para usuarios con permisos de gerencia');
      return;
    }

    const loc = this;
    console.log('Cargando Vista Global con filtros aplicados...');
    
    // Cargar todos los eventos sin filtro de permisos
    $.get("http://trazas-nbi.com:1234/api/Vis_Calendario", function (data) {
      // Guardar TODOS los eventos sin filtrar por permisos
      const dataNormalizada = (Array.isArray(data) ? data : []).map(ev => loc.normalizarEventoParaCalendario(ev));
      loc.todosLosEventos = dataNormalizada;
      
      // Aplicar filtros de texto y estado directamente sobre todos los datos
      loc.eventosFiltrados = dataNormalizada.filter(evento => {
        // Filtro por nombre de tarea
        const nombreCoincide = !filtroNombre || 
          (evento.title && evento.title.toLowerCase().includes(filtroNombre.toLowerCase())) ||
          (evento.descripcionTarea && evento.descripcionTarea.toLowerCase().includes(filtroNombre.toLowerCase())) ||
          (evento.nombreTarea && evento.nombreTarea.toLowerCase().includes(filtroNombre.toLowerCase()));
        
        // Filtro por responsable
        const responsableCoincide = !filtroResponsable || 
          (evento.title && evento.title.toLowerCase().includes(filtroResponsable.toLowerCase())) ||
          (evento.responsable && evento.responsable.toLowerCase().includes(filtroResponsable.toLowerCase()));

        // Filtro por estado
        const estadoCoincide = !filtroEstado ||
          (evento.nombreEstadoTarea && evento.nombreEstadoTarea.toLowerCase().includes(filtroEstado.toLowerCase()));

        return nombreCoincide && responsableCoincide && estadoCoincide;
      });
      
      // IMPORTANTE: Mostrar TODAS las tareas en el calendario visual
      // Los filtros solo afectan al widget de detalles, NO al calendario
      if (loc.calendario) {
        loc.calendario.fullCalendar('removeEvents');
        loc.calendario.fullCalendar('addEventSource', dataNormalizada); // Mostrar TODOS los datos normalizados
        console.log('Vista Global - Calendario actualizado con todas las tareas:', dataNormalizada.length);
      }
      
      // Actualizar contador y mostrar detalles
      loc.actualizarContador();
      loc.mostrarDetallesTareasFiltradas();
      
      console.log(`Vista Global con filtros: ${loc.eventosFiltrados.length} de ${dataNormalizada.length} tareas mostradas`);
    }).fail(function(error) {
      console.error('Error al cargar vista global con filtros:', error);
    });
  }

  // Función para forzar la verificación de permisos cuando el DOM esté completamente listo
  forzarVerificacionPermisos(): void {
    console.log('Forzando verificación de permisos...');
    
    if (!this.usuarioActual) {
      console.log('No hay usuario actual, estableciendo permisos por defecto');
      this.esGerencia = false;
      $('#indicadorPermisos').hide();
      $('#filtroVistaGlobal').hide();
      return;
    }

    // Intentar determinar permisos usando método alternativo primero
    this.esGerencia = this.determinarGerenciaAlternativa();
    
    console.log('Permisos forzados - Es gerencia:', this.esGerencia);
    
    // Aplicar cambios visuales inmediatamente
    if (this.esGerencia) {
      console.log('Aplicando permisos de gerencia...');
      $('#indicadorPermisos').show();
    } else {
      console.log('Aplicando permisos de usuario normal...');
      $('#indicadorPermisos').hide();
    }
    
    // También configurar opciones del dropdown
    this.configurarOpcionesDropdown();
    
    // Si hay usuario, intentar cargar perfiles para confirmar
    if (this.usuarioActual.idUsuario) {
      this.cargaPerfiles().subscribe(
        perfiles => {
          console.log('Confirmación de perfiles:', perfiles);
          const esGerenciaConfirmado = perfiles.some(perfil => 
            perfil.idPerfil == 1 || perfil.idPerfil == 2 || perfil.idPerfil == 11
          );
          
          if (esGerenciaConfirmado !== this.esGerencia) {
            console.log('Actualizando permisos basado en API:', esGerenciaConfirmado);
            this.esGerencia = esGerenciaConfirmado;
            
            if (this.esGerencia) {
              $('#indicadorPermisos').show();
            } else {
              $('#indicadorPermisos').hide();
            }
            
            this.configurarOpcionesDropdown();
          }
        },
        error => {
          console.log('Error confirmando perfiles, manteniendo configuración alternativa:', error);
        }
      );
    }
  }

}
