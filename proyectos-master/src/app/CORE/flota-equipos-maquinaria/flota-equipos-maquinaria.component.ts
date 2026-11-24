import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/storage';

export interface TipoDocFlota {
  key: string;
  nombre: string;
  icono: string;
  vence: boolean;      // tiene fecha de vencimiento
  requerido: boolean;  // cuenta para el % y la acreditación
}

// Catálogo de todos los documentos posibles
export const TIPOS_DOC_FLOTA: TipoDocFlota[] = [
  { key: 'permisoCirculacion', nombre: 'Permiso de circulación',  icono: 'fa-id-card-o',     vence: true,  requerido: true },
  { key: 'soap',               nombre: 'SOAP',                    icono: 'fa-medkit',        vence: true,  requerido: true },
  { key: 'revisionTecnica',    nombre: 'Revisión técnica',        icono: 'fa-wrench',        vence: true,  requerido: true },
  { key: 'polizaSeguro',       nombre: 'Póliza de seguro',        icono: 'fa-shield',        vence: true,  requerido: true },
  { key: 'padron',             nombre: 'Padrón',                  icono: 'fa-file-text-o',   vence: false, requerido: true },
  { key: 'certificacion',      nombre: 'Certificado de inspección', icono: 'fa-certificate', vence: true,  requerido: true },
  { key: 'mantencion',         nombre: 'Mantención preventiva',   icono: 'fa-cogs',          vence: true,  requerido: true },
  // Equipos: el vencimiento va en la ficha del equipo, aquí solo se adjuntan respaldos
  { key: 'certificadoEquipo',  nombre: 'Certificado / Acta',      icono: 'fa-certificate',   vence: false, requerido: false },
  { key: 'informeCalibracion', nombre: 'Informe de calibración',  icono: 'fa-tachometer',    vence: false, requerido: false },
  { key: 'otros',              nombre: 'Otros',                   icono: 'fa-folder-open-o', vence: false, requerido: false }
];

// Configuración de cada pestaña
export const CATEGORIAS_FLOTA: any[] = [
  {
    key: 'vehiculo',
    nombre: 'Vehículos',
    singular: 'vehículo',
    icono: 'fa-truck',
    tipos: ['Automóvil', 'Camioneta', 'Camión', 'Furgón', 'Bus', 'Minibús', 'Motocicleta', 'Rampla / Remolque', 'Otro'],
    docs: ['permisoCirculacion', 'soap', 'revisionTecnica', 'polizaSeguro', 'padron', 'otros'],
    muestraPatente: true,
    labelPatente: 'Patente',
    labelCodigo: 'N° chasis / VIN',
    labelIdent: 'Patente',
    muestraKm: true,
    muestraHoro: false,
    requeridos: ['patente', 'marca', 'modelo', 'anio', 'color', 'tipo', 'combustible', 'fechaInicio', 'kilometraje']
  },
  {
    key: 'maquinaria',
    nombre: 'Maquinarias',
    singular: 'maquinaria',
    icono: 'fa-cogs',
    tipos: ['Retroexcavadora', 'Excavadora', 'Cargador frontal', 'Minicargador', 'Bulldozer', 'Motoniveladora', 'Rodillo compactador',
            'Grúa', 'Grúa horquilla', 'Manipulador telescópico', 'Plataforma elevadora', 'Camión pluma', 'Otro'],
    docs: ['permisoCirculacion', 'soap', 'revisionTecnica', 'polizaSeguro', 'padron', 'certificacion', 'mantencion', 'otros'],
    muestraPatente: true,
    labelPatente: 'Patente (si tiene)',
    labelCodigo: 'N° de serie',
    labelIdent: 'Patente',
    muestraKm: false,
    muestraHoro: true,
    requeridos: ['marca', 'tipo']
  },
  {
    key: 'equipo',
    nombre: 'Equipos',
    singular: 'equipo',
    icono: 'fa-plug',
    tipos: [],
    docs: ['certificadoEquipo', 'informeCalibracion', 'otros'],
    muestraPatente: false,
    labelPatente: 'Patente',
    labelCodigo: 'N° serie',
    labelIdent: 'N° serie',
    muestraKm: false,
    muestraHoro: false,
    requeridos: ['nombre', 'codigo', 'fechaCertificacion', 'vencimientoCertificacion']
  }
];

const DIAS_AVISO = 30;
const MAX_DOC_MB = 20;
const MAX_FOTO_MB = 5;

@Component({
  selector: 'app-flota-equipos-maquinaria',
  templateUrl: './flota-equipos-maquinaria.component.html',
  styleUrls: ['./flota-equipos-maquinaria.component.css']
})
export class FlotaEquiposMaquinariaComponent implements OnInit, OnDestroy {

