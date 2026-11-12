import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { firestoreDB } from '../../firebase-init';
import { TrabajadorCore, etiquetaTrabajador, buscarEnAgenda, limpiarRut, formatearRut, clavesTrabajador } from '../../CORE/trabajadores/trabajadores-core';

declare var Swal: any;

/**
 * Control de asistencia diario por subproyecto. Alimenta las Estadísticas mensuales de HH.
 * Firestore: un documento por mes en 'asistenciaHH' ({idSubProyecto}_{anio}_{mes}), con los
 * trabajadores en trabajadores.{id} y sus datos en dias.{dia}.{jornada|extra|capacitacion}.
 * Cada cambio guarda el día y actualiza 'estadisticasHH' en la misma operación.
 *
 * La capacitación ya no se registra aquí (sale del Programa SSO/MA → HH Capacitación).
 * Los valores de "capacitacion" que quedaron guardados no se borran, pero ya no se muestran ni suman.
 */
const COLECCION = 'asistenciaHH';
const COLECCION_HH = 'estadisticasHH';

export const HORAS_JORNADA = 8.5;
/** Indicador de Estadísticas HH que recibe las horas de capacitación. */
export const CAMPO_CAPACITACION = 'hhCharlasDiarias';

/** Fecha del solsticio de invierno en Chile; desde 2028 hay que confirmarla con el decreto de cada año. */
const DIA_PUEBLOS_INDIGENAS: { [anio: number]: number } = { 2024: 20, 2025: 20, 2026: 21, 2027: 21, 2028: 20, 2029: 20, 2030: 21 };

/** Feriados por ley puntual, como elecciones. Agregar aquí con formato { 'aaaa-m-d': 'Nombre' }. */
const FERIADOS_ESPECIALES: { [fecha: string]: string } = {
  '2025-11-16': 'Elecciones',
  '2025-12-14': 'Elecciones'
};

function getPascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

/** Ley 19.668: de martes a jueves pasa al lunes anterior, y el viernes al lunes siguiente. */
function moverALunes(anio: number, mes: number, dia: number): Date {
  const fecha = new Date(anio, mes - 1, dia);
  const semana = fecha.getDay();
  if (semana >= 2 && semana <= 4) { return new Date(anio, mes - 1, dia - (semana - 1)); }
  if (semana === 5) { return new Date(anio, mes - 1, dia + 3); }
  return fecha;
}

/** Feriados nacionales de Chile, con clave 'mes-dia'. No incluye los regionales ni comunales. */
export function getFeriadosChile(anio: number): { [clave: string]: string } {
  const feriados: { [clave: string]: string } = {};
  const agregar = (fecha: Date, nombre: string) => {
    feriados[(fecha.getMonth() + 1) + '-' + fecha.getDate()] = nombre;
  };
  const fijo = (mes: number, dia: number, nombre: string) => agregar(new Date(anio, mes - 1, dia), nombre);
  const pascua = getPascua(anio);

  fijo(1, 1, 'Año Nuevo');
  agregar(new Date(anio, pascua.getMonth(), pascua.getDate() - 2), 'Viernes Santo');
  agregar(new Date(anio, pascua.getMonth(), pascua.getDate() - 1), 'Sábado Santo');
  fijo(5, 1, 'Día del Trabajo');
  fijo(5, 21, 'Día de las Glorias Navales');
  fijo(6, DIA_PUEBLOS_INDIGENAS[anio] || 21, 'Día Nacional de los Pueblos Indígenas');
  agregar(moverALunes(anio, 6, 29), 'San Pedro y San Pablo');
  fijo(7, 16, 'Día de la Virgen del Carmen');
  fijo(8, 15, 'Asunción de la Virgen');
  fijo(9, 18, 'Independencia Nacional');
  fijo(9, 19, 'Día de las Glorias del Ejército');
  agregar(moverALunes(anio, 10, 12), 'Encuentro de Dos Mundos');
  fijo(11, 1, 'Día de Todos los Santos');
  fijo(12, 8, 'Inmaculada Concepción');
  fijo(12, 25, 'Navidad');

  // Ley 20.299: de martes pasa al viernes anterior, y de miércoles al viernes siguiente
  const iglesias = new Date(anio, 9, 31).getDay();
  agregar(new Date(anio, 9, 31 + (iglesias === 2 ? -4 : iglesias === 3 ? 2 : 0)), 'Día de las Iglesias Evangélicas');

  // Leyes 20.215 y 20.983
  const septiembre = new Date(anio, 8, 18).getDay();
  if (septiembre === 2 || septiembre === 6) { fijo(9, 17, 'Feriado adicional de Fiestas Patrias'); }
  if (septiembre === 3) { fijo(9, 20, 'Feriado adicional de Fiestas Patrias'); }
  if (new Date(anio, 0, 1).getDay() === 0) { fijo(1, 2, 'Feriado adicional de Año Nuevo'); }

  Object.keys(FERIADOS_ESPECIALES).forEach(fecha => {
    const partes = fecha.split('-').map(Number);
    if (partes[0] === anio) { fijo(partes[1], partes[2], FERIADOS_ESPECIALES[fecha]); }
  });

  return feriados;
}

const LETRAS_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Motivos para justificar un día no trabajado. Se guardan en dias.{dia}.ausencia = { motivo, obs, por, fecha }.
 * La letra se puede escribir directo en la celda "Día" (L, V, P, S, F, O).
 */
export interface MotivoAusencia { v: string; letra: string; t: string; d: string; justificada: boolean; }
export const MOTIVOS_AUSENCIA: MotivoAusencia[] = [
  { v: 'LM',  letra: 'L', t: 'Licencia médica',     d: 'Con licencia médica',                 justificada: true },
  { v: 'VAC', letra: 'V', t: 'Vacaciones',          d: 'Feriado legal / vacaciones',          justificada: true },
  { v: 'PCG', letra: 'P', t: 'Permiso con goce',    d: 'Permiso con goce de sueldo',          justificada: true },
  { v: 'PSG', letra: 'S', t: 'Permiso sin goce',    d: 'Permiso sin goce de sueldo',          justificada: true },
  { v: 'OTR', letra: 'O', t: 'Otro justificado',    d: 'Otro motivo justificado (detállalo)', justificada: true },
  { v: 'FI',  letra: 'F', t: 'Falta injustificada', d: 'No se presentó sin justificación',    justificada: false }
];

export function motivoAusencia(v: string): MotivoAusencia {
  return MOTIVOS_AUSENCIA.filter(m => m.v === v)[0] || null;
}

/** Popup para justificar a UN trabajador en un día (desde la celda, el aviso o el popup del día). */
interface ModalAusencia {
  trabajador: TrabajadorAsistencia;
  dia: number;
  fecha: string;
  motivo: string;
  obs: string;
  existente: boolean;
  fila?: FilaDia;          // si se abrió desde el popup del día, la elección vuelve a esa fila (no se guarda directo)
  elegir?: boolean;        // abierto desde "Justificar": muestra el selector de trabajador
}

/** Una fila del popup del día: lo que se marca para cada trabajador. */
interface FilaDia {
  trabajador: TrabajadorAsistencia;
  estado: string;          // '1' | '0.5' | '0' | 'AUS' | '' (sin marcar)
  extra: any;              // horas extra (texto del input)
  motivo: string;          // motivo de ausencia si estado = 'AUS'
  obs: string;
  bloqueo: string;         // texto si no se puede llenar (falta un día anterior / jornada completa en otro subproyecto)
  otro: string;            // texto si trabajó en otro subproyecto ese día
}

