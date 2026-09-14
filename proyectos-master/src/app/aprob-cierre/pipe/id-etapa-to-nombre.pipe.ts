import { Pipe, PipeTransform } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { sEtapa } from '../../services/sEtapa.service';

@Pipe({
  name: 'idEtapaToNombre'
})
export class IdEtapaToNombrePipe implements PipeTransform {

  constructor(
    private etapa: sEtapa
  ) {

  }

  transform(idEtapa: number): Observable<any> {
    if (idEtapa) {
      return this.etapa.getEtapabyID(idEtapa);
    }
    return null;
  }

}