  categorias = CATEGORIAS_FLOTA;
  tiposDoc = TIPOS_DOC_FLOTA;
  combustibles = ['Diesel / Petróleo', 'Bencina', 'Eléctrico', 'Híbrido', 'Gas (GLP / GNC)', 'No aplica'];
  marcas = ['ATLAS COPCO', 'BOBCAT', 'CASE', 'CATERPILLAR', 'CHEVROLET', 'DOOSAN', 'FORD', 'GENIE', 'HITACHI',
            'HYUNDAI', 'IVECO', 'JCB', 'JLG', 'JOHN DEERE', 'KIA', 'KOMATSU', 'MACK', 'MAXUS', 'MERCEDES-BENZ',
            'MITSUBISHI MOTORS', 'NISSAN', 'PEUGEOT', 'RENAULT', 'SCANIA', 'SSANGYONG', 'TOYOTA', 'VOLKSWAGEN', 'VOLVO'];
  frecuencias = ['1 AÑO', '2 AÑOS', '3 AÑOS', '5 AÑOS', '7 AÑOS', 'PERMANENTE', 'Por necesidad del Proyecto'];
  ubicacionesBase = ['OBRA', 'TALLER', 'OFICINA'];
  // Maquinaria
  estadosOperativos = ['OPERATIVA', 'EN MANTENCIÓN', 'FUERA DE SERVICIO', 'DEVUELTA'];
  propiedades = ['ARRIENDO', 'PROPIA'];
  meses = ['N/A', 'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO',
           'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  horasAvisoRevision = 50;

  etiquetasCampo: any = {
    patente: 'Patente', codigo: 'N° de serie', marca: 'Marca', modelo: 'Modelo', anio: 'Año', color: 'Color',
    tipo: 'Tipo', combustible: 'Tipo de combustible', fechaInicio: 'Fecha de inicio', kilometraje: 'Kilometraje',
    horometro: 'Horómetro', nombre: 'Instrumento o equipo', fechaCertificacion: 'Fecha certificación',
    vencimientoCertificacion: 'Vencimiento certificación'
  };

  // Pestañas
  tabActiva = 'vehiculo';
  conteo: any = {};

  // Lista
  vehiculos: any[] = [];
  filtrados: any[] = [];
  cargando = true;
  errorCarga = '';
  busqueda = '';
  filtroEstado = 'activos';
  filtroAcreditado = 'todos';
  filtroUbicacion = 'todas';
  ubicaciones: string[] = [];
  kpiTotal = 0;
  kpiAcreditados = 0;
  kpiVencidos = 0;
  kpiPorVencer = 0;

  // Formulario
  formAbierto = false;
  modoForm = 'nuevo';
  form: any = {};
  fotoFile: File = null;
  fotoPreview: string = null;
  guardando = false;
  errorForm = '';

  // Detalle
  detalleAbierto = false;
  vehSel: any = null;
  docsSel: TipoDocFlota[] = [];
  fechasEdit: any = {};
  subiendo: any = {};
  descOtro = '';
  msgDetalle = '';

  // Eliminar
  eliminandoId: string = null;

  // Importar desde Excel (equipos / maquinarias)
  importAbierto = false;
  importCat = 'equipo';
  textoImport = '';
  filasImport: any[] = [];
  importando = false;
  msgImport = '';

  // ── Mantenimiento (colección flotaMantenciones) ──
  clasificacionesMant = ['Mantención', 'Reparación', 'Neumáticos', 'Carrocería', 'Siniestro', 'Revisión técnica', 'Equipamiento', 'Otro'];
  mantenciones: any[] = [];
  mantFiltradas: any[] = [];
  cargandoMant = true;
  errorMant = '';
  busqMant = '';
  filtroPatMant = 'todas';
  filtroAnioMant = 'todos';
  filtroClasMant = 'todas';
  patentesMant: string[] = [];
  aniosMant: string[] = [];
  talleresMant: string[] = [];
  kpiMantTotal = 0;
  kpiMantMonto = 0;
  kpiMantMontoAnio = 0;
  kpiMantVehiculos = 0;
  anioActual = new Date().getFullYear();
  mantSel: any[] = [];
  // Orden de la tabla de mantenciones: por N° doc. (por defecto) o por fecha
  ordenMant: string = 'doc';     // 'doc' | 'fecha'
  dirMant: number = -1;          // -1 = mayor primero, 1 = menor primero

  formMantAbierto = false;
  formMant: any = {};
  archivosMantNuevos: File[] = [];
  pathsMantBorrar: string[] = [];
  guardandoMant = false;
  errorFormMant = '';

  private db: any;
  private storage: any;
  private unsub: any = null;
  private unsubMant: any = null;
  private timerBusqMant: any = null;
  private timerBusqueda: any = null;

  constructor(private zone: NgZone) { }

  ngOnInit() {
    this.db = firebase.firestore();
    this.storage = firebase.storage();

    this.unsub = this.db.collection('flota').onSnapshot((snap: any) => {
      this.zone.run(() => {
        const lista: any[] = [];
        snap.forEach((d: any) => {
          const v = d.data();
          v.id = d.id;
          v.categoria = this.categoriaDe(v);
          this.calcularResumen(v);
          lista.push(v);
        });
        lista.sort((a, b) => this.compararOrden(a, b));
        this.vehiculos = lista;
        this.cargando = false;
        this.aplicarFiltro();

        if (this.vehSel) {
          const actual = lista.find(x => x.id === this.vehSel.id);
          if (actual) { this.vehSel = actual; }
        }
      });
    }, (err: any) => {
      this.zone.run(() => {
        this.cargando = false;
        this.errorCarga = 'No se pudo cargar la flota: ' + (err && err.message ? err.message : err);
      });
    });

    this.unsubMant = this.db.collection('flotaMantenciones').onSnapshot((snap: any) => {
      this.zone.run(() => {
        const lista: any[] = [];
        snap.forEach((d: any) => {
          const m = d.data();
          m.id = d.id;
          m._anio = m.fecha ? m.fecha.substr(0, 4) : '';
          lista.push(m);
        });
        this.mantenciones = this.ordenarMant(lista);
        this.cargandoMant = false;
        this.errorMant = '';
        this.aplicarFiltroMant();
      });
    }, (err: any) => {
      this.zone.run(() => {
        this.cargandoMant = false;
        this.errorMant = 'No se pudieron cargar las mantenciones: ' + this.msgError(err) +
          ' (¿agregaste la colección flotaMantenciones a las reglas de Firestore?)';
      });
    });
  }

  ngOnDestroy() {
    if (this.unsub) { this.unsub(); }
    if (this.unsubMant) { this.unsubMant(); }
    clearTimeout(this.timerBusqueda);
    clearTimeout(this.timerBusqMant);
  }

  // ───────────────────────── Categorías ─────────────────────────

  cat(key: string): any {
    return this.categorias.find(c => c.key === key) || this.categorias[0];
  }

  get catActual(): any {
    return this.cat(this.tabActiva);
  }

  get catForm(): any {
    return this.cat(this.form.categoria);
  }

  get esTabEquipo(): boolean {
    return this.tabActiva === 'equipo';
  }

  get esFormEquipo(): boolean {
    return this.form.categoria === 'equipo';
  }

  get esTabMant(): boolean {
    return this.tabActiva === 'mantenimiento';
  }

  get esTabMaq(): boolean {
    return this.tabActiva === 'maquinaria';
  }

  get esFormMaq(): boolean {
    return this.form.categoria === 'maquinaria';
  }

  // Registros antiguos sin categoría: se deducen por el tipo
  categoriaDe(v: any): string {
    if (v.categoria) { return v.categoria; }
    if (v.tipo === 'Maquinaria') { return 'maquinaria'; }
    if (v.tipo === 'Dron') { return 'equipo'; }
    return 'vehiculo';
  }

  cambiarTab(key: string) {
    this.tabActiva = key;
    if (key === 'mantenimiento') { this.aplicarFiltroMant(); }
    this.filtroAcreditado = 'todos';
    this.filtroUbicacion = 'todas';
    this.aplicarFiltro();
  }

  tiposDocDe(v: any): TipoDocFlota[] {
    const keys: string[] = this.cat(v.categoria).docs;
    return keys.map(k => this.tiposDoc.find(t => t.key === k)).filter(t => !!t);
  }

  tiposParaForm(): string[] {
    const lista = this.catForm.tipos.slice();
    if (this.form.tipo && lista.indexOf(this.form.tipo) < 0) { lista.unshift(this.form.tipo); }
    return lista;
  }

  esReq(campo: string): boolean {
    return this.catForm.requeridos.indexOf(campo) >= 0;
  }

  ident(v: any): string {
    return (v && (v.patente || v.codigo)) || '';
  }

  titulo(v: any): string {
    if (!v) { return ''; }
    if (v.categoria === 'equipo') { return v.nombre || 'Equipo'; }
    return ((v.marca || '') + ' ' + (v.modelo || '')).trim();
  }

  numeroDe(v: any): number {
    const n = parseInt(v && v.numero, 10);
    return isNaN(n) ? 99999 : n;
  }

  compararOrden(a: any, b: any): number {
    if (a.categoria === 'equipo' && b.categoria === 'equipo') {
      const d = this.numeroDe(a) - this.numeroDe(b);
      if (d !== 0) { return d; }
      return (a.nombre || '').localeCompare(b.nombre || '');
    }
    return this.ident(a).localeCompare(this.ident(b));
  }

  siguienteNumero(): number {
    let max = 0;
    this.vehiculos.forEach(v => {
      if (v.categoria !== 'equipo') { return; }
      const n = parseInt(v.numero, 10);
      if (!isNaN(n) && n > max) { max = n; }
    });
    return max + 1;
  }

  // ───────────────────────── Utilidades ─────────────────────────

  trackById(i: number, v: any) { return v.id; }
  trackByPath(i: number, a: any) { return a.path; }

  normalizar(s: any): string {
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  limpiarNombre(nombre: string): string {
    return (nombre || 'archivo')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '_');
  }

  parseFecha(s: string): Date {
    if (!s) { return null; }
    const p = s.split('-');
    if (p.length !== 3) { return null; }
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  formatoFecha(s: string, vacio?: string): string {
    if (!s) { return vacio || '—'; }
    const p = s.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s;
  }

  // Convierte "24/04/2026", "24-04-26" o "2026-04-24" a "2026-04-24". "N/A" o vacío → ""
  fechaDesdeExcel(s: string): string {
    const t = (s || '').trim();
    if (!t || /^n\s*\/?\s*a$/i.test(t) || t === '-') { return ''; }
    let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) { return m[1] + '-' + this.dos(m[2]) + '-' + this.dos(m[3]); }
    m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) {
      const anio = m[3].length === 2 ? '20' + m[3] : m[3];
      return anio + '-' + this.dos(m[2]) + '-' + this.dos(m[1]);
    }
    return '';
  }

  // "587,90" → 587.9 ; "1.234,5" → 1234.5 ; vacío / N/A → ''
  numDesdeExcel(s: string): any {
    const t = (s || '').trim();
    if (!t || /^n\s*\/?\s*a$/i.test(t)) { return ''; }
    let limpio = t.replace(/[^0-9,.\-]/g, '');
    if (limpio.indexOf(',') >= 0) { limpio = limpio.replace(/\./g, '').replace(',', '.'); }
    const n = parseFloat(limpio);
    return isNaN(n) ? '' : n;
  }

  mesDesdeExcel(s: string): string {
    const t = this.normalizar(s);
    if (!t || /^n\s*\/?\s*a$/.test(t)) { return 'N/A'; }
    const m = this.meses.find(x => x !== 'N/A' && this.normalizar(x).substr(0, 3) === t.substr(0, 3));
    return m || (s || '').trim().toUpperCase();
  }

  tipoNormalizado(catKey: string, s: string): string {
    const t = (s || '').trim();
    if (!t) { return this.cat(catKey).tipos[0] || ''; }
    const hit = this.cat(catKey).tipos.find((x: string) => this.normalizar(x) === this.normalizar(t));
    return hit || (t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
  }

  fmtNum(n: any): string {
    if (n === '' || n === null || n === undefined || isNaN(+n)) { return '—'; }
    return (+n).toLocaleString('es-CL', { maximumFractionDigits: 2 });
  }

  get mesActual(): string {
    return this.meses[new Date().getMonth() + 1];
  }

  // Parser TSV que respeta celdas entre comillas (Excel las usa cuando la celda tiene saltos de línea)
  parseTSV(texto: string): string[][] {
    const filas: string[][] = [];
    let fila: string[] = [];
    let campo = '';
    let enComillas = false;
    const t = (texto || '').replace(/\r\n?/g, '\n');
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (enComillas) {
        if (ch === '"') {
          if (t[i + 1] === '"') { campo += '"'; i++; } else { enComillas = false; }
        } else {
          campo += ch;
        }
      } else if (ch === '"' && campo === '') {
        enComillas = true;
      } else if (ch === '\t') {
        fila.push(campo); campo = '';
      } else if (ch === '\n') {
        fila.push(campo); filas.push(fila); fila = []; campo = '';
      } else {
        campo += ch;
      }
    }
    if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
    return filas
      .map(f => f.map(x => (x || '').replace(/\s+/g, ' ').trim()))
      .filter(f => f.some(x => !!x));
  }

