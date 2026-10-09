import { Injectable } from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/firestore';
import { environment } from '../../../environments/environment';

/**
 * Orden manual de las bitácoras, compartido entre todos los usuarios.
 * Se guarda en Firestore (colección "ordenBitacora"), sin tocar el backend SQL.
 * Documento: {idSubProyecto}_{TipoBitacora} -> { ids: [idBitacora...], idUsuario, fecha }
 * Se usa localStorage como respaldo por si Firestore falla.
 */
@Injectable()
export class sOrdenBitacora {

  private readonly COLECCION = 'ordenBitacora';

  private db(): any {
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp((environment as any).firebase);
    return app.firestore();
  }

  private docId(idSubProyecto: any, tipoBitacora: any): string {
    return String(idSubProyecto) + '_' + String(tipoBitacora);
  }

  private cacheKey(idSubProyecto: any, tipoBitacora: any): string {
    return 'ordenBitacora_' + this.docId(idSubProyecto, tipoBitacora);
  }

  private leerCache(idSubProyecto: any, tipoBitacora: any): any[] {
    try {
      const raw = localStorage.getItem(this.cacheKey(idSubProyecto, tipoBitacora));
      const arr = raw ? JSON.parse(raw) : null;
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  private escribirCache(idSubProyecto: any, tipoBitacora: any, ids: any[]) {
    try {
      if (ids && ids.length) {
        localStorage.setItem(this.cacheKey(idSubProyecto, tipoBitacora), JSON.stringify(ids));
      } else {
        localStorage.removeItem(this.cacheKey(idSubProyecto, tipoBitacora));
      }
    } catch (e) { }
  }

  getOrden(idSubProyecto: any, tipoBitacora: any): Promise<any[]> {
    try {
      return this.db().collection(this.COLECCION).doc(this.docId(idSubProyecto, tipoBitacora)).get()
        .then((snap: any) => {
          const data = snap.exists ? snap.data() : null;
          const ids = data && Array.isArray(data.ids) ? data.ids : [];
          this.escribirCache(idSubProyecto, tipoBitacora, ids);
          return ids;
        })
        .catch((e: any) => {
          console.warn('No se pudo leer el orden desde Firebase, uso cache local', e);
          return this.leerCache(idSubProyecto, tipoBitacora);
        });
    } catch (e) {
      console.warn('Firebase no disponible, uso cache local', e);
      return Promise.resolve(this.leerCache(idSubProyecto, tipoBitacora));
    }
  }

  guardarOrden(idSubProyecto: any, tipoBitacora: any, ids: any[], idUsuario: any): Promise<void> {
    this.escribirCache(idSubProyecto, tipoBitacora, ids);
    try {
      return this.db().collection(this.COLECCION).doc(this.docId(idSubProyecto, tipoBitacora)).set({
        idSubProyecto: idSubProyecto,
        TipoBitacora: Number(tipoBitacora),
        ids: ids,
        idUsuario: idUsuario || null,
        fecha: new Date().toISOString()
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  borrarOrden(idSubProyecto: any, tipoBitacora: any): Promise<void> {
    this.escribirCache(idSubProyecto, tipoBitacora, []);
    try {
      return this.db().collection(this.COLECCION).doc(this.docId(idSubProyecto, tipoBitacora)).delete();
    } catch (e) {
      return Promise.reject(e);
    }
  }
}