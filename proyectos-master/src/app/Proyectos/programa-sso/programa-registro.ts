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
  hhCapacitacion: number;      // HH capacitadas
  hhEspecificas: number;       // HH específicas (Mutual, OTEC, Mandante, Otros)
  entidadEspecifica: string;   // MUTUAL | OTEC | MANDANTE | OTROS | ''
  hhOperacional: number;       // HH operacionales
  observacion: string;
  adjuntos: AdjuntoRegistro[];
  registradoPor: string;
  fechaRegistro: string;  // ISO
}

export interface HHDia {
  hhCapacitacion: number;
  hhEspecificas: number;
  hhOperacional: number;
}

export interface ResumenHH {
  hhCapacitacion: number;
  hhEspecificas: number;
  hhOperacional: number;
  total: number;
  porDia: { [dia: number]: HHDia };
  /** HH específicas por entidad: { MUTUAL: 4, OTEC: 2, ... } */
  porEntidad: { [entidad: string]: number };
}

export const NIVELES_CUMPLIMIENTO = [
  { v: 100, t: 'Realizado', d: '100%' },
  { v: 75, t: 'Parcial', d: '75%' },
  { v: 50, t: 'Parcial', d: '50%' },
  { v: 0, t: 'No hecho', d: '0%' }
];

export const VALORES_CUMPLIMIENTO = [100, 75, 50, 0];

/** Campos de HH del registro (en este orden se muestran en el popup y en el Excel). */
export const CAMPOS_HH = [
  { k: 'hhCapacitacion', t: 'HH capacitadas' },
  { k: 'hhEspecificas', t: 'HH específicas' },
  { k: 'hhOperacional', t: 'HH operacionales' }
];

/** Quién dictó la capacitación específica. */
export const ENTIDADES_ESPECIFICAS = [
  { v: 'MUTUAL', t: 'Mutual' },
  { v: 'OTEC', t: 'OTEC' },
  { v: 'MANDANTE', t: 'Mandante' },
  { v: 'OTROS', t: 'Otros' }
];

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

export function hhDeRegistro(r: RegistroDia): number {
  if (!r) { return 0; }
  let t = 0;
  CAMPOS_HH.forEach(c => { t += Number((r as any)[c.k]) || 0; });
  return redondear(t);
}

export function resumenHHVacio(): ResumenHH {
  return { hhCapacitacion: 0, hhEspecificas: 0, hhOperacional: 0, total: 0, porDia: {}, porEntidad: {} };
}

/** Suma las HH registradas en un programa (SSO o MA). Se puede acumular sobre otro resumen. */
export function sumarHHPrograma(p: ProgramaMes, acumulado?: ResumenHH): ResumenHH {
  const r = acumulado || resumenHHVacio();
  if (!p || !p.actividades) { return r; }
  p.actividades.forEach(a => {
    const regs = registrosDe(a);
    Object.keys(regs).forEach(k => {
      const reg = regs[k];
      if (!reg) { return; }
      const dia = Number(k);
      if (!r.porDia[dia]) {
        r.porDia[dia] = { hhCapacitacion: 0, hhEspecificas: 0, hhOperacional: 0 };
      }
      const esp = Number(reg.hhEspecificas) || 0;
      if (esp > 0) {
        const ent = reg.entidadEspecifica || 'OTROS';
        r.porEntidad[ent] = redondear((r.porEntidad[ent] || 0) + esp);
      }
      CAMPOS_HH.forEach(campo => {
        const v = Number((reg as any)[campo.k]) || 0;
        (r as any)[campo.k] += v;
        (r.porDia[dia] as any)[campo.k] = redondear((r.porDia[dia] as any)[campo.k] + v);
      });
    });
  });
  let total = 0;
  CAMPOS_HH.forEach(campo => {
    (r as any)[campo.k] = redondear((r as any)[campo.k]);
    total += (r as any)[campo.k];
  });
  r.total = redondear(total);
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