  dos(n: any): string {
    const s = String(n);
    return s.length === 1 ? '0' + s : s;
  }

  diasHasta(s: string): number {
    const f = this.parseFecha(s);
    if (!f) { return null; }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((f.getTime() - hoy.getTime()) / 86400000);
  }

  msgError(e: any): string {
    return e && e.message ? e.message : String(e);
  }

  vacio(x: any): boolean {
    return x === null || x === undefined || (typeof x === 'string' && !x.trim());
  }

  subirStorage(path: string, file: File): Promise<any> {
    const ref = this.storage.ref().child(path);
    return new Promise((resolve, reject) => {
      ref.put(file)
        .then(() => ref.getDownloadURL())
        .then((url: string) => resolve({ url: url, path: path }))
        .catch(reject);
    });
  }

  // ───────────────────────── Estados ─────────────────────────

  docDe(v: any, key: string): any {
    return (v && v.documentos && v.documentos[key]) || {};
  }

  archivosDe(v: any, key: string): any[] {
    return this.docDe(v, key).archivos || [];
  }

  archivosOrdenados(v: any, key: string): any[] {
    return this.archivosDe(v, key).slice().sort((a, b) => (b.subido || 0) - (a.subido || 0));
  }

  estadoDoc(v: any, t: TipoDocFlota): any {
    const d = this.docDe(v, t.key);
    if (d.noAplica) { return { codigo: 'na', texto: 'No aplica' }; }
    const archivos = d.archivos || [];

    if (!t.requerido) {
      return archivos.length
        ? { codigo: 'info', texto: archivos.length + ' archivo(s)' }
        : { codigo: 'na', texto: 'Sin archivos' };
    }
    if (!archivos.length) { return { codigo: 'sin', texto: 'Sin documento' }; }
    if (!t.vence) { return { codigo: 'vigente', texto: 'Vigente' }; }
    if (!d.fechaVencimiento) { return { codigo: 'sinfecha', texto: 'Falta fecha de vencimiento' }; }
    return this.estadoPorFecha(d.fechaVencimiento);
  }

  estadoPorFecha(venc: string): any {
    const dias = this.diasHasta(venc);
    if (dias === null) { return { codigo: 'sinfecha', texto: 'Sin fecha' }; }
    if (dias < 0) { return { codigo: 'vencido', texto: 'Vencido', dias: dias }; }
    if (dias <= DIAS_AVISO) { return { codigo: 'porvencer', texto: dias === 0 ? 'Vence hoy' : 'Por vencer', dias: dias }; }
    return { codigo: 'vigente', texto: 'Vigente', dias: dias };
  }

  estadoEquipo(v: any): any {
    const dias = this.diasHasta(v.vencimientoCertificacion);
    if (v.activo === false) { return { codigo: 'retirado', texto: 'Retirado', dias: dias }; }
    return this.estadoPorFecha(v.vencimientoCertificacion);
  }

  calcularResumen(v: any) {
    if (v.categoria === 'equipo') {
      const st = this.estadoEquipo(v);
      v._estadoEq = st;
      v._dias = this.diasHasta(v.vencimientoCertificacion);
      v._acreditado = st.codigo === 'vigente' || st.codigo === 'porvencer';
      v._vencidos = st.codigo === 'vencido' ? 1 : 0;
      v._porVencer = st.codigo === 'porvencer' ? 1 : 0;
      v._pct = v._acreditado ? 100 : 0;
      return;
    }

    let req = 0, ok = 0, vencidos = 0, porVencer = 0;
    this.tiposDocDe(v).forEach(t => {
      if (!t.requerido) { return; }
      const st = this.estadoDoc(v, t);
      if (st.codigo === 'na') { return; }
      req++;
      if (st.codigo === 'vigente' || st.codigo === 'porvencer') { ok++; }
      if (st.codigo === 'vencido') { vencidos++; }
      if (st.codigo === 'porvencer') { porVencer++; }
    });
    v._pct = req ? Math.round(ok * 100 / req) : 100;
    v._acreditado = ok === req;
    v._vencidos = vencidos;
    v._porVencer = porVencer;

    if (v.categoria === 'maquinaria') {
      const act = v.horometro;
      const prox = v.horoProxRevision;
      if (prox !== '' && prox !== null && prox !== undefined && act !== '' && act !== null && act !== undefined) {
        v._horasFalta = Math.round((+prox - +act) * 100) / 100;
        v._revEstado = v._horasFalta <= 0 ? 'vencido' : v._horasFalta <= this.horasAvisoRevision ? 'porvencer' : 'vigente';
      } else {
        v._horasFalta = null;
        v._revEstado = 'sinfecha';
      }
      v._estadoOp = v.estadoOperativo || 'OPERATIVA';
    }
  }

  claseEstadoOp(e: string): string {
    const t = this.normalizar(e);
    if (t.indexOf('operativ') === 0) { return 'fl-chip-vigente'; }
    if (t.indexOf('mantenc') >= 0) { return 'fl-chip-porvencer'; }
    if (t.indexOf('fuera') >= 0) { return 'fl-chip-vencido'; }
    return 'fl-chip-retirado';
  }

  // ───────────────────────── Lista / filtros ─────────────────────────

  onBuscar() {
    clearTimeout(this.timerBusqueda);
    this.timerBusqueda = setTimeout(() => this.aplicarFiltro(), 250);
  }

  aplicarFiltro() {
    const q = this.normalizar(this.busqueda);

    // Conteo de activos por pestaña
    const conteo: any = {};
    this.categorias.forEach(c => { conteo[c.key] = 0; });
    this.vehiculos.forEach(v => { if (v.activo !== false) { conteo[v.categoria] = (conteo[v.categoria] || 0) + 1; } });
    this.conteo = conteo;

    const deTab = this.vehiculos.filter(v => v.categoria === this.tabActiva);

    // Ubicaciones disponibles (equipos)
    const ubic: string[] = this.ubicacionesBase.slice();
    deTab.forEach(v => {
      const u = (v.ubicacion || '').trim().toUpperCase();
      if (u && ubic.indexOf(u) < 0) { ubic.push(u); }
    });
    this.ubicaciones = ubic;

    this.filtrados = deTab.filter(v => {
      if (this.filtroEstado === 'activos' && v.activo === false) { return false; }
      if (this.filtroEstado === 'inactivos' && v.activo !== false) { return false; }

      const fa = this.filtroAcreditado;
      if (fa === 'si' && !v._acreditado) { return false; }
      if (fa === 'no' && v._acreditado) { return false; }
      if (v.categoria === 'equipo' && (fa === 'vigente' || fa === 'porvencer' || fa === 'vencido') &&
          (!v._estadoEq || v._estadoEq.codigo !== fa)) { return false; }
      if (v.categoria === 'maquinaria' && (fa === 'porvencer' || fa === 'vencido') && v._revEstado !== fa) { return false; }
      if (v.categoria === 'maquinaria' && fa.indexOf('op:') === 0 && v._estadoOp !== fa.substr(3)) { return false; }

      if (this.esTabEquipo && this.filtroUbicacion !== 'todas' &&
          (v.ubicacion || '').trim().toUpperCase() !== this.filtroUbicacion) { return false; }

      if (!q) { return true; }
      const txt = this.normalizar([v.numero, v.nombre, v.marcaModelo, v.patente, v.codigo, v.marca, v.modelo, v.tipo,
                                   v.color, v.gerencia, v.nombreServicio, v.ubicacion, v.observacion, v.contrato, v.estadoOperativo].join(' '));
      return txt.indexOf(q) >= 0;
    });

    const activos = deTab.filter(v => v.activo !== false);
    this.kpiTotal = activos.length;
    if (this.esTabMaq) {
      this.kpiAcreditados = activos.filter(v => v._estadoOp === 'OPERATIVA').length;
      this.kpiPorVencer = activos.filter(v => v._revEstado === 'porvencer').length;
      this.kpiVencidos = activos.filter(v => v._revEstado === 'vencido').length;
    } else {
      this.kpiAcreditados = activos.filter(v => v._acreditado).length;
      this.kpiVencidos = activos.filter(v => v._vencidos > 0).length;
      this.kpiPorVencer = activos.filter(v => v._porVencer > 0).length;
    }

    if (this.esTabMant) { this.aplicarFiltroMant(); }
  }

