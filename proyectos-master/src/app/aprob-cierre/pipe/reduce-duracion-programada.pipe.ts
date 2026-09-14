import { Pipe, PipeTransform } from '@angular/core';
import { mDetalleSubProyecto } from '../../models/mDetalleSubProyecto';

@Pipe({
  name: 'reduceDuracionProgramada'
})
export class ReduceDuracionProgramadaPipe implements PipeTransform {

  transform(value: mDetalleSubProyecto[]): number {
    if (value) {
      return value.reduce((acc: number, el: mDetalleSubProyecto) => acc + el.duracion, 0);
    }
    return null;
  }

}
