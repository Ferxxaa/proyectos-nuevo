import { Component, OnInit, OnDestroy, Input, ViewEncapsulation, OnChanges, SimpleChanges, NgZone, ElementRef } from '@angular/core';
import { sUsuario } from '../../services/sUsuario.service';
import { sVis_UsuarioPersona } from '../../services/sVis_UsuarioPersona.service';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { sPerfil } from '../../services/sPerfil.service';
import { sMail } from '../../services/sMail.service';
import { firestoreDB, storageRef } from '../../firebase-init';
import * as XlsxPopulate from 'xlsx-populate';
import * as JSZip from 'jszip';
import { PLANTILLAS_ENTREGABLES, GrupoPlantillas, PlantillaDocumento } from './plantillas-entregables.data';

declare var jQuery: any;
declare var $: any;
declare var Swal: any;

type PrioridadBitacora = 'alta' | 'media' | 'baja';
type FiltroBitacora = 'todas' | PrioridadBitacora;

interface NotaBitacora {
  id: string;                    // id local (timestamp) para poder editar/eliminar
  texto: string;
  prioridad: PrioridadBitacora;  // alta = rojo, media = amarillo, baja = verde
  fecha: string;                 // fecha de la nota (YYYY-MM-DD)
  fechaCreacion: string;         // timestamp ISO de creación, informativo
  idUsuarioCreador: number;
  nombreUsuarioCreador: string;
}

interface ArchivoAdjunto {
  nombre: string;
  url: string;
  path: string;
  fechaSubida: string;
}

interface ControlAvanceItem {
  id?: string;
  idControlAvance: number;
  idProyecto: number;
  idSubProyecto: number;        // cada subproyecto tiene su propio control de avance, separado del resto
  esTitulo: boolean;            // true = fila título / agrupador. false = subitem (documento)
  idPadre: string | null;       // id del título padre. null = nivel raíz
  orden: number;                // orden dentro de sus hermanos
  codigo: string;
  tipo: string;
  descripcion: string;
  revisionActual: number;
  estado: string;
  activo: boolean;
  fechaInicioProgramada: string;
  fechaInicioProgramadaManual?: boolean;
  plazoProgramado: number;      // duración en días (como "plazo contrato" del Excel)
  fechaTerminoProgramada: string;
  fechaTerminoProgramadaManual?: boolean;
  avanceProgramado: number;
  fechaInicio: string;
  plazoReal: number;            // duración en días (como "plazo real" del Excel)
  fechaTermino: string;         // calculado = fechaInicio + plazoReal
  avanceReal: number;
  observaciones?: string;       // columna de observaciones, igual que en el Excel
  bitacora: NotaBitacora[];     // notas de bitácora con semáforo de prioridad
  validadoresEstado: { [idUsuario: string]: boolean };
  archivos?: ArchivoAdjunto[];
  idUsuarioCreador: number;
  idUsuarioRemovedor?: number;
  fechaCreacion?: string;
  // Campo transitorio (no se persiste): indica si sus fechas/avance vienen calculados desde sus hijos
  esAgregadoAutomatico?: boolean;
  mostrarFranjaCompleta?: boolean; // solo para títulos nivel 0: el usuario elige pintar la franja completa (tenga o no fecha propia)
  // Solo aplica a títulos: prefijo usado para autonumerar el código de sus láminas (ej: 'ARC' -> ARC-TRZ-01, ARC-TRZ-02...)
  prefijoCodigo?: string;
  // Ids de las actividades predecesoras (dependencia termina → inicia, igual que ClickUp):
  // esta actividad no debería empezar hasta que terminen todas las de esta lista.
  dependencias?: string[];
}

interface FilaTabla {
  item: ControlAvanceItem;
  indexOriginal: number;
  nivel: number;
  tieneHijos: boolean;
  colapsado: boolean;
  numero: string;
}

interface BarraGantt {
  item: ControlAvanceItem;
  indexOriginal: number;
  nivel: number;
  esGrupo: boolean;      // es un título (con o sin hijos)
  esTituloPrincipal: boolean; // título de nivel 0 (para saber si mostrar el checkbox de franja)
  puedeElegirFranja: boolean; // título de nivel 0: siempre puede elegir la franja completa
  esFranjaCompleta: boolean;  // el usuario eligió pintar la franja oscura de ancho completo
  esHito: boolean;       // fecha puntual sin plazo/duración (ej: S/A, DOM, CONS del Excel)
  esHeredado: boolean;   // sin fecha propia: hereda un tramo del plazo de su padre (efecto "escalera")
  offsetHito: number;
  offset: number;        // días desde el inicio del rango hasta el inicio de la barra
  ancho: number;         // duración total de la barra, en días
  anchoRelleno: number;  // parte ya completada de la barra, según % avance real
  clase: string;         // color de estado (verde/amarillo/rojo/sin datos)
  editable: boolean;     // se puede arrastrar/estirar desde la Carta Gantt (no es título con hijos ni franja)
  asignable: boolean;    // no tiene fecha programada propia: un clic en la fila le asigna fecha de inicio
}

interface PeriodoGantt {
  etiqueta: string;
  detalle: string;
  inicioDia: number;
  dias: number;
}

/** Estado interno del arrastre de una barra en la Carta Gantt (mover o estirar). */
interface ArrastreGantt {
  modo: 'mover' | 'estirar';
  barra: BarraGantt;
  filaEl: HTMLElement;     // fila del timeline (su posición se relee en cada movimiento, por si hay scroll)
  scrollEl: HTMLElement | null;  // contenedor con scroll horizontal, para el auto-scroll al llegar al borde
  nombresAncho: number;    // ancho de la columna fija de nombres (zona izquierda del auto-scroll)
  diaInicioMouse: number;  // día (fraccional) bajo el mouse al hacer mousedown
  offsetOriginal: number;
  anchoOriginal: number;
  delta: number;           // días desplazados respecto al inicio del arrastre
  movido: boolean;
}

/** Flecha de dependencia ya calculada, lista para dibujar en el SVG de la Carta Gantt. */
interface FlechaGantt {
  id: string;              // `${idPredecesora}>${idDependiente}`
  idPredecesora: string;
  idDependiente: string;
  d: string;               // trazo de la línea (con codos, como ClickUp)
  punta: string;           // triángulo de la punta de la flecha
  conflicto: boolean;      // la dependiente empieza antes de que termine la predecesora
}

/** Estado mientras se arrastra desde un conector (puntito) para crear una dependencia. */
interface ConexionGantt {
  origen: BarraGantt;
  extremo: 'inicio' | 'fin';   // 'fin' = la otra barra depende de esta; 'inicio' = esta depende de la otra
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  destinoId: string | null;
  scrollEl: HTMLElement | null;
  nombresAncho: number;
}

interface EstadoFechasProgramadasGantt {
  [id: string]: {
    fechaInicioProgramada: string;
    fechaInicioProgramadaManual: boolean;
    fechaTerminoProgramada: string;
    fechaTerminoProgramadaManual: boolean;
    plazoProgramado: number;
    avanceProgramado: number;
  };
}

/** Plantilla creada por el propio usuario desde el modal de Plantillas, con ícono a elección y guardada en Firestore. */
interface GrupoPlantillaPersonalizada extends GrupoPlantillas {
  id?: string;
  icono: string;
  personalizada: true;
}

/** Documento de controlAvanceConfig con el código de recuperación de la clave de edición (solo hash). */
const DOC_RECUPERACION_CLAVE_AVANCE = '_recuperacionClaveEdicion';
/** Credenciales de EmailJS (las mismas que usa Control de Hallazgos). */
const EMAILJS_SERVICE_ID = 'service_s0l9tnp';
const EMAILJS_TEMPLATE_ID = 'template_ud73y7s';
const EMAILJS_PUBLIC_KEY = 'eU69rwXxt1sceIIXr';
const MINUTOS_VIGENCIA_CODIGO = 15;
const MAX_INTENTOS_CODIGO = 5;
const SEGUNDOS_ENTRE_ENVIOS = 60;

@Component({
  selector: 'app-control-avance',
  templateUrl: './control-avance.component.html',
  styleUrls: ['./control-avance.component.css'],
  providers: [sUsuario, sVis_UsuarioPersona, sUsuariosPerfiles, sPerfil, sMail],
  encapsulation: ViewEncapsulation.None
})
export class ControlAvanceComponent implements OnInit, OnChanges, OnDestroy {

  private static readonly DOC_CLAVE_EDICION = '_claveEdicion';
  private static readonly KEY_REPROGRAMAR_DEPENDENCIAS = 'controlAvanceReprogramarDependencias';

  @Input() idProyecto: number;
  @Input() idSubProyecto: number;
  @Input() detalleSeguimiento: any[];
  @Input() soloLectura: boolean = false;
  @Input() nombreProyecto: string = '';
  @Input() nombreMandante: string = '';
  @Input() ocultarTitulo: boolean = false;
  @Input() ocultarFiltros: boolean = false;
  @Input() ocultarExportacion: boolean = false;
  @Input() vistaInicial: 'tabla' | 'gantt' = 'tabla';
  accesoEdicionConClave: boolean = false;

  ControlesAvance: Array<ControlAvanceItem>;

  // Filas jerárquicas listas para renderizar en la tabla (respeta colapsado/indentación)
  filasTabla: FilaTabla[] = [];
  titulosColapsados: { [id: string]: boolean } = {};

  usuario: any;

  Loading: boolean;
  LoadingTabla: boolean;

  IndexEliminar: number;
  ControlAvanceEliminar: ControlAvanceItem;

  filaEnEdicion: number | null = null;
  private copiaEdicion: ControlAvanceItem | null = null;

  subProyectoActual: any = null;
  esGerenciaConfirmado: boolean = false;
  /** Solo el perfil SUB-GERENTE puede recuperar la clave de edición (se detecta por nombre de perfil, igual que en Hallazgos). */
  esSubGerente: boolean = false;
  private idsPerfilesUsuario: number[] = [];
  private idsPerfilesSubGerente: number[] = [];

  avanceTotalProgramado: number = 0;
  avanceTotalReal: number = 0;
  validacionesCompletas: number = 0;
  totalValidaciones: number = 0;

  avanceDocumentosProgramado: number = 0;
  avanceDocumentosReal: number = 0;

  estadosDisponibles = [
    { value: 'VA', label: 'Validado' },
    { value: 'VC', label: 'Validado con comentarios' },
    { value: 'NV', label: 'No Validado' },
    { value: 'P', label: 'Planificado' }
  ];

  tiposDocumento = [
    'ET - Especificación Técnica',
    'MC - Memoria de cálculo',
    'P - Planos',
    'R - Regularización',
    'L - Levantamiento',
    'I - Informe',
    'O - Otros',
  ];

  tiempoGuardado: any = {};
  private tiempoRecalculo: any = null;

  // Vista activa: tabla jerárquica o carta gantt visual
  vistaActiva: 'tabla' | 'gantt' = 'tabla';

  mostrarFormulario: boolean = false;
  nuevoDoc: any = {};
  archivosNuevoDoc: File[] = [];
  subiendoArchivos: { [index: number]: boolean } = {};

  // Contexto del formulario de creación: bajo qué título se está agregando
  idPadreActivo: string | null = null;
  nombrePadreActivo: string = 'Raíz';

  // Si no es null, la próxima lámina se inserta justo después de este valor de "orden"
  // (en vez de agregarse al final), desplazando a sus hermanos posteriores.
  ordenInsercionDespuesDe: number | null = null;

  // true si el usuario editó manualmente el prefijo del formulario de título (deja de autosugerirse)
  private prefijoEditadoManualmente: boolean = false;

  usuariosValidadores: any[] = [];
  validadoresSeleccionados: number[] = [];
  cargandoValidadores: boolean = false;

  tituloDocumento: string = 'CONTROL DE AVANCE GESTIÓN DE PROYECTOS';
  organizacion: string = 'BANCO ESTADO 2026';
  registro: string = 'REG. 10.A-03';
  version: string = 'VERSIÓN 00';
  fechaDocumento: string = this.getFechaActual();
  nombreProyectoLocal: string = '';

  // ---- Bitácora: formulario de nueva nota (una entrada por item abierto) y filtro global ----
  nuevaNotaTexto: { [idItem: string]: string } = {};
  nuevaNotaPrioridad: { [idItem: string]: PrioridadBitacora } = {};
  filtroBitacora: FiltroBitacora = 'todas';

  // ---- Plantillas de entregables (láminas prefabricadas), navegables en un modal ----
  plantillasGrupos: GrupoPlantillas[] = PLANTILLAS_ENTREGABLES;
  plantillasPersonalizadas: GrupoPlantillaPersonalizada[] = [];
  gruposPlantillaExpandido: { [grupo: string]: boolean } = {};
  seleccionPlantillas: { [clave: string]: boolean } = {};
  destinoPlantillaIdPadre: string | null = null;
  filtroPlantillasTexto: string = '';

  // ---- Código exclusivo para el encabezado del Excel: modal aparte, independiente de crear título/lámina ----
  codigoExcelModal: string = '';

  // ---- Creador de plantilla personalizada (con ícono a elección), dentro del mismo modal ----
  mostrarCreadorPlantilla: boolean = false;
  nuevaPlantilla: { nombre: string; icono: string; items: PlantillaDocumento[] } = {
    nombre: '', icono: 'fa-folder-o', items: []
  };
  nuevaPlantillaItemTemp: { codigo: string; descripcion: string; tipoSugerido: string } = {
    codigo: '', descripcion: '', tipoSugerido: ''
  };
  iconosDisponiblesPlantilla: string[] = [
    'fa-folder-o', 'fa-map-o', 'fa-cube', 'fa-building-o', 'fa-calculator', 'fa-bolt',
    'fa-tint', 'fa-thermometer-half', 'fa-wrench', 'fa-cogs', 'fa-road', 'fa-tree',
    'fa-shield', 'fa-lightbulb-o', 'fa-fire', 'fa-recycle', 'fa-truck', 'fa-industry',
    'fa-flask', 'fa-leaf', 'fa-globe', 'fa-cloud', 'fa-database', 'fa-clipboard',
    'fa-file-text-o', 'fa-paint-brush'
  ];

  // Palabras que se ignoran al sugerir un prefijo automático a partir de la descripción de un título
  private readonly STOPWORDS_PREFIJO = [
    'DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'PARA', 'CON', 'Y', 'A', 'EN',
    'PROYECTO', 'PROYECTOS', 'GENERAL', 'ESPECIALIDAD', 'ESPECIALIDADES'
  ];

  // ---- Datos para la vista Carta Gantt ----
  ganttDiasTotales: number = 0;
  ganttPxPorDia: number = 22;
  ganttFechaInicioRango: Date | null = null;
  ganttSemanas: Array<{ etiqueta: string; dias: Array<{ numero: number; fecha: Date }> }> = [];
  ganttPeriodos: PeriodoGantt[] = [];
  ganttEscala: 'normal' | 'semana' | 'mes' = 'semana';
  ganttPxPorUnidad: number = 92;
  ganttFinesDeSemanaOffsets: number[] = [];
  ganttBarras: BarraGantt[] = [];
  ganttHoyOffset: number = -1;

  // ---- Edición directa en la Carta Gantt (estilo ClickUp) ----
  /** Plazo por defecto (días) al asignar fecha con un clic en una fila sin fecha. */
  readonly PLAZO_DEFECTO_GANTT: number = 7;
  /** Días vacíos que se agregan al final de la Carta Gantt para poder mover/estirar barras más allá de la última fecha. */
  readonly GANTT_DIAS_RELLENO: number = 42;
  /** Relleno aplicado en el último cálculo (0 en solo lectura). El Excel lo descuenta. */
  ganttDiasRelleno: number = 0;
  /** Editor rápido de fechas (doble clic en una barra): fecha de inicio y plazo exactos. */
  editorFechasGantt: { barra: BarraGantt; inicio: string; inicioTexto: string; plazo: number; x: number; y: number } | null = null;
  guardandoCambioFechasGantt: boolean = false;
  ultimoCambioFechasGantt: {
    antes: EstadoFechasProgramadasGantt;
    despues: EstadoFechasProgramadasGantt;
  } | null = null;
  /** Id del item cuya descripción se está editando inline en la columna de nombres del Gantt. */
  editandoNombreGanttId: string | null = null;
  private nombreGanttOriginal: string = '';
  /** Id del item cuya barra se está arrastrando (para resaltarla y mostrar el tooltip de fechas). */
  dragGanttId: string | null = null;
  dragGanttEtiqueta: string = '';
  /** Guías verticales que siguen al inicio/fin de la barra mientras se arrastra, con la fecha arriba en el calendario. */
  dragGuiaInicioPx: number | null = null;
  dragGuiaFinPx: number | null = null;
  dragGuiaInicioTxt: string = '';
  dragGuiaFinTxt: string = '';
  private dragGantt: ArrastreGantt | null = null;
  private listenerMouseMoveGantt: any = null;
  private listenerMouseUpGantt: any = null;
  private ignorarClickGantt: boolean = false;

  // ---- Dependencias entre barras (estilo ClickUp) ----
  /** Flechas de dependencia dibujadas sobre el timeline. */
  ganttFlechas: FlechaGantt[] = [];
  /** Alto total del timeline (px), para dimensionar el SVG de las flechas. */
  ganttAltoTimeline: number = 0;
  /** Conexión en curso (arrastrando desde un puntito hacia otra barra). */
  conexionGantt: ConexionGantt | null = null;
  /** Si está activo, al mover una actividad se corren las que dependen de ella (preferencia por navegador). */
  reprogramarDependencias: boolean = true;
  /** Centro vertical (px, relativo al timeline) de cada fila, medido desde el DOM. */
  private ganttFilasY: { [id: string]: number } = {};
  private ganttAltoFila: number = 28;
  private timerFlechasGantt: any = null;
  private listenerMouseMoveConexion: any = null;
  private listenerMouseUpConexion: any = null;

  /** Fila inline para crear un título/lámina directo desde la Carta Gantt (estilo "+ Agregar tarea" de ClickUp). */
  nuevaFilaGantt: {
    despuesDeId: string;           // id de la fila tras la cual se muestra el input ('__final__' = al final de todo)
    idPadre: string | null;        // título donde se crea (null = raíz)
    ordenDespuesDe: number | null; // null = se agrega al final de sus hermanos; número = se inserta justo después
    nivel: number;                 // indentación visual del input
    esTitulo: boolean;
    descripcion: string;
    nombrePadre: string;
  } | null = null;
  private creandoFilaGantt: boolean = false;
  private reenfocandoNuevaFilaGantt: boolean = false;

  private unsubscribeControles: (() => void) | null = null;
  private unsubscribeValidadoresConfig: (() => void) | null = null;
  private unsubscribePlantillasPersonalizadas: (() => void) | null = null;

  constructor(
    private _sUsuario: sUsuario,
    private _sVisUsuarioPersona: sVis_UsuarioPersona,
    private _sUsuariosPerfiles: sUsuariosPerfiles,
    private _sPerfil: sPerfil,
    private _sMail: sMail,
    private _ngZone: NgZone,
    private _elementRef: ElementRef
  ) {
    this.ControlesAvance = new Array<ControlAvanceItem>();
    this.Loading = false;
    this.LoadingTabla = false;
    this.usuario = JSON.parse(localStorage.getItem("usuario") || 'null') || {};
    const subProyecto = JSON.parse(localStorage.getItem('SubProyecto') || 'null');
    this.subProyectoActual = subProyecto;
    this.nombreProyectoLocal = subProyecto && subProyecto.nombreSubProyecto ? subProyecto.nombreSubProyecto : '';
    try {
      this.reprogramarDependencias = localStorage.getItem(ControlAvanceComponent.KEY_REPROGRAMAR_DEPENDENCIAS) !== '0';
    } catch (error) {
      this.reprogramarDependencias = true;
    }
  }

  get nombreProyectoVisible(): string {
    return this.nombreProyecto || this.nombreProyectoLocal || '';
  }

  get puedeEditarAvance(): boolean {
    return !this.soloLectura && this.accesoEdicionConClave;
  }

  get modoSoloLectura(): boolean {
    return !this.puedeEditarAvance;
  }

