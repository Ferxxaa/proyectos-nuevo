import { Component, OnInit } from '@angular/core';

//Share
import { PopUps } from '../../Share/PopUps';

//Modelos
import { mProyectoMatriz } from '../../models/mProyectoMatriz';
import { mVis_UsuarioPersona } from '../../models/mVis_UsuarioPersona';
import { mVis_ProyectoMatriz } from '../../models/mVis_ProyectoMatriz';
import { mDirectorProyectoMatriz } from '../../models/mDirectorProyectoMatriz';

//Servicios
import { sProyectoMatriz } from '../../services/sProyectoMatriz.service';
import { sUsuario } from '../../services/sUsuario.service';
import { sPersona } from '../../services/sPersona.service';
import { sVis_ProyectoMatriz } from '../../services/sVis_ProyectoMatriz.service';
import { sDirectorProyectoMatriz } from '../../services/sDirectorProyectoMatriz.service';

declare var jQuery: any;
declare var $: any;

@Component({
  selector: 'app-proyecto-matriz',
  templateUrl: './proyecto-matriz.component.html',
  styleUrls: ['./proyecto-matriz.component.css'],
  providers: [
    sProyectoMatriz,
    sUsuario,
    sPersona,
    sVis_ProyectoMatriz,
    PopUps,
    sDirectorProyectoMatriz
  ]
})
export class ProyectoMatrizComponent implements OnInit {

  //Select
  Usuarios: Array<any>;

  //Controles
  drdDirector1;
  drdDirector2;
  drdDirector3;
  directoresExtra: number[];

  //Loading
  Loading: boolean;
  LoadingTabla: boolean;

  //Tabla
  ProyectosMatriz: Array<mVis_ProyectoMatriz>;

  //Objeto
  ProyectoMatriz: mProyectoMatriz;
  usuario: any;

  //Indices
  IndexUpdate: number;
  IndexEliminar: number;

  //PopUp
  texto: string;
  msg: boolean;

  constructor(
    private _sProyectoMatriz: sProyectoMatriz,
    private _sUsuario: sUsuario,
    private _sPersona: sPersona,
    private _sVis_ProyectoMatriz: sVis_ProyectoMatriz,
    private _PopUps: PopUps,
    private _sDirectorProyectoMatriz: sDirectorProyectoMatriz
  ) {
    this.Loading = false;
    this.LoadingTabla = true;
    this.ProyectoMatriz = new mProyectoMatriz(0, "", 1, 0, 4, true, null, null, null, null);
    this.usuario = JSON.parse(localStorage.usuario);
    this.texto = "";
    this.msg = false;
    this.directoresExtra = [];
  }

  ngOnInit() {
    this._sVis_ProyectoMatriz.getVis_ProyectoMatriz().subscribe(result => { this.ProyectosMatriz = result; this.LoadingTabla = false; });

    // Cargar usuarios activos como en la gestión de usuarios
    this.Usuarios = [];
    this._sUsuario.getUsuariobyactivo(true).subscribe(
      usuarios => {
        usuarios.forEach(usuario => {
          this._sPersona.getPersonabyID(usuario.idPersona).subscribe(persona => {
            this.Usuarios.push({
              idUsuario: usuario.idUsuario,
              nombre: persona.nombre,
              paterno: persona.paterno,
              materno: persona.materno
            });
          });
        });
      },
      error => {
        console.log("Error: " + error);
      }
    )
    this.drdDirector1 = 0;
    this.drdDirector2 = 0;
    this.drdDirector3 = 0;
    this.directoresExtra = [];

  }

  //*************************************************** CRUD ***************************************************

  Agregar(Form) {
    $("body").attr("style", "overflow-y: hidden;");
    this.texto = "";
    this.msg = false;
    this.Loading = true;
    this._sProyectoMatriz.postAddProyectoMatriz(this.ProyectoMatriz)
      .success(result => {
        this.agregarDirectoresSecuencial(result.idProyectoMatriz, this.obtenerDirectoresSeleccionados(), () => {
          this.drdDirector1 = 0;
          this.drdDirector2 = 0;
          this.drdDirector3 = 0;
          this.directoresExtra = [];
          this.Recarga();
          this.texto = "Proyecto Matriz creado de forma correcta";
          this.msg = true;
        });
      })
      .error(error => { this.Loading = false; });
  }

  private Recarga() {
    this.ProyectoMatriz = new mProyectoMatriz(0, "", 1, 0, 4, true, null, null, null, null);
    this._sVis_ProyectoMatriz.getVis_ProyectoMatriz().subscribe(result => { this.ProyectosMatriz = result; });
    this.directoresExtra = [];
    this.Loading = false;
  }

  Actualizar(EForm) {
    $("body").attr("style", "overflow-y: hidden;");
    this.texto = "";
    this.msg = false;
    this.Loading = true;
    let idproyectoMatriz = this.ProyectoMatriz.idProyectoMatriz;
    this._sProyectoMatriz.postUpdDelProyectoMatriz(this.ProyectoMatriz).success(
      result => {
        this._sDirectorProyectoMatriz.getDirectorProyectoMatrizbyidProyectoMatriz(idproyectoMatriz).subscribe(result => {
          this.desactivarDirectoresSecuencial(result || [], () => {
            const directoresSeleccionados = this.obtenerDirectoresSeleccionados();
            this.agregarDirectoresSecuencial(idproyectoMatriz, directoresSeleccionados, () => {
              this.OcultarPopUpEditar();
              this.drdDirector1 = 0;
              this.drdDirector2 = 0;
              this.drdDirector3 = 0;
              this.directoresExtra = [];
              this.texto = "Proyecto Matriz editado de forma correcta";
              this.msg = true;
              this.Recarga();
            });
          });
        }, error => {
          console.log(error);
          this.Loading = false;
        });

      }
    );

  }