interface ModalDia {
  dia: number;
  fecha: string;
  feriado: string;
  finDeSemana: boolean;
  filas: FilaDia[];
  enfocado: string;        // id del trabajador desde donde se abrió (se resalta)
}

interface DiaAsistencia {
  numero: number;
  letra: string;        // Lun, Mar...
  fecha: string;
  finDeSemana: boolean;
  feriado: string;
  hoy: boolean;
  pendiente: boolean;   // día hábil pasado con algún trabajador sin marcar
}

export interface TrabajadorAsistencia {
  id: string;
  nombre: string;
  apellido: string;
  rut: string;
  lugar: string;
  cargo: string;
  orden: number;
  dias: any;
  nuevo?: boolean;
  idTrabajador?: string;   // id en la agenda de CORE (trabajadoresCore)
}

@Component({
  selector: 'app-control-asistencia',
  templateUrl: './control-asistencia.component.html',
  styleUrls: ['./control-asistencia.component.css']
})
export class ControlAsistenciaComponent implements OnInit, OnChanges {

  @Input() idSubProyecto: any = null;
  @Input() idProyecto: any = null;
  @Input() nombreSubProyecto: string = '';
  @Input() soloLectura: boolean = false;
  @Input() anios: number[] = [];
  @Input() datosHH: any = {};
  @Output() resumenActualizado = new EventEmitter<any>();

  /**
   * Modo CORE: varios subproyectos en la misma página. El mes, el año y la quincena los
   * controla la página; este componente muestra la franja del subproyecto y su tabla.
   */
  @Input() embebido: boolean = false;
  @Input() mesExterno: number = null;
  @Input() anioExterno: number = null;
  @Input() quincenaExterna: number = null;
  /** Agenda de CORE para autocompletar al agregar trabajadores. */
  @Input() agenda: TrabajadorCore[] = [];
  /** Trabajador escrito a mano (no estaba en la agenda): la página lo agrega a la agenda. */
  @Output() trabajadorNuevo = new EventEmitter<TrabajadorAsistencia>();
  /** Resumen del mes del subproyecto (para los totales de la página). */
  @Output() resumenCambio = new EventEmitter<any>();
  /**
   * Días que cada trabajador ya tiene en OTROS subproyectos este mes:
   * ocupacion[clave][dia][idSubProyecto] = { nombre, jornada, extra, capacitacion }.
   */
  @Input() ocupacion: any = null;

  /** Por fila: días ocupados en otro subproyecto (gris claro) o con jornada completa (gris oscuro). */
  private otros: { [idFila: string]: { [dia: string]: { lleno: boolean; texto: string } } } = {};

  readonly horasJornada: number = HORAS_JORNADA;
  readonly meses = [
    { numero: 1, nombre: 'Enero', corto: 'ene' }, { numero: 2, nombre: 'Febrero', corto: 'feb' }, { numero: 3, nombre: 'Marzo', corto: 'mar' },
    { numero: 4, nombre: 'Abril', corto: 'abr' }, { numero: 5, nombre: 'Mayo', corto: 'may' }, { numero: 6, nombre: 'Junio', corto: 'jun' },
    { numero: 7, nombre: 'Julio', corto: 'jul' }, { numero: 8, nombre: 'Agosto', corto: 'ago' }, { numero: 9, nombre: 'Septiembre', corto: 'sep' },
    { numero: 10, nombre: 'Octubre', corto: 'oct' }, { numero: 11, nombre: 'Noviembre', corto: 'nov' }, { numero: 12, nombre: 'Diciembre', corto: 'dic' }
  ];
  readonly motivosAusencia = MOTIVOS_AUSENCIA;
  /** Popup del día: asistencia y justificaciones de todos los trabajadores en ese día. */
  modalDia: ModalDia = null;
  errorModalDia: string = '';
  /** Popup para justificar a un trabajador. */
  modalAusencia: ModalAusencia = null;
  errorAusencia: string = '';

  readonly campos = [
    { campo: 'jornada', etiqueta: 'Día', titulo: 'Jornada' },
    { campo: 'extra', etiqueta: 'H.E.', titulo: 'Horas extra' }
  ];
  private readonly todosCamposTrabajador = [
    { campo: 'nombre', etiqueta: 'Nombre', clase: 'ca-fijo ca-col-nombre', ancho: 96 },
    { campo: 'apellido', etiqueta: 'Apellido', clase: 'ca-fijo ca-col-apellido', ancho: 96 },
    { campo: 'rut', etiqueta: 'RUT', clase: '', ancho: 88 },
    { campo: 'lugar', etiqueta: 'Lugar de trabajo', clase: '', ancho: 78 },
    { campo: 'cargo', etiqueta: 'Profesión / ocupación', clase: '', ancho: 96 }
  ];

  /** En CORE el lugar de trabajo es el subproyecto del grupo: no se muestra la columna. */
  get camposTrabajador() {
    return this.embebido ? this.todosCamposTrabajador.filter(c => c.campo !== 'lugar') : this.todosCamposTrabajador;
  }

  /** Columnas vacías del pie (RUT / lugar / cargo / acciones). */
  get colspanPie(): number {
    return this.camposTrabajador.length - 2 + (this.soloLectura ? 0 : 1);
  }

  get idListaAgenda(): string {
    return 'ca-agenda-' + this.idSubProyecto;
  }

  etiquetaAgenda(t: TrabajadorCore): string {
    return etiquetaTrabajador(t);
  }

  anio: number = new Date().getFullYear();
  mes: number = new Date().getMonth() + 1;
  dias: DiaAsistencia[] = [];
  diasVisibles: DiaAsistencia[] = [];

  @ViewChild('marco') marco: ElementRef;

  /** Días hábiles pasados sin marcar: pendientes[idFila][dia] = true. */
  pendientes: { [idFila: string]: { [dia: number]: boolean } } = {};
  /** Primer día pendiente de cada trabajador: no se puede llenar un día posterior hasta completarlo. */
  private primerPendiente: { [idFila: string]: number } = {};
  /** Último día que se puede llenar (hoy en el mes actual; 0 = mes futuro). */
  private ultimoDiaEditable: number = 31;
  /** Resumen del aviso: días pendientes y trabajadores que los tienen. */
  avisoPendientes: { dias: number[]; nombres: string[]; otraQuincena: boolean } = null;
  quincena: number = 1;
  borrador: TrabajadorAsistencia = null;
  errorFila: string = '';
  trabajadores: TrabajadorAsistencia[] = [];
  trabajadoresAnteriores: TrabajadorAsistencia[] = [];
  totalesFila: { [id: string]: any } = {};
  totalesDia: { [dia: number]: any } = {};
  resumen: any = { hh: 0, trabajadores: 0, jornadas: 0, extra: 0, capacitacion: 0 };

  cargando: boolean = true;
  errorCarga: boolean = false;
  estadoGuardado: string = '';

  private idUsuario: any = null;
  private cargaActual: number = 0;
  private guardadosPendientes: number = 0;
  private contadorIds: number = 0;

  ngOnInit() {
    try {
      this.idUsuario = JSON.parse(localStorage.getItem('usuario') || '{}').idUsuario || null;
    } catch (error) {
      this.idUsuario = null;
    }
    if (this.embebido) {
      if (this.anioExterno) { this.anio = Number(this.anioExterno); }
      if (this.mesExterno) { this.mes = Number(this.mesExterno); }
    }
    if (this.anios.indexOf(this.anio) === -1) {
      this.anios = [this.anio].concat(this.anios);
    }
    this.cargarMes();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ocupacion']) { this.calcularOtros(); }
    if (!this.embebido) { return; }
    const cambioMes = changes['mesExterno'] && !changes['mesExterno'].firstChange;
    const cambioAnio = changes['anioExterno'] && !changes['anioExterno'].firstChange;
    if (cambioMes || cambioAnio) {
      this.anio = Number(this.anioExterno) || this.anio;
      this.mes = Number(this.mesExterno) || this.mes;
      this.cargarMes();
    } else if (changes['quincenaExterna'] && !changes['quincenaExterna'].firstChange && this.quincenaExterna) {
      this.seleccionarQuincena(Number(this.quincenaExterna));
    }
  }