  // ───────────────────────── Crear / editar ─────────────────────────

  formVacio(categoria: string): any {
    const c = this.cat(categoria);
    return {
      categoria: c.key,
      // vehículos / maquinarias
      patente: '', codigo: '', marca: '', modelo: '', anio: new Date().getFullYear(), color: '',
      tipo: c.tipos.length ? c.tipos[0] : '', combustible: '', fechaInicio: '', fechaTermino: '',
      kilometraje: 0, horometro: c.key === 'maquinaria' ? '' : 0, gerencia: '', nombreServicio: '',
      // equipos
      numero: this.siguienteNumero(), nombre: '', marcaModelo: '', fechaCalibracion: '', fechaCertificacion: '',
      vencimientoCertificacion: '', frecuencia: '', ubicacion: '', observacion: '',
      // maquinarias
      propiedad: 'ARRIENDO', contrato: '', estadoOperativo: 'OPERATIVA',
      horoUltRevision: '', horoProxRevision: '', mesRevisionTecnica: 'N/A', mesRevisionGases: 'N/A',
      activo: true
    };
  }

  nuevo() {
    this.modoForm = 'nuevo';
    this.form = this.formVacio(this.tabActiva);
    this.fotoFile = null;
    this.fotoPreview = null;
    this.errorForm = '';
    this.formAbierto = true;
  }

  editar(v: any) {
    this.modoForm = 'editar';
    const f = this.formVacio(v.categoria);
    Object.keys(f).forEach(k => {
      if (v[k] !== undefined && v[k] !== null) { f[k] = v[k]; }
    });
    f.id = v.id;
    f.activo = v.activo !== false;
    f.fotoPathAnterior = v.fotoPath || '';
    if (v.categoria !== 'equipo') { f.tipo = v.tipo || f.tipo; }
    this.form = f;
    this.fotoFile = null;
    this.fotoPreview = v.fotoUrl || null;
    this.errorForm = '';
    this.formAbierto = true;
  }

  onCategoriaForm() {
    const c = this.catForm;
    if (c.tipos.length && c.tipos.indexOf(this.form.tipo) < 0) { this.form.tipo = c.tipos[0]; }
    this.errorForm = '';
  }

  cerrarForm() {
    if (this.guardando) { return; }
    this.formAbierto = false;
  }

  onFoto(ev: any) {
    const input = ev.target;
    const f: File = input.files && input.files[0];
    if (!f) { return; }
    if (!/^image\//.test(f.type)) {
      this.errorForm = 'La foto debe ser una imagen (JPG, PNG, etc.).';
      input.value = '';
      return;
    }
    if (f.size > MAX_FOTO_MB * 1024 * 1024) {
      this.errorForm = 'La foto no puede pesar más de ' + MAX_FOTO_MB + ' MB.';
      input.value = '';
      return;
    }
    this.errorForm = '';
    this.fotoFile = f;
    const reader = new FileReader();
    reader.onload = () => this.zone.run(() => { this.fotoPreview = reader.result as string; });
    reader.readAsDataURL(f);
  }

  guardar() {
    if (this.guardando) { return; }
    this.errorForm = '';
    const f = this.form;
    const c = this.catForm;
    let datos: any;

    if (c.key === 'equipo') {
      // ── Equipos / instrumentos ──
      const faltan: string[] = [];
      c.requeridos.forEach((campo: string) => { if (this.vacio(f[campo])) { faltan.push(this.etiquetasCampo[campo]); } });
      if (faltan.length) {
        this.errorForm = 'Completa: ' + faltan.join(', ') + '.';
        return;
      }
      if (f.vencimientoCertificacion < f.fechaCertificacion) {
        this.errorForm = 'El vencimiento no puede ser anterior a la fecha de certificación.';
        return;
      }
      datos = {
        categoria: 'equipo',
        numero: this.vacio(f.numero) ? '' : String(f.numero).trim(),
        nombre: (f.nombre || '').trim(),
        marcaModelo: (f.marcaModelo || '').trim(),
        codigo: (f.codigo || '').trim(),
        fechaCalibracion: f.fechaCalibracion || '',
        fechaCertificacion: f.fechaCertificacion || '',
        vencimientoCertificacion: f.vencimientoCertificacion || '',
        frecuencia: (f.frecuencia || '').trim(),
        ubicacion: (f.ubicacion || '').trim().toUpperCase(),
        observacion: (f.observacion || '').trim(),
        activo: f.activo !== false,
        actualizado: Date.now()
      };
    } else {
      // ── Vehículos / maquinarias ──
      const patente = c.muestraPatente ? (f.patente || '').toUpperCase().replace(/[\s.]/g, '').trim() : '';
      const codigo = (f.codigo || '').toString().trim().toUpperCase();
      const valores: any = Object.assign({}, f, { patente: patente, codigo: codigo });

      const faltan: string[] = [];
      c.requeridos.forEach((campo: string) => {
        if (this.vacio(valores[campo])) {
          faltan.push(campo === 'patente' ? c.labelPatente : campo === 'codigo' ? c.labelCodigo : this.etiquetasCampo[campo]);
        }
      });
      if (c.key === 'maquinaria' && !patente && !codigo) { faltan.push('Patente o N° de serie'); }
      if (faltan.length) {
        this.errorForm = 'Completa: ' + faltan.join(', ') + '.';
        return;
      }
      if (!this.vacio(f.anio)) {
        const anio = +f.anio;
        if (anio < 1950 || anio > new Date().getFullYear() + 1) {
          this.errorForm = 'El año no es válido.';
          return;
        }
      }
      if (f.fechaTermino && f.fechaInicio && f.fechaTermino < f.fechaInicio) {
        this.errorForm = 'La fecha de término no puede ser anterior a la de inicio.';
        return;
      }
      if (patente) {
        const dupPat = this.vehiculos.find(v => (v.patente || '').toUpperCase() === patente && v.id !== f.id);
        if (dupPat) {
          this.errorForm = 'Ya existe un registro con la patente ' + patente + '.';
          return;
        }
      }
      if (codigo) {
        const dupCod = this.vehiculos.find(v => (v.codigo || '').toUpperCase() === codigo && v.categoria === c.key && v.id !== f.id);
        if (dupCod) {
          this.errorForm = 'Ya existe un registro con ' + c.labelCodigo + ' ' + codigo + '.';
          return;
        }
      }
      datos = {
        categoria: c.key,
        patente: patente,
        codigo: codigo,
        marca: (f.marca || '').trim().toUpperCase(),
        modelo: (f.modelo || '').trim().toUpperCase(),
        anio: this.vacio(f.anio) ? '' : +f.anio,
        color: (f.color || '').trim().toUpperCase(),
        tipo: f.tipo,
        combustible: f.combustible || '',
        fechaInicio: f.fechaInicio || '',
        fechaTermino: f.fechaTermino || '',
        kilometraje: c.muestraKm ? (+f.kilometraje || 0) : 0,
        horometro: c.muestraHoro ? (this.vacio(f.horometro) ? '' : +f.horometro) : 0,
        gerencia: (f.gerencia || '').trim().toUpperCase(),
        nombreServicio: (f.nombreServicio || '').trim(),
        activo: f.activo !== false,
        actualizado: Date.now()
      };
      if (c.key === 'maquinaria') {
        if (!this.vacio(f.horoUltRevision) && !this.vacio(f.horoProxRevision) && +f.horoProxRevision < +f.horoUltRevision) {
          this.errorForm = 'La próxima revisión no puede ser menor que la última.';
          return;
        }
        datos.propiedad = f.propiedad || 'ARRIENDO';
        datos.contrato = (f.contrato || '').trim();
        datos.estadoOperativo = f.estadoOperativo || 'OPERATIVA';
        datos.horoUltRevision = this.vacio(f.horoUltRevision) ? '' : +f.horoUltRevision;
        datos.horoProxRevision = this.vacio(f.horoProxRevision) ? '' : +f.horoProxRevision;
        datos.mesRevisionTecnica = f.mesRevisionTecnica || 'N/A';
        datos.mesRevisionGases = f.mesRevisionGases || 'N/A';
        datos.observacion = (f.observacion || '').trim();
        datos.activo = datos.estadoOperativo !== 'DEVUELTA';
      }
    }

    this.guardando = true;
    const ref = f.id ? this.db.collection('flota').doc(f.id) : this.db.collection('flota').doc();
    if (!f.id) {
      datos.creado = Date.now();
      datos.documentos = {};
    }

    let paso: Promise<any> = Promise.resolve(null);
    if (this.fotoFile) {
      const path = 'flota/' + ref.id + '/foto/' + Date.now() + '_' + this.limpiarNombre(this.fotoFile.name);
      paso = this.subirStorage(path, this.fotoFile).then(r => {
        datos.fotoUrl = r.url;
        datos.fotoPath = r.path;
      });
    }

    paso
      .then(() => f.id ? ref.update(datos) : ref.set(datos))
      .then(() => {
        if (this.fotoFile && f.fotoPathAnterior) {
          this.storage.ref().child(f.fotoPathAnterior).delete().catch(() => { });
        }
        this.zone.run(() => {
          this.guardando = false;
          this.formAbierto = false;
          if (this.tabActiva !== c.key) { this.cambiarTab(c.key); }
        });
      })
      .catch((e: any) => {
        this.zone.run(() => {
          this.guardando = false;
          this.errorForm = 'Error al guardar: ' + this.msgError(e);
        });
      });
  }

