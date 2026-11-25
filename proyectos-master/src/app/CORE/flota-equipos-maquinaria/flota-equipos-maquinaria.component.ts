import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/storage';
import { esUsuarioAdministracion } from '../perfil-administracion';
import { sPerfil } from '../../services/sPerfil.service';
import { sUsuario } from '../../services/sUsuario.service';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { sVis_UsuarioPersona } from '../../services/sVis_UsuarioPersona.service';
import { sMail } from '../../services/sMail.service';

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

// ── Kilometraje mensual y recordatorios por correo ──
// Colecciones Firestore: flotaKilometraje (lecturas mensuales), flotaConfig (Sub-Gerentes que reciben avisos y parámetros) y mail (cola de correos).
const COL_KM = 'flotaKilometraje';
const COL_CONFIG = 'flotaConfig';
const DOC_CONFIG_KM = 'kilometraje';
const KM_INTERVALO_DEF = 10000;   // cada cuántos km se avisa
const KM_AVISO_ANTES_DEF = 1000;  // se avisa cuando faltan estos km o menos

/**
 * Cómo se mandan los correos (solo Firebase, sin backend):
 *  - 'extension': la extensión oficial de Firebase "Trigger Email from Firestore" configurada con tu Gmail.
 *                 La app solo escribe un documento en la colección `mail` y la extensión lo envía.
 *  - 'emailjs':   EmailJS (emailjs.com) conectado a tu Gmail. Se envía directo desde el navegador.
 *                 Completa serviceId, templateId y publicKey. En la plantilla usa {{asunto}} como asunto,
 *                 {{{html}}} como contenido (tres llaves) y {{to_email}} en "To Email".
 */
export const CORREO_FLOTA = {
  modo: 'emailjs',
  coleccionMail: 'mail',
  // Misma cuenta/servicio de EmailJS que Control de Hallazgos; la plantilla es una nueva, propia de Flota
  emailjs: { serviceId: 'service_s0l9tnp', templateId: 'template_09jiopc', publicKey: 'eU69rwXxt1sceIIXr' }
};

