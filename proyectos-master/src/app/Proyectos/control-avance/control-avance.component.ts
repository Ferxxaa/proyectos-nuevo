import { Component, OnInit, OnDestroy, Input, ViewEncapsulation, OnChanges, SimpleChanges, NgZone } from '@angular/core';
import { sUsuario } from '../../services/sUsuario.service';
import { sVis_UsuarioPersona } from '../../services/sVis_UsuarioPersona.service';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
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
}

interface PeriodoGantt {
  etiqueta: string;
  detalle: string;
  inicioDia: number;
  dias: number;
}

/** Plantilla creada por el propio usuario desde el modal de Plantillas, con ícono a elección y guardada en Firestore. */
interface GrupoPlantillaPersonalizada extends GrupoPlantillas {
  id?: string;
  icono: string;
  personalizada: true;
}

@Component({
  selector: 'app-control-avance',
  templateUrl: './control-avance.component.html',
  styleUrls: ['./control-avance.component.css'],
  providers: [sUsuario, sVis_UsuarioPersona, sUsuariosPerfiles],
  encapsulation: ViewEncapsulation.None
})
export class ControlAvanceComponent implements OnInit, OnChanges, OnDestroy {

  @Input() idProyecto: number;
  @Input() idSubProyecto: number;
  @Input() detalleSeguimiento: any[];
  @Input() soloLectura: boolean = false;
  @Input() nombreProyecto: string = '';
  @Input() ocultarTitulo: boolean = false;
  @Input() ocultarFiltros: boolean = false;
  @Input() ocultarExportacion: boolean = false;
  @Input() vistaInicial: 'tabla' | 'gantt' = 'tabla';

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

  private unsubscribeControles: (() => void) | null = null;
  private unsubscribeValidadoresConfig: (() => void) | null = null;
  private unsubscribePlantillasPersonalizadas: (() => void) | null = null;

  constructor(
    private _sUsuario: sUsuario,
    private _sVisUsuarioPersona: sVis_UsuarioPersona,
    private _sUsuariosPerfiles: sUsuariosPerfiles,
    private _ngZone: NgZone
  ) {
    this.ControlesAvance = new Array<ControlAvanceItem>();
    this.Loading = false;
    this.LoadingTabla = false;
    this.usuario = JSON.parse(localStorage.getItem("usuario") || 'null') || {};
    const subProyecto = JSON.parse(localStorage.getItem('SubProyecto') || 'null');
    this.subProyectoActual = subProyecto;
    this.nombreProyectoLocal = subProyecto && subProyecto.nombreSubProyecto ? subProyecto.nombreSubProyecto : '';
  }

  get nombreProyectoVisible(): string {
    return this.nombreProyecto || this.nombreProyectoLocal || '';
  }

  guardarCodigoSubProyectoParaExcel(codigo: string) {
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
      return;
    }

    const idUsuarioActual = Number(this.usuario.idUsuario);
    this._sUsuariosPerfiles.getUsuariosPerfilesbyidUsuario(idUsuarioActual).subscribe(
      (perfiles: any) => {
        const listaPerfiles = Array.isArray(perfiles) ? perfiles : [];
        this.esGerenciaConfirmado = listaPerfiles.some((perfil: any) =>
          perfil.idPerfil == 1 || perfil.idPerfil == 2 || perfil.idPerfil == 11
        );
      },
      () => {
        this.esGerenciaConfirmado = false;
      }
    );
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
    if (this.soloLectura) { return; }
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
    if (this.soloLectura) { return; }
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
    if (this.soloLectura || !origen) { return; }
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
    if (!idTitulo) { return; }
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
    if (this.soloLectura) { return; }
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
    if (this.soloLectura || fila.item.esTitulo) { return; }

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
    if (this.soloLectura) { return; }

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
    if (this.soloLectura) { return; }
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
    if (this.soloLectura) { return; }

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
    if (this.soloLectura) { return; }

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
    if (this.soloLectura) { return; }

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
    if (this.soloLectura || !grupo.id) { return; }

