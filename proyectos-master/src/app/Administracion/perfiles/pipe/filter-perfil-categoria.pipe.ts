import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterPerfilCategoria'
})
export class FilterPerfilCategoriaPipe implements PipeTransform {

  transform(value: any[], categoria: string): any {
    // console.log(value);
    
    if (value) {
      switch (categoria) {
        case '1':
          return value.filter(el => el.idPerfil <= 5 || el.idPerfil == 9)
        case '2':
          return value.filter(el => el.idPerfil == 7 || el.idPerfil == 8)
        case '3':
          return value.filter(el => el.idPerfil >= 10)
        default:
          return value
      }
    }
    return null
  }

}
