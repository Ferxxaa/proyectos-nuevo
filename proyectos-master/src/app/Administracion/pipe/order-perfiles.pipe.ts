import { Pipe, PipeTransform } from '@angular/core';
import { mPerfil } from '../../models/mPerfil';

@Pipe({
  name: 'orderPerfiles'
})
export class OrderPerfilesPipe implements PipeTransform {

  transform(value: mPerfil[]): any {
    if (value) {
      let orden = value.map(el => this.asignOrden(el));
      console.log(orden);
      return orden.sort((a, b) => a.orden > b.orden ? 1 : -1)
    }
    return null;
  }

  asignOrden(perfil: mPerfil): any {
    let orden: number = 0;
    switch (perfil.nombrePerfil) {
      case "Coordinador":
        orden = 1;
        break;
      case "Director":
        orden = 2;
        break;
      case "Sub-Gerente":
        orden = 3;
        break;
      case "Seguridad":
        orden = 4;
        break;
      case "Cliente":
        orden = 5;
        break;
      case "CoordinadorLic":
        orden = 6;
        break;
      case "DirectorLic":
        orden = 7;
        break;
      case "Administracion":
        orden = 8;
        break;
      case "JefeAdministracion":
        orden = 9;
        break;
      case "Generente-Administracion":
        orden = 10;
        break;
      case "Sistemas":
        orden = 11;
        break;
    }
    return { ...perfil, orden: orden }
  }

}