  cargarMes() {
    const anio = Number(this.anio);
    const mes = Number(this.mes);
    const carga = ++this.cargaActual;

    this.cargando = true;
    this.errorCarga = false;
    this.estadoGuardado = '';
    this.errorFila = '';
    this.trabajadoresAnteriores = [];
    this.borrador = this.crearBorrador();
    this.prepararDias(anio, mes);
    const hoy = new Date();
    if (this.embebido && this.quincenaExterna) {
      this.seleccionarQuincena(Number(this.quincenaExterna));
    } else {
      this.seleccionarQuincena(anio === hoy.getFullYear() && mes === hoy.getMonth() + 1 && hoy.getDate() > 15 ? 2 : 1);
    }

    // En CORE la página no trae las estadísticas: se leen aquí para saber qué había antes en el mes
    if (this.embebido && this.idSubProyecto) { this.cargarDatosHH(anio); }

    if (!this.idSubProyecto) {
      this.cargando = false;
      this.errorCarga = true;
      return;
    }

    this.leerTrabajadores(anio, mes)
      .then((trabajadores: TrabajadorAsistencia[]) => {
        if (carga !== this.cargaActual) { return; }
        this.trabajadores = trabajadores;
        this.recalcular();
        this.cargando = false;
        this.irAHoy();
        if (!trabajadores.length) {
          this.buscarMesAnterior(anio, mes, carga);
        }
      })
      .catch((error: any) => {
        if (carga !== this.cargaActual) { return; }
        console.error('Error al cargar la asistencia:', error);
        this.cargando = false;
        this.errorCarga = true;
      });
  }

  private leerTrabajadores(anio: number, mes: number): Promise<TrabajadorAsistencia[]> {
    return firestoreDB.collection(COLECCION).doc(this.getIdDocumento(anio, mes)).get()
      .then((doc: any) => {
        const mapa = doc.exists ? (doc.data().trabajadores || {}) : {};
        return Object.keys(mapa)
          .filter(id => !mapa[id].eliminado)
          .map(id => ({
            id: id,
            nombre: mapa[id].nombre || '',
            apellido: mapa[id].apellido || '',
            rut: mapa[id].rut || '',
            lugar: mapa[id].lugar || '',
            cargo: mapa[id].cargo || '',
            orden: Number(mapa[id].orden) || 0,
            dias: mapa[id].dias || {},
            idTrabajador: mapa[id].idTrabajador || ''
          }))
          .sort((a, b) => a.orden - b.orden);
      });
  }

  private buscarMesAnterior(anio: number, mes: number, carga: number) {
    const anioAnterior = mes === 1 ? anio - 1 : anio;
    const mesAnterior = mes === 1 ? 12 : mes - 1;

    this.leerTrabajadores(anioAnterior, mesAnterior)
      .then((trabajadores: TrabajadorAsistencia[]) => {
        if (carga === this.cargaActual) { this.trabajadoresAnteriores = trabajadores; }
      })
      .catch((error: any) => console.error('Error al buscar el mes anterior:', error));
  }

  private prepararDias(anio: number, mes: number) {
    const corto = this.meses[mes - 1].corto;
    const total = new Date(anio, mes, 0).getDate();
    const feriados = getFeriadosChile(anio);
    const hoy = new Date();
    const esMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth() + 1;
    const dias: DiaAsistencia[] = [];
    for (let numero = 1; numero <= total; numero++) {
      const dia = new Date(anio, mes - 1, numero).getDay();
      dias.push({
        numero: numero,
        letra: LETRAS_DIA[dia],
        fecha: numero + '-' + corto,
        finDeSemana: dia === 0 || dia === 6,
        feriado: feriados[mes + '-' + numero] || '',
        hoy: esMesActual && numero === hoy.getDate(),
        pendiente: false
      });
    }
    this.dias = dias;
  }

  // ===================== Hoy y días pendientes =====================

  /** Días hábiles ya pasados (sin contar hoy) del mes que se muestra. */
  private diasHabilesPasados(): number[] {
    const hoy = new Date();
    const anio = Number(this.anio);
    const mes = Number(this.mes);
    const actual = hoy.getFullYear() * 12 + hoy.getMonth();
    const mostrado = anio * 12 + (mes - 1);
    if (mostrado > actual) { return []; }                       // mes futuro
    const limite = mostrado === actual ? hoy.getDate() - 1 : this.dias.length;
    return this.dias.filter(d => d.numero <= limite && !d.finDeSemana && !d.feriado).map(d => d.numero);
  }

  /**
   * Un día queda pendiente para un trabajador si es hábil, ya pasó, no tiene jornada ni horas extra
   * aquí y tampoco trabajó ese día en otro subproyecto.
   */
  private calcularPendientes() {
    const hoy = new Date();
    const actual = hoy.getFullYear() * 12 + hoy.getMonth();
    const mostrado = Number(this.anio) * 12 + (Number(this.mes) - 1);
    this.ultimoDiaEditable = mostrado > actual ? 0 : (mostrado === actual ? hoy.getDate() : this.dias.length);

    const habiles = this.diasHabilesPasados();
    const primero: { [idFila: string]: number } = {};
    const pendientes: { [idFila: string]: { [dia: number]: boolean } } = {};
    const diasConPendiente: { [dia: number]: boolean } = {};
    const nombres: string[] = [];

    this.trabajadores.forEach(t => {
      const fila: { [dia: number]: boolean } = {};
      let alguno = false;
      habiles.forEach(dia => {
        const delDia = t.dias[dia] || {};
        const marcado = (Number(delDia.jornada) || 0) > 0 || (Number(delDia.extra) || 0) > 0 ||
          delDia.jornada === 0 ||                                 // un 0 escrito = se revisó (no trabajó)
          !!(delDia.ausencia && delDia.ausencia.motivo);          // día justificado (licencia, vacaciones...)
        if (marcado || this.otroSp(t, dia)) { return; }
        fila[dia] = true;
        diasConPendiente[dia] = true;
        if (!primero[t.id] || dia < primero[t.id]) { primero[t.id] = dia; }
        alguno = true;
      });
      pendientes[t.id] = fila;
      if (alguno) { nombres.push((t.nombre + ' ' + (t.apellido || '')).trim()); }
    });

    this.pendientes = pendientes;
    this.primerPendiente = primero;
    this.dias.forEach(d => d.pendiente = !!diasConPendiente[d.numero]);
    const lista = Object.keys(diasConPendiente).map(Number).sort((a, b) => a - b);
    const visibles = this.diasVisibles.map(d => d.numero);
    this.avisoPendientes = lista.length ? {
      dias: lista,
      nombres: nombres,
      otraQuincena: lista.some(d => visibles.indexOf(d) < 0)
    } : null;
  }

  /**
   * Registro diario: no se puede llenar un día futuro, ni un día posterior al primer día
   * hábil que el trabajador tiene sin completar (se llena en orden, día a día).
   */
  bloqueadoSecuencia(trabajador: TrabajadorAsistencia, dia: number): boolean {
    if (!trabajador || trabajador.nuevo) { return false; }
    if (dia > this.ultimoDiaEditable) { return true; }
    const primero = this.primerPendiente[trabajador.id];
    return !!primero && dia > primero;
  }

