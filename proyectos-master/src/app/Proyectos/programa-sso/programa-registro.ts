import * as firebase from 'firebase/app';
import 'firebase/storage';
import { ProgramaSsoService, ProgramaMes, ActividadPrograma } from './programa-sso.service';

/**
 * Registro de cada día marcado en el Programa SSO / MA.
 * Se guarda dentro de cada actividad: actividad.registros["<dia>"] = RegistroDia
 * (en el mismo documento de Firestore, programaSSO / programaMA).
 */

export interface AdjuntoRegistro {
  nombre: string;   // nombre original del archivo
  url: string;      // URL de descarga de Firebase Storage
  path: string;     // ruta en Storage (para borrarlo)
  tipo: string;     // mime type
  tamano: number;   // bytes
}

export interface RegistroDia {
  cumplimiento: number;   // 100 = realizado | 75 / 50 = parcial | 0 = no hecho

  // ---- HH Capacitación (formato nuevo: todo en minutos) ----
  categoriaHH?: string;        // 'OPERACIONAL' | 'ESPECIFICA' | '' (sin HH)
  trabajadores?: number;       // (registros anteriores) participantes de la capacitación; los nuevos guardan 0
  duracionMin?: number;        // minutos de la capacitación
  hhMinutos?: number;          // minutos de capacitación que se suman (nuevos: = duracionMin)

  // ---- HH Trabajadores (solo se guarda, para comparar después con Control de Asistencia) ----
  trabajadoresDia?: number;    // cantidad de trabajadores del día
  horasDia?: number;           // horas promedio trabajadas ese día (8, 9, 10...)

  // ---- Campos en horas decimales: se siguen escribiendo para compatibilidad
  //      (Estadísticas HH y registros antiguos). La fuente de verdad es hhMinutos.
  hhCapacitacion: number;      // HH capacitación = operacionales + específicas (horas)
  hhEspecificas: number;       // HH específicas (horas)
  entidadEspecifica: string;   // MUTUAL | OTEC | MANDANTE | OTROS | ''
  hhOperacional: number;       // HH operacionales (horas)

  consumo?: number;            // solo MA: consumo del día (agua / combustible / residuos)
  consumoCampo?: string;       // indicador de la tabla MA al que va (consumoAgua, ...)
  observacion: string;
  adjuntos: AdjuntoRegistro[];
  registradoPor: string;
  fechaRegistro: string;  // ISO
}

export interface HHDia {
  hhCapacitacion: number;
  hhEspecificas: number;
  hhOperacional: number;
  minCapacitacion: number;
  minEspecificas: number;
  minOperacional: number;
}

export interface ResumenHH {
  // horas decimales (compatibilidad con Estadísticas HH)
  hhCapacitacion: number;
  hhEspecificas: number;
  hhOperacional: number;
  total: number;
  // minutos (fuente de verdad)
  minOperacional: number;
  minEspecificas: number;
  minTotal: number;
  // participantes (suma de trabajadores de cada registro) y cantidad de registros
  trabajadoresOperacional: number;
  trabajadoresEspecificas: number;
  registrosOperacional: number;
  registrosEspecificas: number;
  porDia: { [dia: number]: HHDia };
  /** HH específicas por entidad, en horas: { MUTUAL: 4, OTEC: 2, ... } */
  porEntidad: { [entidad: string]: number };
  /** HH específicas por entidad, en minutos */
  porEntidadMin: { [entidad: string]: number };
}

export const NIVELES_CUMPLIMIENTO = [
  { v: 100, t: 'Realizado', d: '100%' },
  { v: 75, t: 'Parcial', d: '75%' },
  { v: 50, t: 'Parcial', d: '50%' },
  { v: 0, t: 'No hecho', d: '0%' }
];

export const VALORES_CUMPLIMIENTO = [100, 75, 50, 0];

/**
 * Campos antiguos de HH (horas decimales). Se mantienen solo por compatibilidad;
 * el popup ahora pide trabajadores + horas + minutos.
 */
