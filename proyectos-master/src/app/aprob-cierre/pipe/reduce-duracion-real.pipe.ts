import { Pipe, PipeTransform } from '@angular/core';
import { mDetalleSubProyecto } from '../../models/mDetalleSubProyecto';
import { Comunes } from '../../Share/Comunes';

@Pipe({
  name: 'reduceDuracionReal'
})
export class ReduceDuracionRealPipe implements PipeTransform {

  constructor(
    private comunes: Comunes
  ) { }

  transform(value: mDetalleSubProyecto[]): number {
    if (value) {
      let duracionEtapa: number[] = value.map(el => this.comunes.calDuracionProy(el.fechaInicioReal, el.fechaTerminoReal))
      return duracionEtapa.reduce((acc: number, el: number) => acc + el, 0)
    }
    return null;
  }
}
