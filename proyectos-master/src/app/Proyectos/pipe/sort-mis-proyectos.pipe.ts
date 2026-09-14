import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sortMisProyectos'
})
export class SortMisProyectosPipe implements PipeTransform {

  transform(value: any[]): any {
    if (value)
      return value.sort((a, b) => a.idSubProyecto < b.idSubProyecto ? 1 : -1)
    return value;
  }

}