export const CAMPOS_HH = [
  { k: 'hhEspecificas', t: 'HH específicas' },
  { k: 'hhOperacional', t: 'HH operacionales' }
];

/** Categorías padre de HH Capacitación. */
export const CATEGORIA_OPERACIONAL = 'OPERACIONAL';
export const CATEGORIA_ESPECIFICA = 'ESPECIFICA';

export const CATEGORIAS_HH = [
  { v: CATEGORIA_OPERACIONAL, t: 'HH Operacionales', d: 'Cursos, talleres y capacitaciones de funciones y procedimientos operacionales' },
  { v: CATEGORIA_ESPECIFICA, t: 'HH Específicas', d: 'Cursos y capacitaciones de carácter específico o especializado' }
];

export function textoCategoriaHH(v: string): string {
  const c = CATEGORIAS_HH.filter(x => x.v === v)[0];
  return c ? c.t : '';
}

/** Quién dictó la capacitación específica. */
export const ENTIDADES_ESPECIFICAS = [
  { v: 'MUTUAL', t: 'Mutual' },
  { v: 'OTEC', t: 'OTEC' },
  { v: 'MANDANTE', t: 'Mandante' },
  { v: 'OTROS', t: 'Otros' }
];

/**
 * Consumos de Medio Ambiente que se registran desde el Programa MA.
 * El campo es el mismo indicador de la tabla de MA (colección estadisticasMA).
 */
export interface ConsumoMA { campo: string; etiqueta: string; unidad: string; }

export const CONSUMOS_MA: ConsumoMA[] = [
  { campo: 'consumoAgua', etiqueta: 'Consumo de agua potable', unidad: 'LTS' },
  { campo: 'consumoCombustible', etiqueta: 'Consumo de combustible', unidad: 'LTS' },
  { campo: 'residuosDomiciliarios', etiqueta: 'Residuos orgánicos y/o domiciliarios', unidad: 'TONS.' }
];