  /** Texto de ayuda de la celda (otro subproyecto o por qué está bloqueada). */
  tituloCelda(trabajador: TrabajadorAsistencia, dia: number): string {
    if (trabajador.nuevo) { return null; }
    const aus = trabajador.dias[dia] && trabajador.dias[dia].ausencia;
    const m = aus ? motivoAusencia(aus.motivo) : null;
    if (m) { return m.t + (aus.obs ? ': ' + aus.obs : '') + (this.soloLectura ? '' : ' · doble clic para editar'); }
    const otro = this.otroSp(trabajador, dia);
    if (otro) { return otro.texto; }
    if (this.soloLectura) { return null; }
    if (dia > this.ultimoDiaEditable) { return 'Todavía no llega este día'; }
    const primero = this.primerPendiente[trabajador.id];
    if (primero && dia > primero) {
      return 'Primero completa el ' + primero + ' de ' + this.nombreMes.toLowerCase() + ' (1, 0,5 o 0 si no trabajó)';
    }
    return null;
  }

  esPendiente(trabajador: TrabajadorAsistencia, dia: number): boolean {
    const fila = trabajador && this.pendientes[trabajador.id];
    return !!fila && !!fila[dia];
  }

  /** "3, 4, 5 y 6 nov" (máximo 12 días; el resto se resume). */
  get textoDiasPendientes(): string {
    if (!this.avisoPendientes) { return ''; }
    const dias = this.avisoPendientes.dias;
    const corto = this.meses[Number(this.mes) - 1].corto;
    const mostrados = dias.slice(0, 12).map(String);
    let texto = mostrados.length > 1
      ? mostrados.slice(0, -1).join(', ') + ' y ' + mostrados[mostrados.length - 1]
      : mostrados[0];
    if (dias.length > 12) { texto = mostrados.join(', ') + ' y ' + (dias.length - 12) + ' más'; }
    return texto + ' ' + corto;
  }

  get textoNombresPendientes(): string {
    if (!this.avisoPendientes) { return ''; }
    const n = this.avisoPendientes.nombres;
    return n.length > 4 ? n.slice(0, 4).join(', ') + ' y ' + (n.length - 4) + ' más' : n.join(', ');
  }

  /** Desplaza la tabla para que se vea el día de hoy. */
  irAHoy() {
    setTimeout(() => {
      const marco = this.marco && this.marco.nativeElement;
      if (!marco) { return; }
      const th = marco.querySelector('th.ca-hoy');
      if (!th) { return; }
      const fijas = this.camposTrabajador.filter(c => c.clase.indexOf('ca-fijo') >= 0)
        .reduce((suma, c) => suma + c.ancho, 28);
      marco.scrollLeft = Math.max(0, th.offsetLeft - fijas - 2 * 72);
    }, 0);
  }

  private recalcular() {
    const resumen: any = { hh: 0, trabajadores: 0, jornadas: 0, extra: 0, capacitacion: 0, ausencias: 0, injustificadas: 0, porMotivo: {} };
    const totalesFila: { [id: string]: any } = {};
    const totalesDia: { [dia: number]: any } = {};

    this.dias.forEach(dia => totalesDia[dia.numero] = { jornada: 0, extra: 0, capacitacion: 0 });

    this.trabajadores.forEach(trabajador => {
      const fila: any = { jornada: 0, extra: 0, capacitacion: 0, hh: 0 };
      this.dias.forEach(dia => {
        const delDia = trabajador.dias[dia.numero] || {};
        const aus = delDia.ausencia && motivoAusencia(delDia.ausencia.motivo);
        if (aus) {
          resumen.ausencias++;
          if (!aus.justificada) { resumen.injustificadas++; }
          resumen.porMotivo[aus.v] = (resumen.porMotivo[aus.v] || 0) + 1;
        }
        this.campos.forEach(item => {
          const valor = Number(delDia[item.campo]) || 0;
          fila[item.campo] += valor;
          totalesDia[dia.numero][item.campo] += valor;
        });
      });
      fila.hh = this.redondear(fila.jornada * HORAS_JORNADA + fila.extra);   // la capacitación ya no suma aquí
      totalesFila[trabajador.id] = fila;

      resumen.hh += fila.hh;
      resumen.jornadas += fila.jornada;
      resumen.extra += fila.extra;
      resumen.capacitacion += fila.capacitacion;
      if (fila.hh > 0) { resumen.trabajadores++; }
    });

    resumen.hh = this.redondear(resumen.hh);
    resumen.capacitacion = this.redondear(resumen.capacitacion);
    this.resumen = resumen;
    if (this.embebido) { this.calcularOtros(); }
    this.calcularPendientes();
    if (this.embebido) {
      const r = {
        idSubProyecto: this.idSubProyecto,
        resumen: resumen,
        trabajadores: this.trabajadores.length,
        diasPendientes: this.avisoPendientes ? this.avisoPendientes.dias.length : 0,
        filas: this.trabajadores.map(t => ({
          idTrabajador: t.idTrabajador || '', rut: t.rut, nombre: t.nombre, apellido: t.apellido, dias: t.dias
        }))
      };
      Promise.resolve().then(() => this.resumenCambio.emit(r));
    }
    this.totalesFila = totalesFila;
    this.totalesDia = totalesDia;
  }

  /** Los valores a cargar en Estadísticas HH. Si el mes no tiene asistencia, no se toca lo escrito a mano. */
  private getValoresMes(anio: number, mes: number): any {
    const anterior = (this.datosHH[anio] && this.datosHH[anio][mes]) || {};
    const valores: any = {};
    const hayHoras = this.resumen.jornadas > 0 || this.resumen.extra > 0;
    const hayCapacitacion = this.resumen.capacitacion > 0;

    if (hayHoras || anterior.asistencia) {
      valores.hh = hayHoras ? this.redondear(this.resumen.jornadas * HORAS_JORNADA) : null;
      valores.horasExtra = hayHoras ? this.redondear(this.resumen.extra) : null;
      valores.hhTotales = hayHoras ? this.resumen.hh : null; // Base de IF e IS
      valores.trabajadores = hayHoras ? this.resumen.trabajadores : null;
      valores.asistencia = hayHoras;
    }
    if (hayCapacitacion || anterior.asistenciaCapacitacion) {
      valores[CAMPO_CAPACITACION] = hayCapacitacion ? this.resumen.capacitacion : null;
      valores.asistenciaCapacitacion = hayCapacitacion;
    }
    return valores;
  }

