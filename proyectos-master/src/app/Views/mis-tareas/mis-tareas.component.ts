import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

//Share
import { PopUps } from '../../Share/PopUps';
import { Comunes } from '../../Share/Comunes';

//Model
import { mMis_Tareas } from '../../models/mMis_Tareas';
import { mTarea } from '../../models/mTarea';
import { mEstadoTarea } from '../../models/mEstadoTarea';
import { mLogTarea } from '../../models/mLogTarea';

//Servicios
import { sMis_Tareas } from '../../services/sMis_Tareas.service';
import { spMis_Tareas } from '../../services/Personalizados/spMis_Tareas.service';
import { sTarea } from '../../services/sTarea.service';
import { sEstadoTarea } from '../../services/sEstadoTarea.service';
import { sLogTarea } from '../../services/sLogTarea.service';
import { sDetalleSubProyecto } from '../../services/sDetalleSubProyecto.service';
import { sSubProyecto } from '../../services/sSubProyecto.service';
import { mCorreo } from '../../models/mCorreo';
import { sMail } from '../../services/sMail.service';
import { sCorreo } from '../../services/Personalizados/sCorreo.service';
import { sUsuario } from '../../services/sUsuario.service';
import { sVis_UsuarioPersona } from '../../services/sVis_UsuarioPersona.service';
import { mVis_UsuarioPersona } from '../../models/mVis_UsuarioPersona';
import { NotificacionesService } from '../../services/notificaciones.service';
import { Observable } from 'rxjs/Observable';
import { Http, Response } from '@angular/http';
import { configuracion } from '../../config';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/of';

interface buscadorTareas {
  estado: string | number;
  prioridad: string | number;
  responsable: string | number;
}

// declare var jQuery: any;
declare var $: any;
declare var Swal: any;

@Component({
  selector: 'app-mis-tareas',
  templateUrl: './mis-tareas.component.html',
  styleUrls: ['./mis-tareas.component.css'],
  providers: [
    Comunes,
    PopUps,
    sMis_Tareas,
    spMis_Tareas,
    sTarea,
    sEstadoTarea,
    sLogTarea,
    sDetalleSubProyecto,
    sSubProyecto,
    sMail,
    sUsuario,
    sCorreo,
    sVis_UsuarioPersona
  ]
})
export class MisTareasComponent implements OnInit {
  responsableFiltro: string = '';
  estadoFiltro: string | number = '0';
  prioridadFiltro: string | number = '0';
  tipoTareaFiltro: string = '0';
  private filtroSoloVencidas: boolean = false;

  // ===================== UI estilo ClickUp =====================
  vistaActual: 'lista' | 'tablero' = 'lista';
  gruposColapsados: { [idEstado: number]: boolean } = {};

  gruposEstado = [
    { id: 1, nombre: 'Pendiente', color: '#87909e', icono: 'fa-circle-o' },
    { id: 2, nombre: 'En Proceso', color: '#4466ff', icono: 'fa-spinner' },
    { id: 5, nombre: 'Terminada', color: '#008844', icono: 'fa-check-circle' },
    { id: 3, nombre: 'Cancelada', color: '#d33d44', icono: 'fa-times-circle' }
  ];

  // Drag & drop del tablero
  tareaArrastrada: any = null;
  columnaDragOver: number | null = null;
  actualizandoEstadoId: number | null = null;

  // ===================== Crear tarea (misma lógica que crear-tarea.component) =====================
  readonly maxUsuariosCC = 6;
  Responsables: Array<mVis_UsuarioPersona> = [];
  Areas: Array<any> = [
    { idArea: "Administracion", nombre: "Administracion" },
    { idArea: "SGI", nombre: "SGI" },
    { idArea: "SSO_MA", nombre: "SSO_MA" },
    { idArea: "Estudio", nombre: "Estudio" },
    { idArea: "Comercial", nombre: "Comercial" },
    { idArea: "Gerencia", nombre: "Gerencia" },
    { idArea: "Construccion", nombre: "Construcción" },
    { idArea: "Arquitectura", nombre: "Arquitectura" }
  ];
  creandoTarea: boolean = false;

  // Modal "Nueva tarea"
  modalNuevaTarea: boolean = false;
  nuevaTarea: any = {};
  nuevaCC: Array<number> = [];
  nuevaCCBusqueda: string = '';
  nuevaCCDropdown: boolean = false;
  nuevaRespBusqueda: string = '';
  nuevaRespDropdown: boolean = false;

  // Agregar tarea inline (por grupo / columna)
  fechaRapidaNueva: number | null = null;

  quickAddGrupo: number | null = null;
  quickAdd: any = {};

  tiposTarea = [
    { value: '0', label: 'Todas' },
    { value: 'Propia', label: 'Propias' },
    { value: 'Asignada', label: 'Asignadas' },
    { value: 'Creada', label: 'Creadas' },
    { value: 'VistaGlobal', label: 'Vista Global' }
  ];

  filtrarPorResponsable() {
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    const tareasBase = [...(this.TareasOriginal || [])];
    const filtroNombre = (this.responsableFiltro || '').trim().toLowerCase();
    const estado = this.estadoFiltro;
    const prioridad = this.prioridadFiltro;

    let salida = tareasBase;

    const estadoStr = ((estado !== null && estado !== undefined) ? estado : '').toString();

    // Filtro por estado
    if (this.filtroSoloVencidas) {
      const hoy = new Date();
      salida = salida.filter(t => {
        if (!t.fechaTerminoProgramado) return false;
        const fechaVencimiento = new Date(t.fechaTerminoProgramado);
        if (isNaN(fechaVencimiento.getTime())) return false;
        return fechaVencimiento < hoy && (t.idEstadoTarea == 1 || t.idEstadoTarea == 2);
      });
    } else if (estadoStr === 'ALL') {
      // Sin filtro de estado
      salida = salida;
    } else if (estadoStr && estadoStr !== '0') {
      const estadoNum = parseInt(estadoStr, 10);
      salida = salida.filter(t => t.idEstadoTarea == estadoNum);
    } else {
      // Por defecto: solo activas (Pendiente y En Proceso)
      salida = salida.filter(t => t.idEstadoTarea == 1 || t.idEstadoTarea == 2);
    }

    // Filtro por nombre de responsable o creador
    if (filtroNombre) {
      salida = salida.filter(t => {
        const nombreResponsable = (t.UsuarioResponsable || '').toString().toLowerCase();
        const nombreCreador = (t.UsuarioCreador || '').toString().toLowerCase();
        return nombreResponsable.includes(filtroNombre) || nombreCreador.includes(filtroNombre);
      });
    }

    // Filtro por prioridad (combinable)
    if (prioridad && prioridad !== '0') {
      salida = salida.filter(t => t.prioridad === prioridad);
    }

    // Filtro por tipo de tarea
    if (this.tipoTareaFiltro && this.tipoTareaFiltro !== '0') {
      salida = salida.filter(t => {
        const esResponsable = t.idUsuarioResponsable == this.usuario.idUsuario;
        const esCreador = t.idUsuarioCreador == this.usuario.idUsuario;

        if (this.tipoTareaFiltro === 'Propia') {
          return esResponsable && esCreador;
        } else if (this.tipoTareaFiltro === 'Asignada') {
          return esResponsable && !esCreador;
        } else if (this.tipoTareaFiltro === 'Creada') {
          return !esResponsable && esCreador;
        } else if (this.tipoTareaFiltro === 'VistaGlobal') {
          return !esResponsable && !esCreador;
        }
        return true;
      });
    }

    this.Tareas = this.ordenarTareasPorFechaCreacion(salida);
  }
  descripcionExpandidaIndex: number|null = null;

  // Comentarios (edición inline en la grilla)
  comentarioEditandoId: number | null = null;
  comentarioDraft: { [idTarea: number]: string } = {};
  guardandoComentarioId: number | null = null;

  // TODO(PRUEBA): Placeholder visual mientras no exista comentario real.
  // Buscar "COMENTARIO_DE_PRUEBA" para eliminar cuando corresponda.
  comentarioEjemploPrueba: string = '[COMENTARIO_DE_PRUEBA] Ej: Revisar avance con equipo';

  toggleDescripcionExpandida(index: number) {
    this.descripcionExpandidaIndex = this.descripcionExpandidaIndex === index ? null : index;
  }

  limpiarDescripcion(descripcion: string): string {
    return (descripcion || '').toString().replace(/<br\s*\/?>/gi, ' ');
  }

  iniciarEdicionComentario(tareaFila: any) {
    if (!tareaFila) return;
    const idTarea = tareaFila.idTarea;
    this.comentarioEditandoId = idTarea;
    this.comentarioDraft[idTarea] = (tareaFila['observacionTarea'] || '').toString();
    this.msg = false;
    this.texto = '';
  }

  cancelarEdicionComentario() {
    this.comentarioEditandoId = null;
    this.guardandoComentarioId = null;
  }

