import { firestoreDB } from '../../firebase-init';

/**
 * Agenda central de trabajadores de CORE.
 * Firestore: colección 'trabajadoresCore', un documento por trabajador.
 * Si tiene RUT, el id del documento es el RUT limpio (sin puntos ni guion), así no se repite.
 * (Agregar 'trabajadoresCore' a las reglas de seguridad de Firestore.)
 */
export const COLECCION_TRABAJADORES = 'trabajadoresCore';

export interface TrabajadorCore {
  id: string;
  nombre: string;
  apellido: string;
  rut: string;        // con formato: 12.345.678-9
  rutLimpio: string;  // 123456789
  cargo: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

// ===================== RUT =====================

export function limpiarRut(rut: string): string {
  return String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
}

/** 123456789 -> 12.345.678-9 */
export function formatearRut(rut: string): string {
  const limpio = limpiarRut(rut);
  if (limpio.length < 2) { return limpio; }
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
}

/** Valida el dígito verificador (módulo 11). */
export function rutValido(rut: string): boolean {
  const limpio = limpiarRut(rut);
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) { return false; }
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const res = 11 - (suma % 11);
  const esperado = res === 11 ? '0' : (res === 10 ? 'K' : String(res));
  return dv === esperado;
}

// ===================== Texto =====================

export function normalizarTexto(t: any): string {
  return (String(t || '') as any).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Nombre propio: "juan PÉREZ" -> "Juan Pérez" */
export function capitalizar(t: string): string {
  return String(t || '').trim().replace(/\s+/g, ' ').toLowerCase()
    .replace(/(^|\s|-)(\S)/g, (m: string, sep: string, letra: string) => sep + letra.toUpperCase());
}

/** Texto que se muestra en el autocompletar: "Juan Pérez · 12.345.678-9" */
export function etiquetaTrabajador(t: TrabajadorCore): string {
  return [((t.nombre || '') + ' ' + (t.apellido || '')).trim(), t.rut].filter(x => !!x).join(' · ');
}

// ===================== Firestore =====================

export function listarTrabajadores(): Promise<TrabajadorCore[]> {
  return firestoreDB.collection(COLECCION_TRABAJADORES).get().then((snap: any) => {
    const lista: TrabajadorCore[] = [];
    snap.forEach((doc: any) => {
      const d = doc.data() || {};
      lista.push({
        id: doc.id,
        nombre: d.nombre || '',
        apellido: d.apellido || '',
        rut: d.rut || '',
        rutLimpio: d.rutLimpio || limpiarRut(d.rut),
        cargo: d.cargo || '',
        fechaCreacion: d.fechaCreacion || '',
        fechaActualizacion: d.fechaActualizacion || ''
      });
    });
    return ordenarTrabajadores(lista);
  });
}

export function ordenarTrabajadores(lista: TrabajadorCore[]): TrabajadorCore[] {
  return lista.sort((a, b) =>
    (a.apellido || '').localeCompare(b.apellido || '', 'es', { sensitivity: 'base' }) ||
    (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
}

/**
 * Crea o actualiza un trabajador. Devuelve el trabajador guardado (con su id).
 * Si viene con RUT, el id es el RUT limpio; si no, se genera uno.
 */
export function guardarTrabajador(t: TrabajadorCore, idUsuario?: any): Promise<TrabajadorCore> {
  const rutLimpio = limpiarRut(t.rut);
  const datos: any = {
    nombre: capitalizar(t.nombre),
    apellido: capitalizar(t.apellido),
    rut: rutLimpio ? formatearRut(rutLimpio) : '',
    rutLimpio: rutLimpio,
    cargo: String(t.cargo || '').trim(),
    fechaActualizacion: new Date().toISOString(),
    idUsuarioActualizacion: idUsuario === undefined ? null : idUsuario
  };
  if (!t.id) { datos.fechaCreacion = datos.fechaActualizacion; }

  const coleccion = firestoreDB.collection(COLECCION_TRABAJADORES);
  const id = t.id || rutLimpio || ('t' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4));
  return coleccion.doc(id).set(datos, { merge: true }).then(() => {
    const res: TrabajadorCore = {
      id: id, nombre: datos.nombre, apellido: datos.apellido, rut: datos.rut, rutLimpio: rutLimpio,
      cargo: datos.cargo, fechaCreacion: datos.fechaCreacion || t.fechaCreacion || '', fechaActualizacion: datos.fechaActualizacion
    };
    return res;
  });
}

export function eliminarTrabajador(id: string): Promise<any> {
  return firestoreDB.collection(COLECCION_TRABAJADORES).doc(id).delete();
}

/**
 * Claves para reconocer a la misma persona en distintos subproyectos:
 * id de la agenda, RUT y nombre + apellido (las filas antiguas pueden no tener id o RUT).
 */
export function clavesTrabajador(t: any): string[] {
  const claves: string[] = [];
  if (!t) { return claves; }
  if (t.idTrabajador) { claves.push('id:' + t.idTrabajador); }
  if (t.id && t.rutLimpio !== undefined) { claves.push('id:' + t.id); }   // trabajador de la agenda
  const rut = limpiarRut(t.rut || t.rutLimpio);
  if (rut) { claves.push('rut:' + rut); }
  const nombre = normalizarTexto((t.nombre || '') + ' ' + (t.apellido || ''));
  if (nombre) { claves.push('nom:' + nombre.replace(/\s+/g, ' ')); }
  return claves;
}

/** Busca en la agenda por RUT o, si no hay RUT, por nombre + apellido. */
export function buscarEnAgenda(agenda: TrabajadorCore[], datos: { rut?: string; nombre?: string; apellido?: string }): TrabajadorCore {
  const rut = limpiarRut(datos.rut);
  if (rut) { return agenda.filter(t => t.rutLimpio === rut)[0] || null; }
  const n = normalizarTexto(datos.nombre);
  const a = normalizarTexto(datos.apellido);
  if (!n || !a) { return null; }
  return agenda.filter(t => normalizarTexto(t.nombre) === n && normalizarTexto(t.apellido) === a)[0] || null;
}