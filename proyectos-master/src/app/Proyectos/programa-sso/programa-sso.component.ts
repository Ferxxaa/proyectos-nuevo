import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { ProgramaSsoService, ProgramaMes, ActividadPrograma } from './programa-sso.service';
import { getFeriadosChile } from '../estadisticas-hh/control-asistencia.component';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const LETRAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // indice = getDay()
const NOMBRE_DIA = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

// Feriados de Chile: mismo cálculo del Control de asistencia. Igual se pueden marcar o desmarcar a mano.

const GRUPOS_BASE = [
  'LIDERAZGO',
  'CAPACITACIÓN Y CHARLAS',
  'INSPECCIONES PLANEADAS',
  'ELEMENTOS DE PROTECCIÓN PERSONAL',
  'EMERGENCIAS',
  'REUNIONES Y COMUNICACIÓN'
];

// [grupo, nombre, frecuencia, diaSemana]
const PLANTILLA: any[] = [
  [0, 'Participación de Jefe de Obra como relator', 'DIARIA', 0],
  [0, 'Participación de Jefe de obra en inspecciones', 'SEMANAL', 4],
  [1, 'Charla Diaria de seguridad', 'DIARIA', 0],
  [1, 'Análisis de Riesgo de Trabajo', 'DIARIA', 0],
  [1, 'Capacitación de procedimiento', 'SEMANAL', 3],
  [1, 'Inducción a personal nuevo (ODI, RIOHS, EPP)', 'SEGUN_NECESIDADES', 0],
  [1, 'Inducción procedimientos trabajo seguro', 'SEGUN_NECESIDADES', 0],
  [1, 'Capacitación planeada con Mutual de Seguridad', 'SEGUN_NECESIDADES', 0],
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
}

interface CeldaVista {
  dia: number;
  clase: string;  // c-rojo | c-verde | c-azul | ''
  x: boolean;
}

interface FilaVista {
  act: ActividadPrograma;
  celdas: CeldaVista[];
  total: number;
  ctrl: number;
  pct: number;    // null = sin programación
}

interface GrupoVista {
  nombre: string;
  filas: FilaVista[];
  pct: number;
}

@Component({
  selector: 'app-programa-sso',
  templateUrl: './programa-sso.component.html',
  styleUrls: ['./programa-sso.component.css'],
  providers: [ProgramaSsoService]
})
export class ProgramaSsoComponent implements OnChanges, OnDestroy {

  @Input() idSubProyecto: any;
  @Input() editable: boolean = true;       // false = cliente / solo lectura
  @Input() puedeValidar: boolean = false;  // Director de Proyecto o Sub-gerente
  @Input() tipoPrograma: string = 'SSO';

  meses = MESES;
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

