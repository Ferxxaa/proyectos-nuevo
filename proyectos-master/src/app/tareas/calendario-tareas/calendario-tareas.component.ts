import { Component, OnInit } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/throw';
import { configuracion } from '../../config';

//Share
import { Comunes } from '../../Share/Comunes';

//Servicios
import { spMis_Tareas } from '../../services/Personalizados/spMis_Tareas.service';
import { sTarea } from '../../services/sTarea.service';
import { sLogTarea } from '../../services/sLogTarea.service';
import { sUsuario } from '../../services/sUsuario.service';

declare var jQuery: any;
declare var $: any;
declare var Swal: any;

const URL_VIS_CALENDARIO = 'http://trazas-nbi.com:1234/api/Vis_Calendario';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Colores para resaltar responsables (distintos a los de estado)
const PALETA_RESALTE = ['#e8590c', '#0ca678', '#d6336c', '#1c7ed6', '#f59f00', '#7048e8', '#2f9e44', '#c2255c'];
const MAX_RESALTADOS = PALETA_RESALTE.length;

export interface CalTarea {
  idTarea: number;
  descripcion: string;
  responsableNombre: string;
  idResponsable: number;
  creadorNombre: string;
  idCreador: number;
  respKey: string;
  iniciales: string;
  estadoId: number;
  estadoNombre: string;
  prioridad: string;
  area: string;
  subProyecto: string;
  fecha: Date | null;
  fechaCreacion: Date | null;
  vencida: boolean;
  raw: any;
  // Calculados al reconstruir la vista
  _color: string | null;
  _dim: boolean;
  _editable: boolean;
  _guardando: boolean;
}

export interface CalDia {
  fecha: Date;
  key: string;
  numero: number;
  delMes: boolean;
  esHoy: boolean;
  finDeSemana: boolean;
  tareas: CalTarea[];
  visibles: CalTarea[];
  extra: number;
  colores: string[];
  tinte: string | null;
  barra: string | null;
}

export interface RespResaltado {
  key: string;
  id: number;
  nombre: string;
  color: string;
}

@Component({
  selector: 'app-calendario-tareas',
  templateUrl: './calendario-tareas.component.html',
  styleUrls: ['./calendario-tareas.component.css'],
  providers: [spMis_Tareas, sTarea, sLogTarea, sUsuario, Comunes]
})
export class CalendarioTareasComponent implements OnInit {

  usuarioActual: any;
  esGerencia: boolean = false;
  private datosCompletos: boolean = false; // si se cargaron las tareas de todos los usuarios

  cargando: boolean = true;
  errorCarga: boolean = false;

  tareas: CalTarea[] = [];

  // Vista
  vista: 'mes' | 'semana' = 'mes';
  fechaActual: Date = this.hoy();
  semanas: CalDia[][] = [];
  tituloPeriodo: string = '';
  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly maxChipsMes = 3;
  private rangoInicio: Date;
  private rangoFin: Date;
  private porDia: { [key: string]: CalTarea[] } = {};

  // Filtros
  textoBusqueda: string = '';
  tipoFiltro: string = 'propias';
  estadoFiltro: number = 0;
  soloResaltadas: boolean = false;

  // Resaltado de responsables
  resaltados: RespResaltado[] = [];
  busquedaResp: string = '';
  dropdownResp: boolean = false;
  sugerenciasResp: Array<{ key: string; id: number; nombre: string; total: number }> = [];
  conteoResaltados: { [key: string]: number } = {};
  readonly maxResaltados = MAX_RESALTADOS;

  // Totales
  sinFecha: CalTarea[] = [];
  totalVisibles: number = 0;
  totalVencidas: number = 0;

  // Panel lateral
  panelModo: 'sinfecha' | 'dia' | 'tarea' = 'sinfecha';
  diaSeleccionadoKey: string = null;
  diaSeleccionadoFecha: Date = null;
  tareasDiaSeleccionado: CalTarea[] = [];
  tareaSeleccionada: CalTarea = null;

  // Drag & drop
  arrastrando: CalTarea = null;
  diaDrop: string = null;

  private timerTexto: any;
  private timerResp: any;

  constructor(
    private _http: Http,
    private _spMis_Tareas: spMis_Tareas,
    private _sTarea: sTarea,
    private _sLogTarea: sLogTarea,
    private _sUsuario: sUsuario,
    private _Comunes: Comunes
  ) {
    if (localStorage.getItem('usuario')) {
      this.usuarioActual = JSON.parse(localStorage.getItem('usuario'));
    }
  }

  ngOnInit() {
    // Color del nav al entrar a Calendario
    setTimeout(() => {
      if (typeof $ !== 'undefined') {
        $('#sidebar').css('background-color', '#89658f');
      } else {
        const nav = document.getElementById('sidebar');
        if (nav) nav.style.backgroundColor = '#89658f';
      }
    }, 100);

    try {
      $.getScript("http://trazas-nbi.com/Bootstrap/ajax-bootstrap4/js/settings.js");
      $.getScript("http://trazas-nbi.com/Bootstrap/ajax-bootstrap4/js/app.js");
    } catch (e) { }

    this.restaurarPreferencias();

    this.esGerencia = this.determinarGerenciaAlternativa();
    this.verificarPermisos();

    this.reconstruir();
    this.cargarDatos();
  }

