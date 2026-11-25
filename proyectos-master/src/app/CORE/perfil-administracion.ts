import * as firebase from 'firebase/app';
import 'firebase/firestore';

/**
 * Perfil "Administración" manejado 100% en Firestore (no existe en la BD SQL).
 *
 * Colección: perfilesExtra
 * Documento: id = idUsuario (el mismo que viene en localStorage 'usuario')
 * Campos:    { administracion: true, nombre: 'Nombre de la persona' }
 *
 * Solo quien tenga ese documento puede editar Control Asistencia y Flota, Equipos y Maquinaria.
 */
export const COLECCION_PERFILES_EXTRA = 'perfilesExtra';

const cache: { [idUsuario: string]: Promise<boolean> } = {};

export function idUsuarioActual(): string {
  try {
    const u = JSON.parse(localStorage.getItem('usuario') || '{}') || {};
    return u.idUsuario !== undefined && u.idUsuario !== null ? String(u.idUsuario) : '';
  } catch (e) {
    return '';
  }
}

export function esUsuarioAdministracion(idUsuario?: any): Promise<boolean> {
  const id = String(idUsuario !== undefined && idUsuario !== null && idUsuario !== '' ? idUsuario : idUsuarioActual()).trim();
  if (!id) { return Promise.resolve(false); }

  if (!cache[id]) {
    cache[id] = (firebase as any).firestore().collection(COLECCION_PERFILES_EXTRA).doc(id).get()
      .then((doc: any) => {
        const d = doc && doc.exists ? (doc.data() || {}) : {};
        return d.administracion === true;
      })
      .catch((error: any) => {
        console.error('No se pudo leer perfilesExtra (¿está en las reglas de Firestore?):', error);
        delete cache[id];
        return false;
      });
  }
  return cache[id];
}