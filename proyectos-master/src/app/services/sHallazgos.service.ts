import { Injectable } from '@angular/core';
import { firestoreDB } from '../firebase-init';
import { Observable } from 'rxjs';

export interface HallazgoItem {
  id?: string;
  fecha: string;
  anio: number;
  numero: number;
  tipoAccion: string;
  estado: string;
  areaResponsable: string;
  obra: string;
  quienDetecta: string;
  origenHallazgo: string;
  descripcion: string;
  accionInmediata: string;
  seguimientoResponsable: string;
  idSubProyecto: string;
}

@Injectable()
export class sHallazgos {

  getHallazgosPorSubProyecto(idSubProyecto: string): Observable<HallazgoItem[]> {
    return new Observable(observer => {
      const unsubscribe = firestoreDB.collection('hallazgos')
        .where('idSubProyecto', '==', idSubProyecto)
        .orderBy('numero', 'desc')
        .onSnapshot(snapshot => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HallazgoItem));
          observer.next(items);
        }, error => observer.error(error));

      return { unsubscribe };
    });
  }

  agregar(hallazgo: HallazgoItem) {
    return firestoreDB.collection('hallazgos').add(hallazgo);
  }

  actualizar(id: string, cambios: Partial<HallazgoItem>) {
    return firestoreDB.collection('hallazgos').doc(id).update(cambios);
  }

  eliminar(id: string) {
    return firestoreDB.collection('hallazgos').doc(id).delete();
  }
}
