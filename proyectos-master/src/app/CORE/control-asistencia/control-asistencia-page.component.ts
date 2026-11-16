import { Component, HostListener, OnInit, QueryList, ViewChildren } from '@angular/core';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { sMis_Proyectos } from '../../services/sMis_Proyectos.service';
import { sUsuarioClienteProyecto } from '../../services/sUsuarioClienteProyecto.service';
import { firestoreDB } from '../../firebase-init';
import * as firebase from 'firebase/app';
import 'firebase/storage';
import { ControlAsistenciaComponent, HORAS_JORNADA, MOTIVOS_AUSENCIA, motivoAusencia } from '../../Proyectos/estadisticas-hh/control-asistencia.component';
import {
  TrabajadorCore, listarTrabajadores, guardarTrabajador, eliminarTrabajador, buscarEnAgenda,
  etiquetaTrabajador, formatearRut, rutValido, limpiarRut, normalizarTexto, ordenarTrabajadores, clavesTrabajador
} from '../trabajadores/trabajadores-core';

const COLECCION_ASISTENCIA = 'asistenciaHH';
/** Misma colección de la agenda: la ficha completa se guarda en el mismo documento del trabajador. */
const COLECCION_TRABAJADORES = 'trabajadoresCore';

/** Ficha del trabajador (datos personales, previsión y contrato). Se guarda junto a la agenda. */
export interface FichaTrabajador {
  paterno: string;
  materno: string;
  fechaNacimiento: string;   // yyyy-mm-dd
  genero: string;
  nacionalidad: string;
  estadoCivil: string;
  direccion: string;
  comuna: string;
  telefono: string;
  celular: string;
  email: string;
  afp: string;
  salud: string;             // Fonasa o Isapre
  jubilado: boolean;
  tipoContrato: string;
  fechaInicio: string;       // desde
  fechaTermino: string;      // hasta (plazo fijo / obra)
  renta: number;
  colacion: number;
  movilizacion: number;
  estado: string;            // 'activo' | 'finiquitado'
  fechaFiniquito: string;
  motivoFiniquito: string;   // causal (Código del Trabajo)
  detalleFiniquito: string;  // razón en palabras
  adjuntoFiniquito: AdjuntoFiniquito;
  finiquitoAutomatico: boolean;   // (ya no se usa: el finiquito siempre lo hace una persona)
}

export interface AdjuntoFiniquito {
  nombre: string;
  ruta: string;
  url: string;
  tamano: number;
  tipo: string;
  fechaSubida: string;
}

/** Causales de término de contrato (Código del Trabajo). */
export const CAUSALES_FINIQUITO = [
  'Art. 159 N°1 · Mutuo acuerdo de las partes',
  'Art. 159 N°2 · Renuncia del trabajador',
  'Art. 159 N°3 · Muerte del trabajador',
  'Art. 159 N°4 · Vencimiento del plazo convenido',
  'Art. 159 N°5 · Conclusión del trabajo o servicio',
  'Art. 159 N°6 · Caso fortuito o fuerza mayor',
  'Art. 160 · Conductas del trabajador (despido disciplinario)',
  'Art. 161 · Necesidades de la empresa',
  'Art. 161 · Desahucio',
  'Otra'
];

const MAX_MB_FINIQUITO = 20;

/** Archivo de la carpeta de un trabajador (o su foto). */
export interface DocTrabajador {
  nombre: string;
  ruta: string;
  url: string;
  tamano: number;
  tipo: string;
  fechaSubida: string;
  subidoPor: string;
}

/** Carpetas de documentos del trabajador (mismas de la carpeta del servidor). */
export const CARPETAS_TRABAJADOR = [
  { id: 'legales', t: '1.- Doc legales', icono: 'fa-balance-scale' },
  { id: 'formacion', t: '2.- Doc formación', icono: 'fa-graduation-cap' },
  { id: 'contratos', t: '3.- Contratos', icono: 'fa-file-text-o' },
  { id: 'sgi', t: '4.- Doc SGI', icono: 'fa-shield' },
  { id: 'certificados', t: '5.- Certificados - permisos - vacaciones', icono: 'fa-calendar-check-o' },
  { id: 'prestamos', t: '6.- Préstamos', icono: 'fa-money' },
  { id: 'licencias', t: '7.- Licencias', icono: 'fa-medkit' },
  { id: 'amonestaciones', t: '8.- Amonestaciones', icono: 'fa-exclamation-triangle' },
  { id: 'finiquitos', t: '9.- Finiquitos', icono: 'fa-ban' }
];

const MAX_MB_DOC = 50;
const MAX_MB_FOTO = 5;

/** Fila ya calculada de la tabla de trabajadores (la tabla no llama funciones al dibujarse). */
export interface FilaAgenda {
  t: TrabajadorCore;
  f: FichaTrabajador;
  finiquitado: boolean;
  vencido: boolean;
  pendiente: boolean;
  diasVence: number;      // null = indefinido / finiquitado
  inicio: string;         // dd-mm-aaaa
  termino: string;
  finiquito: string;
  sps: string[];
  foto: string;           // url de la foto ('' = iniciales)
  iniciales: string;
}

const CAMPOS_FICHA = ['paterno', 'materno', 'fechaNacimiento', 'genero', 'nacionalidad', 'estadoCivil', 'direccion', 'comuna',
  'telefono', 'celular', 'email', 'afp', 'salud', 'jubilado', 'tipoContrato', 'fechaInicio', 'fechaTermino',
  'renta', 'colacion', 'movilizacion', 'estado', 'fechaFiniquito',
  'motivoFiniquito', 'detalleFiniquito', 'adjuntoFiniquito', 'finiquitoAutomatico'];

/** Lo que hizo una persona en un subproyecto (en un mes o en el año). */
interface ConsSp { id: string; nombre: string; dias: number; extra: number; hh: number; }

/** Una persona en el consolidado (se junta por agenda, RUT o nombre aunque esté en varios subproyectos). */
interface ConsPersona {
  nombre: string;
  rut: string;
  cargo: string;
  porMes: { [mes: number]: { dias: number; extra: number; hh: number; aus: { [motivo: string]: number }; sps: { [id: string]: ConsSp } } };
}

interface ConsFilaMes {
  persona: ConsPersona;
  dias: number; extra: number; hh: number;
  aus: { [motivo: string]: number };
  ausTotal: number;
  sps: ConsSp[];
  abierta: boolean;
}

interface ConsFilaAnio {
  persona: ConsPersona;
  meses: { hh: number; dias: number; texto: string }[];   // 12
  dias: number; extra: number; hh: number; ausTotal: number;
  sps: string[];
}

interface ConsFilaSp { id: string; nombre: string; meses: number[]; total: number; personas: number; }

/** Barra de un gráfico (horizontal o de columnas). */
interface ConsBarra { id: string; nombre: string; valor: number; pct: number; color: string; sub?: string; actual?: boolean; }

/** Segmento del gráfico de dona de ausencias. */
interface ConsDonaSeg { v: string; t: string; letra: string; n: number; pct: number; color: string; dash: string; offset: number; }

/** Colores de los gráficos (subproyectos / trabajadores). */
const PALETA_CONS = ['#075f91', '#f58941', '#2bb3a3', '#8e6bd1', '#e2615b', '#4caf7a', '#e0a43a', '#5b8def', '#d16ba5', '#6b7580'];

/** Color de cada motivo de ausencia en los gráficos (mismo tono que sus chips). */
const COLOR_MOTIVO: { [v: string]: string } = {
  LM: '#5b8def', VAC: '#4caf7a', PCG: '#2bb3a3', PSG: '#e0a43a', OTR: '#8f9aa5', FI: '#e2615b'
};

interface GrupoSubProyecto {
  id: string;              // idSubProyecto como texto (para comparar)
  idSubProyecto: any;      // valor original (el mismo que usan los documentos de asistencia)
  idProyecto: any;
  nombre: string;
  nombreProyecto: string;
}

/**
 * CORE > Control Asistencia.
 *  - Pestaña "Control de asistencia": todos los subproyectos del mes, ordenados, cada uno con su
 *    tabla (app-control-asistencia en modo embebido). Cada subproyecto se sigue guardando en su
 *    documento de 'asistenciaHH', así las Estadísticas HH de cada uno no cambian.
 *  - Pestaña "Trabajadores": agenda central de CORE (colección 'trabajadoresCore').
 */
@Component({
  selector: 'app-control-asistencia-page',
  templateUrl: './control-asistencia-page.component.html',
  styleUrls: ['./control-asistencia-page.component.css'],
  providers: [sMis_Proyectos, sUsuarioClienteProyecto]
})
export class ControlAsistenciaPageComponent implements OnInit {

  @ViewChildren(ControlAsistenciaComponent) bloques: QueryList<ControlAsistenciaComponent>;

  readonly meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto',
    'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  vista: string = 'asistencia';   // 'asistencia' | 'trabajadores' | 'consolidado'

