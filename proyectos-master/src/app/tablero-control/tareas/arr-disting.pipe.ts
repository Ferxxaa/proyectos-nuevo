import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'arrDisting'
})
export class ArrDistingPipe implements PipeTransform {

  transform(value: Array<any>, args: string[]): any {
    if (value && args) {
      // console.log("Valor: ", value);
      // console.log("Propiedad: ", args);
      let arr: Array<any> = [];
      value.forEach(el => {
        // console.log("Propiedad de elemento Unico: ", el[args[0]]);
        if (!arr.some(item => item[args[0]] == el[args[0]]))
          arr.push(el);
      });
      arr=arr.map(el => {
        return {...el, fullname: `${el.nombre} ${el.paterno}`}
      })
      return arr.sort((a, b) => {
        if (a[args[1]] > b[args[1]]) {
          return 1;
        }
        if (a[args[1]] < b[args[1]]) {
          return -1;
        }
        return 0;
      });
    }
    return null
  }

}