  // ───────────────────────── Importar desde Excel (equipos / maquinarias) ─────────────────────────

  abrirImport() {
    this.importCat = this.tabActiva;
    this.textoImport = '';
    this.filasImport = [];
    this.msgImport = '';
    this.importAbierto = true;
  }

  cerrarImport() {
    if (this.importando) { return; }
    this.importAbierto = false;
  }

  parsearImport() {
    this.msgImport = '';
    const filasTxt = this.parseTSV(this.textoImport);
    this.filasImport = this.importCat === 'maquinaria' ? this.parsearMaquinarias(filasTxt)
      : this.importCat === 'mantenimiento' ? this.parsearMantenciones(filasTxt)
      : this.parsearEquipos(filasTxt);

    if (!this.filasImport.length && (this.textoImport || '').trim()) {
      this.msgImport = this.importCat === 'maquinaria'
        ? 'No se reconocieron filas. Copia desde Excel las columnas PATENTE a ESTADO (con o sin encabezado).'
        : this.importCat === 'mantenimiento'
        ? 'No se reconocieron filas. Copia desde Excel la planilla incluyendo la fila de encabezado (Patente, Nº DOC., ... Fecha).'
        : 'No se reconocieron filas. Copia desde Excel las columnas N° a OBSERVACIÓN (con o sin encabezado).';
    }
  }

  // Columnas: N° | INSTRUMENTO | MARCA-MODELO | N° SERIE | F. CALIBRACIÓN | F. CERTIFICACIÓN | VENCIMIENTO |
  //           DÍAS DISP. | ESTADO | FRECUENCIA | UBICACIÓN | OBSERVACIÓN
  parsearEquipos(filasTxt: string[][]): any[] {
    const clave = (n: any, s: any) => this.normalizar(n) + '|' + this.normalizar(s);
    const vistos: any = {};
    this.vehiculos.filter(v => v.categoria === 'equipo').forEach(e => { vistos[clave(e.nombre, e.codigo)] = true; });

    const filas: any[] = [];
    let ultimoNum = '';
    filasTxt.forEach(c => {
      if (this.normalizar(c.join(' ')).indexOf('instrumento') >= 0) { return; } // encabezado
      if (c.length < 7 || !c[1]) { return; }

      let num = c[0];
      if (num) { ultimoNum = num; } else { num = ultimoNum; }

      const fila: any = {
        numero: num,
        nombre: c[1],
        marcaModelo: c[2] || '',
        codigo: c[3] || '',
        fechaCalibracion: this.fechaDesdeExcel(c[4]),
        fechaCertificacion: this.fechaDesdeExcel(c[5]),
        vencimientoCertificacion: this.fechaDesdeExcel(c[6]),
        activo: this.normalizar(c[8]).indexOf('retirad') < 0,
        frecuencia: c[9] || '',
        ubicacion: (c[10] || '').toUpperCase(),
        observacion: c[11] || ''
      };
      const k = clave(fila.nombre, fila.codigo);
      fila._dup = !!vistos[k];
      vistos[k] = true;
      fila._estado = fila.activo === false
        ? { codigo: 'retirado', texto: 'Retirado' }
        : this.estadoPorFecha(fila.vencimientoCertificacion);
      filas.push(fila);
    });
    return filas;
  }

  // Columnas: PATENTE | ID UNIDAD (marca + modelo) | TIPO | KM/HORO ACTUAL | ÚLT. REVISIÓN | PRÓX. REVISIÓN |
  //           MES REV. TÉCNICA | MES REV. GASES | CONTRATO | OBS. | ESTADO
  parsearMaquinarias(filasTxt: string[][]): any[] {
    const vistos: any = {};
    this.vehiculos.forEach(v => { if (v.patente) { vistos[this.normalizar(v.patente)] = true; } });

    const filas: any[] = [];
    filasTxt.forEach(c => {
      const txt = this.normalizar(c.join(' '));
      if (txt.indexOf('patente') >= 0 || txt.indexOf('unidades en arriendo') >= 0) { return; } // títulos
      if (c.length < 6 || !c[0]) { return; }

      const partes = (c[1] || '').split(' ').filter(x => !!x);
      const marca = (partes.shift() || '').toUpperCase();
      const modelo = partes.join(' ').toUpperCase();
      const estado = (c[10] || '').trim().toUpperCase() || 'OPERATIVA';

      const fila: any = {
        patente: c[0].toUpperCase().replace(/[\s.]/g, ''),
        marca: marca,
        modelo: modelo,
        tipo: this.tipoNormalizado('maquinaria', c[2]),
        horometro: this.numDesdeExcel(c[3]),
        horoUltRevision: this.numDesdeExcel(c[4]),
        horoProxRevision: this.numDesdeExcel(c[5]),
        mesRevisionTecnica: this.mesDesdeExcel(c[6]),
        mesRevisionGases: this.mesDesdeExcel(c[7]),
        contrato: c[8] || '',
        observacion: c[9] || '',
        estadoOperativo: estado,
        propiedad: 'ARRIENDO'
      };
      const k = this.normalizar(fila.patente);
      fila._dup = !!vistos[k];
      vistos[k] = true;
      filas.push(fila);
    });
    return filas;
  }

  get filasNuevasImport(): any[] {
    return this.filasImport.filter(f => !f._dup);
  }

  datosImport(f: any): any {
    if (this.importCat === 'mantenimiento') {
      return {
        numeroDoc: f.numeroDoc,
        patente: f.patente,
        modelo: f.modelo,
        tipoMantencion: f.tipoMantencion,
        clasificacion: f.clasificacion,
        kilometraje: f.kilometraje,
        factura: f.factura,
        monto: f.monto,
        taller: f.taller,
        fecha: f.fecha,
        adjuntos: [],
        creado: Date.now(),
        actualizado: Date.now()
      };
    }
    const base: any = { documentos: {}, creado: Date.now(), actualizado: Date.now() };
    if (this.importCat === 'maquinaria') {
      return Object.assign(base, {
        categoria: 'maquinaria',
        patente: f.patente,
        codigo: '',
        marca: f.marca,
        modelo: f.modelo,
        tipo: f.tipo,
        anio: '',
        color: '',
        combustible: '',
        fechaInicio: '',
        fechaTermino: '',
        kilometraje: 0,
        horometro: f.horometro,
        horoUltRevision: f.horoUltRevision,
        horoProxRevision: f.horoProxRevision,
        mesRevisionTecnica: f.mesRevisionTecnica,
        mesRevisionGases: f.mesRevisionGases,
        contrato: f.contrato,
        observacion: f.observacion,
        estadoOperativo: f.estadoOperativo,
        propiedad: f.propiedad,
        gerencia: '',
        nombreServicio: '',
        activo: f.estadoOperativo !== 'DEVUELTA'
      });
    }
    return Object.assign(base, {
      categoria: 'equipo',
      numero: f.numero,
      nombre: f.nombre,
      marcaModelo: f.marcaModelo,
      codigo: f.codigo,
      fechaCalibracion: f.fechaCalibracion,
      fechaCertificacion: f.fechaCertificacion,
      vencimientoCertificacion: f.vencimientoCertificacion,
      frecuencia: f.frecuencia,
      ubicacion: f.ubicacion,
      observacion: f.observacion,
      activo: f.activo
    });
  }

