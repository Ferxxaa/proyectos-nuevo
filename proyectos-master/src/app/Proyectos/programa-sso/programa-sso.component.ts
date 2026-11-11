import { Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { ProgramaSsoService, ProgramaMes, ActividadPrograma } from './programa-sso.service';
import { getFeriadosChile } from '../estadisticas-hh/control-asistencia.component';
import {
  AdjuntoRegistro, RegistroDia, NIVELES_CUMPLIMIENTO, VALORES_CUMPLIMIENTO, ENTIDADES_ESPECIFICAS, TAMANO_MAXIMO_ADJUNTO,
  registrosDe, sumarHHPrograma, redondear, subirAdjunto, borrarAdjunto,
  CATEGORIAS_HH, CATEGORIA_ESPECIFICA, categoriaFijaDe, calcularHH, hhRegistroMin, formatoHM, minutosAHoras,
  textoCategoriaHH, ResumenHH, resumenHHVacio, textoEntidad
} from './programa-registro';
import { exportarProgramaExcel, exportarConsolidadoAnualExcel } from './programa-excel';
import { firestoreDB } from '../../firebase-init';
import { ConsumoMA, consumoMADe, CONSUMOS_MA } from './programa-registro';

/** Tabla de Medio Ambiente (pestaña MA de Estadísticas SSO/MA/INCS). */
const COLECCION_ESTADISTICAS_MA = 'estadisticasMA';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const LETRAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // indice = getDay()
const NOMBRE_DIA = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
const NOMBRE_DIA_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Feriados de Chile: mismo cálculo del Control de asistencia. Igual se pueden marcar o desmarcar a mano.

const GRUPOS_BASE = [
  'LIDERAZGO',
  'CAPACITACIÓN Y CHARLAS',
  'INSPECCIONES PLANEADAS',
  'ELEMENTOS DE PROTECCIÓN PERSONAL',
  'EMERGENCIAS',
  'REUNIONES Y COMUNICACIÓN'
];

// Secciones (subtítulos) dentro de un ítem
const SECCION_CAP_OPERACIONAL = 'Capacitación Operacional';
const SECCION_CAP_ESPECIFICA = 'Capacitaciones Específicas';

/** Para programas ya creados sin sección: se asigna según el nombre de la actividad. */
const SECCION_POR_NOMBRE: { [nombre: string]: string } = {
  'charla diaria de seguridad': SECCION_CAP_OPERACIONAL,
  'analisis de riesgo de trabajo': SECCION_CAP_OPERACIONAL,
  'capacitacion de procedimiento': SECCION_CAP_OPERACIONAL,
  'induccion a personal nuevo (odi, riohs, epp)': SECCION_CAP_OPERACIONAL,
  'induccion procedimientos trabajo seguro': SECCION_CAP_OPERACIONAL,
  'capacitacion planeada con mutual de seguridad': SECCION_CAP_ESPECIFICA
};

// [grupo, nombre, frecuencia, diaSemana, seccion?]
const PLANTILLA: any[] = [
  [0, 'Participación de Jefe de Obra como relator', 'DIARIA', 0],
  [0, 'Participación de Jefe de obra en inspecciones', 'SEMANAL', 4],
  [1, 'Charla Diaria de seguridad', 'DIARIA', 0, SECCION_CAP_OPERACIONAL],
  [1, 'Análisis de Riesgo de Trabajo', 'DIARIA', 0, SECCION_CAP_OPERACIONAL],
  [1, 'Capacitación de procedimiento', 'SEMANAL', 3, SECCION_CAP_OPERACIONAL],
  [1, 'Inducción a personal nuevo (ODI, RIOHS, EPP)', 'SEGUN_NECESIDADES', 0, SECCION_CAP_OPERACIONAL],
  [1, 'Inducción procedimientos trabajo seguro', 'SEGUN_NECESIDADES', 0, SECCION_CAP_OPERACIONAL],
  [1, 'Capacitación planeada con Mutual de Seguridad', 'SEGUN_NECESIDADES', 0, SECCION_CAP_ESPECIFICA],
  [2, 'Ipal Enel', 'DIARIA', 0],
  [2, 'Revisión herramientas Manuales', 'SEMANAL', 5],
  [2, 'Revisión herramientas Eléctricas', 'SEMANAL', 5],
  [2, 'Inspección de Andamios', 'SEMANAL', 1],
  [2, 'Inspección Líneas de Vida Horizontal y Vertical', 'SEMANAL', 1],
  [2, 'Inspección de maquinarias', 'MENSUAL', 0],
  [2, 'Inspección de Terreno', 'SEMANAL', 1],
  [2, 'Inspección Instalación de faena según DS 594', 'SEMANAL', 3],
  [2, 'Inspección de bodega de materiales y almacenamiento', 'SEMANAL', 3],
  [2, 'Inspección Extintores', 'MENSUAL', 0],
  [2, 'Seguimiento Planilla Control Extintores', 'MENSUAL', 0],
  [3, 'Inspección estado y uso de EPP básicos', 'SEMANAL', 1],
  [3, 'Inventario Stock EPP', 'SEMANAL', 3],
  [3, 'Inspección estado y uso de EPP Específico', 'SEMANAL', 1],
  [4, 'Contingencias', 'SEGUN_NECESIDADES', 0],
  [4, 'Simulacros (Derrames, sismos, incendios, etc.)', 'SEGUN_NECESIDADES', 0],
  [4, 'Difusión procedimiento de Trabajo Seguro', 'SEGUN_NECESIDADES', 0],
  [5, 'Informe diario', 'DIARIA', 0],
  [5, 'Informe semanal', 'SEMANAL', 5],
  [5, 'Informe mensual', 'MENSUAL', 0],
  [5, 'Estadística', 'MENSUAL', 0],
  [5, 'Reunión de Coordinación de obra', 'SEMANAL', 1]
];

const GRUPOS_MA = [
  'LIDERAZGO',
  'CAPACITACIÓN Y CHARLAS',
  'INSPECCIONES PROGRAMADAS',
  'EMERGENCIA',
  'IDENTIFICACIÓN DE ASPECTOS',
  'REUNIONES Y COMUNICACIÓN'
];

const PLANTILLA_MA: any[] = [
  [0, 'Participación de Jefe de Obra como relator', 'QUINCENAL', 0],
  [0, 'Participación en la creación matriz MA', 'POR_ACTIVIDAD', 0],
  [0, 'Participación de Jefe de obra en inspecciones', 'SEMANAL', 4],
  [1, 'Charla de 5 minutos (relacionada con MA)', 'QUINCENAL', 0],
  [1, 'Capacitaciones específicas MA', 'MENSUAL', 0],
  [1, 'Capacitación con Mutual MA', 'POR_ACTIVIDAD', 0],
  [1, 'Inducción ISO 14.001 personal nuevo', 'SEGUN_NECESIDADES', 0],
  [1, 'Inducción ISO 14.001 personal permanente', 'MENSUAL', 0],
  [2, 'Revisión jaula de residuos', 'SEGUN_NECESIDADES', 0],
  [2, 'Revisión aire acondicionado', 'SEGUN_NECESIDADES', 0],
  [2, 'Reciclar papel', 'MENSUAL', 0],
  [2, 'Segregación materiales uso cocina', 'MENSUAL', 0],
  [2, 'Reciclar pilas y baterías', 'SEGUN_NECESIDADES', 0],
  [3, 'Simulacro derrames de sustancias', 'SEGUN_NECESIDADES', 0],
  [4, 'Actualización Matriz MA', 'SEGUN_NECESIDADES', 0],
  [4, 'Certificado botadero', 'SEGUN_NECESIDADES', 0],
  [5, 'Informes Diarios', 'DIARIA', 0],
  [5, 'Informes Semanales', 'SEMANAL', 5],
  [5, 'Informes Mensual', 'MENSUAL', 0]
];

interface DiaInfo {
  dia: number;
  dow: number;
  letra: string;
  finde: boolean;
  feriado: boolean;
  rojo: boolean;
  hoy: boolean;
}

interface CeldaVista {
  dia: number;
  clase: string;  // c-rojo | c-verde | c-azul | ''
  x: boolean;     // realizado (cumplimiento > 0)
  cump: number;   // 100 | 75 | 50 | 0 | null (sin registro)
  adj: number;    // cantidad de adjuntos
  hhMin: number;  // HH capacitación registradas ese día (minutos)
}

interface FilaVista {
  act: ActividadPrograma;
  celdas: CeldaVista[];
  total: number;
  ctrl: number;   // ponderado por cumplimiento (75% = 0,75 / 50% = 0,5)
  pct: number;    // null = sin programación
}

interface SeccionVista {
  nombre: string;      // '' = sin subtítulo
  filas: FilaVista[];
  pct: number;
}

interface GrupoVista {
  nombre: string;
  filas: FilaVista[];
  secciones: SeccionVista[];
  pct: number;
}

/** Resumen de un programa (SSO o MA) para el Consolidado del mes. */
interface ResumenGrupo { nombre: string; prog: number; real: number; pct: number; secciones: { nombre: string; prog: number; real: number; pct: number }[]; }
interface ResumenPrograma {
  tipo: string;            // 'SSO' | 'MA'
  existe: boolean;
  estado: string;
  textoEstado: string;
  validadoPor: string;
  totalProg: number;
  totalCtrl: number;
  pct: number;             // null = sin días programados
  promedioItems: number;   // null = sin días programados
  grupos: ResumenGrupo[];
  hh: ResumenHH;           // HH Capacitación del programa (minutos + horas)
  consumos: { etiqueta: string; unidad: string; valor: number }[];
}

/** Consolidado anual */
interface CeldaAnual { mes: number; tipo: string; existe: boolean; pct: number; pendiente: boolean; }
interface FilaAnual { id: string; nombre: string; actual: boolean; celdas: CeldaAnual[]; totalSSO: number; totalMA: number; }

/** Datos del popup de registro de un día. */
interface ModalRegistro {
  act: ActividadPrograma;
  dia: number;
  fechaTexto: string;
  soloLectura: boolean;
  existente: boolean;
  cumplimiento: number;
  categoria: string;                 // OPERACIONAL | ESPECIFICA | '' (no aplica)
  categoriaFija: boolean;            // true = la define la sección de la actividad
  trabajadores: any;                 // inputs (se validan al guardar)
  horas: any;
  minutos: any;
  entidad: string;                   // entidad de las HH específicas
  antiguo: { minOperacional: number; minEspecificas: number; minTotal: number }; // registro en horas decimales (o null)
  descartarAntiguo: boolean;         // true = al guardar se borran las HH antiguas
  consumoDef: ConsumoMA;             // solo MA: consumo que se registra en esta actividad (o null)
  consumo: number;
  observacion: string;
  adjuntos: AdjuntoRegistro[];
  registradoPor: string;
  fechaRegistro: string;
}

@Component({
  selector: 'app-programa-sso',
  templateUrl: './programa-sso.component.html',
  styleUrls: ['./programa-sso.component.css'],
  providers: [ProgramaSsoService]
})
export class ProgramaSsoComponent implements OnChanges, OnDestroy {

  @Input() idSubProyecto: any;
  @Input() nombreSubProyecto: string = '';
  @Input() editable: boolean = true;       // false = cliente / solo lectura
  @Input() puedeValidar: boolean = false;  // Director de Proyecto o Sub-gerente
  @Input() tipoPrograma: string = 'SSO';
  @Input() idProyecto: any = null;          // opcional: se guarda en la tabla de MA si el documento es nuevo

  meses = MESES;
  nivelesCumplimiento = NIVELES_CUMPLIMIENTO;
  categoriasHH = CATEGORIAS_HH;
  formatoHM = formatoHM;
  textoCategoriaHH = textoCategoriaHH;
  textoEntidad = textoEntidad;
  entidadesEspecificas = ENTIDADES_ESPECIFICAS;
  frecuencias = [
    { v: 'DIARIA', t: 'Diaria' },
    { v: 'SEMANAL', t: 'Semanal' },
    { v: 'MENSUAL', t: 'Mensual' },
    { v: 'QUINCENAL', t: 'Quincenal' },
    { v: 'POR_ACTIVIDAD', t: 'Por actividad' },
    { v: 'SEGUN_NECESIDADES', t: 'Según necesidades' }
  ];
  diasSemana = [
    { v: 1, t: 'Lun' }, { v: 2, t: 'Mar' }, { v: 3, t: 'Mié' }, { v: 4, t: 'Jue' }, { v: 5, t: 'Vie' }
  ];
  // Frecuencia y día de la semana en un solo selector
  opcionesFrecuencia = [
    { v: 'DIARIA', t: 'Diaria' },
    { v: 'SEMANAL-1', t: 'Semanal · Lun' },
    { v: 'SEMANAL-2', t: 'Semanal · Mar' },
    { v: 'SEMANAL-3', t: 'Semanal · Mié' },
    { v: 'SEMANAL-4', t: 'Semanal · Jue' },
    { v: 'SEMANAL-5', t: 'Semanal · Vie' },
    { v: 'QUINCENAL', t: 'Quincenal' },
    { v: 'MENSUAL', t: 'Mensual' },
    { v: 'POR_ACTIVIDAD', t: 'Por actividad' },
    { v: 'SEGUN_NECESIDADES', t: 'Según necesidad' }
  ];

  anio: number;
  mesSel: number;
  mesesConPrograma: number[] = [];

  programa: ProgramaMes = null;
  cargando = false;
  procesando = false;
  estadoGuardado = '';

  dias: DiaInfo[] = [];
  grupos: GrupoVista[] = [];
  totalProg = 0;
  totalCtrl = 0;
  pctTotal = 0;
  pctGlobal = 0;

  // HH Capacitación del mes (operacionales + específicas, en minutos). Van a Estadísticas HH.
  hhMes: ResumenHH = resumenHHVacio();

  // Popup de registro
  modal: ModalRegistro = null;
  private guardandoRegistro = false;     // evita registros duplicados por doble clic
  subiendo = 0;
  progresoSubida = 0;
  errorModal = '';
  private adjNuevos: AdjuntoRegistro[] = [];     // subidos en este popup (se borran si se cancela)
  private adjQuitados: AdjuntoRegistro[] = [];   // existentes que se quitan al guardar

  @ViewChild('scrollGrilla') scrollGrilla: ElementRef;

  /** Arrastre (solo en borrador): mantener apretado el clic y pasar por los días los marca (o desmarca) todos. */
  arrastrando = false;
  private modoArrastre: 'agregar' | 'quitar' = 'agregar';
  private huboCambiosArrastre = false;

  private nombreUsuario = '';
  private timerGuardar: any = null;
  private timerEstado: any = null;
  private pendiente: ProgramaMes = null;
  private cargaToken = 0;

  constructor(private sPrograma: ProgramaSsoService) {
    const hoy = new Date();
    this.anio = hoy.getFullYear();
    this.mesSel = hoy.getMonth() + 1;
    try {
      const u = JSON.parse(localStorage.getItem('usuario') || '{}');
      this.nombreUsuario = u.nombreUsuario || u.nombre || u.usuario || '';
    } catch (e) {
      this.nombreUsuario = '';
    }
  }

  get esMA(): boolean {
    return this.tipoPrograma === 'MA';
  }

  /** Pestaña "Consolidado del mes": SSO y MA juntos, solo lectura. */
  get esConsolidado(): boolean {
    return this.tipoPrograma === 'CONSOLIDADO';
  }

  /** Pestaña "Consolidado anual": cumplimiento SSO / MA por obra y mes (como la planilla REG). */
  get esAnual(): boolean {
    return this.tipoPrograma === 'ANUAL';
  }

  seleccionarTipoPrograma(tipo: string) {
    if (tipo === this.tipoPrograma) { return; }
    this.flushGuardado();
    this.tipoPrograma = tipo;
    this.cargarAnio();
  }

  private get coleccionPrograma(): string {
    return this.esMA ? 'programaMA' : 'programaSSO';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['idSubProyecto'] && this.idSubProyecto != null && this.idSubProyecto !== '') {
      this.cargarAnio();
    }
  }

  ngOnDestroy() {
    if (this.modal) { this.cancelarRegistro(); }
    this.flushGuardado();
    if (this.timerEstado) { clearTimeout(this.timerEstado); }
  }

  // ===================== Estado del programa =====================

  get estado(): string {
    if (!this.programa) { return ''; }
    return this.programa.estado || 'borrador';
  }

  // Programación editable: solo mientras está en borrador
  get enEdicion(): boolean {
    return this.editable && this.estado === 'borrador';
  }

  // Control (registrar realizado): solo cuando la programación ya fue validada
  get enControl(): boolean {
    return this.editable && this.estado === 'validado';
  }

  get textoEstado(): string {
    if (this.estado === 'pendiente') { return 'Pendiente de validación'; }
    if (this.estado === 'validado') { return 'Programa validado'; }
    return 'Borrador de programación';
  }

  // ===================== Carga =====================

  cargarAnio() {
    if (this.esAnual) { this.cargarAnual(); return; }
    const anio = this.anio;
    this.mesesConPrograma = [];
    const colecciones = this.esConsolidado ? ['programaSSO', 'programaMA'] : [this.coleccionPrograma];
    Promise.all(colecciones.map(c => Promise.resolve(this.sPrograma.mesesExistentes(this.idSubProyecto, anio, c))))
      .then((listas: number[][]) => {
        if (anio !== this.anio) { return; }
        const union: number[] = [];
        listas.forEach(l => (l || []).forEach(m => { if (union.indexOf(m) < 0) { union.push(m); } }));
        this.mesesConPrograma = union;
      }).catch(err => console.error('programaSSO meses', err));
    this.cargarMes();
  }

  cambiarAnio(delta: number) {
    this.flushGuardado();
    this.anio += delta;
    this.cargarAnio();
  }

  seleccionarMes(m: number) {
    if (m === this.mesSel) { return; }
    this.flushGuardado();
    this.mesSel = m;
    this.cargarMes();
  }

  tieneMes(m: number): boolean {
    return this.mesesConPrograma.indexOf(m) >= 0;
  }

  esMesActual(m: number): boolean {
    const hoy = new Date();
    return this.anio === hoy.getFullYear() && m === hoy.getMonth() + 1;
  }

  cargarMes() {
    if (this.modal) { this.cancelarRegistro(); }
    const token = ++this.cargaToken;
    this.cargando = true;
    this.programa = null;
    this.grupos = [];
    this.consolidado = null;

    if (this.esConsolidado) {
      Promise.all(['programaSSO', 'programaMA'].map(c =>
        Promise.resolve(this.sPrograma.obtener(this.idSubProyecto, this.anio, this.mesSel, c)).catch(err => {
          console.error('consolidado ' + c, err);
          return null;
        })
      )).then((lista: ProgramaMes[]) => {
        if (token !== this.cargaToken) { return; }
        this.consolidado = {
          sso: this.resumenDe(lista[0], 'SSO'),
          ma: this.resumenDe(lista[1], 'MA')
        };
        this.dias = this.construirDias([]);
        this.cargando = false;
      });
      return;
    }

    this.sPrograma.obtener(this.idSubProyecto, this.anio, this.mesSel, this.coleccionPrograma).then(p => {
      if (token !== this.cargaToken) { return; }
      this.programa = p ? this.normalizar(p) : null;
      this.recalcular();
      this.cargando = false;
      this.irAHoy();
    }).catch(err => {
      if (token !== this.cargaToken) { return; }
      console.error('programaSSO obtener', err);
      this.cargando = false;
    });
  }

  // ===================== Consolidado del mes =====================

  consolidado: { sso: ResumenPrograma; ma: ResumenPrograma } = null;

  /** % global del mes: realizadas / programadas de SSO + MA. */
  get pctConsolidado(): number {
    if (!this.consolidado) { return null; }
    const prog = this.consolidado.sso.totalProg + this.consolidado.ma.totalProg;
    const real = this.consolidado.sso.totalCtrl + this.consolidado.ma.totalCtrl;
    return prog > 0 ? Math.round(real * 100 / prog) : null;
  }

  get realConsolidado(): number {
    return this.consolidado ? redondear(this.consolidado.sso.totalCtrl + this.consolidado.ma.totalCtrl) : 0;
  }

  get progConsolidado(): number {
    return this.consolidado ? this.consolidado.sso.totalProg + this.consolidado.ma.totalProg : 0;
  }

  // ===================== Consolidado anual (todas las obras) =====================

  anual: FilaAnual[] = null;
  totalesMesAnual: CeldaAnual[] = [];     // 24 celdas: ene SSO, ene MA, feb SSO...
  totalSSOAnual: number = null;
  totalMAAnual: number = null;
  pendientesAnual = 0;
  errorAnual = false;
  /** Columnas de la tabla anual: mes + tipo */
  readonly columnasAnual = (() => {
    const res: { mes: number; tipo: string }[] = [];
    for (let m = 1; m <= 12; m++) { res.push({ mes: m, tipo: 'SSO' }, { mes: m, tipo: 'MA' }); }
    return res;
  })();
  readonly mesesCortos = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  /**
   * Lee los programas SSO y MA del año de todas las obras (el cliente solo ve su subproyecto)
   * y calcula el % de cumplimiento de cada mes con la misma lógica de la grilla.
   */
  cargarAnual() {
    if (this.modal) { this.cancelarRegistro(); }
    const token = ++this.cargaToken;
    const anio = this.anio;
    this.cargando = true;
    this.errorAnual = false;
    this.programa = null;
    this.consolidado = null;
    this.anual = null;

    const soloEste = !this.editable;
    const consulta = (col: string) => soloEste
      ? firestoreDB.collection(col).where('idSubProyecto', '==', String(this.idSubProyecto)).get()
      : firestoreDB.collection(col).where('anio', '==', anio).get();

    // nombres de las obras: del propio programa, o de las estadísticas de HH / MA del año
    const nombres: { [id: string]: string } = {};
    const leerNombres = (col: string) => firestoreDB.collection(col).where('anio', '==', anio).get()
      .then((snap: any) => snap.forEach((doc: any) => {
        const d = doc.data();
        if (d && d.idSubProyecto !== undefined && d.nombreSubProyecto) { nombres[String(d.idSubProyecto)] = d.nombreSubProyecto; }
      }))
      .catch(() => null);

    Promise.all([consulta('programaSSO'), consulta('programaMA'),
      soloEste ? Promise.resolve(null) : leerNombres('estadisticasHH'),
      soloEste ? Promise.resolve(null) : leerNombres('estadisticasMA')])
      .then((res: any[]) => {
        if (token !== this.cargaToken) { return; }
        const filas: { [id: string]: FilaAnual } = {};
        const procesar = (snap: any, tipo: string) => snap.forEach((doc: any) => {
          const p = doc.data();
          if (!p || Number(p.anio) !== anio || !p.mes) { return; }
          const id = String(p.idSubProyecto);
          if (p.nombreSubProyecto) { nombres[id] = p.nombreSubProyecto; }
          const fila = filas[id] || (filas[id] = this.filaAnualVacia(id));
          const r = this.resumenDe(p, tipo);
          const celda = fila.celdas[(Number(p.mes) - 1) * 2 + (tipo === 'MA' ? 1 : 0)];
          celda.existe = true;
          celda.pct = r.pct;
          celda.pendiente = r.estado !== 'validado';
        });
        procesar(res[0], 'SSO');
        procesar(res[1], 'MA');

        if (nombres[String(this.idSubProyecto)] === undefined && this.nombreSubProyecto) {
          nombres[String(this.idSubProyecto)] = this.nombreSubProyecto;
        }
        const lista = Object.keys(filas).map(id => {
          const f = filas[id];
          f.nombre = nombres[id] || ('Subproyecto ' + id);
          f.totalSSO = this.promedio(f.celdas.filter(c => c.tipo === 'SSO').map(c => c.pct));
          f.totalMA = this.promedio(f.celdas.filter(c => c.tipo === 'MA').map(c => c.pct));
          return f;
        }).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));

        this.totalesMesAnual = this.columnasAnual.map((col, i) => ({
          mes: col.mes, tipo: col.tipo, existe: true, pendiente: false,
          pct: this.promedio(lista.map(f => f.celdas[i].pct))
        }));
        this.totalSSOAnual = this.promedio(this.totalesMesAnual.filter(c => c.tipo === 'SSO').map(c => c.pct));
        this.totalMAAnual = this.promedio(this.totalesMesAnual.filter(c => c.tipo === 'MA').map(c => c.pct));
        this.pendientesAnual = 0;
        lista.forEach(f => f.celdas.forEach(c => { if (c.existe && c.pendiente) { this.pendientesAnual++; } }));

        this.anual = lista;
        this.cargando = false;
      })
      .catch((err: any) => {
        if (token !== this.cargaToken) { return; }
        console.error('consolidado anual', err);
        this.errorAnual = true;
        this.anual = [];
        this.cargando = false;
      });
  }

  private filaAnualVacia(id: string): FilaAnual {
    return {
      id: id,
      nombre: '',
      actual: String(id) === String(this.idSubProyecto),
      celdas: this.columnasAnual.map(c => ({ mes: c.mes, tipo: c.tipo, existe: false, pct: null, pendiente: false })),
      totalSSO: null,
      totalMA: null
    };
  }

  /** Promedio de los valores que existen (null si no hay ninguno), redondeado a 1 decimal. */
  private promedio(valores: number[]): number {
    const v = valores.filter(x => x !== null && x !== undefined);
    if (!v.length) { return null; }
    let s = 0;
    v.forEach(x => s += x);
    return Math.round(s * 10 / v.length) / 10;
  }

  claseCeldaAnual(c: CeldaAnual): string {
    if (!c || !c.existe) { return 'pan-vacia'; }
    if (c.pct === null) { return 'pan-sin'; }
    return 'pan-' + this.claseSemaforo(c.pct);
  }

  tituloCeldaAnual(f: FilaAnual, c: CeldaAnual): string {
    if (!c.existe) { return f.nombre + ' · ' + this.meses[c.mes - 1] + ' ' + c.tipo + ': sin programa'; }
    let t = f.nombre + ' · ' + this.meses[c.mes - 1] + ' ' + c.tipo + ': ' + (c.pct === null ? 'sin días programados' : c.pct + '%');
    if (c.pendiente) { t += ' · programa sin validar (falta revisión)'; }
    return t;
  }

  /** Abre el programa SSO o MA de esa obra/mes (solo si es el subproyecto actual). */
  abrirDesdeAnual(f: FilaAnual, c: CeldaAnual) {
    if (!f.actual || !c.existe) { return; }
    this.mesSel = c.mes;
    this.seleccionarTipoPrograma(c.tipo);
  }

  exportarAnualExcel() {
    if (!this.anual) { return; }
    try {
      exportarConsolidadoAnualExcel({
        anio: this.anio,
        meses: this.mesesCortos,
        filas: this.anual,
        totalesMes: this.totalesMesAnual,
        totalSSO: this.totalSSOAnual,
        totalMA: this.totalMAAnual
      });
    } catch (e) {
      console.error('consolidado anual excel', e);
      alert('No se pudo generar el Excel: ' + (e && e.message ? e.message : e));
    }
  }

  /** Abre el programa SSO o MA del mismo mes desde el consolidado. */
  verPrograma(tipo: string) {
    this.seleccionarTipoPrograma(tipo);
  }

  /**
   * Calcula el resumen con la misma lógica de la grilla: se pone el programa como actual un momento,
   * se arman las filas y se vuelve al estado anterior.
   */
  private resumenDe(p: ProgramaMes, tipo: string): ResumenPrograma {
    const vacio: ResumenPrograma = {
      tipo: tipo, existe: false, estado: '', textoEstado: 'Sin programa', validadoPor: '',
      totalProg: 0, totalCtrl: 0, pct: null, promedioItems: null, grupos: [],
      hh: resumenHHVacio(), consumos: []
    };
    if (!p) { return vacio; }

    const progAnt = this.programa;
    const diasAnt = this.dias;
    const gruposAnt = this.grupos;
    const tot = [this.totalProg, this.totalCtrl, this.pctTotal, this.pctGlobal];
    const hhAnt = this.hhMes;
    try {
      this.programa = this.normalizar(p);
      this.recalcular();
      const r: ResumenPrograma = {
        tipo: tipo,
        existe: true,
        estado: this.estado,
        textoEstado: this.textoEstado,
        validadoPor: this.estado === 'validado' ? (p.validadoPor || '') : '',
        totalProg: this.totalProg,
        totalCtrl: this.totalCtrl,
        pct: this.totalProg > 0 ? this.pctTotal : null,
        promedioItems: this.totalProg > 0 ? this.pctGlobal : null,
        grupos: this.grupos.map(g => {
          let prog = 0;
          let real = 0;
          g.filas.forEach(f => { prog += f.total; real += f.ctrl; });
          return {
            nombre: g.nombre, prog: prog, real: redondear(real), pct: g.pct,
            secciones: g.secciones.filter(s => !!s.nombre).map(s => {
              let sp = 0;
              let sr = 0;
              s.filas.forEach(f => { sp += f.total; sr += f.ctrl; });
              return { nombre: s.nombre, prog: sp, real: redondear(sr), pct: s.pct };
            })
          };
        }),
        hh: this.hhMes,
        consumos: []
      };
      // consumos de MA registrados en el mes
      CONSUMOS_MA.forEach(def => {
        let suma = 0;
        let hay = false;
        p.actividades.forEach(a => {
          const regs = registrosDe(a);
          Object.keys(regs).forEach(k => {
            const reg = regs[k];
            if (reg && reg.consumoCampo === def.campo && reg.consumo !== null && reg.consumo !== undefined) {
              suma += Number(reg.consumo) || 0;
              hay = true;
            }
          });
        });
        if (hay) { r.consumos.push({ etiqueta: def.etiqueta, unidad: def.unidad, valor: redondear(suma) }); }
      });
      return r;
    } catch (e) {
      console.error('consolidado ' + tipo, e);
      return vacio;
    } finally {
      this.programa = progAnt;
      this.dias = diasAnt;
      this.grupos = gruposAnt;
      this.totalProg = tot[0]; this.totalCtrl = tot[1]; this.pctTotal = tot[2]; this.pctGlobal = tot[3];
      this.hhMes = hhAnt;
    }
  }

  private normalizar(p: ProgramaMes): ProgramaMes {
    p.feriados = p.feriados || [];
    p.actividades = p.actividades || [];
    p.estado = p.estado || 'borrador';
    p.actividades.forEach(a => {
      a.programados = a.programados || [];
      a.realizados = a.realizados || [];
      a.diaSemana = a.diaSemana || 0;
      const x: any = a;
      if (x.seccion === undefined || x.seccion === null) {
        x.seccion = SECCION_POR_NOMBRE[this.claveNombre(a.nombre)] || '';
      }
      const regs = registrosDe(a);
      Object.keys(regs).forEach(k => {
        const r = regs[k];
        if (!r) { delete regs[k]; return; }
        r.adjuntos = r.adjuntos || [];
        // null = cumplimiento quitado a mano (se respeta); undefined o valor raro = registro antiguo → 100%
        if (r.cumplimiento !== null && VALORES_CUMPLIMIENTO.indexOf(r.cumplimiento) < 0) { r.cumplimiento = 100; }
      });
    });
    if (!p.grupos || !p.grupos.length) {
      p.grupos = [];
      p.actividades.forEach(a => {
        if (p.grupos.indexOf(a.grupo) < 0) { p.grupos.push(a.grupo); }
      });
    }
    return p;
  }

  crearPrograma() {
    const mesAnt = this.mesSel === 1 ? 12 : this.mesSel - 1;
    const anioAnt = this.mesSel === 1 ? this.anio - 1 : this.anio;
    const anio = this.anio;
    const mes = this.mesSel;
    this.cargando = true;

    this.sPrograma.obtener(this.idSubProyecto, anioAnt, mesAnt, this.coleccionPrograma).then(prev => {
      let grupos: string[];
      let actividades: ActividadPrograma[];

      if (prev && prev.actividades && prev.actividades.length) {
        prev = this.normalizar(prev);
        grupos = prev.grupos.slice();
        actividades = prev.actividades.map(a =>
          this.nuevaActividad(a.grupo, a.nombre, a.frecuencia, a.diaSemana, (a as any).seccion || ''));
      } else {
        const gruposBase = this.esMA ? GRUPOS_MA : GRUPOS_BASE;
        const plantilla = this.esMA ? PLANTILLA_MA : PLANTILLA;
        grupos = gruposBase.slice();
        actividades = plantilla.map(t => this.nuevaActividad(gruposBase[t[0]], t[1], t[2], t[3], t[4] || ''));
      }

      const p: ProgramaMes = {
        idSubProyecto: String(this.idSubProyecto),
        anio: anio,
        mes: mes,
        codigo: (prev && prev.codigo) ? prev.codigo : 'REG-07.A',
        version: (prev && prev.version) ? prev.version : '02',
        grupos: grupos,
        feriados: this.feriadosPorDefecto(anio, mes),
        actividades: actividades,
        estado: 'borrador'
      };
      (p as any).nombreSubProyecto = this.nombreSubProyecto || '';

      this.programa = p;
      // La grilla parte en blanco: solo fines de semana y feriados quedan marcados
      this.dias = this.construirDias(p.feriados);
      this.recalcular();
      return this.sPrograma.guardar(p, this.coleccionPrograma);
    }).then(() => {
      if (this.mesesConPrograma.indexOf(mes) < 0) { this.mesesConPrograma.push(mes); }
      this.cargando = false;
      this.mostrarEstado('Guardado');
    }).catch(err => {
      console.error('programaSSO crear', err);
      this.cargando = false;
      this.mostrarEstado('Error al guardar');
    });
  }

  private nuevaActividad(grupo: string, nombre: string, frecuencia: string, diaSemana: number, seccion: string = ''): ActividadPrograma {
    const a: ActividadPrograma = {
      id: this.nuevoId(),
      grupo: grupo,
      nombre: nombre,
      frecuencia: frecuencia,
      diaSemana: frecuencia === 'SEMANAL' ? (diaSemana || 1) : 0,
      programados: [],
      realizados: []
    };
    (a as any).seccion = seccion || '';
    registrosDe(a);
    return a;
  }

  private claveNombre(nombre: string): string {
    return (String(nombre || '') as any).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  private nuevoId(): string {
    return 'a' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  private feriadosPorDefecto(anio: number, mes: number): number[] {
    const lista = Object.keys(getFeriadosChile(anio));
    const res: number[] = [];
    lista.forEach(f => {
      const partes = f.split('-');
      if (Number(partes[0]) === mes) {
        const d = Number(partes[1]);
        if (res.indexOf(d) < 0) { res.push(d); }
      }
    });
    return res.sort((a, b) => a - b);
  }

  // ===================== Flujo de validación =====================

  guardarProgramacion() {
    if (!this.programa || !this.enEdicion) { return; }
    if (!confirm('¿Guardar la programación de ' + this.meses[this.mesSel - 1] + '?\n\n' +
      'Después de guardarla ya no se puede modificar y queda pendiente de validación ' +
      'por el Director de Proyecto o el Sub-gerente.')) { return; }

    const p = this.programa;
    p.estado = 'pendiente';
    p.programadoPor = this.nombreUsuario;
    p.fechaProgramado = new Date().toISOString();
    p.motivoRechazo = '';
    p.validadoPor = '';
    p.fechaValidado = '';
    this.guardarInmediato('Programación guardada');
  }

  validar() {
    if (!this.programa || !this.puedeValidar || this.estado !== 'pendiente') { return; }
    if (!confirm('¿Validar el programa de ' + this.meses[this.mesSel - 1] + ' ' + this.anio + '?')) { return; }

    const p = this.programa;
    p.estado = 'validado';
    p.validadoPor = this.nombreUsuario;
    p.fechaValidado = new Date().toISOString();
    p.motivoRechazo = '';
    this.guardarInmediato('Programa validado');
  }

  rechazar() {
    if (!this.programa || !this.puedeValidar || this.estado !== 'pendiente') { return; }
    const motivo = prompt('Motivo del rechazo (vuelve a borrador para corregir la programación):');
    if (motivo === null) { return; }

    const p = this.programa;
    p.estado = 'borrador';
    p.motivoRechazo = (motivo || '').trim() || 'Sin motivo indicado';
    p.validadoPor = this.nombreUsuario;
    p.fechaValidado = new Date().toISOString();
    this.guardarInmediato('Programación rechazada');
  }

  reabrir() {
    if (!this.programa || !this.puedeValidar || this.estado !== 'validado') { return; }
    if (!confirm('¿Reabrir la programación?\n\nEl programa vuelve a borrador y se tendrá que guardar y validar de nuevo. ' +
      'Los registros ya hechos (cumplimiento, HH y adjuntos) se mantienen.')) { return; }

    const p = this.programa;
    p.estado = 'borrador';
    p.validadoPor = '';
    p.fechaValidado = '';
    p.motivoRechazo = '';
    this.guardarInmediato('Programación reabierta');
  }

  /** Guarda el nombre del subproyecto en el programa (lo usa el Consolidado anual). */
  private marcarNombre(p: ProgramaMes) {
    if (p && this.nombreSubProyecto && !(p as any).nombreSubProyecto) {
      (p as any).nombreSubProyecto = this.nombreSubProyecto;
    }
  }

  private guardarInmediato(mensaje: string) {
    this.marcarNombre(this.programa);
    if (this.timerGuardar) { clearTimeout(this.timerGuardar); this.timerGuardar = null; }
    this.pendiente = null;
    this.procesando = true;
    this.recalcular();
    this.sPrograma.guardar(this.programa, this.coleccionPrograma).then(() => {
      this.procesando = false;
      this.mostrarEstado(mensaje);
    }).catch(err => {
      console.error('programaSSO guardar', err);
      this.procesando = false;
      this.mostrarEstado('Error al guardar');
    });
  }

  // ===================== Excel =====================

  exportarExcel() {
    if (!this.programa) { return; }
    try {
      exportarProgramaExcel({
        tipo: this.esMA ? 'MA' : 'SSO',
        subproyecto: this.nombreSubProyecto,
        mesNombre: this.meses[this.mesSel - 1],
        anio: this.anio,
        mes: this.mesSel,
        programa: this.programa,
        dias: this.dias,
        grupos: this.grupos,
        textoEstado: this.textoEstado,
        etiquetaFrecuencia: (a: any) => this.etiquetaFrecuencia(a),
        totalProg: this.totalProg,
        totalCtrl: this.totalCtrl,
        pctTotal: this.pctTotal
      });
    } catch (e) {
      console.error('programaSSO excel', e);
      alert('No se pudo generar el Excel: ' + (e && e.message ? e.message : e));
    }
  }

  // ===================== Calendario =====================

  private construirDias(feriados: number[], anioDias?: number, mesDias?: number): DiaInfo[] {
    const anio = anioDias || this.anio;
    const mes = mesDias || this.mesSel;
    const n = new Date(anio, mes, 0).getDate();
    const ahora = new Date();
    const diaHoy = ahora.getFullYear() === anio && ahora.getMonth() + 1 === mes ? ahora.getDate() : 0;
    const res: DiaInfo[] = [];
    for (let d = 1; d <= n; d++) {
      const dow = new Date(anio, mes - 1, d).getDay();
      const finde = dow === 0 || dow === 6;
      const feriado = feriados.indexOf(d) >= 0;
      res.push({ dia: d, dow: dow, letra: LETRAS[dow], finde: finde, feriado: feriado, rojo: finde || feriado, hoy: d === diaHoy });
    }
    return res;
  }

  private esHabil(dia: number): boolean {
    const info = this.dias[dia - 1];
    return !!info && !info.rojo;
  }

  private diasProgramados(a: ActividadPrograma): number[] {
    const habiles = this.dias.filter(d => !d.rojo).map(d => d.dia);
    if (a.frecuencia === 'DIARIA') { return habiles; }
    if (a.frecuencia === 'MENSUAL') { return habiles.length ? [habiles[habiles.length - 1]] : []; }
    if (a.frecuencia === 'QUINCENAL') {
      const res: number[] = [];
      const mitad = Math.ceil(habiles.length / 2);
      if (habiles.length) { res.push(habiles[0]); }
      if (habiles.length > 1) { res.push(habiles[mitad]); }
      return res;
    }
    if (a.frecuencia === 'SEMANAL') {
      const res: number[] = [];
      const objetivo = a.diaSemana || 1;
      this.dias.forEach(d => {
        if (d.dow === objetivo) {
          const pick = this.habilEnSemana(d.dia, objetivo);
          if (pick && res.indexOf(pick) < 0) { res.push(pick); }
        }
      });
      return res.sort((x, y) => x - y);
    }
    return []; // SEGUN_NECESIDADES
  }

  // si el día objetivo es feriado, se corre al siguiente hábil de la misma semana (o al anterior)
  private habilEnSemana(dia: number, dow: number): number {
    const lunes = dia - (dow - 1);
    const viernes = lunes + 4;
    const n = this.dias.length;
    if (this.esHabil(dia)) { return dia; }
    for (let x = dia + 1; x <= viernes && x <= n; x++) {
      if (this.esHabil(x)) { return x; }
    }
    for (let x = dia - 1; x >= lunes && x >= 1; x--) {
      if (this.esHabil(x)) { return x; }
    }
    return 0;
  }

  // ===================== Vista / cálculos =====================

  recalcular() {
    if (!this.programa) {
      this.dias = this.construirDias([]);
      this.grupos = [];
      this.totalProg = 0; this.totalCtrl = 0; this.pctTotal = 0; this.pctGlobal = 0;
      this.hhMes = resumenHHVacio();
      return;
    }
    this.dias = this.construirDias(this.programa.feriados,
      Number(this.programa.anio) || this.anio, Number(this.programa.mes) || this.mesSel);

    let totalProg = 0;
    let totalCtrl = 0;
    let sumaGrupos = 0;
    let nGrupos = 0;

    this.grupos = this.programa.grupos.map(nombre => {
      const filas = this.programa.actividades
        .filter(a => a.grupo === nombre)
        .map(a => this.construirFila(a));

      let suma = 0;
      let n = 0;
      filas.forEach(f => {
        totalProg += f.total;
        totalCtrl += f.ctrl;
        if (f.pct !== null) { suma += f.pct; n++; }
      });
      const pct = n > 0 ? Math.round(suma / n) : null;
      if (pct !== null) { sumaGrupos += pct; nGrupos++; }
      return { nombre: nombre, filas: filas, secciones: this.armarSecciones(filas), pct: pct };
    });

    this.totalProg = totalProg;
    this.totalCtrl = redondear(totalCtrl);
    this.pctTotal = totalProg > 0 ? Math.round(totalCtrl * 100 / totalProg) : 0;
    this.pctGlobal = nGrupos > 0 ? Math.round(sumaGrupos / nGrupos) : 0;

    this.hhMes = sumarHHPrograma(this.programa);
  }

  /** Agrupa las filas por sección en el orden en que aparecen; las sin sección van primero. */
  private armarSecciones(filas: FilaVista[]): SeccionVista[] {
    const orden: string[] = [];
    const mapa: { [s: string]: FilaVista[] } = {};
    filas.forEach(f => {
      const s = (f.act as any).seccion || '';
      if (!mapa[s]) { mapa[s] = []; orden.push(s); }
      mapa[s].push(f);
    });
    orden.sort((a, b) => (a ? 1 : 0) - (b ? 1 : 0)); // '' primero, el resto en su orden
    return orden.map(s => {
      let suma = 0;
      let n = 0;
      mapa[s].forEach(f => { if (f.pct !== null) { suma += f.pct; n++; } });
      return { nombre: s, filas: mapa[s], pct: n > 0 ? Math.round(suma / n) : null };
    });
  }

  private esSegunNecesidad(a: ActividadPrograma): boolean {
    return a.frecuencia === 'SEGUN_NECESIDADES' || a.frecuencia === 'POR_ACTIVIDAD';
  }

  /** Programas antiguos: "Según necesidades" sin días marcados se mostraba todo el mes en verde y contaba 1. */
  private esFormatoAntiguo(a: ActividadPrograma): boolean {
    return this.esSegunNecesidad(a) && !a.programados.length && this.estado !== 'borrador';
  }

  private construirFila(a: ActividadPrograma): FilaVista {
    const sn = this.esSegunNecesidad(a);
    const antiguo = this.esFormatoAntiguo(a);
    const regs = registrosDe(a);

    const celdas: CeldaVista[] = this.dias.map(d => {
      let clase = '';
      if (d.rojo) { clase = 'c-rojo'; }
      else if (antiguo) { clase = 'c-verde'; }
      else if (a.programados.indexOf(d.dia) >= 0) { clase = sn ? 'c-verde' : 'c-azul'; }

      const marcada = clase === 'c-azul' || clase === 'c-verde';
      const reg = regs[String(d.dia)];
      let cump: number = null;
      if (marcada) {
        if (reg) { cump = VALORES_CUMPLIMIENTO.indexOf(reg.cumplimiento) >= 0 ? reg.cumplimiento : null; }
        else if (a.realizados.indexOf(d.dia) >= 0) { cump = 100; } // marcas antiguas sin registro
      }
      return {
        dia: d.dia,
        clase: clase,
        x: cump !== null && cump > 0,
        cump: cump,
        adj: marcada && reg && reg.adjuntos ? reg.adjuntos.length : 0,
        hhMin: marcada && reg ? hhRegistroMin(reg).minTotal : 0
      };
    });

    const marcadas = celdas.filter(c => c.clase === 'c-azul' || c.clase === 'c-verde');
    let total: number;
    let ctrl: number;
    if (antiguo) {
      total = 1;
      ctrl = 0;
      marcadas.forEach(c => { if (c.cump !== null && c.cump / 100 > ctrl) { ctrl = c.cump / 100; } });
    } else {
      // Cuenta los días marcados (azul o verde); el realizado pondera por cumplimiento
      total = marcadas.length;
      ctrl = 0;
      marcadas.forEach(c => { if (c.cump !== null) { ctrl += c.cump / 100; } });
    }
    ctrl = redondear(ctrl);
    const pct = total > 0 ? Math.round(ctrl * 100 / total) : null;
    return { act: a, celdas: celdas, total: total, ctrl: ctrl, pct: pct };
  }

  etiquetaFrecuencia(a: ActividadPrograma): string {
    if (a.frecuencia === 'SEGUN_NECESIDADES') { return 'Según necesidad'; }
    if (a.frecuencia === 'SEMANAL') { return 'Semanal · ' + (NOMBRE_DIA[a.diaSemana] || 'Lun'); }
    if (a.frecuencia === 'DIARIA') { return 'Diaria'; }
    if (a.frecuencia === 'MENSUAL') { return 'Mensual'; }
    if (a.frecuencia === 'QUINCENAL') { return 'Quincenal'; }
    if (a.frecuencia === 'POR_ACTIVIDAD') { return 'Por actividad'; }
    return a.frecuencia;
  }

  claseSemaforo(pct: number): string {
    if (pct === null || pct === undefined) { return 'pct-na'; }
    if (pct >= 90) { return 'pct-ok'; }
    if (pct >= 75) { return 'pct-medio'; }
    return 'pct-bajo';
  }

  esMarcada(c: CeldaVista): boolean {
    return c.clase === 'c-azul' || c.clase === 'c-verde';
  }

  celdaClicable(c: CeldaVista, f: FilaVista): boolean {
    if (c.clase === 'c-rojo') { return false; }
    if (this.enEdicion) { return true; }
    if (!this.esMarcada(c)) { return false; }
    if (this.enControl) { return true; }
    return c.cump !== null; // solo lectura: se puede ver el detalle de lo registrado
  }

  tituloCelda(c: CeldaVista): string {
    if (!this.esMarcada(c)) { return ''; }
    let t = c.clase === 'c-verde' ? 'Según necesidad' : 'Programado';
    if (c.cump === 100) { t = 'Realizado (100%)'; }
    else if (c.cump === 75) { t = 'Parcial (75%)'; }
    else if (c.cump === 50) { t = 'Parcial (50%)'; }
    else if (c.cump === 0) { t = 'No hecho (0%)'; }
    if (c.hhMin) { t += ' · ' + formatoHM(c.hhMin) + ' HH'; }
    if (c.adj) { t += ' · ' + c.adj + (c.adj === 1 ? ' adjunto' : ' adjuntos'); }
    if (this.enControl) { t += c.cump === null ? ' — clic para registrar' : ' — clic para ver o editar'; }
    else if (c.cump !== null && !this.enEdicion) { t += ' — clic para ver el detalle'; }
    return t;
  }

  // ===================== Interacción grilla =====================

  /** Al apretar el clic: en borrador marca/desmarca (con arrastre); en control abre el popup de registro. */
  inicioArrastre(f: FilaVista, c: CeldaVista, evento: MouseEvent) {
    if (!this.programa || !this.celdaClicable(c, f)) { return; }
    if (evento && evento.button !== 0) { return; }
    if (evento) { evento.preventDefault(); } // evita que se seleccione texto al arrastrar

    if (!this.enEdicion) {
      this.abrirRegistro(f, c);
      return;
    }

    const marcado = f.act.programados.indexOf(c.dia) >= 0;
    this.modoArrastre = marcado ? 'quitar' : 'agregar';
    this.arrastrando = true;
    this.huboCambiosArrastre = false;
    this.aplicarArrastre(f, c);
  }

  /** Mientras se mantiene apretado, cada día por el que pasa el mouse toma la misma acción. */
  entrarCelda(f: FilaVista, c: CeldaVista) {
    if (!this.arrastrando || !this.programa || !this.enEdicion || !this.celdaClicable(c, f)) { return; }
    this.aplicarArrastre(f, c);
  }

  @HostListener('document:mouseup')
  finArrastre() {
    if (!this.arrastrando) { return; }
    this.arrastrando = false;
    if (this.huboCambiosArrastre) { this.programarGuardado(); }
  }

  private aplicarArrastre(f: FilaVista, c: CeldaVista) {
    if (!this.enEdicion) { return; }
    const a = f.act;
    const d = c.dia;
    const agregar = this.modoArrastre === 'agregar';
    const esta = a.programados.indexOf(d) >= 0;
    let cambio = false;

    if (agregar && !esta) { a.programados.push(d); a.programados.sort((x, y) => x - y); cambio = true; }
    if (!agregar && esta) {
      this.quitar(a.programados, d);
      this.quitar(a.realizados, d);
      delete registrosDe(a)[String(d)];
      cambio = true;
    }

    if (cambio) {
      this.huboCambiosArrastre = true;
      this.recalcular();
    }
  }

  /** Lleva el scroll horizontal hasta el día de hoy (si el mes visible es el actual). */
  private irAHoy() {
    setTimeout(() => {
      const contenedor: HTMLElement = this.scrollGrilla && this.scrollGrilla.nativeElement;
      if (!contenedor) { return; }
      const hoy = contenedor.querySelector('th.dia-hoy') as HTMLElement;
      if (!hoy) { return; }
      const fija = 300; // columna de actividades
      const visible = contenedor.clientWidth - fija;
      const destino = hoy.offsetLeft - fija - visible / 2 + hoy.offsetWidth / 2;
      contenedor.scrollLeft = Math.max(0, destino);
    }, 0);
  }

  clickDia(d: DiaInfo) {
    if (!this.enEdicion || !this.programa || d.finde) { return; }
    const p = this.programa;
    if (p.feriados.indexOf(d.dia) >= 0) {
      this.quitar(p.feriados, d.dia);
    } else {
      p.feriados.push(d.dia);
      p.feriados.sort((x, y) => x - y);
      p.actividades.forEach(a => {
        this.quitar(a.programados, d.dia);
        this.quitar(a.realizados, d.dia);
        delete registrosDe(a)[String(d.dia)];
      });
    }
    this.recalcular();
    this.programarGuardado();
  }

  regenerar() {
    if (!this.programa || !this.enEdicion) { return; }
    if (!confirm('Se reprograman todas las actividades según su frecuencia. ¿Continuar?')) { return; }
    this.dias = this.construirDias(this.programa.feriados);
    this.programa.actividades.forEach(a => this.reprogramarActividad(a));
    this.recalcular();
    this.programarGuardado();
  }

  /** Deja la grilla en blanco; solo quedan los fines de semana y feriados. */
  limpiarProgramacion() {
    if (!this.programa || !this.enEdicion) { return; }
    if (!confirm('Se borran todos los días programados de ' + this.meses[this.mesSel - 1] +
      ' (y sus registros de cumplimiento y HH). ¿Continuar?')) { return; }
    this.programa.actividades.forEach(a => {
      a.programados = [];
      a.realizados = [];
      (a as any).registros = {};
    });
    this.recalcular();
    this.programarGuardado();
  }

  // "Según necesidades" no tiene frecuencia fija: conserva los días marcados a mano
  private reprogramarActividad(a: ActividadPrograma) {
    if (this.esSegunNecesidad(a)) { return; }
    a.programados = this.diasProgramados(a);
    a.realizados = a.realizados.filter(d => a.programados.indexOf(d) >= 0);
    const regs = registrosDe(a);
    Object.keys(regs).forEach(k => {
      if (a.programados.indexOf(Number(k)) < 0) { delete regs[k]; }
    });
  }

  cambiarFrecuencia(a: ActividadPrograma, valor: string) {
    if (!this.enEdicion) { return; }
    a.frecuencia = valor;
    a.diaSemana = valor === 'SEMANAL' ? (a.diaSemana || 1) : 0;
    this.recalcular();
    this.programarGuardado();
  }

  valorFrecuencia(a: ActividadPrograma): string {
    return a.frecuencia === 'SEMANAL' ? 'SEMANAL-' + (a.diaSemana || 1) : a.frecuencia;
  }

  cambiarFrecuenciaCompuesta(a: ActividadPrograma, valor: string) {
    if (!this.enEdicion) { return; }
    const partes = (valor || '').split('-');
    a.frecuencia = partes[0];
    a.diaSemana = partes[0] === 'SEMANAL' ? (Number(partes[1]) || 1) : 0;
    this.recalcular();
    this.programarGuardado();
  }

  cambiarDiaSemana(a: ActividadPrograma, valor: any) {
    if (!this.enEdicion) { return; }
    a.diaSemana = Number(valor) || 1;
    this.recalcular();
    this.programarGuardado();
  }

  agregarActividad(grupo: string, seccion: string = '') {
    if (!this.programa || !this.enEdicion) { return; }
    const a = this.nuevaActividad(grupo, 'Nueva actividad', 'SEMANAL', 1, seccion);
    let idx = -1;
    this.programa.actividades.forEach((x, i) => { if (x.grupo === grupo) { idx = i; } });
    this.programa.actividades.forEach((x, i) => {
      if (x.grupo === grupo && ((x as any).seccion || '') === (seccion || '')) { idx = i; }
    });
    if (idx >= 0) { this.programa.actividades.splice(idx + 1, 0, a); }
    else { this.programa.actividades.push(a); }
    this.recalcular();
    this.programarGuardado();
  }

  eliminarActividad(a: ActividadPrograma) {
    if (!this.programa || !this.enEdicion) { return; }
    if (!confirm('¿Eliminar la actividad "' + a.nombre + '" de este mes?')) { return; }
    const i = this.programa.actividades.indexOf(a);
    if (i >= 0) { this.programa.actividades.splice(i, 1); }
    this.recalcular();
    this.programarGuardado();
  }

  agregarGrupo() {
    if (!this.programa || !this.enEdicion) { return; }
    const nombre = (prompt('Nombre del nuevo ítem (ej: SALUD OCUPACIONAL):') || '').trim().toUpperCase();
    if (!nombre) { return; }
    if (this.programa.grupos.indexOf(nombre) >= 0) { alert('Ese ítem ya existe'); return; }
    this.programa.grupos.push(nombre);
    this.recalcular();
    this.programarGuardado();
  }

  eliminarGrupo(nombre: string) {
    if (!this.programa || !this.enEdicion) { return; }
    const tiene = this.programa.actividades.some(a => a.grupo === nombre);
    if (tiene) { return; }
    this.quitar(this.programa.grupos, nombre);
    this.recalcular();
    this.programarGuardado();
  }

  private toggle(arr: number[], v: number) {
    const i = arr.indexOf(v);
    if (i >= 0) { arr.splice(i, 1); } else { arr.push(v); arr.sort((x, y) => x - y); }
  }

  private quitar(arr: any[], v: any) {
    const i = arr.indexOf(v);
    if (i >= 0) { arr.splice(i, 1); }
  }

  // ===================== Popup de registro =====================

  abrirRegistro(f: FilaVista, c: CeldaVista) {
    const a = f.act;
    const reg = registrosDe(a)[String(c.dia)];
    const enRealizados = a.realizados.indexOf(c.dia) >= 0;
    const info = this.dias[c.dia - 1];

    this.modal = {
      act: a,
      dia: c.dia,
      fechaTexto: (info ? NOMBRE_DIA_LARGO[info.dow] + ' ' : '') + c.dia + ' de ' +
        this.meses[this.mesSel - 1].toLowerCase() + ' ' + this.anio,
      soloLectura: !this.enControl,
      existente: !!reg || enRealizados,
      cumplimiento: reg ? reg.cumplimiento : 100,
      categoria: '',
      categoriaFija: false,
      trabajadores: null,
      horas: null,
      minutos: null,
      entidad: reg && reg.entidadEspecifica ? reg.entidadEspecifica : 'MUTUAL',
      antiguo: null,
      descartarAntiguo: false,
      observacion: reg ? (reg.observacion || '') : '',
      adjuntos: reg && reg.adjuntos ? reg.adjuntos.slice() : [],
      registradoPor: reg ? (reg.registradoPor || '') : '',
      fechaRegistro: reg ? (reg.fechaRegistro || '') : '',
      consumoDef: this.esMA ? consumoMADe(a.nombre) : null,
      consumo: reg && reg.consumo !== null && reg.consumo !== undefined ? reg.consumo : null
    };
    this.cargarHHModal(this.modal, reg);
    this.adjNuevos = [];
    this.adjQuitados = [];
    this.errorModal = '';
    this.progresoSubida = 0;
    this.guardandoRegistro = false;
  }

  /** Llena la parte de HH del popup según la actividad y lo que ya estaba registrado. */
  private cargarHHModal(m: ModalRegistro, reg: RegistroDia) {
    const fija = categoriaFijaDe(m.act);
    const hh = hhRegistroMin(reg);
    m.categoriaFija = !!fija;
    m.categoria = fija || hh.categoria || '';
    if (reg && !hh.antiguo && hh.minTotal) {
      m.trabajadores = hh.trabajadores || null;
      m.horas = Math.floor(hh.duracionMin / 60) || null;
      m.minutos = hh.duracionMin % 60 || null;
    }
    if (hh.antiguo && hh.minTotal) {
      m.antiguo = { minOperacional: hh.minOperacional, minEspecificas: hh.minEspecificas, minTotal: hh.minTotal };
    }
  }

  /** ¿Se ingresó algo en trabajadores / horas / minutos? */
  private hayDatosHH(m: ModalRegistro): boolean {
    return [m.trabajadores, m.horas, m.minutos].some(v => v !== null && v !== undefined && String(v).trim() !== '' && Number(v) !== 0);
  }

  /** Cálculo en vivo del popup (null = todavía no hay datos). */
  get calculoModal(): { trabajadores: number; duracionMin: number; hhMinutos: number; error: string } {
    const m = this.modal;
    if (!m || !m.categoria) { return null; }
    if (!this.hayDatosHH(m)) { return null; }
    try {
      const c = calcularHH(m.trabajadores, m.horas, m.minutos);
      return { trabajadores: c.trabajadores, duracionMin: c.duracionMin, hhMinutos: c.hhMinutos, error: '' };
    } catch (e) {
      return { trabajadores: 0, duracionMin: 0, hhMinutos: 0, error: e.message };
    }
  }

  /** Deja el día sin cumplimiento marcado (por si se marcó por error). */
  quitarCumplimiento() {
    if (!this.modal || this.modal.soloLectura) { return; }
    this.modal.cumplimiento = null;
    this.errorModal = '';
  }

  /** Registro antiguo (horas decimales): marcar para borrar sus HH al guardar, o deshacer. */
  descartarHHAntiguas(v: boolean) {
    if (this.modal && !this.modal.soloLectura && this.modal.antiguo) { this.modal.descartarAntiguo = v; }
  }

  elegirCategoria(v: string) {
    if (this.modal && !this.modal.soloLectura && !this.modal.categoriaFija) { this.modal.categoria = v; }
  }

  elegirCumplimiento(v: number) {
    if (!this.modal || this.modal.soloLectura) { return; }
    // clic sobre el que ya está marcado = se quita el cumplimiento (por si se marcó por error)
    this.modal.cumplimiento = this.modal.cumplimiento === v ? null : v;
  }

  clickFondoModal(evento: MouseEvent) {
    if (evento.target === evento.currentTarget && !this.subiendo) { this.cancelarRegistro(); }
  }

  @HostListener('document:keydown.escape')
  escapeModal() {
    if (this.modal && !this.subiendo) { this.cancelarRegistro(); }
  }

  cancelarRegistro() {
    // lo que se subió en este popup y no se guardó, se borra de Storage
    this.adjNuevos.forEach(adj => borrarAdjunto(adj));
    this.adjNuevos = [];
    this.adjQuitados = [];
    this.modal = null;
    this.errorModal = '';
  }

  guardarRegistro() {
    const m = this.modal;
    if (!m || m.soloLectura || !this.enControl) { return; }
    if (this.subiendo) { this.errorModal = 'Espera a que terminen de subir los archivos.'; return; }
    if (this.guardandoRegistro) { return; }   // evita doble envío

    const cumplimiento = VALORES_CUMPLIMIENTO.indexOf(m.cumplimiento) >= 0 ? m.cumplimiento : null;   // null = sin marcar
    let calc = { trabajadores: 0, duracionMin: 0, hhMinutos: 0 };
    let categoria = '';
    let mantenerAntiguo = false;
    let consumo: number = null;
    try {
      if (m.categoria && this.hayDatosHH(m)) {
        calc = calcularHH(m.trabajadores, m.horas, m.minutos);
        if (calc.trabajadores < 1) { throw new Error('No se puede registrar una capacitación sin participantes: ingresa la cantidad de trabajadores.'); }
        if (calc.duracionMin < 1) { throw new Error('Ingresa la duración individual de la capacitación (horas y/o minutos).'); }
        if (cumplimiento === null) { throw new Error('Marca el cumplimiento para registrar HH (o deja las HH en blanco).'); }
        if (cumplimiento === 0) { throw new Error('La actividad quedó como "No hecho (0%)": deja las HH en blanco o cambia el cumplimiento.'); }
        categoria = m.categoria;
      } else if (m.antiguo && !m.descartarAntiguo) {
        // registro antiguo sin desglose: se conserva tal cual (no se borra información)
        mantenerAntiguo = true;
      }
      if (m.consumoDef && m.consumo !== null && m.consumo !== undefined && String(m.consumo) !== '') {
        consumo = Number(String(m.consumo).replace(',', '.'));
        if (!isFinite(consumo) || consumo < 0) { throw new Error('El consumo debe ser un número mayor o igual a 0.'); }
        consumo = redondear(consumo);
      }
    } catch (e) {
      this.errorModal = e.message;
      return;
    }

    const anterior: any = registrosDe(m.act)[String(m.dia)] || {};
    const minOp = categoria && categoria !== CATEGORIA_ESPECIFICA ? calc.hhMinutos : 0;
    const minEsp = categoria === CATEGORIA_ESPECIFICA ? calc.hhMinutos : 0;
    const reg: RegistroDia = mantenerAntiguo ? {
      cumplimiento: cumplimiento,
      hhCapacitacion: Number(anterior.hhCapacitacion) || 0,
      hhEspecificas: Number(anterior.hhEspecificas) || 0,
      entidadEspecifica: Number(anterior.hhEspecificas) > 0 ? (m.entidad || anterior.entidadEspecifica || 'OTROS') : '',
      hhOperacional: Number(anterior.hhOperacional) || 0,
      consumo: consumo,
      consumoCampo: m.consumoDef ? m.consumoDef.campo : '',
      observacion: (m.observacion || '').trim(),
      adjuntos: this.adjuntosParaGuardar(m),
      registradoPor: this.nombreUsuario || '',
      fechaRegistro: new Date().toISOString()
    } : {
      cumplimiento: cumplimiento,
      categoriaHH: categoria,
      trabajadores: categoria ? calc.trabajadores : 0,
      duracionMin: categoria ? calc.duracionMin : 0,
      hhMinutos: categoria ? calc.hhMinutos : 0,
      // horas decimales para compatibilidad (la fuente de verdad son los minutos)
      hhCapacitacion: minutosAHoras(minOp + minEsp),
      hhEspecificas: minutosAHoras(minEsp),
      entidadEspecifica: minEsp > 0 ? (m.entidad || 'OTROS') : '',
      hhOperacional: minutosAHoras(minOp),
      consumo: consumo,
      consumoCampo: m.consumoDef ? m.consumoDef.campo : '',
      observacion: (m.observacion || '').trim(),
      adjuntos: this.adjuntosParaGuardar(m),
      registradoPor: this.nombreUsuario || '',
      fechaRegistro: new Date().toISOString()
    };
    this.guardandoRegistro = true;

    const a = m.act;
    // Sin cumplimiento y sin nada más (HH, observación, adjuntos, consumo): el día vuelve a quedar sin registro
    const sinDatos = cumplimiento === null && !categoria && !mantenerAntiguo && !reg.observacion &&
      !reg.adjuntos.length && (consumo === null || consumo === undefined);
    if (sinDatos) {
      delete registrosDe(a)[String(m.dia)];
    } else {
      registrosDe(a)[String(m.dia)] = reg;
    }
    // "realizados" queda solo con lo hecho (100%, 75% o 50%); el 0% queda registrado pero no cuenta como hecho
    if (reg.cumplimiento > 0) {
      if (a.realizados.indexOf(m.dia) < 0) { a.realizados.push(m.dia); a.realizados.sort((x, y) => x - y); }
    } else {
      this.quitar(a.realizados, m.dia);
    }

    this.adjQuitados.forEach(adj => borrarAdjunto(adj));
    this.adjNuevos = [];
    this.adjQuitados = [];
    this.modal = null;
    this.guardandoRegistro = false;
    this.recalcular();   // acumulados al día
    this.guardarInmediato(sinDatos ? 'Cumplimiento quitado' : 'Registro guardado');
    if (m.consumoDef) { this.sincronizarConsumoMA(m.consumoDef.campo); }
  }

  private adjuntosParaGuardar(m: ModalRegistro): AdjuntoRegistro[] {
    return m.adjuntos.map(x => ({
      nombre: x.nombre || '', url: x.url || '', path: x.path || '', tipo: x.tipo || '', tamano: x.tamano || 0
    }));
  }

  quitarRegistro() {
    const m = this.modal;
    if (!m || m.soloLectura || !this.enControl) { return; }
    if (!confirm('¿Quitar el registro del ' + m.fechaTexto + '?\n\nSe borran el cumplimiento, las HH y los archivos adjuntos de ese día.')) { return; }

    const a = m.act;
    const reg = registrosDe(a)[String(m.dia)];
    const todos: AdjuntoRegistro[] = [];
    (reg && reg.adjuntos ? reg.adjuntos : []).forEach(x => todos.push(x));
    this.adjNuevos.forEach(x => { if (todos.indexOf(x) < 0) { todos.push(x); } });
    todos.forEach(adj => borrarAdjunto(adj));

    delete registrosDe(a)[String(m.dia)];
    this.quitar(a.realizados, m.dia);

    this.adjNuevos = [];
    this.adjQuitados = [];
    this.modal = null;
    this.recalcular();   // acumulados al día
    this.guardarInmediato('Registro eliminado');
    if (m.consumoDef) { this.sincronizarConsumoMA(m.consumoDef.campo); }
  }

  /**
   * Programa MA: suma el consumo registrado en el mes (agua, combustible o residuos) y lo deja
   * en la tabla de Medio Ambiente (estadisticasMA, meses.{mes}.{campo}). La celda queda marcada
   * con meses.{mes}.programaMA.{campo} = true para que allá se vea que viene del programa.
   * Si no hay consumos registrados y la celda venía del programa, se limpia; si la escribieron
   * a mano, no se toca.
   */
  private sincronizarConsumoMA(campo: string) {
    if (!this.esMA || !campo || !this.programa) { return; }
    const p = this.programa;
    const anio = Number(p.anio);
    const mes = Number(p.mes);

    let suma = 0;
    let hay = false;
    p.actividades.forEach(a => {
      const def = consumoMADe(a.nombre);
      if (!def || def.campo !== campo) { return; }
      const regs = registrosDe(a);
      Object.keys(regs).forEach(k => {
        const r = regs[k];
        if (r && r.consumo !== null && r.consumo !== undefined) {
          suma += Number(r.consumo) || 0;
          hay = true;
        }
      });
    });

    const ref = firestoreDB.collection(COLECCION_ESTADISTICAS_MA).doc(this.idSubProyecto + '_' + anio);
    ref.get().then((doc: any) => {
      const data = doc.exists ? doc.data() : null;
      const delMes = data && data.meses ? (data.meses[mes] || data.meses[String(mes)] || {}) : {};
      const veniaDelPrograma = !!(delMes.programaMA && delMes.programaMA[campo]);
      if (!hay && !veniaDelPrograma) { return; } // nada que pasar y lo que hay lo escribieron a mano

      const datos: any = {
        anio: anio,
        fechaActualizacion: new Date().toISOString(),
        meses: { [mes]: { [campo]: hay ? redondear(suma) : null, programaMA: { [campo]: hay } } }
      };
      if (!doc.exists) {
        // documento nuevo: mismos datos base que usa la tabla de MA
        datos.idSubProyecto = this.idSubProyecto;
        datos.idProyecto = this.idProyecto === undefined ? null : this.idProyecto;
        datos.nombreSubProyecto = this.nombreSubProyecto || '';
      }
      return ref.set(datos, { merge: true }).then(() => this.mostrarEstado('Consumo enviado a Medio Ambiente'));
    }).catch((err: any) => {
      console.error('programaMA consumo -> estadisticasMA', err);
      this.mostrarEstado('Error al pasar el consumo a MA');
    });
  }

  seleccionarArchivos(evento: any) {
    const m = this.modal;
    const input = evento && evento.target;
    const archivos: File[] = input && input.files ? Array.prototype.slice.call(input.files) : [];
    if (input) { input.value = ''; }
    if (!m || m.soloLectura || !archivos.length) { return; }

    this.errorModal = '';
    const carpeta = 'programas/' + this.coleccionPrograma + '/' + this.idSubProyecto + '/' +
      this.anio + '-' + (this.mesSel < 10 ? '0' : '') + this.mesSel + '/' + m.act.id + '/' + m.dia;

    archivos.forEach(archivo => {
      if (archivo.size > TAMANO_MAXIMO_ADJUNTO) {
        this.errorModal = '"' + archivo.name + '" pesa más de 20 MB.';
        return;
      }
      this.subiendo++;
      this.progresoSubida = 0;
      subirAdjunto(carpeta, archivo, pct => this.progresoSubida = pct).then(adj => {
        if (this.modal !== m) { borrarAdjunto(adj); return; } // se cerró el popup mientras subía
        m.adjuntos.push(adj);
        this.adjNuevos.push(adj);
      }).catch(err => {
        console.error('programaSSO adjunto', err);
        if (this.modal === m) { this.errorModal = 'No se pudo subir "' + archivo.name + '".'; }
      }).then(() => {
        this.subiendo = Math.max(0, this.subiendo - 1);
      });
    });
  }

  quitarAdjunto(adj: AdjuntoRegistro) {
    const m = this.modal;
    if (!m || m.soloLectura) { return; }
    this.quitar(m.adjuntos, adj);
    const i = this.adjNuevos.indexOf(adj);
    if (i >= 0) {
      this.adjNuevos.splice(i, 1);
      borrarAdjunto(adj); // recién subido: se borra al tiro
    } else {
      this.adjQuitados.push(adj); // existente: se borra al guardar
    }
  }

  iconoArchivo(adj: AdjuntoRegistro): string {
    const n = (adj.nombre || '').toLowerCase();
    const t = (adj.tipo || '').toLowerCase();
    if (t.indexOf('image') === 0 || /\.(png|jpe?g|gif|bmp|webp|heic)$/.test(n)) { return 'fa-file-image-o'; }
    if (t.indexOf('pdf') >= 0 || /\.pdf$/.test(n)) { return 'fa-file-pdf-o'; }
    if (/\.(xlsx?|xlsm|csv)$/.test(n) || t.indexOf('sheet') >= 0 || t.indexOf('excel') >= 0) { return 'fa-file-excel-o'; }
    if (/\.(docx?|rtf|odt)$/.test(n) || t.indexOf('word') >= 0) { return 'fa-file-word-o'; }
    if (/\.(pptx?)$/.test(n)) { return 'fa-file-powerpoint-o'; }
    if (/\.(zip|rar|7z)$/.test(n)) { return 'fa-file-archive-o'; }
    return 'fa-file-o';
  }

  tamanoTexto(bytes: number): string {
    if (!bytes) { return ''; }
    if (bytes < 1024 * 1024) { return Math.max(1, Math.round(bytes / 1024)) + ' KB'; }
    return (Math.round(bytes / 1024 / 1024 * 10) / 10) + ' MB';
  }

  // ===================== Guardado automático (borrador) =====================

  programarGuardado() {
    if (!this.programa) { return; }
    this.marcarNombre(this.programa);
    this.pendiente = this.programa;
    this.estadoGuardado = 'Guardando...';
    if (this.timerGuardar) { clearTimeout(this.timerGuardar); }
    this.timerGuardar = setTimeout(() => this.flushGuardado(), 700);
  }

  private flushGuardado() {
    if (this.timerGuardar) { clearTimeout(this.timerGuardar); this.timerGuardar = null; }
    const p = this.pendiente;
    this.pendiente = null;
    if (!p) { return; }
    this.sPrograma.guardar(p, this.coleccionPrograma).then(() => {
      if (p === this.programa) { this.mostrarEstado('Guardado'); }
    }).catch(err => {
      console.error('programaSSO guardar', err);
      this.mostrarEstado('Error al guardar');
    });
  }

  private mostrarEstado(txt: string) {
    this.estadoGuardado = txt;
    if (this.timerEstado) { clearTimeout(this.timerEstado); }
    this.timerEstado = setTimeout(() => { this.estadoGuardado = ''; }, 2500);
  }

  /** Ancho mínimo: si la pantalla es más ancha, el espacio sobrante se lo lleva Actividades. */
  get anchoMinimoTabla(): number {
    return 300 + 150 + this.dias.length * 30 + 150;
  }

  /** Columnas totales de la grilla (para las filas de ítem que ocupan todo el ancho). */
  get totalColumnas(): number {
    return this.dias.length + 3;
  }

  // ===================== trackBy =====================

  trackGrupo(i: number, g: GrupoVista) { return g.nombre; }
  trackFila(i: number, f: FilaVista) { return f.act.id; }
  trackSeccion(i: number, s: SeccionVista) { return s.nombre; }
  trackDia(i: number, d: any) { return d.dia; }
}