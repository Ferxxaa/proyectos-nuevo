import { Component, Input, OnInit } from '@angular/core';

//Model
import { mArchivoEstandar } from '../../models/mArchivoEstandar';

//Servicios
import { sArchivoAdjunto } from '../../services/sArchivoAdjunto.service';
import { sTipoArchivoAdjunto } from '../../services/sTipoArchivoAdjunto.service';
import { sArchivoEstandar } from '../../services/sArchivoEstandar.service';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { catchError, shareReplay } from 'rxjs/operators';

declare var $: any;
declare var Swal: any;

// Backend Node (Express) donde viven los archivos estándar. NO es el IIS :1234.
const NODE_URL = 'http://trazas-nbi.com:3800/api/';

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

  // Orden en que se muestran los paneles
  paneles = [
    { id: 'collapseTwo',   tipo: 2, titulo: 'Registros de seguridad y salud ocupacional PR-06' },
    { id: 'collapseThree', tipo: 3, titulo: 'Registros de medio ambiente PR-07' },
    { id: 'collapseFour',  tipo: 4, titulo: 'Registros de investigación de incidente PR-08' },
    { id: 'collapseFive',  tipo: 5, titulo: 'Registros de arquitectura PR 10-A' },
    { id: 'collapseOne',   tipo: 1, titulo: 'Registros de construcción PR 10-B' },
    { id: 'collapseSeven', tipo: 7, titulo: 'Registros de inspección PR 10-C' },
    { id: 'collapseSix',   tipo: 6, titulo: 'Registros de Saneamiento MCA PR-12' }
  ];

  @Input() perfiles: any;
  @Input() soloLectura: boolean = false;


  constructor(
    private _sArchivoAdjunto: sArchivoAdjunto,
    private _sTipoArchivoAdjunto: sTipoArchivoAdjunto,
    private _sArchivoEstandar: sArchivoEstandar
  ) {
    this.archivoEstandar = null;
    this.open = null;
    this.urlnode = null;
  }

  ngOnInit() {
    this.urlnode = NODE_URL;
  }

  private obtenerArchivos(idTipoArchivoAdjunto: number): Observable<mArchivoEstandar[]> {
    return this._sArchivoEstandar.getArchivosEstandaresByTipo(idTipoArchivoAdjunto).pipe(
      catchError(err => {
        console.error('Error cargando archivos estándar tipo ' + idTipoArchivoAdjunto, err);
        return of([] as mArchivoEstandar[]);
      }),
      shareReplay(1)
    );
  }

  // Firebase si tiene respaldo; si no, el Node
  linkDescarga(archivo: mArchivoEstandar): string {
    if (archivo.urlFirebase) {
      return archivo.urlFirebase;
    }
    return this.urlnode + 'adjuntar/' + encodeURIComponent(archivo.nombreArchivo);
  }

  CargaArchivos(dv: string, idTipoArchivoAdjunto: number) {
    this.open = idTipoArchivoAdjunto;
    this.Archivos = [];

    this.paneles.forEach(panel => {
      if (panel.id != dv) {
        $("#" + panel.id).attr('class', 'panel-collapse collapse');
      }
    });

    this.Archivos$ = this.obtenerArchivos(idTipoArchivoAdjunto);
  }

  verPupUp(tipo: number) {
    this.archivoEstandar = new mArchivoEstandar(null, null, null, null, tipo)
  }

  cerrarpopUp(e) {
    this.archivoEstandar = e
    if (this.open) {
      this.Archivos$ = this.obtenerArchivos(this.open);
    }
  }

  eliminar(archivo: mArchivoEstandar) {
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
    this._sArchivoEstandar.deleteArchivosEstandares(archivo).subscribe(eliminado => {
      Swal.fire(
        'Archivo estandar',
        'Se ha eliminado el archivo seleccionado.',
        'success'
      )
      this.Archivos$ = this.obtenerArchivos(this.open);
    }, err => {
      Swal.fire(
        'Archivo estandar',
        'No se pudo eliminar el archivo.',
        'error'
      )
    });
  }

  admin(): boolean {
    if (this.perfiles && this.perfiles.length > 0) {
      const perfiles = this.perfiles.map(el => el.idPerfil)
      return perfiles.includes(1) || perfiles.includes(4)
    } else
      return false
  }

}