  private obtenerDirectoresSeleccionados(): number[] {
    const ids = [this.drdDirector1, this.drdDirector2, this.drdDirector3]
      .concat(this.directoresExtra || [])
      .map(valor => Number(valor))
      .filter(valor => valor > 0);

    return ids.filter((valor, indice, arr) => arr.indexOf(valor) === indice);
  }

  private desactivarDirectoresSecuencial(directores: any[], done: () => void) {
    const lista = directores || [];
    const ejecutar = (index: number) => {
      if (index >= lista.length) {
        done();
        return;
      }

      const element = lista[index];
      element.idUsuarioRemovedor = this.usuario.idUsuario;
      this._sDirectorProyectoMatriz.postUpdDelDirectorProyectoMatriz(element)
        .success(() => ejecutar(index + 1))
        .error(() => ejecutar(index + 1));
    };

    ejecutar(0);
  }

  private agregarDirectoresSecuencial(idProyectoMatriz: number, directores: number[], done: () => void) {
    const lista = directores || [];
    const ejecutar = (index: number) => {
      if (index >= lista.length) {
        done();
        return;
      }

      const directorPM = new mDirectorProyectoMatriz(
        null,
        idProyectoMatriz,
        lista[index],
        true,
        null,
        null,
        this.usuario.idUsuario,
        null
      );

      this._sDirectorProyectoMatriz.postAddDirectorProyectoMatriz(directorPM)
        .success(() => ejecutar(index + 1))
        .error(() => ejecutar(index + 1));
    };

    ejecutar(0);
  }

  AgregarDirector() {
    this.directoresExtra.push(0);
  }

  QuitarDirector(index?: number) {
    if (!this.directoresExtra.length) {
      return;
    }

    const indice = (index === undefined || index === null) ? this.directoresExtra.length - 1 : index;
    this.directoresExtra.splice(indice, 1);
  }

  Eliminar() {
    $("body").attr("style", "overflow-y: hidden;");
    this.texto = "";
    this.msg = false;
    this.Loading = true;
    this.ProyectoMatriz.idProyectoMatriz = this.ProyectosMatriz[this.IndexEliminar].idProyectoMatriz;
    this.ProyectoMatriz.idUsuarioRemovedor = this.usuario.idUsuario;

    //Elimina Proyecto matriz
    this._sProyectoMatriz.postUpdDelProyectoMatriz(this.ProyectoMatriz)
      .success(
        result => {
          this._sVis_ProyectoMatriz.getVis_ProyectoMatriz().subscribe(result => { this.ProyectosMatriz = result; });
          this.texto = "Proyecto Matriz eliminado de forma correcta";
          this.msg = true;
        }
      )
      .error(
        error => {
          console.log(error);
          this.Loading = false;
        }
      );

    //Elimina Directores
    this._sDirectorProyectoMatriz.getDirectorProyectoMatrizbyidProyectoMatriz(this.ProyectoMatriz.idProyectoMatriz).subscribe(result => {
      result.forEach(element => {
        element.idUsuarioRemovedor = this.usuario.idUsuario;
        this._sDirectorProyectoMatriz.postUpdDelDirectorProyectoMatriz(element);
      });
      this._PopUps.OcultarConfirmacion();
      this.Recarga();
    });
  }
  //*************************************************** PopUP ***************************************************

  Editar(i: number) {
    this.drdDirector1 = 0;
    this.drdDirector2 = 0;
    this.drdDirector3 = 0;
    this.directoresExtra = [];
    this._sProyectoMatriz.getProyectoMatrizbyID(this.ProyectosMatriz[i].idProyectoMatriz).subscribe(
      result => {
        this.ProyectoMatriz = result;
      }
    )
    this._sDirectorProyectoMatriz.getDirectorProyectoMatrizbyidProyectoMatriz(this.ProyectosMatriz[i].idProyectoMatriz).subscribe(
      result => {
        this.drdDirector1 = (result[0] != undefined) ? result[0].idUsuarioDirector : 0;
        this.drdDirector2 = (result[1] != undefined) ? result[1].idUsuarioDirector : 0;
        this.drdDirector3 = (result[2] != undefined) ? result[2].idUsuarioDirector : 0;
        this.directoresExtra = (result || []).slice(3).map(element => element.idUsuarioDirector || 0);
      }
    )
    this.IndexUpdate = i;
    this._PopUps.VerPopUpEditar();
  }

  OcultarPopUpEditar() {
    this.ProyectoMatriz = new mProyectoMatriz(0, "", 1, 0, 4, true, null, null, null, null);
    this.IndexUpdate = 0;
    this._PopUps.OcultarPopUpEditar();
    $("#txtNombre").focus();
  }

  Confirmacion(i) {
    this._PopUps.Confirmacion();
    this.IndexEliminar = i;
  }

  OcultarConfirmacion() {
    this._PopUps.OcultarConfirmacion();
  }


}