  // Control (marcar x): solo cuando la programación ya fue validada
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
    const anio = this.anio;
    this.mesesConPrograma = [];
    this.sPrograma.mesesExistentes(this.idSubProyecto, anio, this.coleccionPrograma).then(meses => {
      if (anio === this.anio) { this.mesesConPrograma = meses; }
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

  cargarMes() {
    const token = ++this.cargaToken;
    this.cargando = true;
    this.programa = null;
    this.grupos = [];
    this.sPrograma.obtener(this.idSubProyecto, this.anio, this.mesSel, this.coleccionPrograma).then(p => {
      if (token !== this.cargaToken) { return; }
      this.programa = p ? this.normalizar(p) : null;
      this.recalcular();
      this.cargando = false;
    }).catch(err => {
      if (token !== this.cargaToken) { return; }
      console.error('programaSSO obtener', err);
      this.cargando = false;
    });
  }

  private normalizar(p: ProgramaMes): ProgramaMes {
    p.feriados = p.feriados || [];
    p.actividades = p.actividades || [];
    p.estado = p.estado || 'borrador';
    p.actividades.forEach(a => {
      a.programados = a.programados || [];
      a.realizados = a.realizados || [];
      a.diaSemana = a.diaSemana || 0;
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
        actividades = prev.actividades.map(a => this.nuevaActividad(a.grupo, a.nombre, a.frecuencia, a.diaSemana));
      } else {
        const gruposBase = this.esMA ? GRUPOS_MA : GRUPOS_BASE;
        const plantilla = this.esMA ? PLANTILLA_MA : PLANTILLA;
        grupos = gruposBase.slice();
        actividades = plantilla.map(t => this.nuevaActividad(gruposBase[t[0]], t[1], t[2], t[3]));
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

  private nuevaActividad(grupo: string, nombre: string, frecuencia: string, diaSemana: number): ActividadPrograma {
    return {
      id: this.nuevoId(),
      grupo: grupo,
      nombre: nombre,
      frecuencia: frecuencia,
      diaSemana: frecuencia === 'SEMANAL' ? (diaSemana || 1) : 0,
      programados: [],
      realizados: []
    };
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
      'Las x ya marcadas se mantienen.')) { return; }

    const p = this.programa;
    p.estado = 'borrador';
    p.validadoPor = '';
    p.fechaValidado = '';
    p.motivoRechazo = '';
    this.guardarInmediato('Programación reabierta');
  }

  private guardarInmediato(mensaje: string) {
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

  // ===================== Calendario =====================

  private construirDias(feriados: number[]): DiaInfo[] {
    const n = new Date(this.anio, this.mesSel, 0).getDate();
    const res: DiaInfo[] = [];
    for (let d = 1; d <= n; d++) {
      const dow = new Date(this.anio, this.mesSel - 1, d).getDay();
      const finde = dow === 0 || dow === 6;
      const feriado = feriados.indexOf(d) >= 0;
      res.push({ dia: d, dow: dow, letra: LETRAS[dow], finde: finde, feriado: feriado, rojo: finde || feriado });
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
      return;
    }
    this.dias = this.construirDias(this.programa.feriados);

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
      return { nombre: nombre, filas: filas, pct: pct };
    });

    this.totalProg = totalProg;
    this.totalCtrl = totalCtrl;
    this.pctTotal = totalProg > 0 ? Math.round(totalCtrl * 100 / totalProg) : 0;
    this.pctGlobal = nGrupos > 0 ? Math.round(sumaGrupos / nGrupos) : 0;
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
    const celdas: CeldaVista[] = this.dias.map(d => {
      let clase = '';
      if (d.rojo) { clase = 'c-rojo'; }
      else if (antiguo) { clase = 'c-verde'; }
      else if (a.programados.indexOf(d.dia) >= 0) { clase = sn ? 'c-verde' : 'c-azul'; }
      const x = (clase === 'c-azul' || clase === 'c-verde') && a.realizados.indexOf(d.dia) >= 0;
      return { dia: d.dia, clase: clase, x: x };
    });

    let total: number;
    let ctrl: number;
    if (antiguo) {
      total = 1;
      ctrl = celdas.some(c => c.x) ? 1 : 0;
    } else {
      // Cuenta los días marcados, en azul o en verde
      total = celdas.filter(c => c.clase === 'c-azul' || c.clase === 'c-verde').length;
      ctrl = celdas.filter(c => (c.clase === 'c-azul' || c.clase === 'c-verde') && c.x).length;
    }
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

  celdaClicable(c: CeldaVista, f: FilaVista): boolean {
    if (c.clase === 'c-rojo') { return false; }
    if (this.enControl) { return c.clase === 'c-azul' || c.clase === 'c-verde'; }
    if (this.enEdicion) { return true; }
    return false;
  }

  // ===================== Interacción =====================

  clickCelda(f: FilaVista, c: CeldaVista) {
    if (!this.programa || !this.celdaClicable(c, f)) { return; }
    const a = f.act;
    const d = c.dia;

    if (this.enControl) {
      this.toggle(a.realizados, d);
    } else if (this.enEdicion) {
      if (a.programados.indexOf(d) >= 0) {
        this.quitar(a.programados, d);
        this.quitar(a.realizados, d);
      } else {
        a.programados.push(d);
        a.programados.sort((x, y) => x - y);
      }
    }
    this.recalcular();
    this.programarGuardado();
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
    if (!confirm('Se borran todos los días programados de ' + this.meses[this.mesSel - 1] + '. ¿Continuar?')) { return; }
    this.programa.actividades.forEach(a => {
      a.programados = [];
      a.realizados = [];
    });
    this.recalcular();
    this.programarGuardado();
  }

  // "Según necesidades" no tiene frecuencia fija: conserva los días marcados a mano
  private reprogramarActividad(a: ActividadPrograma) {
    if (this.esSegunNecesidad(a)) { return; }
    a.programados = this.diasProgramados(a);
    a.realizados = a.realizados.filter(d => a.programados.indexOf(d) >= 0);
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

  agregarActividad(grupo: string) {
    if (!this.programa || !this.enEdicion) { return; }
    const a = this.nuevaActividad(grupo, 'Nueva actividad', 'SEMANAL', 1);
    let idx = -1;
    this.programa.actividades.forEach((x, i) => { if (x.grupo === grupo) { idx = i; } });
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

  // ===================== Guardado automático (borrador y control) =====================

  programarGuardado() {
    if (!this.programa) { return; }
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
    return 110 + 300 + 170 + this.dias.length * 30 + 276;
  }

  // ===================== trackBy =====================

  trackGrupo(i: number, g: GrupoVista) { return g.nombre; }
  trackFila(i: number, f: FilaVista) { return f.act.id; }
  trackDia(i: number, d: any) { return d.dia; }
}