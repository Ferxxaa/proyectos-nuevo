import { Pipe, PipeTransform } from '@angular/core';
import { mDetalleSubProyecto } from '../../models/mDetalleSubProyecto';
import { mMis_Proyectos } from '../../models/mMis_Proyectos';
import { sDetalleSubProyecto } from '../../services/sDetalleSubProyecto.service';

@Pipe({
  name: 'addDuracionReal'
})
export class AddDuracionRealPipe implements PipeTransform {

  constructor(
    private detalle: sDetalleSubProyecto
  ) {

  }

  transform(value: mMis_Proyectos[]): any[] {
    if (value) {
      return value.map((el: mMis_Proyectos) => {
        return { ...el, detalle: this.detalle.getDetalleSubProyectobyidSubProyecto(el.idSubProyecto) }
      }).sort((a, b) => a.idSubProyecto > b.idSubProyecto ? 1 : -1);
    }
    return null;
  }

}