  async abrirAccesoEdicion() {
    if (this.soloLectura) { return; }
    if (this.accesoEdicionConClave) {
      this.bloquearEdicion();
      return;
    }

    try {
      const config = await this.obtenerConfigClaveEdicion();
      if (!config || !config.clave) {
        const clave = await this.solicitarNuevaClaveEdicion();
        if (!clave) { return; }
        await this.guardarClaveEdicion(clave, !config);
        this.accesoEdicionConClave = true;
        // Las barras pasan a ser editables (conectores, arrastre): se recalcula el Gantt.
        this.actualizarDatosGantt();
        Swal.fire({
          icon: 'success',
          title: config ? 'Clave reemplazada' : 'Clave configurada',
          text: 'La edición quedó habilitada en esta pantalla.',
          timer: 1800,
          showConfirmButton: false
        });
        return;
      }

      const valida = await this.solicitarClaveEdicion(config);
      if (valida) {
        this.accesoEdicionConClave = true;
        this.actualizarDatosGantt();
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo habilitar la edición: ' + this.getMensajeError(error), 'error');
    }
  }

  bloquearEdicion() {
    this.accesoEdicionConClave = false;
    Object.keys(this.tiempoGuardado || {}).forEach(indice => {
      clearTimeout(this.tiempoGuardado[indice]);
    });
    if (this.tiempoRecalculo) {
      clearTimeout(this.tiempoRecalculo);
      this.tiempoRecalculo = null;
    }
    if (this.filaEnEdicion !== null) {
      const item = this.ControlesAvance[this.filaEnEdicion];
      if (item) { this.cancelarEdicion(item, this.filaEnEdicion); }
    }
    if (this.editandoNombreGanttId) {
      const barra = this.ganttBarras.find(item => item.item.id === this.editandoNombreGanttId);
      if (barra) { this.cancelarNombreGantt(barra); }
    }
    this.cancelarConexionGantt();
    this.mostrarFormulario = false;
    this.nuevaFilaGantt = null;
    this.editorFechasGantt = null;
    this.actualizarDatosGantt();
  }

  async cambiarClaveEdicion() {
    if (!this.puedeEditarAvance) { return; }
    try {
      const config = await this.obtenerConfigClaveEdicion();
      if (!config || (config.clave && !(await this.solicitarClaveEdicion(config)))) { return; }
      const nuevaClave = await this.solicitarNuevaClaveEdicion();
      if (!nuevaClave) { return; }
      await this.guardarClaveEdicion(nuevaClave);
      Swal.fire({
        icon: 'success',
        title: 'Clave actualizada',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire('Error', 'No se pudo cambiar la clave: ' + this.getMensajeError(error), 'error');
    }
  }

  private obtenerConfigClaveEdicion(): Promise<any> {
    return firestoreDB.collection('controlAvanceConfig').doc(ControlAvanceComponent.DOC_CLAVE_EDICION)
      .get().then((doc: any) => {
        const data = doc.exists ? doc.data() : null;
        return data && (typeof data.clave === 'string' || (data.hash && data.salt)) ? data : null;
      });
  }

  private async solicitarClaveEdicion(config: any): Promise<boolean> {
    let pidioRecuperar = false;

    const promesa = Swal.fire({
      title: 'Habilitar edición',
      html:
        '<p>Ingresa la clave compartida para modificar el Control de Avance.</p>' +
        this.htmlCampoClave('swal-control-avance-clave', 'Clave', 'current-password') +
        '<div class="ca-clave-recuperar">' +
        '<a href="#" id="swal-control-avance-recuperar" class="ca-clave-recuperar-link">¿Olvidaste la clave?</a>' +
        '</div>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Desbloquear',
      cancelButtonText: 'Cancelar',
      preConfirm: async () => {
        const clave = (document.getElementById('swal-control-avance-clave') as HTMLInputElement).value || '';
        if (typeof config.clave !== 'string') {
          Swal.showValidationMessage('La clave anterior debe reemplazarse. Cierra este cuadro y vuelve a habilitar la edición.');
          return false;
        }
        if (clave !== config.clave) {
          Swal.showValidationMessage('Clave incorrecta');
          return false;
        }
        return true;
      }
    });

    // Se conecta después de abrir (no depende de onOpen/didOpen, que cambian según la versión de SweetAlert)
    setTimeout(() => {
      this.activarOjosClave();
      const link = document.getElementById('swal-control-avance-recuperar');
      if (link) {
        link.addEventListener('click', (e: Event) => {
          e.preventDefault();
          pidioRecuperar = true;
          Swal.close();
        });
      }
    }, 0);

    const resultado = await promesa;

    if (pidioRecuperar) {
      const restablecida = await this.iniciarRecuperacionClave();
      if (!restablecida) { return false; }
      // Con la clave nueva ya guardada, se vuelve a pedir para desbloquear
      const configActual = (await this.obtenerConfigClaveEdicion()) || config;
      return this.solicitarClaveEdicion(configActual);
    }

    return !!(resultado && resultado.value === true);
  }

  // ==========================================================
  // Recuperación de clave por correo (misma lógica que Control de Hallazgos)
  // ==========================================================

  /** Envía un código al correo del sub-gerente y le deja definir una clave nueva. Devuelve true si se restableció. */
  private async iniciarRecuperacionClave(): Promise<boolean> {
    if (!this.esSubGerente) {
      await Swal.fire({
        icon: 'info',
        title: 'Recuperar clave',
        text: 'Solo el Sub-Gerente puede recuperar la clave de edición. Solicítasela a él.',
        confirmButtonText: 'Entendido'
      });
      return false;
    }

    try {
      const correoDestino = await this.obtenerCorreoUsuarioActual();
      if (!correoDestino) {
        await Swal.fire('Sin correo', 'Tu usuario no tiene un correo registrado. Pide que lo agreguen en Usuarios.', 'warning');
        return false;
      }

      const doc = await firestoreDB.collection('controlAvanceConfig').doc(DOC_RECUPERACION_CLAVE_AVANCE).get();
      const data = doc.exists ? doc.data() : null;
      const ahora = Date.now();
      const enviadoHace = data && data.fechaEnvio ? (ahora - new Date(data.fechaEnvio).getTime()) / 1000 : Infinity;
      const vigente = data && data.expira && new Date(data.expira).getTime() > ahora &&
        Number(data.idUsuario) === Number(this.usuario && this.usuario.idUsuario);

      // Si ya hay un código recién enviado, no se reenvía: se va directo a ingresarlo
      if (vigente && enviadoHace < SEGUNDOS_ENTRE_ENVIOS) {
        return this.pedirCodigoYNuevaClave(correoDestino);
      }

      const confirmar = await Swal.fire({
        title: 'Recuperar clave',
        html: 'Te enviaremos un código de verificación a<br><strong>' + this.enmascararCorreo(correoDestino) + '</strong>',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Enviar código',
        cancelButtonText: 'Cancelar'
      });
      if (!confirmar || !confirmar.value) { return false; }

      await this.enviarCodigoRecuperacion(correoDestino);
      return this.pedirCodigoYNuevaClave(correoDestino);
    } catch (error) {
      await Swal.fire('Error', 'No se pudo iniciar la recuperación: ' + this.getMensajeError(error), 'error');
      return false;
    }
  }

  private enviarCodigoRecuperacion(correo: string): Promise<any> {
    const codigo = this.generarCodigoRecuperacion();
    const salt = this.generarSalt();
    const ahora = new Date();
    const expira = new Date(ahora.getTime() + MINUTOS_VIGENCIA_CODIGO * 60000);
    const nombre = this.getNombreUsuarioActual();
    const ref = firestoreDB.collection('controlAvanceConfig').doc(DOC_RECUPERACION_CLAVE_AVANCE);

    return ref.set({
      codigoHash: this.sha256(salt + ':' + codigo),
      salt: salt,
      idUsuario: Number(this.usuario && this.usuario.idUsuario) || null,
      fechaEnvio: ahora.toISOString(),
      expira: expira.toISOString(),
      intentos: 0
    }).then(() => {
      return this.enviarCorreoEmailJS({
        to_email: correo,
        nombre: nombre,
        codigo: codigo,
        minutos: String(MINUTOS_VIGENCIA_CODIGO)
      }).catch((error: any) => {
        // Si el correo no salió, se elimina el código para que pueda pedir otro al tiro
        return ref.delete().then(() => { throw error; }, () => { throw error; });
      });
    });
  }

  /** Envía un correo con la API REST de EmailJS (sin instalar paquetes). */
  private enviarCorreoEmailJS(params: { [clave: string]: string }): Promise<void> {
    if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY.indexOf('TU_') === 0) {
      return Promise.reject(new Error('Falta configurar la Public Key de EmailJS.'));
    }

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.emailjs.com/api/v1.0/email/send', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error('EmailJS respondió ' + xhr.status + ': ' + (xhr.responseText || 'error desconocido')));
        }
      };
      xhr.onerror = () => reject(new Error('No se pudo conectar con el servicio de correo.'));
      xhr.send(JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: params
      }));
    });
  }

  private async pedirCodigoYNuevaClave(correo: string): Promise<boolean> {
    const promesa = Swal.fire({
      title: 'Restablecer clave',
      html:
        '<p style="font-size:13px;margin-bottom:10px">Ingresa el código que enviamos a <strong>' +
        this.enmascararCorreo(correo) + '</strong> y la nueva clave.</p>' +
        '<input id="swal-control-avance-codigo" type="text" class="swal2-input" placeholder="Código del correo" autocomplete="off" style="text-transform:uppercase;letter-spacing:3px">' +
        this.htmlCampoClave('swal-control-avance-nueva-1', 'Nueva clave (mín. 8 caracteres)', 'new-password') +
        this.htmlCampoClave('swal-control-avance-nueva-2', 'Repetir nueva clave', 'new-password'),
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar clave',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        const codigo = ((document.getElementById('swal-control-avance-codigo') as HTMLInputElement).value || '').trim().toUpperCase();
        const c1 = (document.getElementById('swal-control-avance-nueva-1') as HTMLInputElement).value || '';
        const c2 = (document.getElementById('swal-control-avance-nueva-2') as HTMLInputElement).value || '';
        if (!codigo) { Swal.showValidationMessage('Ingresa el código'); return false; }
        if (c1.length < 8) { Swal.showValidationMessage('La clave debe tener al menos 8 caracteres'); return false; }
        if (c1 !== c2) { Swal.showValidationMessage('Las claves no coinciden'); return false; }

        return this.validarCodigoRecuperacion(codigo).then((error: string) => {
          if (error) {
            Swal.showValidationMessage(error);
            return false;
          }
          return c1;
        });
      }
    });

    setTimeout(() => {
      this.activarOjosClave();
      const codigo = document.getElementById('swal-control-avance-codigo') as HTMLInputElement;
      if (codigo) { setTimeout(() => codigo.focus(), 60); }
    }, 0);

    const resultado = await promesa;
    if (!resultado || !resultado.value) { return false; }

    try {
      await this.guardarClaveEdicion(resultado.value);
      await firestoreDB.collection('controlAvanceConfig').doc(DOC_RECUPERACION_CLAVE_AVANCE).delete();
      await Swal.fire({
        icon: 'success',
        title: 'Clave restablecida',
        text: 'Ya puedes usar la nueva clave.',
        timer: 2000,
        showConfirmButton: false
      });
      return true;
    } catch (error) {
      await Swal.fire('Error', 'No se pudo guardar la clave: ' + this.getMensajeError(error), 'error');
      return false;
    }
  }

  /** Devuelve '' si el código es válido, o el mensaje de error. */
  private validarCodigoRecuperacion(codigo: string): Promise<string> {
    const ref = firestoreDB.collection('controlAvanceConfig').doc(DOC_RECUPERACION_CLAVE_AVANCE);
    return ref.get().then((doc: any) => {
      const data = doc.exists ? doc.data() : null;
      if (!data || !data.codigoHash) {
        return 'No hay un código vigente. Solicita uno nuevo.';
      }
      if (Number(data.idUsuario) !== Number(this.usuario && this.usuario.idUsuario)) {
        return 'Este código fue solicitado por otro usuario.';
      }
      if (new Date(data.expira).getTime() < Date.now()) {
        return 'El código venció. Solicita uno nuevo.';
      }
      const intentos = Number(data.intentos) || 0;
      if (intentos >= MAX_INTENTOS_CODIGO) {
        return 'Demasiados intentos. Solicita un código nuevo.';
      }
      if (this.sha256(data.salt + ':' + codigo) !== data.codigoHash) {
        return ref.update({ intentos: intentos + 1 }).then(() =>
          'Código incorrecto (' + (MAX_INTENTOS_CODIGO - intentos - 1) + ' intentos restantes)'
        );
      }
      return '';
    }).catch((error: any) => 'No se pudo validar el código: ' + this.getMensajeError(error));
  }

  /** Obtiene el correo registrado (módulo Usuarios / sMail) de la persona del usuario conectado. */
  private obtenerCorreoUsuarioActual(): Promise<string> {
    const u = this.usuario || {};
    const correoDirecto = u.direccionMail || u.email || u.correo || '';
    const idPersona = Number(u.idPersona);
    if (!idPersona) {
      return Promise.resolve(correoDirecto);
    }

    const servicio: any = this._sMail;
    let llamada: any = null;
    if (typeof servicio.getMailbyidPersona === 'function') {
      llamada = servicio.getMailbyidPersona(idPersona);
    } else if (typeof servicio.getMailbyIdPersona === 'function') {
      llamada = servicio.getMailbyIdPersona(idPersona);
    } else if (typeof servicio.getMail === 'function') {
      llamada = servicio.getMail();
    }
    if (!llamada) {
      return Promise.resolve(correoDirecto);
    }

    return this.aPromesa(llamada).then((res: any) => {
      const lista: any[] = Array.isArray(res) ? res : (res ? [res] : []);
      const delUsuario = lista.filter((m: any) =>
        m && Number(m.idPersona) === idPersona && m.activo !== false && !m.fechaRemocion && m.direccionMail
      );
      return delUsuario.length ? String(delUsuario[delUsuario.length - 1].direccionMail).trim() : correoDirecto;
    }).catch(() => correoDirecto);
  }

  /** Convierte un Observable, Promise o jqXHR en Promise. */
  private aPromesa(valor: any): Promise<any> {
    if (valor && typeof valor.subscribe === 'function') {
      return new Promise((resolve, reject) => {
        const sub = valor.subscribe((r: any) => { resolve(r); setTimeout(() => sub && sub.unsubscribe && sub.unsubscribe()); }, reject);
      });
    }
    if (valor && typeof valor.then === 'function') {
      return new Promise((resolve, reject) => valor.then(resolve, reject));
    }
    return Promise.resolve(valor);
  }

  private generarCodigoRecuperacion(): string {
    // Sin caracteres confusos (0/O, 1/I/L)
    const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(8);
    const c: any = (window as any).crypto || (window as any).msCrypto;
    if (c && c.getRandomValues) {
      c.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) { bytes[i] = Math.floor(Math.random() * 256); }
    }
    let codigo = '';
    for (let i = 0; i < bytes.length; i++) { codigo += alfabeto.charAt(bytes[i] % alfabeto.length); }
    return codigo;
  }

  private enmascararCorreo(correo: string): string {
    const partes = (correo || '').split('@');
    if (partes.length !== 2) { return this.escaparHtml(correo); }
    const nombre = partes[0];
    const visible = nombre.length <= 2 ? nombre.charAt(0) : nombre.substring(0, 2);
    return this.escaparHtml(visible + '***@' + partes[1]);
  }

  private escaparHtml(texto: string): string {
    return (texto || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private getNombreUsuarioActual(): string {
    const u = this.usuario || {};
    return u.nombreUsuario || u.nombre || u.usuario || u.email || '';
  }

  private generarSalt(): string {
    const bytes = new Uint8Array(16);
    const c: any = (window as any).crypto || (window as any).msCrypto;
    if (c && c.getRandomValues) {
      c.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) { bytes[i] = Math.floor(Math.random() * 256); }
    }
    let hex = '';
    for (let i = 0; i < bytes.length; i++) { hex += ('0' + bytes[i].toString(16)).slice(-2); }
    return hex;
  }

  /** SHA-256 síncrono (UTF-8) — sin dependencias, compatible con navegadores antiguos. */
  private sha256(texto: string): string {
    const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    // Codificación UTF-8 manual (sin unescape/TextEncoder)
    const b: number[] = [];
    for (let i = 0; i < texto.length; i++) {
      let cp = texto.charCodeAt(i);
      if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < texto.length) {
        const lo = texto.charCodeAt(i + 1);
        if (lo >= 0xdc00 && lo <= 0xdfff) {
          cp = 0x10000 + ((cp - 0xd800) << 10) + (lo - 0xdc00);
          i++;
        }
      }
      if (cp < 0x80) {
        b.push(cp);
      } else if (cp < 0x800) {
        b.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
      } else if (cp < 0x10000) {
        b.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      } else {
        b.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      }
    }
    const bitLen = b.length * 8;
    b.push(0x80);
    while (b.length % 64 !== 56) { b.push(0); }
    const high = Math.floor(bitLen / 0x100000000);
    for (let i = 3; i >= 0; i--) { b.push((high >>> (i * 8)) & 0xff); }
    for (let i = 3; i >= 0; i--) { b.push((bitLen >>> (i * 8)) & 0xff); }

    const w = new Array(64);
    for (let o = 0; o < b.length; o += 64) {
      for (let t = 0; t < 16; t++) {
        w[t] = (b[o + t * 4] << 24) | (b[o + t * 4 + 1] << 16) | (b[o + t * 4 + 2] << 8) | b[o + t * 4 + 3];
      }
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      let a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[t] + w[t]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const mj = (a & bb) ^ (a & c) ^ (bb & c);
        const t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map((x: number) => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
  }

  private async solicitarNuevaClaveEdicion(): Promise<string | null> {
    const promesa = Swal.fire({
      title: 'Configurar clave de edición',
      html:
        '<p>Define la clave compartida para editar todos los controles de avance.</p>' +
        this.htmlCampoClave('swal-control-avance-clave-1', 'Clave (mín. 8 caracteres)', 'new-password') +
        this.htmlCampoClave('swal-control-avance-clave-2', 'Repetir clave', 'new-password'),
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar clave',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const primera = (document.getElementById('swal-control-avance-clave-1') as HTMLInputElement).value || '';
        const segunda = (document.getElementById('swal-control-avance-clave-2') as HTMLInputElement).value || '';
        if (primera.length < 8) {
          Swal.showValidationMessage('La clave debe tener al menos 8 caracteres');
          return false;
        }
        if (primera !== segunda) {
          Swal.showValidationMessage('Las claves no coinciden');
          return false;
        }
        return primera;
      }
    });
    setTimeout(() => this.activarOjosClave(), 0);
    const resultado = await promesa;
    return resultado && resultado.value ? resultado.value : null;
  }

  // Campo de clave con botón "ojito" para mostrar/ocultar lo escrito
  private htmlCampoClave(id: string, placeholder: string, autocomplete: string): string {
    return '<div class="ca-clave-wrap">' +
      '<input id="' + id + '" type="password" class="swal2-input ca-clave-input" placeholder="' + placeholder + '"' +
      ' autocomplete="' + autocomplete + '" autocapitalize="off" autocorrect="off" spellcheck="false">' +
      '<button type="button" class="ca-clave-ojo" data-target="' + id + '" title="Mostrar clave" aria-label="Mostrar clave">' +
      '<i class="fa fa-eye"></i></button>' +
      '</div>';
  }

  private activarOjosClave(): void {
    const popup: HTMLElement = (Swal.getPopup && Swal.getPopup()) || document.body;
    const botones = popup.querySelectorAll('.ca-clave-ojo');

    Array.prototype.forEach.call(botones, (btn: HTMLButtonElement) => {
      if (btn.getAttribute('data-listo') === '1') { return; }
      btn.setAttribute('data-listo', '1');

      const input = document.getElementById(btn.getAttribute('data-target')) as HTMLInputElement;
      if (!input) { return; }

      // Evita que el botón le quite el foco al input
      btn.addEventListener('mousedown', (e: Event) => e.preventDefault());

      btn.addEventListener('click', () => {
        const mostrar = input.type === 'password';
        input.type = mostrar ? 'text' : 'password';
        const icono = btn.querySelector('i');
        if (icono) { icono.className = mostrar ? 'fa fa-eye-slash' : 'fa fa-eye'; }
        const titulo = mostrar ? 'Ocultar clave' : 'Mostrar clave';
        btn.title = titulo;
        btn.setAttribute('aria-label', titulo);
        if (mostrar) { btn.classList.add('activo'); } else { btn.classList.remove('activo'); }
        input.focus();
        try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) { }
      });

      // Enter confirma, igual que el input nativo de SweetAlert
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          Swal.clickConfirm();
        }
      });
    });

    const primero = popup.querySelector('.ca-clave-input:not([readonly])') as HTMLInputElement;
    if (primero) { setTimeout(() => primero.focus(), 50); }
  }

  private async guardarClaveEdicion(clave: string, soloSiNoExiste: boolean = false): Promise<void> {
    const referencia = firestoreDB.collection('controlAvanceConfig').doc(ControlAvanceComponent.DOC_CLAVE_EDICION);
    const datos = {
      clave,
      fechaActualizacion: new Date().toISOString()
    };
    await firestoreDB.runTransaction((transaccion: any) => transaccion.get(referencia).then((doc: any) => {
      if (soloSiNoExiste && doc.exists) {
        throw new Error('La clave ya fue configurada en otro control. Intenta ingresar con la clave vigente.');
      }
      transaccion.set(referencia, datos);
    }));
  }

  private getMensajeError(error: any): string {
    return error && error.message ? error.message : String(error);
  }

  guardarCodigoSubProyectoParaExcel(codigo: string) {
    if (!this.puedeEditarAvance) { return; }
    if (!this.subProyectoActual) {
      this.subProyectoActual = {};
    }
    this.subProyectoActual.codigo = (codigo || '').trim();
    try {
      localStorage.setItem('SubProyecto', JSON.stringify(this.subProyectoActual));
    } catch (error) {
      console.warn('No se pudo persistir el código del subproyecto en localStorage:', error);
    }
  }

  /** Abre el modal aparte para configurar el código del Excel, sin pasar por crear un título/lámina. */
  abrirModalCodigoExcel() {
    if (!this.puedeEditarAvance) { return; }
    this.codigoExcelModal = (this.subProyectoActual && this.subProyectoActual.codigo) || '';

    if (typeof $ !== 'undefined') {
      $('.modal').modal('hide');
      $('.modal-backdrop').remove();
      $('body').removeClass('modal-open').css('padding-right', '');

      setTimeout(() => {
        const $modal = $('#ModalCodigoExcel');
        if ($modal.length) {
          if (!$modal.parent().is('body')) {
            $modal.appendTo('body');
          }
          $modal.modal({ backdrop: true, keyboard: true, focus: true, show: true });
        }
      }, 100);
    }
  }

  guardarCodigoExcelModal() {
    if (!this.puedeEditarAvance) { return; }
    const codigo = (this.codigoExcelModal || '').trim();
    if (!codigo) {
      Swal.fire('Falta el código', 'Escribe un código antes de guardar.', 'info');
      return;
    }
    this.guardarCodigoSubProyectoParaExcel(codigo);

    if (typeof $ !== 'undefined') {
      $('#ModalCodigoExcel').modal('hide');
    }

    Swal.fire({
      icon: 'success',
      title: 'Código guardado',
      text: 'Se guardó el código para el encabezado del Excel.',
      timer: 1500,
      showConfirmButton: false
    });
  }

  getFechaActual(): string {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  ngOnInit() {
    this.vistaActiva = this.vistaInicial;
    this.cargarUsuariosValidadores();
    this.cargarValidadoresSeleccionados();
    this.suscribirControlesAvance();
    this.suscribirPlantillasPersonalizadas();
    this.cargarPermisoGerencia();

    if (this.detalleSeguimiento && this.detalleSeguimiento.length > 0) {
      this.calcularAvancesYValidaciones();
    }
  }

  private cargarPermisoGerencia() {
    if (!this.usuario || !this.usuario.idUsuario) {
      this.esGerenciaConfirmado = false;
      this.idsPerfilesUsuario = [];
      this.actualizarEsSubGerente();
      return;
    }

    const idUsuarioActual = Number(this.usuario.idUsuario);
    this._sUsuariosPerfiles.getUsuariosPerfilesbyidUsuario(idUsuarioActual).subscribe(
      (perfiles: any) => {
        const listaPerfiles = Array.isArray(perfiles) ? perfiles : [];
        this.esGerenciaConfirmado = listaPerfiles.some((perfil: any) =>
          perfil.idPerfil == 1 || perfil.idPerfil == 2 || perfil.idPerfil == 11
        );
        this.idsPerfilesUsuario = listaPerfiles
          .filter((perfil: any) => perfil.activo !== false && !perfil.fechaRemocion)
          .map((perfil: any) => Number(perfil.idPerfil));
        this.actualizarEsSubGerente();
      },
      () => {
        this.esGerenciaConfirmado = false;
        this.idsPerfilesUsuario = [];
        this.actualizarEsSubGerente();
      }
    );

    // Se busca el perfil SUB-GERENTE por nombre (no por id fijo) en el maestro de perfiles
    this._sPerfil.getPerfil().subscribe(
      (perfiles: any) => {
        const lista = Array.isArray(perfiles) ? perfiles : [];
        this.idsPerfilesSubGerente = lista
          .filter((perfil: any) => this.esNombrePerfilSubGerente(perfil.nombrePerfil))
          .map((perfil: any) => Number(perfil.idPerfil));
        this.actualizarEsSubGerente();
      },
      () => {
        this.idsPerfilesSubGerente = [];
        this.actualizarEsSubGerente();
      }
    );
  }

  private esNombrePerfilSubGerente(nombre: string): boolean {
    // "SUB-GERENTE", "Sub Gerente", "Subgerente", "SUB_GERENTE"...
    const limpio = this.normalizarTextoClave(nombre).replace(/[^A-Z]/g, '');
    return limpio === 'SUBGERENTE' || limpio.indexOf('SUBGERENTE') === 0;
  }

  private actualizarEsSubGerente() {
    this.esSubGerente = this.idsPerfilesUsuario.some((id: number) => this.idsPerfilesSubGerente.indexOf(id) >= 0);
  }

  private normalizarTextoClave(texto: string): string {
    let t = (texto || '').toString();
    try { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { }
    return t.trim().toUpperCase();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.vistaInicial && this.vistaInicial) {
      this.vistaActiva = this.vistaInicial;
    }
    if (changes.detalleSeguimiento && this.detalleSeguimiento) {
      this.calcularAvancesYValidaciones();
    }
    const cambioIdProyecto = changes.idProyecto;
    const esPrimerCambioIdProyecto = cambioIdProyecto ? cambioIdProyecto.firstChange : false;
    if ((changes.idProyecto || changes.idSubProyecto) && !esPrimerCambioIdProyecto) {
      this.suscribirControlesAvance();
      this.suscribirPlantillasPersonalizadas();
      this.cargarValidadoresSeleccionados();
    }
  }

  ngOnDestroy() {
    if (this.unsubscribeControles) {
      this.unsubscribeControles();
    }
    if (this.unsubscribeValidadoresConfig) {
      this.unsubscribeValidadoresConfig();
    }
    if (this.unsubscribePlantillasPersonalizadas) {
      this.unsubscribePlantillasPersonalizadas();
    }
    if (this.tiempoRecalculo) {
      clearTimeout(this.tiempoRecalculo);
    }
    if (this.timerFlechasGantt) {
      clearTimeout(this.timerFlechasGantt);
    }
    this.quitarListenersArrastreGantt();
    this.quitarListenersConexionGantt();
  }

  calcularAvancesYValidaciones() {
    if (!this.detalleSeguimiento || this.detalleSeguimiento.length === 0) {
      this.avanceTotalProgramado = 0;
      this.avanceTotalReal = 0;
      this.validacionesCompletas = 0;
      this.totalValidaciones = 0;
      return;
    }

    const etapasPrincipales = this.detalleSeguimiento.filter(d =>
      [1, 3, 5, 7, 9, 10, 12, 13, 15, 16, 17].includes(d.idEtapa)
    );

    if (etapasPrincipales.length === 0) {
      this.avanceTotalProgramado = 0;
      this.avanceTotalReal = 0;
      this.validacionesCompletas = 0;
      this.totalValidaciones = 0;
      return;
    }

    let fechaInicio = new Date();
    try {
      const subProyecto = JSON.parse(localStorage.getItem('SubProyecto'));
      if (subProyecto && subProyecto.fechaInicio) {
        fechaInicio = new Date(subProyecto.fechaInicio);
      }
    } catch (e) {
      console.error('Error al obtener fecha de inicio:', e);
    }

    const hoy = new Date();
    let duracionTotal = 0;
    let duracionTranscurrida = 0;

    etapasPrincipales.forEach(etapa => {
      duracionTotal += etapa.duracion || 0;
    });

    const diasTranscurridos = Math.floor((hoy.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
    duracionTranscurrida = Math.min(diasTranscurridos, duracionTotal);

    this.avanceTotalProgramado = duracionTotal > 0
      ? Math.min(Math.round((duracionTranscurrida / duracionTotal) * 100), 100)
      : 0;

    this.avanceTotalReal = etapasPrincipales.reduce((total, etapa) => {
      return total + ((etapa.avanceReal || 0) * (etapa.ponderado || 0) / 100);
    }, 0);

    this.avanceTotalReal = Math.round(this.avanceTotalReal);

    this.validacionesCompletas = etapasPrincipales.filter(e => e.vistoBuenoEtapa === true).length;
    this.totalValidaciones = etapasPrincipales.length;
  }

  private getIdProyectoActual(): number {
    return this.idProyecto || 0;
  }

  /** Cada subproyecto tiene su propio control de avance, independiente de otros subproyectos del mismo proyecto. */
  private getIdSubProyectoActual(): number {
    if (this.idSubProyecto) { return this.idSubProyecto; }
    return (this.subProyectoActual && this.subProyectoActual.idSubProyecto) || 0;
  }

  private getIdConfigValidadores(): string {
    return `${this.idProyecto || 'sin-proyecto'}_${this.getIdSubProyectoActual() || 'sin-subproyecto'}`;
  }

  private suscribirControlesAvance() {
    this.LoadingTabla = true;

    if (this.unsubscribeControles) {
      this.unsubscribeControles();
    }

    this.unsubscribeControles = firestoreDB.collection('controlAvance')
      .where('idProyecto', '==', this.getIdProyectoActual())
      .where('idSubProyecto', '==', this.getIdSubProyectoActual())
      .onSnapshot((snapshot: any) => {
        // El SDK de Firestore corre fuera de NgZone; forzamos la detección de cambios al entrar.
        this._ngZone.run(() => {
          try {
            const items: ControlAvanceItem[] = [];
            snapshot.forEach((doc: any) => {
              const data = doc.data();
              if (data.activo !== false) {
                items.push({ id: doc.id, ...data } as ControlAvanceItem);
              }
            });
            this.ControlesAvance = items;
            this.migrarDatosAntiguos();
            this.asegurarBitacora();
            this.ControlesAvance.forEach(item => this.normalizarValidadoresEstado(item));
            this.recalcularEstadoValidacion(false);
            this.recalcularJerarquiaYAgregados();
            this.calcularTotalesDocumentos();
            this.actualizarDatosGantt();
          } catch (error) {
            // Evita que un dato mal formado deje el spinner "LoadingTabla" pegado para siempre.
            console.error('Error al procesar controles de avance:', error);
          } finally {
            this.LoadingTabla = false;
          }
        });
      }, (error: any) => {
        this._ngZone.run(() => {
          console.error('Error al cargar controles de avance desde Firestore:', error);
          this.LoadingTabla = false;
        });
      });
  }

  /**
   * Compatibilidad con documentos creados antes de existir la jerarquía título/subitem:
   * se dejan como items de nivel raíz (no títulos) para no perder datos existentes.
   */
  private migrarDatosAntiguos() {
    this.ControlesAvance.forEach((item, index) => {
      if (item.esTitulo === undefined || item.esTitulo === null) {
        item.esTitulo = false;
      }
      if (item.idPadre === undefined) {
        item.idPadre = null;
      }
      if (item.orden === undefined || item.orden === null) {
        item.orden = index;
      }
      if (item.plazoProgramado === undefined || item.plazoProgramado === null) {
        item.plazoProgramado = item.fechaInicioProgramada && item.fechaTerminoProgramada
          ? this.diasEntreFechasISO(item.fechaInicioProgramada, item.fechaTerminoProgramada)
          : 0;
      }
      if (item.plazoReal === undefined || item.plazoReal === null) {
        item.plazoReal = item.fechaInicio && item.fechaTermino
          ? this.diasEntreFechasISO(item.fechaInicio, item.fechaTermino)
          : 0;
      }
      if (item.observaciones === undefined || item.observaciones === null) {
        item.observaciones = '';
      }
      if (item.esTitulo && (item.prefijoCodigo === undefined || item.prefijoCodigo === null)) {
        item.prefijoCodigo = '';
      }
      if (!Array.isArray(item.dependencias)) {
        item.dependencias = [];
      }
    });
  }

  /** Reemplaza al antiguo asegurarFlujos(): garantiza que cada item tenga su arreglo de bitácora. */
  asegurarBitacora() {
    this.ControlesAvance.forEach(item => {
      if (!item.bitacora || !Array.isArray(item.bitacora)) {
        item.bitacora = [];
      }
    });
  }

  calcularTotalesDocumentos() {
    // El resumen general sólo considera documentos (subitems), no los títulos agrupadores,
    // porque el avance de un título ya es el promedio de sus documentos.
    const documentosActivos = this.ControlesAvance.filter(doc => doc.activo !== false && !doc.esTitulo);

    if (documentosActivos.length === 0) {
      this.avanceDocumentosProgramado = 0;
      this.avanceDocumentosReal = 0;
      return;
    }

    const sumaAvanceProgramado = documentosActivos.reduce((sum, doc) => {
      return sum + (doc.avanceProgramado || 0);
    }, 0);
    this.avanceDocumentosProgramado = Math.min(100, Math.round(sumaAvanceProgramado / documentosActivos.length));

    const sumaAvanceReal = documentosActivos.reduce((sum, doc) => {
      if (doc.estado === 'VA' || doc.estado === 'VC') {
        return sum + 100;
      }
      return sum + (doc.avanceReal || 0);
    }, 0);
    this.avanceDocumentosReal = Math.round(sumaAvanceReal / documentosActivos.length);
  }

  // =========================================================================
  // JERARQUÍA: TÍTULOS Y SUBITEMS
  // =========================================================================

  private claveJerarquia(id: any): string {
    return id === null || id === undefined || id === '' ? 'raiz' : String(id);
  }

  private agruparPorPadre(): { [clave: string]: ControlAvanceItem[] } {
    const mapa: { [clave: string]: ControlAvanceItem[] } = {};
    this.ControlesAvance.forEach(it => {
      const clave = this.claveJerarquia(it.idPadre);
      if (!mapa[clave]) { mapa[clave] = []; }
      mapa[clave].push(it);
    });
    Object.keys(mapa).forEach(k => mapa[k].sort((a, b) => (a.orden || 0) - (b.orden || 0)));
    return mapa;
  }

  /**
   * Recalcula, de abajo hacia arriba, las fechas y el % de avance de cada título
   * en base a sus hijos directos (que a su vez ya vienen calculados si son sub-títulos).
   * También arma `filasTabla`, la lista aplanada que usa la tabla para pintar con indentación.
   */
  private obtenerRangoDesdeHijos(item: ControlAvanceItem, hijosPorPadre: { [clave: string]: ControlAvanceItem[] }, campoInicio: 'fechaInicioProgramada' | 'fechaInicio', campoFin: 'fechaTerminoProgramada' | 'fechaTermino'): { inicio: string; fin: string } {
    const fechasInicio: string[] = [];
    const fechasFin: string[] = [];

    const collect = (actual: ControlAvanceItem) => {
      const hijos = hijosPorPadre[actual.id] || [];

      if (!actual.esTitulo) {
        if (actual[campoInicio]) {
          fechasInicio.push(actual[campoInicio]);
        }
        if (actual[campoFin]) {
          fechasFin.push(actual[campoFin]);
        }
      }

      hijos.forEach(hijo => collect(hijo));
    };

    collect(item);

    const inicio = fechasInicio.sort()[0] || '';
    const fin = fechasFin.sort().slice(-1)[0] || '';

    if (!inicio || !fin) {
      return { inicio: '', fin: '' };
    }

    return { inicio, fin };
  }

  private sincronizarPlazoDesdeFechas(item: ControlAvanceItem): void {
    if (item.esTitulo || !item.fechaInicioProgramada || !item.fechaTerminoProgramada) {
      return;
    }

    const plazo = this.diasEntreFechasISO(item.fechaInicioProgramada, item.fechaTerminoProgramada);
    if (plazo > 0) {
      item.plazoProgramado = plazo;
    }
  }

  private obtenerPlazoProgramadoDesdeHijos(item: ControlAvanceItem, hijosPorPadre: { [clave: string]: ControlAvanceItem[] }): number {
    const hijos = hijosPorPadre[this.claveJerarquia(item.id)] || [];
    if (hijos.length === 0) {
      return Number(item.plazoProgramado || 0);
    }

    return hijos.reduce((total, hijo) => {
      if (hijo.esTitulo) {
        return total + this.obtenerPlazoProgramadoDesdeHijos(hijo, hijosPorPadre);
      }

      let plazo = Number(hijo.plazoProgramado || 0);
      if (plazo <= 0 && hijo.fechaInicioProgramada && hijo.fechaTerminoProgramada) {
        plazo = this.diasEntreFechasISO(hijo.fechaInicioProgramada, hijo.fechaTerminoProgramada);
      }

      return total + Math.max(0, plazo);
    }, 0);
  }

  recalcularJerarquiaYAgregados() {
    const hijosPorPadre = this.agruparPorPadre();

    const calcular = (item: ControlAvanceItem): void => {
      const hijos = hijosPorPadre[this.claveJerarquia(item.id)] || [];

      if (!item.esTitulo) {
        this.sincronizarPlazoDesdeFechas(item);
      }

      if (item.esTitulo && hijos.length > 0) {
        calcularGrupo(hijos);

        const rangoProgramado = this.obtenerRangoDesdeHijos(item, hijosPorPadre, 'fechaInicioProgramada', 'fechaTerminoProgramada');
        if (rangoProgramado.inicio) {
          item.fechaInicioProgramada = rangoProgramado.inicio;
        }
        if (rangoProgramado.fin) {
          item.fechaTerminoProgramada = rangoProgramado.fin;
        }

        // El plazo del título se calcula como suma acumulada de los plazos de sus hijos.
        item.plazoProgramado = this.obtenerPlazoProgramadoDesdeHijos(item, hijosPorPadre);

        const rangoReal = this.obtenerRangoDesdeHijos(item, hijosPorPadre, 'fechaInicio', 'fechaTermino');
        if (rangoReal.inicio) {
          item.fechaInicio = rangoReal.inicio;
        }
        if (rangoReal.fin) {
          item.fechaTermino = rangoReal.fin;
        }
        item.plazoReal = (rangoReal.inicio && rangoReal.fin)
          ? this.diasEntreFechasISO(rangoReal.inicio, rangoReal.fin)
          : (item.plazoReal || 0);

        const sumaProg = hijos.reduce((s, h) => s + (Number(h.avanceProgramado) || 0), 0);
        item.avanceProgramado = Math.round(sumaProg / hijos.length);
        const sumaReal = hijos.reduce((s, h) => s + (Number(h.avanceReal) || 0), 0);
        item.avanceReal = Math.round(sumaReal / hijos.length);
        item.esAgregadoAutomatico = true;
      } else {
        this.recalcularFechasDesdePlazo(item);
        this.calcularAvanceProgramado(item);
        item.esAgregadoAutomatico = false;
      }
    };

    const calcularGrupo = (items: ControlAvanceItem[]): void => {
      let fechaTerminoAnterior = '';

      items.forEach(item => {
        if (!item.esTitulo && fechaTerminoAnterior && !item.fechaInicioProgramadaManual) {
          item.fechaInicioProgramada = fechaTerminoAnterior;
        }

        calcular(item);

        if (!item.esTitulo) {
          fechaTerminoAnterior = item.fechaTerminoProgramada || '';
        }
      });
    };

    const raices = hijosPorPadre[this.claveJerarquia(null)] || [];
    calcularGrupo(raices);

    this.reconstruirFilasTabla(hijosPorPadre, raices);
  }

  private reconstruirFilasTabla(hijosPorPadre: { [clave: string]: ControlAvanceItem[] }, raices: ControlAvanceItem[]) {
    const resultado: FilaTabla[] = [];

    const recorrer = (items: ControlAvanceItem[], nivel: number, prefijoNumero: string) => {
      items.forEach((it, indice) => {
        const numero = prefijoNumero ? `${prefijoNumero}.${indice + 1}` : `${indice + 1}`;
        const hijos = (hijosPorPadre[this.claveJerarquia(it.id)] || [])
          .filter(hijo => hijo.activo !== false);
        const indexOriginal = this.ControlesAvance.indexOf(it);
        const colapsado = !!this.titulosColapsados[it.id];
        resultado.push({ item: it, indexOriginal, nivel, tieneHijos: hijos.length > 0, colapsado, numero });
        if (hijos.length > 0 && !colapsado) {
          recorrer(hijos, nivel + 1, numero);
        }
      });
    };

    recorrer(raices, 0, '');
    this.filasTabla = resultado;
  }

  /** trackBy de la tabla jerárquica: evita que Angular recree los inputs de cada fila en cada recálculo. */
  trackByFila(index: number, fila: FilaTabla): any {
    return (fila.item && fila.item.id) || fila.indexOriginal;
  }

  /** trackBy de la Carta Gantt: mismo criterio que trackByFila. */
  trackByBarra(index: number, barra: BarraGantt): any {
    return (barra.item && barra.item.id) || barra.indexOriginal;
  }

  toggleColapso(idTitulo: string) {
    if (!idTitulo) { return; }
    this.titulosColapsados[idTitulo] = !this.titulosColapsados[idTitulo];
    this.recalcularJerarquiaYAgregados();
    this.actualizarDatosGantt();
  }

  /** Usado por la vista Gantt para saber si debe mostrar el botón de plegar/desplegar junto al nombre. */
  esFilaConHijos(idItem: string): boolean {
    if (!idItem) { return false; }
    const claveItem = this.claveJerarquia(idItem);
    return this.ControlesAvance.some(it =>
      it.activo !== false && this.claveJerarquia(it.idPadre) === claveItem
    );
  }

  /**
   * Checkbox de la Carta Gantt para cualquier título de nivel 0: al marcarlo, se pinta la franja
   * oscura de ancho completo (con prioridad sobre su propia fecha/plazo, si es que los tiene).
   */
  toggleFranjaCompleta(item: ControlAvanceItem, index: number) {
    if (!this.puedeEditarAvance) { return; }
    item.mostrarFranjaCompleta = !item.mostrarFranjaCompleta;
    this.OnCambio(item, index);
  }

  // =========================================================================
  // REORDENAR FILAS: mantener presionado y arrastrar (HTML5 drag & drop nativo)
  // Reemplaza a las antiguas flechas ▲▼. Solo permite soltar entre hermanos
  // del mismo nivel (mismo idPadre); si se suelta en un nivel distinto, no hace nada.
  // =========================================================================

  /** Fila que el usuario está arrastrando actualmente. */
  filaArrastrada: FilaTabla | null = null;
  /** Id de la fila sobre la que pasa el arrastre en este momento, solo para resaltarla visualmente. */
  filaSobreDrag: string | null = null;

  /** Se dispara al mantener presionado el ícono de agarre (⣿) de una fila e iniciar el arrastre. */
  onDragStart(fila: FilaTabla) {
    if (!this.puedeEditarAvance) { return; }
    this.filaArrastrada = fila;
  }

  /** Mientras se arrastra sobre otra fila: si es hermana (mismo idPadre), permite soltar y la resalta. */
  onDragOver(event: DragEvent, fila: FilaTabla) {
    if (!this.filaArrastrada) { return; }
    if ((this.filaArrastrada.item.idPadre || null) !== (fila.item.idPadre || null)) { return; }
    event.preventDefault();
    this.filaSobreDrag = fila.item.id;
  }

  onDragLeave() {
    this.filaSobreDrag = null;
  }

  /**
   * Suelta la fila arrastrada justo en la posición de la fila destino (mismo nivel/hermanos),
   * reordena en memoria, persiste el nuevo `orden` de todos los hermanos afectados en un solo
   * batch, y si la fila movida es una lámina, renumera los códigos TRZ de su título.
   */
  onDrop(filaDestino: FilaTabla) {
    this.filaSobreDrag = null;
    const origen = this.filaArrastrada;
    this.filaArrastrada = null;
    if (!this.puedeEditarAvance || !origen) { return; }
    if (origen.item.id === filaDestino.item.id) { return; }
    if ((origen.item.idPadre || null) !== (filaDestino.item.idPadre || null)) {
      return; // solo se reordena entre hermanos del mismo nivel
    }

    const hermanos = this.ControlesAvance
      .filter(it => (it.idPadre || null) === (origen.item.idPadre || null))
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));

    const indiceOrigen = hermanos.findIndex(it => it.id === origen.item.id);
    const indiceDestino = hermanos.findIndex(it => it.id === filaDestino.item.id);
    if (indiceOrigen === -1 || indiceDestino === -1) { return; }

    const [itemMovido] = hermanos.splice(indiceOrigen, 1);
    hermanos.splice(indiceDestino, 0, itemMovido);

    const batch = firestoreDB.batch();
    hermanos.forEach((it, indice) => {
      it.orden = indice;
      if (it.id) {
        batch.update(firestoreDB.collection('controlAvance').doc(it.id), { orden: indice });
      }
    });
    batch.commit().catch((error: any) => {
      console.error('Error al reordenar filas:', error);
    });

    this.recalcularJerarquiaYAgregados();
    this.actualizarDatosGantt();

    // Si se movió una lámina (no un título), se renumeran sus códigos con el prefijo de su título.
    if (!origen.item.esTitulo && origen.item.idPadre) {
      const idPadre = origen.item.idPadre;
      setTimeout(() => this.renumerarLaminasDeTitulo(idPadre), 350);
    }
  }

  onDragEnd() {
    this.filaArrastrada = null;
    this.filaSobreDrag = null;
  }

  // =========================================================================
  // CÓDIGOS AUTONUMERADOS POR TÍTULO (PREFIJO-TRZ-NN)
  // =========================================================================

  /** Sugiere un prefijo de 3 letras para el código de las láminas de un título, en base a su descripción. */
  sugerirPrefijoDesdeDescripcion(descripcion: string): string {
    if (!descripcion) { return ''; }
    const palabras = descripcion
      .toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
      .replace(/[^A-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(p => p && this.STOPWORDS_PREFIJO.indexOf(p) === -1);

    if (palabras.length === 0) { return ''; }

    // Se toma la última palabra relevante: "PROYECTO DE ARQUITECTURA" -> "ARQUITECTURA" -> "ARC"
    const palabraClave = palabras[palabras.length - 1];
    return palabraClave.substring(0, 3);
  }

  /** Construye el código de una lámina a partir del prefijo de su título: PREFIJO-TRZ-NN (ej: ARC-TRZ-01). */
  private generarCodigoLamina(prefijo: string, numero: number): string {
    const numeroFormateado = String(Math.max(numero, 1)).padStart(2, '0');
    return `${(prefijo || 'DOC').toUpperCase()}-TRZ-${numeroFormateado}`;
  }

  /** Se llama al escribir la descripción de un título nuevo: sugiere el prefijo si el usuario no lo editó a mano. */
  onCambioDescripcionTitulo() {
    if (!this.nuevoDoc.esTitulo || this.prefijoEditadoManualmente) { return; }
    this.nuevoDoc.prefijoCodigo = this.sugerirPrefijoDesdeDescripcion(this.nuevoDoc.descripcion);
  }

  /** Se llama al editar manualmente el campo de prefijo: deja de autosugerirse desde la descripción. */
  onCambioPrefijoManual(valor: string) {
    this.prefijoEditadoManualmente = true;
    this.nuevoDoc.prefijoCodigo = (valor || '').toUpperCase();
  }

  /** Fuerza mayúsculas al editar el prefijo de un título ya existente, directamente en la tabla. */
  onCambioPrefijoTituloExistente(item: ControlAvanceItem) {
    item.prefijoCodigo = (item.prefijoCodigo || '').toUpperCase();
  }

  /** Renumera el código de todas las láminas (subitems, no sub-títulos) de un título, según su orden actual. */
  renumerarLaminasDeTitulo(idTitulo: string) {
    if (!this.puedeEditarAvance || !idTitulo) { return; }
    const titulo = this.ControlesAvance.find(it => it.id === idTitulo);
    if (!titulo) { return; }

    const prefijo = titulo.prefijoCodigo || this.sugerirPrefijoDesdeDescripcion(titulo.descripcion) || 'DOC';
    const laminas = this.ControlesAvance
      .filter(it => it.idPadre === idTitulo && it.activo !== false && !it.esTitulo)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));

    if (laminas.length === 0) { return; }

    const batch = firestoreDB.batch();
    let huboCambios = false;

    laminas.forEach((lamina, indice) => {
      const nuevoCodigo = this.generarCodigoLamina(prefijo, indice + 1);
      if (lamina.codigo !== nuevoCodigo) {
        lamina.codigo = nuevoCodigo;
        huboCambios = true;
        if (lamina.id) {
          batch.update(firestoreDB.collection('controlAvance').doc(lamina.id), { codigo: nuevoCodigo });
        }
      }
    });

    if (!huboCambios) { return; }

    batch.commit().catch((error: any) => {
      console.error('Error al renumerar códigos de láminas:', error);
    });
  }

  /** Botón manual: recalcula los códigos de las láminas de un título con su prefijo actual (por si quedaron desordenados). */
  renumerarManualmente(idTitulo: string) {
    if (!this.puedeEditarAvance) { return; }
    this.renumerarLaminasDeTitulo(idTitulo);
    Swal.fire({
      icon: 'success',
      title: 'Códigos actualizados',
      timer: 1200,
      showConfirmButton: false
    });
  }

  /** Desplaza en +1 el orden de todos los hermanos posteriores al punto de inserción, dejando un hueco para la lámina intermedia. */
  private async insertarConOrdenIntermedio(idPadre: string | null, ordenDespuesDe: number): Promise<void> {
    if (!this.puedeEditarAvance) { return; }
    const hermanosPosteriores = this.ControlesAvance.filter(it =>
      (it.idPadre || null) === (idPadre || null) && (it.orden || 0) > ordenDespuesDe
    );
    if (hermanosPosteriores.length === 0) { return; }

    const batch = firestoreDB.batch();
    hermanosPosteriores.forEach(h => {
      h.orden = (h.orden || 0) + 1;
      if (h.id) {
        batch.update(firestoreDB.collection('controlAvance').doc(h.id), { orden: h.orden });
      }
    });
    await batch.commit().catch(() => {});
  }

  // =========================================================================
  // FORMULARIO DE CREACIÓN (Título o Subitem)
  // =========================================================================

  abrirFormularioAgregar(idPadre: string | null = null, nombrePadre: string = 'Raíz', esTituloSugerido: boolean = true) {
    if (!this.puedeEditarAvance) { return; }
    this.idPadreActivo = idPadre;
    this.nombrePadreActivo = nombrePadre;
    this.ordenInsercionDespuesDe = null; // se agrega al final, no entremedio
    this.resetNuevoDoc();
    this.nuevoDoc.esTitulo = esTituloSugerido;
    this.actualizarCodigoSugerido();
    this.mostrarFormulario = true;
  }

  /**
   * Abre el formulario para insertar una lámina nueva justo después de la fila indicada
   * (misma jerarquía/título), en vez de agregarla al final. Los códigos se renumeran solos al guardar.
   */
  abrirFormularioInsertarDespues(fila: FilaTabla) {
    if (!this.puedeEditarAvance || fila.item.esTitulo) { return; }

    const idPadre = fila.item.idPadre || null;
    const padre = idPadre ? this.ControlesAvance.find(it => it.id === idPadre) : null;

    this.idPadreActivo = idPadre;
    this.nombrePadreActivo = padre ? `${padre.codigo} ${padre.descripcion}`.trim() : 'Raíz';
    this.ordenInsercionDespuesDe = fila.item.orden;

    this.resetNuevoDoc();
    this.nuevoDoc.esTitulo = false;
    this.actualizarCodigoSugerido();
    this.mostrarFormulario = true;
  }

  /** Se llama cuando el usuario cambia el selector "Tipo de fila" dentro del formulario ya abierto. */
  onCambioTipoFormulario() {
    this.actualizarCodigoSugerido();
    if (this.nuevoDoc.esTitulo) {
      this.nuevoDoc.fechaInicioProgramada = '';
      this.nuevoDoc.plazoProgramado = null;
      if (!this.prefijoEditadoManualmente) {
        this.nuevoDoc.prefijoCodigo = this.sugerirPrefijoDesdeDescripcion(this.nuevoDoc.descripcion);
      }
    }
  }

  /**
   * Autonumera el código de un subitem según su título padre: PREFIJO-TRZ-01, PREFIJO-TRZ-02...
   * Si se está insertando entremedio, la vista previa considera la posición final que tendrá.
   */
  private actualizarCodigoSugerido() {
    if (this.nuevoDoc.esTitulo) {
      this.nuevoDoc.codigo = '';
      return;
    }
    this.nuevoDoc.codigo = this.sugerirCodigoSubitem(this.idPadreActivo);
  }

  private sugerirCodigoSubitem(idPadre: string | null): string {
    if (!idPadre) { return ''; }
    const padre = this.ControlesAvance.find(it => it.id === idPadre);
    if (!padre) { return ''; }

    const prefijo = padre.prefijoCodigo || this.sugerirPrefijoDesdeDescripcion(padre.descripcion) || 'DOC';
    const hermanos = this.ControlesAvance.filter(it => it.idPadre === idPadre && it.activo !== false && !it.esTitulo);

    const posicion = this.ordenInsercionDespuesDe !== null
      ? hermanos.filter(h => (h.orden || 0) <= (this.ordenInsercionDespuesDe as number)).length + 1
      : hermanos.length + 1;

    return this.generarCodigoLamina(prefijo, posicion);
  }

  toggleFormularioAvance() {
    if (this.mostrarFormulario) {
      this.mostrarFormulario = false;
      return;
    }
    this.abrirFormularioAgregar(null, 'Raíz', true);
  }

  resetNuevoDoc() {
    this.nuevoDoc = {
      esTitulo: true,
      codigo: '',
      codigoExcel: '',
      tipo: '',
      descripcion: '',
      revisionActual: 0,
      estado: 'P',
      fechaInicio: '',
      plazoReal: null,
      fechaInicioProgramada: '',
      plazoProgramado: null,
      prefijoCodigo: ''
    };
    this.archivosNuevoDoc = [];
    this.prefijoEditadoManualmente = false;
  }

  private siguienteOrden(idPadre: string | null): number {
    const clavePadre = this.claveJerarquia(idPadre);
    const hermanos = this.ControlesAvance.filter(it => this.claveJerarquia(it.idPadre) === clavePadre);
    if (hermanos.length === 0) { return 0; }
    return Math.max(...hermanos.map(it => it.orden || 0)) + 1;
  }

  async AgregarDesdeFormulario() {
    if (!this.puedeEditarAvance) { return; }

    const esTitulo = !!this.nuevoDoc.esTitulo;

    if (!esTitulo && (!this.nuevoDoc.codigo && !this.nuevoDoc.descripcion)) { return; }
    if (esTitulo && !this.nuevoDoc.descripcion) { return; }

    const nuevoItemTemporal: ControlAvanceItem = {
      idControlAvance: 1,
      idProyecto: this.getIdProyectoActual(),
      idSubProyecto: this.getIdSubProyectoActual(),
      esTitulo: esTitulo,
      idPadre: this.idPadreActivo,
      orden: 0,
      codigo: this.nuevoDoc.codigo || '',
      tipo: this.nuevoDoc.tipo || '',
      descripcion: this.nuevoDoc.descripcion || '',
      revisionActual: this.nuevoDoc.revisionActual || 0,
      estado: this.nuevoDoc.estado || 'P',
      activo: true,
      fechaInicioProgramada: esTitulo ? '' : (this.nuevoDoc.fechaInicioProgramada || ''),
      plazoProgramado: esTitulo ? 0 : (Number(this.nuevoDoc.plazoProgramado) || 0),
      fechaTerminoProgramada: '',
      avanceProgramado: 0,
      fechaInicio: this.nuevoDoc.fechaInicio || '',
      plazoReal: Number(this.nuevoDoc.plazoReal) || 0,
      fechaTermino: '',
      avanceReal: 0,
      bitacora: [],
      validadoresEstado: {},
      idUsuarioCreador: this.usuario.idUsuario,
      fechaCreacion: new Date().toISOString()
    };

    if (!this.validarTituloHijoUnico(nuevoItemTemporal)) {
      return;
    }

    const codigoExcel = (this.nuevoDoc.codigoExcel || '').trim();
    if (codigoExcel) {
      this.subProyectoActual = this.subProyectoActual || {};
      this.subProyectoActual.codigo = codigoExcel;
      this.subProyectoActual.codigoProyecto = codigoExcel;
      try {
        localStorage.setItem('SubProyecto', JSON.stringify(this.subProyectoActual));
      } catch (error) {
        console.warn('No se pudo guardar el código del Excel en el subproyecto actual:', error);
      }
    }

    const validadoresEstado: { [idUsuario: string]: boolean } = {};
    this.validadoresSeleccionados.forEach(idValidador => {
      validadoresEstado[idValidador] = false;
    });

    // Si se está insertando una lámina entremedio, primero se corre el orden de sus hermanos posteriores.
    const insertandoEntremedio = !esTitulo && this.ordenInsercionDespuesDe !== null;
    if (insertandoEntremedio) {
      await this.insertarConOrdenIntermedio(this.idPadreActivo, this.ordenInsercionDespuesDe as number);
    }

    const ordenAsignado = insertandoEntremedio
      ? (this.ordenInsercionDespuesDe as number) + 1
      : this.siguienteOrden(this.idPadreActivo);

    const nuevoItem: ControlAvanceItem = {
      idControlAvance: 1,
      idProyecto: this.getIdProyectoActual(),
      idSubProyecto: this.getIdSubProyectoActual(),
      esTitulo: esTitulo,
      idPadre: this.idPadreActivo,
      orden: ordenAsignado,
      codigo: this.nuevoDoc.codigo || '',
      tipo: this.nuevoDoc.tipo || '',
      descripcion: this.nuevoDoc.descripcion || '',
      revisionActual: this.nuevoDoc.revisionActual || 0,
      estado: this.nuevoDoc.estado || 'P',
      activo: true,
      fechaInicioProgramada: esTitulo ? '' : (this.nuevoDoc.fechaInicioProgramada || ''),
      plazoProgramado: esTitulo ? 0 : (Number(this.nuevoDoc.plazoProgramado) || 0),
      fechaTerminoProgramada: '',
      avanceProgramado: 0,
      fechaInicio: this.nuevoDoc.fechaInicio || '',
      plazoReal: Number(this.nuevoDoc.plazoReal) || 0,
      fechaTermino: '',
      avanceReal: 0,
      bitacora: [],
      validadoresEstado: validadoresEstado,
      idUsuarioCreador: this.usuario.idUsuario,
      fechaCreacion: new Date().toISOString()
    };

    if (esTitulo) {
      nuevoItem.prefijoCodigo = (this.nuevoDoc.prefijoCodigo || this.sugerirPrefijoDesdeDescripcion(this.nuevoDoc.descripcion) || 'DOC').toUpperCase();
    }

    this.recalcularFechasDesdePlazo(nuevoItem);
    this.calcularAvanceProgramado(nuevoItem);

    const idPadreParaRenumerar = this.idPadreActivo;

    firestoreDB.collection('controlAvance').add(nuevoItem)
      .then((docRef: any) => {
        const archivosParaSubir = this.archivosNuevoDoc;
        this.resetNuevoDoc();
        this.mostrarFormulario = false;
        this.idPadreActivo = null;
        this.nombrePadreActivo = 'Raíz';
        this.ordenInsercionDespuesDe = null;

        // Espera breve a que el snapshot de Firestore refleje el nuevo item antes de renumerar los códigos.
        if (!esTitulo && idPadreParaRenumerar) {
          setTimeout(() => this.renumerarLaminasDeTitulo(idPadreParaRenumerar), 400);
        }

        if (archivosParaSubir.length === 0) {
          Swal.fire({
            icon: 'success',
            title: esTitulo ? 'Título creado' : 'Documento creado',
            text: esTitulo ? 'El título se creó correctamente.' : 'El documento de control de avance se creó correctamente.',
            timer: 1800,
            showConfirmButton: false
          });
          return;
        }

        this.subirArchivosADocumento(docRef.id, archivosParaSubir).then(() => {
          Swal.fire({
            icon: 'success',
            title: 'Documento creado',
            text: 'El documento y sus archivos adjuntos se guardaron correctamente.',
            timer: 1800,
            showConfirmButton: false
          });
        }).catch((error: any) => {
          Swal.fire('Documento creado, pero hubo un error con los archivos', error.message, 'warning');
        });
      })
      .catch((error: any) => {
        Swal.fire('Error', 'No se pudo guardar el documento: ' + error.message, 'error');
      });
  }

  onArchivosNuevoDocSeleccionados(event: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    for (let i = 0; i < files.length; i++) {
      this.archivosNuevoDoc.push(files[i]);
    }
    event.target.value = '';
  }

  quitarArchivoNuevoDoc(index: number) {
    this.archivosNuevoDoc.splice(index, 1);
  }

  // =========================================================================
  // PLANTILLAS DE ENTREGABLES (láminas prefabricadas): modal navegable
  // =========================================================================

  abrirModalPlantillas() {
    if (!this.puedeEditarAvance) { return; }
    this.seleccionPlantillas = {};
    this.destinoPlantillaIdPadre = null;
    this.filtroPlantillasTexto = '';
    this.mostrarCreadorPlantilla = false;
    this.resetNuevaPlantilla();

    if (typeof $ !== 'undefined') {
      $('.modal').modal('hide');
      $('.modal-backdrop').remove();
      $('body').removeClass('modal-open').css('padding-right', '');

      setTimeout(() => {
        const $modal = $('#ModalPlantillas');
        if ($modal.length) {
          if (!$modal.parent().is('body')) {
            $modal.appendTo('body');
          }
          $modal.modal({ backdrop: true, keyboard: true, focus: true, show: true });
        }
      }, 100);
    }
  }

  cerrarModalPlantillas() {
    if (typeof $ !== 'undefined') {
      $('#ModalPlantillas').modal('hide');
    }
  }

  toggleGrupoPlantilla(grupo: string) {
    this.gruposPlantillaExpandido[grupo] = !this.gruposPlantillaExpandido[grupo];
  }

  private claveItemPlantilla(grupo: string, item: PlantillaDocumento): string {
    return `${grupo}|${item.codigo}`;
  }

  estaItemPlantillaSeleccionado(grupo: string, item: PlantillaDocumento): boolean {
    return !!this.seleccionPlantillas[this.claveItemPlantilla(grupo, item)];
  }

  toggleSeleccionPlantilla(grupo: string, item: PlantillaDocumento, checked: boolean) {
    this.seleccionPlantillas[this.claveItemPlantilla(grupo, item)] = checked;
  }

  contarSeleccionadosGrupo(grupo: GrupoPlantillas): number {
    return grupo.items.filter(it => this.estaItemPlantillaSeleccionado(grupo.grupo, it)).length;
  }

  toggleSeleccionTodoGrupo(grupo: GrupoPlantillas, checked: boolean) {
    grupo.items.forEach(item => this.toggleSeleccionPlantilla(grupo.grupo, item, checked));
  }

  get totalSeleccionadosPlantillas(): number {
    return this.plantillasGrupos.reduce((total, g) => total + this.contarSeleccionadosGrupo(g), 0);
  }

  /** Títulos existentes (activos) donde se puede insertar documentos sueltos de una plantilla. */
  get titulosExistentesPlantilla(): ControlAvanceItem[] {
    return this.ControlesAvance.filter(it => it.esTitulo && it.activo !== false);
  }

  /** Ícono representativo por disciplina: usa el elegido por el usuario si es una plantilla personalizada. */
  getIconoGrupoPlantilla(grupo: GrupoPlantillas & { icono?: string }): string {
    if (grupo && grupo.icono) { return grupo.icono; }
    const mapa: { [clave: string]: string } = {
      'TOPOGRAFIA': 'fa-map-o',
      'MECANICA DE SUELOS': 'fa-cube',
      'PROYECTO ARQUITECTURA': 'fa-building-o',
      'PROYECTO CALCULO ESTRUCTURAL': 'fa-calculator',
      'PROYECTO ELECTRICO': 'fa-bolt',
      'PROYECTO SANITARIO': 'fa-tint',
      'PROYECTO CLIMATIZACIÓN': 'fa-thermometer-half'
    };
    return mapa[grupo.grupo] || 'fa-folder-o';
  }

  /** Documentos de un grupo que coinciden con el texto buscado (código, descripción o tema). */
  itemsFiltradosPlantilla(grupo: GrupoPlantillas): PlantillaDocumento[] {
    const texto = this.filtroPlantillasTexto.trim().toLowerCase();
    if (!texto) { return grupo.items; }
    return grupo.items.filter(it =>
      it.codigo.toLowerCase().indexOf(texto) !== -1 ||
      it.descripcion.toLowerCase().indexOf(texto) !== -1 ||
      it.tema.toLowerCase().indexOf(texto) !== -1
    );
  }

  /** Si hay texto buscado, solo se muestran los grupos con coincidencias (por nombre o por algún documento). */
  grupoVisiblePlantilla(grupo: GrupoPlantillas): boolean {
    const texto = this.filtroPlantillasTexto.trim().toLowerCase();
    if (!texto) { return true; }
    if (grupo.grupo.toLowerCase().indexOf(texto) !== -1) { return true; }
    return this.itemsFiltradosPlantilla(grupo).length > 0;
  }

  /** Mientras se está buscando, los grupos con coincidencias se muestran siempre desplegados. */
  mostrarItemsGrupoPlantilla(grupo: GrupoPlantillas): boolean {
    if (this.filtroPlantillasTexto.trim()) { return true; }
    return !!this.gruposPlantillaExpandido[grupo.grupo];
  }


  /** Traduce el código corto de la plantilla ('ET' | 'MC' | 'P' | 'R' | '') al valor completo del <select> de Tipo. */
  private mapearTipoSugerido(codigoCorto: string): string {
    if (!codigoCorto) { return ''; }
    const encontrado = this.tiposDocumento.find(t => t.indexOf(codigoCorto + ' -') === 0);
    return encontrado || '';
  }

  private construirSubitemDesdePlantilla(item: PlantillaDocumento, idPadre: string | null, orden: number): any {
    const validadoresEstado: { [idUsuario: string]: boolean } = {};
    this.validadoresSeleccionados.forEach(id => { validadoresEstado[id] = false; });

    return {
      idControlAvance: 1,
      idProyecto: this.getIdProyectoActual(),
      idSubProyecto: this.getIdSubProyectoActual(),
      esTitulo: false,
      idPadre: idPadre,
      orden: orden,
      codigo: item.codigo,
      tipo: this.mapearTipoSugerido(item.tipoSugerido),
      descripcion: item.descripcion,
      revisionActual: 0,
      estado: 'P',
      activo: true,
      fechaInicioProgramada: '',
      plazoProgramado: 0,
      fechaTerminoProgramada: '',
      avanceProgramado: 0,
      fechaInicio: '',
      plazoReal: 0,
      fechaTermino: '',
      avanceReal: 0,
      bitacora: [],
      validadoresEstado,
      idUsuarioCreador: this.usuario.idUsuario,
      fechaCreacion: new Date().toISOString()
    };
  }

  /** Crea un título nuevo con el nombre de la disciplina + todas sus láminas como subitems, en un solo batch. */
  async agregarGrupoCompleto(grupoPlantilla: GrupoPlantillas) {
    if (!this.puedeEditarAvance) { return; }

    const confirmacion = await Swal.fire({
      title: `Agregar "${grupoPlantilla.grupo}"`,
      text: `Se creará el título "${grupoPlantilla.grupo}" con sus ${grupoPlantilla.items.length} documento(s). Podrás editar cada uno después.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmacion.value) { return; }

    const prefijoTitulo = this.sugerirPrefijoDesdeDescripcion(grupoPlantilla.grupo) || 'DOC';

    const batch = firestoreDB.batch();
    const refTitulo = firestoreDB.collection('controlAvance').doc();

    batch.set(refTitulo, {
      idControlAvance: 1,
      idProyecto: this.getIdProyectoActual(),
      idSubProyecto: this.getIdSubProyectoActual(),
      esTitulo: true,
      idPadre: null,
      orden: this.siguienteOrden(null),
      codigo: '',
      tipo: '',
      descripcion: grupoPlantilla.grupo,
      revisionActual: 0,
      estado: 'P',
      activo: true,
      fechaInicioProgramada: '',
      plazoProgramado: 0,
      fechaTerminoProgramada: '',
      avanceProgramado: 0,
      fechaInicio: '',
      plazoReal: 0,
      fechaTermino: '',
      avanceReal: 0,
      bitacora: [],
      validadoresEstado: {},
      idUsuarioCreador: this.usuario.idUsuario,
      fechaCreacion: new Date().toISOString(),
      prefijoCodigo: prefijoTitulo
    });

    if (grupoPlantilla.agruparPorSeccion) {
      // Agrupa las láminas por su "tema" y crea un subtítulo (1.1, 1.2, 1.3...) por cada sección.
      const secciones: string[] = [];
      const itemsPorSeccion: { [tema: string]: PlantillaDocumento[] } = {};
      grupoPlantilla.items.forEach(item => {
        const tema = item.tema || 'GENERAL';
        if (!itemsPorSeccion[tema]) {
          itemsPorSeccion[tema] = [];
          secciones.push(tema);
        }
        itemsPorSeccion[tema].push(item);
      });

      secciones.forEach((tema, indiceSeccion) => {
        const refSubtitulo = firestoreDB.collection('controlAvance').doc();
        const prefijoSeccion = this.sugerirPrefijoDesdeDescripcion(tema) || prefijoTitulo;

        batch.set(refSubtitulo, {
          idControlAvance: 1,
          idProyecto: this.getIdProyectoActual(),
          idSubProyecto: this.getIdSubProyectoActual(),
          esTitulo: true,
          idPadre: refTitulo.id,
          orden: indiceSeccion,
          codigo: '',
          tipo: '',
          descripcion: tema,
          revisionActual: 0,
          estado: 'P',
          activo: true,
          fechaInicioProgramada: '',
          plazoProgramado: 0,
          fechaTerminoProgramada: '',
          avanceProgramado: 0,
          fechaInicio: '',
          plazoReal: 0,
          fechaTermino: '',
          avanceReal: 0,
          bitacora: [],
          validadoresEstado: {},
          idUsuarioCreador: this.usuario.idUsuario,
          fechaCreacion: new Date().toISOString(),
          prefijoCodigo: prefijoSeccion
        });

        itemsPorSeccion[tema].forEach((item, indice) => {
          const refItem = firestoreDB.collection('controlAvance').doc();
          const subitem = this.construirSubitemDesdePlantilla(item, refSubtitulo.id, indice);
          subitem.codigo = this.generarCodigoLamina(prefijoSeccion, indice + 1);
          batch.set(refItem, subitem);
        });
      });
    } else {
      grupoPlantilla.items.forEach((item, indice) => {
        const refItem = firestoreDB.collection('controlAvance').doc();
        const subitem = this.construirSubitemDesdePlantilla(item, refTitulo.id, indice);
        subitem.codigo = this.generarCodigoLamina(prefijoTitulo, indice + 1);
        batch.set(refItem, subitem);
      });
    }

    try {
      await batch.commit();
      Swal.fire({
        icon: 'success',
        title: 'Disciplina agregada',
        text: `Se agregaron ${grupoPlantilla.items.length} documentos bajo "${grupoPlantilla.grupo}".`,
        timer: 2000,
        showConfirmButton: false
      });
      this.cerrarModalPlantillas();
    } catch (error) {
      Swal.fire('Error', 'No se pudo agregar la disciplina: ' + error.message, 'error');
    }
  }

  /**
   * Agrega solo los documentos marcados (de una o varias disciplinas) dentro del título elegido, o en la raíz.
   * FIX: cuando el destino es un título existente, el código se autonumera con el prefijo de ese título
   * (PREFIJO-TRZ-NN), igual que en el resto de la app. Antes se dejaba el código crudo de la plantilla
   * (ej: "BE_PLC_ARQ 01") en vez de "ARC-TRZ-01".
   */
  async agregarSeleccionPlantillaAdestino() {
    if (!this.puedeEditarAvance) { return; }

    const seleccionados: PlantillaDocumento[] = [];
    this.gruposPlantillaTodos.forEach(g => {
      g.items.forEach(item => {
        if (this.estaItemPlantillaSeleccionado(g.grupo, item)) {
          seleccionados.push(item);
        }
      });
    });

    if (seleccionados.length === 0) {
      Swal.fire('Sin selección', 'Marque al menos un documento de la plantilla.', 'info');
      return;
    }

    const idPadreDestino = this.destinoPlantillaIdPadre;
    const ordenBase = this.siguienteOrden(idPadreDestino);
    const batch = firestoreDB.batch();

    // Prefijo del título destino, para que el código quede como PREFIJO-TRZ-NN igual que en el resto de la app.
    let prefijoDestino = 'DOC';
    let posicionInicial = 1;
    if (idPadreDestino) {
      const tituloDestino = this.ControlesAvance.find(it => it.id === idPadreDestino);
      if (tituloDestino) {
        prefijoDestino = tituloDestino.prefijoCodigo || this.sugerirPrefijoDesdeDescripcion(tituloDestino.descripcion) || 'DOC';
      }
      const hermanosExistentes = this.ControlesAvance.filter(it =>
        it.idPadre === idPadreDestino && it.activo !== false && !it.esTitulo
      );
      posicionInicial = hermanosExistentes.length + 1;
    }

    seleccionados.forEach((item, indice) => {
      const ref = firestoreDB.collection('controlAvance').doc();
      const subitem = this.construirSubitemDesdePlantilla(item, idPadreDestino, ordenBase + indice);
      // Solo se autonumera con TRZ si se está insertando dentro de un título (hay de dónde sacar el prefijo).
      if (idPadreDestino) {
        subitem.codigo = this.generarCodigoLamina(prefijoDestino, posicionInicial + indice);
      }
      batch.set(ref, subitem);
    });

    try {
      await batch.commit();
      Swal.fire({
        icon: 'success',
        title: 'Documentos agregados',
        text: `Se agregaron ${seleccionados.length} documento(s).`,
        timer: 2000,
        showConfirmButton: false
      });
      this.seleccionPlantillas = {};
      this.cerrarModalPlantillas();

      // Al insertar dentro de un título existente, se renumeran sus códigos con el prefijo de ese título.
      if (idPadreDestino) {
        setTimeout(() => this.renumerarLaminasDeTitulo(idPadreDestino), 500);
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudieron agregar los documentos: ' + error.message, 'error');
    }
  }

  // -------------------------------------------------------------------------
  // Creador de plantilla personalizada (nombre + ícono a elección + documentos propios)
  // -------------------------------------------------------------------------

  /** Todas las plantillas visibles en el modal: las de fábrica + las que el usuario creó. */
  get gruposPlantillaTodos(): Array<GrupoPlantillas & { icono?: string; personalizada?: boolean; id?: string }> {
    return [...this.plantillasGrupos, ...this.plantillasPersonalizadas];
  }

  private suscribirPlantillasPersonalizadas() {
    if (this.unsubscribePlantillasPersonalizadas) {
      this.unsubscribePlantillasPersonalizadas();
    }

    this.unsubscribePlantillasPersonalizadas = firestoreDB.collection('controlAvancePlantillasPersonalizadas')
      .where('idProyecto', '==', this.getIdProyectoActual())
      .where('idSubProyecto', '==', this.getIdSubProyectoActual())
      .onSnapshot((snapshot: any) => {
        this._ngZone.run(() => {
          const items: GrupoPlantillaPersonalizada[] = [];
          snapshot.forEach((doc: any) => {
            const data = doc.data();
            items.push({
              id: doc.id,
              grupo: data.grupo || 'Sin nombre',
              icono: data.icono || 'fa-folder-o',
              items: Array.isArray(data.items) ? data.items : [],
              personalizada: true
            });
          });
          this.plantillasPersonalizadas = items;
        });
      }, (error: any) => {
        console.error('Error al cargar plantillas personalizadas desde Firestore:', error);
      });
  }

  toggleCreadorPlantilla() {
    this.mostrarCreadorPlantilla = !this.mostrarCreadorPlantilla;
    if (this.mostrarCreadorPlantilla) {
      this.resetNuevaPlantilla();
    }
  }

  private resetNuevaPlantilla() {
    this.nuevaPlantilla = { nombre: '', icono: 'fa-folder-o', items: [] };
    this.nuevaPlantillaItemTemp = { codigo: '', descripcion: '', tipoSugerido: '' };
  }

  seleccionarIconoPlantilla(icono: string) {
    this.nuevaPlantilla.icono = icono;
  }

  agregarLineaNuevaPlantilla() {
    if (!this.nuevaPlantillaItemTemp.codigo.trim() && !this.nuevaPlantillaItemTemp.descripcion.trim()) {
      return;
    }
    this.nuevaPlantilla.items.push({
      codigo: this.nuevaPlantillaItemTemp.codigo.trim(),
      descripcion: this.nuevaPlantillaItemTemp.descripcion.trim(),
      tema: '',
      tipoSugerido: this.nuevaPlantillaItemTemp.tipoSugerido
    });
    this.nuevaPlantillaItemTemp = { codigo: '', descripcion: '', tipoSugerido: '' };
  }

  quitarLineaNuevaPlantilla(indice: number) {
    this.nuevaPlantilla.items.splice(indice, 1);
  }

  async guardarPlantillaPersonalizada() {
    if (!this.puedeEditarAvance) { return; }

    if (!this.nuevaPlantilla.nombre.trim()) {
      Swal.fire('Falta el nombre', 'Ingresa un nombre para la disciplina/plantilla.', 'info');
      return;
    }
    if (this.nuevaPlantilla.items.length === 0) {
      Swal.fire('Sin documentos', 'Agrega al menos un documento a la plantilla antes de guardarla.', 'info');
      return;
    }

    try {
      await firestoreDB.collection('controlAvancePlantillasPersonalizadas').add({
        idProyecto: this.getIdProyectoActual(),
        idSubProyecto: this.getIdSubProyectoActual(),
        grupo: this.nuevaPlantilla.nombre.trim().toUpperCase(),
        icono: this.nuevaPlantilla.icono,
        items: this.nuevaPlantilla.items,
        idUsuarioCreador: this.usuario.idUsuario,
        fechaCreacion: new Date().toISOString()
      });

      Swal.fire({
        icon: 'success',
        title: 'Plantilla guardada',
        text: 'Ya puedes usarla junto con las demás plantillas.',
        timer: 1800,
        showConfirmButton: false
      });

      this.mostrarCreadorPlantilla = false;
      this.resetNuevaPlantilla();
    } catch (error) {
      Swal.fire('Error', 'No se pudo guardar la plantilla: ' + error.message, 'error');
    }
  }

  eliminarPlantillaPersonalizada(grupo: GrupoPlantillaPersonalizada) {
    if (!this.puedeEditarAvance || !grupo.id) { return; }

    Swal.fire({
      title: 'Eliminar plantilla',
      text: `¿Eliminar la plantilla "${grupo.grupo}"? Esto no afecta los documentos que ya hayas agregado al proyecto con ella.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (!result.value || !this.puedeEditarAvance) { return; }

      firestoreDB.collection('controlAvancePlantillasPersonalizadas').doc(grupo.id).delete()
        .catch((error: any) => {
          Swal.fire('Error', 'No se pudo eliminar la plantilla: ' + error.message, 'error');
        });
    });
  }

  private subirArchivosADocumento(docId: string, archivos: File[]): Promise<void> {
    if (!this.puedeEditarAvance) {
      return Promise.reject(new Error('La edición del Control de Avance está bloqueada.'));
    }
    const subidas = archivos.map(archivo => {
      const rutaArchivo = `controlAvance/${this.getIdProyectoActual()}/${this.getIdSubProyectoActual()}/${docId}/${Date.now()}_${archivo.name}`;
      const referencia = storageRef.ref(rutaArchivo);
      return referencia.put(archivo).then(() => referencia.getDownloadURL()).then((url: string) => {
        return {
          nombre: archivo.name,
          url: url,
          path: rutaArchivo,
          fechaSubida: new Date().toISOString()
        } as ArchivoAdjunto;
      });
    });

    return Promise.all(subidas).then((nuevosArchivos: ArchivoAdjunto[]) => {
      if (!this.puedeEditarAvance) {
        throw new Error('La edición del Control de Avance está bloqueada.');
      }
      return firestoreDB.collection('controlAvance').doc(docId).get().then((doc: any) => {
        const archivosActuales: ArchivoAdjunto[] = (doc.exists && doc.data().archivos) ? doc.data().archivos : [];
        return firestoreDB.collection('controlAvance').doc(docId).update({
          archivos: archivosActuales.concat(nuevosArchivos)
        });
      });
    });
  }

  onArchivosFilaSeleccionados(event: any, item: ControlAvanceItem, index: number) {
    if (!this.puedeEditarAvance) { return; }
    const files: FileList = event.target.files;
    if (!files || files.length === 0 || !item.id) {
      return;
    }

    const archivos: File[] = [];
    for (let i = 0; i < files.length; i++) {
      archivos.push(files[i]);
    }
    event.target.value = '';

    this.subiendoArchivos[index] = true;
    this.subirArchivosADocumento(item.id, archivos)
      .then(() => {
        this.subiendoArchivos[index] = false;
        Swal.fire({
          icon: 'success',
          title: 'Archivos adjuntados',
          text: 'Los archivos se subieron correctamente.',
          timer: 1800,
          showConfirmButton: false
        });
      })
      .catch((error: any) => {
        this.subiendoArchivos[index] = false;
        Swal.fire('Error', 'No se pudieron subir los archivos: ' + error.message, 'error');
      });
  }

  eliminarArchivoAdjunto(item: ControlAvanceItem, archivo: ArchivoAdjunto, index: number) {
    if (!this.puedeEditarAvance || !item.id) { return; }

    Swal.fire({
      title: 'Eliminar archivo',
      text: `¿Eliminar "${archivo.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (!result.value || !this.puedeEditarAvance) { return; }

      storageRef.ref(archivo.path).delete().catch(() => {
        // si el archivo ya no existe en Storage, igual limpiamos la referencia en Firestore
      }).then(() => {
        if (!this.puedeEditarAvance) { return; }
        const archivosActuales = (item.archivos || []).filter(a => a.path !== archivo.path);
        firestoreDB.collection('controlAvance').doc(item.id).update({ archivos: archivosActuales })
          .catch((error: any) => {
            Swal.fire('Error', 'No se pudo eliminar el archivo: ' + error.message, 'error');
          });
      });
    });
  }

  // =========================================================================
  // BITÁCORA: notas con semáforo de prioridad (alta / media / baja)
  // =========================================================================

  /** Devuelve las notas de un item ordenadas de la más reciente a la más antigua. */
  getBitacora(item: ControlAvanceItem): NotaBitacora[] {
    if (!item.bitacora) { item.bitacora = []; }
    return [...item.bitacora].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''));
  }

  /** Prioridad de la nota más reciente de un item, usada para colorear el badge de la tabla. */
  getPrioridadMasReciente(item: ControlAvanceItem): PrioridadBitacora | null {
    const notas = this.getBitacora(item);
    return notas.length > 0 ? notas[0].prioridad : null;
  }

  getPrioridadClase(prioridad: PrioridadBitacora | null): string {
    switch (prioridad) {
      case 'alta': return 'bitacora-alta';
      case 'media': return 'bitacora-media';
      case 'baja': return 'bitacora-baja';
      default: return '';
    }
  }

  getPrioridadLabel(prioridad: PrioridadBitacora | null): string {
    switch (prioridad) {
      case 'alta': return 'Alta';
      case 'media': return 'Media';
      case 'baja': return 'Baja';
      default: return '';
    }
  }

  agregarNotaBitacora(item: ControlAvanceItem, index: number) {
    if (!this.puedeEditarAvance || !item.id) { return; }

    const texto = (this.nuevaNotaTexto[item.id] || '').trim();
    if (!texto) {
      Swal.fire('Error', 'Escriba una nota antes de agregarla.', 'error');
      return;
    }
    const prioridad: PrioridadBitacora = this.nuevaNotaPrioridad[item.id] || 'media';

    if (!item.bitacora) { item.bitacora = []; }

    const nota: NotaBitacora = {
      id: `${Date.now()}`,
      texto: texto,
      prioridad: prioridad,
      fecha: this.formatearFechaISO(new Date()),
      fechaCreacion: new Date().toISOString(),
      idUsuarioCreador: this.usuario.idUsuario,
      nombreUsuarioCreador: this.usuario.nombreUsuario || this.usuario.nombre || 'Usuario'
    };

    item.bitacora.push(nota);
    this.nuevaNotaTexto[item.id] = '';
    this.nuevaNotaPrioridad[item.id] = 'media';

    firestoreDB.collection('controlAvance').doc(item.id).update({ bitacora: item.bitacora })
      .then(() => {
        Swal.fire({
          icon: 'success',
          title: 'Nota agregada',
          timer: 1200,
          showConfirmButton: false
        });
      })
      .catch((error: any) => {
        Swal.fire('Error', 'No se pudo guardar la nota: ' + error.message, 'error');
      });
  }

  eliminarNotaBitacora(item: ControlAvanceItem, index: number, nota: NotaBitacora) {
    if (!this.puedeEditarAvance || !item.id) { return; }

    Swal.fire({
      title: 'Eliminar nota',
      text: '¿Esta seguro de eliminar esta nota de la bitácora?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (!result.value) { return; }

      item.bitacora = (item.bitacora || []).filter(n => n.id !== nota.id);
      firestoreDB.collection('controlAvance').doc(item.id).update({ bitacora: item.bitacora })
        .catch((error: any) => {
          Swal.fire('Error', 'No se pudo eliminar la nota: ' + error.message, 'error');
        });
    });
  }

  abrirModalBitacora(index: number) {
    const modalId = `ModalBitacora${index}`;
    const modalSelector = `#${modalId}`;

    if (typeof $ !== 'undefined') {
      $('.modal').modal('hide');
      $('.modal-backdrop').remove();
      $('body').removeClass('modal-open').css('padding-right', '');

      setTimeout(() => {
        const $modal = $(modalSelector);

        if ($modal.length) {
          if (!$modal.parent().is('body')) {
            $modal.appendTo('body');
          }

          $modal.modal({
            backdrop: true,
            keyboard: true,
            focus: true,
            show: true
          });
        } else {
          console.error('Modal no encontrado:', modalSelector);
        }
      }, 100);
    }
  }

  /** Totales de notas por prioridad, sumados sobre todos los items activos (usado en el resumen del encabezado). */
  get totalNotasPorPrioridad(): { alta: number; media: number; baja: number; total: number } {
    const totales = { alta: 0, media: 0, baja: 0, total: 0 };
    this.ControlesAvance.forEach(item => {
      (item.bitacora || []).forEach(nota => {
        if (nota.prioridad === 'alta') { totales.alta++; }
        else if (nota.prioridad === 'media') { totales.media++; }
        else if (nota.prioridad === 'baja') { totales.baja++; }
        totales.total++;
      });
    });
    return totales;
  }

  /** Activa o desactiva el filtro por prioridad al hacer clic en el resumen del encabezado. */
  toggleFiltroBitacora(prioridad: PrioridadBitacora) {
    this.filtroBitacora = this.filtroBitacora === prioridad ? 'todas' : prioridad;
  }

  limpiarFiltroBitacora() {
    this.filtroBitacora = 'todas';
  }

  /** true si el item tiene al menos una nota que coincide con el filtro activo. */
  itemCoincideFiltroBitacora(item: ControlAvanceItem): boolean {
    if (this.filtroBitacora === 'todas') { return true; }
    return (item.bitacora || []).some(n => n.prioridad === this.filtroBitacora);
  }

  private limpiarParaGuardar(item: ControlAvanceItem): any {
    const datos: any = { ...item };
    delete datos.id;
    delete datos.esAgregadoAutomatico;
    return datos;
  }

  getColorTituloPorNivel(nivel: number): string {
    const tonos = [
      '#5B9BD5', // raíz / título principal: azul fuerte, bien diferenciado del resto
      '#BDD7EE', // hijo directo
      '#D9E8F5', // hijo del hijo
      '#EDF4FB', // subnivel siguiente
      '#F7FBFE'  // nivel extra, muy suave
    ];

    const indice = Math.min(Math.max(nivel, 0), tonos.length - 1);
    return tonos[indice];
  }

  private normalizarTextoTitulo(texto: string): string {
    return (texto || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private validarTituloHijoUnico(item: ControlAvanceItem): boolean {
    if (!item || !item.esTitulo || !item.idPadre) {
      return true;
    }

    const padre = this.ControlesAvance.find(it => it.id === item.idPadre && it.activo !== false);
    if (padre && this.normalizarTextoTitulo(padre.descripcion) === this.normalizarTextoTitulo(item.descripcion)) {
      Swal.fire('Error', 'El título hijo debe tener una descripción distinta a la del título padre.', 'error');
      return false;
    }

    const siblings = this.ControlesAvance.filter(it =>
      it.esTitulo &&
      it.idPadre === item.idPadre &&
      it.activo !== false &&
      it.id !== item.id &&
      this.normalizarTextoTitulo(it.descripcion) === this.normalizarTextoTitulo(item.descripcion)
    );

    if (siblings.length > 0) {
      Swal.fire('Error', 'Los títulos hijos del mismo padre deben tener descripciones distintas.', 'error');
      return false;
    }

    return true;
  }

  GuardarFila(item: ControlAvanceItem, index: number) {
    if (!this.puedeEditarAvance) { return; }
    if (!item.esTitulo && (!item.codigo || !item.tipo || !item.descripcion)) {
      Swal.fire('Error', 'Complete los campos obligatorios: Código, Tipo y Descripción', 'error');
      return;
    }
    if (item.esTitulo && !item.descripcion) {
      Swal.fire('Error', 'Complete la descripción del título', 'error');
      return;
    }

    if (!this.validarTituloHijoUnico(item)) {
      return;
    }

    if (!item.id) {
      return;
    }

    firestoreDB.collection('controlAvance').doc(item.id).update(this.limpiarParaGuardar(item))
      .then(() => this.guardarAncestros(item))
      .catch((error: any) => {
        Swal.fire('Error', 'Error al actualizar: ' + error.message, 'error');
      });
  }

  /** Tras guardar un item, propaga y persiste el recálculo de fechas/avance en sus títulos ancestros. */
  private guardarAncestros(item: ControlAvanceItem) {
    if (!this.puedeEditarAvance) { return; }
    let actual = item;
    let seguridad = 0;
    while (actual.idPadre && seguridad < 20) {
      seguridad++;
      const padre = this.ControlesAvance.find(x => x.id === actual.idPadre);
      if (!padre || !padre.id) { break; }
      firestoreDB.collection('controlAvance').doc(padre.id).update(this.limpiarParaGuardar(padre)).catch(() => {});
      actual = padre;
    }
  }

  OnCambio(item: ControlAvanceItem, index: number) {
    if (!this.puedeEditarAvance) { return; }
    // El recálculo de jerarquía/Gantt reconstruye arreglos completos y repinta la tabla:
    // hacerlo en cada tecla (fechas/números) traba la escritura. Se espera una breve pausa.
    if (this.tiempoRecalculo) {
      clearTimeout(this.tiempoRecalculo);
    }
    this.tiempoRecalculo = setTimeout(() => {
      this.recalcularJerarquiaYAgregados();
      this.actualizarDatosGantt();
    }, 300);

    if (this.tiempoGuardado[index]) {
      clearTimeout(this.tiempoGuardado[index]);
    }

    this.tiempoGuardado[index] = setTimeout(() => {
      const valido = item.esTitulo ? !!item.descripcion : (item.codigo && item.tipo && item.descripcion);
      if (valido && item.id) {
        this.GuardarFila(item, index);
      }
      this.calcularTotalesDocumentos();
    }, 1500);
  }

  onCambioFechaInicioProgramada(item: ControlAvanceItem, index: number) {
    if (!this.puedeEditarAvance) { return; }
    item.fechaInicioProgramadaManual = true;
    this.OnCambio(item, index);
  }

  onCambioFechaTerminoProgramada(item: ControlAvanceItem, index: number) {
    if (!this.puedeEditarAvance) { return; }
    item.fechaTerminoProgramadaManual = true;
    this.OnCambio(item, index);
  }

  cargarUsuariosValidadores() {
    this.cargandoValidadores = true;

    this._sUsuario.getUsuariobyactivo(true).subscribe(
      usuariosActivos => {
        this._sVisUsuarioPersona.getVis_UsuarioPersona().subscribe(
          usuariosPersona => {
            const idsActivos = usuariosActivos.map(u => u.idUsuario);
            const usuariosPersonaActivos = usuariosPersona.filter(up => idsActivos.indexOf(up.idUsuario) !== -1);

            this.usuariosValidadores = usuariosPersonaActivos.map(up => {
              const usuarioMatch = usuariosActivos.find(u => u.idUsuario === up.idUsuario);
              const nombreCompleto = `${up.nombre || ''} ${up.paterno || ''} ${up.materno || ''}`.trim();
              return {
                idUsuario: up.idUsuario,
                nombre: nombreCompleto || (usuarioMatch ? usuarioMatch.nombreUsuario : `Usuario ${up.idUsuario}`),
                nombreUsuario: usuarioMatch ? usuarioMatch.nombreUsuario : '',
                activo: true
              };
            });

            this.usuariosValidadores.sort((a, b) => a.nombre.localeCompare(b.nombre));
            this.cargandoValidadores = false;
            this.sincronizarValidadoresActivos();
            this.ControlesAvance.forEach(item => this.normalizarValidadoresEstado(item));
            this.recalcularEstadoValidacion(true);
          },
          error => {
            console.error('Error al cargar Vis_UsuarioPersona para validadores:', error);
            this.cargandoValidadores = false;
          }
        );
      },
      error => {
        console.error('Error al cargar usuarios activos para validadores:', error);
        this.cargandoValidadores = false;
      }
    );
  }

  private cargarValidadoresSeleccionados() {
    if (this.unsubscribeValidadoresConfig) {
      this.unsubscribeValidadoresConfig();
    }

    this.unsubscribeValidadoresConfig = firestoreDB.collection('controlAvanceConfig')
      .doc(this.getIdConfigValidadores())
      .onSnapshot((doc: any) => {
        this._ngZone.run(() => {
          const data = doc.exists ? doc.data() : null;
          const ids = data && Array.isArray(data.validadoresSeleccionados) ? data.validadoresSeleccionados : [];
          this.validadoresSeleccionados = ids.map((v: any) => Number(v)).filter((v: number) => v > 0);
          this.sincronizarValidadoresActivos();
          this.ControlesAvance.forEach(item => this.normalizarValidadoresEstado(item));
          this.recalcularEstadoValidacion(false);
        });
      }, (error: any) => {
        console.error('Error al cargar validadores seleccionados desde Firestore:', error);
      });
  }

  sincronizarValidadoresActivos() {
    if (!this.usuariosValidadores || this.usuariosValidadores.length === 0) {
      return;
    }

    const idsActivos = this.usuariosValidadores.map(u => u.idUsuario);
    const validadoresFiltrados = this.validadoresSeleccionados.filter(id => idsActivos.includes(id));

    if (validadoresFiltrados.length !== this.validadoresSeleccionados.length) {
      this.validadoresSeleccionados = validadoresFiltrados;
      this.guardarValidadoresSeleccionados();
    }
  }

  private guardarValidadoresSeleccionados() {
    if (!this.puedeEditarAvance) { return; }
    firestoreDB.collection('controlAvanceConfig').doc(this.getIdConfigValidadores())
      .set({ validadoresSeleccionados: this.validadoresSeleccionados }, { merge: true })
      .catch((error: any) => {
        console.error('Error al guardar validadores seleccionados en Firestore:', error);
      });
  }

  normalizarValidadoresEstado(item: ControlAvanceItem) {
    if (!item.validadoresEstado) {
      item.validadoresEstado = {};
    }

    const validadores = this.validadoresSeleccionados;
    const mapaActual = item.validadoresEstado;
    const mapaNormalizado: { [idUsuario: string]: boolean } = {};

    validadores.forEach(idValidador => {
      mapaNormalizado[idValidador] = mapaActual[idValidador] === true;
    });

    item.validadoresEstado = mapaNormalizado;
  }

  esUsuarioGerencia(): boolean {
    if (this.esGerenciaConfirmado) {
      return true;
    }
    return this.usuario && (this.usuario.idPerfil === 1 || this.usuario.idPerfil === 2 || this.usuario.idPerfil === 11);
  }

  puedeEliminarControlAvance(): boolean {
    if (!this.usuario || !this.usuario.idUsuario) {
      return false;
    }

    if (this.esUsuarioGerencia()) {
      return true;
    }

    const idUsuarioActual = Number(this.usuario.idUsuario);
    const idUsuarioCreadorSubProyecto = Number(this.subProyectoActual && this.subProyectoActual.idUsuarioCreador);
    return idUsuarioActual > 0 && idUsuarioActual === idUsuarioCreadorSubProyecto;
  }

  getMensajePermisoEliminacionAvance(): string {
    return 'Solo el creador del subproyecto o un usuario con rol de gerencia pueden eliminar documentos.';
  }

  puedeConfigurarValidadores(): boolean {
    if (!this.usuario || !this.usuario.idPerfil) {
      return true;
    }

    return this.esUsuarioGerencia();
  }

  getValidadoresDocumento(item: ControlAvanceItem): any[] {
    return this.usuariosValidadores.filter(u => this.estaValidadorSeleccionado(u.idUsuario));
  }

  estaValidadorSeleccionado(idValidador: number): boolean {
    return this.validadoresSeleccionados.indexOf(idValidador) !== -1;
  }

  toggleSeleccionValidador(idValidador: number, checked: boolean) {
    if (!this.puedeEditarAvance) { return; }
    const yaExiste = this.validadoresSeleccionados.indexOf(idValidador) !== -1;

    if (checked && !yaExiste) {
      this.validadoresSeleccionados.push(idValidador);
    }

    if (!checked && yaExiste) {
      this.validadoresSeleccionados = this.validadoresSeleccionados.filter(id => id !== idValidador);
    }

    this.validadoresSeleccionados = this.validadoresSeleccionados.sort((a, b) => a - b);
    this.guardarValidadoresSeleccionados();
  }

  puedeUsuarioValidar(idValidador: number): boolean {
    if (this.esUsuarioGerencia()) {
      return true;
    }

    return this.usuario && this.usuario.idUsuario === idValidador;
  }

  estaValidadorAprobado(item: ControlAvanceItem, idValidador: number): boolean {
    if (!item.validadoresEstado) {
      return false;
    }

    return item.validadoresEstado[idValidador] === true;
  }

  toggleValidacionUsuario(item: ControlAvanceItem, index: number, idValidador: number, checked: boolean) {
    if (!this.puedeEditarAvance) { return; }
    if (!this.puedeUsuarioValidar(idValidador)) {
      return;
    }

    if (!item.validadoresEstado) {
      item.validadoresEstado = {};
    }

    item.validadoresEstado[idValidador] = checked === true;
    this.actualizarEstadoPorValidadores(item, index, true);
  }

  actualizarEstadoPorValidadores(item: ControlAvanceItem, index: number, guardar: boolean) {
    const validadoresDoc = this.validadoresSeleccionados;
    if (!validadoresDoc || validadoresDoc.length === 0) {
      return;
    }

    if (!item.validadoresEstado) {
      item.validadoresEstado = {};
    }
    const todosValidados = validadoresDoc.every(idValidador => item.validadoresEstado[idValidador] === true);

    if (todosValidados) {
      item.estado = item.estado === 'VC' ? 'VC' : 'VA';
    } else {
      item.estado = 'NV';
    }

    if (guardar) {
      this.OnCambio(item, index);
    }
  }

  recalcularEstadoValidacion(guardarCambios: boolean) {
    this.ControlesAvance.forEach((item, index) => {
      this.actualizarEstadoPorValidadores(item, index, guardarCambios);
    });
    this.calcularTotalesDocumentos();
  }

  OnCambioEncabezado() {
    return;
  }

  activarEdicion(item: ControlAvanceItem, index: number) {
    if (!this.puedeEditarAvance) { return; }
    this.filaEnEdicion = index;
    this.copiaEdicion = JSON.parse(JSON.stringify(item));
  }

  cancelarEdicion(item: ControlAvanceItem, index: number) {
    if (this.tiempoGuardado[index]) {
      clearTimeout(this.tiempoGuardado[index]);
    }
    if (this.copiaEdicion) {
      Object.assign(item, this.copiaEdicion);
    }
    this.filaEnEdicion = null;
    this.copiaEdicion = null;
    this.recalcularJerarquiaYAgregados();
  }

  confirmarEdicion(item: ControlAvanceItem, index: number) {
    if (!this.puedeEditarAvance) { return; }
    if (this.tiempoGuardado[index]) {
      clearTimeout(this.tiempoGuardado[index]);
    }

    if (!item.esTitulo && (!item.codigo || !item.tipo || !item.descripcion)) {
      Swal.fire('Error', 'Complete los campos obligatorios: Código, Tipo y Descripción', 'error');
      return;
    }
    if (item.esTitulo && !item.descripcion) {
      Swal.fire('Error', 'Complete la descripción del título', 'error');
      return;
    }

    if (!this.validarTituloHijoUnico(item)) {
      return;
    }

    if (item.esTitulo) {
      item.prefijoCodigo = (item.prefijoCodigo || '').toUpperCase();
    }

    if (!item.id) {
      this.filaEnEdicion = null;
      return;
    }

    this.recalcularJerarquiaYAgregados();
    this.actualizarDatosGantt();

    const esTituloConPrefijoEditado = item.esTitulo;
    const idTituloEditado = item.id;

    firestoreDB.collection('controlAvance').doc(item.id).update(this.limpiarParaGuardar(item))
      .then(() => {
        this.guardarAncestros(item);
        this.filaEnEdicion = null;
        this.copiaEdicion = null;

        // Si se editó el prefijo de un título, se renumeran sus láminas para que reflejen el nuevo prefijo.
        if (esTituloConPrefijoEditado) {
          this.renumerarLaminasDeTitulo(idTituloEditado);
        }

        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: 'Los cambios se guardaron correctamente.',
          timer: 1500,
          showConfirmButton: false
        });
      })
      .catch((error: any) => {
        Swal.fire('Error', 'Error al actualizar: ' + error.message, 'error');
      });
  }

  /** Recolecta recursivamente todos los descendientes (hijos, nietos, etc.) de un título, incluyendo sub-títulos anidados. */
  private obtenerDescendientes(idItem: string): ControlAvanceItem[] {
    const claveItem = this.claveJerarquia(idItem);
    const hijosDirectos = this.ControlesAvance.filter(it =>
      this.claveJerarquia(it.idPadre) === claveItem && it.activo !== false
    );
    let resultado: ControlAvanceItem[] = [...hijosDirectos];
    hijosDirectos.forEach(hijo => {
      if (hijo.id) {
        resultado = resultado.concat(this.obtenerDescendientes(hijo.id));
      }
    });
    return resultado;
  }

  /**
   * FIX: al confirmar la eliminación, se marca localmente activo=false de inmediato en el título
   * y todos sus descendientes, y se filtran de ControlesAvance sin esperar el snapshot de Firestore.
   * Así el título y sus láminas desaparecen al instante de la tabla y del Gantt.
   * También se limpian las dependencias que otras actividades tenían hacia lo eliminado.
   */
  PrepararEliminar(index: number) {
    if (!this.puedeEditarAvance) {
      Swal.fire('Edición bloqueada', 'Ingresa la clave para modificar el Control de Avance.', 'info');
      return;
    }
    if (!this.puedeEliminarControlAvance()) {
      Swal.fire('Acceso denegado', this.getMensajePermisoEliminacionAvance(), 'warning');
      return;
    }

    const item = this.ControlesAvance[index];
    if (!item || !item.id) {
      return;
    }

    // Ahora, al eliminar un título, se eliminan también todas sus láminas/subitems (y sub-títulos anidados),
    // en vez de dejarlos huérfanos en la raíz.
    const descendientes = this.obtenerDescendientes(item.id);
    const mensaje = descendientes.length > 0
      ? `Este título tiene ${descendientes.length} lámina(s)/subitem(s) dentro. Al eliminarlo se eliminarán también todos ellos. ¿Continuar?`
      : '¿Esta seguro de eliminar este documento?';

    Swal.fire({
      title: 'Eliminar',
      text: mensaje,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (result.value && this.puedeEditarAvance) {
        this.Loading = true;

        const idPadreParaRenumerar = item.idPadre;
        const eraLamina = !item.esTitulo;

        const todosLosItems = [item, ...descendientes];
        const idsEliminados: { [id: string]: boolean } = {};
        const batch = firestoreDB.batch();
        todosLosItems.forEach(it => {
          if (!it.id) { return; }
          idsEliminados[it.id] = true;
          batch.update(firestoreDB.collection('controlAvance').doc(it.id), {
            activo: false,
            idUsuarioRemovedor: this.usuario.idUsuario
          });
        });

        // Las actividades que dependían de lo eliminado quedan sin esa dependencia.
        this.ControlesAvance.forEach(it => {
          if (!it.id || idsEliminados[it.id] || !Array.isArray(it.dependencias) || it.dependencias.length === 0) { return; }
          const filtradas = it.dependencias.filter(idDep => !idsEliminados[idDep]);
          if (filtradas.length !== it.dependencias.length) {
            it.dependencias = filtradas;
            batch.update(firestoreDB.collection('controlAvance').doc(it.id), { dependencias: filtradas });
          }
        });

        batch.commit()
          .then(() => {
            this.Loading = false;

            // Actualización optimista: no esperamos el snapshot de Firestore para que
            // el título y sus láminas desaparezcan de inmediato de la tabla/gantt.
            todosLosItems.forEach(it => { it.activo = false; });
            this.ControlesAvance = this.ControlesAvance.filter(it => it.activo !== false);
            this.recalcularJerarquiaYAgregados();
            this.actualizarDatosGantt();
            this.calcularTotalesDocumentos();

            Swal.fire('Éxito', descendientes.length > 0 ? 'Título y sus láminas eliminados' : 'Documento eliminado', 'success');

            // Si se eliminó una lámina suelta (no un título), se renumeran sus hermanas restantes
            // para que los códigos queden consecutivos, sin huecos.
            if (eraLamina && idPadreParaRenumerar) {
              setTimeout(() => this.renumerarLaminasDeTitulo(idPadreParaRenumerar), 400);
            }
          })
          .catch((error: any) => {
            this.Loading = false;
            Swal.fire('Error', 'Error al eliminar: ' + error.message, 'error');
          });
      }
    });
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'VA': return 'estado-validado';
      case 'VC': return 'estado-validado-observaciones';
      case 'NV': return 'estado-no-validado';
      case 'P': return 'estado-planificado';
      default: return '';
    }
  }

  getEstadoTextoCompleto(estado: string): string {
    const estadosCompletos = {
      'VA': 'Validado',
      'VC': 'Validado con comentarios',
      'NV': 'No Validado',
      'P': 'Planificado'
    };
    return estadosCompletos[estado] || estado;
  }

  getPorcentajeClass(porcentaje: number): string {
    if (porcentaje < 40) {
      return 'porcentaje-rojo';
    } else if (porcentaje >= 40 && porcentaje <= 70) {
      return 'porcentaje-amarillo';
    } else {
      return 'porcentaje-verde';
    }
  }

  getClaseAvanceReal(avanceReal: number, avanceProgramado: number): string {
    if (!avanceReal && avanceReal !== 0) {
      return '';
    }

    // Si ya está 100% completado, siempre es verde, sin importar cómo venga el avance programado.
    if (avanceReal >= 100) {
      return 'avance-verde';
    }

    if (!avanceProgramado && avanceProgramado !== 0) {
      return '';
    }

    const diferencia = avanceReal - avanceProgramado;

    if (diferencia < -5) {
      return 'avance-rojo';
    } else if (diferencia <= 0) {
      return 'avance-amarillo';
    } else {
      return 'avance-verde';
    }
  }

  /** Convierte 'YYYY-MM-DD' a Date local sin desfases de huso horario. */
  private parsearFechaISO(valor: string): Date | null {
    if (!valor) { return null; }
    const partes = valor.split('-').map(v => Number(v));
    if (partes.length === 3 && !partes.some(isNaN)) {
      return new Date(partes[0], partes[1] - 1, partes[2]);
    }
    const fecha = new Date(valor);
    return isNaN(fecha.getTime()) ? null : fecha;
  }

  /** Cantidad de días (inclusive) entre dos fechas 'YYYY-MM-DD'. Devuelve 0 si falta alguna. */
  private diasEntreFechasISO(desdeStr: string, hastaStr: string): number {
    const desde = this.parsearFechaISO(desdeStr);
    const hasta = this.parsearFechaISO(hastaStr);
    if (!desde || !hasta) { return 0; }
    const msPorDia = 1000 * 60 * 60 * 24;
    return Math.round((hasta.getTime() - desde.getTime()) / msPorDia) + 1;
  }

  private formatearFechaISO(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  /** Suma (plazoDias - 1) días a la fecha de inicio para obtener la fecha de término, igual que "plazo contrato" / "plazo real" del Excel. */
  private calcularFechaTerminoDesdePlazo(fechaInicioStr: string, plazoDias: number): string {
    const fechaInicio = this.parsearFechaISO(fechaInicioStr);
    if (!fechaInicio || !plazoDias || plazoDias <= 0) {
      return '';
    }
    const fechaTermino = new Date(fechaInicio);
    fechaTermino.setDate(fechaTermino.getDate() + (plazoDias - 1));
    return this.formatearFechaISO(fechaTermino);
  }

  /** Recalcula fechaTerminoProgramada/fechaTermino a partir de fecha inicio + plazo en días (solo para items sin hijos). */
  recalcularFechasDesdePlazo(item: ControlAvanceItem) {
    if (!item.fechaTerminoProgramadaManual && item.fechaInicioProgramada && item.plazoProgramado) {
      item.fechaTerminoProgramada = this.calcularFechaTerminoDesdePlazo(item.fechaInicioProgramada, Number(item.plazoProgramado));
    }
    if (item.fechaInicio && item.plazoReal) {
      item.fechaTermino = this.calcularFechaTerminoDesdePlazo(item.fechaInicio, Number(item.plazoReal));
    }
  }


  calcularAvanceProgramado(item: ControlAvanceItem): void {
    if (item.esTitulo) {
      // Si es un título con hijos, su avance programado ya viene calculado por recalcularJerarquiaYAgregados().
      const tieneHijos = this.ControlesAvance.some(it => it.idPadre === item.id);
      if (tieneHijos) { return; }
    }

    if (!item.fechaInicioProgramada || !item.fechaTerminoProgramada) {
      item.avanceProgramado = 0;
      return;
    }

    const crearFechaLocalSinHora = (valor: any): Date => {
      if (!valor) {
        return null;
      }

      if (typeof valor === 'string' && valor.indexOf('-') > -1) {
        const partes = valor.split('-').map(v => Number(v));
        if (partes.length === 3 && !partes.some(isNaN)) {
          return new Date(partes[0], partes[1] - 1, partes[2]);
        }
      }

      const fecha = new Date(valor);
      return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    };

    const fechaInicio = crearFechaLocalSinHora(item.fechaInicioProgramada);
    const fechaTermino = crearFechaLocalSinHora(item.fechaTerminoProgramada);
    const hoy = new Date();
    const fechaHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    if (!fechaInicio || !fechaTermino || isNaN(fechaInicio.getTime()) || isNaN(fechaTermino.getTime())) {
      item.avanceProgramado = 0;
      return;
    }

    if (fechaHoy < fechaInicio) {
      item.avanceProgramado = 0;
      return;
    }

    if (fechaHoy >= fechaTermino) {
      item.avanceProgramado = 100;
      return;
    }

    const diasTotales = Math.floor((fechaTermino.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
    const diasTranscurridos = Math.floor((fechaHoy.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));

    if (diasTotales <= 0) {
      item.avanceProgramado = 0;
      return;
    }

    const porcentaje = Math.round((diasTranscurridos / diasTotales) * 100);
    item.avanceProgramado = Math.min(Math.max(porcentaje, 0), 100);
  }

  getIconoArchivo(nombre: string): string {
    const ext = (nombre || '').split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'fa-file-pdf-o archivo-icono-pdf';
    if (ext === 'xls' || ext === 'xlsx') return 'fa-file-excel-o archivo-icono-excel';
    return 'fa-file-o archivo-icono-generico';
  }

  getTipoClass(tipo: string): string {
    if (!tipo) return '';
    if (tipo.startsWith('ET')) return 'tipo-et';
    if (tipo.startsWith('MC')) return 'tipo-mc';
    if (tipo.startsWith('L')) return 'tipo-l';
    if (tipo.startsWith('I')) return 'tipo-i';
    if (tipo.startsWith('O')) return 'tipo-o';
    if (tipo.startsWith('P')) return 'tipo-p';
    if (tipo.startsWith('R')) return 'tipo-r';
    return '';
}

  // =========================================================================
  // VISTA CARTA GANTT (barras semanales calculadas desde las fechas)
  // =========================================================================

  cambiarVista(vista: 'tabla' | 'gantt') {
    this.vistaActiva = vista;
    if (vista === 'gantt') {
      this.actualizarDatosGantt();
    }
  }

  private parsearFechaLocal(valor: string): Date | null {
    if (!valor) { return null; }
    const partes = valor.split('-').map(v => Number(v));
    if (partes.length === 3 && !partes.some(isNaN)) {
      return new Date(partes[0], partes[1] - 1, partes[2]);
    }
    const fecha = new Date(valor);
    return isNaN(fecha.getTime()) ? null : fecha;
  }

  private diasEntreFechas(desde: Date, hasta: Date): number {
    const msPorDia = 1000 * 60 * 60 * 24;
    return Math.round((hasta.getTime() - desde.getTime()) / msPorDia);
  }

  private nombreMes(mes: number): string {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses[mes] || '';
  }

  /** Un item "tiene fecha propia" cuando puede dibujar su propia barra (inicio programado + plazo programado). */
  private tieneFechaPropia(item: ControlAvanceItem): boolean {
    return !!item.fechaInicioProgramada && !!item.plazoProgramado && item.plazoProgramado > 0;
  }

  /** Recalcula el rango de fechas, las cabeceras semanales y las barras a partir de filasTabla. */
  actualizarDatosGantt() {
    const filasConFechaPropia = this.filasTabla.filter(f =>
      f.item.fechaInicioProgramada || f.item.fechaTerminoProgramada || f.item.fechaInicio || f.item.fechaTermino
    );

    if (filasConFechaPropia.length === 0) {
      this.ganttSemanas = [];
      this.ganttPeriodos = [];
      this.ganttFinesDeSemanaOffsets = [];
      this.ganttBarras = [];
      this.ganttFlechas = [];
      this.ganttDiasTotales = 0;
      this.ganttHoyOffset = -1;
      return;
    }

    let fechaMin: Date | null = null;
    let fechaMax: Date | null = null;

    const considerar = (valor: string) => {
      const f = this.parsearFechaLocal(valor);
      if (!f) { return; }
      if (!fechaMin || f < fechaMin) { fechaMin = f; }
      if (!fechaMax || f > fechaMax) { fechaMax = f; }
    };

    filasConFechaPropia.forEach(f => {
      considerar(f.item.fechaInicioProgramada);
      considerar(f.item.fechaTerminoProgramada);
      considerar(f.item.fechaInicio);
      considerar(f.item.fechaTermino);
    });

    if (!fechaMin || !fechaMax) {
      this.ganttSemanas = [];
      this.ganttPeriodos = [];
      this.ganttFinesDeSemanaOffsets = [];
      this.ganttBarras = [];
      this.ganttFlechas = [];
      this.ganttDiasTotales = 0;
      return;
    }

    // Retrocede al lunes de la semana de inicio, para que las cabeceras semanales queden alineadas
    const diaSemana = (fechaMin.getDay() + 6) % 7; // 0 = lunes
    const inicioRango = new Date(fechaMin);
    inicioRango.setDate(inicioRango.getDate() - diaSemana);

    // Espacio extra al final (solo en pantalla, si se puede editar) para poder arrastrar o estirar
    // una barra más allá de la última fecha. El Excel exportado no incluye este relleno.
    const diasRelleno = this.puedeEditarAvance ? this.GANTT_DIAS_RELLENO : 0;
    const fechaFinVisual = new Date(fechaMax);
    fechaFinVisual.setDate(fechaFinVisual.getDate() + diasRelleno);

    const totalDias = this.diasEntreFechas(inicioRango, fechaFinVisual) + 1;
    this.ganttFechaInicioRango = inicioRango;
    this.ganttDiasTotales = totalDias;
    this.ganttDiasRelleno = diasRelleno;

    // Cabeceras (semanas/días/periodos) y sombreado de fines de semana
    this.construirEscalaGantt(inicioRango, totalDias);

    const hoy = new Date();
    const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    this.ganttHoyOffset = (hoySinHora >= inicioRango && hoySinHora <= fechaFinVisual)
      ? this.diasEntreFechas(inicioRango, hoySinHora)
      : -1;

    // ---- "Escalera": los hijos sin fecha propia (ej. láminas) heredan un tramo del rango de su padre ----
    const hijosPorPadre = this.agruparPorPadre();
    const spanPorId: { [id: string]: { offset: number; ancho: number } } = {};

    const distribuirHijosSinFecha = (idPadre: string, offsetPadre: number, anchoPadre: number) => {
      const hijos = (hijosPorPadre[idPadre] || []).filter(h => h.activo !== false);
      const sinFecha = hijos.filter(h => !this.tieneFechaPropia(h));
      if (sinFecha.length === 0 || anchoPadre <= 0) { return; }

      const anchoPorHijo = Math.max(Math.floor(anchoPadre / sinFecha.length), 1);
      let cursor = offsetPadre;

      sinFecha.forEach((hijo, indice) => {
        const esUltimo = indice === sinFecha.length - 1;
        const anchoAsignado = esUltimo ? Math.max(offsetPadre + anchoPadre - cursor, 1) : anchoPorHijo;
        spanPorId[hijo.id] = { offset: cursor, ancho: anchoAsignado };
        cursor += anchoAsignado;
        // Si esta lámina a su vez tiene hijos propios sin fecha, se reparte otra vez dentro de su tramo.
        distribuirHijosSinFecha(hijo.id, spanPorId[hijo.id].offset, spanPorId[hijo.id].ancho);
      });
    };

    this.ControlesAvance.forEach(item => {
      if (this.tieneFechaPropia(item) && item.id) {
        const inicioProg = this.parsearFechaLocal(item.fechaInicioProgramada);
        const terminoProg = this.parsearFechaLocal(item.fechaTerminoProgramada);
        if (inicioProg && terminoProg) {
          const offset = this.diasEntreFechas(inicioRango, inicioProg);
          const ancho = Math.max(this.diasEntreFechas(inicioProg, terminoProg) + 1, 1);
          spanPorId[item.id] = { offset, ancho };
          distribuirHijosSinFecha(item.id, offset, ancho);
        }
      }
    });

    // Títulos con hijos activos: sus fechas se calculan desde las láminas, no se pueden arrastrar.
    const idsConHijos: { [id: string]: boolean } = {};
    this.ControlesAvance.forEach(it => {
      if (it.activo !== false && it.idPadre) { idsConHijos[it.idPadre] = true; }
    });

    this.ganttBarras = this.filasTabla.map(f => {
      const item = f.item;
      const esGrupo = !!item.esTitulo;
      const esTituloPrincipal = esGrupo && f.nivel === 0;
      const heredado = item.id ? spanPorId[item.id] : undefined;

      const inicioProg = this.parsearFechaLocal(item.fechaInicioProgramada);
      const inicioReal = this.parsearFechaLocal(item.fechaInicio);
      const tienePropia = this.tieneFechaPropia(item);
      const tieneDuracion = tienePropia || (!!item.plazoReal && item.plazoReal > 0);
      const puedeElegirFranja = esTituloPrincipal;

      let esHito = false;
      let esHeredado = false;
      let esFranjaCompleta = false;
      let offsetHito = 0;
      let offset = 0;
      let ancho = 0;
      let anchoRelleno = 0;

      if (esTituloPrincipal && item.mostrarFranjaCompleta) {
        // El usuario eligió la franja completa: tiene prioridad, aunque el título también tenga fecha propia.
        esFranjaCompleta = true;
        offset = 0;
        ancho = totalDias - diasRelleno; // la franja cubre el proyecto, no el espacio extra de arrastre
      } else if (heredado) {
        // Sin fecha propia, pero su padre tiene plazo: hereda un tramo (efecto "escalera").
        esHeredado = true;
        offset = heredado.offset;
        ancho = heredado.ancho;
        const avanceReal = Math.min(Math.max(Number(item.avanceReal) || 0, 0), 100);
        anchoRelleno = Math.round(ancho * avanceReal / 100);
      } else if (!tieneDuracion) {
        const fechaAncla = inicioProg || inicioReal;
        if (fechaAncla) {
          esHito = true;
          offsetHito = this.diasEntreFechas(inicioRango, fechaAncla);
        }
      } else if (item.id && spanPorId[item.id]) {
        offset = spanPorId[item.id].offset;
        ancho = spanPorId[item.id].ancho;
        const avanceReal = Math.min(Math.max(Number(item.avanceReal) || 0, 0), 100);
        anchoRelleno = Math.round(ancho * avanceReal / 100);
      }

      const editable = this.puedeEditarAvance
        && !!item.id
        && !esFranjaCompleta
        && !(esGrupo && idsConHijos[item.id]);
      const asignable = editable && !item.fechaInicioProgramada && !esHito;

      return {
        item,
        indexOriginal: f.indexOriginal,
        nivel: f.nivel,
        esGrupo,
        esTituloPrincipal,
        puedeElegirFranja,
        esFranjaCompleta,
        esHito,
        esHeredado,
        offsetHito,
        offset,
        ancho,
        anchoRelleno,
        clase: this.getClaseAvanceReal(item.avanceReal, item.avanceProgramado) || 'avance-sin-datos',
        editable,
        asignable
      } as BarraGantt;
    });

    // Las flechas de dependencia se calculan después de que Angular pinte las filas (necesitan su posición).
    this.programarFlechasGantt();
  }

  /** Arma las cabeceras de semanas/días, los periodos de la escala activa y los fines de semana del rango. */
  private construirEscalaGantt(inicioRango: Date, totalDias: number) {
    const semanas: Array<{ etiqueta: string; dias: Array<{ numero: number; fecha: Date }> }> = [];
    for (let i = 0; i < totalDias; i++) {
      const fecha = new Date(inicioRango);
      fecha.setDate(fecha.getDate() + i);
      const numeroSemana = Math.floor(i / 7);
      if (!semanas[numeroSemana]) {
        semanas[numeroSemana] = { etiqueta: `Semana ${numeroSemana + 1} - ${this.nombreMes(fecha.getMonth())}`, dias: [] };
      }
      semanas[numeroSemana].dias.push({ numero: fecha.getDate(), fecha });
    }
    this.ganttSemanas = semanas;
    this.recalcularPeriodosGantt(inicioRango, totalDias);

    const findesDeSemana: number[] = [];
    for (let i = 0; i < totalDias; i++) {
      const fecha = new Date(inicioRango);
      fecha.setDate(fecha.getDate() + i);
      if (fecha.getDay() === 0 || fecha.getDay() === 6) {
        findesDeSemana.push(i);
      }
    }
    this.ganttFinesDeSemanaOffsets = findesDeSemana;
  }

  /**
   * Mientras se arrastra/estira una barra hacia la derecha, agranda el rango visible para que no se corte.
   * Las barras no se recalculan: sus offsets siguen siendo relativos al mismo inicio de rango.
   */
  private asegurarRangoGantt(diaFinNecesario: number) {
    if (!this.ganttFechaInicioRango || diaFinNecesario < this.ganttDiasTotales - 7) { return; }
    const extra = Math.max(7, diaFinNecesario - this.ganttDiasTotales + 7);
    this.ganttDiasTotales += extra;
    this.ganttDiasRelleno += extra;
    this.construirEscalaGantt(this.ganttFechaInicioRango, this.ganttDiasTotales);
  }

  get ganttAnchoTotalPx(): number {
    return Math.max(this.ganttPeriodos.length * this.ganttPxPorUnidad, 100);
  }

  cambiarEscalaGantt(escala: 'normal' | 'semana' | 'mes') {
    this.ganttEscala = escala;
    this.ganttPxPorUnidad = escala === 'normal' ? 22 : (escala === 'semana' ? 92 : 130);
    if (this.ganttFechaInicioRango) {
      this.recalcularPeriodosGantt(this.ganttFechaInicioRango, this.ganttDiasTotales);
    }
    this.programarFlechasGantt();
  }

  private recalcularPeriodosGantt(inicioRango: Date, totalDias: number) {
    const periodos: PeriodoGantt[] = [];
    let cursor = 0;
    while (cursor < totalDias) {
      const fecha = new Date(inicioRango);
      fecha.setDate(fecha.getDate() + cursor);
      let dias = this.ganttEscala === 'normal' ? 1 : 7;
      let etiqueta = `${fecha.getDate()} ${this.nombreMes(fecha.getMonth())}`;
      let detalle = `${fecha.getDate()} ${this.nombreMes(fecha.getMonth())}`;

      if (this.ganttEscala === 'mes') {
        dias = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate() - fecha.getDate() + 1;
        etiqueta = `${this.nombreMes(fecha.getMonth())} ${fecha.getFullYear()}`;
        const fechaFin = new Date(fecha);
        fechaFin.setDate(fecha.getDate() + dias - 1);
        detalle = `${String(fecha.getDate()).padStart(2, '0')}-${String(fechaFin.getDate()).padStart(2, '0')} ${this.nombreMes(fecha.getMonth())}`;
      } else if (this.ganttEscala === 'semana') {
        etiqueta = `Sem. ${Math.floor(cursor / 7) + 1} - ${this.nombreMes(fecha.getMonth())}`;
        const fechaFin = new Date(fecha);
        fechaFin.setDate(fecha.getDate() + Math.min(dias, totalDias - cursor) - 1);
        detalle = `${String(fecha.getDate()).padStart(2, '0')}-${String(fechaFin.getDate()).padStart(2, '0')}`;
      } else {
        detalle = String(fecha.getDate());
      }

      dias = Math.min(dias, totalDias - cursor);
      periodos.push({ etiqueta, detalle, inicioDia: cursor, dias });
      cursor += dias;
    }
    this.ganttPeriodos = periodos;
  }

  ganttDiaAPixel(dia: number): number {
    const indicePeriodo = this.ganttPeriodos.findIndex(p => dia >= p.inicioDia && dia < p.inicioDia + p.dias);
    const periodo = indicePeriodo >= 0 ? this.ganttPeriodos[indicePeriodo] : undefined;
    if (!periodo) { return 0; }
    return (indicePeriodo + (dia - periodo.inicioDia) / periodo.dias) * this.ganttPxPorUnidad;
  }

  ganttDiasAPixel(diaInicio: number, dias: number): number {
    let pixel = 0;
    let restantes = dias;
    let cursor = diaInicio;
    while (restantes > 0) {
      const periodo = this.ganttPeriodos.find(p => cursor >= p.inicioDia && cursor < p.inicioDia + p.dias);
      if (!periodo) { break; }
      const diasEnPeriodo = Math.min(restantes, periodo.inicioDia + periodo.dias - cursor);
      pixel += (diasEnPeriodo / periodo.dias) * this.ganttPxPorUnidad;
      cursor += diasEnPeriodo;
      restantes -= diasEnPeriodo;
    }
    return pixel;
  }

  /** Inverso de ganttDiaAPixel: convierte una posición X (px desde el inicio del timeline) a día fraccional del rango. */
  ganttPixelADia(px: number): number {
    if (!this.ganttPeriodos.length) { return 0; }
    const unidad = this.ganttPxPorUnidad;
    const anchoTotal = this.ganttPeriodos.length * unidad;

    // Fuera del rango dibujado se extrapola, para que al arrastrar más allá del borde la barra siga avanzando.
    if (px >= anchoTotal) {
      const ultimo = this.ganttPeriodos[this.ganttPeriodos.length - 1];
      return ultimo.inicioDia + ultimo.dias + ((px - anchoTotal) / unidad) * ultimo.dias;
    }
    if (px < 0) {
      return (px / unidad) * this.ganttPeriodos[0].dias;
    }

    let indice = Math.floor(px / unidad);
    indice = Math.min(Math.max(indice, 0), this.ganttPeriodos.length - 1);
    const periodo = this.ganttPeriodos[indice];
    const fraccion = Math.min(Math.max((px - indice * unidad) / unidad, 0), 1);
    return periodo.inicioDia + fraccion * periodo.dias;
  }

  // =========================================================================
  // EDICIÓN DIRECTA EN LA CARTA GANTT (estilo ClickUp)
  // - Doble clic en la descripción: editar el nombre inline.
  // - Arrastrar una barra: mover su fecha de inicio (mantiene el plazo).
  // - Arrastrar el borde derecho: cambiar el plazo (fecha de término).
  // - Clic en una fila sin fecha: asignar inicio en ese día con plazo por defecto.
  // Solo se guarda en Firestore al soltar el mouse, para que el onSnapshot no
  // reconstruya las barras a mitad del arrastre.
  // =========================================================================

  private fechaDesdeOffsetGantt(offset: number): Date {
    const fecha = new Date(this.ganttFechaInicioRango as Date);
    fecha.setDate(fecha.getDate() + offset);
    return fecha;
  }

  private etiquetaDiaGantt(offset: number): string {
    const fecha = this.fechaDesdeOffsetGantt(offset);
    return `${fecha.getDate()} ${this.nombreMes(fecha.getMonth())}`;
  }

  /** Igual que etiquetaDiaGantt, pero con el día de la semana y el año (para las guías del calendario). */
  private etiquetaDiaLargaGantt(offset: number): string {
    const fecha = this.fechaDesdeOffsetGantt(offset);
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${dias[fecha.getDay()]} ${String(fecha.getDate()).padStart(2, '0')} ${this.nombreMes(fecha.getMonth())} ${fecha.getFullYear()}`;
  }

  private limpiarGuiasArrastreGantt() {
    this.dragGuiaInicioPx = null;
    this.dragGuiaFinPx = null;
    this.dragGuiaInicioTxt = '';
    this.dragGuiaFinTxt = '';
  }

  /** Guarda un cambio hecho desde la Carta Gantt (sin exigir Código/Tipo como GuardarFila). */
  private guardarCambioGantt(item: ControlAvanceItem) {
    if (!this.puedeEditarAvance || !item || !item.id) { return; }
    firestoreDB.collection('controlAvance').doc(item.id).update(this.limpiarParaGuardar(item))
      .then(() => this.guardarAncestros(item))
      .catch((error: any) => {
        Swal.fire('Error', 'No se pudo guardar el cambio: ' + error.message, 'error');
      });
  }

  private refrescarTrasCambioGantt() {
    this.recalcularJerarquiaYAgregados();
    this.actualizarDatosGantt();
    this.calcularTotalesDocumentos();
  }

  /** Huella de los campos programados de cada fila, para detectar qué cambió tras recalcular. */
  private capturarFechasProgramadas(): { [id: string]: string } {
    const huellas: { [id: string]: string } = {};
    const estado = this.capturarEstadoFechasGantt();
    Object.keys(estado).forEach(id => {
      huellas[id] = this.huellaEstadoFechasGantt(estado[id]);
    });
    return huellas;
  }

  private capturarEstadoFechasGantt(): EstadoFechasProgramadasGantt {
    const estado: EstadoFechasProgramadasGantt = {};
    (this.ControlesAvance || []).forEach(item => {
      if (!item.id) { return; }
      estado[item.id] = {
        fechaInicioProgramada: item.fechaInicioProgramada || '',
        fechaInicioProgramadaManual: !!item.fechaInicioProgramadaManual,
        fechaTerminoProgramada: item.fechaTerminoProgramada || '',
        fechaTerminoProgramadaManual: !!item.fechaTerminoProgramadaManual,
        plazoProgramado: Number(item.plazoProgramado) || 0,
        avanceProgramado: Number(item.avanceProgramado) || 0
      };
    });
    return estado;
  }

  private huellaEstadoFechasGantt(estado: EstadoFechasProgramadasGantt[string]): string {
    return [
      estado.fechaInicioProgramada,
      estado.fechaInicioProgramadaManual,
      estado.fechaTerminoProgramada,
      estado.fechaTerminoProgramadaManual,
      estado.plazoProgramado,
      estado.avanceProgramado
    ].join('|');
  }

  private estadosFechasGanttIguales(
    primero: EstadoFechasProgramadasGantt,
    segundo: EstadoFechasProgramadasGantt
  ): boolean {
    const idsPrimero = Object.keys(primero);
    const idsSegundo = Object.keys(segundo);
    if (idsPrimero.length !== idsSegundo.length) { return false; }
    return idsPrimero.every(id =>
      !!segundo[id] && this.huellaEstadoFechasGantt(primero[id]) === this.huellaEstadoFechasGantt(segundo[id])
    );
  }

  private restaurarEstadoFechasGantt(estado: EstadoFechasProgramadasGantt) {
    (this.ControlesAvance || []).forEach(item => {
      if (!item.id || !estado[item.id]) { return; }
      const anterior = estado[item.id];
      item.fechaInicioProgramada = anterior.fechaInicioProgramada;
      item.fechaInicioProgramadaManual = anterior.fechaInicioProgramadaManual;
      item.fechaTerminoProgramada = anterior.fechaTerminoProgramada;
      item.fechaTerminoProgramadaManual = anterior.fechaTerminoProgramadaManual;
      item.plazoProgramado = anterior.plazoProgramado;
      item.avanceProgramado = anterior.avanceProgramado;
    });
  }

  private guardarEstadoFechasGanttEnFirestore(
    objetivo: EstadoFechasProgramadasGantt,
    estadoActual: EstadoFechasProgramadasGantt
  ): Promise<any> {
    if (!this.puedeEditarAvance) {
      return Promise.reject(new Error('La edición del Control de Avance está bloqueada.'));
    }
    const batch = firestoreDB.batch();
    let hayCambios = false;

    (this.ControlesAvance || []).forEach(item => {
      if (!item.id || !objetivo[item.id] || !estadoActual[item.id]) { return; }
      const destino = objetivo[item.id];
      if (this.huellaEstadoFechasGantt(destino) === this.huellaEstadoFechasGantt(estadoActual[item.id])) { return; }

      batch.update(firestoreDB.collection('controlAvance').doc(item.id), {
        fechaInicioProgramada: destino.fechaInicioProgramada,
        fechaInicioProgramadaManual: destino.fechaInicioProgramadaManual,
        fechaTerminoProgramada: destino.fechaTerminoProgramada,
        fechaTerminoProgramadaManual: destino.fechaTerminoProgramadaManual,
        plazoProgramado: destino.plazoProgramado,
        avanceProgramado: destino.avanceProgramado
      });
      hayCambios = true;
    });

    return hayCambios ? batch.commit() : Promise.resolve();
  }

  /**
   * Aplica un cambio de fechas hecho desde la Carta Gantt y lo deja reflejado en la tabla y en Firestore:
   * recalcula la jerarquía (láminas encadenadas que se corren + títulos que las agrupan), corre las
   * actividades dependientes si "Mover dependientes" está activo, y guarda en un solo batch TODAS las
   * filas cuyas fechas/plazo/avance programado cambiaron, no solo la que se movió.
   * Así, al volver a la tabla, recargar o exportar el Excel, se ven exactamente las mismas fechas.
   */
  private aplicarCambioFechasGantt(item: ControlAvanceItem, aplicar: () => void) {
    if (!this.puedeEditarAvance || this.guardandoCambioFechasGantt) { return; }
    const estadoAntes = this.capturarEstadoFechasGantt();
    const antes = this.capturarFechasProgramadas();
    aplicar();
    this.refrescarTrasCambioGantt();

    // Dependencias: las actividades que quedaron empezando antes de que termine su predecesora se corren.
    if (this.reprogramarDependencias && this.propagarDependenciasGantt()) {
      this.refrescarTrasCambioGantt();
    }

    const estadoDespues = this.capturarEstadoFechasGantt();
    const despues = this.capturarFechasProgramadas();

    let hayCambios = false;
    this.ControlesAvance.forEach(it => {
      if (!it.id) { return; }
      if (antes[it.id] !== despues[it.id]) { hayCambios = true; }
    });

    if (!hayCambios) { return; }
    this.guardandoCambioFechasGantt = true;
    this.guardarEstadoFechasGanttEnFirestore(estadoDespues, estadoAntes).then(() => {
      this.ultimoCambioFechasGantt = { antes: estadoAntes, despues: estadoDespues };
      this.guardandoCambioFechasGantt = false;
    }).catch((error: any) => {
      this.restaurarEstadoFechasGantt(estadoAntes);
      this.refrescarTrasCambioGantt();
      this.guardandoCambioFechasGantt = false;
      Swal.fire('Error', 'No se pudo guardar el cambio de fechas: ' + error.message, 'error');
    });
  }

  deshacerCambioFechasGantt() {
    if (!this.puedeEditarAvance) { return; }
    const cambio = this.ultimoCambioFechasGantt;
    if (!cambio || this.guardandoCambioFechasGantt) { return; }

    const estadoActual = this.capturarEstadoFechasGantt();
    if (!this.estadosFechasGanttIguales(estadoActual, cambio.despues)) {
      this.ultimoCambioFechasGantt = null;
      Swal.fire('No se puede deshacer', 'Las fechas cambiaron después de este movimiento. Haz el movimiento nuevamente si necesitas deshacerlo.', 'info');
      return;
    }

    this.guardandoCambioFechasGantt = true;
    this.restaurarEstadoFechasGantt(cambio.antes);
    this.refrescarTrasCambioGantt();

    this.guardarEstadoFechasGanttEnFirestore(cambio.antes, estadoActual).then(() => {
      this.ultimoCambioFechasGantt = null;
      this.guardandoCambioFechasGantt = false;
      Swal.fire({
        title: 'Movimiento deshecho',
        icon: 'success',
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }).catch((error: any) => {
      this.restaurarEstadoFechasGantt(estadoActual);
      this.refrescarTrasCambioGantt();
      this.guardandoCambioFechasGantt = false;
      Swal.fire('Error', 'No se pudo deshacer el movimiento: ' + error.message, 'error');
    });
  }

  // ---- 1) Nombre inline ----

  iniciarEdicionNombreGantt(barra: BarraGantt) {
    if (!this.puedeEditarAvance || !barra || !barra.item.id) { return; }
    this.editandoNombreGanttId = barra.item.id;
    this.nombreGanttOriginal = barra.item.descripcion || '';
    setTimeout(() => {
      const input = document.getElementById('gantt-input-nombre') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  confirmarNombreGantt(barra: BarraGantt) {
    // Enter dispara confirmar y luego el blur al desaparecer el input: el segundo llamado se ignora.
    if (this.editandoNombreGanttId !== barra.item.id) { return; }
    if (!this.puedeEditarAvance) {
      this.cancelarNombreGantt(barra);
      return;
    }
    const item = barra.item;
    this.editandoNombreGanttId = null;

    item.descripcion = (item.descripcion || '').trim();
    if (!item.descripcion) {
      item.descripcion = this.nombreGanttOriginal;
      return;
    }
    if (item.descripcion === this.nombreGanttOriginal) { return; }
    if (!this.validarTituloHijoUnico(item)) {
      item.descripcion = this.nombreGanttOriginal;
      return;
    }
    this.guardarCambioGantt(item);
  }

  cancelarNombreGantt(barra: BarraGantt) {
    if (this.editandoNombreGanttId !== barra.item.id) { return; }
    barra.item.descripcion = this.nombreGanttOriginal;
    this.editandoNombreGanttId = null;
  }

  // ---- 2) y 3) Arrastrar barra (mover) o su borde derecho (estirar) ----

  iniciarArrastreGantt(event: MouseEvent, barra: BarraGantt, modo: 'mover' | 'estirar') {
    if (this.guardandoCambioFechasGantt || !barra || !barra.editable || event.button !== 0 || !this.ganttFechaInicioRango) { return; }
    if (modo === 'estirar' && barra.esHito) { return; }
    if (this.filaEnEdicion === barra.indexOriginal) { return; }

    event.preventDefault();
    event.stopPropagation();

    const objetivo: any = event.target;
    const fila: HTMLElement = objetivo && objetivo.closest ? objetivo.closest('.gantt-fila') : null;
    if (!fila) { return; }

    const filaLeft = fila.getBoundingClientRect().left;
    const scrollEl: HTMLElement = (fila as any).closest ? (fila as any).closest('.gantt-scroll') : null;
    const nombresEl: HTMLElement = scrollEl ? scrollEl.querySelector('.gantt-nombres') as HTMLElement : null;
    this.dragGantt = {
      modo,
      barra,
      filaEl: fila,
      scrollEl: scrollEl,
      nombresAncho: nombresEl ? nombresEl.offsetWidth : 0,
      diaInicioMouse: this.ganttPixelADia(event.clientX - filaLeft),
      offsetOriginal: barra.esHito ? barra.offsetHito : barra.offset,
      anchoOriginal: barra.esHito ? 0 : barra.ancho,
      delta: 0,
      movido: false
    };
    this.dragGanttId = barra.item.id;
    this.dragGanttEtiqueta = '';
    this.aplicarPreviewArrastreGantt(); // las guías con la fecha aparecen apenas se presiona
    document.body.classList.add(modo === 'mover' ? 'gantt-arrastrando-mover' : 'gantt-arrastrando-estirar');

    // Los mousemove se escuchan fuera de Angular; solo se entra a la zona cuando cambia el día.
    this._ngZone.runOutsideAngular(() => {
      this.listenerMouseMoveGantt = (e: MouseEvent) => this.onMouseMoveGantt(e);
      this.listenerMouseUpGantt = (e: MouseEvent) => this.onMouseUpGantt(e);
      document.addEventListener('mousemove', this.listenerMouseMoveGantt);
      document.addEventListener('mouseup', this.listenerMouseUpGantt);
    });
  }

  private onMouseMoveGantt(event: MouseEvent) {
    const drag = this.dragGantt;
    if (!drag) { return; }

    // Auto-scroll: al acercarse al borde derecho (o al borde de la columna de nombres) el gráfico se desplaza.
    if (drag.scrollEl) {
      const rect = drag.scrollEl.getBoundingClientRect();
      const margen = 48;
      if (event.clientX > rect.right - margen) {
        drag.scrollEl.scrollLeft += 28;
      } else if (event.clientX < rect.left + drag.nombresAncho + margen) {
        drag.scrollEl.scrollLeft -= 28;
      }
    }

    // La posición de la fila se relee siempre: con el scroll se corre respecto de la pantalla.
    const filaLeft = drag.filaEl.getBoundingClientRect().left;
    const diaActual = this.ganttPixelADia(event.clientX - filaLeft);
    const delta = Math.round(diaActual - drag.diaInicioMouse);
    if (delta === drag.delta) { return; }

    this._ngZone.run(() => {
      drag.delta = delta;
      if (delta !== 0) { drag.movido = true; }
      this.aplicarPreviewArrastreGantt();
    });
  }

  private aplicarPreviewArrastreGantt() {
    const drag = this.dragGantt;
    if (!drag) { return; }
    const barra = drag.barra;

    if (drag.modo === 'mover') {
      const nuevoOffset = Math.max(0, drag.offsetOriginal + drag.delta);
      if (barra.esHito) {
        barra.offsetHito = nuevoOffset;
      } else {
        barra.offset = nuevoOffset;
      }
    } else {
      barra.ancho = Math.max(1, drag.anchoOriginal + drag.delta);
    }

    // Si la barra llega al final de lo visible, el rango crece para seguir arrastrando.
    this.asegurarRangoGantt(barra.esHito ? barra.offsetHito + 1 : barra.offset + barra.ancho);

    if (barra.esHito) {
      this.dragGanttEtiqueta = this.etiquetaDiaGantt(barra.offsetHito);
      this.dragGuiaInicioPx = this.ganttDiaAPixel(barra.offsetHito);
      this.dragGuiaInicioTxt = this.etiquetaDiaLargaGantt(barra.offsetHito);
      this.dragGuiaFinPx = null;
      this.dragGuiaFinTxt = '';
    } else {
      const avanceReal = Math.min(Math.max(Number(barra.item.avanceReal) || 0, 0), 100);
      barra.anchoRelleno = Math.round(barra.ancho * avanceReal / 100);
      this.dragGanttEtiqueta = `${this.etiquetaDiaGantt(barra.offset)} → ${this.etiquetaDiaGantt(barra.offset + barra.ancho - 1)} · ${barra.ancho} día${barra.ancho === 1 ? '' : 's'}`;

      // La fecha va apareciendo en el calendario a medida que la barra se mueve o se alarga.
      this.dragGuiaFinPx = this.ganttDiaAPixel(barra.offset) + this.ganttDiasAPixel(barra.offset, barra.ancho);
      this.dragGuiaFinTxt = `Término: ${this.etiquetaDiaLargaGantt(barra.offset + barra.ancho - 1)}`;
      if (drag.modo === 'mover') {
        this.dragGuiaInicioPx = this.ganttDiaAPixel(barra.offset);
        this.dragGuiaInicioTxt = `Inicio: ${this.etiquetaDiaLargaGantt(barra.offset)}`;
      } else {
        this.dragGuiaInicioPx = null;
        this.dragGuiaInicioTxt = '';
      }
    }

    // Las flechas de dependencia siguen a la barra en vivo (y se ponen rojas si queda en conflicto).
    this.construirFlechasGantt();
  }

  private onMouseUpGantt(event: MouseEvent) {
    this.quitarListenersArrastreGantt();
    this._ngZone.run(() => {
      const drag = this.dragGantt;
      this.dragGantt = null;
      this.dragGanttId = null;
      this.dragGanttEtiqueta = '';
      this.limpiarGuiasArrastreGantt();
      if (!this.puedeEditarAvance) { return; }
      if (!drag || !drag.movido) { return; }

      // Evita que el click que dispara el navegador al soltar se interprete como "asignar fecha".
      this.ignorarClickGantt = true;
      setTimeout(() => { this.ignorarClickGantt = false; }, 50);

      const barra = drag.barra;
      const item = barra.item;
      const offsetFinal = barra.esHito ? barra.offsetHito : barra.offset;
      const esHito = barra.esHito;
      const anchoFinal = barra.ancho;

      this.aplicarCambioFechasGantt(item, () => {
        item.fechaInicioProgramada = this.formatearFechaISO(this.fechaDesdeOffsetGantt(offsetFinal));
        item.fechaInicioProgramadaManual = true; // si no, el encadenamiento la devuelve al término de la anterior

        if (!esHito) {
          item.plazoProgramado = anchoFinal;
          item.fechaTerminoProgramadaManual = false;
          item.fechaTerminoProgramada = this.calcularFechaTerminoDesdePlazo(item.fechaInicioProgramada, anchoFinal);
        }
      });

      // Si al final no cambió nada (volvió a su lugar), igual se redibujan las flechas en su posición real.
      this.construirFlechasGantt();
    });
  }

  private quitarListenersArrastreGantt() {
    if (this.listenerMouseMoveGantt) {
      document.removeEventListener('mousemove', this.listenerMouseMoveGantt);
      this.listenerMouseMoveGantt = null;
    }
    if (this.listenerMouseUpGantt) {
      document.removeEventListener('mouseup', this.listenerMouseUpGantt);
      this.listenerMouseUpGantt = null;
    }
    document.body.classList.remove('gantt-arrastrando-mover', 'gantt-arrastrando-estirar');
  }

  // ---- 4) Clic en una fila sin fecha: asigna inicio en ese día ----

  onClickFilaGantt(event: MouseEvent, barra: BarraGantt) {
    if (this.guardandoCambioFechasGantt || this.ignorarClickGantt || !barra || !barra.asignable || !this.ganttFechaInicioRango) { return; }
    if (this.filaEnEdicion === barra.indexOriginal) { return; }

    const objetivo: any = event.target;
    if (objetivo && objetivo.closest && objetivo.closest('.gantt-barra, .gantt-hito, .gantt-conector')) { return; }

    const fila = event.currentTarget as HTMLElement;
    const dia = Math.floor(this.ganttPixelADia(event.clientX - fila.getBoundingClientRect().left));
    const item = barra.item;

    this.aplicarCambioFechasGantt(item, () => {
      item.fechaInicioProgramada = this.formatearFechaISO(this.fechaDesdeOffsetGantt(dia));
      item.fechaInicioProgramadaManual = true;
      if (!item.plazoProgramado || item.plazoProgramado <= 0) {
        item.plazoProgramado = this.PLAZO_DEFECTO_GANTT;
      }
      item.fechaTerminoProgramadaManual = false;
      item.fechaTerminoProgramada = this.calcularFechaTerminoDesdePlazo(item.fechaInicioProgramada, Number(item.plazoProgramado));
    });
  }

  // ---- 4b) Doble clic en una barra: escribir fecha de inicio y plazo exactos ----

  abrirEditorFechasGantt(event: MouseEvent, barra: BarraGantt) {
    if (this.guardandoCambioFechasGantt || !barra || !barra.editable || this.filaEnEdicion === barra.indexOriginal) { return; }
    event.preventDefault();
    event.stopPropagation();

    const item = barra.item;
    let inicio = item.fechaInicioProgramada || '';
    let plazo = Number(item.plazoProgramado) || 0;

    // Barra "escalera" (sin fecha propia): se proponen las fechas del tramo que está mostrando.
    if (!inicio && this.ganttFechaInicioRango) {
      inicio = this.formatearFechaISO(this.fechaDesdeOffsetGantt(barra.esHito ? barra.offsetHito : barra.offset));
      if (!plazo && !barra.esHito) { plazo = barra.ancho; }
    }

    const anchoEditor = 270;
    const altoEditor = 210;
    this.editorFechasGantt = {
      barra,
      inicio,
      inicioTexto: this.isoADdmmaaaa(inicio),
      plazo,
      x: Math.max(8, Math.min(event.clientX + 10, window.innerWidth - anchoEditor - 8)),
      y: Math.max(8, Math.min(event.clientY + 12, window.innerHeight - altoEditor - 8))
    };

    setTimeout(() => {
      const input = document.getElementById('gantt-editor-inicio') as HTMLInputElement;
      if (input) { input.focus(); }
    }, 0);
  }

  /** Fecha de término que resultará con la fecha de inicio y el plazo escritos en el editor. */
  get terminoEditorFechasGantt(): string {
    const editor = this.editorFechasGantt;
    if (!editor || !editor.inicio || !(Number(editor.plazo) > 0)) { return ''; }
    const termino = this.parsearFechaISO(this.calcularFechaTerminoDesdePlazo(editor.inicio, Number(editor.plazo)));
    if (!termino) { return ''; }
    return `${String(termino.getDate()).padStart(2, '0')}/${String(termino.getMonth() + 1).padStart(2, '0')}/${termino.getFullYear()}`;
  }

  cerrarEditorFechasGantt() {
    this.editorFechasGantt = null;
  }

  // ---- Fechas de la tabla en formato dd/mm/aaaa (el input date nativo las muestra según el idioma del navegador) ----

  /** Texto dd/mm/aaaa que se muestra en la tabla para una fecha guardada como 'YYYY-MM-DD'. */
  fechaVista(iso: string): string {
    return this.isoADdmmaaaa(iso);
  }

  /** Avisa el cambio de fecha con el mismo flujo que usaba el input date de cada columna. */
  private notificarCambioFechaTabla(item: ControlAvanceItem, campo: string, index: number) {
    if (index < 0) { return; } // formulario de creación: solo se asigna el valor, no hay fila que recalcular
    if (campo === 'fechaInicioProgramada') {
      this.onCambioFechaInicioProgramada(item, index);
    } else if (campo === 'fechaTerminoProgramada') {
      this.onCambioFechaTerminoProgramada(item, index);
    } else {
      this.OnCambio(item, index);
    }
  }

  /**
   * Mientras se escribe una fecha en la tabla: deja solo números y agrega las "/" (dd/mm/aaaa).
   * Solo actualiza el dato cuando la fecha está completa y es válida (o cuando se borra entera).
   */
  onInputFechaTabla(input: HTMLInputElement, item: ControlAvanceItem, campo: string, index: number) {
    if (!input || !item) { return; }
    if (!this.puedeEditarAvance) {
      this.restaurarFechaTabla(input, item, campo);
      return;
    }
    const digitos = (input.value || '').replace(/\D/g, '').substring(0, 8);
    let texto = digitos;
    if (digitos.length > 4) {
      texto = `${digitos.substring(0, 2)}/${digitos.substring(2, 4)}/${digitos.substring(4)}`;
    } else if (digitos.length > 2) {
      texto = `${digitos.substring(0, 2)}/${digitos.substring(2)}`;
    }
    input.value = texto;

    if (!texto) {
      if ((item as any)[campo]) {
        (item as any)[campo] = '';
        this.notificarCambioFechaTabla(item, campo, index);
      }
      return;
    }

    const iso = this.ddmmaaaaAIso(texto);
    if (iso && iso !== (item as any)[campo]) {
      (item as any)[campo] = iso;
      this.notificarCambioFechaTabla(item, campo, index);
    }
  }

  /** Al salir del campo: si quedó una fecha a medio escribir o inválida, vuelve a mostrar la guardada. */
  restaurarFechaTabla(input: HTMLInputElement, item: ControlAvanceItem, campo: string) {
    if (!input || !item) { return; }
    input.value = this.isoADdmmaaaa((item as any)[campo]);
  }

  /** Fecha elegida con el botón de calendario de la tabla (llega como 'YYYY-MM-DD'). */
  onPickerFechaTabla(valorIso: string, item: ControlAvanceItem, campo: string, index: number) {
    if (!this.puedeEditarAvance) { return; }
    if (!item || !valorIso || valorIso === (item as any)[campo]) { return; }
    (item as any)[campo] = valorIso;
    this.notificarCambioFechaTabla(item, campo, index);
  }

  /** 'YYYY-MM-DD' -> 'DD/MM/YYYY' (formato chileno que se muestra en el editor). */
  private isoADdmmaaaa(iso: string): string {
    const fecha = this.parsearFechaISO(iso);
    if (!fecha) { return ''; }
    return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
  }

  /** 'DD/MM/YYYY' -> 'YYYY-MM-DD'. Devuelve '' si está incompleta o no es una fecha real (ej: 31/02/2026). */
  private ddmmaaaaAIso(texto: string): string {
    const partes = (texto || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!partes) { return ''; }
    const dia = Number(partes[1]);
    const mes = Number(partes[2]);
    const anio = Number(partes[3]);
    const fecha = new Date(anio, mes - 1, dia);
    if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) { return ''; }
    return this.formatearFechaISO(fecha);
  }

  /** Mientras se escribe la fecha en el editor: deja solo números y agrega las "/" solas (dd/mm/aaaa). */
  onInputFechaEditorGantt(input: HTMLInputElement) {
    if (!this.puedeEditarAvance) { return; }
    if (!this.editorFechasGantt || !input) { return; }
    const digitos = (input.value || '').replace(/\D/g, '').substring(0, 8);
    let texto = digitos;
    if (digitos.length > 4) {
      texto = `${digitos.substring(0, 2)}/${digitos.substring(2, 4)}/${digitos.substring(4)}`;
    } else if (digitos.length > 2) {
      texto = `${digitos.substring(0, 2)}/${digitos.substring(2)}`;
    }
    input.value = texto;
    this.editorFechasGantt.inicioTexto = texto;
    this.editorFechasGantt.inicio = this.ddmmaaaaAIso(texto);
  }

  /** Fecha elegida con el botón de calendario (llega como 'YYYY-MM-DD'). */
  onPickerFechaEditorGantt(valorIso: string) {
    if (!this.puedeEditarAvance) { return; }
    if (!this.editorFechasGantt || !valorIso) { return; }
    this.editorFechasGantt.inicio = valorIso;
    this.editorFechasGantt.inicioTexto = this.isoADdmmaaaa(valorIso);
  }

  guardarEditorFechasGantt() {
    if (!this.puedeEditarAvance) { return; }
    const editor = this.editorFechasGantt;
    if (!editor || this.guardandoCambioFechasGantt) { return; }
    if (!editor.inicio) {
      if (editor.inicioTexto) {
        Swal.fire('Fecha inválida', 'Escribe la fecha como dd/mm/aaaa (ej: 28/09/2026).', 'info');
      } else {
        Swal.fire('Falta la fecha', 'Ingresa la fecha de inicio.', 'info');
      }
      return;
    }
    const plazo = Math.max(0, Math.round(Number(editor.plazo) || 0));
    const item = editor.barra.item;
    const inicio = editor.inicio;
    this.editorFechasGantt = null;

    this.aplicarCambioFechasGantt(item, () => {
      item.fechaInicioProgramada = inicio;
      item.fechaInicioProgramadaManual = true;
      item.plazoProgramado = plazo;
      item.fechaTerminoProgramadaManual = false;
      // Plazo 0 = hito (fecha puntual sin duración), igual que en la tabla.
      item.fechaTerminoProgramada = plazo > 0 ? this.calcularFechaTerminoDesdePlazo(inicio, plazo) : '';
    });
  }

  // =========================================================================
  // DEPENDENCIAS ENTRE BARRAS (estilo ClickUp)
  // - Al pasar el mouse por una barra aparecen dos puntitos (inicio y fin).
  // - Arrastrar el puntito del FIN hasta otra barra: la otra depende de esta.
  // - Arrastrar el puntito del INICIO hasta otra barra: esta depende de la otra.
  // - Dependencia termina → inicia: la dependiente empieza el día siguiente al
  //   término de su predecesora. Si "Mover dependientes" está activo, al mover
  //   una barra las dependientes se corren solas; si no, la flecha queda roja.
  // - Clic en una flecha para quitar la dependencia.
  // =========================================================================

  toggleReprogramarDependencias(valor: boolean) {
    this.reprogramarDependencias = !!valor;
    try {
      localStorage.setItem(ControlAvanceComponent.KEY_REPROGRAMAR_DEPENDENCIAS, valor ? '1' : '0');
    } catch (error) {
      // sin localStorage la preferencia solo dura mientras la pantalla esté abierta
    }
  }

  trackByFlecha(index: number, flecha: FlechaGantt): string {
    return flecha.id;
  }

  /** Una barra se puede conectar si se puede editar y tiene algo dibujado (barra o hito). */
  esBarraConectable(barra: BarraGantt): boolean {
    return !!barra && barra.editable && !!barra.item.id && (barra.esHito || barra.ancho > 0);
  }

  /** X (px) donde empieza una barra o un hito dentro del timeline. */
  xInicioBarraGantt(barra: BarraGantt): number {
    if (barra.esHito) { return this.ganttDiaAPixel(barra.offsetHito) - 6; }
    return this.ganttDiaAPixel(barra.offset);
  }

  /** X (px) donde termina una barra o un hito dentro del timeline. */
  xFinBarraGantt(barra: BarraGantt): number {
    if (barra.esHito) { return this.ganttDiaAPixel(barra.offsetHito) + 6; }
    return this.ganttDiaAPixel(barra.offset) + this.ganttDiasAPixel(barra.offset, barra.ancho);
  }

  private obtenerTimelineGantt(): HTMLElement | null {
    const raiz: HTMLElement = this._elementRef ? this._elementRef.nativeElement : null;
    return raiz ? raiz.querySelector('.gantt-timeline') as HTMLElement : null;
  }

  /** Mide y redibuja las flechas después de que Angular pinte las filas del Gantt. */
  programarFlechasGantt() {
    if (this.timerFlechasGantt) { clearTimeout(this.timerFlechasGantt); }
    this.timerFlechasGantt = setTimeout(() => {
      this.timerFlechasGantt = null;
      this.medirFilasGantt();
      this.construirFlechasGantt();
    }, 0);
  }

  /** Guarda el centro vertical de cada fila del timeline (relativo al propio timeline). */
  private medirFilasGantt() {
    this.ganttFilasY = {};
    const timeline = this.obtenerTimelineGantt();
    if (!timeline) {
      this.ganttAltoTimeline = 0;
      return;
    }
    const topTimeline = timeline.getBoundingClientRect().top;
    const filas = timeline.querySelectorAll('.gantt-fila[data-gantt-id]');
    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i] as HTMLElement;
      const rect = fila.getBoundingClientRect();
      const id = fila.getAttribute('data-gantt-id');
      if (id) {
        this.ganttFilasY[id] = rect.top - topTimeline + rect.height / 2;
      }
      if (i === 0 && rect.height > 0) {
        this.ganttAltoFila = rect.height;
      }
    }
    this.ganttAltoTimeline = timeline.scrollHeight;
  }

  /** Calcula el trazo de todas las flechas visibles a partir de las barras y las filas medidas. */
  construirFlechasGantt() {
    const barraPorId: { [id: string]: BarraGantt } = {};
    this.ganttBarras.forEach(b => {
      if (b.item.id) { barraPorId[b.item.id] = b; }
    });

    const flechas: FlechaGantt[] = [];
    this.ganttBarras.forEach(dependiente => {
      const idDependiente = dependiente.item.id;
      if (!idDependiente || !(dependiente.esHito || dependiente.ancho > 0)) { return; }

      (dependiente.item.dependencias || []).forEach(idPredecesora => {
        const predecesora = barraPorId[idPredecesora];
        if (!predecesora || !(predecesora.esHito || predecesora.ancho > 0)) { return; }

        const y1 = this.ganttFilasY[idPredecesora];
        const y2 = this.ganttFilasY[idDependiente];
        if (y1 === undefined || y2 === undefined) { return; }

        const x1 = this.xFinBarraGantt(predecesora);
        const x2 = this.xInicioBarraGantt(dependiente);
        const finPredecesora = predecesora.esHito ? predecesora.offsetHito : predecesora.offset + predecesora.ancho - 1;
        const inicioDependiente = dependiente.esHito ? dependiente.offsetHito : dependiente.offset;

        flechas.push({
          id: `${idPredecesora}>${idDependiente}`,
          idPredecesora,
          idDependiente,
          d: this.trazoFlechaGantt(x1, y1, x2, y2),
          punta: `M ${x2 - 7} ${y2 - 4} L ${x2} ${y2} L ${x2 - 7} ${y2 + 4} Z`,
          conflicto: inicioDependiente <= finPredecesora
        });
      });
    });

    this.ganttFlechas = flechas;
  }

  /** Línea con codos en ángulo recto, como las de ClickUp. */
  private trazoFlechaGantt(x1: number, y1: number, x2: number, y2: number): string {
    const salida = 10;
    if (x2 - x1 >= salida * 2) {
      const xCodo = x1 + salida;
      return `M ${x1} ${y1} H ${xCodo} V ${y2} H ${x2 - 6}`;
    }
    // La dependiente empieza antes (o casi encima) del fin de la predecesora: la línea rodea pasando entre las filas.
    const mitadFila = this.ganttAltoFila / 2;
    const yEntreFilas = y2 > y1 ? y2 - mitadFila : y2 + mitadFila;
    return `M ${x1} ${y1} H ${x1 + salida} V ${yEntreFilas} H ${x2 - salida} V ${y2} H ${x2 - 6}`;
  }

  /** Mousedown en un puntito: empieza a dibujar la línea punteada hacia otra barra. */
  iniciarConexionGantt(event: MouseEvent, barra: BarraGantt, extremo: 'inicio' | 'fin') {
    if (!this.puedeEditarAvance || this.guardandoCambioFechasGantt || event.button !== 0 || !this.esBarraConectable(barra)) { return; }
    event.preventDefault();
    event.stopPropagation();

    const timeline = this.obtenerTimelineGantt();
    if (!timeline) { return; }
    this.medirFilasGantt();
    const y = this.ganttFilasY[barra.item.id];
    if (y === undefined) { return; }
    const x = extremo === 'fin' ? this.xFinBarraGantt(barra) : this.xInicioBarraGantt(barra);

    const scrollEl: HTMLElement = (timeline as any).closest ? (timeline as any).closest('.gantt-scroll') : null;
    const nombresEl: HTMLElement = scrollEl ? scrollEl.querySelector('.gantt-nombres') as HTMLElement : null;

    this.conexionGantt = {
      origen: barra,
      extremo,
      x1: x,
      y1: y,
      x2: x,
      y2: y,
      destinoId: null,
      scrollEl,
      nombresAncho: nombresEl ? nombresEl.offsetWidth : 0
    };
    document.body.classList.add('gantt-conectando');

    this._ngZone.runOutsideAngular(() => {
      this.listenerMouseMoveConexion = (e: MouseEvent) => this.onMouseMoveConexionGantt(e);
      this.listenerMouseUpConexion = (e: MouseEvent) => this.onMouseUpConexionGantt(e);
      document.addEventListener('mousemove', this.listenerMouseMoveConexion);
      document.addEventListener('mouseup', this.listenerMouseUpConexion);
    });
  }

  private onMouseMoveConexionGantt(event: MouseEvent) {
    const conexion = this.conexionGantt;
    if (!conexion) { return; }

    if (conexion.scrollEl) {
      const rectScroll = conexion.scrollEl.getBoundingClientRect();
      const margen = 48;
      if (event.clientX > rectScroll.right - margen) {
        conexion.scrollEl.scrollLeft += 24;
      } else if (event.clientX < rectScroll.left + conexion.nombresAncho + margen) {
        conexion.scrollEl.scrollLeft -= 24;
      }
    }

    const timeline = this.obtenerTimelineGantt();
    if (!timeline) { return; }
    const rect = timeline.getBoundingClientRect();
    const destinoId = this.idBarraBajoPunteroGantt(event.clientX, event.clientY, conexion.origen.item.id);

    this._ngZone.run(() => {
      conexion.x2 = event.clientX - rect.left;
      conexion.y2 = event.clientY - rect.top;
      conexion.destinoId = destinoId;
    });
  }

  /** Id de la fila (timeline o columna de nombres) que está bajo el mouse, si se puede conectar. */
  private idBarraBajoPunteroGantt(x: number, y: number, idOrigen: string): string | null {
    const elemento: any = document.elementFromPoint(x, y);
    const fila = elemento && elemento.closest ? elemento.closest('[data-gantt-id]') : null;
    if (!fila) { return null; }
    const id = fila.getAttribute('data-gantt-id');
    if (!id || id === idOrigen) { return null; }
    const barra = this.ganttBarras.find(b => b.item.id === id);
    return barra && this.esBarraConectable(barra) ? id : null;
  }

  private onMouseUpConexionGantt(event: MouseEvent) {
    this.quitarListenersConexionGantt();
    this._ngZone.run(() => {
      const conexion = this.conexionGantt;
      this.conexionGantt = null;
      if (!conexion) { return; }

      // Evita que el click al soltar sobre una fila sin fecha le asigne una fecha.
      this.ignorarClickGantt = true;
      setTimeout(() => { this.ignorarClickGantt = false; }, 50);

      if (!this.puedeEditarAvance) { return; }
      const idOrigen = conexion.origen.item.id;
      const idDestino = this.idBarraBajoPunteroGantt(event.clientX, event.clientY, idOrigen) || conexion.destinoId;
      if (!idDestino) { return; }

      if (conexion.extremo === 'fin') {
        this.crearDependenciaGantt(idOrigen, idDestino);
      } else {
        this.crearDependenciaGantt(idDestino, idOrigen);
      }
    });
  }

  private quitarListenersConexionGantt() {
    if (this.listenerMouseMoveConexion) {
      document.removeEventListener('mousemove', this.listenerMouseMoveConexion);
      this.listenerMouseMoveConexion = null;
    }
    if (this.listenerMouseUpConexion) {
      document.removeEventListener('mouseup', this.listenerMouseUpConexion);
      this.listenerMouseUpConexion = null;
    }
    document.body.classList.remove('gantt-conectando');
  }

  private cancelarConexionGantt() {
    this.quitarListenersConexionGantt();
    this.conexionGantt = null;
  }

  /** true si `idItem` depende (directa o indirectamente) de `idBuscado`. Sirve para evitar ciclos. */
  private dependeDeGantt(idItem: string, idBuscado: string): boolean {
    const porId: { [id: string]: ControlAvanceItem } = {};
    this.ControlesAvance.forEach(it => { if (it.id) { porId[it.id] = it; } });

    const visitados: { [id: string]: boolean } = {};
    const pendientes: string[] = [idItem];
    while (pendientes.length > 0) {
      const actual = pendientes.pop() as string;
      if (visitados[actual]) { continue; }
      visitados[actual] = true;
      const item = porId[actual];
      if (!item) { continue; }
      const deps = item.dependencias || [];
      for (let i = 0; i < deps.length; i++) {
        if (deps[i] === idBuscado) { return true; }
        pendientes.push(deps[i]);
      }
    }
    return false;
  }

  /** Crea la dependencia "idDependiente empieza cuando termina idPredecesora" y la guarda en Firestore. */
  crearDependenciaGantt(idPredecesora: string, idDependiente: string) {
    if (!this.puedeEditarAvance || !idPredecesora || !idDependiente || idPredecesora === idDependiente) { return; }

    const predecesora = this.ControlesAvance.find(it => it.id === idPredecesora);
    const dependiente = this.ControlesAvance.find(it => it.id === idDependiente);
    if (!predecesora || !dependiente || !dependiente.id) { return; }

    const actuales = Array.isArray(dependiente.dependencias) ? dependiente.dependencias : [];
    if (actuales.indexOf(idPredecesora) !== -1) {
      Swal.fire({
        icon: 'info',
        title: 'Ya están conectadas',
        text: `"${dependiente.descripcion}" ya depende de "${predecesora.descripcion}".`,
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }
    if (this.dependeDeGantt(idPredecesora, idDependiente)) {
      Swal.fire('Dependencia circular', `"${predecesora.descripcion}" ya depende (directa o indirectamente) de "${dependiente.descripcion}". No se pueden conectar al revés.`, 'warning');
      return;
    }

    const nuevas = actuales.concat([idPredecesora]);
    dependiente.dependencias = nuevas;
    this.construirFlechasGantt();

    firestoreDB.collection('controlAvance').doc(dependiente.id).update({ dependencias: nuevas })
      .then(() => {
        // Si quedó en conflicto (empieza antes de que termine la predecesora), se corre sola.
        if (this.reprogramarDependencias) {
          this.aplicarCambioFechasGantt(dependiente, () => {});
        }
      })
      .catch((error: any) => {
        const item = this.ControlesAvance.find(it => it.id === idDependiente);
        if (item) { item.dependencias = actuales; }
        this.construirFlechasGantt();
        Swal.fire('Error', 'No se pudo guardar la dependencia: ' + error.message, 'error');
      });
  }

  /** Clic en una flecha: confirma y quita la dependencia. */
  quitarDependenciaGantt(flecha: FlechaGantt) {
    if (!this.puedeEditarAvance || !flecha) { return; }
    const predecesora = this.ControlesAvance.find(it => it.id === flecha.idPredecesora);
    const dependiente = this.ControlesAvance.find(it => it.id === flecha.idDependiente);
    if (!dependiente) { return; }

    Swal.fire({
      title: 'Quitar dependencia',
      text: `¿Quitar la conexión entre "${predecesora ? predecesora.descripcion : 'actividad'}" y "${dependiente.descripcion}"? Las fechas no cambian.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (!result.value || !this.puedeEditarAvance) { return; }
      // Se busca de nuevo por si llegó un snapshot mientras el cuadro estaba abierto.
      const actual = this.ControlesAvance.find(it => it.id === flecha.idDependiente);
      if (!actual || !actual.id) { return; }

      const anteriores = actual.dependencias || [];
      const nuevas = anteriores.filter(id => id !== flecha.idPredecesora);
      actual.dependencias = nuevas;
      this.construirFlechasGantt();

      firestoreDB.collection('controlAvance').doc(actual.id).update({ dependencias: nuevas })
        .catch((error: any) => {
          actual.dependencias = anteriores;
          this.construirFlechasGantt();
          Swal.fire('Error', 'No se pudo quitar la dependencia: ' + error.message, 'error');
        });
    });
  }

  /**
   * Corre hacia adelante las actividades que empiezan antes de que termine alguna de sus predecesoras
   * (las deja partiendo el día siguiente al término, manteniendo su plazo). Se repite en cadena:
   * si A empuja a B y B empuja a C, C también se corre. Devuelve true si movió algo.
   */
  private propagarDependenciasGantt(): boolean {
    let huboCambios = false;

    for (let vuelta = 0; vuelta < 50; vuelta++) {
      const porId: { [id: string]: ControlAvanceItem } = {};
      this.ControlesAvance.forEach(it => {
        if (it.id && it.activo !== false) { porId[it.id] = it; }
      });

      let cambioEnVuelta = false;

      this.ControlesAvance.forEach(dependiente => {
        if (!dependiente.id || dependiente.activo === false) { return; }
        const deps = dependiente.dependencias || [];
        if (deps.length === 0) { return; }
        // Un título con láminas toma sus fechas de ellas: no se mueve directamente.
        if (dependiente.esTitulo && this.esFilaConHijos(dependiente.id)) { return; }

        let inicioMinimo: Date | null = null;
        deps.forEach(idPredecesora => {
          const predecesora = porId[idPredecesora];
          if (!predecesora) { return; }
          const fin = this.parsearFechaISO(predecesora.fechaTerminoProgramada || predecesora.fechaInicioProgramada);
          if (!fin) { return; }
          const siguiente = new Date(fin);
          siguiente.setDate(siguiente.getDate() + 1);
          if (!inicioMinimo || siguiente > inicioMinimo) { inicioMinimo = siguiente; }
        });
        if (!inicioMinimo) { return; }

        const inicioActual = this.parsearFechaISO(dependiente.fechaInicioProgramada);
        if (inicioActual && inicioActual >= (inicioMinimo as Date)) { return; }

        dependiente.fechaInicioProgramada = this.formatearFechaISO(inicioMinimo as Date);
        dependiente.fechaInicioProgramadaManual = true;
        const plazo = Number(dependiente.plazoProgramado) || 0;
        dependiente.fechaTerminoProgramadaManual = false;
        dependiente.fechaTerminoProgramada = plazo > 0
          ? this.calcularFechaTerminoDesdePlazo(dependiente.fechaInicioProgramada, plazo)
          : '';
        cambioEnVuelta = true;
      });

      if (!cambioEnVuelta) { break; }
      huboCambios = true;
      // Los títulos que agrupan a las movidas se recalculan antes de la siguiente vuelta.
      this.recalcularJerarquiaYAgregados();
    }

    return huboCambios;
  }

  // ---- 5) Crear títulos / láminas directo desde la Carta Gantt ----

  /** Id de la última fila visible que cuelga de un título (para mostrar el input justo debajo de su bloque). */
  private ultimoDescendienteVisibleGantt(idTitulo: string): string {
    const indice = this.ganttBarras.findIndex(b => b.item.id === idTitulo);
    if (indice === -1) { return idTitulo; }
    const nivelBase = this.ganttBarras[indice].nivel;
    let ultimo = idTitulo;
    for (let i = indice + 1; i < this.ganttBarras.length; i++) {
      if (this.ganttBarras[i].nivel <= nivelBase) { break; }
      ultimo = this.ganttBarras[i].item.id;
    }
    return ultimo;
  }

  /** Enfoca el input de la fila nueva; reintenta un rato porque la fila puede aparecer recién con el snapshot. */
  private enfocarInputNuevaFilaGantt(intento: number = 0) {
    setTimeout(() => {
      const input = document.getElementById('gantt-input-nueva') as HTMLInputElement;
      if (input) {
        input.focus();
        this.reenfocandoNuevaFilaGantt = false;
        return;
      }
      if (intento < 15 && this.nuevaFilaGantt) {
        this.enfocarInputNuevaFilaGantt(intento + 1);
      } else {
        this.reenfocandoNuevaFilaGantt = false;
      }
    }, intento === 0 ? 0 : 60);
  }

  /** "+" en un título: agrega una lámina al final de ese título (si estaba plegado, lo despliega). */
  abrirNuevaFilaDentroGantt(barra: BarraGantt) {
    if (!this.puedeEditarAvance || !barra || !barra.item.id) { return; }
    if (this.titulosColapsados[barra.item.id]) {
      this.titulosColapsados[barra.item.id] = false;
      this.recalcularJerarquiaYAgregados();
      this.actualizarDatosGantt();
    }
    this.nuevaFilaGantt = {
      despuesDeId: this.ultimoDescendienteVisibleGantt(barra.item.id),
      idPadre: barra.item.id,
      ordenDespuesDe: null,
      nivel: barra.nivel + 1,
      esTitulo: false,
      descripcion: '',
      nombrePadre: barra.item.descripcion || ''
    };
    this.programarFlechasGantt();
    this.enfocarInputNuevaFilaGantt();
  }

  /** "+" en una lámina: inserta otra justo debajo, dentro del mismo título. */
  abrirNuevaFilaDespuesGantt(barra: BarraGantt) {
    if (!this.puedeEditarAvance || !barra || !barra.item.id) { return; }
    const idPadre = barra.item.idPadre || null;
    const padre = idPadre ? this.ControlesAvance.find(it => it.id === idPadre) : null;
    this.nuevaFilaGantt = {
      despuesDeId: barra.item.id,
      idPadre: idPadre,
      ordenDespuesDe: barra.item.orden || 0,
      nivel: barra.nivel,
      esTitulo: false,
      descripcion: '',
      nombrePadre: padre ? (padre.descripcion || '') : 'Raíz'
    };
    this.programarFlechasGantt();
    this.enfocarInputNuevaFilaGantt();
  }

  /** Fila "+ Nuevo título" del final: crea un título en la raíz. */
  abrirNuevoTituloRaizGantt() {
    if (!this.puedeEditarAvance) { return; }
    this.nuevaFilaGantt = {
      despuesDeId: '__final__',
      idPadre: null,
      ordenDespuesDe: null,
      nivel: 0,
      esTitulo: true,
      descripcion: '',
      nombrePadre: 'Raíz'
    };
    this.programarFlechasGantt();
    this.enfocarInputNuevaFilaGantt();
  }

  cancelarNuevaFilaGantt() {
    this.nuevaFilaGantt = null;
    this.reenfocandoNuevaFilaGantt = false;
    this.programarFlechasGantt();
  }

  /** Al salir del input: si quedó texto se crea, si está vacío se cierra (salvo que el foco pase al selector de tipo). */
  onBlurNuevaFilaGantt() {
    setTimeout(() => {
      if (!this.nuevaFilaGantt || this.creandoFilaGantt || this.reenfocandoNuevaFilaGantt) { return; }
      const activo: any = document.activeElement;
      if (activo && activo.closest && activo.closest('.gantt-fila-nueva')) { return; }
      if ((this.nuevaFilaGantt.descripcion || '').trim()) {
        this.crearFilaDesdeGantt(false);
      } else {
        this.nuevaFilaGantt = null;
        this.programarFlechasGantt();
      }
    }, 150);
  }

  private construirTituloNuevo(descripcion: string, idPadre: string | null, orden: number): any {
    return {
      idControlAvance: 1,
      idProyecto: this.getIdProyectoActual(),
      idSubProyecto: this.getIdSubProyectoActual(),
      esTitulo: true,
      idPadre: idPadre,
      orden: orden,
      codigo: '',
      tipo: '',
      descripcion: descripcion,
      revisionActual: 0,
      estado: 'P',
      activo: true,
      fechaInicioProgramada: '',
      plazoProgramado: 0,
      fechaTerminoProgramada: '',
      avanceProgramado: 0,
      fechaInicio: '',
      plazoReal: 0,
      fechaTermino: '',
      avanceReal: 0,
      bitacora: [],
      validadoresEstado: {},
      idUsuarioCreador: this.usuario.idUsuario,
      fechaCreacion: new Date().toISOString(),
      prefijoCodigo: (this.sugerirPrefijoDesdeDescripcion(descripcion) || 'DOC').toUpperCase()
    };
  }

  /** Código PREFIJO-TRZ-NN que le corresponde a una lámina nueva según su posición dentro del título. */
  private codigoParaNuevaLaminaGantt(idPadre: string | null, ordenDespuesDe: number | null): string {
    if (!idPadre) { return ''; }
    const ordenPrevio = this.ordenInsercionDespuesDe;
    this.ordenInsercionDespuesDe = ordenDespuesDe;
    const codigo = this.sugerirCodigoSubitem(idPadre);
    this.ordenInsercionDespuesDe = ordenPrevio;
    return codigo;
  }

  /**
   * Crea la fila escrita en el input inline. Con Enter (seguirAgregando = true) el input queda
   * abierto justo debajo de la fila recién creada, para cargar varias seguidas como en ClickUp.
   */
  async crearFilaDesdeGantt(seguirAgregando: boolean) {
    const nueva = this.nuevaFilaGantt;
    if (!nueva || this.creandoFilaGantt || !this.puedeEditarAvance) { return; }

    const descripcion = (nueva.descripcion || '').trim();
    if (!descripcion) {
      if (!seguirAgregando) { this.nuevaFilaGantt = null; }
      return;
    }

    const esTitulo = !!nueva.esTitulo;
    const idPadre = nueva.idPadre;

    if (esTitulo && !this.validarTituloHijoUnico({ esTitulo: true, idPadre: idPadre, descripcion: descripcion } as ControlAvanceItem)) {
      return;
    }

    this.creandoFilaGantt = true;
    try {
      const insertandoEntremedio = nueva.ordenDespuesDe !== null;
      if (insertandoEntremedio) {
        await this.insertarConOrdenIntermedio(idPadre, nueva.ordenDespuesDe as number);
      }
      const orden = insertandoEntremedio ? (nueva.ordenDespuesDe as number) + 1 : this.siguienteOrden(idPadre);

      let datos: any;
      if (esTitulo) {
        datos = this.construirTituloNuevo(descripcion, idPadre, orden);
      } else {
        datos = this.construirSubitemDesdePlantilla(
          { codigo: '', descripcion: descripcion, tema: '', tipoSugerido: '' } as PlantillaDocumento,
          idPadre,
          orden
        );
        datos.codigo = this.codigoParaNuevaLaminaGantt(idPadre, nueva.ordenDespuesDe);
      }

      const ref = firestoreDB.collection('controlAvance').doc();

      if (seguirAgregando) {
        // El input se mueve debajo de la fila recién creada y queda listo para la siguiente.
        this.reenfocandoNuevaFilaGantt = true;
        nueva.descripcion = '';
        nueva.despuesDeId = ref.id;
        if (insertandoEntremedio) { nueva.ordenDespuesDe = orden; }
      } else {
        this.nuevaFilaGantt = null;
      }

      ref.set(datos).catch((error: any) => {
        Swal.fire('Error', 'No se pudo crear la fila: ' + error.message, 'error');
      });

      if (!esTitulo && idPadre) {
        setTimeout(() => this.renumerarLaminasDeTitulo(idPadre), 400);
      }
      if (seguirAgregando) {
        this.enfocarInputNuevaFilaGantt();
      }
    } catch (error) {
      this.reenfocandoNuevaFilaGantt = false;
      Swal.fire('Error', 'No se pudo crear la fila: ' + error.message, 'error');
    } finally {
      this.creandoFilaGantt = false;
    }
  }

  // =========================================================================
  // EXPORTAR CARTA GANTT A EXCEL (dibuja la carta Gantt visual: semanas, días y barras)
  // Usa xlsx-populate porque corre 100% en el navegador (sin módulos de Node),
  // a diferencia de ExcelJS que no es compatible con este bundler.
  // =========================================================================

// =========================================================================
  // MÉTODO 1: exportarCartaGanttAExcel — reemplaza el método completo existente
  // FIX "igual que la plantilla de referencia": el bloque de encabezado (logo +
  // Mandante/Contacto/Dirección/Fecha/Código + caja de Registro/Versión arriba a
  // la derecha) ahora se dibuja igual que en la plantilla Excel de referencia:
  // columna A = margen, columna B = logo (también columna "Ítem"), etiquetas en
  // la columna D, valor en un bloque fijo I:X, y la caja REG./VERSIÓN pegada al
  // borde derecho de la tabla (últimas 6 columnas). También se agrega el mismo
  // encabezado a la hoja "Tabla".
  // =========================================================================
  async exportarCartaGanttAExcel() {
    if (!this.ganttBarras || this.ganttBarras.length === 0 || !this.ganttFechaInicioRango || this.ganttDiasTotales <= 0) {
      Swal.fire('Sin datos', 'No hay fechas cargadas para exportar la Carta Gantt.', 'info');
      return;
    }
 
    try {
      const workbook = await (XlsxPopulate as any).fromBlankAsync();
      const hoja = workbook.sheet(0);
      hoja.name('Carta Gantt');
      hoja.gridLinesVisible(false);
 
      // ---- Columnas: A = margen, B..E = fijas (Ítem/Actividad/Plazo/%Avance), F+ = días ----
      const COL_MARGEN = 1;
      const COL_FIJAS = 4;
      const COL_DIA_INICIO = COL_MARGEN + COL_FIJAS + 1; // F
      // El espacio extra de arrastre (relleno al final) no va al Excel: se exportan solo los días del proyecto.
      const totalDias = Math.max(this.ganttDiasTotales - (this.ganttDiasRelleno || 0), 1);
      const semanasExport: Array<{ etiqueta: string; dias: Array<{ numero: number; fecha: Date }> }> = [];
      let diasRestantesExport = totalDias;
      this.ganttSemanas.forEach(semana => {
        if (diasRestantesExport <= 0) { return; }
        const dias = semana.dias.slice(0, diasRestantesExport);
        semanasExport.push({ etiqueta: semana.etiqueta, dias });
        diasRestantesExport -= dias.length;
      });
 
      const COL_ETIQUETA = COL_MARGEN + 3;       // D
      const COL_VALOR_INICIO = COL_MARGEN + 8;   // I
      const COL_VALOR_FIN = COL_MARGEN + 23;     // X
      const ANCHO_CAJA_REG = 6;
 
      // El encabezado sigue el ancho de la tabla de días, pero con límites:
      // - mínimo AE: espacio para el valor (I:X) + caja REG/VERSIÓN, aunque el proyecto sea corto.
      // - máximo BB (~7 semanas de días): si la Carta Gantt es muy larga, el encabezado se corta
      //   ahí y la caja REG/VERSIÓN queda en BB, en vez de irse cientos de columnas a la derecha.
      const ultimaColumnaDias = COL_DIA_INICIO + totalDias - 1;
      const COL_MIN_ENCABEZADO = COL_VALOR_FIN + 1 + ANCHO_CAJA_REG; // AE
      const COL_MAX_ENCABEZADO = COL_DIA_INICIO + 48;                // BB
      const colUltimaEncabezado = Math.min(Math.max(ultimaColumnaDias, COL_MIN_ENCABEZADO), COL_MAX_ENCABEZADO);
      const ultimaColumnaSheet = Math.max(ultimaColumnaDias, colUltimaEncabezado);
 
      const FILA_ENCAB_INICIO = 2;
      const FILA_ENCAB_FIN = 6;
      const FILA_ESPACIADOR = 7;
      const FILA_ENCABEZADO_TABLA = 8; // meses
      const FILA_SEMANA = 9;           // semanas + Ítem/Actividad/Plazo/%Avance
      const FILA_DIAS = 10;            // días
      const FILA_PRIMER_DATO = 11;
 
      // ---- Paleta ----
      const BORDE_SUAVE = { style: 'thin', color: 'D0D5DB' };
      const BORDE_BARRA = { style: 'thin', color: 'D7DCE1' };
      const COLOR_PROGRESO: { [clase: string]: string } = {
        'avance-verde': 'A9D18E',
        'avance-amarillo': 'FFE699',
        'avance-rojo': 'F4B183',
        'avance-sin-datos': 'D9D9D9'
      };
      const COLOR_TITULO_NIVEL0 = '6FA8DC';
      const COLOR_TITULO_SUBNIVEL = 'B4C7E7';
      const COLOR_HOY = 'F4CCE8';
      const COLOR_HOY_TEXTO = 'C0007D';
      const COLOR_GRIS_EXPORT = 'D9D9D9';
      const COLOR_ENCAB_TABLA = 'F2F2F2';
      const COLOR_TEXTO_TITULO = '000000';
      const COLOR_TEXTO_LAMINA = '000000';
 
      // ---- Anchos de columna ----
      hoja.column(COL_MARGEN).width(7.71);      // A
      hoja.column(COL_MARGEN + 1).width(14.85); // B: Ítem / logo
      hoja.column(COL_MARGEN + 2).width(36);    // C: Actividad
      hoja.column(COL_MARGEN + 3).width(8);     // D: Plazo / etiquetas encabezado
      hoja.column(COL_MARGEN + 4).width(10);    // E: % Avance
      for (let c = COL_DIA_INICIO; c <= ultimaColumnaSheet; c++) {
        hoja.column(c).width(3.29);
      }
 
      // ==== BLOQUE DE ENCABEZADO ====
      const subProyecto: any = this.subProyectoActual || {};
      const mandante = this.nombreMandante || subProyecto.nombreMandante || subProyecto.mandante || this.nombreProyectoVisible || 'Proyecto';
      const contacto = subProyecto.contacto || subProyecto.nombreContacto || '-';
      const direccion = subProyecto.direccion || subProyecto.direccionProyecto || '-';
      const codigoProyecto = (subProyecto.codigo || subProyecto.codigoProyecto || '').trim() ||
        `Proyecto ${this.getIdProyectoActual()} - Subproyecto ${this.getIdSubProyectoActual()}`;
 
      const datosEncabezado = [
        ['MANDANTE:', mandante],
        ['CONTACTO:', contacto],
        ['DIRECCIÓN:', direccion],
        ['FECHA:', this.fechaDocumento],
        ['CÓDIGO:', codigoProyecto]
      ];
 
      this.dibujarEncabezadoExcel(hoja, {
        filaInicio: FILA_ENCAB_INICIO,
        filaFin: FILA_ENCAB_FIN,
        colLogo: COL_MARGEN + 1,
        colEtiqueta: COL_ETIQUETA,
        colValorInicio: COL_VALOR_INICIO,
        colValorFin: COL_VALOR_FIN,
        colUltima: colUltimaEncabezado, // topado entre AE y BB, no sigue una Carta Gantt gigante
        anchoCajaReg: ANCHO_CAJA_REG,
        datos: datosEncabezado,
        registro: this.registro,
        version: this.version
      });
 
      // Fila espaciadora bajita entre el encabezado y la tabla
      hoja.row(FILA_ESPACIADOR).height(6);
      hoja.row(FILA_ENCABEZADO_TABLA).height(15);
      hoja.row(FILA_SEMANA).height(15);
      hoja.row(FILA_DIAS).height(15);
 
      // ---- Fila de meses sobre las columnas fijas: gris con borde, como el resto del encabezado ----
      for (let c = COL_MARGEN + 1; c <= COL_MARGEN + 4; c++) {
        hoja.cell(FILA_ENCABEZADO_TABLA, c).style({ fill: COLOR_ENCAB_TABLA, border: BORDE_SUAVE });
      }
 
      // ---- Encabezado de tabla: columnas fijas combinadas verticalmente (filas 9-10) ----
      const titulosFijos = ['Ítem', 'Actividad', 'Plazo', '% Avance'];
      titulosFijos.forEach((titulo, i) => {
        const c = COL_MARGEN + 1 + i;
        hoja.range(FILA_SEMANA, c, FILA_DIAS, c).merged(true);
        [FILA_SEMANA, FILA_DIAS].forEach(fila => {
          hoja.cell(fila, c).style({
            bold: true,
            fontSize: 10,
            fontColor: '1F2937',
            horizontalAlignment: c === COL_MARGEN + 2 ? 'left' : 'center',
            verticalAlignment: 'center',
            fill: COLOR_ENCAB_TABLA,
            border: BORDE_SUAVE
          });
        });
        hoja.cell(FILA_SEMANA, c).value(titulo);
      });
 
      // ---- Meses (fila 8) ----
      const meses: Array<{ nombre: string; inicioCol: number; finCol: number }> = [];
      let mesActual = '';
      let inicioMes = COL_DIA_INICIO;
      let columnaMes = COL_DIA_INICIO;
      semanasExport.forEach(semana => {
        semana.dias.forEach(dia => {
          const nombreMes = `${this.nombreMes(dia.fecha.getMonth())} ${dia.fecha.getFullYear()}`;
          if (mesActual && nombreMes !== mesActual) {
            meses.push({ nombre: mesActual, inicioCol: inicioMes, finCol: columnaMes - 1 });
            inicioMes = columnaMes;
          }
          mesActual = nombreMes;
          columnaMes++;
        });
      });
      if (mesActual) {
        meses.push({ nombre: mesActual, inicioCol: inicioMes, finCol: columnaMes - 1 });
      }
      meses.forEach(mes => {
        if (mes.finCol > mes.inicioCol) {
          hoja.range(FILA_ENCABEZADO_TABLA, mes.inicioCol, FILA_ENCABEZADO_TABLA, mes.finCol).merged(true);
        }
        for (let c = mes.inicioCol; c <= mes.finCol; c++) {
          hoja.cell(FILA_ENCABEZADO_TABLA, c).style({
            bold: true,
            fontSize: 9,
            fontColor: '1F2937',
            horizontalAlignment: 'center',
            verticalAlignment: 'center',
            fill: COLOR_ENCAB_TABLA,
            border: BORDE_SUAVE
          });
        }
        hoja.cell(FILA_ENCABEZADO_TABLA, mes.inicioCol).value(mes.nombre);
      });
 
      // ---- Semanas (fila 9) y días (fila 10) ----
      const esHoyFilaDias = (col: number) => this.ganttHoyOffset >= 0 && col === COL_DIA_INICIO + this.ganttHoyOffset;
      let colCursor = COL_DIA_INICIO;
      semanasExport.forEach(semana => {
        const inicioCol = colCursor;
        const finCol = colCursor + semana.dias.length - 1;
 
        if (finCol > inicioCol) {
          hoja.range(FILA_SEMANA, inicioCol, FILA_SEMANA, finCol).merged(true);
        }
        for (let c = inicioCol; c <= finCol; c++) {
          hoja.cell(FILA_SEMANA, c).style({
            bold: true,
            fontSize: 8,
            fontColor: '1F2937',
            horizontalAlignment: 'center',
            verticalAlignment: 'center',
            fill: COLOR_ENCAB_TABLA,
            border: BORDE_SUAVE
          });
        }
        hoja.cell(FILA_SEMANA, inicioCol).value(semana.etiqueta);
 
        semana.dias.forEach((dia, idx) => {
          const col = inicioCol + idx;
          // La celda del día "hoy" se estila completa aquí (una sola llamada .style()),
          // con fondo rosado y las líneas laterales magenta.
          const esHoy = esHoyFilaDias(col);
          hoja.cell(FILA_DIAS, col)
            .value(dia.numero)
            .style({
              bold: esHoy,
              fontSize: 7,
              fontColor: esHoy ? COLOR_HOY_TEXTO : '595959',
              horizontalAlignment: 'center',
              verticalAlignment: 'center',
              fill: esHoy ? COLOR_HOY : COLOR_ENCAB_TABLA,
              border: esHoy
                ? {
                    top: BORDE_SUAVE,
                    bottom: BORDE_SUAVE,
                    left: { style: 'medium', color: COLOR_HOY_TEXTO },
                    right: { style: 'medium', color: COLOR_HOY_TEXTO }
                  }
                : BORDE_SUAVE
            });
        });
 
        colCursor = finCol + 1;
      });
 
      // ---- Filas de datos ----
      const colHoy = this.ganttHoyOffset >= 0 ? COL_DIA_INICIO + this.ganttHoyOffset : -1;
      const bordeHoy = { style: 'medium', color: COLOR_HOY_TEXTO };
      // Agrega las líneas magenta de "hoy" al borde que ya lleva la celda, sin segunda llamada .style()
      const conLineaHoy = (col: number, borde: any) => {
        if (col !== colHoy) { return borde; }
        const base = (borde && (borde.top || borde.bottom || borde.left || borde.right))
          ? borde
          : { top: borde, bottom: borde, left: borde, right: borde };
        return Object.assign({}, base, { left: bordeHoy, right: bordeHoy });
      };
 
      let filaActual = FILA_PRIMER_DATO;
 
      this.ganttBarras.forEach((barra, indice) => {
        const item = barra.item;
        const esTitulo = !!item.esTitulo;
        const filaTablaCorrespondiente = this.filasTabla[indice];
        const numeroItem = filaTablaCorrespondiente ? filaTablaCorrespondiente.numero : (item.codigo || '');
 
        hoja.cell(filaActual, COL_MARGEN + 1).value(numeroItem);
        hoja.cell(filaActual, COL_MARGEN + 2).value('   '.repeat(barra.nivel) + (item.descripcion || ''));
        hoja.cell(filaActual, COL_MARGEN + 3).value(item.plazoProgramado || '');
        hoja.cell(filaActual, COL_MARGEN + 4).value(item.avanceReal != null ? `${item.avanceReal}%` : '');
 
        const colorTitulo = barra.nivel === 0 ? COLOR_TITULO_NIVEL0 : COLOR_TITULO_SUBNIVEL;
 
        for (let c = COL_MARGEN + 1; c <= COL_MARGEN + 4; c++) {
          const estilo: any = {
            bold: esTitulo,
            fontSize: 9,
            fontColor: esTitulo ? COLOR_TEXTO_TITULO : COLOR_TEXTO_LAMINA,
            verticalAlignment: 'center',
            horizontalAlignment: c === COL_MARGEN + 2 ? 'left' : 'center',
            border: BORDE_SUAVE
          };
          if (esTitulo) { estilo.fill = colorTitulo; }
          hoja.cell(filaActual, c).style(estilo);
        }
 
        for (let d = 0; d < totalDias; d++) {
          const col = COL_DIA_INICIO + d;
 
          if (esTitulo) {
            hoja.cell(filaActual, col).style({ fill: colorTitulo, border: conLineaHoy(col, BORDE_SUAVE) });
            continue;
          }
 
          const esHitoAqui = barra.esHito && d === barra.offsetHito;
          const enBarra = !barra.esHito && barra.ancho > 0 && d >= barra.offset && d < barra.offset + barra.ancho;
 
          if (esHitoAqui) {
            hoja.cell(filaActual, col).value('◆').style({
              bold: true,
              fontSize: 8,
              fontColor: 'FFFFFF',
              horizontalAlignment: 'center',
              verticalAlignment: 'center',
              fill: '026AA7',
              border: conLineaHoy(col, BORDE_SUAVE)
            });
          } else if (enBarra) {
            const dRelativo = d - barra.offset;
            const dentroDeRelleno = dRelativo < barra.anchoRelleno;
            const colorRelleno = dentroDeRelleno ? (COLOR_PROGRESO[barra.clase] || COLOR_GRIS_EXPORT) : COLOR_GRIS_EXPORT;
            hoja.cell(filaActual, col).style({
              fill: colorRelleno,
              border: conLineaHoy(col, {
                top: BORDE_BARRA,
                bottom: BORDE_BARRA,
                left: dRelativo === 0 ? BORDE_BARRA : BORDE_SUAVE,
                right: dRelativo === barra.ancho - 1 ? BORDE_BARRA : BORDE_SUAVE
              })
            });
          } else {
            hoja.cell(filaActual, col).style({ border: conLineaHoy(col, BORDE_SUAVE) });
          }
        }
 
        hoja.row(filaActual).height(16);
        filaActual++;
      });
 
      // =====================================================================
      // HOJA "Tabla": tabla completa del control de avance, igual a la plantilla
      // =====================================================================
      const hojaTabla = workbook.addSheet('Tabla');
      hojaTabla.gridLinesVisible(false);
 
      const COL_MARGEN_TABLA = 1;
      const encabezadosTabla = [
        'N°', 'Código', 'Tipo', 'Descripción', 'Rev.', 'Estado',
        'F. Inicio Programada', 'Plazo Programado', 'F. Término Programada',
        '% Avance Programado', 'F. Inicio Real', 'Plazo Real',
        'F. Término Real', '% Avance Real'
      ];
      const columnasTablaAncho = [10.71, 16, 20.14, 40.71, 8, 16, 15, 11, 17, 17.42, 15, 11, 17, 15];
      const IDX_TIPO = 2;
      const IDX_DESCRIPCION = 3;
      const IDX_AVANCE_PROG = 9;
      const FILA_ENCABEZADO_TABLA_HOJA2 = FILA_ENCABEZADO_TABLA; // fila 8, igual que la Carta Gantt
 
      // Colores de Tipo: los mismos de los select de la tabla en la app
      const COLOR_TIPO: { [prefijo: string]: string } = {
        'ET': 'E3FBE8', // verde menta
        'MC': 'FFF8D6', // amarillo crema
        'P': 'E6F1FF',  // celeste
        'R': 'F3EEFF',  // lila
        'L': 'DFF8FA',  // turquesa agua
        'I': 'FFEEDD',  // durazno
        'O': 'F2F3F5'   // gris perla
      };
      const colorTipo = (tipo: string): string => {
        if (!tipo) { return ''; }
        const prefijo = tipo.split(' -')[0].trim();
        return COLOR_TIPO[prefijo] || '';
      };
 
      // Semáforo pastel para % Avance Programado (mismo criterio que la tabla de la app)
      const COLOR_AVANCE_TABLA: { [clase: string]: string } = {
        'avance-verde': 'E2EFDA',
        'avance-amarillo': 'FFF2CC',
        'avance-rojo': 'FCE4D6'
      };
 
      hojaTabla.column(COL_MARGEN_TABLA).width(7.71);
      hojaTabla.row(FILA_ESPACIADOR).height(6);
      hojaTabla.row(FILA_ENCABEZADO_TABLA_HOJA2).height(30);
 
      encabezadosTabla.forEach((titulo, index) => {
        const col = COL_MARGEN_TABLA + 1 + index;
        hojaTabla.column(col).width(columnasTablaAncho[index]);
        hojaTabla.cell(FILA_ENCABEZADO_TABLA_HOJA2, col).value(titulo).style({
          bold: true,
          fontSize: 9,
          fontColor: '1F2937',
          horizontalAlignment: 'center',
          verticalAlignment: 'center',
          wrapText: true,
          fill: COLOR_ENCAB_TABLA,
          border: BORDE_SUAVE
        });
      });
 
      const ultimaColumnaTabla = COL_MARGEN_TABLA + encabezadosTabla.length;
      this.dibujarEncabezadoExcel(hojaTabla, {
        filaInicio: FILA_ENCAB_INICIO,
        filaFin: FILA_ENCAB_FIN,
        colLogo: COL_MARGEN_TABLA + 1,
        colEtiqueta: COL_MARGEN_TABLA + 5,      // F
        colEtiquetaFin: COL_MARGEN_TABLA + 6,   // G
        colValorInicio: COL_MARGEN_TABLA + 7,   // H
        colValorFin: COL_MARGEN_TABLA + 10,     // K
        colUltima: ultimaColumnaTabla,          // O
        anchoCajaReg: 2,                        // N:O
        datos: datosEncabezado,
        registro: this.registro,
        version: this.version
      });
 
      const formatearFechaExcel = (fecha: string) => {
        if (!fecha) return '';
        const date = this.parsearFechaLocal(fecha);
        if (!date) return fecha;
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };
 
      this.filasTabla.forEach((fila, idx) => {
        const filaExcel = FILA_ENCABEZADO_TABLA_HOJA2 + 1 + idx;
        const item = fila.item;
        const esTitulo = !!item.esTitulo;
        const datos = [
          fila.numero,
          item.codigo || '',
          esTitulo ? '' : (item.tipo || ''),
          item.descripcion || '',
          item.revisionActual != null ? item.revisionActual : '',
          item.estado || '',
          formatearFechaExcel(item.fechaInicioProgramada),
          item.plazoProgramado != null ? item.plazoProgramado : '',
          formatearFechaExcel(item.fechaTerminoProgramada),
          item.avanceProgramado != null ? item.avanceProgramado : '',
          formatearFechaExcel(item.fechaInicio),
          item.plazoReal != null ? item.plazoReal : '',
          formatearFechaExcel(item.fechaTermino),
          item.avanceReal != null ? item.avanceReal : ''
        ];
 
        const colorTituloFila = fila.nivel === 0 ? COLOR_TITULO_NIVEL0 : COLOR_TITULO_SUBNIVEL;
        const claseAvance = this.getClaseAvanceReal(item.avanceReal, item.avanceProgramado);
 
        datos.forEach((valor, colIdx) => {
          let fill = 'FFFFFF';
          if (esTitulo) {
            fill = colorTituloFila;
          } else if (colIdx === IDX_TIPO) {
            fill = colorTipo(item.tipo) || 'FFFFFF';
          } else if (colIdx === IDX_AVANCE_PROG) {
            fill = COLOR_AVANCE_TABLA[claseAvance] || 'FFFFFF';
          }
 
          hojaTabla.cell(filaExcel, COL_MARGEN_TABLA + 1 + colIdx).value(valor).style({
            bold: esTitulo,
            fontSize: 9,
            fontColor: esTitulo ? COLOR_TEXTO_TITULO : COLOR_TEXTO_LAMINA,
            verticalAlignment: 'center',
            horizontalAlignment: colIdx === IDX_DESCRIPCION ? 'left' : 'center',
            fill: fill,
            border: BORDE_SUAVE
          });
        });
 
        hojaTabla.row(filaExcel).height(esTitulo ? 16 : 15);
      });
 
      // ---- Congela todo el encabezado ----
      hoja.freezePanes(0, FILA_PRIMER_DATO - 1);
      hojaTabla.freezePanes(0, FILA_ENCABEZADO_TABLA_HOJA2);
 
      // ---- Descargar ----
      const nombreProyecto = (this.nombreProyectoVisible || 'Proyecto').replace(/[\\/:*?"<>|]/g, '-');
      const fechaArchivo = this.formatearFechaISO(new Date());
      const nombreArchivo = `CartaGantt_${nombreProyecto}_${fechaArchivo}.xlsx`;
 
      const blob = await workbook.outputAsync();
      const excelConLogo = await this.insertarLogoEnExcel(blob, [
        { nombreHoja: 'Carta Gantt', fila: FILA_ENCAB_INICIO, col: COL_MARGEN + 1 },
        { nombreHoja: 'Tabla', fila: FILA_ENCAB_INICIO, col: COL_MARGEN_TABLA + 1 }
      ]);
      const url = window.URL.createObjectURL(excelConLogo);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      Swal.fire('Error', 'No se pudo generar el Excel: ' + error.message, 'error');
    }
  }
 
  /**
   * Bloque de encabezado igual a la plantilla: logo combinado en colLogo (filaInicio..filaFin),
   * etiquetas en colEtiqueta, valores combinados colValorInicio..colValorFin, fondo gris,
   * borde exterior gris y caja REG / VERSIÓN en las últimas columnas (pegada al borde derecho).
   * Una sola llamada .style() por celda para no corromper estilos en xlsx-populate.
   */
  private dibujarEncabezadoExcel(hoja: any, opciones: {
    filaInicio: number; filaFin: number;
    colLogo: number; colEtiqueta: number; colEtiquetaFin?: number;
    colValorInicio: number; colValorFin: number; colUltima: number;
    anchoCajaReg?: number;
    datos: string[][]; registro: string; version: string;
  }) {
    const { filaInicio, filaFin, colLogo, colEtiqueta, colValorInicio, colValorFin, colUltima, datos, registro, version } = opciones;
    const colEtiquetaFin = opciones.colEtiquetaFin || colEtiqueta;
    const anchoCajaReg = opciones.anchoCajaReg || 6;
 
    const COLOR_BORDE = 'BFBFBF';
    const COLOR_FONDO = 'F2F2F2';
    const COLOR_TEXTO = '222222';
    const lineaBorde = { style: 'thin', color: COLOR_BORDE };
 
    const filaMedia = filaInicio + Math.ceil((filaFin - filaInicio + 1) / 2) - 1;
    const colRegInicio = Math.max(colValorFin + 2, colUltima - anchoCajaReg + 1);
    const hayCajaReg = colRegInicio < colUltima;
 
    // ---- Merges ----
    hoja.range(filaInicio, colLogo, filaFin, colLogo).merged(true);
    datos.forEach((dato, indice) => {
      const fila = filaInicio + indice;
      if (fila > filaFin) { return; }
      if (colEtiquetaFin > colEtiqueta) {
        hoja.range(fila, colEtiqueta, fila, colEtiquetaFin).merged(true);
      }
      hoja.range(fila, colValorInicio, fila, colValorFin).merged(true);
    });
    if (hayCajaReg) {
      hoja.range(filaInicio, colRegInicio, filaMedia, colUltima).merged(true);
      hoja.range(filaMedia + 1, colRegInicio, filaFin, colUltima).merged(true);
    }
 
    // ---- Bordes acumulados por celda: contorno del bloque + contorno de la caja REG/VERSIÓN ----
    const bordes: { [clave: string]: any } = {};
    const agregarLado = (f: number, c: number, lado: 'top' | 'bottom' | 'left' | 'right') => {
      const clave = `${f}_${c}`;
      if (!bordes[clave]) { bordes[clave] = {}; }
      bordes[clave][lado] = lineaBorde;
    };
    const contornear = (fIni: number, cIni: number, fFin: number, cFin: number) => {
      for (let c = cIni; c <= cFin; c++) { agregarLado(fIni, c, 'top'); agregarLado(fFin, c, 'bottom'); }
      for (let f = fIni; f <= fFin; f++) { agregarLado(f, cIni, 'left'); agregarLado(f, cFin, 'right'); }
    };
    contornear(filaInicio, colLogo, filaFin, colUltima);
    if (hayCajaReg) {
      contornear(filaInicio, colRegInicio, filaMedia, colUltima);
      contornear(filaMedia + 1, colRegInicio, filaFin, colUltima);
    }
 
    // ---- Textos por celda (etiqueta, valor, REG, VERSIÓN) ----
    const textos: { [clave: string]: { valor: any; estilo: any } } = {};
    datos.forEach((dato, indice) => {
      const fila = filaInicio + indice;
      if (fila > filaFin) { return; }
      textos[`${fila}_${colEtiqueta}`] = {
        valor: dato[0],
        estilo: { bold: true, fontSize: 10, fontColor: COLOR_TEXTO, horizontalAlignment: 'left', verticalAlignment: 'center' }
      };
      textos[`${fila}_${colValorInicio}`] = {
        valor: dato[1],
        estilo: { bold: dato[0] === 'CÓDIGO:', fontSize: 10, fontColor: COLOR_TEXTO, horizontalAlignment: 'left', verticalAlignment: 'center' }
      };
    });
    if (hayCajaReg) {
      const estiloCaja = { fontSize: 10, fontColor: COLOR_TEXTO, horizontalAlignment: 'center', verticalAlignment: 'center' };
      textos[`${filaInicio}_${colRegInicio}`] = { valor: registro || '', estilo: estiloCaja };
      textos[`${filaMedia + 1}_${colRegInicio}`] = { valor: version || '', estilo: estiloCaja };
    }
 
    // ---- Una sola llamada .style() por celda del bloque ----
    for (let f = filaInicio; f <= filaFin; f++) {
      for (let c = colLogo; c <= colUltima; c++) {
        const clave = `${f}_${c}`;
        const texto = textos[clave];
        const estilo: any = Object.assign({ fill: COLOR_FONDO, border: bordes[clave] || {} }, texto ? texto.estilo : {});
        const celda = hoja.cell(f, c);
        if (texto) { celda.value(texto.valor); }
        celda.style(estilo);
      }
      hoja.row(f).height(15.75);
    }
  }
 
  /** Busca en workbook.xml + sus relaciones la ruta del XML de una hoja por su nombre (ej: 'Tabla' -> 'xl/worksheets/sheet2.xml'). */
  private resolverRutaHojaExcel(workbookXml: string, workbookRels: string, nombreHoja: string): string {
    let rId: string = null;
    (workbookXml.match(/<sheet\b[^>]*>/g) || []).forEach(tag => {
      const nombre = (tag.match(/\bname="([^"]*)"/) || [])[1];
      const id = (tag.match(/\br:id="([^"]*)"/) || [])[1];
      if (nombre === nombreHoja && id) { rId = id; }
    });
    if (!rId) { return null; }
 
    let target: string = null;
    (workbookRels.match(/<Relationship\b[^>]*>/g) || []).forEach(rel => {
      const id = (rel.match(/\bId="([^"]*)"/) || [])[1];
      const t = (rel.match(/\bTarget="([^"]*)"/) || [])[1];
      if (id === rId && t) { target = t; }
    });
    if (!target) { return null; }
 
    if (target.charAt(0) === '/') { return target.substring(1); }
    return 'xl/' + target.replace(/^\.\//, '');
  }
 
  /**
   * Inserta el logo en cada hoja indicada, anclado en (fila, col) con tamaño fijo
   * (el mismo en todas las hojas, para que se vea igual aunque la columna sea más angosta).
   * Filas/columnas en el XML de drawing son 0-based.
   */
  private async insertarLogoEnExcel(blob: Blob, destinos: Array<{ nombreHoja: string; fila: number; col: number }>): Promise<Blob> {
    const rutaLogo = new URL('assets/Images/trazas.jpeg', document.baseURI).toString();
    const respuesta = await fetch(rutaLogo);
    if (!respuesta.ok) {
      throw new Error('No se pudo cargar el logo de Trazas.');
    }
 
    const imagen = await respuesta.arrayBuffer();
    const zip = await (JSZip as any).loadAsync(blob);
    zip.file('xl/media/image1.jpg', imagen);
 
    const leer = async (ruta: string): Promise<string> => {
      const archivo = zip.file(ruta);
      return archivo ? archivo.async('string') : null;
    };
 
    let tipos = await leer('[Content_Types].xml');
    const workbookXml = await leer('xl/workbook.xml');
    const workbookRels = await leer('xl/_rels/workbook.xml.rels');
    if (!tipos || !workbookXml || !workbookRels) {
      throw new Error('El archivo Excel no tiene una estructura OOXML válida.');
    }
    if (tipos.indexOf('Extension="jpg"') === -1) {
      tipos = tipos.replace('</Types>', '<Default Extension="jpg" ContentType="image/jpeg"/></Types>');
    }
 
    // Tamaño fijo del logo: ~109 x 105 px (lo que mide la celda B2:B6 de la Carta Gantt)
    const LOGO_CX = 1038225;
    const LOGO_CY = 1000125;
    const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 
    for (let i = 0; i < destinos.length; i++) {
      const destino = destinos[i];
      const rutaHoja = this.resolverRutaHojaExcel(workbookXml, workbookRels, destino.nombreHoja);
      if (!rutaHoja) { continue; }
 
      let xmlHoja = await leer(rutaHoja);
      if (!xmlHoja) { continue; }
 
      const numDrawing = i + 1;
      const carpetaHoja = rutaHoja.substring(0, rutaHoja.lastIndexOf('/'));
      const archivoHoja = rutaHoja.substring(rutaHoja.lastIndexOf('/') + 1);
      const rutaRelsHoja = `${carpetaHoja}/_rels/${archivoHoja}.rels`;
 
      // Relación hoja -> drawing
      let relsHoja = (await leer(rutaRelsHoja)) ||
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
      relsHoja = relsHoja.replace(/<Relationships([^>]*)\/>/, '<Relationships$1></Relationships>');
      zip.file(rutaRelsHoja, relsHoja.replace(
        '</Relationships>',
        `<Relationship Id="rIdLogo" Type="${NS_REL}/drawing" Target="../drawings/drawing${numDrawing}.xml"/></Relationships>`
      ));
 
      // Referencia al drawing dentro de la hoja
      if (xmlHoja.indexOf('xmlns:r=') === -1) {
        xmlHoja = xmlHoja.replace(/<worksheet\b/, `<worksheet xmlns:r="${NS_REL}"`);
      }
      zip.file(rutaHoja, xmlHoja.replace('</worksheet>', '<drawing r:id="rIdLogo"/></worksheet>'));
 
      // Content type del drawing
      if (tipos.indexOf(`/xl/drawings/drawing${numDrawing}.xml`) === -1) {
        tipos = tipos.replace(
          '</Types>',
          `<Override PartName="/xl/drawings/drawing${numDrawing}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`
        );
      }
 
      const colXml = Math.max(destino.col - 1, 0);
      const filaXml = Math.max(destino.fila - 1, 0);
 
      zip.file(`xl/drawings/drawing${numDrawing}.xml`,
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
        '<xdr:oneCellAnchor>' +
        `<xdr:from><xdr:col>${colXml}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${filaXml}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
        `<xdr:ext cx="${LOGO_CX}" cy="${LOGO_CY}"/>` +
        `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${numDrawing}" name="LogoTrazas${numDrawing}.jpg"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>` +
        `<xdr:blipFill><a:blip r:embed="rIdLogoImage" xmlns:r="${NS_REL}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
        '<xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>' +
        '<xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>'
      );
      zip.file(`xl/drawings/_rels/drawing${numDrawing}.xml.rels`,
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        `<Relationship Id="rIdLogoImage" Type="${NS_REL}/image" Target="../media/image1.jpg"/>` +
        '</Relationships>'
      );
    }
 
    zip.file('[Content_Types].xml', tipos);
    return zip.generateAsync({ type: 'blob' });
  }
}