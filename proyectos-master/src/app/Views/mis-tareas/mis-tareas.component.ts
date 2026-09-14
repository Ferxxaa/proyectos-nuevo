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
    private route: ActivatedRoute
  ) {
    this.Edit = false;
    this.history = false;
    this.Tarea = new mTarea(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
  }

  ngOnInit() {
    this.LoadingTabla = true;
    this.usuario = JSON.parse(localStorage.usuario);

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
    });

    // Establecer ordenamiento inicial: más recientes primero
    this.sortField = 'fechaCreacion';
    this.sortDirection = 'desc';
    
    this.GetMisTareas();
    this._sEstadoTarea.getEstadoTarea().subscribe(result => {
      this.EstadosTarea = result;
    });

  }

  private GetMisTareas() {
    // Usar el método que obtiene todas las tareas para incluir las del tablero de control
    this.getAllTareas().subscribe(result => {
      // console.log("Tareas Mostrar: ", result);(T.idEstadoTarea = 1) OR (T.idEstadoTarea = 2)
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
      
      // Por defecto mostrar solo tareas activas (Pendiente y En Proceso)
      this.Tareas = this.TareasOriginal.filter(el => el.idEstadoTarea == 1 || el.idEstadoTarea == 2);
      
      // ORDENAR TAREAS: La más reciente arriba (por fecha de creación descendente)
      this.Tareas = this.ordenarTareasPorFechaCreacion(this.Tareas);
      
      console.log('📅 Tareas ordenadas por fecha de creación (más reciente primero):', this.Tareas.length);
      
      this.OcultarPopUpEditar();
      this.LoadingTabla = false;
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
    
    // Guardar en el log si hay cambio de fecha de compromiso, estado o comentarios
    const cambioFecha = this.TareaPrev.fechaTerminoProgramado !== this.Tarea.fechaTerminoProgramado;
    const cambioEstado = this.TareaPrev.idEstadoTarea !== this.Tarea.idEstadoTarea;
    const cambioComentario = this.TareaPrev.observacionTarea !== this.Tarea.observacionTarea;
    
    if (cambioFecha || cambioEstado || cambioComentario) {
      console.log('Guardando en historial - Cambio de fecha:', cambioFecha, 'Cambio de estado:', cambioEstado, 'Cambio de comentario:', cambioComentario);
      
      // Crear objeto logTarea solo con los campos que existen en mLogTarea
      const logTarea: any = {
        idLogTarea: null,
        idTarea: this.Tarea.idTarea,
        idDetalleSubProyecto: this.Tarea.idDetalleSubProyecto,
        nombreTarea: this.Tarea.nombreTarea,
        descripcionTarea: this.Tarea.descripcionTarea,
        idUsuarioResponsable: this.Tarea.idUsuarioResponsable,
        fechaInicioProgramado: this.Tarea.fechaInicioProgramado,
        fechaTerminoProgramado: this.Tarea.fechaTerminoProgramado,
        fechaInicioReal: this.Tarea.fechaInicioReal,
        fechaTerminoReal: this.Tarea.fechaTerminoReal,
        idEstadoTarea: this.Tarea.idEstadoTarea,
        fechaCreacion: this.Tarea.fechaCreacion,
        activo: this.Tarea.activo,
        fechaRemocion: this.Tarea.fechaRemocion,
        idUsuarioCreador: this.Tarea.idUsuarioCreador,
        idUsuarioRemovedor: this.Tarea.idUsuarioRemovedor,
        observacionTarea: this.Tarea.observacionTarea
      };
      
      // Concatenar comentarios con la descripción para guardarlos en el historial
      if (logTarea.observacionTarea && logTarea.observacionTarea.trim() !== '') {
        // Guardar solo el comentario, no la descripción de la tarea
        logTarea.descripcionTarea = logTarea.observacionTarea;
      }
      
      console.log('📝 Objeto logTarea a guardar:', logTarea);
      console.log('📝 descripcionTarea con comentario:', logTarea.descripcionTarea);
      this._sLogTarea.postAddLogTarea(logTarea).success(res => {
        console.log('✅ Respuesta del servidor al guardar log:', res);
      }).fail(err => {
        console.error('❌ Error al guardar log:', err);
      });
    } else {
      console.log('No se guarda en historial - Sin cambios de fecha, estado ni comentarios');
    }
    
    this._sTarea.postUpdDelTarea(this.Tarea).success(result => {
      // console.log(result);
      
      // Actualizar la tarea en TareasOriginal localmente
      const index = this.TareasOriginal.findIndex(t => t.idTarea === this.Tarea.idTarea);
      if (index !== -1) {
        // Actualizar todos los campos de la tarea en TareasOriginal
        this.TareasOriginal[index] = { 
          ...this.TareasOriginal[index], 
          idEstadoTarea: this.Tarea.idEstadoTarea,
          fechaTerminoProgramado: this.Tarea.fechaTerminoProgramado,
          observacionTarea: this.Tarea.observacionTarea,
          fechaInicioReal: this.Tarea.fechaInicioReal,
          fechaTerminoReal: this.Tarea.fechaTerminoReal
        };
        console.log('✅ Tarea actualizada en TareasOriginal (idTarea:', this.Tarea.idTarea, ', nuevo estado:', this.Tarea.idEstadoTarea, ')');
      }
      
      // Guardar tareas terminadas en localStorage para persistencia
      this.guardarTareasTerminadasEnStorage();
      
      // Aplicar filtros para actualizar la vista
      this.aplicarFiltros();
      
      this.OcultarPopUpEditar();
      this.texto = "Tarea actualizada de forma correcta";
      this.msg = true;
    });
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
    //this.ProyectoMatriz = new mProyectoMatriz(0, "", 1, 0, 4, true, null, null, null, null);
    this.IndexUpdate = 0;
    this._PopUps.OcultarPopUpEditar();
    this.Edit = false;
  }

  OcultarPopUpHistorial() {
    //this.ProyectoMatriz = new mProyectoMatriz(0, "", 1, 0, 4, true, null, null, null, null);
    this.IndexUpdate = 0;
    $("#Historial").attr('class', 'modal fade');
    $("#Historial").attr("style", "");
    $("body").attr("style", "");
    this.Edit = false;
  }

  //*************************************************** Funciones desde el HTML ***************************************************

  asignaFechaInicio() {
    this.Tarea.fechaTerminoProgramado = this._Comunes.ReturnFecha($("#txtCompromiso"));
  }

  TraeHistorial(idTarea) {
    $("#Historial").attr('class', 'modal fade in');
    $("#Historial").attr("style", "display: block;background-color:rgba(0, 0, 0, 0.5);overflow-y: scroll;");
    $("body").attr("style", "overflow-y: hidden;");
    this.history = true;
    this.LogTarea = null;
    this._sLogTarea.getLogTareabyidTarea(idTarea).subscribe(result => {
      console.log('📋 Historial completo recibido del backend:', result);
      
      // Filtrar solo los registros que tienen cambios de fecha de compromiso, estado o comentarios
      const registrosFiltrados = [];
      
      for (let i = 0; i < result.length; i++) {
        const registroActual = result[i];
        console.log(`📝 Registro ${i}:`, registroActual);
        console.log(`   - descripcionTarea:`, registroActual.descripcionTarea);
        
        // Primer registro siempre se incluye
        if (i === 0) {
          registrosFiltrados.push(registroActual);
          continue;
        }
        
        const registroAnterior = result[i - 1];
        
        // Verificar si hubo cambio de fecha de compromiso, estado o descripción (que incluye comentarios)
        const cambioFecha = registroActual.fechaTerminoProgramado !== registroAnterior.fechaTerminoProgramado;
        const cambioEstado = registroActual.idEstadoTarea !== registroAnterior.idEstadoTarea;
        const cambioDescripcion = registroActual.descripcionTarea !== registroAnterior.descripcionTarea;
        
        console.log(`   - Cambios: fecha=${cambioFecha}, estado=${cambioEstado}, descripcion=${cambioDescripcion}`);
        
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

  // Nueva función para cargar los usuarios del historial
  cargarUsuariosHistorial(idsUsuarios: number[]) {
    // Obtener todos los usuarios necesarios
    const requests = idsUsuarios.map(id => 
      this._sUsuario.getUsuariobyidUsuario(id).catch(() => Observable.of(null))
    );
    
    Observable.forkJoin(requests).subscribe(usuarios => {
      usuarios.forEach((usuario, index) => {
        if (usuario && usuario.length > 0) {
          this.usuariosMap.set(idsUsuarios[index], usuario[0].nombreUsuario);
        } else if (usuario && !Array.isArray(usuario) && usuario.nombreUsuario) {
          // Si el servicio devuelve un objeto en lugar de un array
          this.usuariosMap.set(idsUsuarios[index], usuario.nombreUsuario);
        }
      });
    });
  }

  // Nueva función para obtener el nombre del usuario por ID
  getNombreUsuario(idUsuario: number): string {
    return this.usuariosMap.get(idUsuario) || 'Usuario desconocido';
  }

  getEstado(idEstado): string {
    // console.log(this.EstadosTarea.filter(element => { return element.idEstadoTarea == idEstado })[0].nombreEstadoTarea)
    return this.EstadosTarea.filter(element => { return element.idEstadoTarea == idEstado })[0].nombreEstadoTarea;
  }

  // New utility methods for enhanced UI
  getTaskCountByStatus(statusId: number): number {
    if (!this.Tareas) return 0;
    return this.Tareas.filter(task => task.idEstadoTarea === statusId).length;
  }

  getOverdueTasks(): number {
    if (!this.Tareas) return 0;
    const today = new Date();
    return this.Tareas.filter(task => {
      // Solo considerar vencidas las tareas que tienen fecha de compromiso
      if (!task.fechaTerminoProgramado) {
        return false; // Sin fecha de compromiso = no vencida (queda como pendiente)
      }
      
      const dueDate = new Date(task.fechaTerminoProgramado);
      // Verificar que la fecha sea válida
      if (isNaN(dueDate.getTime())) {
        return false; // Fecha inválida = no vencida
      }
      
      return dueDate < today && (task.idEstadoTarea === 1 || task.idEstadoTarea === 2);
    }).length;
  }

  isOverdue(fechaTermino: string): boolean {
    // Sin fecha de compromiso = no vencida (automáticamente pendiente)
    if (!fechaTermino) return false;
    
    const today = new Date();
    const dueDate = new Date(fechaTermino);
    
    // Verificar que la fecha sea válida
    if (isNaN(dueDate.getTime())) {
      return false; // Fecha inválida = no vencida
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

  // Método para ordenar tareas por fecha de creación (más reciente primero)
  private ordenarTareasPorFechaCreacion(tareas: any[]): any[] {
    return tareas.sort((a, b) => {
      const fechaA = new Date(a.fechaCreacion).getTime();
      const fechaB = new Date(b.fechaCreacion).getTime();
      return fechaB - fechaA; // Descendente: más reciente primero
    });
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      // Para fechaCreacion, el orden por defecto es descendente (más reciente primero)
      this.sortDirection = field === 'fechaCreacion' ? 'desc' : 'asc';
    }

    this.Tareas.sort((a, b) => {
      let aValue = a[field];
      let bValue = b[field];

      // Handle dates
      if (field.includes('fecha') || field.includes('Fecha')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Handle strings
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
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

  // Método simplificado para obtener todas las tareas usando el servicio existente
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
      // Verificar si el usuario tiene perfil de gerencia (perfil 1: Sub Gerente, perfil 2: Director, perfil 11: Gerente-Admin)
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

  // Método para determinar el tipo de tarea
  getTipoTarea(tarea: any): string {
    const esResponsable = tarea.idUsuarioResponsable == this.usuario.idUsuario;
    const esCreador = tarea.idUsuarioCreador == this.usuario.idUsuario;
    
    if (esResponsable && esCreador) {
      return 'Propia'; // La creé y me la asigné a mí mismo
    } else if (esResponsable) {
      return 'Asignada'; // Me la asignaron
    } else if (esCreador) {
      return 'Creada'; // La creé yo
    } else {
      return 'Todas'; // Solo visible para gerencia
    }
  }

  /*
  RESUMEN DE FUNCIONALIDADES IMPLEMENTADAS:
  
  1. TIPOS DE TAREAS (Badge de colores):
     - 🔵 ASIGNADA (badge-primary): Tarea que me asignaron a mí
     - 🟢 CREADA (badge-success): Tarea que yo creé para otros
     - 🟡 PROPIA (badge-warning): Tarea que yo creé y me asigné a mí mismo
     - 🔷 VISTA GLOBAL (badge-info): Tareas de otros (solo para gerencia)
  
  2. INFORMACIÓN DE USUARIOS:
     - CREADOR (👤+): Quién creó la tarea (UsuarioCreador con icono fa-user-plus)
     - PARA QUIÉN (👤): Para quién es la tarea - el responsable (UsuarioResponsable con badge-secondary)
  
  3. PERMISOS POR ROL:
     - USUARIOS NORMALES: Solo ven tareas donde son responsables O creadores
     - GERENCIA (perfiles 1, 2, 11): Ven TODAS las tareas del sistema
  
  4. INTEGRACIÓN:
     - MIS TAREAS: Muestra todas las tareas del sistema con filtros de permisos
     - TABLERO DE CONTROL: Muestra tareas específicas del proyecto con filtros de permisos
     - NOTIFICACIONES: Cuenta correcta según permisos del usuario
  */

  // Propiedad para controlar qué tarea está destacada en la tabla actual
  tareaDestacadaLocal: number | null = null;

  // Método para manejar el clic en una tarea
  navegarATareaEnProyecto(tarea: any) {
    console.log('🎯 Analizando tarea:', tarea);
    console.log('📍 idDetalleSubProyecto:', tarea.idDetalleSubProyecto);
    
    // Verificar si la tarea pertenece a un subproyecto específico
    if (tarea.idDetalleSubProyecto && tarea.idDetalleSubProyecto !== null) {
      // CASO 1: Tarea DE PROYECTO - Navegar al tablero específico del proyecto
      console.log('🚀 Tarea pertenece a un proyecto. Obteniendo información del subproyecto...');
      
      // Primero obtener el detalle del subproyecto para conseguir el idSubProyecto
      this._sDetalleSubProyecto.getDetalleSubProyectobyidDetalleSubProyecto(tarea.idDetalleSubProyecto)
        .subscribe(
          detalleSubProyecto => {
            console.log('📋 Detalle subproyecto obtenido:', detalleSubProyecto);
            
            if (detalleSubProyecto && detalleSubProyecto.length > 0) {
              const detalle = detalleSubProyecto[0];
              const idSubProyecto = detalle.idSubProyecto;
              
              console.log('🔍 Obteniendo subproyecto con ID:', idSubProyecto);
              
              // Ahora obtener el subproyecto completo
              this._sSubProyecto.getSubProyectobyID(idSubProyecto).subscribe(
                subproyecto => {
                  console.log('✅ Subproyecto obtenido:', subproyecto);
                  
                  // Guardar en localStorage como hace mis-proyectos
                  localStorage.setItem('SubProyecto', JSON.stringify(subproyecto));
                  
                  // Navegar al tablero con parámetros para resaltar la tarea
                  const queryParams = {
                    destacarTarea: tarea.idTarea,
                    tab: 'tareas'
                  };
                  
                  console.log('🎯 Navegando al tablero del proyecto con parámetros:', queryParams);
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
      // CASO 2: Tarea GENERAL - Solo resaltar en la tabla actual
      console.log('📋 Tarea general (sin proyecto). Resaltando en tabla actual...');
      
      // Resaltar la tarea en la tabla actual
      this.tareaDestacadaLocal = tarea.idTarea;
      
      // Hacer scroll hacia la tarea en la tabla actual
      setTimeout(() => {
        const elemento = document.getElementById(`tarea-local-${tarea.idTarea}`);
        if (elemento) {
          console.log('📍 Haciendo scroll hacia tarea general:', tarea.idTarea);
          elemento.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
      
      // Remover el resaltado después de 5 segundos
      setTimeout(() => {
        console.log('✨ Removiendo resaltado de tarea general');
        this.tareaDestacadaLocal = null;
      }, 5000);
      
      // Mostrar mensaje informativo
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

  // Método para verificar si una tarea está destacada localmente
  esTareaDestacadaLocal(tarea: any): boolean {
    return this.tareaDestacadaLocal !== null && tarea.idTarea === this.tareaDestacadaLocal;
  }



  // Método para destacar una tarea cuando viene de parámetro URL
  destacarTareaDesdeParametro(idTarea: number) {
    console.log('🔍 Buscando tarea para destacar:', idTarea);
    
    // Buscar la tarea en la lista actual
    const tarea = this.Tareas.find(t => t.idTarea === idTarea);
    
    if (tarea) {
      console.log('✅ Tarea encontrada:', tarea);
      
      // Verificar si tiene idDetalleSubProyecto
      if (tarea.idDetalleSubProyecto && tarea.idDetalleSubProyecto !== null) {
        console.log('🚀 Tarea pertenece a proyecto. Redirigiendo al tablero...');
        // Si pertenece a un proyecto, redirigir al tablero
        const queryParams = {
          destacarTarea: tarea.idTarea,
          tab: 'tareas'
        };
        this.router.navigate(['/Proyecto-TableroControl'], { queryParams });
      } else {
        console.log('📋 Tarea general. Destacando localmente...');
        // Si es tarea general, destacar localmente
        this.tareaDestacadaLocal = idTarea;
        
        // Hacer scroll hacia la tarea
        setTimeout(() => {
          const elemento = document.getElementById(`tarea-local-${idTarea}`);
          if (elemento) {
            console.log('📍 Haciendo scroll hacia tarea desde parámetro');
            elemento.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }, 100);
        
        // Remover resaltado después de 8 segundos (más tiempo desde notificación)
        setTimeout(() => {
          console.log('✨ Removiendo resaltado de tarea desde parámetro');
          this.tareaDestacadaLocal = null;
        }, 8000);
      }
    } else {
      console.warn('❌ Tarea no encontrada en la lista actual:', idTarea);
    }
  }

  // Método para activar el filtro de pendientes desde el click en la tarjeta
  mostrarPendientes() {
    this.filtroSoloVencidas = false;
    this.estadoFiltro = 1;
    this.aplicarFiltros();
  }

  // Método para activar el filtro de tareas en proceso desde el click en la tarjeta
  mostrarEnProceso() {
    this.filtroSoloVencidas = false;
    this.estadoFiltro = 2;
    this.aplicarFiltros();
  }

  // Método para activar el filtro de tareas vencidas desde el click en la tarjeta
  mostrarVencidas() {
    this.filtroSoloVencidas = true;
    this.estadoFiltro = '0';
    this.aplicarFiltros();
  }

  // Método para activar el filtro de tareas canceladas desde el click en la tarjeta
  mostrarCanceladas() {
    this.filtroSoloVencidas = false;
    this.estadoFiltro = 3;
    this.aplicarFiltros();
  }

  getCantidadCanceladas(): number {
    return this.TareasOriginal.filter(t => t.idEstadoTarea == 3).length;
  }

  // Método para activar el filtro de tareas terminadas desde el click en la tarjeta
  mostrarTerminadas() {
    this.filtroSoloVencidas = false;
    this.estadoFiltro = 5;
    this.aplicarFiltros();
  }

  getCantidadTerminadas(): number {
    if (!this.TareasOriginal) {
      console.log('⚠️ TareasOriginal no está definido');
      return 0;
    }
    const terminadas = this.TareasOriginal.filter(t => t.idEstadoTarea == 5);
    console.log('✅ Tareas terminadas encontradas:', terminadas.length, terminadas.map(t => ({ id: t.idTarea, nombre: t.nombreTarea })));
    return terminadas.length;
  }

  // Método para contar tareas por prioridad
  getTaskCountByPrioridad(prioridad: string): number {
    if (!this.TareasOriginal) return 0;
    return this.TareasOriginal.filter(t => t.prioridad === prioridad).length;
  }

  // Método para filtrar la tabla por prioridad
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

}
