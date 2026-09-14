import { Pipe, PipeTransform } from '@angular/core';
import { mMis_Proyectos } from '../../models/mMis_Proyectos';

@Pipe({
  name: 'cleanDuplicados'
})
export class CleanDuplicadosPipe implements PipeTransform {

  transform(value: mMis_Proyectos[]): mMis_Proyectos[] {
    if (value) {
      return value.filter((el, index, arr) => {
        return this.validaDuplicado(el, index, arr)
      })
    }
    return null;
  }

  validaDuplicado(el: mMis_Proyectos, i: number, arr: mMis_Proyectos[]): boolean {
    const index = arr.findIndex(buscar => buscar.idSubProyecto == el.idSubProyecto)
    return index == i
  }

}