@Component({
  selector: 'app-flota-equipos-maquinaria',
  templateUrl: './flota-equipos-maquinaria.component.html',
  styleUrls: ['./flota-equipos-maquinaria.component.css'],
  providers: [sPerfil, sUsuario, sUsuariosPerfiles, sVis_UsuarioPersona, sMail]
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

  /** Solo el perfil Administración (colección perfilesExtra) puede crear, editar y eliminar. */
  puedeEditar = false;
  cargandoPermiso = true;
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

  // ── Kilometraje mensual (colección flotaKilometraje) ──
  lecturasKm: any[] = [];
  cargandoKm = true;
  errorKm = '';
  msgKm = '';
  filasKm: any[] = [];
  filasKmFiltradas: any[] = [];
  anioKm = new Date().getFullYear();
  aniosKm: number[] = [];
  busqKm = '';
  filtroEstadoKm = 'todos';
  kpiKmVehiculos = 0;
  kpiKmProximos = 0;
  kpiKmSuperados = 0;
  kpiKmAnio = 0;
  mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  configKm: any = { subGerentes: {}, correos: [], intervalo: KM_INTERVALO_DEF, avisoAntes: KM_AVISO_ANTES_DEF };
  /** Usuarios activos con perfil SUB-GERENTE: son los que reciben los recordatorios. */
  subGerentesKm: any[] = [];
  cargandoSubGer = true;
  errorSubGer = '';
  private subGerBase: any[] = [];

  formKmAbierto = false;
  formKm: any = {};
  guardandoKm = false;
  errorFormKm = '';

  configKmAbierto = false;
  formConfigKm: any = { subGer: [] };
  guardandoConfigKm = false;
  errorConfigKm = '';
  okConfigKm = '';

  enviandoAviso: any = {};

  // ── Consolidado de gastos de mantención por vehículo ──
  anioCons = 'todos';
  soloVehiculosCons = true;
  cons: any = null;
  readonly coloresClas: any = {
    'Mantención': '#075f91', 'Reparación': '#e0663a', 'Neumáticos': '#7a5cc4', 'Carrocería': '#2fa3a0',
    'Siniestro': '#d9534f', 'Revisión técnica': '#e6a100', 'Equipamiento': '#5b8c2a', 'Otro': '#8a96a0'
  };
  private unsubKm: any = null;
  private unsubConfigKm: any = null;

  private db: any;
  private storage: any;
  private unsub: any = null;
  private unsubMant: any = null;
  private timerBusqMant: any = null;
  private timerBusqueda: any = null;

  constructor(private zone: NgZone,
              private _sPerfil: sPerfil,
              private _sUsuario: sUsuario,
              private _sUsuariosPerfiles: sUsuariosPerfiles,
              private _sVisUsuarioPersona: sVis_UsuarioPersona,
              private _sMail: sMail) { }

  ngOnInit() {
    this.db = firebase.firestore();
    this.storage = firebase.storage();

    esUsuarioAdministracion().then(esAdm => this.zone.run(() => {
      this.puedeEditar = esAdm;
      this.cargandoPermiso = false;
    }));

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
        this.armarKm();

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
        this.armarKm();
      });
    }, (err: any) => {
      this.zone.run(() => {
        this.cargandoMant = false;
        this.errorMant = 'No se pudieron cargar las mantenciones: ' + this.msgError(err) +
          ' (¿agregaste la colección flotaMantenciones a las reglas de Firestore?)';
      });
    });

    this.unsubKm = this.db.collection(COL_KM).onSnapshot((snap: any) => {
      this.zone.run(() => {
        const lista: any[] = [];
        snap.forEach((d: any) => {
          const l = d.data();
          l.id = d.id;
          lista.push(l);
        });
        this.lecturasKm = lista;
        this.cargandoKm = false;
        this.errorKm = '';
        this.armarKm();
      });
    }, (err: any) => {
      this.zone.run(() => {
        this.cargandoKm = false;
        this.errorKm = 'No se pudo cargar el kilometraje: ' + this.msgError(err) +
          ' (¿agregaste la colección ' + COL_KM + ' a las reglas de Firestore?)';
      });
    });

    this.unsubConfigKm = this.db.collection(COL_CONFIG).doc(DOC_CONFIG_KM).onSnapshot((d: any) => {
      this.zone.run(() => {
        const c = d && d.exists ? d.data() : {};
        this.configKm = {
          subGerentes: c.subGerentes && typeof c.subGerentes === 'object' ? c.subGerentes : {},
          correos: [],
          intervalo: +c.intervalo > 0 ? +c.intervalo : KM_INTERVALO_DEF,
          avisoAntes: +c.avisoAntes >= 0 && c.avisoAntes !== undefined && c.avisoAntes !== null && c.avisoAntes !== '' ? +c.avisoAntes : KM_AVISO_ANTES_DEF
        };
        this.armarSubGerentes();
        this.armarKm();
      });
    }, () => { /* sin permisos para flotaConfig: se usan los valores por defecto */ });

    this.cargarSubGerentes();
  }

  ngOnDestroy() {
    if (this.unsub) { this.unsub(); }
    if (this.unsubMant) { this.unsubMant(); }
    if (this.unsubKm) { this.unsubKm(); }
    if (this.unsubConfigKm) { this.unsubConfigKm(); }
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
    if (key === 'kilometraje') { this.msgKm = ''; this.armarKm(); }
    if (key === 'consolidado') { this.armarConsolidado(); }
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
    if (!this.puedeEditar) { return; }
    this.modoForm = 'nuevo';
    this.form = this.formVacio(this.tabActiva);
    this.fotoFile = null;
    this.fotoPreview = null;
    this.errorForm = '';
    this.formAbierto = true;
  }

  editar(v: any) {
    if (!this.puedeEditar) { return; }
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
    if (!this.puedeEditar) { return; }
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
    if (!this.puedeEditar) { return; }
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
    if (!this.puedeEditar) { return; }
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
    if (!this.puedeEditar) { return; }
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
    if (!this.puedeEditar) { return; }
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
    if (!this.puedeEditar) { return; }
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
    if (!this.puedeEditar) { return; }
    this.formMant.adjuntos = this.formMant.adjuntos.filter((x: any) => x.path !== a.path);
    if (a.path) { this.pathsMantBorrar.push(a.path); }
  }

  guardarMant() {
    if (!this.puedeEditar) { return; }
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
    if (!this.puedeEditar) { return; }
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
    if (!this.puedeEditar) { return; }
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
    if (!this.puedeEditar) { return; }
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
    if (!this.puedeEditar) { return; }
    const upd: any = { actualizado: Date.now() };
    upd['documentos.' + t.key + '.noAplica'] = !!valor;
    this.db.collection('flota').doc(this.vehSel.id).update(upd)
      .catch((e: any) => this.zone.run(() => { this.msgDetalle = 'Error: ' + this.msgError(e); }));
  }

  subirDoc(t: TipoDocFlota, ev: any) {
    if (!this.puedeEditar) { return; }
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
    if (!this.puedeEditar) { return; }
    if (!confirm('¿Eliminar "' + (a.descripcion || a.nombre) + '"?')) { return; }
    const veh = this.vehSel;
    const lista = this.archivosDe(veh, t.key).filter(x => x.path !== a.path);
    const upd: any = { actualizado: Date.now() };
    upd['documentos.' + t.key + '.archivos'] = lista;
    this.db.collection('flota').doc(veh.id).update(upd)
      .then(() => { this.storage.ref().child(a.path).delete().catch(() => { }); })
      .catch((e: any) => this.zone.run(() => { this.msgDetalle = 'Error al eliminar: ' + this.msgError(e); }));
  }

  // ───────────────────────── Kilometraje mensual ─────────────────────────
  // El administrador registra cada mes la lectura del odómetro (o los km recorridos en el mes).
  // Los km se van sumando desde la última mantención (o desde que se reinició el ciclo) y cuando
  // faltan pocos km para cumplir el intervalo (10.000 km) se manda un recordatorio por correo.

  get esTabKm(): boolean {
    return this.tabActiva === 'kilometraje';
  }

  periodoKm(anio: any, mes: any): string {
    return anio + '-' + this.dos(mes);
  }

  periodoActual(): string {
    const d = new Date();
    return this.periodoKm(d.getFullYear(), d.getMonth() + 1);
  }

  nombrePeriodo(p: string): string {
    if (!p || p.length < 7) { return '—'; }
    const m = +p.substr(5, 2);
    return (this.meses[m] || '').charAt(0) + (this.meses[m] || '').substr(1).toLowerCase() + ' ' + p.substr(0, 4);
  }

  vehiculosKm(): any[] {
    return this.vehiculos
      .filter(v => v.categoria === 'vehiculo' && v.activo !== false)
      .slice()
      .sort((a, b) => (this.normPatente(a.patente) || '').localeCompare(this.normPatente(b.patente) || ''));
  }

  /** Lecturas de un vehículo ordenadas de la más antigua a la más reciente, con los km del mes calculados. */
  lecturasDe(idVeh: string): any[] {
    const lista = this.lecturasKm
      .filter(l => l.idVehiculo === idVeh && +l.odometro >= 0 && l.periodo)
      .slice()
      .sort((a, b) => a.periodo < b.periodo ? -1 : a.periodo > b.periodo ? 1 : 0);
    let anterior: number = null;
    return lista.map((l, i) => {
      const odo = +l.odometro;
      let kmMes: number = null;
      if (anterior !== null) {
        kmMes = odo - anterior;
      } else if (l.odometroBase !== undefined && l.odometroBase !== null && l.odometroBase !== '' && +l.odometroBase <= odo) {
        kmMes = odo - (+l.odometroBase);
      }
      anterior = odo;
      return { ref: l, periodo: l.periodo, odometro: odo, kmMes: kmMes, observacion: l.observacion || '' };
    });
  }

  /** Odómetro desde donde se empezó a registrar (el de la ficha al primer registro, o la primera lectura). */
  primeraLecturaKm(lect: any[]): number {
    if (!lect || !lect.length) { return null; }
    const b = lect[0].ref.odometroBase;
    return b !== undefined && b !== null && b !== '' ? +b : lect[0].odometro;
  }

  /** Calcula el ciclo de 10.000 km de un vehículo a partir de su odómetro actual. */
  cicloKm(v: any, odoActual: number, primeraLectura: number): any {
    const intervalo = +this.configKm.intervalo || KM_INTERVALO_DEF;
    const avisoAntes = +this.configKm.avisoAntes >= 0 ? +this.configKm.avisoAntes : KM_AVISO_ANTES_DEF;
    const candidatos: Array<{ km: number; origen: string; fecha?: string }> = [];

    // 1) Reinicio manual del ciclo
    if (v.kmCicloBase !== undefined && v.kmCicloBase !== null && v.kmCicloBase !== '' && +v.kmCicloBase <= odoActual) {
      candidatos.push({ km: +v.kmCicloBase, origen: 'Ciclo reiniciado', fecha: v.kmCicloFecha || '' });
    }
    // 2) Última mantención registrada (clasificación Mantención) con kilometraje
    this.mantencionesDe(v).forEach(m => {
      const km = +m.kilometraje;
      if (m.clasificacion === 'Mantención' && km > 0 && km <= odoActual) {
        candidatos.push({ km: km, origen: 'Última mantención', fecha: m.fecha || '' });
      }
    });
    // 3) Si no hay mantención ni reinicio, se cuenta desde el primer registro
    let base: any = null;
    candidatos.forEach(c => { if (!base || c.km > base.km) { base = c; } });
    if (!base) {
      const km = primeraLectura !== null && primeraLectura !== undefined && primeraLectura <= odoActual ? primeraLectura : odoActual;
      base = { km: km, origen: 'Primer registro' };
    }

    const recorrido = Math.max(0, odoActual - base.km);
    const hito = base.km + intervalo;
    const faltan = hito - odoActual;
    let estado = 'ok';
    if (faltan <= 0) { estado = 'superado'; } else if (faltan <= avisoAntes) { estado = 'proximo'; }
    return {
      base: base.km,
      origenBase: base.origen,
      fechaBase: base.fecha || '',
      recorrido: recorrido,
      hito: hito,
      faltan: faltan,
      pct: Math.min(100, Math.round(recorrido / intervalo * 100)),
      estado: estado,
      intervalo: intervalo
    };
  }

  armarKm() {
    if (!this.vehiculos) { return; }
    const anio = +this.anioKm;
    const anios: any = {};
    anios[new Date().getFullYear()] = true;
    this.lecturasKm.forEach(l => { if (l.periodo) { anios[+l.periodo.substr(0, 4)] = true; } });
    this.aniosKm = Object.keys(anios).map(a => +a).sort((a, b) => b - a);

    this.filasKm = this.vehiculosKm().map(v => {
      const lect = this.lecturasDe(v.id);
      const meses: any[] = [];
      for (let m = 1; m <= 12; m++) { meses.push(null); }
      let totalAnio = 0;
      lect.forEach(l => {
        if (+l.periodo.substr(0, 4) === anio) {
          meses[+l.periodo.substr(5, 2) - 1] = l;
          if (l.kmMes !== null && l.kmMes > 0) { totalAnio += l.kmMes; }
        }
      });
      const ultima = lect.length ? lect[lect.length - 1] : null;
      const primera = this.primeraLecturaKm(lect);
      const odo = ultima ? ultima.odometro : (+v.kilometraje || 0);
      const ciclo = ultima ? this.cicloKm(v, odo, primera) : null;
      const avisos = v.avisosKm || {};
      const avisoHito = ciclo ? avisos[String(ciclo.hito)] || null : null;
      return {
        v: v,
        meses: meses,
        totalAnio: totalAnio,
        ultima: ultima,
        odometro: odo,
        ciclo: ciclo,
        estado: ciclo ? ciclo.estado : 'sin',
        avisado: avisoHito ? (ciclo.estado === 'superado' ? !!avisoHito.superado : !!avisoHito.proximo) : false,
        avisoInfo: avisoHito
      };
    });
    this.aplicarFiltroKm();
    if (this.esTabCons) { this.armarConsolidado(); }
  }

  aplicarFiltroKm() {
    const q = this.normalizar(this.busqKm || '');
    this.filasKmFiltradas = this.filasKm.filter(f => {
      if (this.filtroEstadoKm !== 'todos' && f.estado !== this.filtroEstadoKm) { return false; }
      if (!q) { return true; }
      const v = f.v;
      return this.normalizar([v.patente, v.marca, v.modelo, v.tipo, v.color, v.ubicacion].join(' ')).indexOf(q) >= 0;
    });
    this.kpiKmVehiculos = this.filasKm.filter(f => !!f.ultima).length;
    this.kpiKmProximos = this.filasKm.filter(f => f.estado === 'proximo').length;
    this.kpiKmSuperados = this.filasKm.filter(f => f.estado === 'superado').length;
    this.kpiKmAnio = this.filasKm.reduce((t, f) => t + f.totalAnio, 0);
  }

  cambiarAnioKm(a: any) {
    this.anioKm = +a;
    this.armarKm();
  }

  esMesActualKm(i: number): boolean {
    const d = new Date();
    return +this.anioKm === d.getFullYear() && i === d.getMonth();
  }

  claseEstadoKm(e: string): string {
    switch (e) {
      case 'ok': return 'fl-chip-vigente';
      case 'proximo': return 'fl-chip-porvencer';
      case 'superado': return 'fl-chip-vencido';
      default: return 'fl-chip-retirado';
    }
  }

  textoEstadoKm(f: any): string {
    if (!f.ciclo) { return 'Sin registros'; }
    if (f.estado === 'superado') { return 'Superó ' + this.fmtNum(f.ciclo.intervalo) + ' km'; }
    if (f.estado === 'proximo') { return 'Faltan ' + this.fmtNum(f.ciclo.faltan) + ' km'; }
    return 'Al día';
  }

  colorBarraKm(e: string): string {
    if (e === 'superado') { return '#d9534f'; }
    if (e === 'proximo') { return '#e6a100'; }
    return '#2fae69';
  }

  tituloMesKm(l: any): string {
    if (!l) { return ''; }
    return 'Odómetro: ' + this.fmtNum(l.odometro) + ' km' + (l.observacion ? '\n' + l.observacion : '');
  }

  // ── Formulario de registro mensual ──

  nuevoKm(f?: any, mesIdx?: number) {
    if (!this.puedeEditar) { return; }
    const veh = f ? f.v : null;
    let periodo = this.periodoActual();
    if (mesIdx !== undefined && mesIdx !== null) { periodo = this.periodoKm(this.anioKm, mesIdx + 1); }
    this.formKm = { idVehiculo: veh ? veh.id : '', periodo: periodo, modo: 'odometro', valor: '', observacion: '' };
    this.cargarExistenteKm();
    this.errorFormKm = '';
    this.formKmAbierto = true;
  }

  /** Si ya hay registro para ese vehículo y mes, se carga para editarlo. */
  cargarExistenteKm() {
    const f = this.formKm;
    const ex = this.lecturasKm.find(l => l.idVehiculo === f.idVehiculo && l.periodo === f.periodo);
    f.existente = ex || null;
    if (ex) {
      f.modo = 'odometro';
      f.valor = ex.odometro;
      f.observacion = ex.observacion || '';
    } else if (f.existenteCargado) {
      f.valor = '';
      f.observacion = '';
    }
    f.existenteCargado = !!ex;
  }

  onCambioFormKm() {
    this.cargarExistenteKm();
    this.errorFormKm = '';
  }

  cerrarFormKm() {
    if (this.guardandoKm) { return; }
    this.formKmAbierto = false;
  }

  /** Lectura anterior al mes del formulario (para calcular los km del mes). */
  lecturaAnteriorForm(): any {
    const f = this.formKm;
    if (!f.idVehiculo || !f.periodo) { return null; }
    const previas = this.lecturasDe(f.idVehiculo).filter(l => l.periodo < f.periodo);
    return previas.length ? previas[previas.length - 1] : null;
  }

  lecturaSiguienteForm(): any {
    const f = this.formKm;
    if (!f.idVehiculo || !f.periodo) { return null; }
    const sig = this.lecturasDe(f.idVehiculo).filter(l => l.periodo > f.periodo);
    return sig.length ? sig[0] : null;
  }

  /** Odómetro base cuando no hay lecturas anteriores: el kilometraje de la ficha. */
  baseFichaForm(): number {
    const v = this.vehiculos.find(x => x.id === this.formKm.idVehiculo);
    return v && +v.kilometraje > 0 ? +v.kilometraje : null;
  }

  get previewKm(): any {
    const f = this.formKm;
    const val = this.soloDigitos(f.valor);
    if (val === '' || !f.idVehiculo) { return null; }
    const ant = this.lecturaAnteriorForm();
    const refAnterior = ant ? ant.odometro : this.baseFichaForm();
    let odometro: number;
    let kmMes: number = null;
    if (f.modo === 'km') {
      if (refAnterior === null) { return { error: 'No hay lectura anterior ni kilometraje en la ficha: registra la lectura del odómetro.' }; }
      odometro = refAnterior + val;
      kmMes = val;
    } else {
      odometro = val;
      if (refAnterior !== null) { kmMes = odometro - refAnterior; }
    }
    const sig = this.lecturaSiguienteForm();
    let error = '';
    if (refAnterior !== null && odometro < refAnterior) {
      error = 'La lectura (' + this.fmtNum(odometro) + ' km) es menor que la anterior (' + this.fmtNum(refAnterior) + ' km).';
    } else if (sig && odometro > sig.odometro) {
      error = 'La lectura es mayor que la de ' + this.nombrePeriodo(sig.periodo) + ' (' + this.fmtNum(sig.odometro) + ' km).';
    }
    const v = this.vehiculos.find(x => x.id === f.idVehiculo);
    const lect = this.lecturasDe(f.idVehiculo).filter(l => l.periodo !== f.periodo);
    const esUltima = !lect.length || lect[lect.length - 1].periodo < f.periodo;
    const odoFinal = esUltima ? odometro : lect[lect.length - 1].odometro;
    const primera = lect.length && lect[0].periodo < f.periodo ? this.primeraLecturaKm(lect) : (refAnterior !== null ? refAnterior : odometro);
    const ciclo = v ? this.cicloKm(v, odoFinal, primera) : null;
    return { odometro: odometro, kmMes: kmMes, refAnterior: refAnterior, anterior: ant, error: error, ciclo: ciclo };
  }

  guardarKm() {
    if (!this.puedeEditar || this.guardandoKm) { return; }
    const f = this.formKm;
    this.errorFormKm = '';
    if (!f.idVehiculo) { this.errorFormKm = 'Elige el vehículo.'; return; }
    if (!f.periodo || !/^\d{4}-\d{2}$/.test(f.periodo)) { this.errorFormKm = 'Elige el mes.'; return; }
    const p = this.previewKm;
    if (!p) { this.errorFormKm = f.modo === 'km' ? 'Ingresa los km recorridos en el mes.' : 'Ingresa la lectura del odómetro.'; return; }
    if (p.error) { this.errorFormKm = p.error; return; }

    const v = this.vehiculos.find(x => x.id === f.idVehiculo);
    if (!v) { this.errorFormKm = 'No se encontró el vehículo.'; return; }

    this.guardandoKm = true;
    const id = v.id + '_' + f.periodo;
    const datos: any = {
      idVehiculo: v.id,
      patente: this.normPatente(v.patente),
      periodo: f.periodo,
      anio: +f.periodo.substr(0, 4),
      mes: +f.periodo.substr(5, 2),
      odometro: p.odometro,
      modoIngreso: f.modo,
      valorIngresado: this.soloDigitos(f.valor),
      observacion: (f.observacion || '').trim(),
      registradoPor: this.nombreUsuarioActual(),
      actualizado: Date.now()
    };
    // Primer registro del vehículo: se guarda el odómetro de la ficha para poder calcular los km de ese mes
    if (!p.anterior && p.refAnterior !== null) { datos.odometroBase = p.refAnterior; }
    if (!f.existente) { datos.creado = Date.now(); }

    const otras = this.lecturasKm.filter(l => l.idVehiculo === v.id && l.periodo !== f.periodo);
    const esUltima = !otras.some(l => l.periodo > f.periodo);

    this.db.collection(COL_KM).doc(id).set(datos, { merge: true })
      .then(() => {
        // La ficha del vehículo queda con el último kilometraje
        if (esUltima) {
          return this.db.collection('flota').doc(v.id).update({ kilometraje: p.odometro, kmActualizado: f.periodo, actualizado: Date.now() });
        }
      })
      .then(() => {
        // Se recalcula con el registro nuevo (sin esperar al onSnapshot) y se revisa si hay que avisar
        const local = this.lecturasKm.filter(l => !(l.idVehiculo === v.id && l.periodo === f.periodo));
        const nuevo = Object.assign({}, datos, { id: id });
        local.push(nuevo);
        this.lecturasKm = local;
        if (esUltima) { v.kilometraje = p.odometro; }
        this.armarKm();
        const fila = this.filasKm.find(x => x.v.id === v.id);
        return this.revisarAvisoKm(fila);
      })
      .then((msg: string) => this.zone.run(() => {
        this.guardandoKm = false;
        this.formKmAbierto = false;
        this.msgKm = 'Kilometraje de ' + this.normPatente(v.patente) + ' (' + this.nombrePeriodo(f.periodo) + ') guardado.' + (msg ? ' ' + msg : '');
      }))
      .catch((e: any) => this.zone.run(() => {
        this.guardandoKm = false;
        this.errorFormKm = 'Error al guardar: ' + this.msgError(e);
      }));
  }

  eliminarKm() {
    if (!this.puedeEditar) { return; }
    const ex = this.formKm.existente;
    if (!ex) { return; }
    if (!confirm('¿Eliminar el registro de ' + ex.patente + ' de ' + this.nombrePeriodo(ex.periodo) + '?')) { return; }
    this.guardandoKm = true;
    this.db.collection(COL_KM).doc(ex.id).delete()
      .then(() => this.zone.run(() => {
        this.guardandoKm = false;
        this.formKmAbierto = false;
      }))
      .catch((e: any) => this.zone.run(() => {
        this.guardandoKm = false;
        this.errorFormKm = 'Error al eliminar: ' + this.msgError(e);
      }));
  }

  /** Reinicia el ciclo desde el odómetro actual (por ejemplo, cuando se hizo la mantención y no se registró). */
  reiniciarCicloKm(f: any) {
    if (!this.puedeEditar || !f || !f.ultima) { return; }
    if (!confirm('¿Reiniciar el conteo de ' + this.normPatente(f.v.patente) + ' desde ' + this.fmtNum(f.odometro) + ' km?\n\n' +
                 'Úsalo cuando ya se hizo la mantención. El próximo aviso será a los ' + this.fmtNum(f.odometro + (+this.configKm.intervalo || KM_INTERVALO_DEF)) + ' km.')) { return; }
    this.db.collection('flota').doc(f.v.id).update({ kmCicloBase: f.odometro, kmCicloFecha: this.hoyISO(), actualizado: Date.now() })
      .then(() => this.zone.run(() => { this.msgKm = 'Ciclo de ' + this.normPatente(f.v.patente) + ' reiniciado.'; }))
      .catch((e: any) => this.zone.run(() => { this.msgKm = 'Error al reiniciar: ' + this.msgError(e); }));
  }

  // ── Recordatorios por correo ──

  /** Si el vehículo está próximo o pasado de los 10.000 km y no se ha avisado en este ciclo, manda el correo. */
  revisarAvisoKm(fila: any, forzar?: boolean): Promise<string> {
    if (!fila || !fila.ciclo) { return Promise.resolve(''); }
    const estado = fila.ciclo.estado;
    if (estado === 'ok') { return Promise.resolve(forzar ? 'El vehículo está al día, no hay aviso que enviar.' : ''); }
    if (fila.avisado && !forzar) { return Promise.resolve(''); }
    const correos = this.destinatariosKm();
    if (!correos.length) {
      return Promise.resolve('No se envió el recordatorio: no hay Sub-Gerentes con correo (botón "Correos de aviso").');
    }
    const v = fila.v;
    return this.enviarCorreo(correos, this.asuntoAvisoKm(fila), this.htmlAvisoKm(fila))
      .then(() => {
        const upd: any = { actualizado: Date.now() };
        upd['avisosKm.' + fila.ciclo.hito + '.' + estado] = Date.now();
        upd['avisosKm.' + fila.ciclo.hito + '.correos'] = correos;
        return this.db.collection('flota').doc(v.id).update(upd);
      })
      .then(() => 'Recordatorio enviado a ' + correos.join(', ') + '.')
      .catch((e: any) => 'No se pudo enviar el recordatorio: ' + this.msgError(e));
  }

  enviarAvisoManual(f: any) {
    if (!this.puedeEditar || !f) { return; }
    this.enviandoAviso[f.v.id] = true;
    this.revisarAvisoKm(f, true).then(msg => this.zone.run(() => {
      this.enviandoAviso[f.v.id] = false;
      this.msgKm = msg;
    }));
  }

  asuntoAvisoKm(f: any): string {
    const v = f.v;
    const pat = this.normPatente(v.patente);
    const nombre = this.titulo(v);
    if (f.ciclo.estado === 'superado') {
      return 'Mantención vencida: ' + pat + ' (' + nombre + ') superó los ' + this.fmtNum(f.ciclo.intervalo) + ' km';
    }
    return 'Recordatorio mantención: ' + pat + ' (' + nombre + ') está a ' + this.fmtNum(f.ciclo.faltan) + ' km de los ' + this.fmtNum(f.ciclo.intervalo) + ' km';
  }

  htmlAvisoKm(f: any): string {
    const v = f.v;
    const c = f.ciclo;
    const esc = (s: any) => String(s === null || s === undefined || s === '' ? '—' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fila = (k: string, val: any) =>
      '<tr><td style="padding:6px 10px;border-bottom:1px solid #e6eaee;color:#61707b;width:45%">' + k + '</td>' +
      '<td style="padding:6px 10px;border-bottom:1px solid #e6eaee;font-weight:600;color:#1f2d3a">' + esc(val) + '</td></tr>';
    const superado = c.estado === 'superado';
    const color = superado ? '#d9534f' : '#e6a100';
    const titulo = superado
      ? 'El vehículo superó los ' + this.fmtNum(c.intervalo) + ' km desde su última mantención'
      : 'El vehículo está a ' + this.fmtNum(c.faltan) + ' km de cumplir ' + this.fmtNum(c.intervalo) + ' km';
    const ult = f.ultima;
    return '' +
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;border:1px solid #dde3e8;border-radius:8px;overflow:hidden">' +
      '<div style="background:#075f91;color:#fff;padding:16px 20px">' +
      '<div style="font-size:12px;letter-spacing:1px;opacity:.85">FLOTA · RECORDATORIO DE KILOMETRAJE</div>' +
      '<div style="font-size:20px;font-weight:700;margin-top:4px">' + esc(this.normPatente(v.patente)) + ' · ' + esc(this.titulo(v)) + '</div></div>' +
      '<div style="padding:16px 20px">' +
      '<div style="border-left:4px solid ' + color + ';background:' + (superado ? '#fdf1f1' : '#fdf8ec') + ';padding:10px 14px;margin-bottom:14px;font-weight:700;color:#1f2d3a">' +
      titulo + '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
      fila('Patente', this.normPatente(v.patente)) +
      fila('Marca', v.marca) +
      fila('Modelo', v.modelo) +
      fila('Año', v.anio) +
      fila('Tipo', v.tipo) +
      fila('Color', v.color) +
      fila('Combustible', v.combustible) +
      fila('Ubicación', v.ubicacion) +
      fila('Gerencia / servicio', [v.gerencia, v.nombreServicio].filter(x => !!x).join(' · ')) +
      fila('Odómetro actual', this.fmtNum(f.odometro) + ' km' + (ult ? ' (' + this.nombrePeriodo(ult.periodo) + ')' : '')) +
      fila(c.origenBase, this.fmtNum(c.base) + ' km' + (c.fechaBase ? ' (' + this.formatoFecha(c.fechaBase) + ')' : '')) +
      fila('Km recorridos desde entonces', this.fmtNum(c.recorrido) + ' km') +
      fila('Próxima mantención a los', this.fmtNum(c.hito) + ' km') +
      fila(superado ? 'Km pasados' : 'Km que faltan', this.fmtNum(Math.abs(c.faltan)) + ' km') +
      '</table>' +
      '<p style="font-size:12px;color:#8a96a0;margin-top:16px">Correo automático del módulo Flota, Equipos y Maquinaria (SCOREH). ' +
      'Se envía cuando el administrador registra el kilometraje mensual.</p>' +
      '</div></div>';
  }

  /** Envía el correo según CORREO_FLOTA.modo (extensión Trigger Email de Firebase o EmailJS). */
  enviarCorreo(destinos: string[], asunto: string, html: string): Promise<any> {
    if (CORREO_FLOTA.modo === 'emailjs') {
      const cfg = CORREO_FLOTA.emailjs;
      if (!cfg.serviceId || !cfg.publicKey || !cfg.templateId || cfg.templateId.indexOf('TU_') === 0) {
        return Promise.reject(new Error('Falta el Template ID de EmailJS para Flota (CORREO_FLOTA.emailjs.templateId en el .ts).'));
      }
      // Uno por destinatario, con la misma llamada REST que usa Control de Hallazgos
      const envios = destinos.map(to => new Promise<void>((resolve, reject) => {
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
        xhr.onerror = () => reject(new Error('No se pudo conectar con EmailJS.'));
        xhr.send(JSON.stringify({
          service_id: cfg.serviceId,
          template_id: cfg.templateId,
          user_id: cfg.publicKey,
          template_params: { to_email: to, asunto: asunto, html: html }
        }));
      }));
      return Promise.all(envios);
    }
    // Extensión "Trigger Email from Firestore": basta con crear el documento en la colección mail
    return this.db.collection(CORREO_FLOTA.coleccionMail).add({
      to: destinos,
      message: { subject: asunto, html: html },
      origen: 'flota-kilometraje',
      creado: Date.now()
    });
  }

  // ── Destinatarios: usuarios con perfil SUB-GERENTE ──

  private esNombrePerfilSubGerente(nombre: string): boolean {
    // "SUB-GERENTE", "Sub Gerente", "Subgerente", "SUB_GERENTE"...
    const limpio = this.normalizar(nombre || '').toUpperCase().replace(/[^A-Z]/g, '');
    return limpio === 'SUBGERENTE' || limpio.indexOf('SUBGERENTE') === 0;
  }

  /** Busca un correo válido en los campos típicos del usuario o la persona. */
  private correoDe(...objs: any[]): string {
    const campos = ['direccionMail', 'email', 'correo', 'correoElectronico', 'mail', 'emailCorporativo', 'correoCorporativo', 'emailPersonal', 'nombreUsuario', 'usuario'];
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      if (!o) { continue; }
      for (let j = 0; j < campos.length; j++) {
        const v = String(o[campos[j]] || '').trim();
        if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { return v.toLowerCase(); }
      }
    }
    return '';
  }

  /** Usuarios activos con perfil SUB-GERENTE, con su nombre y correo del sistema. */
  cargarSubGerentes() {
    this.cargandoSubGer = true;
    this.errorSubGer = '';
    const err = (que: string) => (e: any) => this.zone.run(() => {
      console.error('Flota: no se pudo cargar ' + que, e);
      this.cargandoSubGer = false;
      this.errorSubGer = 'No se pudieron cargar los Sub-Gerentes (' + que + ').';
    });
    this._sPerfil.getPerfil().subscribe((perfiles: any) => {
      const idsSub = (Array.isArray(perfiles) ? perfiles : [])
        .filter((p: any) => this.esNombrePerfilSubGerente(p.nombrePerfil))
        .map((p: any) => Number(p.idPerfil));
      if (!idsSub.length) {
        this.zone.run(() => {
          this.subGerBase = [];
          this.cargandoSubGer = false;
          this.errorSubGer = 'No existe un perfil llamado SUB-GERENTE en el maestro de perfiles.';
          this.armarSubGerentes();
        });
        return;
      }
      this._sUsuariosPerfiles.getUsuariosPerfiles().subscribe((ups: any) => {
        const idsUsuarios: number[] = [];
        (Array.isArray(ups) ? ups : []).forEach((up: any) => {
          if (up.activo !== false && !up.fechaRemocion && idsSub.indexOf(Number(up.idPerfil)) >= 0
              && idsUsuarios.indexOf(Number(up.idUsuario)) < 0) {
            idsUsuarios.push(Number(up.idUsuario));
          }
        });
        this._sUsuario.getUsuariobyactivo(true).subscribe((usuarios: any) => {
          const activos = (Array.isArray(usuarios) ? usuarios : []).filter((u: any) => idsUsuarios.indexOf(Number(u.idUsuario)) >= 0);
          this._sVisUsuarioPersona.getVis_UsuarioPersona().subscribe((personas: any) => {
            const lp = Array.isArray(personas) ? personas : [];
            // Correos del módulo Usuarios (sMail: direccionMail por idPersona), igual que Control de Hallazgos
            this.cargarMailsPorPersona().then((mails: any) => this.zone.run(() => {
              this.subGerBase = activos.map((u: any) => {
                const per = lp.find((x: any) => Number(x.idUsuario) === Number(u.idUsuario));
                const nombre = per ? ((per.nombre || '') + ' ' + (per.paterno || '') + ' ' + (per.materno || '')).trim() : '';
                const idPersona = Number(u.idPersona || (per && per.idPersona));
                return {
                  idUsuario: String(u.idUsuario),
                  nombre: nombre || u.nombreUsuario || ('Usuario ' + u.idUsuario),
                  emailSistema: (idPersona && mails[idPersona]) || this.correoDe(per, u)
                };
              }).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));
              this.cargandoSubGer = false;
              this.armarSubGerentes();
            }));
          }, err('personas'));
        }, err('usuarios'));
      }, err('usuarios por perfil'));
    }, err('perfiles'));
  }

  /** Mapa idPersona → correo (último activo) desde el servicio sMail. */
  private cargarMailsPorPersona(): Promise<any> {
    const servicio: any = this._sMail;
    const llamada = servicio && typeof servicio.getMail === 'function' ? servicio.getMail() : null;
    if (!llamada) { return Promise.resolve({}); }
    return new Promise((resolve) => {
      const listo = (res: any) => {
        const mapa: any = {};
        (Array.isArray(res) ? res : (res ? [res] : [])).forEach((m: any) => {
          const dir = String((m && m.direccionMail) || '').trim();
          if (m && m.idPersona && dir && m.activo !== false && !m.fechaRemocion) { mapa[Number(m.idPersona)] = dir.toLowerCase(); }
        });
        resolve(mapa);
      };
      if (typeof llamada.subscribe === 'function') {
        llamada.subscribe(listo, () => resolve({}));
      } else if (typeof llamada.then === 'function') {
        llamada.then(listo, () => resolve({}));
      } else {
        listo(llamada);
      }
    });
  }

  /** Junta los Sub-Gerentes del sistema con lo guardado en flotaConfig (correo corregido o excluido). */
  armarSubGerentes() {
    const cfg = this.configKm.subGerentes || {};
    this.subGerentesKm = (this.subGerBase || []).map(b => {
      const c = cfg[b.idUsuario] || {};
      return {
        idUsuario: b.idUsuario,
        nombre: b.nombre,
        emailSistema: b.emailSistema,
        email: (c.email || b.emailSistema || '').trim().toLowerCase(),
        incluido: c.excluido !== true
      };
    });
  }

  destinatariosKm(): string[] {
    const lista: string[] = [];
    (this.subGerentesKm || []).forEach(s => {
      if (s.incluido && s.email && lista.indexOf(s.email) < 0) { lista.push(s.email); }
    });
    return lista;
  }

  get nombresDestinatariosKm(): string {
    return this.subGerentesKm.filter(s => s.incluido && s.email).map(s => s.nombre).join(', ');
  }

  get subGerSinCorreo(): number {
    return this.subGerentesKm.filter(s => s.incluido && !s.email).length;
  }

  // ── Configuración de avisos ──

  abrirConfigKm() {
    if (!this.puedeEditar) { return; }
    this.formConfigKm = {
      subGer: this.subGerentesKm.map(s => ({
        idUsuario: s.idUsuario, nombre: s.nombre, emailSistema: s.emailSistema, email: s.email, incluido: s.incluido
      })),
      intervalo: this.configKm.intervalo,
      avisoAntes: this.configKm.avisoAntes
    };
    this.errorConfigKm = '';
    this.okConfigKm = '';
    this.configKmAbierto = true;
  }

  cerrarConfigKm() {
    if (this.guardandoConfigKm) { return; }
    this.configKmAbierto = false;
  }

  private validarSubGerForm(): string {
    const malos = (this.formConfigKm.subGer || [])
      .filter((s: any) => s.incluido && s.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s.email).trim()))
      .map((s: any) => s.nombre);
    return malos.length ? 'Correo no válido para: ' + malos.join(', ') : '';
  }

  guardarConfigKm() {
    if (!this.puedeEditar || this.guardandoConfigKm) { return; }
    const f = this.formConfigKm;
    const malo = this.validarSubGerForm();
    if (malo) { this.errorConfigKm = malo; return; }
    const intervalo = this.soloDigitos(f.intervalo);
    const aviso = this.soloDigitos(f.avisoAntes);
    if (!intervalo || intervalo < 100) { this.errorConfigKm = 'El intervalo debe ser de al menos 100 km.'; return; }
    if (aviso === '' || aviso >= intervalo) { this.errorConfigKm = 'El aviso debe ser menor que el intervalo.'; return; }

    // Se guarda solo lo que difiere del sistema: correo corregido y si está excluido
    const mapa: any = {};
    (f.subGer || []).forEach((s: any) => {
      const email = String(s.email || '').trim().toLowerCase();
      const d: any = { nombre: s.nombre, excluido: !s.incluido };
      if (email && email !== s.emailSistema) { d.email = email; }
      mapa[s.idUsuario] = d;
    });

    this.guardandoConfigKm = true;
    this.db.collection(COL_CONFIG).doc(DOC_CONFIG_KM).set({
      subGerentes: mapa, intervalo: intervalo, avisoAntes: aviso,
      actualizado: Date.now(), actualizadoPor: this.nombreUsuarioActual()
    }, { merge: true })
      .then(() => this.zone.run(() => {
        this.guardandoConfigKm = false;
        this.configKmAbierto = false;
        this.msgKm = 'Configuración de avisos guardada.';
      }))
      .catch((e: any) => this.zone.run(() => {
        this.guardandoConfigKm = false;
        this.errorConfigKm = 'Error al guardar: ' + this.msgError(e) + ' (¿agregaste ' + COL_CONFIG + ' a las reglas?)';
      }));
  }

  /** Envía un correo de prueba a los Sub-Gerentes marcados en el formulario. */
  probarCorreoKm() {
    const malo = this.validarSubGerForm();
    if (malo) { this.errorConfigKm = malo; return; }
    const correos: string[] = [];
    (this.formConfigKm.subGer || []).forEach((s: any) => {
      const e = String(s.email || '').trim().toLowerCase();
      if (s.incluido && e && correos.indexOf(e) < 0) { correos.push(e); }
    });
    if (!correos.length) { this.errorConfigKm = 'Marca al menos un Sub-Gerente con correo.'; return; }
    this.errorConfigKm = '';
    this.okConfigKm = '';
    this.guardandoConfigKm = true;
    this.enviarCorreo(correos, 'Prueba de recordatorios de kilometraje (Flota)',
      '<div style="font-family:Arial,sans-serif">Si te llegó este correo, los recordatorios de kilometraje de la flota están funcionando.</div>')
      .then(() => this.zone.run(() => {
        this.guardandoConfigKm = false;
        this.errorConfigKm = '';
        this.okConfigKm = CORREO_FLOTA.modo === 'emailjs'
          ? 'Correo de prueba enviado a ' + correos.join(', ') + '. Revisa la bandeja de entrada y el spam.'
          : 'Correo de prueba dejado en la cola (colección "' + CORREO_FLOTA.coleccionMail + '") para ' + correos.join(', ') +
            '. La extensión lo envía en segundos; si no llega, revisa en Firestore el campo "delivery" de ese documento.';
      }))
      .catch((e: any) => this.zone.run(() => {
        this.guardandoConfigKm = false;
        this.errorConfigKm = 'No se pudo enviar: ' + this.msgError(e);
      }));
  }

  nombreUsuarioActual(): string {
    try {
      const u = JSON.parse(localStorage.getItem('usuario') || '{}') || {};
      return String(u.nombreUsuario || u.nombre || u.idUsuario || '');
    } catch (e) {
      return '';
    }
  }

  // ───────────────────────── Consolidado de gastos ─────────────────────────

  get esTabCons(): boolean {
    return this.tabActiva === 'consolidado';
  }

  colorClas(c: string): string {
    return this.coloresClas[c] || '#8a96a0';
  }

  private clasDe(m: any): string {
    const c = m.clasificacion || this.clasificarMant(m.tipoMantencion);
    return this.clasificacionesMant.indexOf(c) >= 0 ? c : 'Otro';
  }

  private anioDeMant(m: any): string {
    if (m._anio) { return String(m._anio); }
    const f = String(m.fecha || '');
    return /^\d{4}/.test(f) ? f.substr(0, 4) : '';
  }

  cambiarAnioCons(a: string) {
    this.anioCons = this.anioCons === a ? 'todos' : a;
    this.armarConsolidado();
  }

  /** Arma el consolidado: gasto por año (apilado por clasificación), por clasificación y por vehículo. */
  armarConsolidado() {
    const clases = this.clasificacionesMant;
    // Patentes que cuentan: vehículos (o todo lo que tenga patente si se desmarca "solo vehículos")
    const vehPorPat: any = {};
    this.vehiculos.forEach(v => {
      const p = this.normPatente(v.patente);
      if (p && v.activo !== false) { vehPorPat[p] = v; }
    });
    const cuenta = (m: any) => {
      const p = this.normPatente(m.patente);
      if (!p) { return false; }
      const v = vehPorPat[p];
      return this.soloVehiculosCons ? !!(v && v.categoria === 'vehiculo') : true;
    };
    const lista = this.mantenciones.filter(m => cuenta(m) && +m.monto > 0 && this.anioDeMant(m));

    // ── Por año (histórico) ──
    const porAnio: any = {};
    lista.forEach(m => {
      const a = this.anioDeMant(m);
      if (!porAnio[a]) { porAnio[a] = { anio: a, total: 0, n: 0, clas: {}, pats: {} }; }
      const c = this.clasDe(m);
      porAnio[a].total += +m.monto;
      porAnio[a].n++;
      porAnio[a].clas[c] = (porAnio[a].clas[c] || 0) + (+m.monto);
      porAnio[a].pats[this.normPatente(m.patente)] = true;
    });
    const anios = Object.keys(porAnio).sort();
    const totalHist = anios.reduce((t, a) => t + porAnio[a].total, 0);
    const maxAnio = anios.reduce((mx, a) => Math.max(mx, porAnio[a].total), 0);
    const promedioAnual = anios.length ? Math.round(totalHist / anios.length) : 0;
    const colsAnio = anios.map(a => {
      const d = porAnio[a];
      return {
        anio: a,
        total: d.total,
        n: d.n,
        vehiculos: Object.keys(d.pats).length,
        alto: maxAnio ? Math.max(2, d.total / maxAnio * 88) : 0,
        tramos: clases.filter(c => d.clas[c] > 0).map(c => ({ clas: c, monto: d.clas[c], color: this.colorClas(c) }))
      };
    });
    if (this.anioCons !== 'todos' && anios.indexOf(this.anioCons) < 0) { this.anioCons = 'todos'; }

    // ── Periodo elegido ──
    const periodo = this.anioCons === 'todos' ? lista : lista.filter(m => this.anioDeMant(m) === this.anioCons);
    const total = periodo.reduce((t, m) => t + (+m.monto), 0);

    const porClas = clases.map(c => {
      const ms = periodo.filter(m => this.clasDe(m) === c);
      const monto = ms.reduce((t, m) => t + (+m.monto), 0);
      return { clas: c, color: this.colorClas(c), monto: monto, n: ms.length, pct: total ? monto / total * 100 : 0 };
    }).filter(x => x.monto > 0).sort((a, b) => b.monto - a.monto);
    const maxClas = porClas.length ? porClas[0].monto : 0;
    porClas.forEach((x: any) => { x.ancho = maxClas ? x.monto / maxClas * 100 : 0; });

    // ── Por vehículo ──
    const filasMap: any = {};
    const agregarFila = (p: string) => {
      if (!filasMap[p]) {
        const v = vehPorPat[p];
        filasMap[p] = {
          patente: p, v: v || null,
          nombre: v ? this.titulo(v) : 'Patente sin ficha',
          sub: v ? [v.anio, v.tipo].filter((x: any) => !!x).join(' · ') : '',
          n: 0, total: 0, clas: {}, totalHist: 0, aniosHist: {}, ultima: ''
        };
      }
      return filasMap[p];
    };
    // Todos los vehículos aparecen, aunque no tengan gastos
    this.vehiculos.forEach(v => {
      if (v.activo !== false && v.categoria === 'vehiculo' && v.patente) { agregarFila(this.normPatente(v.patente)); }
    });
    lista.forEach(m => {
      const f = agregarFila(this.normPatente(m.patente));
      f.totalHist += +m.monto;
      f.aniosHist[this.anioDeMant(m)] = true;
      if ((m.fecha || '') > f.ultima) { f.ultima = m.fecha || ''; }
    });
    periodo.forEach(m => {
      const f = agregarFila(this.normPatente(m.patente));
      const c = this.clasDe(m);
      f.n++;
      f.total += +m.monto;
      f.clas[c] = (f.clas[c] || 0) + (+m.monto);
    });
    const filas = Object.keys(filasMap).map(k => filasMap[k]);
    const maxFila = filas.reduce((mx, f) => Math.max(mx, f.total), 0);
    filas.forEach(f => {
      const na = Object.keys(f.aniosHist).length;
      f.promedioAnual = na ? Math.round(f.totalHist / na) : 0;
      f.aniosConDatos = na;
      f.pct = total ? f.total / total * 100 : 0;
      f.ancho = maxFila ? f.total / maxFila * 100 : 0;
      f.tramos = clases.filter(c => f.clas[c] > 0).map(c => ({ clas: c, color: this.colorClas(c), pct: f.total ? f.clas[c] / f.total * 100 : 0, monto: f.clas[c] }));
    });
    filas.sort((a, b) => b.total - a.total || b.totalHist - a.totalHist || a.patente.localeCompare(b.patente));
    const conGasto = filas.filter(f => f.total > 0);

    const colsClas = clases.filter(c => periodo.some(m => this.clasDe(m) === c));
    const totalesClas: any = {};
    colsClas.forEach(c => { totalesClas[c] = conGasto.reduce((t, f) => t + (f.clas[c] || 0), 0); });

    this.cons = {
      anios: colsAnio,
      promedioAnual: promedioAnual,
      altoPromedio: maxAnio ? promedioAnual / maxAnio * 88 : 0,
      totalHist: totalHist,
      nAnios: anios.length,
      total: total,
      n: periodo.length,
      vehiculosConGasto: conGasto.length,
      promedioPorVehiculo: conGasto.length ? Math.round(total / conGasto.length) : 0,
      promedioPorMant: periodo.length ? Math.round(total / periodo.length) : 0,
      porClas: porClas,
      filas: filas,
      colsClas: colsClas,
      totalesClas: totalesClas,
      mayor: conGasto.length ? conGasto[0] : null,
      totalPromedioAnualVeh: filas.reduce((t, f) => t + f.promedioAnual, 0)
    };
  }

  fmtMontoCorto(n: number): string {
    if (!n) { return '$0'; }
    if (n >= 1000000) { return '$' + (Math.round(n / 100000) / 10).toLocaleString('es-CL') + 'M'; }
    if (n >= 1000) { return '$' + Math.round(n / 1000).toLocaleString('es-CL') + 'mil'; }
    return '$' + n.toLocaleString('es-CL');
  }
}