  //*************************************************** Carga de datos ***************************************************

  cargarDatos(): void {
    this.cargando = true;
    this.errorCarga = false;

    const vis$ = this._http.get(URL_VIS_CALENDARIO)
      .map((res: Response) => res.json())
      .catch(() => Observable.of([]));

    const mis$ = this.getTareasMisTareas()
      .catch(() => Observable.of([]));

    Observable.forkJoin(vis$, mis$).subscribe((resultado: any[]) => {
      const vis: any[] = Array.isArray(resultado[0]) ? resultado[0] : [];
      const mis: any[] = Array.isArray(resultado[1]) ? resultado[1] : [];

      // Fusionar por idTarea: Mis Tareas trae más campos (área, prioridad, nombres),
      // Vis_Calendario completa lo que falte.
      const porId: { [id: string]: any } = {};
      const orden: string[] = [];

      const agregar = (raw: any) => {
        if (!raw) return;
        const id = raw.idTarea || raw.IdTarea || raw.id;
        if (id === null || id === undefined) return;
        const k = String(id);
        if (!porId[k]) {
          porId[k] = { ...raw };
          orden.push(k);
        } else {
          const base = porId[k];
          Object.keys(raw).forEach(campo => {
            const actual = base[campo];
            if (actual === null || actual === undefined || (typeof actual === 'string' && actual.trim() === '')) {
              base[campo] = raw[campo];
            }
          });
        }
      };

      mis.forEach(agregar);
      vis.forEach(agregar);

      this.tareas = orden
        .map(k => this.aCalTarea(porId[k]))
        .filter(t => t && t.idTarea > 0 && t.estadoId !== 3); // Canceladas no se muestran

      // Si había una tarea abierta en el panel, re-enlazarla
      if (this.tareaSeleccionada) {
        const id = this.tareaSeleccionada.idTarea;
        this.tareaSeleccionada = this.tareas.filter(t => t.idTarea === id)[0] || null;
        if (!this.tareaSeleccionada && this.panelModo === 'tarea') this.panelModo = 'sinfecha';
      }

      this.cargando = false;
      this.actualizarSugerencias();
      this.reconstruir();
    }, err => {
      console.error('Error cargando calendario:', err);
      this.cargando = false;
      this.errorCarga = true;
    });
  }

  // Misma lógica que Mis Tareas: usuarios normales solo sus tareas, gerencia las de todos los activos
  private getTareasMisTareas(): Observable<any[]> {
    const idUsuarioActual = this.idYo();
    const puedeVerTodas = this.esGerencia;
    this.datosCompletos = puedeVerTodas;

    const conTerminadasGuardadas = (tareas: any[]) => {
      const base = (tareas || []).filter((t, i, self) => t && i === self.findIndex(x => x && x.idTarea === t.idTarea));
      // Terminadas guardadas por Mis Tareas (el SP no siempre las devuelve)
      try {
        const stored = localStorage.getItem('tareasTerminadas_' + idUsuarioActual);
        const terminadas = stored ? JSON.parse(stored) : [];
        (terminadas || []).forEach(tt => {
          if (tt && !base.some(x => x.idTarea === tt.idTarea)) base.push(tt);
        });
      } catch (e) { }
      return base;
    };

    if (!puedeVerTodas) {
      if (!idUsuarioActual) return Observable.of([]);
      return this._spMis_Tareas.getMis_TareasbyIdUsuario(idUsuarioActual)
        .catch(() => Observable.of([]))
        .map(t => conTerminadasGuardadas(t));
    }

    return this._sUsuario.getUsuariobyactivo(true)
      .catch(() => Observable.of([]))
      .switchMap(usuariosActivos => {
        const ids = (usuariosActivos || []).map(u => +u.idUsuario).filter(id => !!id && id > 0);
        if (idUsuarioActual > 0 && ids.indexOf(idUsuarioActual) === -1) ids.push(idUsuarioActual);
        if (!ids.length) return Observable.of([]);
        return Observable.forkJoin(ids.map(id =>
          this._spMis_Tareas.getMis_TareasbyIdUsuario(id).catch(() => Observable.of([]))
        ));
      })
      .map((resultados: any[]) => {
        const todas = (resultados || []).reduce((acc, t) => acc.concat(t || []), []);
        return conTerminadasGuardadas(todas);
      });
  }

