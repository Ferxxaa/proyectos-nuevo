import { Component, Input, OnInit } from '@angular/core';

//Share
import { environment } from "../../../environments/environment";

//Model
import { mArchivoEstandar } from '../../models/mArchivoEstandar';

//Servicios
import { sArchivoAdjunto } from '../../services/sArchivoAdjunto.service';
import { sTipoArchivoAdjunto } from '../../services/sTipoArchivoAdjunto.service';
import { sArchivoEstandar } from '../../services/sArchivoEstandar.service';
import { Observable } from 'rxjs/Observable';

declare var $: any;
declare var Swal: any;

@Component({
  selector: 'app-archios-estandar',
  templateUrl: './archios-estandar.component.html',
  styleUrls: ['./archios-estandar.component.css'],
  providers: [
    sArchivoAdjunto,
    sTipoArchivoAdjunto,
    sArchivoEstandar
  ]
})
export class ArchiosEstandarComponent implements OnInit {

  Archivos: Array<any>;
  Archivos$: Observable<mArchivoEstandar[]>;
  urlnode: string;

  archivoEstandar: mArchivoEstandar
  open: number;

  @Input() perfiles: any;
  @Input() soloLectura: boolean = false;


  constructor(
    private _sArchivoAdjunto: sArchivoAdjunto,
    private _sTipoArchivoAdjunto: sTipoArchivoAdjunto,
    private _sArchivoEstandar: sArchivoEstandar
  ) {
    this.archivoEstandar = null;
    this.open = 1;
    this.urlnode = null;
  }

  ngOnInit() {
    // this._sTipoArchivoAdjunto.getTipoArchivoAdjunto().subscribe(result => {
    //   console.log(result);
    //   for (let i = 0; i < result.length; i++) {
    //     this._sArchivoAdjunto.getArchivoAdjuntobyidTipoArchivoAdjunto(result[i].idTipoArchivoAdjunto).subscribe(result => {
    //       this.Archivos[i] = result;
    //       console.log(this.Archivos[i]);
    //     });
    //   }

    // });
    this.urlnode = environment.node;
  }

  CargaArchivos(dv: string, idTipoArchivoAdjunto: number) {
    this.open = idTipoArchivoAdjunto;
    this.Archivos = [];

    let div = ["collapseOne", "collapseTwo", "collapseThree", "collapseFour", "collapseFive", "collapseSix", "collapseSeven"];

    // console.log(dv);

    div.forEach(element => {
      if (element != dv) {
        $("#" + element).attr('class', 'panel-collapse collapse');
      }
    });

    this.Archivos$ = this._sArchivoEstandar.getArchivosEstandaresByTipo(idTipoArchivoAdjunto)

    // this._sArchivoAdjunto.getArchivoAdjuntobyidTipoArchivoAdjunto(idTipoArchivoAdjunto).subscribe(result => {
    //   this.Archivos = result;
    // });
  }

  verPupUp(tipo: number) {
    this.archivoEstandar = new mArchivoEstandar(null, null, null, null, tipo)
  }

  cerrarpopUp(e) {
    this.archivoEstandar = e
    this.Archivos$ = this._sArchivoEstandar.getArchivosEstandaresByTipo(this.open);
  }

  eliminar(archivo: mArchivoEstandar) {
    // console.log(archivo);
    Swal.fire({
      title: 'Eliminar archivo estandar',
      text: "¿Esta seguro de eliminar el archivo estandar " + archivo.nombreArchivo + "?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Eliminar'
    }).then((result) => {
      if (result.value) {
        this.eliminando(archivo)
      }
    })
  }

  eliminando(archivo: mArchivoEstandar) {
    // Swal.fire(
    //   'Deleted!',
    //   'Your file has been deleted.',
    //   'success'
    // )
    this._sArchivoEstandar.deleteArchivosEstandares(archivo).subscribe(eliminado => {
      Swal.fire(
        'Archivo estandar',
        'Se ha eliminado el archivo seleccionado.',
        'success'
      )
    });

  }

  admin(): boolean {
    if (this.perfiles.length > 0) {
      const perfiles = this.perfiles.map(el => el.idPerfil)
      return perfiles.includes(1) || perfiles.includes(4)
    } else 
      return false
    
  }

}