  // ===== Consolidado (mensual / anual) =====
  readonly mesesCortos = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  readonly motivosAusencia = MOTIVOS_AUSENCIA;
  vistaConsolidado: string = 'mensual';     // 'mensual' | 'anual'
  consAnio: number = new Date().getFullYear();
  consMes: number = new Date().getMonth() + 1;
  cargandoConsolidado: boolean = false;
  errorConsolidado: boolean = false;
  busquedaConsolidado: string = '';
  private consPersonas: ConsPersona[] = [];
  private consSpsAnio: { [id: string]: ConsFilaSp } = {};
  private cargaConsolidado: number = 0;
  consMensual: ConsFilaMes[] = [];
  consAnual: ConsFilaAnio[] = [];
  consPorSp: ConsFilaSp[] = [];
  consTotMes = { personas: 0, sps: 0, dias: 0, extra: 0, hh: 0, aus: 0, faltas: 0 };
  consTotAnio = { personas: 0, sps: 0, hh: 0, dias: 0, meses: [] as number[] };
  // gráficos del mes
  consGrafSpMes: ConsBarra[] = [];
  consTopMes: ConsBarra[] = [];
  consDonaMes: ConsDonaSeg[] = [];
  consAusMesTotal: number = 0;
  consMixMes = { jornada: 0, extra: 0, pctJornada: 0, pctExtra: 0 };
  consMaxFilaMes: number = 0;
  // gráficos del año
  consBarrasMes: ConsBarra[] = [];
  consGrafSpAnio: ConsBarra[] = [];
  consTopAnio: ConsBarra[] = [];
  consDonaAnio: ConsDonaSeg[] = [];
  consAusAnioTotal: number = 0;
  consMaxCelda: number = 0;
  consResAnio = { mejorMes: '', mejorHH: 0, promedio: 0, mesesConDatos: 0, extra: 0 };

  // Permisos y subproyectos que puede ver el usuario
  soloLectura: boolean = true;
  cargandoPermisos: boolean = true;
  cargandoSubProyectos: boolean = true;
  errorCarga: boolean = false;
  subProyectos: any[] = [];
  private permitidos: { [id: string]: any } = {};
  private idUsuario: any = null;

  // Mes que se muestra
  anio: number = new Date().getFullYear();
  mes: number = new Date().getMonth() + 1;
  quincena: number = new Date().getDate() > 15 ? 2 : 1;
  anios: number[] = [];

  // Subproyectos del mes
  grupos: GrupoSubProyecto[] = [];
  cargandoGrupos: boolean = false;
  errorGrupos: boolean = false;
  private resumenes: { [id: string]: any } = {};
  /** Subproyectos donde está cada trabajador este mes (para la agenda). */
  private asignaciones: { [clave: string]: string[] } = {};
  private cargaGrupos: number = 0;
  /** Filas de cada subproyecto en el mes (para marcar en gris los días ya trabajados en otro). */
  private datosSp: { [id: string]: { nombre: string; filas: any[] } } = {};
  ocupacion: any = {};
  /** Subproyectos con trabajadores el mes anterior pero sin nadie este mes (se pueden traer). */
  delMesAnterior: { grupo: GrupoSubProyecto; cantidad: number }[] = [];

  // Agregar trabajador a un subproyecto
  textoTrabajador: string = '';
  textoSubProyecto: string = '';
  mensajeAgregar: string = '';
  errorAgregar: string = '';
  agregando: boolean = false;

  // Agenda
  agenda: TrabajadorCore[] = [];
  /** Solo los activos: son los que se pueden agregar a la asistencia. */
  agendaActiva: TrabajadorCore[] = [];
  /** Ficha completa de cada trabajador (por id de la agenda). */
  fichas: { [id: string]: FichaTrabajador } = {};
  fichaForm: FichaTrabajador = this.fichaVacia();
  fichaAbierta: boolean = false;
  filtroEstadoAgenda: string = 'activos';   // 'activos' | 'finiquitados' | 'pendientes' | 'todos'
  filasAgenda: FilaAgenda[] = [];
  // Foto y carpetas de documentos de cada trabajador (mismo documento de trabajadoresCore)
  readonly carpetasTrabajador = CARPETAS_TRABAJADOR;
  private extras: { [id: string]: { foto: DocTrabajador, documentos: { [carpeta: string]: DocTrabajador[] } } } = {};
  private readonly sinDocs: DocTrabajador[] = [];
  // Popup del trabajador
  detalleT: TrabajadorCore = null;
  detalleF: FichaTrabajador = null;
  detalleTab: string = 'datos';      // 'datos' | 'carpetas'
  carpetaSel: string = 'legales';
  subiendoDetalle: string = '';      // 'foto' | id de carpeta
  progresoDetalle: number = 0;
  errorDetalle: string = '';
  totalActivos: number = 0;
  totalFiniquitados: number = 0;
  totalPendientes: number = 0;
  readonly opcionesGenero = ['Masculino', 'Femenino', 'Otro'];
  readonly opcionesEstadoCivil = ['Soltero(a)', 'Casado(a)', 'Conviviente civil', 'Divorciado(a)', 'Viudo(a)'];
  readonly opcionesAfp = ['Capital', 'Cuprum', 'Habitat', 'Modelo', 'PlanVital', 'ProVida', 'Uno', 'No cotiza AFP'];
  readonly opcionesSalud = ['Fonasa', 'Banmédica', 'Colmena', 'Consalud', 'Cruz Blanca', 'Esencial', 'Nueva Masvida', 'Vida Tres', 'Otra isapre'];
  readonly opcionesContrato = ['Indefinido', 'Plazo fijo', 'Por obra o faena', 'Honorarios'];
  readonly causalesFiniquito = CAUSALES_FINIQUITO;
  /** Archivo de finiquito elegido en la ficha (se sube al guardar). */
  archivoFiniquito: File = null;

  cargandoAgenda: boolean = true;
  errorAgenda: boolean = false;
  busquedaAgenda: string = '';
  formulario: TrabajadorCore = this.formularioVacio();
  errorFormulario: string = '';
  guardandoFormulario: boolean = false;
  mensajeAgenda: string = '';

  constructor(
    private _sUsuariosPerfiles: sUsuariosPerfiles,
    private _sMisProyectos: sMis_Proyectos,
    private _sUsuarioClienteProyecto: sUsuarioClienteProyecto
  ) {}

