import { Injectable } from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/firestore';

export interface ActividadPrograma {
  id: string;
  grupo: string;
  nombre: string;
  frecuencia: string;      // 'DIARIA' | 'SEMANAL' | 'MENSUAL' | 'SEGUN_NECESIDADES'
  diaSemana: number;       // 1=Lunes ... 5=Viernes (solo SEMANAL, si no 0)
  programados: number[];   // días del mes programados
  realizados: number[];    // días del mes marcados con x
}

export interface ProgramaMes {
  idSubProyecto: string;
  anio: number;
  mes: number;             // 1..12
  codigo: string;
  version: string;
  grupos: string[];
  feriados: number[];      // días marcados como feriado (además de sáb/dom)
  actividades: ActividadPrograma[];

  // Flujo: borrador -> pendiente (programación guardada) -> validado
  estado?: string;         // 'borrador' | 'pendiente' | 'validado'
  programadoPor?: string;
  fechaProgramado?: string;
  validadoPor?: string;
  fechaValidado?: string;
  motivoRechazo?: string;

  actualizado?: any;
}

@Injectable()
export class ProgramaSsoService {

  private coleccion = 'programaSSO';

  private col() {
    return firebase.firestore().collection(this.coleccion);
  }

  docId(idSubProyecto: any, anio: number, mes: number): string {
    return String(idSubProyecto) + '_' + anio + '_' + mes;
  }

  obtener(idSubProyecto: any, anio: number, mes: number): Promise<ProgramaMes> {
    return this.col().doc(this.docId(idSubProyecto, anio, mes)).get().then(snap => {
      if (!snap.exists) { return null; }
      return snap.data() as ProgramaMes;
    });
  }

  mesesExistentes(idSubProyecto: any, anio: number): Promise<number[]> {
    return this.col()
      .where('idSubProyecto', '==', String(idSubProyecto))
      .where('anio', '==', anio)
      .get()
      .then(qs => {
        const meses: number[] = [];
        qs.forEach(d => {
          const data: any = d.data();
          if (data && data.mes) { meses.push(data.mes); }
        });
        return meses;
      });
  }

  guardar(p: ProgramaMes): Promise<void> {
    const data: any = JSON.parse(JSON.stringify(p)); // limpia undefined (Firestore los rechaza)
    data.actualizado = new Date();
    return this.col().doc(this.docId(p.idSubProyecto, p.anio, p.mes)).set(data);
  }
}