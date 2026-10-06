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
  }

  private archivoSeleccionado(): File {
    var input = $("#fileupload1")[0];
    return input && input.files && input.files.length ? input.files[0] : null;
  }

  NombreArchivo() {
    var file = this.archivoSeleccionado();
    if (!file) {
      return;
    }

    $("#NombreArch").html(file.name);
    this.archivoEstandar.nombreArchivo = file.name;

    var error = this._sArchivoEstandar.validarNombreArchivo(file.name);
    if (error) {
      Swal.fire({
        title: 'Nombre de archivo no válido',
        html: error + '<br><br>Renombra el archivo sin tildes ni caracteres especiales y vuelve a adjuntarlo.',
        icon: 'error'
      });
    }
  }

  guardar(archivoEstandar: mArchivoEstandar) {
    var file = this.archivoSeleccionado();

    if (!file) {
      Swal.fire(
        'Archivos',
        'Debe seleccionar un archivo',
        'error'
      )
      return;
    }

    var error = this._sArchivoEstandar.validarNombreArchivo(file.name);
    if (error) {
      Swal.fire({
        title: 'Nombre de archivo no válido',
        html: error + '<br><br>Renombra el archivo sin tildes ni caracteres especiales y vuelve a adjuntarlo.',
        icon: 'error'
      });
      return;
    }

    this.disable = true;

    this._sArchivoEstandar.postArchivosEstandares(file, archivoEstandar).subscribe(resultado => {
      this.disable = false;
      if (resultado && !resultado.firebaseOk) {
        Swal.fire(
          'Archivo estandar',
          'El archivo se guardó en el servidor, pero no se pudo respaldar en Firebase.',
          'warning'
        )
      }
      this.cerrarEvent();
    }, err => {
      this.disable = false;
      if (err && err.nombreInvalido) {
        Swal.fire({
          title: 'Nombre de archivo no válido',
          html: err.mensaje,
          icon: 'error'
        });
      } else {
        console.error(err);
        Swal.fire(
          'Archivo estandar',
          'No se pudo subir el archivo. Intenta nuevamente.',
          'error'
        )
      }
    });
  }

  cerrarEvent() {
    this.cerrar.emit(null);
  }

}