function claveTexto(t: string): string {
  return (String(t || '') as any).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Según el nombre de la actividad, a qué consumo de MA corresponde (o null). */
export function consumoMADe(nombreActividad: string): ConsumoMA {
  const n = claveTexto(nombreActividad);
  if (n.indexOf('combustible') >= 0) { return CONSUMOS_MA[1]; }
  if (n.indexOf('agua') >= 0 && (n.indexOf('consumo') >= 0 || n.indexOf('potable') >= 0)) { return CONSUMOS_MA[0]; }
  if (n.indexOf('residuo') >= 0 && (n.indexOf('organico') >= 0 || n.indexOf('domiciliario') >= 0)) { return CONSUMOS_MA[2]; }
  return null;
}

export function textoEntidad(v: string): string {
  const e = ENTIDADES_ESPECIFICAS.filter(x => x.v === v)[0];
  return e ? e.t : '';
}

export const TAMANO_MAXIMO_ADJUNTO = 20 * 1024 * 1024; // 20 MB

/** Devuelve (y crea si no existe) el mapa de registros de la actividad. */
export function registrosDe(a: ActividadPrograma): { [dia: string]: RegistroDia } {
  const x: any = a;
  if (!x.registros || typeof x.registros !== 'object') { x.registros = {}; }
  return x.registros;
}

export function redondear(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// ===================== HH Capacitación: cálculo central (en minutos) =====================

export const MAX_TRABAJADORES = 5000;
export const MAX_HORAS_DURACION = 24;

/** Categoría que define la sección de la actividad (null = la actividad no tiene categoría fija). */
export function categoriaDeSeccion(seccion: string): string {
  const s = claveTexto(seccion);
  if (!s) { return null; }
  if (s.indexOf('operacional') >= 0) { return CATEGORIA_OPERACIONAL; }
  if (s.indexOf('especific') >= 0) { return CATEGORIA_ESPECIFICA; }
  return null;
}

/** Categoría fija de una actividad según su sección (Capacitación Operacional / Capacitaciones Específicas). */
export function categoriaFijaDe(a: ActividadPrograma): string {
  return a ? categoriaDeSeccion((a as any).seccion) : null;
}

/** Entero >= 0 a partir de lo que se escribió en un input (vacío = 0). Lanza error si no es válido. */
export function enteroNoNegativo(v: any, campo: string): number {
  if (v === null || v === undefined || String(v).trim() === '') { return 0; }
  const n = Number(String(v).trim().replace(',', '.'));
  if (!isFinite(n)) { throw new Error(campo + ': ingresa un número.'); }
  if (n < 0) { throw new Error(campo + ' no puede ser negativo.'); }
  if (Math.floor(n) !== n) { throw new Error(campo + ' debe ser un número entero.'); }
  return n;
}

export interface CalculoHH {
  trabajadores: number;
  duracionMin: number;   // duración individual
  hhMinutos: number;     // trabajadores × duración
}

/**
 * Valida y calcula las HH: trabajadores × (horas × 60 + minutos).
 * Todo en minutos enteros, sin redondeos.
 */
export function calcularHH(trabajadores: any, horas: any, minutos: any): CalculoHH {
  const t = enteroNoNegativo(trabajadores, 'Trabajadores');
  const h = enteroNoNegativo(horas, 'Horas');
  const m = enteroNoNegativo(minutos, 'Minutos');
  if (m > 59) { throw new Error('Los minutos deben estar entre 0 y 59.'); }
  if (t > MAX_TRABAJADORES) { throw new Error('La cantidad de trabajadores parece demasiado alta, revisa el valor.'); }
  if (h > MAX_HORAS_DURACION) { throw new Error('La duración individual no puede superar ' + MAX_HORAS_DURACION + ' horas.'); }
  const duracion = h * 60 + m;
  return { trabajadores: t, duracionMin: duracion, hhMinutos: t * duracion };
}

/** Minutos → "7 h 30 min" / "45 min" / "3 h" / "0 min". */
export function formatoHM(minutos: number): string {
  const total = Math.max(0, Math.round(Number(minutos) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) { return m + ' min'; }
  const hs = String(h).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return m ? hs + ' h ' + m + ' min' : hs + ' h';
}

/** Minutos → horas decimales (solo para compatibilidad y para el Excel). */
export function minutosAHoras(minutos: number): number {
  return Math.round((Number(minutos) || 0) / 60 * 10000) / 10000;
}

export interface HHRegistro {
  categoria: string;      // OPERACIONAL | ESPECIFICA | ''
  trabajadores: number;   // 0 si es un registro antiguo
  duracionMin: number;    // 0 si es un registro antiguo
  minOperacional: number;
  minEspecificas: number;
  minTotal: number;
  antiguo: boolean;       // registro guardado en horas decimales (sin trabajadores / duración)
  trabajadoresDia: number; // HH Trabajadores: cantidad (0 = no se ingresó)
  horasDia: number;        // HH Trabajadores: horas promedio del día (0 = no se ingresó)
}

/** Lee las HH de un registro (formato nuevo o antiguo) y las devuelve en minutos. */
export function hhRegistroMin(r: RegistroDia): HHRegistro {
  const res: HHRegistro = {
    categoria: '', trabajadores: 0, duracionMin: 0,
    minOperacional: 0, minEspecificas: 0, minTotal: 0, antiguo: false,
    trabajadoresDia: 0, horasDia: 0
  };
  if (!r) { return res; }
  const x: any = r;
  res.trabajadoresDia = Math.max(0, Math.round(Number(x.trabajadoresDia) || 0));
  res.horasDia = Math.max(0, Number(x.horasDia) || 0);
  const nuevo = x.categoriaHH !== undefined && x.categoriaHH !== null;
  if (nuevo) {
    const cat = x.categoriaHH === CATEGORIA_OPERACIONAL || x.categoriaHH === CATEGORIA_ESPECIFICA ? x.categoriaHH : '';
    if (!cat) { return res; }
    const t = Math.max(0, Math.round(Number(x.trabajadores) || 0));
    const d = Math.max(0, Math.round(Number(x.duracionMin) || 0));
    const min = t && d ? t * d : Math.max(0, Math.round(Number(x.hhMinutos) || 0));
    res.categoria = cat;
    res.trabajadores = t || res.trabajadoresDia;
    res.duracionMin = d;
    if (!res.trabajadoresDia && t) { res.trabajadoresDia = t; }   // registros anteriores: los participantes sirven de referencia
    if (cat === CATEGORIA_OPERACIONAL) { res.minOperacional = min; } else { res.minEspecificas = min; }
  } else {
    // registro antiguo: horas decimales
    res.antiguo = true;
    res.minOperacional = Math.max(0, Math.round((Number(x.hhOperacional) || 0) * 60));
    res.minEspecificas = Math.max(0, Math.round((Number(x.hhEspecificas) || 0) * 60));
    if (res.minEspecificas && !res.minOperacional) { res.categoria = CATEGORIA_ESPECIFICA; }
    else if (res.minOperacional && !res.minEspecificas) { res.categoria = CATEGORIA_OPERACIONAL; }
  }
  res.minTotal = res.minOperacional + res.minEspecificas;
  return res;
}

/** HH del registro en horas decimales (compatibilidad). */
export function hhDeRegistro(r: RegistroDia): number {
  return redondear(hhRegistroMin(r).minTotal / 60);
}

export function resumenHHVacio(): ResumenHH {
  return {
    hhCapacitacion: 0, hhEspecificas: 0, hhOperacional: 0, total: 0,
    minOperacional: 0, minEspecificas: 0, minTotal: 0,
    trabajadoresOperacional: 0, trabajadoresEspecificas: 0,
    registrosOperacional: 0, registrosEspecificas: 0,
    porDia: {}, porEntidad: {}, porEntidadMin: {}
  };
}

/** Suma las HH registradas en un programa (SSO o MA). Se puede acumular sobre otro resumen. */
export function sumarHHPrograma(p: ProgramaMes, acumulado?: ResumenHH): ResumenHH {
  const r = acumulado || resumenHHVacio();
  if (!r.porEntidadMin) { r.porEntidadMin = {}; }
  if (!p || !p.actividades) { return r; }
  p.actividades.forEach(a => {
    const regs = registrosDe(a);
    Object.keys(regs).forEach(k => {
      const reg = regs[k];
      if (!reg) { return; }
      const hh = hhRegistroMin(reg);
      if (!hh.minTotal) { return; }
      const dia = Number(k);
      if (!r.porDia[dia]) {
        r.porDia[dia] = { hhCapacitacion: 0, hhEspecificas: 0, hhOperacional: 0, minCapacitacion: 0, minEspecificas: 0, minOperacional: 0 };
      }
      const pd = r.porDia[dia];
      pd.minOperacional += hh.minOperacional;
      pd.minEspecificas += hh.minEspecificas;
      pd.minCapacitacion = pd.minOperacional + pd.minEspecificas;
      pd.hhOperacional = redondear(pd.minOperacional / 60);
      pd.hhEspecificas = redondear(pd.minEspecificas / 60);
      pd.hhCapacitacion = redondear(pd.minCapacitacion / 60);

      r.minOperacional += hh.minOperacional;
      r.minEspecificas += hh.minEspecificas;
      if (hh.minOperacional) { r.registrosOperacional++; r.trabajadoresOperacional += hh.trabajadores; }
      if (hh.minEspecificas) {
        r.registrosEspecificas++;
        r.trabajadoresEspecificas += hh.trabajadores;
        const ent = reg.entidadEspecifica || 'OTROS';
        r.porEntidadMin[ent] = (r.porEntidadMin[ent] || 0) + hh.minEspecificas;
        r.porEntidad[ent] = redondear(r.porEntidadMin[ent] / 60);
      }
    });
  });
  r.minTotal = r.minOperacional + r.minEspecificas;
  r.hhOperacional = redondear(r.minOperacional / 60);
  r.hhEspecificas = redondear(r.minEspecificas / 60);
  r.total = redondear(r.minTotal / 60);
  r.hhCapacitacion = r.total;   // HH Capacitación = operacionales + específicas
  return r;
}

/**
 * Para Estadísticas HH: suma las HH de los programas SSO y MA de un mes.
 *   obtenerHHProgramas(this.sPrograma, idSubProyecto, 2026, 11).then(hh => ...)
 */
export function obtenerHHProgramas(servicio: ProgramaSsoService, idSubProyecto: any,
                                   anio: number, mes: number): Promise<ResumenHH> {
  const colecciones = ['programaSSO', 'programaMA'];
  return Promise.all(colecciones.map(col =>
    Promise.resolve(servicio.obtener(idSubProyecto, anio, mes, col)).catch(err => {
      console.error('HH programa ' + col, err);
      return null;
    })
  )).then((lista: ProgramaMes[]) => {
    let r = resumenHHVacio();
    lista.forEach(p => { if (p) { r = sumarHHPrograma(p, r); } });
    return r;
  });
}

// ===================== Firebase Storage =====================

/** Saca tildes y caracteres raros del nombre para la ruta en Storage (el nombre original se conserva aparte). */
export function limpiarNombreArchivo(nombre: string): string {
  const base = (String(nombre || 'archivo') as any).normalize('NFD').replace(/[̀-ͯ]/g, '');
  return base.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').substr(0, 120) || 'archivo';
}

export function subirAdjunto(carpeta: string, archivo: File, progreso?: (pct: number) => void): Promise<AdjuntoRegistro> {
  const path = carpeta + '/' + Date.now() + '_' + limpiarNombreArchivo(archivo.name);
  const ref = (firebase as any).storage().ref(path);
  const tarea = ref.put(archivo, { contentType: archivo.type || 'application/octet-stream' });

  return new Promise<AdjuntoRegistro>((resolve, reject) => {
    tarea.on('state_changed',
      (s: any) => {
        if (progreso && s && s.totalBytes) { progreso(Math.round(s.bytesTransferred * 100 / s.totalBytes)); }
      },
      (err: any) => reject(err),
      () => {
        const snap: any = tarea.snapshot;
        // firebase v4 trae downloadURL en el snapshot; v5+ usa getDownloadURL()
        const pUrl: Promise<string> = snap.downloadURL ? Promise.resolve(snap.downloadURL) : snap.ref.getDownloadURL();
        pUrl.then(url => resolve({
          nombre: archivo.name,
          url: url,
          path: path,
          tipo: archivo.type || '',
          tamano: archivo.size || 0
        }), reject);
      });
  });
}

export function borrarAdjunto(adj: AdjuntoRegistro): Promise<any> {
  if (!adj || !adj.path) { return Promise.resolve(); }
  return (firebase as any).storage().ref(adj.path).delete().catch((err: any) => {
    console.warn('No se pudo borrar el adjunto ' + adj.path, err);
  });
}

// ===================== HH Trabajadores / minutos de capacitación =====================

export const MAX_MINUTOS_CAPACITACION = 1440;

/** Minutos de la capacitación (entero de 0 a 1440). */
export function minutosCapacitacion(v: any): number {
  const n = enteroNoNegativo(v, 'Minutos de capacitación');
  if (n > MAX_MINUTOS_CAPACITACION) { throw new Error('Los minutos de capacitación no pueden superar ' + MAX_MINUTOS_CAPACITACION + ' (24 h).'); }
  return n;
}

/** HH Trabajadores: cantidad de trabajadores del día (entero). */
export function trabajadoresDelDia(v: any): number {
  const n = enteroNoNegativo(v, 'Trabajadores');
  if (n > MAX_TRABAJADORES) { throw new Error('La cantidad de trabajadores parece demasiado alta, revisa el valor.'); }
  return n;
}

/** HH Trabajadores: horas promedio del día (0 a 24, acepta decimales: 8,5). */
export function horasPromedioDia(v: any): number {
  if (v === null || v === undefined || String(v).trim() === '') { return 0; }
  const n = Number(String(v).trim().replace(',', '.'));
  if (!isFinite(n)) { throw new Error('Horas promedio: ingresa un número.'); }
  if (n < 0 || n > 24) { throw new Error('Las horas promedio del día deben estar entre 0 y 24.'); }
  return Math.round(n * 100) / 100;
}