  private persistir(datos: any, revertir: () => void): Promise<boolean> {
    const anio = Number(this.anio);
    const mes = Number(this.mes);
    const base = {
      idSubProyecto: this.idSubProyecto,
      idProyecto: this.idProyecto === undefined ? null : this.idProyecto,
      nombreSubProyecto: this.nombreSubProyecto || '',
      anio: anio,
      idUsuarioActualizacion: this.idUsuario,
      fechaActualizacion: new Date().toISOString()
    };

    this.recalcular();
    const valoresMes = this.getValoresMes(anio, mes);
    const batch = firestoreDB.batch();
    batch.set(firestoreDB.collection(COLECCION).doc(this.getIdDocumento(anio, mes)),
      { ...base, mes: mes, ...datos }, { merge: true });
    if (Object.keys(valoresMes).length) {
      batch.set(firestoreDB.collection(COLECCION_HH).doc(this.idSubProyecto + '_' + anio),
        { ...base, meses: { [mes]: valoresMes } }, { merge: true });
    }

    this.guardadosPendientes++;
    this.estadoGuardado = 'guardando';

    return batch.commit()
      .then(() => {
        this.guardadosPendientes--;
        if (!this.guardadosPendientes && this.estadoGuardado !== 'error') {
          this.estadoGuardado = 'guardado';
        }
        if (this.embebido) {
          // deja lo guardado como "lo anterior" para el próximo cambio
          const delAnio = this.datosHH[anio] || (this.datosHH[anio] = {});
          const delMes = delAnio[mes] || (delAnio[mes] = {});
          Object.keys(valoresMes).forEach(k => delMes[k] = valoresMes[k]);
        }
        this.resumenActualizado.emit({ anio: anio, mes: mes, valores: valoresMes });
        return true;
      })
      .catch((error: any) => {
        console.error('Error al guardar la asistencia:', error);
        this.guardadosPendientes--;
        this.estadoGuardado = 'error';
        if (anio === Number(this.anio) && mes === Number(this.mes)) {
          revertir();
          this.recalcular();
        }
        return false;
      });
  }

  guardarCelda(trabajador: TrabajadorAsistencia, dia: number, campo: string, input: any) {
    if (this.soloLectura) { return; }
    if (this.bloqueadoSecuencia(trabajador, dia)) {
      input.value = this.getTextoCelda(trabajador, dia, campo);
      this.errorFila = this.tituloCelda(trabajador, dia) || 'Este día todavía no se puede llenar.';
      return;
    }
    this.errorFila = '';

    // Letra de motivo en la celda "Día" (L, V, P, S, F, O): justifica el día sin abrir el popup
    if (campo === 'jornada') {
      const letra = (input.value || '').trim().toUpperCase();
      const porLetra = MOTIVOS_AUSENCIA.filter(m => m.letra === letra || m.v === letra)[0];
      if (porLetra) {
        input.value = '';
        this.guardarAusencia(trabajador, dia, porLetra.v, '');
        input.value = this.getTextoCelda(trabajador, dia, campo);
        return;
      }
    }

    const valor = this.leerValor(input.value, campo);
    if (valor === undefined) {
      input.value = this.getTextoCelda(trabajador, dia, campo);
      return;
    }

    const delDia = trabajador.dias[dia] || (trabajador.dias[dia] = {});
    const anterior = delDia[campo] === undefined ? null : delDia[campo];
    const ausenciaAnterior = delDia.ausencia || null;
    // si escribe una jornada mayor a 0, el día deja de estar justificado como ausencia
    const quitaAusencia = campo === 'jornada' && valor !== null && valor > 0 && !!ausenciaAnterior;
    delDia[campo] = valor;
    if (quitaAusencia) { delDia.ausencia = null; }
    input.value = this.getTextoCelda(trabajador, dia, campo);
    if (valor === anterior && !quitaAusencia) { return; }

    const cambio: any = { [campo]: valor };
    if (quitaAusencia) { cambio.ausencia = null; }
    this.persistir(
      { trabajadores: { [trabajador.id]: { dias: { [dia]: cambio } } } },
      () => {
        delDia[campo] = anterior;
        if (quitaAusencia) { delDia.ausencia = ausenciaAnterior; }
        input.value = this.getTextoCelda(trabajador, dia, campo);
      }
    );
  }

  // ===================== Justificar faltas =====================

  /** Datos del motivo (para mostrarlo en el popup del día). */
  motivoTexto(v: string): MotivoAusencia {
    return motivoAusencia(v) || { v: v, letra: '?', t: v, d: '', justificada: true };
  }

  /** Motivo del día (o null). */
  ausenciaDe(trabajador: TrabajadorAsistencia, dia: number): MotivoAusencia {
    const delDia = trabajador && trabajador.dias ? trabajador.dias[dia] : null;
    return delDia && delDia.ausencia ? motivoAusencia(delDia.ausencia.motivo) : null;
  }

  /** ¿Se puede abrir el popup de ese día? (no días futuros) */
  diaAbrible(dia: number): boolean {
    return !this.soloLectura && dia <= this.ultimoDiaEditable && this.trabajadores.length > 0;
  }

  /** Abre el popup del día con todos los trabajadores (clic en el encabezado del día o doble clic en una celda). */
  abrirDia(dia: number, desde?: TrabajadorAsistencia) {
    if (this.soloLectura) { return; }
    if (dia > this.ultimoDiaEditable) { this.errorFila = 'Todavía no llega el ' + dia + '.'; return; }
    const info = this.dias.filter(d => d.numero === dia)[0];
    const filas: FilaDia[] = this.trabajadores.map(t => {
      const delDia = t.dias[dia] || {};
      const aus = delDia.ausencia || null;
      const otro = this.otroSp(t, dia);
      const primero = this.primerPendiente[t.id];
      let bloqueo = '';
      if (primero && dia > primero) { bloqueo = 'Falta completar el ' + primero; }
      else if (otro && otro.lleno && !delDia.jornada && !aus) { bloqueo = 'Jornada completa en otro subproyecto'; }
      let estado = '';
      if (aus && aus.motivo) { estado = 'AUS'; }
      else if (delDia.jornada === 1) { estado = '1'; }
      else if (delDia.jornada === 0.5) { estado = '0.5'; }
      else if (delDia.jornada === 0) { estado = '0'; }
      else if (delDia.jornada) { estado = String(delDia.jornada); }
      return {
        trabajador: t,
        estado: estado,
        extra: delDia.extra === null || delDia.extra === undefined ? '' : this.formatear(delDia.extra),
        motivo: aus ? aus.motivo : '',
        obs: aus ? (aus.obs || '') : '',
        bloqueo: bloqueo,
        otro: otro ? otro.texto : ''
      };
    });
    this.errorModalDia = '';
    this.errorFila = '';
    this.modalDia = {
      dia: dia,
      fecha: this.textoFecha(dia),
      feriado: info ? info.feriado : '',
      finDeSemana: info ? info.finDeSemana : false,
      filas: filas,
      enfocado: desde ? desde.id : ''
    };
  }

  /** Abre la justificación en el primer día pendiente del primer trabajador atrasado. */
  justificarPrimerPendiente() {
    const t = this.trabajadores.filter(x => this.primerPendiente[x.id])[0];
    if (t) { this.abrirAusencia(t, this.primerPendiente[t.id], true); }
  }

  /** Trabajadores para el selector del popup de justificación. */
  get trabajadoresJustificables(): TrabajadorAsistencia[] {
    return this.trabajadores.filter(t => !t.nuevo);
  }

  /** Cantidad de días pendientes de un trabajador. */
  cantidadPendientes(t: TrabajadorAsistencia): number {
    const fila = t && this.pendientes[t.id];
    return fila ? Object.keys(fila).filter(k => fila[k]).length : 0;
  }

  primerPendienteDe(t: TrabajadorAsistencia): number {
    return this.primerPendiente[t.id] || null;
  }

  /** Cambia el trabajador a justificar (va a su primer día pendiente). */
  elegirTrabajadorAus(t: TrabajadorAsistencia) {
    const dia = this.primerPendiente[t.id];
    if (!dia || !this.modalAusencia || this.modalAusencia.trabajador === t) { return; }
    this.abrirAusencia(t, dia, true);
  }

  // ----- Popup de justificación (un trabajador) -----

