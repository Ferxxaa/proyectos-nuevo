import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { mArchivoEstandar } from '../../../models/mArchivoEstandar';
import { sArchivoEstandar } from '../../../services/sArchivoEstandar.service';

declare var $: any;
declare var Swal: any;

@Component({
  selector: 'app-agregar-archivo-estandar',
  templateUrl: './agregar-archivo-estandar.component.html',
  styleUrls: ['./agregar-archivo-estandar.component.css'],
  providers: [
    sArchivoEstandar
  ]
})
export class AgregarArchivoEstandarComponent implements OnInit {

  @Input() archivoEstandar: mArchivoEstandar;
  @Output() cerrar = new EventEmitter();

  disable: boolean;

  constructor(
    private _sArchivoEstandar: sArchivoEstandar
  ) {
    this.disable = false;
  }

  ngOnInit() {
    // console.log(this.archivoEstandar);
  }

  NombreArchivo() {
    $("#NombreArch").html($("#fileupload1")[0].files[0].name);
    // console.log($("#fileupload1")[0].files[0]);
    this.archivoEstandar.nombreArchivo = $("#fileupload1")[0].files[0].name;
  }

  guardar(archivoEstandar: mArchivoEstandar) {
    // console.log(archivoEstandar);
    if (this.archivoEstandar.nombreArchivo){
      this.disable = true;
      this._sArchivoEstandar.postArchivosEstandares($("#fileupload1")[0].files[0], archivoEstandar).subscribe(archivoEstandar => {
        this.cerrarEvent()
      });
    } else{
      Swal.fire(
        'Archivos',
        'Debe seleccionar un archivo',
        'error'
      )
    }
  }

  cerrarEvent() {
    this.cerrar.emit(null);
  }

}