  importar() {
    const nuevas = this.filasNuevasImport;
    if (!nuevas.length || this.importando) { return; }
    this.importando = true;
    this.msgImport = '';

    const lotes: any[][] = [];
    for (let i = 0; i < nuevas.length; i += 400) { lotes.push(nuevas.slice(i, i + 400)); }

    const cat = this.importCat;
    let cadena: Promise<any> = Promise.resolve(null);
    lotes.forEach(lote => {
      cadena = cadena.then(() => {
        const batch = this.db.batch();
        const col = cat === 'mantenimiento' ? 'flotaMantenciones' : 'flota';
        lote.forEach(f => batch.set(this.db.collection(col).doc(), this.datosImport(f)));
        return batch.commit();
      });
    });

    cadena
      .then(() => this.zone.run(() => {
        this.importando = false;
        this.importAbierto = false;
        if (cat !== 'mantenimiento') { this.filtroEstado = 'todos'; }
        this.cambiarTab(cat);
      }))
      .catch((e: any) => this.zone.run(() => {
        this.importando = false;
        this.msgImport = 'Error al importar: ' + this.msgError(e);
      }));
  }

  // Planilla de mantenciones: (adjunto) | Patente | Nº DOC. | Modelo | Tipo de Mantención | Kilometraje |
  //                           Nº Factura | Monto | Nombre Mecánico | Fecha   (con columnas vacías entre medio)
  parsearMantenciones(filasTxt: string[][]): any[] {
    // Posiciones por defecto (como viene la planilla) — se reemplazan si viene el encabezado
    let idx: any = { patente: 0, numeroDoc: 1, modelo: 2, tipo: 4, km: 6, factura: 7, monto: 9, taller: 12, fecha: 13 };
    let desde = 0;

    const headerIdx = filasTxt.findIndex(c => {
      const n = c.map(x => this.normalizar(x));
      return n.some(x => x.indexOf('patente') >= 0) && n.some(x => x.indexOf('fecha') >= 0);
    });
    if (headerIdx >= 0) {
      const h = filasTxt[headerIdx].map(x => this.normalizar(x));
      const buscar = (claves: string[]) => h.findIndex(x => claves.some(k => x.indexOf(k) >= 0));
      idx = {
        patente: buscar(['patente']),
        numeroDoc: buscar(['doc']),
        modelo: buscar(['modelo']),
        tipo: buscar(['mantencion', 'tipo']),
        km: buscar(['kilometr']),
        factura: buscar(['factura']),
        monto: buscar(['monto']),
        taller: buscar(['mecanic', 'taller']),
        fecha: buscar(['fecha'])
      };
      desde = headerIdx + 1;
    } else {
      // Sin encabezado: si casi todas las filas parten con una celda vacía (columna "adjunto"), correr 1
      const corridas = filasTxt.filter(c => !c[0] && !!c[1]).length;
      if (corridas > filasTxt.length / 2) {
        Object.keys(idx).forEach(k => { idx[k] = idx[k] + 1; });
      }
    }

    const vistos: any = {};
    const clave = (m: any) => m.numeroDoc
      ? 'n|' + m.numeroDoc + '|' + this.normPatente(m.patente)
      : 'p|' + this.normPatente(m.patente) + '|' + m.fecha + '|' + m.monto;
    this.mantenciones.forEach(m => { vistos[clave(m)] = true; });

    const filas: any[] = [];
    filasTxt.slice(desde).forEach(c => {
      const g = (i: number) => (i >= 0 ? (c[i] || '') : '');
      const patente = g(idx.patente);
      const tipo = g(idx.tipo);
      if (!patente || (!tipo && !g(idx.fecha))) { return; }
      if (this.normalizar(patente) === 'patente') { return; }

      let km: any = this.soloDigitos(g(idx.km));
      if (km === '') { km = this.kmDesdeTexto(tipo); }

      const fila: any = {
        numeroDoc: g(idx.numeroDoc),
        patente: this.normPatente(patente),
        modelo: g(idx.modelo),
        tipoMantencion: tipo,
        clasificacion: this.clasificarMant(tipo),
        kilometraje: km,
        factura: g(idx.factura),
        monto: this.soloDigitos(g(idx.monto)),
        taller: g(idx.taller),
        fecha: this.fechaDesdeExcel(g(idx.fecha))
      };
      const k = clave(fila);
      fila._dup = !!vistos[k];
      vistos[k] = true;
      filas.push(fila);
    });
    return filas;
  }

  // ───────────────────────── Mantenimiento ─────────────────────────

  // "HJ RV 87" → "HJRV87" ; textos largos (ej: "LHTH26 Y KVKD61") se dejan como vienen
  normPatente(s: string): string {
    const t = (s || '').toUpperCase().trim();
    const compacta = t.replace(/[\s.\-]/g, '');
    return compacta.length <= 8 ? compacta : t.replace(/\s+/g, ' ');
  }

  soloDigitos(s: any): any {
    const d = String(s === null || s === undefined ? '' : s).replace(/[^0-9]/g, '');
    return d ? +d : '';
  }

  // Saca el kilometraje de textos como "MANTENCION 110.000 KLMS" o "MANTENCIÓN 20,000 KMS"
  kmDesdeTexto(s: string): any {
    const m = (s || '').match(/(\d{1,3}(?:[.,]\d{3})+)\s*(?:KMS?|KLMS?)\b/i);
    return m ? +m[1].replace(/[.,]/g, '') : '';
  }

  clasificarMant(s: string): string {
    const t = this.normalizar(s);
    if (!t) { return 'Mantención'; }
    if (/siniestro|deducible/.test(t)) { return 'Siniestro'; }
    if (/revision tecnica/.test(t)) { return 'Revisión técnica'; }
    if (/mantenc/.test(t)) { return 'Mantención'; }
    if (/neumat/.test(t)) { return 'Neumáticos'; }
    if (/desabollad|pintura|parabrisas|choque|chapa/.test(t)) { return 'Carrocería'; }
    if (/equipam/.test(t)) { return 'Equipamiento'; }
    return 'Reparación';
  }

  claseClasMant(c: string): string {
    switch (c) {
      case 'Mantención': return 'fl-chip-vigente';
      case 'Reparación': return 'fl-chip-porvencer';
      case 'Siniestro': return 'fl-chip-vencido';
      case 'Carrocería': return 'fl-chip-car';
      case 'Neumáticos': return 'fl-chip-neu';
      default: return 'fl-chip-retirado';
    }
  }

  fmtMonto(n: any): string {
    if (n === '' || n === null || n === undefined || isNaN(+n)) { return '—'; }
    return '$ ' + (+n).toLocaleString('es-CL');
  }

  vehiculoPorPatente(p: string): any {
    const np = this.normPatente(p);
    if (!np) { return null; }
    return this.vehiculos.find(v => v.patente && this.normPatente(v.patente) === np) || null;
  }

  mantencionesDe(v: any): any[] {
    if (!v || !v.patente) { return []; }
    const np = this.normPatente(v.patente);
    return this.mantenciones.filter(m => this.normPatente(m.patente) === np);
  }

  totalMonto(lista: any[]): number {
    return lista.reduce((acc, m) => acc + (+m.monto || 0), 0);
  }

  onBuscarMant() {
    clearTimeout(this.timerBusqMant);
    this.timerBusqMant = setTimeout(() => this.aplicarFiltroMant(), 250);
  }

  aplicarFiltroMant() {
    const q = this.normalizar(this.busqMant);

    // Listas para filtros / autocompletar
    const pats: string[] = [];
    const anios: string[] = [];
    const talleres: string[] = [];
    this.vehiculos.forEach(v => {
      if (v.categoria !== 'equipo' && v.patente) {
        const p = this.normPatente(v.patente);
        if (pats.indexOf(p) < 0) { pats.push(p); }
      }
    });
    this.mantenciones.forEach(m => {
      const p = this.normPatente(m.patente);
      if (p && pats.indexOf(p) < 0) { pats.push(p); }
      if (m._anio && anios.indexOf(m._anio) < 0) { anios.push(m._anio); }
      const t = (m.taller || '').trim();
      if (t && talleres.indexOf(t) < 0) { talleres.push(t); }
    });
    this.patentesMant = pats.sort();
    this.aniosMant = anios.sort().reverse();
    this.talleresMant = talleres.sort();

    // Todos los filtros menos el año (para el total de todos los años)
    const sinAnio = this.mantenciones.filter(m => {
      if (this.filtroPatMant !== 'todas' && this.normPatente(m.patente) !== this.filtroPatMant) { return false; }
      if (this.filtroClasMant !== 'todas' && (m.clasificacion || '') !== this.filtroClasMant) { return false; }
      if (!q) { return true; }
      const txt = this.normalizar([m.numeroDoc, m.patente, m.modelo, m.tipoMantencion, m.factura, m.taller, m.clasificacion].join(' '));
      return txt.indexOf(q) >= 0;
    });
    // Además, el año elegido (y siempre en el orden elegido)
    this.mantFiltradas = this.ordenarMant(sinAnio.filter(m => this.filtroAnioMant === 'todos' || m._anio === this.filtroAnioMant));

    const vehs: any = {};
    this.mantFiltradas.forEach(m => { vehs[this.normPatente(m.patente)] = true; });
    this.kpiMantTotal = this.mantFiltradas.length;
    this.kpiMantMontoAnio = this.totalMonto(this.mantFiltradas);   // gasto del año del filtro
    this.kpiMantMonto = this.totalMonto(sinAnio);                  // gasto de todos los años
    this.kpiMantVehiculos = Object.keys(vehs).length;

    if (this.vehSel) { this.mantSel = this.mantencionesDe(this.vehSel); }
  }