  guardarComentario(tareaFila: any) {
    if (!tareaFila) return;
    const idTarea = tareaFila.idTarea;
    const comentario = (this.comentarioDraft[idTarea] || '').toString().trim();

    this.guardandoComentarioId = idTarea;
    this.msg = false;
    this.texto = '';

    // Importante: la grilla viene desde pMis_Tareas y puede no traer el campo.
    // Para guardar de forma segura, traemos el objeto Tarea completo y lo actualizamos.
    this._sTarea.getTareabyID(idTarea).subscribe(detalle => {
      const tareaDetalle: any = detalle || {};
      tareaDetalle['observacionTarea'] = comentario;

      const req: any = this._sTarea.postUpdDelTarea(tareaDetalle);
      if (req && req.success) {
        req.success(() => {
          tareaFila['observacionTarea'] = comentario;
          this.guardandoComentarioId = null;
          this.comentarioEditandoId = null;
          this.texto = 'Comentario guardado correctamente';
          this.msg = true;
        }).fail(() => {
          this.guardandoComentarioId = null;
          this.texto = 'No se pudo guardar el comentario';
          this.msg = true;
        });
      } else {
        this.guardandoComentarioId = null;
        this.texto = 'No se pudo guardar el comentario';
        this.msg = true;
      }
    }, () => {
      this.guardandoComentarioId = null;
      this.texto = 'No se pudo cargar la tarea para guardar el comentario';
      this.msg = true;
    });
  }

  @Input() Filtro: any;

  //Objetos
  usuario: any;
  Tarea: mTarea;
  TareaPrev: mLogTarea;
  LogTarea: Array<mLogTarea>;
  EstadosTarea: Array<mEstadoTarea>;
  usuariosMap: Map<number, string> = new Map(); // Mapa para almacenar nombres de usuarios


  //Select
  Tareas: Array<mMis_Tareas>;
  Tareas$: Observable<mMis_Tareas[]>;
  // copia base para aplicar filtros desde la UI
  TareasOriginal: Array<mMis_Tareas>;
  Estados: Array<mEstadoTarea>;

  //Indice
  IndexUpdate: number;

  //Visibles
  Edit: boolean;
  history: boolean;

  //PoUp
  texto: string;
  msg: boolean;

  //Loading
  Loading: boolean;
  LoadingTabla: boolean;

  //Sorting
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  //Email sending state
  sendingEmail: boolean = false;