  private aCalTarea(raw: any): CalTarea {
    if (!raw) return null;

    const idTarea = +(raw.idTarea || raw.IdTarea || raw.id) || 0;
    const compromiso = this.parseFechaLocal(this.obtenerFechaCompromisoValor(raw));

    const responsableNombre = (raw.UsuarioResponsable || raw.responsable || raw.title || '')
      .toString().replace(/^\[Sin Fecha\]\s*/, '').trim() || 'Sin responsable';
    const idResponsable = +raw.idUsuarioResponsable || 0;

    const estadoId = this.resolverEstado(raw);
    const nombresEstado: { [id: number]: string } = { 1: 'Pendiente', 2: 'En Proceso', 3: 'Cancelada', 5: 'Terminada' };

    return {
      idTarea: idTarea,
      descripcion: this.limpiarTexto(raw.descripcionTarea || raw.descripcion || raw.nombreTarea || '') || 'Sin descripción',
      responsableNombre: responsableNombre,
      idResponsable: idResponsable,
      creadorNombre: (raw.UsuarioCreador || '').toString().trim(),
      idCreador: +raw.idUsuarioCreador || 0,
      respKey: this.claveResponsable(idResponsable, responsableNombre),
      iniciales: this.getIniciales(responsableNombre),
      estadoId: estadoId,
      estadoNombre: nombresEstado[estadoId] || raw.nombreEstadoTarea || '',
      prioridad: raw.prioridad || '',
      area: raw.area || '',
      subProyecto: raw.nombreSubProyecto || 'General',
      fecha: compromiso ? this.soloFecha(compromiso) : null,
      fechaCreacion: this.parseFechaLocal(raw.fechaCreacion),
      vencida: false,
      raw: raw,
      _color: null,
      _dim: false,
      _editable: false,
      _guardando: false
    };
  }

  private resolverEstado(raw: any): number {
    if (raw.idEstadoTarea !== null && raw.idEstadoTarea !== undefined && raw.idEstadoTarea !== '') {
      return +raw.idEstadoTarea;
    }
    const nombre = this.normalizar(raw.nombreEstadoTarea || raw.estado || '');
    if (nombre.indexOf('cancel') !== -1) return 3;
    if (nombre.indexOf('termin') !== -1 || nombre.indexOf('complet') !== -1 || nombre.indexOf('finaliz') !== -1) return 5;
    if (nombre.indexOf('proceso') !== -1 || nombre.indexOf('progreso') !== -1) return 2;
    return 1;
  }

  // Lógica original: la fecha de compromiso puede venir con distintos nombres de campo
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

    // La fecha de compromiso a veces llega como `start`. Solo se acepta si no es el mismo día de creación.
    const startDate = this.parseFechaLocal(evento.start);
    if (!startDate) return null;

    const creacionDate = this.parseFechaLocal(evento.fechaCreacion);
    if (!creacionDate) return startDate;