  /** Doble clic en la celda "Día" o botón Justificar: justifica y guarda directo. */
  abrirAusencia(trabajador: TrabajadorAsistencia, dia: number, elegir: boolean = false) {
    if (this.soloLectura || !trabajador || trabajador.nuevo) { return; }
    if (this.bloqueadoSecuencia(trabajador, dia)) {
      this.errorFila = this.tituloCelda(trabajador, dia) || 'Este día todavía no se puede justificar.';
      return;
    }
    const delDia = trabajador.dias[dia] || {};
    const aus = delDia.ausencia || null;
    this.errorAusencia = '';
    this.modalAusencia = {
      trabajador: trabajador,
      dia: dia,
      fecha: this.textoFecha(dia),
      motivo: aus ? aus.motivo : '',
      obs: aus ? (aus.obs || '') : '',
      existente: !!aus,
      elegir: elegir
    };
  }

  /** Desde el popup del día ("Ausente…"): elige motivo y vuelve a la fila del día. */
  abrirAusenciaDesdeDia(f: FilaDia) {
    if (!this.modalDia || f.bloqueo) { return; }
    this.errorAusencia = '';
    this.modalAusencia = {
      trabajador: f.trabajador,
      dia: this.modalDia.dia,
      fecha: this.modalDia.fecha,
      motivo: f.estado === 'AUS' ? f.motivo : '',
      obs: f.estado === 'AUS' ? (f.obs || '') : '',
      existente: f.estado === 'AUS' && !!f.motivo,
      fila: f
    };
  }

  /** Observación del popup de justificación (sin ngModel, para que nada externo bloquee la escritura). */
  escribirObs(valor: string) {
    if (!this.modalAusencia) { return; }
    this.modalAusencia.obs = valor || '';
    if (this.errorAusencia && this.modalAusencia.obs.trim()) { this.errorAusencia = ''; }
  }

  /**
   * Si algún listener global de la app cancela la tecla (preventDefault), el textarea no escribe.
   * En ese caso insertamos el carácter a mano para que la observación siempre se pueda escribir.
   */
  teclaObs(e: KeyboardEvent, el: HTMLTextAreaElement) {
    e.stopPropagation();
    if (!e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || !el) { return; }
    const v = el.value || '';
    let ini = el.selectionStart, fin = el.selectionEnd;
    let texto: string = null;
    if (e.key && e.key.length === 1) { texto = e.key; }
    else if (e.key === 'Enter') { texto = '\n'; }
    else if (e.key === 'Backspace') { if (ini === fin && ini > 0) { ini--; } texto = ''; }
    else if (e.key === 'Delete') { if (ini === fin && fin < v.length) { fin++; } texto = ''; }
    if (texto === null) { return; }
    if (v.length - (fin - ini) + texto.length > 300) { return; }
    el.value = v.slice(0, ini) + texto + v.slice(fin);
    el.selectionStart = el.selectionEnd = ini + texto.length;
    this.escribirObs(el.value);
  }

  cerrarAusencia() {
    this.modalAusencia = null;
    this.errorAusencia = '';
  }

  guardarModalAusencia() {
    const m = this.modalAusencia;
    if (!m) { return; }
    if (!m.motivo) { this.errorAusencia = 'Elige el motivo.'; return; }
    if (m.motivo === 'OTR' && !(m.obs || '').trim()) { this.errorAusencia = 'Para "Otro justificado" escribe el detalle.'; return; }
    if (m.fila) {
      m.fila.estado = 'AUS';
      m.fila.motivo = m.motivo;
      m.fila.obs = (m.obs || '').trim();
      this.errorModalDia = '';
      this.cerrarAusencia();
      return;
    }
    this.guardarAusencia(m.trabajador, m.dia, m.motivo, (m.obs || '').trim());
    // pasa al siguiente día pendiente del mismo trabajador, si hay
    const siguiente = this.primerPendiente[m.trabajador.id];
    const otro = m.elegir ? this.trabajadores.filter(x => x !== m.trabajador && this.primerPendiente[x.id])[0] : null;
    if (siguiente && siguiente !== m.dia) {
      this.abrirAusencia(m.trabajador, siguiente, m.elegir);
    } else if (otro) {
      this.abrirAusencia(otro, this.primerPendiente[otro.id], true);
    } else {
      this.cerrarAusencia();
    }
  }

  quitarModalAusencia() {
    const m = this.modalAusencia;
    if (!m) { return; }
    if (m.fila) {
      m.fila.estado = '';
      m.fila.motivo = '';
      m.fila.obs = '';
    } else {
      this.guardarAusencia(m.trabajador, m.dia, null, '');
    }
    this.cerrarAusencia();
  }

  cerrarDia() {
    this.modalDia = null;
    this.errorModalDia = '';
  }

  elegirEstado(f: FilaDia, estado: string) {
    if (f.bloqueo) { return; }
    if (estado === 'AUS') { this.abrirAusenciaDesdeDia(f); return; }
    f.estado = f.estado === estado ? '' : estado;
    if (f.estado !== 'AUS') { f.motivo = ''; f.obs = ''; }
    this.errorModalDia = '';
  }

  elegirMotivo(f: FilaDia, motivo: string) {
    if (f.bloqueo) { return; }
    f.estado = 'AUS';
    f.motivo = motivo;
    this.errorModalDia = '';
  }

  /** Marca a todos los que están sin marcar como presentes (1). */
  todosPresentes() {
    if (!this.modalDia) { return; }
    this.modalDia.filas.forEach(f => { if (!f.bloqueo && !f.estado) { f.estado = '1'; } });
  }

  get resumenModalDia(): { marcados: number; total: number } {
    const filas = this.modalDia ? this.modalDia.filas.filter(f => !f.bloqueo) : [];
    return { marcados: filas.filter(f => !!f.estado).length, total: filas.length };
  }

  /** Guarda todo el día en una sola operación. */
  guardarModalDia() {
    const m = this.modalDia;
    if (!m) { return; }
    const dia = m.dia;
    const cambios: any = {};
    const respaldos: { t: TrabajadorAsistencia; antes: any }[] = [];

    for (const f of m.filas) {
      if (f.bloqueo) { continue; }
      const nombre = f.trabajador.nombre + ' ' + (f.trabajador.apellido || '');
      if (f.estado === 'AUS' && !f.motivo) { this.errorModalDia = 'Elige el motivo de ausencia de ' + nombre + '.'; return; }
      if (f.estado === 'AUS' && f.motivo === 'OTR' && !(f.obs || '').trim()) {
        this.errorModalDia = 'Escribe el detalle del motivo "Otro" de ' + nombre + '.'; return;
      }
      const extra = this.leerValor(String(f.extra === null || f.extra === undefined ? '' : f.extra), 'extra');
      if (extra === undefined) { this.errorModalDia = 'Las horas extra de ' + nombre + ' no son válidas (0 a 24).'; return; }

      let jornada: number = null;
      let ausencia: any = null;
      if (f.estado === 'AUS') {
        jornada = 0;
        ausencia = { motivo: f.motivo, obs: (f.obs || '').trim(), por: this.idUsuario || null, fecha: new Date().toISOString() };
      } else if (f.estado) {
        jornada = Number(f.estado);
      }

      const delDia = f.trabajador.dias[dia] || {};
      const antesAus = delDia.ausencia || null;
      const igual = (delDia.jornada === undefined ? null : delDia.jornada) === jornada &&
        (delDia.extra === undefined ? null : delDia.extra) === extra &&
        ((!antesAus && !ausencia) || (antesAus && ausencia && antesAus.motivo === ausencia.motivo && (antesAus.obs || '') === ausencia.obs));
      if (igual) { continue; }

      respaldos.push({ t: f.trabajador, antes: JSON.parse(JSON.stringify(delDia)) });
      const nuevo = f.trabajador.dias[dia] || (f.trabajador.dias[dia] = {});
      nuevo.jornada = jornada;
      nuevo.extra = extra;
      nuevo.ausencia = ausencia;
      cambios[f.trabajador.id] = { dias: { [dia]: { jornada: jornada, extra: extra, ausencia: ausencia } } };
    }

    this.cerrarDia();
    if (!Object.keys(cambios).length) { return; }
    this.persistir({ trabajadores: cambios }, () => {
      respaldos.forEach(r => { r.t.dias[dia] = r.antes; });
    });
  }