  /**
   * Compara N° doc. como número ("2" < "10" < "100"), no como texto.
   * Los que traen letras ("A12", "12-B") se ordenan por su número y luego por el texto. Sin N° van al final.
   */
  private compararDoc(a: any, b: any): number {
    const sa = (a === null || a === undefined ? '' : String(a)).trim();
    const sb = (b === null || b === undefined ? '' : String(b)).trim();
    if (!sa && !sb) { return 0; }
    if (!sa) { return 1; }
    if (!sb) { return -1; }
    const na = parseInt(sa.replace(/[^0-9]/g, ''), 10);
    const nb = parseInt(sb.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) { return na - nb; }
    if (isNaN(na) !== isNaN(nb)) { return isNaN(na) ? 1 : -1; }
    return sa.localeCompare(sb, 'es', { numeric: true, sensitivity: 'base' });
  }

  /** Ordena por N° doc. o por fecha (con el otro como desempate). Los vacíos siempre quedan al final. */
  ordenarMant(lista: any[]): any[] {
    const dir = this.dirMant;
    const porFecha = (a: any, b: any) => {
      const fa = a.fecha || '', fb = b.fecha || '';
      if (!fa && !fb) { return 0; }
      if (!fa) { return 1; }
      if (!fb) { return -1; }
      return fa.localeCompare(fb) * dir;
    };
    const porDoc = (a: any, b: any) => {
      const vacioA = this.vacio(a.numeroDoc), vacioB = this.vacio(b.numeroDoc);
      if (vacioA || vacioB) { return vacioA === vacioB ? 0 : (vacioA ? 1 : -1); }
      return this.compararDoc(a.numeroDoc, b.numeroDoc) * dir;
    };
    return lista.slice().sort((a, b) => {
      const r = this.ordenMant === 'fecha' ? porFecha(a, b) : porDoc(a, b);
      if (r !== 0) { return r; }
      return this.ordenMant === 'fecha' ? porDoc(a, b) : porFecha(a, b);
    });
  }

  /** Clic en el encabezado "N° doc." o "Fecha": mismo campo invierte el orden; otro campo parte de mayor a menor. */
  cambiarOrdenMant(campo: string) {
    if (this.ordenMant === campo) {
      this.dirMant = -this.dirMant;
    } else {
      this.ordenMant = campo;
      this.dirMant = -1;
    }
    this.mantenciones = this.ordenarMant(this.mantenciones);
    this.aplicarFiltroMant();
  }

  iconoOrdenMant(campo: string): string {
    if (this.ordenMant !== campo) { return 'fa-sort'; }
    return this.dirMant < 0 ? 'fa-sort-desc' : 'fa-sort-asc';
  }

  siguienteNumeroDoc(): number {
    let max = 0;
    this.mantenciones.forEach(m => {
      const n = parseInt(String(m.numeroDoc || '').replace(/[^0-9]/g, ''), 10);
      if (!isNaN(n) && n > max) { max = n; }
    });
    return max + 1;
  }

  hoyISO(): string {
    const d = new Date();
    return d.getFullYear() + '-' + this.dos(d.getMonth() + 1) + '-' + this.dos(d.getDate());
  }

  nuevaMant(veh?: any) {
    this.formMant = {
      numeroDoc: String(this.siguienteNumeroDoc()),
      fecha: this.hoyISO(),
      patente: veh && veh.patente ? this.normPatente(veh.patente) : (this.filtroPatMant !== 'todas' ? this.filtroPatMant : ''),
      modelo: veh ? this.titulo(veh) : '',
      modeloAuto: !!veh,
      tipoMantencion: '',
      clasificacion: 'Mantención',
      clasManual: false,
      kilometraje: veh && veh.kilometraje ? veh.kilometraje : '',
      factura: '',
      monto: '',
      taller: '',
      adjuntos: []
    };
    if (!veh) { this.onPatenteMant(); }
    this.archivosMantNuevos = [];
    this.pathsMantBorrar = [];
    this.errorFormMant = '';
    this.formMantAbierto = true;
  }

  editarMant(m: any) {
    this.formMant = {
      id: m.id,
      numeroDoc: m.numeroDoc || '',
      fecha: m.fecha || '',
      patente: m.patente || '',
      modelo: m.modelo || '',
      modeloAuto: false,
      tipoMantencion: m.tipoMantencion || '',
      clasificacion: m.clasificacion || this.clasificarMant(m.tipoMantencion),
      clasManual: true,
      kilometraje: m.kilometraje !== undefined && m.kilometraje !== null ? m.kilometraje : '',
      factura: m.factura || '',
      monto: m.monto !== undefined && m.monto !== null ? m.monto : '',
      taller: m.taller || '',
      adjuntos: (m.adjuntos || []).slice()
    };
    this.archivosMantNuevos = [];
    this.pathsMantBorrar = [];
    this.errorFormMant = '';
    this.formMantAbierto = true;
  }

  cerrarFormMant() {
    if (this.guardandoMant) { return; }
    this.formMantAbierto = false;
  }

  // Modelo para una patente: primero el vehículo de la flota, si no, la última mantención registrada con esa patente
  modeloDePatente(p: string): string {
    const v = this.vehiculoPorPatente(p);
    if (v) { return this.titulo(v); }
    const np = this.normPatente(p);
    if (!np) { return ''; }
    const m = this.mantenciones.find(x => this.normPatente(x.patente) === np && !!x.modelo);
    return m ? m.modelo : '';
  }

  // Se llama mientras se escribe la patente: si ya existe, rellena el modelo al tiro
  onPatenteMant() {
    const f = this.formMant;
    const modelo = this.modeloDePatente(f.patente);
    if (modelo) {
      if (!f.modelo || f.modeloAuto) {
        f.modelo = modelo;
        f.modeloAuto = true;
      }
    } else if (f.modeloAuto) {
      f.modelo = '';
      f.modeloAuto = false;
    }
    const v = this.vehiculoPorPatente(f.patente);
    if (v && this.vacio(f.kilometraje) && v.kilometraje) { f.kilometraje = v.kilometraje; }
  }

  onModeloMant(valor: string) {
    this.formMant.modelo = valor;
    this.formMant.modeloAuto = false;
  }

  onTipoMant() {
    if (!this.formMant.clasManual) { this.formMant.clasificacion = this.clasificarMant(this.formMant.tipoMantencion); }
  }

  onArchivosMant(ev: any) {
    const input = ev.target;
    const files: File[] = Array.prototype.slice.call(input.files || []);
    input.value = '';
    this.errorFormMant = '';
    files.forEach(f => {
      if (f.size > MAX_DOC_MB * 1024 * 1024) {
        this.errorFormMant = '"' + f.name + '" pesa más de ' + MAX_DOC_MB + ' MB y no se agregó.';
        return;
      }
      this.archivosMantNuevos.push(f);
    });
  }

  quitarArchivoNuevoMant(i: number) {
    this.archivosMantNuevos.splice(i, 1);
  }

  quitarAdjuntoMant(a: any) {
    this.formMant.adjuntos = this.formMant.adjuntos.filter((x: any) => x.path !== a.path);
    if (a.path) { this.pathsMantBorrar.push(a.path); }
  }