    return this.mismoDia(startDate, creacionDate) ? null : startDate;
  }

  //*************************************************** Construcción de la vista ***************************************************

  reconstruir(): void {
    const hoy = this.hoy();
    const hayResalte = this.hayResalte();

    const visibles: CalTarea[] = [];
    this.tareas.forEach(t => {
      if (!this.pasaPermiso(t)) return;

      t._color = this.colorResaltado(t);
      t._dim = hayResalte && !t._color;
      t._editable = this.puedeEditar(t);
      t.vencida = !!t.fecha && t.fecha.getTime() < hoy.getTime() && (t.estadoId === 1 || t.estadoId === 2);

      if (!this.pasaFiltros(t)) return;
      if (this.soloResaltadas && hayResalte && !t._color) return;
      visibles.push(t);
    });

    this.totalVisibles = visibles.length;
    this.totalVencidas = visibles.filter(t => t.vencida).length;

    // Conteo por responsable resaltado
    const conteo: { [key: string]: number } = {};
    this.resaltados.forEach(r => conteo[r.key] = 0);
    visibles.forEach(t => {
      if (conteo[t.respKey] !== undefined) conteo[t.respKey]++;
    });
    this.conteoResaltados = conteo;

    // Sin fecha (panel lateral)
    this.sinFecha = visibles
      .filter(t => !t.fecha)
      .sort((a, b) => this.ordenTareas(a, b));

    // Agrupar por día
    const porDia: { [key: string]: CalTarea[] } = {};
    visibles.forEach(t => {
      if (!t.fecha) return;
      const k = this.claveDia(t.fecha);
      (porDia[k] = porDia[k] || []).push(t);
    });
    Object.keys(porDia).forEach(k => porDia[k].sort((a, b) => this.ordenTareas(a, b)));
    this.porDia = porDia;

    // Rango visible
    const y = this.fechaActual.getFullYear();
    const m = this.fechaActual.getMonth();
    let inicio: Date;
    let totalDias: number;

    if (this.vista === 'mes') {
      inicio = this.lunesDe(new Date(y, m, 1));
      const fin = this.domingoDe(new Date(y, m + 1, 0));
      totalDias = Math.round((fin.getTime() - inicio.getTime()) / 86400000) + 1;
      this.tituloPeriodo = this.capitalizar(MESES[m]) + ' ' + y;
    } else {
      inicio = this.lunesDe(this.fechaActual);
      totalDias = 7;
      const fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
      this.tituloPeriodo = inicio.getMonth() === fin.getMonth()
        ? inicio.getDate() + ' – ' + fin.getDate() + ' ' + MESES_CORTOS[fin.getMonth()] + ' ' + fin.getFullYear()
        : inicio.getDate() + ' ' + MESES_CORTOS[inicio.getMonth()] + ' – ' + fin.getDate() + ' ' + MESES_CORTOS[fin.getMonth()] + ' ' + fin.getFullYear();
    }

    this.rangoInicio = inicio;
    this.rangoFin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + totalDias - 1);

    const dias: CalDia[] = [];
    for (let i = 0; i < totalDias; i++) {
      const fecha = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      const key = this.claveDia(fecha);
      const tareasDia = porDia[key] || [];
      const limite = this.vista === 'mes' ? this.maxChipsMes : tareasDia.length;

      const colores: string[] = [];
      tareasDia.forEach(t => {
        if (t._color && colores.indexOf(t._color) === -1) colores.push(t._color);
      });

      dias.push({
        fecha: fecha,
        key: key,
        numero: fecha.getDate(),
        delMes: this.vista === 'semana' || fecha.getMonth() === m,
        esHoy: this.mismoDia(fecha, hoy),
        finDeSemana: fecha.getDay() === 0 || fecha.getDay() === 6,
        tareas: tareasDia,
        visibles: tareasDia.slice(0, limite),
        extra: Math.max(0, tareasDia.length - limite),
        colores: colores,
        tinte: colores.length ? this.hexToRgba(colores[0], 0.07) : null,
        barra: colores.length ? 'inset 0 3px 0 ' + colores[0] : null
      });
    }

    const semanas: CalDia[][] = [];
    for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));
    this.semanas = semanas;

    // Refrescar el día seleccionado
    if (this.diaSeleccionadoKey) {
      this.tareasDiaSeleccionado = porDia[this.diaSeleccionadoKey] || [];
    }
  }

  private ordenTareas(a: CalTarea, b: CalTarea): number {
    // Resaltadas primero, terminadas al final, luego prioridad
    const pa = (a._color ? 0 : 1) * 100 + (a.estadoId === 5 ? 50 : 0) + this.pesoPrioridad(a.prioridad);
    const pb = (b._color ? 0 : 1) * 100 + (b.estadoId === 5 ? 50 : 0) + this.pesoPrioridad(b.prioridad);
    if (pa !== pb) return pa - pb;
    return (a.descripcion || '').localeCompare(b.descripcion || '');
  }

  private pesoPrioridad(p: string): number {
    const n = this.normalizar(p);
    if (n === 'alta') return 0;
    if (n === 'media') return 1;
    if (n === 'baja') return 2;
    return 3;
  }

  //*************************************************** Filtros y permisos ***************************************************

  private pasaPermiso(t: CalTarea): boolean {
    if (this.esGerencia) return true;
    const yo = this.idYo();
    return t.idResponsable === yo || t.idCreador === yo;
  }

  private pasaFiltros(t: CalTarea): boolean {
    const yo = this.idYo();

    if (this.tipoFiltro === 'propias' && t.idResponsable !== yo) return false;
    if (this.tipoFiltro === 'creadas' && !(t.idCreador === yo && t.idResponsable !== yo)) return false;

    if (this.estadoFiltro && t.estadoId !== this.estadoFiltro) return false;

    const q = this.normalizar(this.textoBusqueda).trim();
    if (q) {
      const texto = this.normalizar(t.descripcion + ' #' + t.idTarea + ' ' + t.area + ' ' + t.subProyecto);
      if (texto.indexOf(q) === -1) return false;
    }
    return true;
  }

  private puedeEditar(t: CalTarea): boolean {
    if (t.estadoId !== 1 && t.estadoId !== 2) return false;
    if (this.esGerencia) return true;
    const yo = this.idYo();
    return t.idResponsable === yo || t.idCreador === yo;
  }

  get tiposFiltro(): Array<{ value: string; label: string; icon: string }> {
    return [
      { value: 'propias', label: 'Propias', icon: 'fa-user' },
      { value: 'creadas', label: 'Asignadas por mí', icon: 'fa-share' },
      { value: 'todas', label: this.esGerencia ? 'Vista Global' : 'Todas', icon: 'fa-globe' }
    ];
  }

  readonly estadosFiltro = [
    { value: 0, label: 'Todos', color: '' },
    { value: 1, label: 'Pendiente', color: '#87909e' },
    { value: 2, label: 'En Proceso', color: '#4466ff' },
    { value: 5, label: 'Terminada', color: '#008844' }
  ];

  setTipo(valor: string): void {
    this.tipoFiltro = valor;
    this.guardarPreferencias();
    this.reconstruir();
  }

  setEstado(valor: number): void {
    this.estadoFiltro = valor;
    this.reconstruir();
  }

  onTextoBusqueda(): void {
    clearTimeout(this.timerTexto);
    this.timerTexto = setTimeout(() => this.reconstruir(), 150);
  }

  toggleSoloResaltadas(): void {
    this.soloResaltadas = !this.soloResaltadas;
    this.reconstruir();
  }

  limpiarFiltros(): void {
    this.textoBusqueda = '';
    this.tipoFiltro = 'propias';
    this.estadoFiltro = 0;
    this.soloResaltadas = false;
    this.resaltados = [];
    this.busquedaResp = '';
    this.fechaActual = this.hoy();
    this.guardarPreferencias();
    this.actualizarSugerencias();
    this.reconstruir();
  }

  get hayFiltrosActivos(): boolean {
    return !!this.textoBusqueda || this.tipoFiltro !== 'propias' || this.estadoFiltro !== 0 || this.resaltados.length > 0;
  }

  //*************************************************** Resaltado de responsables ***************************************************

  hayResalte(): boolean {
    return this.resaltados.length > 0 || this.normalizar(this.busquedaResp).trim().length >= 2;
  }

  private colorResaltado(t: CalTarea): string | null {
    for (let i = 0; i < this.resaltados.length; i++) {
      if (this.resaltados[i].key === t.respKey) return this.resaltados[i].color;
    }
    // Vista previa mientras se escribe
    const q = this.normalizar(this.busquedaResp).trim();
    if (q.length >= 2 && this.resaltados.length < MAX_RESALTADOS && this.normalizar(t.responsableNombre).indexOf(q) !== -1) {
      return this.siguienteColor();
    }
    return null;
  }

  siguienteColor(): string {
    const usados = this.resaltados.map(r => r.color);
    for (let i = 0; i < PALETA_RESALTE.length; i++) {
      if (usados.indexOf(PALETA_RESALTE[i]) === -1) return PALETA_RESALTE[i];
    }
    return PALETA_RESALTE[0];
  }

  onBusquedaResp(valor: string): void {
    this.busquedaResp = valor;
    this.dropdownResp = true;
    clearTimeout(this.timerResp);
    this.timerResp = setTimeout(() => {
      this.actualizarSugerencias();
      this.reconstruir();
    }, 120);
  }

  abrirDropdownResp(): void {
    this.actualizarSugerencias();
    this.dropdownResp = true;
  }

  cerrarDropdownResp(): void {
    setTimeout(() => { this.dropdownResp = false; }, 150);
  }

  onEnterResp(): void {
    if (this.sugerenciasResp.length > 0) {
      this.agregarResaltado(this.sugerenciasResp[0]);
    }
  }

  onEscapeResp(): void {
    this.busquedaResp = '';
    this.dropdownResp = false;
    this.actualizarSugerencias();
    this.reconstruir();
  }

  actualizarSugerencias(): void {
    const q = this.normalizar(this.busquedaResp).trim();
    const mapa: { [key: string]: { key: string; id: number; nombre: string; total: number } } = {};
    const yaResaltados = this.resaltados.map(r => r.key);

    this.tareas.forEach(t => {
      if (!this.pasaPermiso(t)) return;
      if (yaResaltados.indexOf(t.respKey) !== -1) return;
      if (q && this.normalizar(t.responsableNombre).indexOf(q) === -1) return;
      if (!mapa[t.respKey]) {
        mapa[t.respKey] = { key: t.respKey, id: t.idResponsable, nombre: t.responsableNombre, total: 0 };
      }
      if (t.estadoId === 1 || t.estadoId === 2) mapa[t.respKey].total++;
    });

    this.sugerenciasResp = Object.keys(mapa)
      .map(k => mapa[k])
      .sort((a, b) => (b.total - a.total) || a.nombre.localeCompare(b.nombre))
      .slice(0, 8);
  }

  agregarResaltado(s: { key: string; id: number; nombre: string }): void {
    if (!s) return;
    if (this.resaltados.some(r => r.key === s.key)) return;

    if (this.resaltados.length >= MAX_RESALTADOS) {
      this.toast('Máximo ' + MAX_RESALTADOS + ' responsables resaltados', 'warning');
      return;
    }

    this.resaltados = this.resaltados.concat([{ key: s.key, id: s.id, nombre: s.nombre, color: this.siguienteColor() }]);
    this.busquedaResp = '';
    this.dropdownResp = false;

    // Si se resalta a otra persona estando en "Propias", no se vería nada: pasar a todas
    if (this.tipoFiltro === 'propias' && s.id !== this.idYo()) {
      this.tipoFiltro = 'todas';
    }

    this.guardarPreferencias();
    this.actualizarSugerencias();
    this.reconstruir();
    this.irAProximaTareaDe(s.key, s.nombre);
  }

  quitarResaltado(r: RespResaltado): void {
    this.resaltados = this.resaltados.filter(x => x.key !== r.key);
    if (!this.resaltados.length) this.soloResaltadas = false;
    this.guardarPreferencias();
    this.actualizarSugerencias();
    this.reconstruir();
  }

  limpiarResaltados(): void {
    this.resaltados = [];
    this.busquedaResp = '';
    this.soloResaltadas = false;
    this.guardarPreferencias();
    this.actualizarSugerencias();
    this.reconstruir();
  }

  resaltarDesdeTarea(t: CalTarea): void {
    this.agregarResaltado({ key: t.respKey, id: t.idResponsable, nombre: t.responsableNombre });
  }

  estaResaltado(t: CalTarea): boolean {
    return this.resaltados.some(r => r.key === t.respKey);
  }

  // Si el responsable no tiene tareas en el período visible, saltar a su próxima tarea
  private irAProximaTareaDe(key: string, nombre: string): void {
    const conFecha = this.tareas.filter(t => t.respKey === key && t.fecha && this.pasaPermiso(t) && this.pasaFiltros(t));
    if (!conFecha.length) {
      this.toast(nombre + ' no tiene tareas con fecha en el filtro actual', 'info');
      return;
    }

    const enRango = conFecha.some(t => t.fecha >= this.rangoInicio && t.fecha <= this.rangoFin);
    if (enRango) return;

    const hoy = this.hoy();
    const ordenadas = conFecha.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    const proxima = ordenadas.filter(t => t.fecha >= hoy)[0] || ordenadas[ordenadas.length - 1];

    this.fechaActual = new Date(proxima.fecha.getTime());
    this.reconstruir();
    this.toast('Mostrando tareas de ' + nombre, 'info');
  }

  //*************************************************** Navegación ***************************************************

  anterior(): void {
    const f = this.fechaActual;
    this.fechaActual = this.vista === 'mes'
      ? new Date(f.getFullYear(), f.getMonth() - 1, 1)
      : new Date(f.getFullYear(), f.getMonth(), f.getDate() - 7);
    this.reconstruir();
  }

  siguiente(): void {
    const f = this.fechaActual;
    this.fechaActual = this.vista === 'mes'
      ? new Date(f.getFullYear(), f.getMonth() + 1, 1)
      : new Date(f.getFullYear(), f.getMonth(), f.getDate() + 7);
    this.reconstruir();
  }

  irAHoy(): void {
    this.fechaActual = this.hoy();
    this.reconstruir();
  }

  cambiarVista(v: 'mes' | 'semana'): void {
    if (this.vista === v) return;
    // Al pasar a semana desde el mes, usar el día seleccionado o hoy si está en el mes
    if (v === 'semana') {
      if (this.diaSeleccionadoFecha) {
        this.fechaActual = new Date(this.diaSeleccionadoFecha.getTime());
      } else {
        const hoy = this.hoy();
        if (hoy.getMonth() === this.fechaActual.getMonth() && hoy.getFullYear() === this.fechaActual.getFullYear()) {
          this.fechaActual = hoy;
        }
      }
    }
    this.vista = v;
    this.guardarPreferencias();
    this.reconstruir();
  }

  //*************************************************** Panel lateral ***************************************************

  seleccionarDia(dia: CalDia): void {
    this.diaSeleccionadoKey = dia.key;
    this.diaSeleccionadoFecha = dia.fecha;
    this.tareasDiaSeleccionado = this.porDia[dia.key] || [];
    this.panelModo = 'dia';
  }

  seleccionarTarea(t: CalTarea): void {
    this.tareaSeleccionada = t;
    this.panelModo = 'tarea';
  }

  volverPanel(): void {
    if (this.panelModo === 'tarea' && this.diaSeleccionadoKey) {
      this.panelModo = 'dia';
    } else {
      this.panelModo = 'sinfecha';
      this.diaSeleccionadoKey = null;
      this.diaSeleccionadoFecha = null;
    }
    this.tareaSeleccionada = null;
  }

  verSinFecha(): void {
    this.panelModo = 'sinfecha';
    this.diaSeleccionadoKey = null;
    this.diaSeleccionadoFecha = null;
    this.tareaSeleccionada = null;
  }

  //*************************************************** Drag & drop (cambiar fecha de compromiso) ***************************************************

  onDragStart(event: any, t: CalTarea): void {
    if (!t._editable || t._guardando) {
      event.preventDefault();
      return;
    }
    this.arrastrando = t;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try { event.dataTransfer.setData('text/plain', String(t.idTarea)); }
      catch (e) { try { event.dataTransfer.setData('text', String(t.idTarea)); } catch (e2) { } }
    }
  }

  onDragEnd(): void {
    this.arrastrando = null;
    this.diaDrop = null;
  }

  onDragOverDia(event: any, dia: CalDia): void {
    if (!this.arrastrando) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this.diaDrop !== dia.key) this.diaDrop = dia.key;
  }

  onDragLeaveDia(event: any, dia: CalDia): void {
    const destino = event.relatedTarget;
    if (destino && event.currentTarget && event.currentTarget.contains(destino)) return;
    if (this.diaDrop === dia.key) this.diaDrop = null;
  }

  onDropDia(event: any, dia: CalDia): void {
    event.preventDefault();
    const t = this.arrastrando;
    this.onDragEnd();
    if (!t) return;
    if (t.fecha && this.mismoDia(t.fecha, dia.fecha)) return;
    this.guardarFechaCompromiso(t, dia.fecha);
  }

  // Misma forma de guardar que Mis Tareas: trae la tarea completa, registra en LogTarea y actualiza
  private guardarFechaCompromiso(t: CalTarea, nuevaFecha: Date): void {
    const anterior = t.fecha;
    t.fecha = this.soloFecha(nuevaFecha);
    t._guardando = true;
    this.reconstruir();

    const revertir = () => {
      t.fecha = anterior;
      t._guardando = false;
      this.reconstruir();
      try { Swal.fire('Error', 'No se pudo cambiar la fecha de compromiso', 'error'); } catch (e) { }
    };

    this._sTarea.getTareabyID(t.idTarea).subscribe(detalle => {
      if (!detalle) { revertir(); return; }

      const tareaNueva: any = { ...detalle, fechaTerminoProgramado: this.fechaParaBackend(t.fecha) };
      this.registrarLog(tareaNueva);

      const req: any = this._sTarea.postUpdDelTarea(tareaNueva);
      if (!req || !req.success) { revertir(); return; }

      req.success(() => {
        t._guardando = false;
        t.raw.fechaTerminoProgramado = tareaNueva.fechaTerminoProgramado;
        this.reconstruir();
        this.toast('Tarea #' + t.idTarea + ' → ' + t.fecha.getDate() + ' ' + MESES_CORTOS[t.fecha.getMonth()]);
      });
      if (req.fail) req.fail(() => revertir());
      else if (req.error) req.error(() => revertir());
    }, () => revertir());
  }

  private registrarLog(tarea: any): void {
    try {
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

      if (logTarea.observacionTarea && String(logTarea.observacionTarea).trim() !== '') {
        logTarea.descripcionTarea = logTarea.observacionTarea;
      }

      const req: any = this._sLogTarea.postAddLogTarea(logTarea);
      if (req && req.fail) req.fail(err => console.error('❌ Error al guardar log:', err));
    } catch (e) {
      console.error('Error registrando log de tarea:', e);
    }
  }

  // Se usa el mismo convertidor que el modal de Mis Tareas (Comunes.ReturnFecha) para respetar el formato del backend
  private fechaParaBackend(d: Date): any {
    const dd = this.pad(d.getDate());
    const mm = this.pad(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    try {
      const resultado = this._Comunes.ReturnFecha($('<input type="text">').val(dd + '/' + mm + '/' + yyyy));
      if (resultado) return resultado;
    } catch (e) { }
    return yyyy + '-' + mm + '-' + dd + 'T00:00:00';
  }

  //*************************************************** Permisos (gerencia) ***************************************************

  verificarPermisos(): void {
    if (!this.usuarioActual || !this.usuarioActual.idUsuario) return;

    this.cargaPerfiles().subscribe(perfiles => {
      const esGerenciaApi = (perfiles || []).some(p => p.idPerfil == 1 || p.idPerfil == 2 || p.idPerfil == 11);
      const nuevo = esGerenciaApi || this.esJolivares();

      if (nuevo !== this.esGerencia) {
        this.esGerencia = nuevo;
        // Si ahora es gerencia y no se cargaron las tareas de todos, recargar
        if (this.esGerencia && !this.datosCompletos && !this.cargando) {
          this.cargarDatos();
          return;
        }
        if (!this.esGerencia && this.tipoFiltro === 'todas') this.tipoFiltro = 'propias';
        this.actualizarSugerencias();
        this.reconstruir();
      }
    }, err => {
      console.warn('No se pudieron cargar perfiles, se mantiene la verificación alternativa:', err);
    });
  }

  private cargaPerfiles(): Observable<any> {
    const urlFull = configuracion.url;
    return this._http.get(urlFull + 'GetUsuariosPerfilesByIdUsuario/IdUsuario=' + this.usuarioActual.idUsuario)
      .map((res: Response) => res.json())
      .catch((error: any) => Observable.throw(error));
  }

  private esJolivares(): boolean {
    return !!(this.usuarioActual && this.usuarioActual.nombreUsuario &&
      this.usuarioActual.nombreUsuario.toLowerCase().indexOf('jolivares') !== -1);
  }

  // Misma regla alternativa que tenía el calendario (perfil, nombre de perfil/rol o ids conocidos)
  private determinarGerenciaAlternativa(): boolean {
    const u = this.usuarioActual;
    if (!u) return false;

    if (u.idPerfil == 1 || u.idPerfil == 2 || u.idPerfil == 11) return true;
    if (this.esJolivares()) return true;

    const textos = [u.nombrePerfil, u.perfil, u.rol, u.nombreCompleto, u.nombreUsuario]
      .filter(x => x !== null && x !== undefined)
      .map(x => String(x).toLowerCase());
    if (textos.some(x => x.indexOf('gerente') !== -1 || x.indexOf('director') !== -1 || x.indexOf('admin') !== -1)) {
      return true;
    }

    if (u.idUsuario == 1 || u.idUsuario == 2) return true;
    return false;
  }

  //*************************************************** Preferencias ***************************************************

  private guardarPreferencias(): void {
    try {
      localStorage.setItem('calTareas.vista', this.vista);
      localStorage.setItem('calTareas.tipo', this.tipoFiltro);
      localStorage.setItem('calTareas.resaltados', JSON.stringify(this.resaltados));
    } catch (e) { }
  }

  private restaurarPreferencias(): void {
    try {
      const vista = localStorage.getItem('calTareas.vista');
      if (vista === 'mes' || vista === 'semana') this.vista = vista;

      const tipo = localStorage.getItem('calTareas.tipo');
      if (tipo === 'propias' || tipo === 'creadas' || tipo === 'todas') this.tipoFiltro = tipo;

      const res = JSON.parse(localStorage.getItem('calTareas.resaltados') || '[]');
      if (Array.isArray(res)) {
        this.resaltados = res
          .filter(r => r && r.key && r.nombre && r.color)
          .slice(0, MAX_RESALTADOS);
      }
    } catch (e) { }
  }

  //*************************************************** Helpers de UI ***************************************************

  trackByTarea(index: number, t: CalTarea) { return t ? t.idTarea : index; }
  trackByDia(index: number, d: CalDia) { return d ? d.key : index; }
  trackByResp(index: number, r: RespResaltado) { return r ? r.key : index; }
  trackByValue(index: number, item: any) { return item ? item.value : index; }

  colorEstado(id: number): string {
    if (id === 2) return '#4466ff';
    if (id === 5) return '#008844';
    if (id === 3) return '#d33d44';
    return '#87909e';
  }

  colorPrioridad(p: string): string {
    const n = this.normalizar(p);
    if (n === 'alta') return '#f50000';
    if (n === 'media') return '#f8ae00';
    if (n === 'baja') return '#4fc3f7';
    return '#c9cdd3';
  }

  getColorAvatar(nombre: string): string {
    const paleta = ['#89658f', '#4466ff', '#0ab4c7', '#00a86b', '#f8ae00', '#e16b16', '#d33d44', '#b660e0', '#5577aa'];
    const txt = (nombre || '').toString();
    let hash = 0;
    for (let i = 0; i < txt.length; i++) {
      hash = ((hash << 5) - hash) + txt.charCodeAt(i);
      hash |= 0;
    }
    return paleta[Math.abs(hash) % paleta.length];
  }

  getIniciales(nombre: string): string {
    const partes = (nombre || '').toString().trim().split(/[\s._-]+/).filter(p => p.length > 0);
    if (!partes.length) return '?';
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  fechaLarga(d: Date): string {
    if (!d) return '';
    return this.capitalizar(DIAS_LARGOS[d.getDay()]) + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' ' + d.getFullYear();
  }

  fechaCorta(d: Date): string {
    if (!d) return '';
    return this.pad(d.getDate()) + '/' + this.pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  mesCorto(d: Date): string {
    return d ? MESES_CORTOS[d.getMonth()] : '';
  }

  diasRelativos(d: Date): string {
    if (!d) return '';
    const diff = Math.round((this.soloFecha(d).getTime() - this.hoy().getTime()) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Mañana';
    if (diff === -1) return 'Ayer';
    if (diff < 0) return 'Hace ' + Math.abs(diff) + ' días';
    return 'En ' + diff + ' días';
  }

  private toast(titulo: string, icon: string = 'success'): void {
    try {
      Swal.fire({ title: titulo, icon: icon, timer: 2200, showConfirmButton: false, toast: true, position: 'top-end' });
    } catch (e) { }
  }

  //*************************************************** Helpers de fecha / texto ***************************************************

  private idYo(): number {
    return this.usuarioActual && this.usuarioActual.idUsuario ? +this.usuarioActual.idUsuario : 0;
  }

  private claveResponsable(id: number, nombre: string): string {
    return id > 0 ? 'u' + id : 'n' + this.normalizar(nombre);
  }

  private hoy(): Date {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private soloFecha(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private lunesDe(d: Date): Date {
    const dia = (d.getDay() + 6) % 7; // lunes = 0
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dia);
  }

  private domingoDe(d: Date): Date {
    const dia = (d.getDay() + 6) % 7;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - dia));
  }

  private mismoDia(a: Date, b: Date): boolean {
    return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  private claveDia(d: Date): string {
    return d.getFullYear() + '-' + this.pad(d.getMonth() + 1) + '-' + this.pad(d.getDate());
  }

  private pad(n: number): string {
    return (n < 10 ? '0' : '') + n;
  }

  private capitalizar(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  private limpiarTexto(s: string): string {
    return (s || '').toString()
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizar(s: any): string {
    let txt = (s || '').toString().toLowerCase();
    try { txt = txt.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { }
    return txt;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = (hex || '').replace('#', '');
    if (h.length !== 6) return hex;
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  private parseFechaLocal(valor: any): Date | null {
    if (!valor) return null;
    if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;

    if (typeof valor === 'string') {
      const s = valor.trim();
      if (!s) return null;

      const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m1) {
        const d = new Date(+m1[3], +m1[2] - 1, +m1[1]);
        return isNaN(d.getTime()) ? null : d;
      }

      const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m2) {
        const d = new Date(+m2[1], +m2[2] - 1, +m2[3]);
        return isNaN(d.getTime()) ? null : d;
      }

      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }

    if (typeof valor === 'number') {
      const d = new Date(valor);
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  }
}