  /** Guarda (o quita, con motivo null) la justificación del día. La jornada queda en 0. */
  private guardarAusencia(trabajador: TrabajadorAsistencia, dia: number, motivo: string, obs: string) {
    const delDia = trabajador.dias[dia] || (trabajador.dias[dia] = {});
    const antes = { jornada: delDia.jornada === undefined ? null : delDia.jornada, ausencia: delDia.ausencia || null };
    const ausencia = motivo ? {
      motivo: motivo,
      obs: obs || '',
      por: this.idUsuario || null,
      fecha: new Date().toISOString()
    } : null;
    delDia.ausencia = ausencia;
    delDia.jornada = motivo ? 0 : (antes.ausencia ? null : delDia.jornada);
    this.persistir(
      { trabajadores: { [trabajador.id]: { dias: { [dia]: { jornada: delDia.jornada, ausencia: ausencia } } } } },
      () => {
        delDia.jornada = antes.jornada;
        delDia.ausencia = antes.ausencia;
      }
    );
  }

  private textoFecha(dia: number): string {
    const d = this.dias.filter(x => x.numero === dia)[0];
    return (d ? d.letra + ' ' : '') + dia + ' de ' + this.nombreMes.toLowerCase() + ' ' + this.anio;
  }

  /** Texto del resumen de ausencias para el tooltip del chip. */
  get textoAusencias(): string {
    const pm = this.resumen && this.resumen.porMotivo ? this.resumen.porMotivo : {};
    return MOTIVOS_AUSENCIA.filter(m => pm[m.v]).map(m => m.t + ': ' + pm[m.v]).join(' · ');
  }

  /** Jornada: de 0 a 1 (1 es día completo). Horas extra y capacitación: horas del día. */
  private leerValor(texto: string, campo: string): number | null | undefined {
    const limpio = (texto || '').replace(/\s/g, '');
    if (!limpio) { return null; }
    if (!/^\d+([.,]\d+)?$/.test(limpio)) { return undefined; }

    const valor = this.redondear(Number(limpio.replace(',', '.')));
    return valor > (campo === 'jornada' ? 1 : 24) ? undefined : valor;
  }

  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  formatear(valor: number): string {
    const partes = String(this.redondear(valor || 0)).split('.');
    return partes[0].replace(/\B(?=(\d{3})+$)/g, '.') + (partes[1] ? ',' + partes[1] : '');
  }

  getTextoCelda(trabajador: TrabajadorAsistencia, dia: number, campo: string): string {
    const delDia = trabajador.dias[dia] || {};
    if (campo === 'jornada' && delDia.ausencia) {
      const m = motivoAusencia(delDia.ausencia.motivo);
      if (m) { return m.letra; }
    }
    const valor = delDia[campo];
    return valor === null || valor === undefined ? '' : this.formatear(valor);
  }

  getTotalDia(dia: number, campo: string): string {
    const total = this.totalesDia[dia] ? this.totalesDia[dia][campo] : 0;
    return total ? this.formatear(total) : '';
  }

  get nombreMes(): string {
    return this.meses[Number(this.mes) - 1].nombre;
  }

  get nombreMesAnterior(): string {
    return this.meses[Number(this.mes) === 1 ? 11 : Number(this.mes) - 2].nombre;
  }

  /** HH escritas a mano que se reemplazarán con la primera jornada marcada. */
  get hhManual(): number {
    const anio = this.datosHH[Number(this.anio)];
    const delMes = anio ? anio[Number(this.mes)] : null;
    return delMes && !delMes.asistencia && !this.resumen.hh ? Number(delMes.hh) || 0 : 0;
  }

  seleccionarQuincena(quincena: number) {
    this.quincena = quincena;
    this.diasVisibles = this.dias.filter(dia => quincena === 1 ? dia.numero <= 15 : dia.numero > 15);
    if (this.trabajadores) { this.calcularPendientes(); }
    this.irAHoy();
  }

  /** La tabla lleva su ancho exacto para que los estilos globales no aplasten las columnas. */
  get anchoTabla(): number {
    const trabajador = this.camposTrabajador.reduce((suma, item) => suma + item.ancho, 28);
    return trabajador + (this.soloLectura ? 0 : 26) + this.diasVisibles.length * 36 * this.campos.length + 148;
  }

  /** Lista más la fila vacía del final, donde se escribe un trabajador nuevo. */
  get filas(): TrabajadorAsistencia[] {
    return this.soloLectura ? this.trabajadores : this.trabajadores.concat(this.borrador);
  }

  private crearBorrador(): TrabajadorAsistencia {
    return {
      id: this.getIdNuevo(),
      nombre: '',
      apellido: '',
      rut: '',
      lugar: this.nombreSubProyecto || '',
      cargo: '',
      orden: 0,
      dias: {},
      nuevo: true
    };
  }

  /** Un trabajador nuevo se guarda cuando su fila tiene nombre y apellido. */
  guardarDato(trabajador: TrabajadorAsistencia, campo: string, input: any) {
    if (this.soloLectura) { return; }

    let valor = (input.value || '').trim();
    const anterior = trabajador[campo];
    this.errorFila = '';
    input.value = valor;
    if (valor === anterior) { return; }

    if (!trabajador.nuevo && !valor && (campo === 'nombre' || campo === 'apellido')) {
      input.value = anterior;
      this.errorFila = 'El trabajador debe tener nombre y apellido.';
      return;
    }
    // Fila nueva: si lo escrito calza con alguien de la agenda, se completa solo
    if (trabajador.nuevo && (campo === 'nombre' || campo === 'rut')) {
      const deAgenda = campo === 'nombre'
        ? this.agenda.filter(t => etiquetaTrabajador(t) === valor)[0]
        : buscarEnAgenda(this.agenda, { rut: valor });
      if (deAgenda) {
        input.value = '';
        this.agregarDesdeAgenda(deAgenda);
        return;
      }
    }

    if (campo === 'rut' && valor) {
      valor = formatearRut(valor);
      input.value = valor;
    }

    if (campo === 'rut' && this.rutRepetido(valor, trabajador.id)) {
      input.value = anterior;
      this.errorFila = 'Ya hay un trabajador con ese RUT en este mes.';
      return;
    }

    trabajador[campo] = valor;

    if (trabajador.nuevo) {
      if (trabajador.nombre && trabajador.apellido) {
        this.confirmarBorrador(trabajador);
        if (this.embebido) { this.trabajadorNuevo.emit(trabajador); }
      }
      return;
    }

    this.persistir({ trabajadores: { [trabajador.id]: { [campo]: valor } } }, () => {
      trabajador[campo] = anterior;
      input.value = anterior;
    });
  }

  private confirmarBorrador(trabajador: TrabajadorAsistencia) {
    trabajador.nuevo = false;
    trabajador.orden = this.getSiguienteOrden();
    this.trabajadores = this.trabajadores.concat(trabajador);
    this.trabajadoresAnteriores = [];
    this.borrador = this.crearBorrador();

    this.persistir({ trabajadores: { [trabajador.id]: this.getDatosTrabajador(trabajador) } }, () => {
      this.trabajadores = this.trabajadores.filter(item => item.id !== trabajador.id);
    });
  }