  constructor(
    private _Comunes: Comunes,
    private _PopUps: PopUps,
    // private _sMis_Tareas: sMis_Tareas,
    private _spMis_Tareas: spMis_Tareas,
    private _sTarea: sTarea,
    private _sEstadoTarea: sEstadoTarea,
    private _sLogTarea: sLogTarea,
    private _sDetalleSubProyecto: sDetalleSubProyecto,
    private _sSubProyecto: sSubProyecto,
    private _sMail: sMail,
    private _sUsuario: sUsuario,
    private _sCorreo: sCorreo,
    private _sVis_UsuarioPersona: sVis_UsuarioPersona,
    private _http: Http,
    private router: Router,
    private route: ActivatedRoute,
    private _notificacionesService: NotificacionesService
  ) {
    this.Edit = false;
    this.history = false;
    this.nuevaTarea = this.nuevaTareaVacia(1);
    this.quickAdd = this.quickAddVacio();
    this.Tarea = new mTarea(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
  }

  ngOnInit() {
    this.LoadingTabla = true;
    this.usuario = JSON.parse(localStorage.usuario);

    // Recordar la última vista usada (Lista / Tablero)
    try {
      const vistaGuardada = localStorage.getItem('misTareasVista');
      if (vistaGuardada === 'lista' || vistaGuardada === 'tablero') {
        this.vistaActual = vistaGuardada;
      }
    } catch (e) { }

    // Cambiar color del nav al entrar a Mis Tareas
    setTimeout(() => {
      if (typeof $ !== 'undefined') {
        $('#sidebar').css('background-color', '#89658f');
      } else {
        const nav = document.getElementById('sidebar');
        if (nav) nav.style.backgroundColor = '#89658f';
      }
    }, 100);

    // Verificar si viene con parámetro para destacar tarea
    this.route.queryParams.subscribe(params => {
      if (params['destacarTarea']) {
        console.log('🎯 Detectado parámetro para destacar tarea en Mis Tareas:', params['destacarTarea']);
        const idTarea = parseInt(params['destacarTarea']);

        // Esperar a que se carguen las tareas y luego destacar
        setTimeout(() => {
          this.destacarTareaDesdeParametro(idTarea);
        }, 1000);
      }

      // Link del correo de tarea nueva (?editarTarea=ID): destacar y abrir el editor
      if (params['editarTarea']) {
        const idEditar = parseInt(params['editarTarea'], 10);
        const intentarAbrir = (intentos: number) => {
          if (this.LoadingTabla || !this.Tareas) {
            if (intentos > 0) setTimeout(() => intentarAbrir(intentos - 1), 500);
            return;
          }
          const tarea = this.Tareas.find(t => t.idTarea === idEditar);
          if (tarea) {
            this.seleccionarTareaLocal(tarea);
            this.editarTarea(tarea);
          }
        };
        setTimeout(() => intentarAbrir(20), 500);
      }
    });

    // Establecer ordenamiento inicial: más recientes primero
    this.sortField = 'fechaCreacion';
    this.sortDirection = 'desc';

    this.GetMisTareas();
    this._sEstadoTarea.getEstadoTarea().subscribe(result => {
      this.EstadosTarea = result;
    });

    this.cargarResponsables();
  }

  private GetMisTareas(onDone?: () => void) {
    // Usar el método que obtiene todas las tareas para incluir las del tablero de control
    this.getAllTareas().subscribe(result => {
      console.log('📦 Tareas recibidas del servidor:', result.length);
      console.log('📊 Estados de las tareas recibidas:', result.map(t => ({ id: t.idTarea, estado: t.idEstadoTarea, nombre: t.nombreTarea })));

      this.Tareas = [];

      // Verificar si el usuario puede ver todas las tareas (jolivares o perfiles de gerencia)
      const esJolivares = this.usuario.nombreUsuario &&
        this.usuario.nombreUsuario.toLowerCase().includes('jolivares');
      const esGerencia = this.usuario.idPerfil === 1 ||
        this.usuario.idPerfil === 2 ||
        this.usuario.idPerfil === 11;

      const puedeVerTodas = this.usuario && (esJolivares || esGerencia);
      // Filtros por Estados En Proceso, Pendiente y canceladas ya se cargan todas, Terminadas no se muestran.
      // Primero aplicar filtros de permisos (sin filtrar por estado aún)
      if (puedeVerTodas) {
        // jolivares y gerencia ven todas las tareas
        this.TareasOriginal = result;
      } else {
        // Los demás usuarios solo ven tareas donde son responsables O creadores
        this.TareasOriginal = result.filter(el => {
          const esResponsable = el.idUsuarioResponsable == this.usuario.idUsuario;
          const esCreador = el.idUsuarioCreador == this.usuario.idUsuario;
          return esResponsable || esCreador;
        });
      }

      // Aplica los filtros actuales. Con los filtros por defecto equivale a:
      // solo activas (Pendiente / En Proceso), ordenadas por fecha de creación desc.
      // Así, al recargar después de crear una tarea, se respetan los filtros que el usuario tenga puestos.
      this.aplicarFiltros();

      console.log('📅 Tareas ordenadas por fecha de creación (más reciente primero):', this.Tareas.length);

      this.OcultarPopUpEditar();
      this.LoadingTabla = false;

      if (onDone) onDone();
    });
  }

  ReenviarCorreo(Tarea: mTarea) {
    this.sendingEmail = true;

    // Obtener nombre del usuario creador
    this._sVis_UsuarioPersona.getVis_UsuarioPersona().subscribe(usuariosPersona => {
      const usuarioCreador = usuariosPersona.find(up => up.idUsuario === Tarea.idUsuarioCreador);
      const nombreCreador = usuarioCreador ? `${usuarioCreador.nombre} ${usuarioCreador.paterno}` : 'Usuario';

      this._sUsuario.getUsuariobyID(Tarea.idUsuarioResponsable).subscribe(usuarioRes => {
        if (!usuarioRes || !usuarioRes.idPersona) {
          this.sendingEmail = false;
          Swal.fire(
            'Error',
            'No se pudo obtener la información del responsable',
            'error'
          );
          return;
        }

        this._sMail.getMailbyidPersona(usuarioRes.idPersona).subscribe(mail => {
          const correosActivos = (mail || [])
            .filter(m => m && m.activo !== false && m.direccionMail && m.direccionMail.toString().trim().length > 0)
            .map(m => m.direccionMail.toString().trim());

          const paraUnicos = correosActivos.filter((direccion, index, arr) => arr.indexOf(direccion) === index);

          if (paraUnicos.length > 0) {
            // Formatear fecha de cumplimiento
            let fechaCumplimiento = '';
            if (Tarea.fechaTerminoProgramado) {
              const fecha = new Date(Tarea.fechaTerminoProgramado);
              fechaCumplimiento = fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
            }

            // Link directo a la tarea
            const linkTarea = Tarea.idTarea
              ? `http://proyectos.trazas-nbi.com/Ver-Tareas?destacarTarea=${Tarea.idTarea}`
              : 'http://proyectos.trazas-nbi.com/Ver-Tareas';

            let mensaje = `Estimado, <br>
              <br>
                  Le queremos recordar que posee la siguiente tarea asignada por <b>${nombreCreador}</b>:<br>
                  <h3 style="margin-bottom: 0px;"><b>Descripción de la tarea:</b></h3>
                  ${Tarea.descripcionTarea}<br><br>
                  ${fechaCumplimiento ? '<h3 style="margin-bottom: 0px;"><b>Fecha de cumplimiento:</b></h3>' + fechaCumplimiento + '<br><br>' : ''}
                  Favor informar avance en el siguiente link:<br>
                  <a href='${linkTarea}' target='_blank' style='font-size: 16px; font-weight: bold; color: #007bff;'>Ir a la Tarea</a>`;

            let correoEnviar: mCorreo = new mCorreo(paraUnicos.join(','), 'Tarea asignada', mensaje)
            this._sCorreo.postCorreo(correoEnviar).subscribe(res => {
              this.sendingEmail = false;
              Swal.fire(
                'Tareas',
                'Se ha reenviado de forma exitosa la Tarea',
                'success'
              )
            }, err => {
              this.sendingEmail = false;
              console.log(err);
              const detalle = err && err._body ? err._body : 'No se pudo enviar el recordatorio';
              Swal.fire(
                'Error',
                detalle,
                'error'
              )
            });
          } else {
            this.sendingEmail = false;
            Swal.fire(
              'Error',
              'No se encontró un correo activo para el usuario responsable',
              'error'
            )
          }
        }, err => {
          this.sendingEmail = false;
          console.log(err);
        });
      }, err => {
        this.sendingEmail = false;
        console.log(err);
      });
    }, err => {
      this.sendingEmail = false;
      console.log(err);
    });
  }

  buscador(e: buscadorTareas) {
    // Aplicar filtros sobre la copia base (ya respetando permisos)
    try {
      let arrSalida = [...(this.TareasOriginal || [])];

      // Aplicar filtro por estado si se seleccionó uno específico
      if (e.estado && e.estado != "0") {
        arrSalida = arrSalida.filter(element => element.idEstadoTarea == parseInt(e.estado.toString()));
      } else {
        // Si no hay estado específico, mostrar solo tareas activas por defecto
        arrSalida = arrSalida.filter(el => el.idEstadoTarea == 1 || el.idEstadoTarea == 2);
      }

      // Aplicar otros filtros
      if (e.prioridad && e.prioridad != "0")
        arrSalida = arrSalida.filter(element => element.prioridad == e.prioridad);
      if (e.responsable && e.responsable != "0")
        arrSalida = arrSalida.filter(element => element.idUsuarioResponsable == parseInt(e.responsable.toString()));

      // ORDENAR RESULTADOS DE BÚSQUEDA: La más reciente arriba
      this.Tareas = this.ordenarTareasPorFechaCreacion(arrSalida);

      console.log(`Filtros aplicados - Estado: ${e.estado}, Resultados: ${this.Tareas.length}`);
    } catch (err) {
      console.error('Error aplicando filtros en buscador:', err);
    }
  }

  //*************************************************** CRUD ***************************************************

  Actualizar(form) {
    this.texto = "";
    this.msg = false;

    this.persistirTarea(this.Tarea, this.TareaPrev, () => {
      this.OcultarPopUpEditar();
      this.texto = "Tarea actualizada de forma correcta";
      this.msg = true;
    });
  }

  // Lógica de guardado compartida (modal Editar + drag & drop del tablero):
  // 1) registra en LogTarea si cambió fecha, estado o comentario
  // 2) actualiza la Tarea
  // 3) refresca TareasOriginal, localStorage de terminadas y filtros
  private persistirTarea(tarea: any, tareaPrev: any, onOk: () => void, onError?: () => void) {
    const prev: any = tareaPrev || {};

    const cambioFecha = prev.fechaTerminoProgramado !== tarea.fechaTerminoProgramado;
    const cambioEstado = prev.idEstadoTarea !== tarea.idEstadoTarea;
    const cambioComentario = prev.observacionTarea !== tarea.observacionTarea;

    if (cambioFecha || cambioEstado || cambioComentario) {
      console.log('Guardando en historial - Cambio de fecha:', cambioFecha, 'Cambio de estado:', cambioEstado, 'Cambio de comentario:', cambioComentario);

      // Crear objeto logTarea solo con los campos que existen en mLogTarea
      const logTarea: any = {
        idLogTarea: null,
        idTarea: tarea.idTarea,
        idDetalleSubProyecto: tarea.idDetalleSubProyecto,
        nombreTarea: tarea.nombreTarea,
        descripcionTarea: tarea.descripcionTarea,
        idUsuarioResponsable: tarea.idUsuarioResponsable,
        fechaInicioProgramado: tarea.fechaInicioProgramado,
        fechaTerminoProgramado: tarea.fechaTerminoProgramado,
        fechaInicioReal: tarea.fechaInicioReal,
        fechaTerminoReal: tarea.fechaTerminoReal,
        idEstadoTarea: tarea.idEstadoTarea,
        fechaCreacion: tarea.fechaCreacion,
        activo: tarea.activo,
        fechaRemocion: tarea.fechaRemocion,
        idUsuarioCreador: tarea.idUsuarioCreador,
        idUsuarioRemovedor: tarea.idUsuarioRemovedor,
        observacionTarea: tarea.observacionTarea
      };

      // Guardar solo el comentario en el historial, no la descripción de la tarea
      if (logTarea.observacionTarea && logTarea.observacionTarea.trim() !== '') {
        logTarea.descripcionTarea = logTarea.observacionTarea;
      }

      console.log('📝 Objeto logTarea a guardar:', logTarea);
      this._sLogTarea.postAddLogTarea(logTarea).success(res => {
        console.log('✅ Respuesta del servidor al guardar log:', res);
      }).fail(err => {
        console.error('❌ Error al guardar log:', err);
      });
    } else {
      console.log('No se guarda en historial - Sin cambios de fecha, estado ni comentarios');
    }

    const req: any = this._sTarea.postUpdDelTarea(tarea);

    req.success(result => {
      // Actualizar la tarea en TareasOriginal localmente
      const index = (this.TareasOriginal || []).findIndex(t => t.idTarea === tarea.idTarea);
      if (index !== -1) {
        this.TareasOriginal[index] = {
          ...this.TareasOriginal[index],
          idEstadoTarea: +tarea.idEstadoTarea,
          nombreEstadoTarea: this.getEstado(tarea.idEstadoTarea) || this.TareasOriginal[index].nombreEstadoTarea,
          fechaTerminoProgramado: tarea.fechaTerminoProgramado,
          observacionTarea: tarea.observacionTarea,
          fechaInicioReal: tarea.fechaInicioReal,
          fechaTerminoReal: tarea.fechaTerminoReal
        };
        console.log('✅ Tarea actualizada en TareasOriginal (idTarea:', tarea.idTarea, ', nuevo estado:', tarea.idEstadoTarea, ')');
      }

      // Guardar tareas terminadas en localStorage para persistencia
      this.guardarTareasTerminadasEnStorage();

      // Aplicar filtros para actualizar la vista
      this.aplicarFiltros();

      onOk();
    });

    if (req && req.fail) {
      req.fail(err => {
        console.error('❌ Error al actualizar tarea:', err);
        if (onError) onError();
      });
    }
  }

  //*************************************************** PopUP ***************************************************
  Editar(i: number) {
    this.Edit = true;
    this._sTarea.getTareabyID(this.Tareas[i].idTarea).subscribe(result => {
      this.Tarea = result;
      this.TareaPrev = { ...result };
      // Mantener el estado actual en lugar de resetearlo a 0
      this._PopUps.VerPopUpEditar();
      $(".date").datetimepicker({ format: 'DD/MM/YYYY' });
      let Compromiso
      if (this.Tarea.fechaTerminoProgramado) {
        Compromiso = this.Tarea.fechaTerminoProgramado.split("T")[0];
        $("#txtCompromiso").val(Compromiso.split("-")[2] + "/" + Compromiso.split("-")[1] + "/" + Compromiso.split("-")[0]);
      }
    });

    this._sEstadoTarea.getEstadoTarea().subscribe(result => {
      // Ordenar estados: Pendiente (1), En Proceso (2), Terminada (5), Cancelada (3)
      const ordenDeseado = [1, 2, 5, 3];
      this.Estados = result.sort((a, b) => {
        const indexA = ordenDeseado.indexOf(a.idEstadoTarea);
        const indexB = ordenDeseado.indexOf(b.idEstadoTarea);
        return indexA - indexB;
      });
    });

    this.IndexUpdate = i;

  }

  OcultarPopUpEditar() {
    this.IndexUpdate = 0;
    this._PopUps.OcultarPopUpEditar();
    this.Edit = false;
  }

  OcultarPopUpHistorial() {
    this.IndexUpdate = 0;
    $("#Historial").attr('class', 'modal fade');
    $("#Historial").attr("style", "");
    $("body").attr("style", "");
    this.Edit = false;
    this.history = false;
  }

  //*************************************************** Funciones desde el HTML ***************************************************

  asignaFechaInicio() {
    this.Tarea.fechaTerminoProgramado = this._Comunes.ReturnFecha($("#txtCompromiso"));
  }

  TraeHistorial(idTarea) {
    $("#Historial").attr('class', 'modal fade in');
    $("#Historial").attr("style", "display: block;background-color:rgba(15, 18, 24, 0.45);overflow-y: auto;");
    $("body").attr("style", "overflow-y: hidden;");
    this.history = true;
    this.LogTarea = null;
    this._sLogTarea.getLogTareabyidTarea(idTarea).subscribe(result => {
      console.log('📋 Historial completo recibido del backend:', result);

      // Filtrar solo los registros que tienen cambios de fecha de compromiso, estado o comentarios
      const registrosFiltrados = [];

      for (let i = 0; i < result.length; i++) {
        const registroActual = result[i];

        // Primer registro siempre se incluye
        if (i === 0) {
          registrosFiltrados.push(registroActual);
          continue;
        }

        const registroAnterior = result[i - 1];

        const cambioFecha = registroActual.fechaTerminoProgramado !== registroAnterior.fechaTerminoProgramado;
        const cambioEstado = registroActual.idEstadoTarea !== registroAnterior.idEstadoTarea;
        const cambioDescripcion = registroActual.descripcionTarea !== registroAnterior.descripcionTarea;

        if (cambioFecha || cambioEstado || cambioDescripcion) {
          registrosFiltrados.push(registroActual);
        }
      }

      console.log('✅ Registros filtrados:', registrosFiltrados);
      this.LogTarea = registrosFiltrados;

      // Obtener los IDs únicos de usuarios creadores del historial
      const todosLosIds = registrosFiltrados.map(log => log.idUsuarioCreador).filter(id => id);
      const idsUsuarios = Array.from(new Set(todosLosIds));

      // Cargar información de usuarios
      if (idsUsuarios.length > 0) {
        this.cargarUsuariosHistorial(idsUsuarios);
      }
    });
  }

  // Cargar los usuarios del historial
  cargarUsuariosHistorial(idsUsuarios: number[]) {
    const requests = idsUsuarios.map(id =>
      this._sUsuario.getUsuariobyidUsuario(id).catch(() => Observable.of(null))
    );

    Observable.forkJoin(requests).subscribe(usuarios => {
      usuarios.forEach((usuario, index) => {
        if (usuario && usuario.length > 0) {
          this.usuariosMap.set(idsUsuarios[index], usuario[0].nombreUsuario);
        } else if (usuario && !Array.isArray(usuario) && usuario.nombreUsuario) {
          this.usuariosMap.set(idsUsuarios[index], usuario.nombreUsuario);
        }
      });
    });
  }

  // Obtener el nombre del usuario por ID
  getNombreUsuario(idUsuario: number): string {
    return this.usuariosMap.get(idUsuario) || 'Usuario desconocido';
  }

  getEstado(idEstado): string {
    if (!this.EstadosTarea) return '';
    const estado = this.EstadosTarea.filter(element => { return element.idEstadoTarea == idEstado })[0];
    return estado ? estado.nombreEstadoTarea : '';
  }

  getTaskCountByStatus(statusId: number): number {
    if (!this.Tareas) return 0;
    return this.Tareas.filter(task => task.idEstadoTarea === statusId).length;
  }

  getOverdueTasks(): number {
    if (!this.Tareas) return 0;
    const today = new Date();
    return this.Tareas.filter(task => {
      if (!task.fechaTerminoProgramado) {
        return false;
      }

      const dueDate = new Date(task.fechaTerminoProgramado);
      if (isNaN(dueDate.getTime())) {
        return false;
      }

      return dueDate < today && (task.idEstadoTarea === 1 || task.idEstadoTarea === 2);
    }).length;
  }

  isOverdue(fechaTermino: string): boolean {
    if (!fechaTermino) return false;

    const today = new Date();
    const dueDate = new Date(fechaTermino);

    if (isNaN(dueDate.getTime())) {
      return false;
    }

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

  // Ordenar tareas por fecha de creación (más reciente primero)
  private ordenarTareasPorFechaCreacion(tareas: any[]): any[] {
    return tareas.sort((a, b) => {
      const fechaA = new Date(a.fechaCreacion).getTime();
      const fechaB = new Date(b.fechaCreacion).getTime();
      return fechaB - fechaA;
    });
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = field === 'fechaCreacion' ? 'desc' : 'asc';
    }

    this.Tareas.sort((a, b) => {
      let aValue = a[field];
      let bValue = b[field];

      if (field.includes('fecha') || field.includes('Fecha')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
      }

      if (aValue < bValue) {
        return this.sortDirection === 'asc' ? -1 : 1;
      } else if (aValue > bValue) {
        return this.sortDirection === 'asc' ? 1 : -1;
      } else {
        return 0;
      }
    });
  }

  private guardarTareasTerminadasEnStorage() {
    if (!this.TareasOriginal) return;
    const tareasTerminadas = this.TareasOriginal.filter(t => t.idEstadoTarea == 5);
    localStorage.setItem('tareasTerminadas_' + this.usuario.idUsuario, JSON.stringify(tareasTerminadas));
    console.log('💾 Guardadas en localStorage:', tareasTerminadas.length, 'tareas terminadas');
  }

  private obtenerTareasTerminadasDeStorage(): any[] {
    const stored = localStorage.getItem('tareasTerminadas_' + this.usuario.idUsuario);
    if (!stored) return [];
    try {
      const tareas = JSON.parse(stored);
      console.log('📂 Recuperadas de localStorage:', tareas.length, 'tareas terminadas');
      return tareas;
    } catch (e) {
      return [];
    }
  }

  private getAllTareas(): Observable<any> {
    const idUsuarioActual = this.usuario && this.usuario.idUsuario ? +this.usuario.idUsuario : 0;
    const esJolivares = this.usuario && this.usuario.nombreUsuario &&
      this.usuario.nombreUsuario.toLowerCase().includes('jolivares');
    const esGerencia = this.usuario &&
      (this.usuario.idPerfil === 1 || this.usuario.idPerfil === 2 || this.usuario.idPerfil === 11);
    const puedeVerTodas = esJolivares || esGerencia;

    const combinarSinDuplicados = (tareasEntrada: any[]) => {
      const tareasBase = tareasEntrada || [];
      const tareasUnicas = tareasBase.filter((tarea, index, self) =>
        index === self.findIndex(t => t.idTarea === tarea.idTarea)
      );

      const tareasTerminadasStorage = this.obtenerTareasTerminadasDeStorage();
      tareasTerminadasStorage.forEach(tareaTerminada => {
        const existe = tareasUnicas.find(t => t.idTarea === tareaTerminada.idTarea);
        if (!existe) {
          tareasUnicas.push(tareaTerminada);
        }
      });

      return tareasUnicas;
    };

    if (!puedeVerTodas) {
      if (!idUsuarioActual || idUsuarioActual <= 0) {
        return Observable.of([]);
      }

      return this._spMis_Tareas.getMis_TareasbyIdUsuario(idUsuarioActual)
        .catch(() => Observable.of([]))
        .map(tareasUsuario => combinarSinDuplicados(tareasUsuario || []));
    }

    return this._sUsuario.getUsuariobyactivo(true)
      .catch(() => Observable.of([]))
      .switchMap(usuariosActivos => {
        const idsUsuarios = (usuariosActivos || [])
          .map(u => +u.idUsuario)
          .filter(id => !!id && id > 0);

        if (idUsuarioActual > 0 && idsUsuarios.indexOf(idUsuarioActual) === -1) {
          idsUsuarios.push(idUsuarioActual);
        }

        if (!idsUsuarios.length) {
          return Observable.of([]);
        }

        const observables = idsUsuarios.map(idUsuario =>
          this._spMis_Tareas.getMis_TareasbyIdUsuario(idUsuario).catch(() => Observable.of([]))
        );

        return Observable.forkJoin(observables);
      })
      .map((resultados: any[]) => {
        const todasLasTareas = (resultados || []).reduce((acumulado, tareas) => acumulado.concat(tareas || []), []);
        return combinarSinDuplicados(todasLasTareas);
      });
  }

  private verificarPermisos(): Observable<boolean> {
    return this.cargaPerfiles().map(perfiles => {
      // Perfil 1: Sub Gerente, 2: Director, 11: Gerente-Admin
      return perfiles.some(perfil =>
        perfil.idPerfil == 1 || perfil.idPerfil == 2 || perfil.idPerfil == 11
      );
    });
  }

  private cargaPerfiles(): Observable<any> {
    const urlBase = configuracion.url;
    let controlador: string = 'UsuariosPerfiles/';
    let urlFull: string = urlBase + controlador;

    return this._http.get(urlFull + 'GetUsuariosPerfilesByIdUsuario/IdUsuario=' + this.usuario.idUsuario)
      .map((res: Response) => res.json());
  }

  // Determinar el tipo de tarea
  getTipoTarea(tarea: any): string {
    const esResponsable = tarea.idUsuarioResponsable == this.usuario.idUsuario;
    const esCreador = tarea.idUsuarioCreador == this.usuario.idUsuario;

    if (esResponsable && esCreador) {
      return 'Propia';
    } else if (esResponsable) {
      return 'Asignada';
    } else if (esCreador) {
      return 'Creada';
    } else {
      return 'Todas'; // Solo visible para gerencia
    }
  }

  // Propiedad para controlar qué tarea está destacada en la tabla actual
  tareaDestacadaLocal: number | null = null;

  // Clic en el sub proyecto de una tarea
  navegarATareaEnProyecto(tarea: any) {
    console.log('🎯 Analizando tarea:', tarea);

    if (tarea.idDetalleSubProyecto && tarea.idDetalleSubProyecto !== null) {
      // CASO 1: Tarea DE PROYECTO - Navegar al tablero específico del proyecto
      this._sDetalleSubProyecto.getDetalleSubProyectobyidDetalleSubProyecto(tarea.idDetalleSubProyecto)
        .subscribe(
          detalleSubProyecto => {
            if (detalleSubProyecto && detalleSubProyecto.length > 0) {
              const detalle = detalleSubProyecto[0];
              const idSubProyecto = detalle.idSubProyecto;

              this._sSubProyecto.getSubProyectobyID(idSubProyecto).subscribe(
                subproyecto => {
                  localStorage.setItem('SubProyecto', JSON.stringify(subproyecto));

                  const queryParams = {
                    destacarTarea: tarea.idTarea,
                    tab: 'tareas'
                  };

                  this.router.navigate(['/Proyecto-TableroControl'], { queryParams });
                },
                error => {
                  console.error('❌ Error al obtener subproyecto:', error);
                  Swal.fire('Error', 'No se pudo obtener la información del proyecto', 'error');
                }
              );
            } else {
              console.error('❌ No se encontró detalle del subproyecto');
              Swal.fire('Error', 'No se encontró información del proyecto de esta tarea', 'error');
            }
          },
          error => {
            console.error('❌ Error al obtener detalle del subproyecto:', error);
            Swal.fire('Error', 'No se pudo acceder al proyecto de esta tarea', 'error');
          }
        );

    } else {
      // CASO 2: Tarea GENERAL - Solo resaltar en la vista actual
      this.tareaDestacadaLocal = tarea.idTarea;

      setTimeout(() => {
        const elemento = document.getElementById(`tarea-local-${tarea.idTarea}`);
        if (elemento) {
          elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      setTimeout(() => {
        this.tareaDestacadaLocal = null;
      }, 5000);

      Swal.fire({
        title: 'Tarea General',
        text: 'Esta tarea no pertenece a ningún proyecto específico.',
        icon: 'info',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  }

  // Selecciona/resalta la tarea localmente sin navegar al subproyecto
  seleccionarTareaLocal(tarea: any) {
    try {
      this.tareaDestacadaLocal = tarea.idTarea;

      setTimeout(() => {
        const elemento = document.getElementById(`tarea-local-${tarea.idTarea}`);
        if (elemento) {
          elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      setTimeout(() => {
        this.tareaDestacadaLocal = null;
      }, 5000);
    } catch (err) {
      console.error('Error al seleccionar tarea localmente', err);
    }
  }

  esTareaDestacadaLocal(tarea: any): boolean {
    return this.tareaDestacadaLocal !== null && tarea.idTarea === this.tareaDestacadaLocal;
  }

  // Destacar una tarea cuando viene de parámetro URL
  destacarTareaDesdeParametro(idTarea: number) {
    if (!this.Tareas) return;
    const tarea = this.Tareas.find(t => t.idTarea === idTarea);

    if (tarea) {
      if (tarea.idDetalleSubProyecto && tarea.idDetalleSubProyecto !== null) {
        const queryParams = {
          destacarTarea: tarea.idTarea,
          tab: 'tareas'
        };
        this.router.navigate(['/Proyecto-TableroControl'], { queryParams });
      } else {
        this.tareaDestacadaLocal = idTarea;

        // Si el grupo de la tarea estaba colapsado, lo abrimos
        this.gruposColapsados[tarea.idEstadoTarea] = false;

        setTimeout(() => {
          const elemento = document.getElementById(`tarea-local-${idTarea}`);
          if (elemento) {
            elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);

        setTimeout(() => {
          this.tareaDestacadaLocal = null;
        }, 8000);
      }
    } else {
      console.warn('❌ Tarea no encontrada en la lista actual:', idTarea);
    }
  }

  mostrarPendientes() {
    this.filtroSoloVencidas = false;
    this.estadoFiltro = 1;
    this.aplicarFiltros();
  }

  mostrarEnProceso() {
    this.filtroSoloVencidas = false;
    this.estadoFiltro = 2;
    this.aplicarFiltros();
  }

  mostrarVencidas() {
    this.filtroSoloVencidas = true;
    this.estadoFiltro = '0';
    this.aplicarFiltros();
  }

  mostrarCanceladas() {
    this.filtroSoloVencidas = false;
    this.estadoFiltro = 3;
    this.aplicarFiltros();
  }

  getCantidadCanceladas(): number {
    if (!this.TareasOriginal) return 0;
    return this.TareasOriginal.filter(t => t.idEstadoTarea == 3).length;
  }

  mostrarTerminadas() {
    this.filtroSoloVencidas = false;
    this.estadoFiltro = 5;
    this.aplicarFiltros();
  }

  getCantidadTerminadas(): number {
    if (!this.TareasOriginal) return 0;
    return this.TareasOriginal.filter(t => t.idEstadoTarea == 5).length;
  }

  getTaskCountByPrioridad(prioridad: string): number {
    if (!this.TareasOriginal) return 0;
    return this.TareasOriginal.filter(t => t.prioridad === prioridad).length;
  }

  filtrarPorPrioridad(prioridad: string) {
    this.prioridadFiltro = prioridad;
    this.aplicarFiltros();
  }

  limpiarFiltroResponsable() {
    this.responsableFiltro = '';
    this.estadoFiltro = '0';
    this.prioridadFiltro = '0';
    this.tipoTareaFiltro = '0';
    this.filtroSoloVencidas = false;
    this.aplicarFiltros();
  }

  // Cuenta los cambios de fecha de compromiso en el historial de la tarea
  getCambiosFechaCompromisoHistorial(idTarea: number): number {
    if (!this.LogTarea || !Array.isArray(this.LogTarea)) return 0;
    const logs = this.LogTarea.filter(log => log.idTarea === idTarea);
    let count = 0;
    let lastFecha = null;
    for (const log of logs) {
      if (lastFecha !== null && log.fechaTerminoProgramado !== lastFecha) {
        count++;
      }
      lastFecha = log.fechaTerminoProgramado;
    }
    return count;
  }

  //*************************************************** Helpers UI estilo ClickUp ***************************************************

  cambiarVista(vista: 'lista' | 'tablero') {
    this.vistaActual = vista;
    try {
      localStorage.setItem('misTareasVista', vista);
    } catch (e) { }
  }

  toggleGrupo(idEstado: number) {
    this.gruposColapsados[idEstado] = !this.gruposColapsados[idEstado];
  }

  tareasPorEstado(idEstado: number): any[] {
    if (!this.Tareas) return [];
    return this.Tareas.filter(t => t.idEstadoTarea == idEstado);
  }

  contarVencidasGrupo(idEstado: number): number {
    return this.tareasPorEstado(idEstado).filter(t => this.esVencida(t)).length;
  }

  trackByTarea(index: number, tarea: any) {
    return tarea ? tarea.idTarea : index;
  }

  // Editar() trabaja con el índice dentro de this.Tareas; acá lo resolvemos desde el objeto
  editarTarea(tarea: any) {
    if (!this.Tareas || !tarea) return;
    const i = this.Tareas.indexOf(tarea);
    if (i !== -1) {
      this.Editar(i);
    }
  }

  seleccionarTipoTarea(valor: string) {
    this.tipoTareaFiltro = valor;
    this.aplicarFiltros();
  }

  esFiltroEstadoActivo(idEstado: number): boolean {
    return !this.filtroSoloVencidas && this.estadoFiltro == idEstado;
  }

  esFiltroVencidasActivo(): boolean {
    return this.filtroSoloVencidas;
  }

  // Solo marca como vencida si sigue activa (Pendiente / En Proceso)
  esVencida(tarea: any): boolean {
    if (!tarea) return false;
    return (tarea.idEstadoTarea == 1 || tarea.idEstadoTarea == 2) && this.isOverdue(tarea.fechaTerminoProgramado);
  }

  getTipoTareaLabel(tarea: any): string {
    const tipo = this.getTipoTarea(tarea);
    return tipo === 'Todas' ? 'Vista Global' : tipo;
  }

  getColorPrioridad(prioridad: string): string {
    if (prioridad === 'Alta') return '#f50000';
    if (prioridad === 'Media') return '#f8ae00';
    if (prioridad === 'Baja') return '#6fddff';
    return '#c9cdd3';
  }

  // Color fijo por área (pastel), para escanear la lista de un vistazo
  private coloresArea: { [area: string]: { bg: string; fg: string } } = {
    'Administracion': { bg: '#eef2ff', fg: '#4338ca' },
    'SGI':            { bg: '#ecfdf5', fg: '#047857' },
    'SSO_MA':         { bg: '#fff7ed', fg: '#c2410c' },
    'Estudio':        { bg: '#f0f9ff', fg: '#0369a1' },
    'Comercial':      { bg: '#fdf2f8', fg: '#be185d' },
    'Gerencia':       { bg: '#f5f3ff', fg: '#6d28d9' },
    'Construccion':   { bg: '#fefce8', fg: '#a16207' },
    'Arquitectura':   { bg: '#f0fdfa', fg: '#0f766e' }
  };

  getColorArea(area: string): { bg: string; fg: string } {
    return this.coloresArea[area] || { bg: '#f0f1f3', fg: '#4f5762' };
  }

  getIniciales(nombre: string): string {
    const partes = (nombre || '').toString().trim().split(/[\s._-]+/).filter(p => p.length > 0);
    if (!partes.length) return '?';
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  getColorAvatar(nombre: string): string {
    const paleta = ['#026AA7', '#4466ff', '#0ab4c7', '#00a86b', '#f8ae00', '#e16b16', '#d33d44', '#b660e0', '#5577aa'];
    const txt = (nombre || '').toString();
    let hash = 0;
    for (let i = 0; i < txt.length; i++) {
      hash = ((hash << 5) - hash) + txt.charCodeAt(i);
      hash |= 0;
    }
    return paleta[Math.abs(hash) % paleta.length];
  }

  // "Hoy", "Mañana", "Ayer" o "9 oct" (con año si no es el actual)
  formatoFechaCorta(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '';

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dia = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((dia.getTime() - hoy.getTime()) / 86400000);

    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Mañana';
    if (diff === -1) return 'Ayer';

    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    let txt = d.getDate() + ' ' + meses[d.getMonth()];
    if (d.getFullYear() !== hoy.getFullYear()) {
      txt += ' ' + d.getFullYear();
    }
    return txt;
  }

  //*************************************************** Drag & Drop Tablero ***************************************************

  onDragStart(event: any, tarea: any) {
    if (this.actualizandoEstadoId !== null) {
      event.preventDefault();
      return;
    }
    this.tareaArrastrada = tarea;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try {
        // Firefox necesita setData para iniciar el drag
        event.dataTransfer.setData('text/plain', String(tarea.idTarea));
      } catch (e) {
        try { event.dataTransfer.setData('text', String(tarea.idTarea)); } catch (e2) { }
      }
    }
  }

  onDragEnd() {
    this.tareaArrastrada = null;
    this.columnaDragOver = null;
  }

  onDragOver(event: any, idEstado: number) {
    if (!this.tareaArrastrada) return;
    event.preventDefault(); // necesario para permitir el drop
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this.columnaDragOver !== idEstado) {
      this.columnaDragOver = idEstado;
    }
  }

  onDragLeave(event: any, idEstado: number) {
    // Ignorar cuando el puntero pasa a un hijo de la misma columna
    const destino = event.relatedTarget;
    if (destino && event.currentTarget && event.currentTarget.contains(destino)) return;
    if (this.columnaDragOver === idEstado) {
      this.columnaDragOver = null;
    }
  }

  onDrop(event: any, idEstado: number) {
    event.preventDefault();
    const tarea = this.tareaArrastrada;
    this.onDragEnd();

    if (!tarea || tarea.idEstadoTarea == idEstado) return;

    const nombreEstado = this.getNombreGrupo(idEstado);

    // Cancelar es delicado: pedir confirmación
    if (idEstado == 3) {
      Swal.fire({
        title: '¿Cancelar tarea?',
        text: 'La tarea #' + tarea.idTarea + ' pasará a Cancelada.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'No',
        confirmButtonColor: '#d33d44'
      }).then(res => {
        if (res && (res.value || res.isConfirmed)) {
          this.cambiarEstadoTarea(tarea, idEstado, nombreEstado);
        }
      });
      return;
    }

    this.cambiarEstadoTarea(tarea, idEstado, nombreEstado);
  }

  esColumnaDestino(idEstado: number): boolean {
    return !!this.tareaArrastrada &&
      this.columnaDragOver === idEstado &&
      this.tareaArrastrada.idEstadoTarea != idEstado;
  }

  getNombreGrupo(idEstado: number): string {
    const g = this.gruposEstado.find(x => x.id == idEstado);
    return g ? g.nombre : '';
  }

  // Cambia el estado usando la misma lógica de guardado que el modal Editar
  cambiarEstadoTarea(tareaFila: any, nuevoEstado: number, nombreEstado: string) {
    this.actualizandoEstadoId = tareaFila.idTarea;

    this._sTarea.getTareabyID(tareaFila.idTarea).subscribe(detalle => {
      if (!detalle) {
        this.actualizandoEstadoId = null;
        Swal.fire('Error', 'No se pudo cargar la tarea', 'error');
        return;
      }

      const tareaPrev: any = { ...detalle };
      const tareaNueva: any = { ...detalle, idEstadoTarea: nuevoEstado };

      this.persistirTarea(tareaNueva, tareaPrev, () => {
        this.actualizandoEstadoId = null;
        Swal.fire({
          title: 'Tarea #' + tareaFila.idTarea + ' movida a ' + nombreEstado,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      }, () => {
        this.actualizandoEstadoId = null;
        Swal.fire('Error', 'No se pudo cambiar el estado de la tarea', 'error');
      });
    }, () => {
      this.actualizandoEstadoId = null;
      Swal.fire('Error', 'No se pudo cargar la tarea', 'error');
    });
  }

  //*************************************************** Crear Tarea ***************************************************

  private cargarResponsables() {
    this._sUsuario.getUsuariobyactivo(true).subscribe(usuarios => {
      this._sVis_UsuarioPersona.getVis_UsuarioPersona().subscribe(usuariosPersona => {
        const idsUsuariosActivos = (usuarios || []).map(u => u.idUsuario);
        const activos = (usuariosPersona || []).filter(up => up && up.idUsuario && idsUsuariosActivos.indexOf(up.idUsuario) !== -1);
        // Sin duplicados por idUsuario (equivale al pipe arrDisting de crear-tarea)
        this.Responsables = activos
          .filter((up, index, self) => index === self.findIndex(x => x.idUsuario === up.idUsuario))
          .sort((a, b) => (`${a.nombre} ${a.paterno}`).localeCompare(`${b.nombre} ${b.paterno}`));
      });
    });
  }

  private nuevaTareaVacia(idEstado: number): any {
    return {
      descripcion: '',
      idResponsable: 0,
      prioridad: '0',
      area: '0',
      idEstado: idEstado || 1
    };
  }

  private quickAddVacio(): any {
    let ultimaArea = '0';
    try {
      ultimaArea = localStorage.getItem('misTareasUltimaArea') || '0';
    } catch (e) { }
    return {
      descripcion: '',
      idResponsable: this.usuario && this.usuario.idUsuario ? +this.usuario.idUsuario : 0,
      prioridad: 'Media',
      area: ultimaArea
    };
  }

  puedeCrearEnGrupo(idEstado: number): boolean {
    return idEstado == 1 || idEstado == 2;
  }

  getNombreResponsable(idUsuario: number): string {
    const r = (this.Responsables || []).find(u => +u.idUsuario === +idUsuario);
    return r ? `${r.nombre || ''} ${r.paterno || ''}`.trim() : '';
  }

  // ---------------- Modal Nueva Tarea ----------------

  abrirModalNuevaTarea(idEstado: number = 1, desdeQuickAdd: boolean = false) {
    this.nuevaTarea = this.nuevaTareaVacia(idEstado);
    this.nuevaCC = [];
    this.nuevaCCBusqueda = '';
    this.nuevaRespBusqueda = '';
    this.fechaRapidaNueva = null;

    if (desdeQuickAdd) {
      this.nuevaTarea.descripcion = this.quickAdd.descripcion || '';
      this.nuevaTarea.idResponsable = +this.quickAdd.idResponsable || 0;
      this.nuevaTarea.prioridad = this.quickAdd.prioridad || '0';
      this.nuevaTarea.area = this.quickAdd.area || '0';
      this.nuevaRespBusqueda = this.getNombreResponsable(this.nuevaTarea.idResponsable);
      this.cancelarQuickAdd();
    }

    this.modalNuevaTarea = true;

    setTimeout(() => {
      try {
        $('#dtpNuevaTarea').datetimepicker({ format: 'DD/MM/YYYY' });
      } catch (e) { }
      const txt = document.getElementById('txtNuevaDescripcion');
      if (txt) txt.focus();
    }, 50);
  }

  cerrarModalNuevaTarea() {
    if (this.creandoTarea) return;
    this.modalNuevaTarea = false;
  }

  getFaltantesNueva(): string[] {
    const t = this.nuevaTarea || {};
    const faltan = [];
    if (!(t.descripcion && t.descripcion.trim().length > 0)) faltan.push('descripción');
    if (!(+t.idResponsable > 0)) faltan.push('responsable');
    if (['Alta', 'Media', 'Baja'].indexOf(t.prioridad) === -1) faltan.push('prioridad');
    if (!t.area || t.area === '0') faltan.push('área');
    return faltan;
  }

  esYo(idUsuario: any): boolean {
    return !!this.usuario && +idUsuario === +this.usuario.idUsuario;
  }

  // Atajos de fecha: Hoy / Mañana / En 1 semana
  setFechaRapidaNueva(dias: number) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    const dd = ('0' + d.getDate()).slice(-2);
    const mm = ('0' + (d.getMonth() + 1)).slice(-2);
    const txt = dd + '/' + mm + '/' + d.getFullYear();
    try {
      const dtp = $('#dtpNuevaTarea').data('DateTimePicker');
      if (dtp && typeof dtp.date === 'function') {
        dtp.date(d);
      }
    } catch (e) { }
    $('#txtCompromisoNueva').val(txt);
    this.fechaRapidaNueva = dias;
  }

  limpiarFechaNueva() {
    try {
      const dtp = $('#dtpNuevaTarea').data('DateTimePicker');
      if (dtp && typeof dtp.clear === 'function') {
        dtp.clear();
      }
    } catch (e) { }
    $('#txtCompromisoNueva').val('');
    this.fechaRapidaNueva = null;
  }

  nuevaTareaValida(): boolean {
    const t = this.nuevaTarea || {};
    return !!(t.descripcion && t.descripcion.trim().length > 0) &&
      +t.idResponsable > 0 &&
      ['Alta', 'Media', 'Baja'].indexOf(t.prioridad) !== -1 &&
      !!t.area && t.area !== '0';
  }

  guardarNuevaTarea() {
    if (!this.nuevaTareaValida() || this.creandoTarea) return;

    let fechaCompromiso = null;
    try {
      const valor = $('#txtCompromisoNueva').val();
      if (valor && valor.toString().trim().length > 0) {
        fechaCompromiso = this._Comunes.ReturnFecha($('#txtCompromisoNueva'));
      }
    } catch (e) { }

    this.crearTarea({
      descripcion: this.nuevaTarea.descripcion,
      idResponsable: +this.nuevaTarea.idResponsable,
      idsCC: this.nuevaCC,
      prioridad: this.nuevaTarea.prioridad,
      area: this.nuevaTarea.area,
      fechaCompromiso: fechaCompromiso,
      idEstado: +this.nuevaTarea.idEstado || 1
    }, () => {
      this.modalNuevaTarea = false;
    });
  }

  // Responsable (buscador tipo crear-tarea)
  getResponsablesFiltradosNueva(): Array<mVis_UsuarioPersona> {
    const texto = (this.nuevaRespBusqueda || '').toLowerCase().trim();
    return (this.Responsables || []).filter(r => {
      if (!r || !r.idUsuario) return false;
      if (!texto) return true;
      const nombre = `${r.nombre || ''} ${r.paterno || ''} ${r.materno || ''}`.toLowerCase();
      return nombre.indexOf(texto) !== -1;
    }).slice(0, 20);
  }

  abrirDropdownRespNueva() {
    this.nuevaRespDropdown = true;
  }

  cerrarDropdownRespNueva() {
    setTimeout(() => { this.nuevaRespDropdown = false; }, 150);
  }

  onRespNuevaChange(valor: string) {
    this.nuevaRespBusqueda = valor;
    this.nuevaRespDropdown = true;
    const seleccionado = this.getNombreResponsable(this.nuevaTarea.idResponsable).toLowerCase();
    const ingresado = (valor || '').toLowerCase().trim();
    if (!ingresado || ingresado !== seleccionado) {
      this.nuevaTarea.idResponsable = 0;
    }
  }

  seleccionarRespNueva(r: mVis_UsuarioPersona) {
    if (!r || !r.idUsuario) return;
    this.nuevaTarea.idResponsable = +r.idUsuario;
    this.nuevaRespBusqueda = this.getNombreResponsable(r.idUsuario);
    this.nuevaRespDropdown = false;
    // Si estaba en CC, sacarlo
    this.nuevaCC = this.nuevaCC.filter(id => +id !== +r.idUsuario);
  }

  asignarmeNueva() {
    const yo = (this.Responsables || []).find(u => +u.idUsuario === +this.usuario.idUsuario);
    if (yo) this.seleccionarRespNueva(yo);
  }

  // CC (máx. 6)
  getUsuariosCCFiltradosNueva(): Array<mVis_UsuarioPersona> {
    const texto = (this.nuevaCCBusqueda || '').toLowerCase().trim();
    const idResp = +this.nuevaTarea.idResponsable || 0;
    return (this.Responsables || []).filter(u => {
      if (!u || !u.idUsuario) return false;
      if (this.nuevaCC.indexOf(+u.idUsuario) !== -1) return false;
      if (idResp > 0 && +u.idUsuario === idResp) return false;
      if (!texto) return true;
      const nombre = `${u.nombre || ''} ${u.paterno || ''} ${u.materno || ''}`.toLowerCase();
      return nombre.indexOf(texto) !== -1;
    }).slice(0, 20);
  }

  abrirDropdownCCNueva() {
    this.nuevaCCDropdown = true;
  }

  cerrarDropdownCCNueva() {
    setTimeout(() => { this.nuevaCCDropdown = false; }, 150);
  }

  agregarCCNueva(idUsuario: number) {
    if (this.nuevaCC.length >= this.maxUsuariosCC) {
      Swal.fire({ icon: 'warning', title: 'Máximo 6 usuarios en CC', text: 'Puedes seleccionar hasta 6 personas en copia.' });
      return;
    }
    if (this.nuevaCC.indexOf(+idUsuario) === -1) {
      this.nuevaCC = this.nuevaCC.concat([+idUsuario]);
    }
    this.nuevaCCBusqueda = '';
    this.nuevaCCDropdown = true;
  }

  removerCCNueva(idUsuario: number) {
    this.nuevaCC = this.nuevaCC.filter(id => +id !== +idUsuario);
  }

  // ---------------- Agregar tarea inline ----------------

  abrirQuickAdd(idEstado: number) {
    this.quickAdd = this.quickAddVacio();
    this.quickAddGrupo = idEstado;
    this.gruposColapsados[idEstado] = false;
    setTimeout(() => {
      const input = document.getElementById('quickadd-input-' + idEstado);
      if (input) input.focus();
    }, 50);
  }

  cancelarQuickAdd() {
    this.quickAddGrupo = null;
  }

  guardarQuickAdd(idEstado: number) {
    if (this.creandoTarea) return;
    const q = this.quickAdd || {};

    const faltantes = [];
    if (!q.descripcion || !q.descripcion.trim()) faltantes.push('descripción');
    if (!(+q.idResponsable > 0)) faltantes.push('responsable');
    if (!q.area || q.area === '0') faltantes.push('área');
    if (['Alta', 'Media', 'Baja'].indexOf(q.prioridad) === -1) faltantes.push('prioridad');

    if (faltantes.length) {
      Swal.fire({
        title: 'Falta: ' + faltantes.join(', '),
        icon: 'warning',
        timer: 2500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
      return;
    }

    this.crearTarea({
      descripcion: q.descripcion,
      idResponsable: +q.idResponsable,
      idsCC: [],
      prioridad: q.prioridad,
      area: q.area,
      fechaCompromiso: null,
      idEstado: idEstado
    }, () => {
      // Deja el input listo para seguir agregando (como ClickUp)
      const area = this.quickAdd.area;
      const prioridad = this.quickAdd.prioridad;
      const idResponsable = this.quickAdd.idResponsable;
      this.quickAdd = this.quickAddVacio();
      this.quickAdd.area = area;
      this.quickAdd.prioridad = prioridad;
      this.quickAdd.idResponsable = idResponsable;
      setTimeout(() => {
        const input = document.getElementById('quickadd-input-' + idEstado);
        if (input) input.focus();
      }, 50);
    });
  }

  // ---------------- Lógica de creación (replica Agregar() de crear-tarea.component) ----------------

  private crearTarea(datos: any, onOk?: (idTarea: number) => void, onError?: () => void) {
    this.creandoTarea = true;

    const tarea: any = new mTarea(null, null, "Tarea pendiente", null, 0, null, null, null, null, 1, new Date().toString(), true, null, this.usuario.idUsuario, null, "0", "0");
    tarea.descripcionTarea = (datos.descripcion || '').trim().replace(/\n/g, '<br>');
    tarea.idUsuarioResponsable = +datos.idResponsable;
    tarea.prioridad = datos.prioridad;
    tarea.area = datos.area;
    tarea.idEstadoTarea = +datos.idEstado || 1;
    tarea.fechaTerminoProgramado = datos.fechaCompromiso || null;

    const idsCC = (datos.idsCC || [])
      .map(id => +id)
      .filter(id => !!id && id > 0)
      .filter((id, index, self) => self.indexOf(id) === index);
    tarea.usuarioCC = idsCC.length > 0 ? idsCC[0] : 0;

    const finalizarError = (e?) => {
      console.log(e);
      this.creandoTarea = false;
      Swal.fire('Error', 'No se pudo crear la tarea', 'error');
      if (onError) onError();
    };

    const req: any = this._sTarea.postAddTarea(tarea);

    req.success(result => {
      const idTareaCreada = result && result.idTarea ? result.idTarea : null;
      const idsCCNotificar = idsCC.filter(id => id !== tarea.idUsuarioResponsable);

      this.crearNotificacionesInternasTarea(tarea, idsCCNotificar, idTareaCreada);
      this.enviarCorreoNuevaTarea(tarea, idsCCNotificar, idTareaCreada);

      try { localStorage.setItem('misTareasUltimaArea', tarea.area); } catch (e) { }

      Swal.fire({
        title: 'Tarea creada' + (idTareaCreada ? ' #' + idTareaCreada : ''),
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });

      // Recargar la grilla (trae nombres de creador/responsable/subproyecto desde el SP)
      this.GetMisTareas(() => {
        this.creandoTarea = false;
        if (idTareaCreada) {
          this.tareaDestacadaLocal = idTareaCreada;
          setTimeout(() => {
            const el = document.getElementById('tarea-local-' + idTareaCreada);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 150);
          setTimeout(() => { this.tareaDestacadaLocal = null; }, 5000);
        }
        if (onOk) onOk(idTareaCreada);
      });
    });

    if (req && req.fail) {
      req.fail(e => finalizarError(e));
    } else if (req && req.error) {
      req.error(e => finalizarError(e));
    }
  }

  private crearNotificacionesInternasTarea(tarea: any, idsCC: Array<number>, idTareaCreada?: number) {
    const linkTarea = idTareaCreada ? `/Ver-Tareas?editarTarea=${idTareaCreada}` : '/Ver-Tareas';
    const titulo = 'Nueva tarea asignada';
    const descripcion = tarea && tarea.descripcionTarea
      ? tarea.descripcionTarea.replace(/<br>/g, ' ')
      : 'Se te ha asignado una nueva tarea.';

    try {
      if (tarea.idUsuarioResponsable && tarea.idUsuarioResponsable > 0) {
        this._notificacionesService.crearNotificacionPersonalizada(
          tarea.idUsuarioResponsable, 'general', titulo, descripcion, 'media', linkTarea
        );
      }

      (idsCC || []).forEach(idUsuarioCC => {
        if (!idUsuarioCC || idUsuarioCC <= 0) return;
        this._notificacionesService.crearNotificacionPersonalizada(
          idUsuarioCC, 'general', `CC en tarea: ${titulo}`, descripcion, 'media', linkTarea
        );
      });
    } catch (e) {
      console.error('Error creando notificaciones internas:', e);
    }
  }

  private enviarCorreoNuevaTarea(tarea: any, idsCC: Array<number>, idTareaCreada?: number) {
    this._sVis_UsuarioPersona.getVis_UsuarioPersona().subscribe(usuariosPersona => {
      const usuarioCreador = (usuariosPersona || []).find(up => up.idUsuario === this.usuario.idUsuario);
      const nombreCreador = usuarioCreador ? `${usuarioCreador.nombre} ${usuarioCreador.paterno}` : 'Usuario';

      this._sUsuario.getUsuariobyID(tarea.idUsuarioResponsable).subscribe(usuarioRes => {
        if (!usuarioRes || !usuarioRes.idPersona) {
          console.warn('No se pudo obtener el responsable para enviar correo');
          return;
        }

        this._sMail.getMailbyidPersona(usuarioRes.idPersona).subscribe(mail => {
          let fechaCumplimiento = '';
          if (tarea.fechaTerminoProgramado) {
            const fecha = new Date(tarea.fechaTerminoProgramado);
            fechaCumplimiento = fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
          }

          const linkTarea = idTareaCreada
            ? `http://proyectos.trazas-nbi.com/Ver-Tareas?editarTarea=${idTareaCreada}`
            : 'http://proyectos.trazas-nbi.com/Ver-Tareas';

          const mensaje = `Estimado, <br>
            <br>
                Informamos que se le ha asignado la siguiente tarea por <b>${nombreCreador}</b>:<br>
                <h3 style="margin-bottom: 0px;"><b>Descripción de la tarea:</b></h3>
                ${tarea.descripcionTarea}<br><br>
                ${fechaCumplimiento ? '<h3 style="margin-bottom: 0px;"><b>Fecha de cumplimiento:</b></h3>' + fechaCumplimiento + '<br><br>' : ''}
                Favor informar avance en el siguiente link:<br>
                <a href='${linkTarea}' target='_blank' style='font-size: 16px; font-weight: bold; color: #007bff;'>Ir a la Tarea</a>
            `;

          const correosResponsable = this.obtenerCorreosActivos(mail);
          if (correosResponsable.length === 0) {
            console.warn('No se encontró correo activo para el responsable de la tarea');
            return;
          }

          if (idsCC && idsCC.length > 0) {
            this.obtenerCorreosCC(idsCC, 0, [], correosCC => {
              this.enviarCorreoTarea(correosResponsable[0], correosCC, mensaje);
            });
          } else {
            this.enviarCorreoTarea(correosResponsable[0], [], mensaje);
          }
        });
      });
    });
  }

  private obtenerCorreosCC(idsCC: Array<number>, index: number, correos: Array<string>, done: (correos: Array<string>) => void) {
    if (!idsCC || index >= idsCC.length) {
      done(correos);
      return;
    }

    this._sUsuario.getUsuariobyID(idsCC[index]).subscribe(usuarioCC => {
      if (usuarioCC && usuarioCC.idPersona) {
        this._sMail.getMailbyidPersona(usuarioCC.idPersona).subscribe(mailCC => {
          const activos = this.obtenerCorreosActivos(mailCC);
          if (activos.length > 0) correos.push(activos[0]);
          this.obtenerCorreosCC(idsCC, index + 1, correos, done);
        }, () => this.obtenerCorreosCC(idsCC, index + 1, correos, done));
      } else {
        this.obtenerCorreosCC(idsCC, index + 1, correos, done);
      }
    }, () => this.obtenerCorreosCC(idsCC, index + 1, correos, done));
  }

  private enviarCorreoTarea(correoResponsable: string, correosCC: Array<string>, mensaje: string) {
    const para = [correoResponsable].concat(correosCC || []).filter(x => !!x);
    const paraUnicos = para.filter((c, i, self) => self.indexOf(c) === i).join(',');

    if (!paraUnicos) {
      console.warn('No hay destinatarios válidos para enviar correo de tarea');
      return;
    }

    const correoEnviar: mCorreo = new mCorreo(paraUnicos, 'Tarea asignada', mensaje);
    this._sCorreo.postCorreo(correoEnviar).subscribe(
      () => { },
      err => { console.error('Error enviando correo de tarea:', err); }
    );
  }

  private obtenerCorreosActivos(mailList: Array<any>): Array<string> {
    const correos = (mailList || [])
      .filter(m => m && m.activo !== false && m.direccionMail && m.direccionMail.toString().trim().length > 0)
      .map(m => m.direccionMail.toString().trim());
    return correos.filter((c, i, self) => self.indexOf(c) === i);
  }

}