  ngOnInit() {
    const actual = new Date().getFullYear();
    for (let a = actual + 1; a >= actual - 5; a--) { this.anios.push(a); }

    let usuario: any;
    try {
      usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch (error) {
      usuario = {};
    }
    if (!usuario.idUsuario) {
      this.cargandoPermisos = false;
      this.cargandoSubProyectos = false;
      this.errorCarga = true;
      return;
    }
    this.idUsuario = usuario.idUsuario;

    this._sUsuariosPerfiles.getUsuariosPerfilesbyidUsuario(Number(usuario.idUsuario)).subscribe(
      (perfiles: any[]) => {
        const lista = Array.isArray(perfiles) ? perfiles : [];
        this.soloLectura = lista.some(p => p.idPerfil == 5 || p.idPerfil === 'Clientes');
        this.cargandoPermisos = false;
        this.cargarSubProyectos(usuario.idUsuario, lista);
        if (!this.soloLectura) { this.cargarAgenda(); } else { this.cargandoAgenda = false; }
      },
      error => {
        console.error('Error al verificar permisos de Control Asistencia:', error);
        this.soloLectura = true;
        this.cargandoPermisos = false;
        this.cargandoSubProyectos = false;
        this.errorCarga = true;
      }
    );
  }

  // ===================== Subproyectos permitidos =====================

  private cargarSubProyectos(idUsuario: number, perfiles: any[]) {
    const esCliente = this.soloLectura;
    const esAdministrador = perfiles.some(p => p.idPerfil == 1 || p.idPerfil == 9);

    const fallar = (error: any) => {
      console.error('Error al cargar subproyectos para Control Asistencia:', error);
      this.errorCarga = true;
      this.cargandoSubProyectos = false;
    };

    if (esCliente) {
      this._sUsuarioClienteProyecto.getUsuarioClienteProyectobyidUsuarioCliente(Number(idUsuario)).subscribe(
        (asignaciones: any[]) => {
          const proyectos = Array.isArray(asignaciones) ? asignaciones : [];
          if (!proyectos.length) { this.finalizarCarga([]); return; }
          Promise.all(proyectos.map(a => this._sMisProyectos.getMis_ProyectosbyidProyecto(a.idProyecto).toPromise()))
            .then(res => this.finalizarCarga([].concat.apply([], res || [])))
            .catch(fallar);
        },
        fallar
      );
      return;
    }

    const solicitud = esAdministrador
      ? this._sMisProyectos.getMis_Proyectos()
      : this._sMisProyectos.getMis_ProyectosbyidUsuarioCoordinador(Number(idUsuario));
    solicitud.subscribe((lista: any[]) => this.finalizarCarga(Array.isArray(lista) ? lista : []), fallar);
  }

  private finalizarCarga(lista: any[]) {
    const unicos: { [id: string]: any } = {};
    lista.forEach(sp => {
      if (sp && sp.idSubProyecto !== null && sp.idSubProyecto !== undefined) { unicos[String(sp.idSubProyecto)] = sp; }
    });
    this.permitidos = unicos;
    this.subProyectos = Object.keys(unicos).map(id => unicos[id]).sort((a, b) =>
      (a.nombreSubProyecto || '').localeCompare(b.nombreSubProyecto || '', 'es', { sensitivity: 'base' }));
    this.cargandoSubProyectos = false;
    this.cargarGrupos();
  }

  etiquetaSubProyecto(sp: any): string {
    return [sp.nombreSubProyecto, sp.nombreProyecto].filter(x => !!x).join(' — ');
  }

  private grupoDe(sp: any): GrupoSubProyecto {
    return {
      id: String(sp.idSubProyecto),
      idSubProyecto: sp.idSubProyecto,
      idProyecto: sp.idProyecto === undefined ? null : sp.idProyecto,
      nombre: sp.nombreSubProyecto || ('Subproyecto ' + sp.idSubProyecto),
      nombreProyecto: sp.nombreProyecto || ''
    };
  }

  // ===================== Mes / grupos =====================

  get nombreMes(): string {
    return this.meses[this.mes - 1];
  }

  cambiarPeriodo() {
    this.mes = Number(this.mes);
    this.anio = Number(this.anio);
    this.cargarGrupos();
  }

  // ===================== Consolidado mensual / anual =====================

  abrirConsolidado() {
    this.vista = 'consolidado';
    this.consAnio = Number(this.anio);
    this.consMes = Number(this.mes);
    this.cargarConsolidado();
  }

  cambiarAnioConsolidado() {
    this.consAnio = Number(this.consAnio);
    this.cargarConsolidado();
  }

  cambiarMesConsolidado() {
    this.consMes = Number(this.consMes);
    this.armarMensual();
  }

  /** Desde el anual: clic en un mes abre el consolidado de ese mes. */
  verMesConsolidado(mes: number) {
    this.consMes = mes;
    this.vistaConsolidado = 'mensual';
    this.armarMensual();
  }

  /** Lee todos los meses del año (una consulta) y arma las tres vistas. */
  cargarConsolidado() {
    const carga = ++this.cargaConsolidado;
    const anio = Number(this.consAnio);
    this.cargandoConsolidado = true;
    this.errorConsolidado = false;
    firestoreDB.collection(COLECCION_ASISTENCIA).where('anio', '==', anio).get()
      .then((snap: any) => {
        if (carga !== this.cargaConsolidado) { return; }
        const docs: any[] = [];
        snap.forEach((doc: any) => docs.push(doc.data() || {}));
        this.procesarConsolidado(docs);
        this.cargandoConsolidado = false;
      })
      .catch((error: any) => {
        if (carga !== this.cargaConsolidado) { return; }
        console.error('Error al cargar el consolidado de asistencia:', error);
        this.errorConsolidado = true;
        this.cargandoConsolidado = false;
      });
  }

  private procesarConsolidado(docs: any[]) {
    const porClave: { [clave: string]: ConsPersona } = {};
    const personas: ConsPersona[] = [];
    const sps: { [id: string]: ConsFilaSp } = {};
    const personasSp: { [id: string]: { [p: number]: boolean } } = {};

    docs.forEach(d => {
      const id = String(d.idSubProyecto);
      const sp = this.permitidos[id];
      if (!sp) { return; }
      const mes = Number(d.mes);
      if (!mes || mes < 1 || mes > 12) { return; }
      const nombreSp = sp.nombreSubProyecto || d.nombreSubProyecto || ('Subproyecto ' + id);
      const filaSp = sps[id] || (sps[id] = { id: id, nombre: nombreSp, meses: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total: 0, personas: 0 });
      const mapa = d.trabajadores || {};

      Object.keys(mapa).forEach(k => {
        const t = mapa[k];
        if (!t || t.eliminado) { return; }
        // suma del mes de esta persona en este subproyecto
        let dias = 0, extra = 0;
        const aus: { [m: string]: number } = {};
        const diasMapa = t.dias || {};
        Object.keys(diasMapa).forEach(dia => {
          const v = diasMapa[dia] || {};
          dias += Number(v.jornada) || 0;
          extra += Number(v.extra) || 0;
          const m = v.ausencia && motivoAusencia(v.ausencia.motivo);
          if (m) { aus[m.v] = (aus[m.v] || 0) + 1; }
        });
        const hh = this.redondear(dias * HORAS_JORNADA + extra);
        if (!hh && !Object.keys(aus).length) { return; }   // inscrito pero sin nada marcado

        // misma persona aunque esté en varios subproyectos
        const claves = clavesTrabajador(t);
        let persona: ConsPersona = null;
        claves.forEach(c => { if (!persona && porClave[c]) { persona = porClave[c]; } });
        if (!persona) {
          persona = { nombre: ((t.nombre || '') + ' ' + (t.apellido || '')).trim() || 'Sin nombre', rut: t.rut || '', cargo: t.cargo || '', porMes: {} };
          personas.push(persona);
        }
        if (!persona.rut && t.rut) { persona.rut = t.rut; }
        if (!persona.cargo && t.cargo) { persona.cargo = t.cargo; }
        claves.forEach(c => porClave[c] = persona);

        const pm = persona.porMes[mes] || (persona.porMes[mes] = { dias: 0, extra: 0, hh: 0, aus: {}, sps: {} });
        pm.dias += dias; pm.extra += extra; pm.hh = this.redondear(pm.hh + hh);
        Object.keys(aus).forEach(m => pm.aus[m] = (pm.aus[m] || 0) + aus[m]);
        const s = pm.sps[id] || (pm.sps[id] = { id: id, nombre: nombreSp, dias: 0, extra: 0, hh: 0 });
        s.dias += dias; s.extra += extra; s.hh = this.redondear(s.hh + hh);

        filaSp.meses[mes - 1] = this.redondear(filaSp.meses[mes - 1] + hh);
        filaSp.total = this.redondear(filaSp.total + hh);
        const ip = personas.indexOf(persona);
        (personasSp[id] || (personasSp[id] = {}))[ip] = true;
      });
    });

    Object.keys(sps).forEach(id => sps[id].personas = Object.keys(personasSp[id] || {}).length);
    this.consPersonas = personas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    this.consSpsAnio = sps;
    this.armarMensual();
    this.armarAnual();
  }

  private coincideBusqueda(p: ConsPersona, sps: string[]): boolean {
    const terminos = normalizarTexto(this.busquedaConsolidado).split(/\s+/).filter(x => !!x);
    if (!terminos.length) { return true; }
    const texto = normalizarTexto([p.nombre, p.rut, p.cargo].concat(sps).join(' '));
    return terminos.every(x => texto.indexOf(x) >= 0);
  }

  filtrarConsolidado() {
    this.armarMensual();
    this.armarAnual();
  }

  armarMensual() {
    const mes = Number(this.consMes);
    const filas: ConsFilaMes[] = [];
    const tot = { personas: 0, sps: 0, dias: 0, extra: 0, hh: 0, aus: 0, faltas: 0 };
    const spsMes: { [id: string]: boolean } = {};
    this.consPersonas.forEach(p => {
      const pm = p.porMes[mes];
      if (!pm) { return; }
      const lista = Object.keys(pm.sps).map(k => pm.sps[k]).sort((a, b) => b.hh - a.hh);
      if (!this.coincideBusqueda(p, lista.map(x => x.nombre))) { return; }
      const ausTotal = Object.keys(pm.aus).reduce((s, k) => s + pm.aus[k], 0);
      filas.push({ persona: p, dias: this.redondear(pm.dias), extra: this.redondear(pm.extra), hh: pm.hh, aus: pm.aus, ausTotal: ausTotal, sps: lista, abierta: lista.length > 1 });
      tot.personas++; tot.dias += pm.dias; tot.extra += pm.extra; tot.hh += pm.hh; tot.aus += ausTotal;
      tot.faltas += pm.aus['FI'] || 0;
      lista.forEach(x => spsMes[x.id] = true);
    });
    tot.sps = Object.keys(spsMes).length;
    tot.dias = this.redondear(tot.dias); tot.extra = this.redondear(tot.extra); tot.hh = this.redondear(tot.hh);
    this.consMensual = filas;
    this.consTotMes = tot;

    // ---- gráficos del mes ----
    const porSp: { [id: string]: { nombre: string; hh: number; personas: number } } = {};
    const ausMes: { [m: string]: number } = {};
    filas.forEach(f => {
      f.sps.forEach(sp => {
        const x = porSp[sp.id] || (porSp[sp.id] = { nombre: sp.nombre, hh: 0, personas: 0 });
        x.hh = this.redondear(x.hh + sp.hh);
        x.personas++;
      });
      Object.keys(f.aus || {}).forEach(m => ausMes[m] = (ausMes[m] || 0) + f.aus[m]);
    });
    const listaSp = Object.keys(porSp).map(id => ({ id: id, nombre: porSp[id].nombre, valor: porSp[id].hh,
      sub: porSp[id].personas + (porSp[id].personas === 1 ? ' persona' : ' personas') }));
    this.consGrafSpMes = this.armarBarras(listaSp, tot.hh, 8);
    this.consTopMes = this.armarBarras(filas.map((f, i) => ({ id: String(i), nombre: f.persona.nombre, valor: f.hh,
      sub: this.formatear(f.dias) + ' días' })), 0, 6);
    this.consMaxFilaMes = filas.reduce((m, f) => Math.max(m, f.hh), 0);
    this.consDonaMes = this.armarDona(ausMes);
    this.consAusMesTotal = tot.aus;
    const hhJornada = this.redondear(tot.dias * HORAS_JORNADA);
    const totMix = hhJornada + tot.extra;
    this.consMixMes = {
      jornada: hhJornada, extra: tot.extra,
      pctJornada: totMix ? Math.round(hhJornada / totMix * 100) : 0,
      pctExtra: totMix ? 100 - Math.round(hhJornada / totMix * 100) : 0
    };
  }

  /** Barras ordenadas de mayor a menor; el % es contra el total (si se da) o contra el mayor. */
  private armarBarras(items: { id: string; nombre: string; valor: number; sub?: string }[], total: number, max: number): ConsBarra[] {
    const lista = items.filter(x => x.valor > 0).sort((a, b) => b.valor - a.valor);
    const mayor = lista.length ? lista[0].valor : 0;
    return lista.slice(0, max).map((x, i) => ({
      id: x.id,
      nombre: x.nombre,
      valor: x.valor,
      sub: x.sub,
      color: PALETA_CONS[i % PALETA_CONS.length],
      pct: total ? Math.round(x.valor / total * 1000) / 10 : (mayor ? Math.round(x.valor / mayor * 100) : 0)
    }));
  }

  /** Dona de ausencias por motivo (SVG con circunferencia 100). */
  private armarDona(aus: { [m: string]: number }): ConsDonaSeg[] {
    const total = Object.keys(aus).reduce((s, k) => s + (aus[k] || 0), 0);
    if (!total) { return []; }
    let acumulado = 0;
    return MOTIVOS_AUSENCIA.filter(m => aus[m.v]).map(m => {
      const pct = aus[m.v] / total * 100;
      const seg: ConsDonaSeg = {
        v: m.v, t: m.t, letra: m.letra, n: aus[m.v], pct: Math.round(pct),
        color: COLOR_MOTIVO[m.v] || '#8f9aa5',
        dash: pct.toFixed(2) + ' ' + (100 - pct).toFixed(2),
        offset: 25 - acumulado
      };
      acumulado += pct;
      return seg;
    });
  }

  /** Ancho de la barrita de HH en la tabla del mes. */
  anchoBarraMes(hh: number): number {
    return this.consMaxFilaMes ? Math.max(4, Math.round(hh / this.consMaxFilaMes * 100)) : 0;
  }

  /** Mapa de calor de la tabla anual. */
  fondoCalor(hh: number): string {
    if (!hh || !this.consMaxCelda) { return null; }
    const r = hh / this.consMaxCelda;
    return 'rgba(7, 95, 145, ' + (0.08 + r * 0.72).toFixed(2) + ')';
  }

  textoCalor(hh: number): string {
    return hh && this.consMaxCelda && hh / this.consMaxCelda > 0.55 ? '#fff' : null;
  }

  armarAnual() {
    const filas: ConsFilaAnio[] = [];
    const totMeses = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let hhTot = 0, diasTot = 0;
    this.consPersonas.forEach(p => {
      const spsNombres: { [n: string]: boolean } = {};
      const meses = this.mesesCortos.map((x, i) => {
        const pm = p.porMes[i + 1];
        if (!pm) { return { hh: 0, dias: 0, texto: '' }; }
        const lista = Object.keys(pm.sps).map(k => pm.sps[k]);
        lista.forEach(s => spsNombres[s.nombre] = true);
        return {
          hh: pm.hh,
          dias: this.redondear(pm.dias),
          texto: lista.map(s => s.nombre + ': ' + this.formatear(s.hh) + ' HH (' + this.formatear(s.dias) + ' días)').join('\n')
        };
      });
      const sps = Object.keys(spsNombres).sort();
      if (!this.coincideBusqueda(p, sps)) { return; }
      let hh = 0, dias = 0, extra = 0, ausTotal = 0;
      Object.keys(p.porMes).forEach(m => {
        const pm = p.porMes[Number(m)];
        hh += pm.hh; dias += pm.dias; extra += pm.extra;
        ausTotal += Object.keys(pm.aus).reduce((s, k) => s + pm.aus[k], 0);
      });
      meses.forEach((m, i) => totMeses[i] = this.redondear(totMeses[i] + m.hh));
      hhTot += hh; diasTot += dias;
      filas.push({ persona: p, meses: meses, dias: this.redondear(dias), extra: this.redondear(extra), hh: this.redondear(hh), ausTotal: ausTotal, sps: sps });
    });
    this.consAnual = filas;
    this.consPorSp = Object.keys(this.consSpsAnio).map(k => this.consSpsAnio[k]).sort((a, b) => b.total - a.total);
    this.consTotAnio = { personas: filas.length, sps: this.consPorSp.length, hh: this.redondear(hhTot), dias: this.redondear(diasTot), meses: totMeses };

    // ---- gráficos del año ----
    const mayorMes = Math.max.apply(null, totMeses.concat([0]));
    this.consBarrasMes = totMeses.map((v, i) => ({
      id: String(i + 1), nombre: this.mesesCortos[i], valor: v,
      pct: mayorMes && v ? Math.max(3, Math.round(v / mayorMes * 100)) : 0,
      color: '#075f91', actual: this.esMesActualCons(i + 1)
    }));
    const conDatos = totMeses.filter(v => v > 0);
    const iMejor = mayorMes ? totMeses.indexOf(mayorMes) : -1;
    let extraAnio = 0;
    const ausAnio: { [m: string]: number } = {};
    let maxCelda = 0;
    filas.forEach(f => {
      extraAnio += f.extra;
      f.meses.forEach(m => { if (m.hh > maxCelda) { maxCelda = m.hh; } });
      Object.keys(f.persona.porMes).forEach(k => {
        const a = f.persona.porMes[Number(k)].aus || {};
        Object.keys(a).forEach(m => ausAnio[m] = (ausAnio[m] || 0) + a[m]);
      });
    });
    this.consMaxCelda = maxCelda;
    this.consResAnio = {
      mejorMes: iMejor >= 0 ? this.meses[iMejor] : '—',
      mejorHH: mayorMes,
      promedio: conDatos.length ? this.redondear(conDatos.reduce((a, b) => a + b, 0) / conDatos.length) : 0,
      mesesConDatos: conDatos.length,
      extra: this.redondear(extraAnio)
    };
    this.consGrafSpAnio = this.armarBarras(this.consPorSp.map(sp => ({ id: sp.id, nombre: sp.nombre, valor: sp.total,
      sub: sp.personas + (sp.personas === 1 ? ' persona' : ' personas') })), this.consTotAnio.hh, 8);
    this.consTopAnio = this.armarBarras(filas.map((f, i) => ({ id: String(i), nombre: f.persona.nombre, valor: f.hh,
      sub: this.formatear(f.dias) + ' días' })), 0, 6);
    this.consDonaAnio = this.armarDona(ausAnio);
    this.consAusAnioTotal = Object.keys(ausAnio).reduce((s, k) => s + ausAnio[k], 0);
  }

  textoAusenciasCons(aus: { [m: string]: number }): string {
    return MOTIVOS_AUSENCIA.filter(m => aus && aus[m.v]).map(m => m.t + ': ' + aus[m.v]).join(' · ');
  }

  esMesActualCons(mes: number): boolean {
    const hoy = new Date();
    return Number(this.consAnio) === hoy.getFullYear() && mes === hoy.getMonth() + 1;
  }

  private redondear(v: number): number {
    return Math.round((Number(v) || 0) * 100) / 100;
  }

  seleccionarQuincena(q: number) {
    this.quincena = q;
  }

  /**
   * Subproyectos que se muestran: solo los que tienen trabajadores este mes (y que el usuario puede ver).
   * Los que tenían trabajadores el mes anterior quedan en "delMesAnterior" para poder traerlos.
   */
  cargarGrupos() {
    const carga = ++this.cargaGrupos;
    const anio = this.anio;
    const mes = this.mes;
    const anioAnterior = mes === 1 ? anio - 1 : anio;
    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const aniosConsulta = anioAnterior === anio ? [anio] : [anio, anioAnterior];

    this.cargandoGrupos = true;
    this.errorGrupos = false;
    this.mensajeAgregar = '';
    this.errorAgregar = '';

    Promise.all(aniosConsulta.map(a => firestoreDB.collection(COLECCION_ASISTENCIA).where('anio', '==', a).get()))
      .then((snaps: any[]) => {
        if (carga !== this.cargaGrupos) { return; }
        const ids: { [id: string]: boolean } = {};
        const anteriores: { [id: string]: number } = {};
        const asignaciones: { [clave: string]: string[] } = {};
        const datosSp: { [id: string]: { nombre: string; filas: any[] } } = {};

        snaps.forEach(snap => snap.forEach((doc: any) => {
          const d = doc.data() || {};
          const id = String(d.idSubProyecto);
          const sp = this.permitidos[id];
          if (!sp) { return; }
          const a = Number(d.anio);
          const m = Number(d.mes);
          const mapa = d.trabajadores || {};
          const activos = Object.keys(mapa).filter(k => mapa[k] && !mapa[k].eliminado).map(k => mapa[k]);

          if (a === anio && m === mes) {
            if (!activos.length) { return; }   // sin trabajadores: no se muestra
            ids[id] = true;
            const nombre = sp.nombreSubProyecto || id;
            datosSp[id] = { nombre: nombre, filas: activos };
            activos.forEach(t => this.clavesTrabajador(t).forEach(c => {
              const lista = asignaciones[c] || (asignaciones[c] = []);
              if (lista.indexOf(nombre) < 0) { lista.push(nombre); }
            }));
          } else if (a === anioAnterior && m === mesAnterior && activos.length) {
            anteriores[id] = activos.length;
          }
        }));

        this.asignaciones = asignaciones;
        this.recalcularAgenda();
        this.resumenes = {};
        this.datosSp = datosSp;
        this.reconstruirOcupacion();
        this.grupos = Object.keys(ids).map(id => this.grupoDe(this.permitidos[id]))
          .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es', { sensitivity: 'base' }));
        this.delMesAnterior = Object.keys(anteriores).filter(id => !ids[id])
          .map(id => ({ grupo: this.grupoDe(this.permitidos[id]), cantidad: anteriores[id] }))
          .sort((x, y) => x.grupo.nombre.localeCompare(y.grupo.nombre, 'es', { sensitivity: 'base' }));
        this.cargandoGrupos = false;
      })
      .catch((error: any) => {
        if (carga !== this.cargaGrupos) { return; }
        console.error('Error al cargar los subproyectos del mes:', error);
        this.errorGrupos = true;
        this.cargandoGrupos = false;
      });
  }

  private clavesTrabajador(t: any): string[] {
    return clavesTrabajador(t);
  }

  actualizarResumen(evento: any) {
    if (!evento || evento.idSubProyecto === undefined) { return; }
    const id = String(evento.idSubProyecto);
    const antes = this.resumenes[id];

    // Se eliminó al último trabajador: el subproyecto sale de la lista al tiro
    if (antes && antes.trabajadores > 0 && !evento.trabajadores) {
      delete this.resumenes[id];
      delete this.datosSp[id];
      this.grupos = this.grupos.filter(g => g.id !== id);
      this.reconstruirOcupacion();
      return;
    }

    this.resumenes[id] = evento;
    if (evento.filas) {
      const g = this.grupos.filter(x => x.id === id)[0];
      this.datosSp[id] = { nombre: g ? g.nombre : id, filas: evento.filas };
      this.reconstruirOcupacion();
    }
  }

  /**
   * ocupacion[clave][dia][idSubProyecto] = lo que la persona tiene ese día en ese subproyecto.
   * Cada tabla la usa para pintar en gris los días que el trabajador ya tiene en otro subproyecto.
   */
  private reconstruirOcupacion() {
    const oc: any = {};
    Object.keys(this.datosSp).forEach(id => {
      const d = this.datosSp[id];
      (d.filas || []).forEach(t => {
        const dias = t.dias || {};
        const claves = clavesTrabajador(t);
        Object.keys(dias).forEach(dia => {
          const v = dias[dia] || {};
          const jornada = Number(v.jornada) || 0;
          const extra = Number(v.extra) || 0;
          const capacitacion = Number(v.capacitacion) || 0;
          if (!jornada && !extra && !capacitacion) { return; }
          claves.forEach(c => {
            const porDia = oc[c] || (oc[c] = {});
            const porSp = porDia[dia] || (porDia[dia] = {});
            porSp[id] = { nombre: d.nombre, jornada: jornada, extra: extra, capacitacion: capacitacion };
          });
        });
      });
    });
    this.ocupacion = oc;
  }

  get totalHH(): number {
    let t = 0;
    this.grupos.forEach(g => { const r = this.resumenes[g.id]; if (r) { t += Number(r.resumen.hh) || 0; } });
    return Math.round(t * 100) / 100;
  }

  /** Subproyectos con días hábiles pasados sin marcar. */
  get subProyectosPendientes(): number {
    return this.grupos.filter(g => { const r = this.resumenes[g.id]; return r && r.diasPendientes > 0; }).length;
  }

  get totalTrabajadoresMes(): number {
    let t = 0;
    this.grupos.forEach(g => { const r = this.resumenes[g.id]; if (r) { t += Number(r.trabajadores) || 0; } });
    return t;
  }

  formatear(valor: number): string {
    const partes = String(Math.round((valor || 0) * 100) / 100).split('.');
    return partes[0].replace(/\B(?=(\d{3})+$)/g, '.') + (partes[1] ? ',' + partes[1] : '');
  }

  trackGrupo(i: number, g: GrupoSubProyecto) { return g.id; }

  get nombreMesAnterior(): string {
    return this.meses[this.mes === 1 ? 11 : this.mes - 2];
  }

  /** Abre el subproyecto del mes anterior: su tabla ofrece "Copiar a {mes}". */
  traerDelMesAnterior(item: { grupo: GrupoSubProyecto; cantidad: number }) {
    this.delMesAnterior = this.delMesAnterior.filter(x => x !== item);
    if (!this.grupos.some(g => g.id === item.grupo.id)) {
      this.grupos = this.grupos.concat(item.grupo)
        .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es', { sensitivity: 'base' }));
    }
    setTimeout(() => {
      const el = document.getElementById('core-grupo-' + item.grupo.id);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }, 50);
  }

  // ===================== Agregar trabajador a un subproyecto =====================

  etiquetaAgenda(t: TrabajadorCore): string {
    return etiquetaTrabajador(t);
  }

  agregarTrabajador() {
    if (this.soloLectura || this.agregando) { return; }
    this.mensajeAgregar = '';
    this.errorAgregar = '';

    const texto = (this.textoTrabajador || '').trim();
    const t = this.agendaActiva.filter(x => etiquetaTrabajador(x) === texto)[0]
      || buscarEnAgenda(this.agendaActiva, { rut: texto })
      || this.agendaActiva.filter(x => normalizarTexto(x.nombre + ' ' + x.apellido) === normalizarTexto(texto))[0];
    const finiquitado = !t && texto && this.agenda.some(x => this.esFiniquitado(x) &&
      (etiquetaTrabajador(x) === texto || normalizarTexto(x.nombre + ' ' + x.apellido) === normalizarTexto(texto)));
    if (finiquitado) {
      this.errorAgregar = 'Ese trabajador está finiquitado. Reactívalo en la pestaña Trabajadores si volvió.';
      return;
    }
    if (!t) {
      this.errorAgregar = texto
        ? 'No está en la agenda. Créalo en la pestaña Trabajadores o escríbelo directo en la fila "Agregar..." del subproyecto.'
        : 'Elige un trabajador de la agenda.';
      return;
    }

    const textoSp = (this.textoSubProyecto || '').trim();
    const sp = this.subProyectos.filter(x => this.etiquetaSubProyecto(x) === textoSp)[0]
      || this.subProyectos.filter(x => normalizarTexto(x.nombreSubProyecto) === normalizarTexto(textoSp))[0];
    if (!sp) {
      this.errorAgregar = 'Elige el subproyecto (lugar de trabajo) de la lista.';
      return;
    }

    const id = String(sp.idSubProyecto);
    this.delMesAnterior = this.delMesAnterior.filter(x => x.grupo.id !== id);
    if (!this.grupos.some(g => g.id === id)) {
      this.grupos = this.grupos.concat(this.grupoDe(sp))
        .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es', { sensitivity: 'base' }));
    }

    this.agregando = true;
    this.esperarBloque(id).then(bloque => {
      this.agregando = false;
      if (!bloque) { this.errorAgregar = 'No se pudo abrir el subproyecto. Intenta de nuevo.'; return; }
      if (bloque.agregarDesdeAgenda(t)) {
        this.mensajeAgregar = t.nombre + ' ' + t.apellido + ' quedó en ' + (sp.nombreSubProyecto || 'el subproyecto') + '.';
        this.textoTrabajador = '';
        const nombre = sp.nombreSubProyecto || id;
        this.clavesTrabajador(t).forEach(c => {
          const lista = this.asignaciones[c] || (this.asignaciones[c] = []);
          if (lista.indexOf(nombre) < 0) { lista.push(nombre); }
        });
        setTimeout(() => {
          const el = document.getElementById('core-grupo-' + id);
          if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        }, 50);
      } else {
        this.errorAgregar = bloque.errorFila || 'No se pudo agregar.';
        bloque.errorFila = '';
      }
    });
  }

  /** Espera a que la tabla del subproyecto exista y termine de cargar. */
  private esperarBloque(id: string): Promise<ControlAsistenciaComponent> {
    return new Promise(resolve => {
      let intentos = 0;
      const revisar = () => {
        const bloque = this.bloques ? this.bloques.find(b => String(b.idSubProyecto) === id) : null;
        if (bloque && !bloque.cargando) { resolve(bloque.errorCarga ? null : bloque); return; }
        if (++intentos > 100) { resolve(null); return; }
        setTimeout(revisar, 100);
      };
      setTimeout(revisar, 0);
    });
  }

  /** Trabajador escrito a mano en una tabla: si no estaba en la agenda, se agrega. */
  agregarAAgendaDesdeAsistencia(tr: any) {
    if (this.soloLectura || !tr) { return; }
    if (buscarEnAgenda(this.agenda, tr)) { return; }
    if (tr.rut && !rutValido(tr.rut)) { return; } // con RUT malo no se guarda en la agenda
    guardarTrabajador({
      id: '', nombre: tr.nombre, apellido: tr.apellido, rut: tr.rut || '', rutLimpio: '', cargo: tr.cargo || ''
    }, this.idUsuario).then(nuevo => {
      if (!this.agenda.some(x => x.id === nuevo.id)) {
        this.agenda = ordenarTrabajadores(this.agenda.concat(nuevo));
        this.refrescarActivos();
      }
    }).catch(error => console.error('No se pudo agregar a la agenda:', error));
  }

  // ===================== Agenda de trabajadores =====================

  cargarAgenda() {
    this.cargandoAgenda = true;
    this.errorAgenda = false;
    Promise.all([listarTrabajadores(), this.leerFichas()]).then(res => {
      this.agenda = res[0];
      this.fichas = res[1];
      this.refrescarActivos();
      this.cargandoAgenda = false;
    }).catch(error => {
      console.error('Error al cargar la agenda de trabajadores:', error);
      this.errorAgenda = true;
      this.cargandoAgenda = false;
    });
  }

  cambiarFiltroAgenda(filtro: string) {
    this.filtroEstadoAgenda = filtro;
    this.recalcularAgenda();
  }

  /** Arma las filas de la tabla y los contadores (se llama cuando cambian datos, filtro o búsqueda). */
  recalcularAgenda() {
    const terminos = normalizarTexto(this.busquedaAgenda || '').split(/\s+/).filter(x => !!x);
    const filas: FilaAgenda[] = [];
    let activos = 0, finiquitados = 0, pendientes = 0;

    this.agenda.forEach(t => {
      let fila: FilaAgenda;
      try {
        const f = this.fichaDe(t);
        const finiquitado = f.estado === 'finiquitado';
        const vencido = this.contratoVencido(t);
        const pendiente = this.pendienteFiniquito(t);
        fila = {
          t: t, f: f, finiquitado: finiquitado, vencido: vencido, pendiente: pendiente,
          diasVence: this.diasParaVencer(t),
          inicio: this.fechaCorta(f.fechaInicio), termino: this.fechaCorta(f.fechaTermino), finiquito: this.fechaCorta(f.fechaFiniquito),
          sps: this.subProyectosDe(t),
          foto: this.fotoDe(t), iniciales: this.inicialesDe(t)
        };
      } catch (error) {
        console.error('Ficha con datos raros, se muestra igual:', t, error);
        fila = { t: t, f: this.fichaVacia(), finiquitado: false, vencido: false, pendiente: false, diasVence: null,
          inicio: '', termino: '', finiquito: '', sps: [], foto: '', iniciales: this.inicialesDe(t) };
      }

      if (fila.finiquitado) { finiquitados++; } else { activos++; }
      if (fila.pendiente) { pendientes++; }

      if (this.filtroEstadoAgenda === 'activos' && fila.finiquitado) { return; }
      if (this.filtroEstadoAgenda === 'finiquitados' && !fila.finiquitado) { return; }
      if (this.filtroEstadoAgenda === 'pendientes' && !fila.pendiente) { return; }
      if (terminos.length) {
        const texto = normalizarTexto([t.nombre, t.apellido, t.rut, t.rutLimpio, t.cargo, fila.f.tipoContrato, fila.f.comuna].join(' '));
        if (!terminos.every(x => texto.indexOf(x) >= 0)) { return; }
      }
      filas.push(fila);
    });

    this.filasAgenda = filas;
    this.totalActivos = activos;
    this.totalFiniquitados = finiquitados;
    this.totalPendientes = pendientes;
  }

  trackFila(i: number, fila: FilaAgenda) { return fila.t.id; }

  // ===================== Ficha del trabajador =====================

  private leerFichas(): Promise<{ [id: string]: FichaTrabajador }> {
    return firestoreDB.collection(COLECCION_TRABAJADORES).get().then((snap: any) => {
      const res: { [id: string]: FichaTrabajador } = {};
      snap.forEach((doc: any) => {
        const d = doc.data() || {};
        const f: any = this.fichaVacia();
        CAMPOS_FICHA.forEach(c => {
          const v = d[c];
          if (v === undefined || v === null) { return; }
          const base = f[c];
          if (typeof base === 'string') {
            f[c] = v && typeof v.toDate === 'function' ? this.fechaIso(v.toDate()) : String(v);
          } else if (typeof base === 'boolean') {
            f[c] = !!v;
          } else if (c === 'renta' || c === 'colacion' || c === 'movilizacion') {
            f[c] = isNaN(Number(v)) ? null : Number(v);
          } else if (c === 'adjuntoFiniquito') {
            f[c] = typeof v === 'object' && v.url ? v : null;
          } else {
            f[c] = v;
          }
        });
        if (f.estado !== 'finiquitado') { f.estado = 'activo'; }
        res[doc.id] = f;
        this.extras[doc.id] = {
          foto: d.foto && d.foto.url ? d.foto : null,
          documentos: d.documentos && typeof d.documentos === 'object' ? d.documentos : {}
        };
      });
      return res;
    }).catch((error: any) => {
      // Si no se pueden leer las fichas, la agenda igual se muestra (todos como activos)
      console.error('No se pudieron leer las fichas de los trabajadores:', error);
      return {};
    });
  }

  fichaDe(t: TrabajadorCore): FichaTrabajador {
    return (t && this.fichas[t.id]) || this.fichaVacia();
  }

  esFiniquitado(t: TrabajadorCore): boolean {
    return this.fichaDe(t).estado === 'finiquitado';
  }

  private refrescarActivos() {
    this.agendaActiva = this.agenda.filter(t => !this.esFiniquitado(t));
    this.recalcularAgenda();
  }

  private fichaVacia(): FichaTrabajador {
    return {
      paterno: '', materno: '', fechaNacimiento: '', genero: '', nacionalidad: 'Chilena', estadoCivil: '',
      direccion: '', comuna: '', telefono: '', celular: '', email: '',
      afp: '', salud: '', jubilado: false,
      tipoContrato: '', fechaInicio: '', fechaTermino: '', renta: null, colacion: null, movilizacion: null,
      estado: 'activo', fechaFiniquito: '',
      motivoFiniquito: '', detalleFiniquito: '', adjuntoFiniquito: null, finiquitoAutomatico: false
    };
  }

  /** Indefinido y honorarios pueden quedar sin fecha de término. */
  terminoOpcional(tipo: string): boolean {
    return tipo === 'Indefinido' || tipo === 'Honorarios';
  }

  /** Edad en años a partir de la fecha de nacimiento (yyyy-mm-dd). */
  edad(fecha: string): number {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) { return null; }
    const p = fecha.split('-').map(Number);
    const hoy = new Date();
    let anios = hoy.getFullYear() - p[0];
    if (hoy.getMonth() + 1 < p[1] || (hoy.getMonth() + 1 === p[1] && hoy.getDate() < p[2])) { anios--; }
    return anios >= 0 && anios < 120 ? anios : null;
  }