    Swal.fire({
      title: 'Eliminar plantilla',
      text: `¿Eliminar la plantilla "${grupo.grupo}"? Esto no afecta los documentos que ya hayas agregado al proyecto con ella.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (!result.value) { return; }

      firestoreDB.collection('controlAvancePlantillasPersonalizadas').doc(grupo.id).delete()
        .catch((error: any) => {
          Swal.fire('Error', 'No se pudo eliminar la plantilla: ' + error.message, 'error');
        });
    });
  }

  private subirArchivosADocumento(docId: string, archivos: File[]): Promise<void> {
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
      return firestoreDB.collection('controlAvance').doc(docId).get().then((doc: any) => {
        const archivosActuales: ArchivoAdjunto[] = (doc.exists && doc.data().archivos) ? doc.data().archivos : [];
        return firestoreDB.collection('controlAvance').doc(docId).update({
          archivos: archivosActuales.concat(nuevosArchivos)
        });
      });
    });
  }

  onArchivosFilaSeleccionados(event: any, item: ControlAvanceItem, index: number) {
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
    if (!item.id) { return; }

    Swal.fire({
      title: 'Eliminar archivo',
      text: `¿Eliminar "${archivo.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (!result.value) { return; }

      storageRef.ref(archivo.path).delete().catch(() => {
        // si el archivo ya no existe en Storage, igual limpiamos la referencia en Firestore
      }).then(() => {
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
    if (this.soloLectura || !item.id) { return; }

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
    if (this.soloLectura || !item.id) { return; }

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
      '#9CCBE8', // raíz / azul base un poco más oscuro y distinguible
      '#CDE8F8', // hijo directo
      '#DCECF8', // hijo del hijo
      '#EDF7FE', // subnivel siguiente
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
    item.fechaInicioProgramadaManual = true;
    this.OnCambio(item, index);
  }

  onCambioFechaTerminoProgramada(item: ControlAvanceItem, index: number) {
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
    if (this.soloLectura) { return; }
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
   */
  PrepararEliminar(index: number) {
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
      if (result.value) {
        this.Loading = true;

        const idPadreParaRenumerar = item.idPadre;
        const eraLamina = !item.esTitulo;

        const todosLosItems = [item, ...descendientes];
        const batch = firestoreDB.batch();
        todosLosItems.forEach(it => {
          if (!it.id) { return; }
          batch.update(firestoreDB.collection('controlAvance').doc(it.id), {
            activo: false,
            idUsuarioRemovedor: this.usuario.idUsuario
          });
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
      this.ganttDiasTotales = 0;
      return;
    }

    // Retrocede al lunes de la semana de inicio, para que las cabeceras semanales queden alineadas
    const diaSemana = (fechaMin.getDay() + 6) % 7; // 0 = lunes
    const inicioRango = new Date(fechaMin);
    inicioRango.setDate(inicioRango.getDate() - diaSemana);

    const totalDias = this.diasEntreFechas(inicioRango, fechaMax) + 1;
    this.ganttFechaInicioRango = inicioRango;
    this.ganttDiasTotales = totalDias;

    // Cabeceras: agrupa los días en semanas
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

    // Offsets de sábados/domingos, para sombrear esas columnas como guía visual
    const findesDeSemana: number[] = [];
    for (let i = 0; i < totalDias; i++) {
      const fecha = new Date(inicioRango);
      fecha.setDate(fecha.getDate() + i);
      if (fecha.getDay() === 0 || fecha.getDay() === 6) {
        findesDeSemana.push(i);
      }
    }
    this.ganttFinesDeSemanaOffsets = findesDeSemana;

    const hoy = new Date();
    const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    this.ganttHoyOffset = (hoySinHora >= inicioRango && hoySinHora <= fechaMax)
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
        ancho = totalDias;
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
        clase: this.getClaseAvanceReal(item.avanceReal, item.avanceProgramado) || 'avance-sin-datos'
      } as BarraGantt;
    });
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

  // =========================================================================
  // EXPORTAR CARTA GANTT A EXCEL (dibuja la carta Gantt visual: semanas, días y barras)
  // Usa xlsx-populate porque corre 100% en el navegador (sin módulos de Node),
  // a diferencia de ExcelJS que no es compatible con este bundler.
  // =========================================================================

// =========================================================================
  // MÉTODO 1: exportarCartaGanttAExcel — reemplaza el método completo existente
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

      const COL_FIJAS = 4; // Ítem, Actividad, Plazo, % Avance
      const FILA_ENCABEZADO_TABLA = 8;
      const FILA_DIAS = FILA_ENCABEZADO_TABLA + 1;
      const FILA_PRIMER_DATO = FILA_DIAS + 1;
      const totalDias = this.ganttDiasTotales;

      // ---- Paleta clara, estilo planilla Excel clásica (según mockup) ----
      const BORDE_SUAVE = { style: 'thin', color: 'D0D5DB' };
      const BORDE_BARRA = { style: 'thin', color: 'D7DCE1' };
      const COLOR_PROGRESO: { [clase: string]: string } = {
        'avance-verde': 'A9D18E',
        'avance-amarillo': 'FFE699',
        'avance-rojo': 'F4B183',
        'avance-sin-datos': 'B0B0B0'
      };
      const COLOR_TITULO_NIVEL0 = '6FA8DC';   // título raíz: azul medio
      const COLOR_TITULO_SUBNIVEL = 'B4C7E7'; // sub-títulos anidados: azul claro
      const COLOR_HOY = 'F4CCE8';             // franja "hoy": rosa/magenta suave
      const COLOR_HOY_TEXTO = 'C0007D';
      const COLOR_GRIS_EXPORT = 'B0B0B0';

      // ---- Anchos de columna ----
      // Columna 1 más ancha que antes: ahora el logo se combina SOLO en esta columna
      // (antes se combinaba con la columna 2, dejando espacio en blanco alrededor del logo).
      hoja.column(1).width(18);
      hoja.column(2).width(36);
      hoja.column(3).width(8);
      hoja.column(4).width(10);
      for (let i = 0; i < totalDias; i++) {
        hoja.column(COL_FIJAS + 1 + i).width(3.3);
      }

      // ---- Encabezado del documento: 5 filas (Mandante, Contacto, Dirección, Fecha, Código) ----
      const subProyecto: any = this.subProyectoActual || {};
      const mandante = subProyecto.nombreMandante || subProyecto.mandante || 'Banco Estado';
      const contacto = subProyecto.contacto || subProyecto.nombreContacto || '-';
      const direccion = subProyecto.direccion || subProyecto.direccionProyecto || '-';
      const codigoProyecto = (subProyecto.codigo || subProyecto.codigoProyecto || '').trim() ||
        `Proyecto ${this.getIdProyectoActual()} - Subproyecto ${this.getIdSubProyectoActual()}`;

      const ultimaColumnaEncabezado = COL_FIJAS + totalDias;
      // FIX "más juntos": la etiqueta ahora ocupa SOLO la columna 2 (antes 2 a COL_FIJAS,
      // es decir 3 columnas), y el valor arranca en la columna 3. Así el valor queda pegado
      // justo después de la etiqueta, sin las columnas 3 y 4 de por medio como espacio muerto.
      const COL_LABEL_FIN = 2;
      const COL_VALOR_INICIO = 3;

      // Logo: SOLO columna 1 (antes col 1-2), filas 1 a 5.
      hoja.range(1, 1, 5, 1).merged(true);

      const datosEncabezado = [
        ['MANDANTE:', mandante],
        ['CONTACTO:', contacto],
        ['DIRECCIÓN:', direccion],
        ['FECHA:', this.fechaDocumento],
        ['CÓDIGO:', codigoProyecto]
      ];
            datosEncabezado.forEach((dato, indice) => {
        const fila = indice + 1;
        hoja.range(fila, 2, fila, COL_LABEL_FIN).merged(true);
        hoja.range(fila, COL_VALOR_INICIO, fila, ultimaColumnaEncabezado).merged(true);
        hoja.cell(fila, 2).value(dato[0]).style({
          bold: true,
          fontSize: 10,
          fontColor: '222222',
          horizontalAlignment: 'left',
          verticalAlignment: 'top'
        });
        hoja.cell(fila, COL_VALOR_INICIO).value(dato[1]).style({
          bold: dato[0] === 'CÓDIGO:',
          fontSize: 10,
          fontColor: '222222',
          horizontalAlignment: 'left',
          verticalAlignment: 'top'
        });
      });

      // Excel dibuja sus propias líneas de cuadrícula (gris claro) sobre cualquier celda sin
      // relleno. Con relleno blanco explícito en todo el bloque, esas líneas dejan de verse
      // y solo queda el borde real que se pinta más abajo.
      for (let f = 1; f <= 5; f++) {
        for (let c = 1; c <= ultimaColumnaEncabezado; c++) {
          hoja.cell(f, c).style('fill', 'FFFFFF');
        }
      }

      // Borde exterior real del bloque: se acumula lado por lado por celda (en vez de usar
      // .range().style('border', ...), que pinta el borde en cada celda del rango, incluida
      // la línea divisoria interna entre columnas/filas) para que solo quede el contorno.
      const bordesExterior: { [clave: string]: any } = {};
      const agregarLadoBorde = (f: number, c: number, lado: 'top' | 'bottom' | 'left' | 'right') => {
        const clave = `${f}_${c}`;
        if (!bordesExterior[clave]) { bordesExterior[clave] = {}; }
        bordesExterior[clave][lado] = { style: 'thin', color: '111111' };
      };
      for (let c = 1; c <= ultimaColumnaEncabezado; c++) {
        agregarLadoBorde(1, c, 'top');
        agregarLadoBorde(5, c, 'bottom');
      }
      for (let f = 1; f <= 5; f++) {
        agregarLadoBorde(f, 1, 'left');
        agregarLadoBorde(f, ultimaColumnaEncabezado, 'right');
      }
      Object.keys(bordesExterior).forEach(clave => {
        const [f, c] = clave.split('_').map(Number);
        hoja.cell(f, c).style('border', bordesExterior[clave]);
      });

      hoja.row(1).height(22);
      hoja.row(2).height(22);
      hoja.row(3).height(22);
      hoja.row(4).height(22);
      hoja.row(5).height(22);

      // El logo se inserta después de generar el libro (ver insertarLogoEnExcel).

      // ---- Encabezado de tabla: columnas fijas combinadas verticalmente ----
      hoja.range(FILA_ENCABEZADO_TABLA, 1, FILA_DIAS, 1).merged(true);
      hoja.range(FILA_ENCABEZADO_TABLA, 2, FILA_DIAS, 2).merged(true);
      hoja.range(FILA_ENCABEZADO_TABLA, 3, FILA_DIAS, 3).merged(true);
      hoja.range(FILA_ENCABEZADO_TABLA, 4, FILA_DIAS, 4).merged(true);
      hoja.cell(FILA_ENCABEZADO_TABLA, 1).value('Ítem');
      hoja.cell(FILA_ENCABEZADO_TABLA, 2).value('Actividad');
      hoja.cell(FILA_ENCABEZADO_TABLA, 3).value('Plazo');
      hoja.cell(FILA_ENCABEZADO_TABLA, 4).value('% Avance');
      [1, 2, 3, 4].forEach(c => {
        hoja.cell(FILA_ENCABEZADO_TABLA, c).style({
          bold: true,
          fontSize: 10,
          fontColor: '1F2937',
          horizontalAlignment: c === 2 ? 'left' : 'center',
          verticalAlignment: 'center',
          fill: 'F2F2F2',
          border: BORDE_SUAVE
        });
      });

      // ---- Encabezado: meses (fila 7), semanas (fila 8) y días (fila 9) ----
      const meses: Array<{ nombre: string; inicioCol: number; finCol: number }> = [];
      let mesActual = '';
      let inicioMes = COL_FIJAS + 1;
      let columnaMes = COL_FIJAS + 1;
      this.ganttSemanas.forEach(semana => {
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
          hoja.range(7, mes.inicioCol, 7, mes.finCol).merged(true);
        }
        hoja.cell(7, mes.inicioCol).value(mes.nombre).style({
          bold: true,
          fontSize: 9,
          fontColor: '1F2937',
          horizontalAlignment: 'center',
          verticalAlignment: 'center',
          fill: 'FFFFFF',
          border: BORDE_SUAVE
        });
      });

      let colCursor = COL_FIJAS + 1;
      this.ganttSemanas.forEach(semana => {
        const inicioCol = colCursor;
        const finCol = colCursor + semana.dias.length - 1;

        if (finCol > inicioCol) {
          hoja.range(FILA_ENCABEZADO_TABLA, inicioCol, FILA_ENCABEZADO_TABLA, finCol).merged(true);
        }
        for (let c = inicioCol; c <= finCol; c++) {
          hoja.cell(FILA_ENCABEZADO_TABLA, c).style({
            bold: true,
            fontSize: 8,
            fontColor: '1F2937',
            horizontalAlignment: 'center',
            verticalAlignment: 'center',
            fill: 'FFFFFF',
            border: BORDE_SUAVE
          });
        }
        hoja.cell(FILA_ENCABEZADO_TABLA, inicioCol).value(semana.etiqueta);

        semana.dias.forEach((dia, idx) => {
          hoja.cell(FILA_DIAS, inicioCol + idx)
            .value(dia.numero)
            .style({
              fontSize: 7,
              fontColor: '6C757D',
              horizontalAlignment: 'center',
              verticalAlignment: 'center',
              border: BORDE_SUAVE
            });
        });

        colCursor = finCol + 1;
      });

      // ---- Filas de datos: una por cada barra, en el mismo orden jerárquico que la vista ----
      let filaActual = FILA_PRIMER_DATO;

      this.ganttBarras.forEach((barra, indice) => {
        const item = barra.item;
        const esTitulo = !!item.esTitulo;
        const filaTablaCorrespondiente = this.filasTabla[indice];
        const numeroItem = filaTablaCorrespondiente ? filaTablaCorrespondiente.numero : (item.codigo || '');

        hoja.cell(filaActual, 1).value(numeroItem);
        hoja.cell(filaActual, 2).value('   '.repeat(barra.nivel) + (item.descripcion || ''));
        hoja.cell(filaActual, 3).value(item.plazoProgramado || '');
        hoja.cell(filaActual, 4).value(item.avanceReal != null ? `${item.avanceReal}%` : '');

        const colorTitulo = barra.nivel === 0 ? COLOR_TITULO_NIVEL0 : COLOR_TITULO_SUBNIVEL;

        for (let c = 1; c <= 4; c++) {
          const estilo: any = {
            bold: esTitulo,
            fontSize: 9,
            fontColor: esTitulo ? '1F3864' : '344054',
            verticalAlignment: 'center',
            horizontalAlignment: c === 2 ? 'left' : 'center',
            border: BORDE_SUAVE
          };
          if (esTitulo) { estilo.fill = colorTitulo; }
          hoja.cell(filaActual, c).style(estilo);
        }

        if (esTitulo) {
          for (let d = 0; d < totalDias; d++) {
            hoja.cell(filaActual, COL_FIJAS + 1 + d).style('fill', colorTitulo);
          }
        } else if (barra.esHito) {
          hoja.cell(filaActual, COL_FIJAS + 1 + barra.offsetHito)
            .value('◆')
            .style({
              bold: true,
              fontSize: 8,
              fontColor: 'FFFFFF',
              horizontalAlignment: 'center',
              verticalAlignment: 'center',
              fill: '026AA7'
            });
        } else if (barra.ancho > 0) {
          for (let d = 0; d < barra.ancho; d++) {
            const col = COL_FIJAS + 1 + barra.offset + d;
            const dentroDeRelleno = d < barra.anchoRelleno;
            const celda = hoja.cell(filaActual, col);
            const colorRelleno = dentroDeRelleno ? (COLOR_PROGRESO[barra.clase] || COLOR_GRIS_EXPORT) : COLOR_GRIS_EXPORT;
            celda.style('fill', colorRelleno);
            celda.style('border', {
              top: BORDE_BARRA,
              bottom: BORDE_BARRA,
              left: d === 0 ? BORDE_BARRA : undefined,
              right: d === barra.ancho - 1 ? BORDE_BARRA : undefined
            });
          }
        }

        hoja.row(filaActual).height(16);
        filaActual++;
      });

      // ---- Franja "Hoy" ----
      if (this.ganttHoyOffset >= 0) {
        const colHoy = COL_FIJAS + 1 + this.ganttHoyOffset;

        hoja.cell(FILA_DIAS, colHoy).style({ fill: COLOR_HOY, fontColor: COLOR_HOY_TEXTO, bold: true });

        for (let f = 7; f < filaActual; f++) {
          hoja.cell(f, colHoy).style('border', {
            left: { style: 'medium', color: COLOR_HOY_TEXTO },
            right: { style: 'medium', color: COLOR_HOY_TEXTO }
          });
        }
      }

      // ---- Hoja adicional con la tabla completa del control de avance ----
      const hojaTabla = workbook.addSheet('Tabla');
      const encabezadosTabla = [
        'N°', 'Código', 'Tipo', 'Descripción', 'Rev.', 'Estado',
        'F. Inicio Programada', 'Plazo Programado', 'F. Término Programada',
        '% Avance Programado', 'F. Inicio Real', 'Plazo Real',
        'F. Término Real', '% Avance Real'
      ];

      const columnasTablaAncho = [15, 16, 16, 44, 8, 16, 15, 11, 17, 18, 15, 11, 17, 15];
      encabezadosTabla.forEach((titulo, index) => {
        const col = index + 1;
        hojaTabla.column(col).width(columnasTablaAncho[index]);
        hojaTabla.cell(1, col).value(titulo).style({
          bold: true,
          fontSize: 9,
          fontColor: '1F2937',
          horizontalAlignment: 'center',
          verticalAlignment: 'center',
          fill: 'F2F2F2',
          border: BORDE_SUAVE
        });
      });

      const formatearFechaExcel = (fecha: string) => {
        if (!fecha) return '';
        const date = new Date(fecha);
        if (isNaN(date.getTime())) return fecha;
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      this.filasTabla.forEach((fila, idx) => {
        const filaExcel = idx + 2;
        const item = fila.item;
        const datos = [
          fila.numero,
          item.codigo || '',
          item.tipo || '',
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

        datos.forEach((valor, colIdx) => {
          hojaTabla.cell(filaExcel, colIdx + 1).value(valor);
        });

        for (let c = 1; c <= encabezadosTabla.length; c++) {
          hojaTabla.cell(filaExcel, c).style({
            fontSize: 8,
            fontColor: item.esTitulo ? '1F3864' : '344054',
            verticalAlignment: 'center',
            horizontalAlignment: c === 4 ? 'left' : 'center',
            fill: item.esTitulo ? COLOR_TITULO_NIVEL0 : 'FFFFFF',
            border: BORDE_SUAVE
          });
        }
      });

      // ---- Congela solo las cabeceras (semanas/días), no las columnas fijas ----
      // FIX: freezePanes(COL_FIJAS, ...) congelaba también las 4 primeras columnas, y Excel
      // dibuja la línea divisoria de ese "panel inmovilizado" a lo largo de TODA la altura de
      // la hoja (incluido el bloque del encabezado), sin importar el relleno o los bordes que
      // se pinten — es una línea de la interfaz de Excel, no un borde de celda. Al congelar solo
      // las filas, esa línea desaparece del todo; el costo es que al hacer scroll horizontal en
      // la Carta Gantt ya no quedan fijas las columnas Ítem/Actividad/Plazo/%Avance.
      hoja.freezePanes(0, FILA_DIAS);

      // ---- Descargar ----
      const nombreProyecto = (this.nombreProyectoVisible || 'Proyecto').replace(/[\\/:*?"<>|]/g, '-');
      const fechaArchivo = this.formatearFechaISO(new Date());
      const nombreArchivo = `CartaGantt_${nombreProyecto}_${fechaArchivo}.xlsx`;

      const blob = await workbook.outputAsync();
      const excelConLogo = await this.insertarLogoEnExcel(blob);
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

  // =========================================================================
  // MÉTODO 2: insertarLogoEnExcel — reemplaza el método completo existente
  // Cambio clave: twoCellAnchor (de A1 hasta el borde de A6) en vez de un
  // tamaño fijo en EMUs. Así el logo SIEMPRE llena exactamente la celda
  // combinada del encabezado (columna 1, filas 1-5), sin espacio en blanco
  // sobrante ni importar qué alto de fila uses.
  // =========================================================================
  private async insertarLogoEnExcel(blob: Blob): Promise<Blob> {
    const rutaLogo = new URL('app/TimbreN.jpg', document.baseURI).toString();
    const respuesta = await fetch(rutaLogo);
    if (!respuesta.ok) {
      throw new Error('No se pudo cargar el logo de Trazas.');
    }

    const imagen = await respuesta.arrayBuffer();
    const zip = await (JSZip as any).loadAsync(blob);
    zip.file('xl/media/image1.jpg', imagen);

    const archivoTipos = zip.file('[Content_Types].xml');
    if (!archivoTipos) {
      throw new Error('El archivo Excel no tiene una estructura OOXML válida.');
    }
    const tipos = await archivoTipos.async('string');
    if (tipos.indexOf('/xl/drawings/drawing1.xml') === -1) {
      zip.file('[Content_Types].xml', tipos.replace(
        '</Types>',
        '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Default Extension="jpg" ContentType="image/jpeg"/></Types>'
      ));
    }

    const rutaRelacionesHoja = 'xl/worksheets/_rels/sheet1.xml.rels';
    const archivoRelacionesHoja = zip.file(rutaRelacionesHoja);
    const relacionesHoja = archivoRelacionesHoja
      ? await archivoRelacionesHoja.async('string')
      : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    zip.file('xl/worksheets/_rels/sheet1.xml.rels', relacionesHoja.replace(
      '</Relationships>',
      '<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>'
    ));

    const archivoHoja = zip.file('xl/worksheets/sheet1.xml');
    if (!archivoHoja) {
      throw new Error('No se encontró la hoja principal del Excel.');
    }
    const hoja = await archivoHoja.async('string');
    zip.file('xl/worksheets/sheet1.xml', hoja.replace(
      '</worksheet>',
      '<drawing r:id="rIdLogo"/></worksheet>'
    ));

    // oneCellAnchor con tamaño FIJO (no estirado): mantiene la proporción real del logo
    // (misma relación de aspecto que el tamaño original que ya se veía bien: 1095375x1270000),
    // pero un poco más grande para llenar mejor el bloque de 5 filas sin dejar tanto espacio
    // en blanco. Si se estira para llenar la celda exacta (twoCellAnchor) el logo se deforma
    // cuando la celda no tiene la misma proporción que la imagen real — por eso NO usamos eso.
    zip.file('xl/drawings/drawing1.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
      '<xdr:oneCellAnchor>' +
      '<xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>' +
      '<xdr:ext cx="1205200" cy="1397000"/>' +
      '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="TimbreN.jpg"/><xdr:cNvPicPr/></xdr:nvPicPr>' +
      '<xdr:blipFill><a:blip r:embed="rIdLogoImage" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>' +
      '<xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>' +
      '<xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>'
    );
    zip.file('xl/drawings/_rels/drawing1.xml.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rIdLogoImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.jpg"/>' +
      '</Relationships>'
    );

    return zip.generateAsync({ type: 'blob' });
  }
}