  /**
   * Agrega a este subproyecto un trabajador de la agenda de CORE.
   * Devuelve false si ya estaba en este subproyecto este mes.
   */
  agregarDesdeAgenda(t: TrabajadorCore): boolean {
    if (this.soloLectura || !t) { return false; }
    this.errorFila = '';
    const rut = limpiarRut(t.rut);
    const ya = this.trabajadores.some(item =>
      (t.id && item.idTrabajador === t.id) || (!!rut && this.limpiarRut(item.rut) === rut.toLowerCase()));
    if (ya) {
      this.errorFila = t.nombre + ' ' + t.apellido + ' ya está en ' + (this.nombreSubProyecto || 'este subproyecto') + ' este mes.';
      return false;
    }

    const trabajador: TrabajadorAsistencia = {
      id: this.getIdNuevo(),
      nombre: t.nombre || '',
      apellido: t.apellido || '',
      rut: t.rut || '',
      lugar: this.nombreSubProyecto || '',
      cargo: t.cargo || '',
      orden: this.getSiguienteOrden(),
      dias: {},
      idTrabajador: t.id || ''
    };
    this.trabajadores = this.trabajadores.concat(trabajador);
    this.trabajadoresAnteriores = [];
    this.persistir({ trabajadores: { [trabajador.id]: this.getDatosTrabajador(trabajador) } }, () => {
      this.trabajadores = this.trabajadores.filter(item => item.id !== trabajador.id);
    });
    return true;
  }

  // ===================== Días en otros subproyectos (CORE) =====================

  private calcularOtros() {
    const res: { [idFila: string]: any } = {};
    const propio = String(this.idSubProyecto);
    if (this.ocupacion && this.trabajadores) {
      this.trabajadores.forEach(t => {
        const porDia: { [dia: string]: { [idSp: string]: any } } = {};
        clavesTrabajador(t).forEach(c => {
          const mapa = this.ocupacion[c];
          if (!mapa) { return; }
          Object.keys(mapa).forEach(dia => Object.keys(mapa[dia]).forEach(idSp => {
            if (idSp === propio) { return; }
            (porDia[dia] || (porDia[dia] = {}))[idSp] = mapa[dia][idSp];
          }));
        });
        const fila: { [dia: string]: { lleno: boolean; texto: string } } = {};
        Object.keys(porDia).forEach(dia => {
          const lista = Object.keys(porDia[dia]).map(k => porDia[dia][k]);
          let jornada = 0;
          const textos = lista.map(o => {
            jornada += Number(o.jornada) || 0;
            const partes: string[] = [];
            if (o.jornada) { partes.push(this.formatear(o.jornada) + (o.jornada === 1 ? ' día' : ' días')); }
            if (o.extra) { partes.push(this.formatear(o.extra) + ' h extra'); }
            if (o.capacitacion) { partes.push(this.formatear(o.capacitacion) + ' h cap.'); }
            return o.nombre + (partes.length ? ' (' + partes.join(', ') + ')' : '');
          });
          fila[dia] = { lleno: jornada >= 1, texto: 'Este día trabajó en ' + textos.join(' y ') };
        });
        res[t.id] = fila;
      });
    }
    this.otros = res;
    if (this.trabajadores) { this.calcularPendientes(); }
  }

  /** Lo que ese trabajador tiene ese día en otro subproyecto (o null). */
  otroSp(trabajador: TrabajadorAsistencia, dia: number) {
    const fila = trabajador && this.otros[trabajador.id];
    return fila ? (fila[dia] || null) : null;
  }

  /** Celda bloqueada: el día ya tiene jornada completa en otro subproyecto y aquí no hay nada. */
  bloqueadoPorOtro(trabajador: TrabajadorAsistencia, dia: number, campo: string): boolean {
    const o = this.otroSp(trabajador, dia);
    return !!o && o.lleno && !this.getTextoCelda(trabajador, dia, campo);
  }

  /** CORE: lee las estadísticas del subproyecto en el año (para no pisar lo escrito a mano). */
  private cargarDatosHH(anio: number) {
    if (this.datosHH && this.datosHH[anio]) { return; }
    if (!this.datosHH) { this.datosHH = {}; }
    firestoreDB.collection(COLECCION_HH).doc(this.idSubProyecto + '_' + anio).get()
      .then((doc: any) => {
        if (!this.datosHH[anio]) { this.datosHH[anio] = doc.exists ? ((doc.data() || {}).meses || {}) : {}; }
      })
      .catch((error: any) => console.error('No se pudieron leer las estadísticas HH:', error));
  }

  private rutRepetido(rut: string, id: string): boolean {
    const limpio = this.limpiarRut(rut);
    return !!limpio && this.trabajadores.some(item => item.id !== id && this.limpiarRut(item.rut) === limpio);
  }

  copiarMesAnterior() {
    if (this.soloLectura || !this.trabajadoresAnteriores.length) { return; }

    const orden = this.getSiguienteOrden();
    const nuevos = this.trabajadoresAnteriores.map((item, indice) => ({
      id: this.getIdNuevo(),
      nombre: item.nombre,
      apellido: item.apellido,
      rut: item.rut,
      lugar: item.lugar,
      cargo: item.cargo,
      orden: orden + indice,
      dias: {},
      idTrabajador: item.idTrabajador || ''
    }));
    const datos: any = {};
    nuevos.forEach(item => datos[item.id] = this.getDatosTrabajador(item));

    this.trabajadores = this.trabajadores.concat(nuevos);
    this.trabajadoresAnteriores = [];
    this.persistir({ trabajadores: datos }, () => {
      this.trabajadores = this.trabajadores.filter(item => !datos[item.id]);
    });
  }

  eliminar(trabajador: TrabajadorAsistencia) {
    if (this.soloLectura) { return; }

    Swal.fire({
      title: '¿Quitar a este trabajador?',
      text: trabajador.nombre + ' ' + trabajador.apellido + ' saldrá de ' + this.nombreMes + ' y sus horas dejarán de contar.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar'
    }).then((resultado: any) => {
      if (!resultado || !(resultado.value || resultado.isConfirmed)) { return; }

      const lista = this.trabajadores;
      this.trabajadores = lista.filter(item => item.id !== trabajador.id);
      this.persistir({ trabajadores: { [trabajador.id]: { eliminado: true } } }, () => {
        this.trabajadores = lista;
      });
    });
  }

  private getDatosTrabajador(trabajador: TrabajadorAsistencia): any {
    return {
      nombre: trabajador.nombre,
      apellido: trabajador.apellido,
      rut: trabajador.rut,
      lugar: trabajador.lugar,
      cargo: trabajador.cargo,
      orden: trabajador.orden,
      idTrabajador: trabajador.idTrabajador || ''
    };
  }

  private getIdNuevo(): string {
    return 't' + Date.now() + '_' + (++this.contadorIds);
  }

  private getSiguienteOrden(): number {
    return this.trabajadores.reduce((mayor, item) => Math.max(mayor, item.orden), 0) + 1;
  }

  private limpiarRut(rut: string): string {
    return (rut || '').replace(/[.\-\s]/g, '').toLowerCase();
  }

  private getIdDocumento(anio: number, mes: number): string {
    return this.idSubProyecto + '_' + anio + '_' + mes;
  }

  trackDia(index: number, dia: any) {
    return dia.numero;
  }

  trackCampo(index: number, item: any) {
    return item.campo;
  }

  trackTrabajador(index: number, trabajador: TrabajadorAsistencia) {
    return trabajador.id;
  }
}