  guardarMant() {
    if (this.guardandoMant) { return; }
    this.errorFormMant = '';
    const f = this.formMant;
    const faltan: string[] = [];
    if (!f.fecha) { faltan.push('Fecha'); }
    if (!(f.patente || '').trim()) { faltan.push('Patente'); }
    if (!(f.tipoMantencion || '').trim()) { faltan.push('Tipo de mantención'); }
    if (faltan.length) {
      this.errorFormMant = 'Completa: ' + faltan.join(', ') + '.';
      return;
    }

    this.guardandoMant = true;
    const ref = f.id ? this.db.collection('flotaMantenciones').doc(f.id) : this.db.collection('flotaMantenciones').doc();

    const subidas = this.archivosMantNuevos.map((file, i) => {
      const path = 'flota/mantenciones/' + ref.id + '/' + (Date.now() + i) + '_' + this.limpiarNombre(file.name);
      return this.subirStorage(path, file).then(r => ({ nombre: file.name, url: r.url, path: r.path, subido: Date.now() }));
    });

    Promise.all(subidas)
      .then((nuevos: any[]) => {
        const datos: any = {
          numeroDoc: (f.numeroDoc || '').toString().trim(),
          fecha: f.fecha,
          patente: this.normPatente(f.patente),
          modelo: (f.modelo || '').trim(),
          tipoMantencion: (f.tipoMantencion || '').trim(),
          clasificacion: f.clasificacion || this.clasificarMant(f.tipoMantencion),
          kilometraje: this.soloDigitos(f.kilometraje),
          factura: (f.factura || '').toString().trim(),
          monto: this.soloDigitos(f.monto),
          taller: (f.taller || '').trim(),
          adjuntos: (f.adjuntos || []).concat(nuevos),
          actualizado: Date.now()
        };
        if (!f.id) { datos.creado = Date.now(); }
        return f.id ? ref.update(datos) : ref.set(datos);
      })
      .then(() => {
        this.pathsMantBorrar.forEach(p => { this.storage.ref().child(p).delete().catch(() => { }); });
        this.zone.run(() => {
          this.guardandoMant = false;
          this.formMantAbierto = false;
        });
      })
      .catch((e: any) => this.zone.run(() => {
        this.guardandoMant = false;
        this.errorFormMant = 'Error al guardar: ' + this.msgError(e);
      }));
  }

  eliminarMant(m: any) {
    if (!m) { return; }
    const ok = confirm('¿Eliminar la mantención N° ' + (m.numeroDoc || '—') + ' de ' + m.patente + ' (' + this.formatoFecha(m.fecha) + ')?\n\n' +
                       'Se borrarán también sus adjuntos. Esta acción no se puede deshacer.');
    if (!ok) { return; }
    const paths = (m.adjuntos || []).map((a: any) => a.path).filter((p: string) => !!p);
    this.db.collection('flotaMantenciones').doc(m.id).delete()
      .then(() => {
        paths.forEach((p: string) => { this.storage.ref().child(p).delete().catch(() => { }); });
        this.zone.run(() => { if (this.formMantAbierto && this.formMant.id === m.id) { this.formMantAbierto = false; } });
      })
      .catch((e: any) => this.zone.run(() => { alert('No se pudo eliminar: ' + this.msgError(e)); }));
  }

  eliminarMantDesdeForm() {
    const m = this.mantenciones.find(x => x.id === this.formMant.id);
    if (m) { this.eliminarMant(m); }
  }

  // ───────────────────────── Eliminar ─────────────────────────

  eliminarVehiculo(v: any) {
    if (!v || this.eliminandoId) { return; }
    const nombre = v.categoria === 'equipo'
      ? '"' + this.titulo(v) + '"' + (v.codigo ? ' (N° serie ' + v.codigo + ')' : '')
      : this.ident(v) + ' (' + this.titulo(v) + ')';
    const ok = confirm('¿Eliminar ' + this.cat(v.categoria).singular + ' ' + nombre + '?\n\n' +
                       'Se borrarán también su foto y todos sus documentos. Esta acción no se puede deshacer.');
    if (!ok) { return; }

    const paths: string[] = [];
    if (v.fotoPath) { paths.push(v.fotoPath); }
    this.tiposDoc.forEach(t => {
      this.archivosDe(v, t.key).forEach(a => { if (a.path) { paths.push(a.path); } });
    });

    this.eliminandoId = v.id;
    this.db.collection('flota').doc(v.id).delete()
      .then(() => {
        paths.forEach(p => { this.storage.ref().child(p).delete().catch(() => { }); });
        this.zone.run(() => {
          this.eliminandoId = null;
          if (this.vehSel && this.vehSel.id === v.id) { this.cerrarDetalle(); }
          if (this.formAbierto && this.form.id === v.id) { this.formAbierto = false; }
        });
      })
      .catch((e: any) => this.zone.run(() => {
        this.eliminandoId = null;
        alert('No se pudo eliminar: ' + this.msgError(e));
      }));
  }

  eliminarDesdeForm() {
    const v = this.vehiculos.find(x => x.id === this.form.id);
    if (v) { this.eliminarVehiculo(v); }
  }

  // ───────────────────────── Detalle ─────────────────────────

  verDetalle(v: any) {
    this.vehSel = v;
    this.docsSel = this.tiposDocDe(v);
    this.mantSel = this.mantencionesDe(v);
    this.fechasEdit = {};
    this.tiposDoc.forEach(t => {
      const d = this.docDe(v, t.key);
      this.fechasEdit[t.key] = {
        fechaEmision: d.fechaEmision || '',
        fechaVencimiento: d.fechaVencimiento || ''
      };
    });
    this.subiendo = {};
    this.descOtro = '';
    this.msgDetalle = '';
    this.detalleAbierto = true;
  }

  cerrarDetalle() {
    this.detalleAbierto = false;
    this.vehSel = null;
    this.docsSel = [];
  }

  editarDesdeDetalle() {
    const v = this.vehSel;
    this.cerrarDetalle();
    this.editar(v);
  }

  fechasCambiadas(t: TipoDocFlota): boolean {
    const d = this.docDe(this.vehSel, t.key);
    const fe = this.fechasEdit[t.key] || {};
    return (fe.fechaEmision || '') !== (d.fechaEmision || '') ||
           (fe.fechaVencimiento || '') !== (d.fechaVencimiento || '');
  }

  guardarFechas(t: TipoDocFlota) {
    const veh = this.vehSel;
    const fe = this.fechasEdit[t.key];
    this.msgDetalle = '';
    if (fe.fechaEmision && fe.fechaVencimiento && fe.fechaVencimiento < fe.fechaEmision) {
      this.msgDetalle = t.nombre + ': el vencimiento no puede ser anterior a la emisión.';
      return;
    }
    const upd: any = { actualizado: Date.now() };
    upd['documentos.' + t.key + '.fechaEmision'] = fe.fechaEmision || '';
    upd['documentos.' + t.key + '.fechaVencimiento'] = fe.fechaVencimiento || '';
    this.db.collection('flota').doc(veh.id).update(upd)
      .catch((e: any) => this.zone.run(() => { this.msgDetalle = 'Error al guardar fechas: ' + this.msgError(e); }));
  }

  toggleNoAplica(t: TipoDocFlota, valor: boolean) {
    const upd: any = { actualizado: Date.now() };
    upd['documentos.' + t.key + '.noAplica'] = !!valor;
    this.db.collection('flota').doc(this.vehSel.id).update(upd)
      .catch((e: any) => this.zone.run(() => { this.msgDetalle = 'Error: ' + this.msgError(e); }));
  }

  subirDoc(t: TipoDocFlota, ev: any) {
    const input = ev.target;
    const file: File = input.files && input.files[0];
    input.value = '';
    if (!file || !this.vehSel) { return; }
    this.msgDetalle = '';

    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      this.msgDetalle = 'El archivo no puede pesar más de ' + MAX_DOC_MB + ' MB.';
      return;
    }
    if (t.key === 'otros' && !(this.descOtro || '').trim()) {
      this.msgDetalle = 'En "Otros" escribe primero una descripción del documento.';
      return;
    }

    const veh = this.vehSel;
    const key = t.key;
    const desc = (this.descOtro || '').trim();
    this.subiendo[key] = true;

    const path = 'flota/' + veh.id + '/' + key + '/' + Date.now() + '_' + this.limpiarNombre(file.name);
    this.subirStorage(path, file)
      .then(r => {
        const archivo: any = { nombre: file.name, url: r.url, path: r.path, subido: Date.now() };
        if (key === 'otros') { archivo.descripcion = desc; }
        const lista = this.archivosDe(veh, key).slice();
        lista.push(archivo);
        const upd: any = { actualizado: Date.now() };
        upd['documentos.' + key + '.archivos'] = lista;
        return this.db.collection('flota').doc(veh.id).update(upd);
      })
      .then(() => this.zone.run(() => {
        this.subiendo[key] = false;
        if (key === 'otros') { this.descOtro = ''; }
      }))
      .catch((e: any) => this.zone.run(() => {
        this.subiendo[key] = false;
        this.msgDetalle = 'Error al subir: ' + this.msgError(e);
      }));
  }

  eliminarArchivo(t: TipoDocFlota, a: any) {
    if (!confirm('¿Eliminar "' + (a.descripcion || a.nombre) + '"?')) { return; }
    const veh = this.vehSel;
    const lista = this.archivosDe(veh, t.key).filter(x => x.path !== a.path);
    const upd: any = { actualizado: Date.now() };
    upd['documentos.' + t.key + '.archivos'] = lista;
    this.db.collection('flota').doc(veh.id).update(upd)
      .then(() => { this.storage.ref().child(a.path).delete().catch(() => { }); })
      .catch((e: any) => this.zone.run(() => { this.msgDetalle = 'Error al eliminar: ' + this.msgError(e); }));
  }
}