  /** dd-mm-yyyy para mostrar. */
  fechaCorta(fecha: string): string {
    const p = String(fecha || '').split('-');
    return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : '';
  }

  formatearPesos(valor: number): string {
    if (valor === null || valor === undefined || (valor as any) === '') { return '—'; }
    return '$' + String(Math.round(Number(valor) || 0)).replace(/\B(?=(\d{3})+$)/g, '.');
  }

  private hoyTexto(): string {
    return this.fechaIso(new Date());
  }

  private fechaIso(d: Date): string {
    if (!d || isNaN(d.getTime())) { return ''; }
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  nuevoTrabajador() {
    this.formulario = this.formularioVacio();
    this.fichaForm = this.fichaVacia();
    this.archivoFiniquito = null;
    this.errorFormulario = '';
    this.mensajeAgenda = '';
    this.fichaAbierta = true;
    this.enfocarFicha();
  }

  private enfocarFicha(idCampo: string = 'core-form-rut') {
    setTimeout(() => {
      const el = document.getElementById('core-ficha');
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      const campo = document.getElementById(idCampo);
      if (campo) { campo.focus(); }
    }, 80);
  }

  /** Guarda solo la ficha (merge), sin tocar lo que guarda la agenda. */
  private guardarFicha(id: string, ficha: FichaTrabajador): Promise<void> {
    const datos: any = { fechaActualizacionFicha: new Date().toISOString(), idUsuarioFicha: this.idUsuario };
    CAMPOS_FICHA.forEach(c => {
      const v = (ficha as any)[c];
      datos[c] = v === undefined ? null : v;
    });
    ['renta', 'colacion', 'movilizacion'].forEach(c => {
      const v = datos[c];
      datos[c] = v === null || v === '' || isNaN(Number(v)) ? null : Math.round(Number(v));
    });
    datos.jubilado = !!datos.jubilado;
    // por si la agenda reescribe el documento completo: se vuelven a dejar la foto y las carpetas
    const extra = this.extras[id];
    if (extra && extra.foto) { datos.foto = extra.foto; }
    if (extra && extra.documentos && Object.keys(extra.documentos).length) { datos.documentos = extra.documentos; }
    return firestoreDB.collection(COLECCION_TRABAJADORES).doc(id).set(datos, { merge: true }).then(() => {
      const f = this.fichaVacia();
      CAMPOS_FICHA.forEach(c => (f as any)[c] = datos[c] === null && typeof (f as any)[c] === 'string' ? '' : datos[c]);
      this.fichas[id] = f;
      if (this.detalleT && this.detalleT.id === id) { this.detalleF = f; }
      this.refrescarActivos();
    });
  }

  /** Sigue activo pero su fecha de término ya pasó: hay que subir el finiquito con su causal. */
  contratoVencido(t: TrabajadorCore): boolean {
    const f = this.fichaDe(t);
    return !this.esFiniquitado(t) && /^\d{4}-\d{2}-\d{2}$/.test(f.fechaTermino || '') && f.fechaTermino < this.hoyTexto();
  }

  /** Contrato vencido sin finiquitar, o finiquitado al que le falta causal, razón o documento. */
  pendienteFiniquito(t: TrabajadorCore): boolean {
    if (this.contratoVencido(t)) { return true; }
    if (!this.esFiniquitado(t)) { return false; }
    const f = this.fichaDe(t);
    return !f.motivoFiniquito || !(f.detalleFiniquito || '').trim() || !(f.adjuntoFiniquito && f.adjuntoFiniquito.url);
  }

  /** La ficha abierta es de un contrato vencido que sigue activo. */
  get fichaVencida(): boolean {
    const f = this.fichaForm;
    return f.estado !== 'finiquitado' && /^\d{4}-\d{2}-\d{2}$/.test(f.fechaTermino || '') && f.fechaTermino < this.hoyTexto();
  }

  /** Días que le quedan al contrato (null si es indefinido o ya está finiquitado). */
  diasParaVencer(t: TrabajadorCore): number {
    const f = this.fichaDe(t);
    if (this.esFiniquitado(t) || !/^\d{4}-\d{2}-\d{2}$/.test(f.fechaTermino || '')) { return null; }
    const a = f.fechaTermino.split('-').map(Number);
    const h = this.hoyTexto().split('-').map(Number);
    return Math.round((new Date(a[0], a[1] - 1, a[2]).getTime() - new Date(h[0], h[1] - 1, h[2]).getTime()) / 86400000);
  }

  /** Causal que se propone según el tipo de contrato. */
  private causalSugerida(f: FichaTrabajador): string {
    if (f.tipoContrato === 'Plazo fijo') { return CAUSALES_FINIQUITO[3]; }
    if (f.tipoContrato === 'Por obra o faena') { return CAUSALES_FINIQUITO[4]; }
    return '';
  }

  /** Abre la ficha en "Finiquitado" para poner fecha, causal, razón y el documento. */
  finiquitar(t: TrabajadorCore) {
    if (this.soloLectura) { return; }
    this.editarTrabajador(t);
    const f = this.fichaForm;
    if (f.estado !== 'finiquitado') {
      f.estado = 'finiquitado';
      f.fechaFiniquito = f.fechaTermino && f.fechaTermino < this.hoyTexto() ? f.fechaTermino : this.hoyTexto();
    }
    if (!f.motivoFiniquito) { f.motivoFiniquito = this.causalSugerida(f); }
    this.enfocarFicha('fic-motivo');
  }

  /** Volver a activo (si su contrato ya venció, conviene extender la fecha de término). */
  reactivar(t: TrabajadorCore) {
    if (this.soloLectura) { return; }
    this.editarTrabajador(t);
    this.marcarActivo();
    this.enfocarFicha('fic-termino');
  }

  /** Botón "Activo" de la ficha. */
  marcarActivo() {
    const f = this.fichaForm;
    f.estado = 'activo';
    f.fechaFiniquito = '';
    f.motivoFiniquito = '';
    f.detalleFiniquito = '';
    f.adjuntoFiniquito = null;
    f.finiquitoAutomatico = false;
    this.archivoFiniquito = null;
  }

  /** Botón "Finiquitado" de la ficha. */
  marcarFiniquitado() {
    const f = this.fichaForm;
    if (f.estado === 'finiquitado') { return; }
    f.estado = 'finiquitado';
    if (!f.fechaFiniquito) {
      f.fechaFiniquito = f.fechaTermino && f.fechaTermino < this.hoyTexto() ? f.fechaTermino : this.hoyTexto();
    }
    if (!f.motivoFiniquito) { f.motivoFiniquito = this.causalSugerida(f); }
  }

  seleccionarArchivoFiniquito(input: any) {
    const archivo: File = input && input.files && input.files[0];
    if (input) { input.value = ''; }
    if (!archivo) { return; }
    if (archivo.size > MAX_MB_FINIQUITO * 1024 * 1024) {
      this.errorFormulario = '"' + archivo.name + '" pesa más de ' + MAX_MB_FINIQUITO + ' MB.';
      return;
    }
    this.errorFormulario = '';
    this.archivoFiniquito = archivo;
  }

  quitarArchivoFiniquito() {
    this.archivoFiniquito = null;
    this.fichaForm.adjuntoFiniquito = null;
  }

  /** Sube el documento del finiquito a Storage: trabajadoresCore/<id>/finiquito/... */
  private subirFiniquito(id: string, archivo: File): Promise<AdjuntoFiniquito> {
    return this.subirArchivo(COLECCION_TRABAJADORES + '/' + id + '/finiquito', archivo, null).then(d => ({
      nombre: d.nombre, ruta: d.ruta, url: d.url, tamano: d.tamano, tipo: d.tipo, fechaSubida: d.fechaSubida
    }));
  }

  /** Sube un archivo a Storage (nombre limpio, sin tildes ni símbolos) y devuelve su ficha. */
  private subirArchivo(carpeta: string, archivo: File, alAvanzar: (bytes: number) => void): Promise<DocTrabajador> {
    const limpio = (archivo.name || 'archivo').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^\w.\-]+/g, '_').substring(0, 120);
    const ruta = carpeta + '/' + Date.now() + '_' + Math.random().toString(36).substr(2, 4) + '_' + limpio;
    const tipo = archivo.type || 'application/octet-stream';
    return new Promise((resolve, reject) => {
      const tarea: any = (firebase as any).storage().ref(ruta).put(archivo, { contentType: tipo });
      // la tarea también es una promesa: sin esto el error sale además como "Uncaught (in promise)"
      if (tarea && typeof tarea.then === 'function') { tarea.then(null, () => null); }
      tarea.on('state_changed',
        (estado: any) => { if (alAvanzar) { alAvanzar(estado.bytesTransferred); } },
        (error: any) => reject(error),
        () => {
          const ref = tarea.snapshot.ref;
          const url = ref && ref.getDownloadURL ? ref.getDownloadURL() : Promise.resolve(tarea.snapshot.downloadURL);
          url.then((u: string) => resolve({
            nombre: archivo.name, ruta: ruta, url: u, tamano: archivo.size, tipo: tipo,
            fechaSubida: new Date().toISOString(), subidoPor: this.nombreUsuarioActual()
          }), reject);
        });
    });
  }

  private borrarArchivo(ruta: string): Promise<any> {
    if (!ruta) { return Promise.resolve(); }
    return (firebase as any).storage().ref(ruta).delete().catch((error: any) => {
      if (!error || error.code !== 'storage/object-not-found') { throw error; }
    });
  }

  private nombreUsuarioActual(): string {
    try {
      const u = JSON.parse(localStorage.getItem('usuario') || '{}') || {};
      return u.nombreUsuario || u.nombre || u.usuario || u.email || '';
    } catch (e) {
      return '';
    }
  }

  // ===================== Popup del trabajador: datos, foto y carpetas =====================

  fotoDe(t: TrabajadorCore): string {
    const e = t && this.extras[t.id];
    return e && e.foto && e.foto.url ? e.foto.url : '';
  }

  inicialesDe(t: TrabajadorCore): string {
    if (!t) { return ''; }
    const a = (t.nombre || '').trim().charAt(0);
    const b = (t.apellido || '').trim().charAt(0);
    return (a + b).toUpperCase() || '?';
  }

  /** Archivos de una carpeta (siempre la misma referencia mientras no cambie). */
  docsDe(carpeta: string): DocTrabajador[] {
    const e = this.detalleT && this.extras[this.detalleT.id];
    return (e && e.documentos && e.documentos[carpeta]) || this.sinDocs;
  }

  cantidadDocs(carpeta: string): number {
    const n = this.docsDe(carpeta).length;
    const fin = carpeta === 'finiquitos' && this.detalleF && this.detalleF.adjuntoFiniquito && this.detalleF.adjuntoFiniquito.url ? 1 : 0;
    return n + fin;
  }

  get nombreCarpetaSel(): string {
    const c = CARPETAS_TRABAJADOR.filter(x => x.id === this.carpetaSel)[0];
    return c ? c.t : '';
  }

  abrirDetalle(t: TrabajadorCore) {
    this.detalleT = t;
    this.detalleF = this.fichaDe(t);
    this.detalleTab = 'datos';
    this.carpetaSel = 'legales';
    this.errorDetalle = '';
    this.subiendoDetalle = '';
  }

  cerrarDetalle() {
    if (this.subiendoDetalle) { return; }
    this.detalleT = null;
    this.detalleF = null;
  }

  clickFondoDetalle(evento: MouseEvent) {
    if (evento.target === evento.currentTarget) { this.cerrarDetalle(); }
  }

  @HostListener('document:keydown.escape')
  escapeDetalle() {
    if (this.detalleT) { this.cerrarDetalle(); }
  }

  /** Desde el popup: abre la ficha para editar. */
  editarDesdeDetalle() {
    const t = this.detalleT;
    this.cerrarDetalle();
    if (t) { this.editarTrabajador(t); }
  }

  finiquitarDesdeDetalle() {
    const t = this.detalleT;
    this.cerrarDetalle();
    if (t) { this.finiquitar(t); }
  }

  private guardarExtras(id: string, datos: any): Promise<any> {
    return firestoreDB.collection(COLECCION_TRABAJADORES).doc(id).set(datos, { merge: true });
  }

  subirFoto(input: any) {
    const t = this.detalleT;
    const archivo: File = input && input.files && input.files[0];
    if (input) { input.value = ''; }
    if (!t || !archivo || this.soloLectura || this.subiendoDetalle) { return; }
    if (!/^image\//.test(archivo.type || '')) { this.errorDetalle = 'La foto tiene que ser una imagen (JPG o PNG).'; return; }
    if (archivo.size > MAX_MB_FOTO * 1024 * 1024) { this.errorDetalle = 'La foto pesa más de ' + MAX_MB_FOTO + ' MB.'; return; }

    this.errorDetalle = '';
    this.subiendoDetalle = 'foto';
    this.progresoDetalle = 0;
    const anterior = this.extras[t.id] && this.extras[t.id].foto;
    this.subirArchivo(COLECCION_TRABAJADORES + '/' + t.id + '/foto', archivo, b => this.progresoDetalle = Math.round(b * 100 / (archivo.size || 1)))
      .then(foto => this.guardarExtras(t.id, { foto: foto }).then(() => foto))
      .then(foto => {
        const e = this.extras[t.id] || (this.extras[t.id] = { foto: null, documentos: {} });
        e.foto = foto;
        if (anterior && anterior.ruta) { this.borrarArchivo(anterior.ruta).catch(() => null); }
        this.subiendoDetalle = '';
        this.recalcularAgenda();
      })
      .catch(error => {
        console.error('Error al subir la foto:', error);
        this.subiendoDetalle = '';
        this.errorDetalle = error && error.code === 'storage/unauthorized'
          ? 'Storage no deja subir a trabajadoresCore/ (permiso denegado). Hay que agregar esa ruta en las reglas de Storage.'
          : 'No se pudo subir la foto.';
      });
  }

  subirDocumentos(input: any) {
    const t = this.detalleT;
    const carpeta = this.carpetaSel;
    const archivos: File[] = Array.prototype.slice.call((input && input.files) || []);
    if (input) { input.value = ''; }
    if (!t || !archivos.length || this.soloLectura || this.subiendoDetalle) { return; }
    const grande = archivos.filter(a => a.size > MAX_MB_DOC * 1024 * 1024)[0];
    if (grande) { this.errorDetalle = '"' + grande.name + '" pesa más de ' + MAX_MB_DOC + ' MB.'; return; }

    this.errorDetalle = '';
    this.subiendoDetalle = carpeta;
    this.progresoDetalle = 0;
    const total = archivos.reduce((s, a) => s + a.size, 0) || 1;
    const avance = archivos.map(() => 0);
    Promise.all(archivos.map((a, i) => this.subirArchivo(COLECCION_TRABAJADORES + '/' + t.id + '/carpetas/' + carpeta, a, b => {
      avance[i] = b;
      this.progresoDetalle = Math.min(100, Math.round(avance.reduce((x, y) => x + y, 0) * 100 / total));
    })))
      .then(nuevos => {
        const e = this.extras[t.id] || (this.extras[t.id] = { foto: null, documentos: {} });
        const lista = (e.documentos[carpeta] || []).concat(nuevos);
        return this.guardarExtras(t.id, { documentos: { [carpeta]: lista } }).then(() => {
          e.documentos = Object.assign({}, e.documentos, { [carpeta]: lista });
        });
      })
      .then(() => { this.subiendoDetalle = ''; })
      .catch(error => {
        console.error('Error al subir documentos:', error);
        this.subiendoDetalle = '';
        this.errorDetalle = error && error.code === 'storage/unauthorized'
          ? 'Storage no deja subir a trabajadoresCore/ (permiso denegado). Hay que agregar esa ruta en las reglas de Storage.'
          : 'No se pudieron subir todos los archivos.';
      });
  }

  eliminarDocumento(doc: DocTrabajador) {
    const t = this.detalleT;
    const carpeta = this.carpetaSel;
    if (!t || this.soloLectura) { return; }
    if (!confirm('¿Eliminar "' + doc.nombre + '"? No se puede deshacer.')) { return; }
    const e = this.extras[t.id];
    const lista = ((e && e.documentos[carpeta]) || []).filter(x => x.ruta !== doc.ruta || x.url !== doc.url);
    this.borrarArchivo(doc.ruta)
      .then(() => this.guardarExtras(t.id, { documentos: { [carpeta]: lista } }))
      .then(() => { e.documentos = Object.assign({}, e.documentos, { [carpeta]: lista }); })
      .catch(error => {
        console.error('Error al eliminar el documento:', error);
        this.errorDetalle = 'No se pudo eliminar el archivo.';
      });
  }

  iconoArchivo(nombre: string): string {
    const ext = ((nombre || '').split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') { return 'fa-file-pdf-o'; }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp'].indexOf(ext) >= 0) { return 'fa-file-image-o'; }
    if (['doc', 'docx'].indexOf(ext) >= 0) { return 'fa-file-word-o'; }
    if (['xls', 'xlsx', 'csv'].indexOf(ext) >= 0) { return 'fa-file-excel-o'; }
    if (['zip', 'rar', '7z'].indexOf(ext) >= 0) { return 'fa-file-archive-o'; }
    return 'fa-file-o';
  }

  tamanoTexto(bytes: number): string {
    const v = Number(bytes) || 0;
    if (v < 1024 * 1024) { return Math.max(1, Math.round(v / 1024)) + ' KB'; }
    return (Math.round(v / 1024 / 1024 * 10) / 10).toString().replace('.', ',') + ' MB';
  }

  fechaHoraTexto(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) { return ''; }
    return ('0' + d.getDate()).slice(-2) + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + d.getFullYear();
  }

  trackDoc(i: number, d: DocTrabajador) { return d.ruta || d.url; }

  subProyectosDe(t: TrabajadorCore): string[] {
    const res: string[] = [];
    this.clavesTrabajador(t).forEach(c => (this.asignaciones[c] || []).forEach(n => { if (res.indexOf(n) < 0) { res.push(n); } }));
    return res;
  }

  private formularioVacio(): TrabajadorCore {
    return { id: '', nombre: '', apellido: '', rut: '', rutLimpio: '', cargo: '' };
  }

  formatearRutFormulario() {
    if (this.formulario.rut) { this.formulario.rut = formatearRut(this.formulario.rut); }
  }

  editarTrabajador(t: TrabajadorCore) {
    this.formulario = { id: t.id, nombre: t.nombre, apellido: t.apellido, rut: t.rut, rutLimpio: t.rutLimpio, cargo: t.cargo, fechaCreacion: t.fechaCreacion };
    const ficha = Object.assign({}, this.fichaDe(t));
    // Registros antiguos: el apellido venía junto ("Cubillos Cadena") → paterno y materno
    if (!ficha.paterno && t.apellido) {
      const partes = t.apellido.trim().split(/\s+/);
      ficha.paterno = partes.shift() || '';
      ficha.materno = partes.join(' ');
    }
    this.fichaForm = ficha;
    this.archivoFiniquito = null;
    this.errorFormulario = '';
    this.mensajeAgenda = '';
    this.fichaAbierta = true;
    this.enfocarFicha();
  }

  cancelarFormulario() {
    this.formulario = this.formularioVacio();
    this.fichaForm = this.fichaVacia();
    this.archivoFiniquito = null;
    this.errorFormulario = '';
    this.fichaAbierta = false;
  }

  guardarFormulario() {
    if (this.soloLectura || this.guardandoFormulario) { return; }
    this.errorFormulario = '';
    this.mensajeAgenda = '';
    const f = this.formulario;
    const ficha = this.fichaForm;
    ficha.paterno = (ficha.paterno || '').trim();
    ficha.materno = (ficha.materno || '').trim();
    f.apellido = [ficha.paterno, ficha.materno].filter(x => !!x).join(' ');
    f.cargo = (f.cargo || '').trim();

    if (!(f.nombre || '').trim() || !ficha.paterno) {
      this.errorFormulario = 'Nombres y apellido paterno son obligatorios.';
      return;
    }
    if (ficha.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ficha.email.trim())) {
      this.errorFormulario = 'El e-mail no es válido.';
      return;
    }
    if (!ficha.tipoContrato) {
      this.errorFormulario = 'Falta el tipo de contrato.';
      return;
    }
    if (!ficha.fechaInicio) {
      this.errorFormulario = 'Falta la fecha de inicio del contrato.';
      return;
    }
    if (!this.terminoOpcional(ficha.tipoContrato) && !ficha.fechaTermino) {
      this.errorFormulario = 'Falta la fecha de término (solo indefinido y honorarios pueden ir sin término).';
      return;
    }
    if (ficha.fechaTermino && ficha.fechaTermino < ficha.fechaInicio) {
      this.errorFormulario = 'La fecha de término no puede ser antes del inicio.';
      return;
    }
    if (ficha.estado === 'finiquitado') {
      ficha.detalleFiniquito = (ficha.detalleFiniquito || '').trim();
      if (!ficha.fechaFiniquito) { this.errorFormulario = 'Falta la fecha de finiquito.'; return; }
      if (ficha.fechaFiniquito < ficha.fechaInicio) { this.errorFormulario = 'El finiquito no puede ser antes del inicio del contrato.'; return; }
      if (!ficha.motivoFiniquito) { this.errorFormulario = 'Falta la causal del finiquito.'; return; }
      if (!ficha.detalleFiniquito) { this.errorFormulario = 'Escribe la razón del finiquito.'; return; }
      if (!this.archivoFiniquito && !(ficha.adjuntoFiniquito && ficha.adjuntoFiniquito.url)) {
        this.errorFormulario = 'Adjunta el documento del finiquito.';
        return;
      }
    } else {
      ficha.fechaFiniquito = '';
    }
    ficha.email = (ficha.email || '').trim();
    if (f.rut && !rutValido(f.rut)) {
      this.errorFormulario = 'El RUT no es válido (revisa el dígito verificador).';
      return;
    }
    const rut = limpiarRut(f.rut);
    if (rut && this.agenda.some(t => t.rutLimpio === rut && t.id !== f.id)) {
      this.errorFormulario = 'Ya hay un trabajador con ese RUT en la agenda.';
      return;
    }
    if (!rut && this.agenda.some(t => t.id !== f.id &&
      normalizarTexto(t.nombre) === normalizarTexto(f.nombre) && normalizarTexto(t.apellido) === normalizarTexto(f.apellido))) {
      this.errorFormulario = 'Ya hay un trabajador con ese nombre. Agrégale el RUT para diferenciarlo.';
      return;
    }

    const editando = !!f.id;
    this.guardandoFormulario = true;
    let guardado: TrabajadorCore = null;
    guardarTrabajador(f, this.idUsuario).then(g => {
      guardado = g;
      if (ficha.estado === 'finiquitado' && this.archivoFiniquito) {
        return this.subirFiniquito(g.id, this.archivoFiniquito).then(adj => {
          ficha.adjuntoFiniquito = adj;
          this.archivoFiniquito = null;
          return this.guardarFicha(g.id, ficha);
        });
      }
      return this.guardarFicha(g.id, ficha);
    }).then(() => {
      this.agenda = ordenarTrabajadores(this.agenda.filter(t => t.id !== guardado.id).concat(guardado));
      this.refrescarActivos();
      this.mensajeAgenda = guardado.nombre + ' ' + guardado.apellido + (editando ? ' quedó actualizado.' : ' quedó en la agenda.');
      this.formulario = this.formularioVacio();
      this.fichaForm = this.fichaVacia();
      this.fichaAbierta = false;
      this.guardandoFormulario = false;
    }).catch(error => {
      console.error('Error al guardar el trabajador:', error);
      this.errorFormulario = 'No se pudo guardar. Revisa que la colección trabajadoresCore esté en las reglas de Firestore.';
      this.guardandoFormulario = false;
    });
  }

  borrarTrabajador(t: TrabajadorCore) {
    if (this.soloLectura) { return; }
    const enUso = this.subProyectosDe(t);
    const aviso = enUso.length
      ? '\n\nEste mes está en: ' + enUso.join(', ') + '. Ahí sigue apareciendo con sus horas; solo sale de la agenda.'
      : '';
    if (!confirm('¿Eliminar a ' + t.nombre + ' ' + t.apellido + ' de la agenda?' + aviso)) { return; }
    eliminarTrabajador(t.id).then(() => {
      this.agenda = this.agenda.filter(x => x.id !== t.id);
      delete this.fichas[t.id];
      this.refrescarActivos();
      if (this.formulario.id === t.id) { this.cancelarFormulario(); }
      this.mensajeAgenda = t.nombre + ' ' + t.apellido + ' salió de la agenda.';
    }).catch(error => {
      console.error('Error al eliminar el trabajador:', error);
      this.mensajeAgenda = 'No se pudo eliminar.';
    });
  }

  trackTrabajador(i: number, t: TrabajadorCore) { return t.id; }
}