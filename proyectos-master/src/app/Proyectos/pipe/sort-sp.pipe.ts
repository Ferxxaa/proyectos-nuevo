import { Pipe, PipeTransform } from '@angular/core';
import { mTabla_Proyectos } from '../../models/mTabla_Proyectos';
import { mTabla_SubProyecto } from '../../models/mTabla_SubProyecto';

@Pipe({
  name: 'sortSp'
})
export class SortSpPipe implements PipeTransform {

  transform(value: mTabla_SubProyecto[]): mTabla_SubProyecto[] {
    if (value && value.length) {
      let orden = value.sort((a, b) => a.idSubProyecto < b.idSubProyecto ? 1 : -1);
      console.log(orden);
      
      return orden
    }
    return null;
  }

}
