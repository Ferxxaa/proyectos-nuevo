import { Component, OnInit, Input } from '@angular/core';

//Share
import { PopUps } from '../../Share/PopUps';
import { Comunes } from '../../Share/Comunes';

//Model
import { mVis_VerBitacora } from '../../models/mVis_VerBitacora';
import { mSubProyecto } from '../../models/mSubProyecto';
import { mBitacora } from '../../models/mBitacora';
import { mPrioridad } from '../../models/mPrioridad';


//Servicios
import { sVis_VerBitacora } from '../../services/sVis_VerBitacora.service';
import { sSubProyecto } from '../../services/sSubProyecto.service';
import { sPrioridad } from '../../services/sPrioridad.service';
import { sBitacora } from '../../services/sBitacora.service';
import { sCorreo } from '../../services/Personalizados/sCorreo.service';
import { environment } from '../../../environments/environment';

declare var jQuery: any;
declare var $: any;
declare var Swal: any;

@Component({
  selector: 'app-ver-bitacora',
  templateUrl: './ver-bitacora.component.html',
  styleUrls: ['./ver-bitacora.component.css'],
  providers: [
    PopUps,
    Comunes,
    sVis_VerBitacora,
    sPrioridad,
    sBitacora,
    sCorreo
  ]
})
export class VerBitacoraComponent implements OnInit {

  @Input() TipoBitacora: number;
  @Input() soloLectura: boolean = false;
  url: string;

  //Objetos
  SubProyecto: mSubProyecto;
  Bitacora: mBitacora;
  usuario: any;

  //Array
  Prioridades: Array<mPrioridad>
  Bitacoras: Array<mBitacora>;

  //Loading
  Loader: boolean;
  LoadingTabla: boolean;
  loading: boolean;

  //Indices
  IndexUpdate: number;

  constructor(
    private _PopUps: PopUps,
    private _Comunes: Comunes,
    private _sVis_VerBitacora: sVis_VerBitacora,
    private _sPrioridad: sPrioridad,
    private _sBitacora: sBitacora
  ) {
    this.Loader = true;
    this.usuario = JSON.parse(localStorage.usuario);
    this.Bitacora = new mBitacora(null, null, 0, null, null, new Date().toString(), true, null, this.usuario.idUsuario, null, null, null, null);
    this.url = environment.node;
    this.loading = false;
  }

  ngOnInit() {
    //console.log("El tipo de bitacora es:", typeof (this.TipoBitacora));

    //this.Proyectos = this.Proyectos.filter(element => { return element.idProyectoMatriz == this.drdProyectoMatriz; })

    this._sPrioridad.getPrioridad().subscribe(result => {
      //console.log(result);
      this.Prioridades = result;
    });
    this.SubProyecto = JSON.parse(localStorage.SubProyecto);
    this.traeBitacora();
    this.url += this.retUrl(this.TipoBitacora);
  }

  private traeBitacora() {
    this.Loader = true;
    this._sVis_VerBitacora.getVis_VerBitacorabyidSubProyecto(this.SubProyecto.idSubProyecto).subscribe(result => {
      console.log("Bitacoras: ", result);
      this.Bitacoras = result.filter(element => { return element.TipoBitacora == this.TipoBitacora; });
      // this.LoadingTabla = false;
      this.Loader = false;
    });
  }

  retUrl(tipo): string {
    switch (tipo) {
      case 1:
        return "adjuntarBitacora/Proyectos/" + this.SubProyecto.nombreSubProyecto + "/";
      case 2:
        return "adjuntarBitacora/SSOMA/" + this.SubProyecto.nombreSubProyecto + "/";
      case 3:
        return "adjuntarBitacora/Calidad/" + this.SubProyecto.nombreSubProyecto + "/";
    }
    return null;
  }

  VerDetalle(i: number) {
    this.IndexUpdate = i;
    this.Bitacora = new mBitacora(null, null, 0, null, null, new Date().toString(), true, null, this.usuario.idUsuario, null, null, null, null);
    //console.log(this.Bitacoras[i]);

    this._sBitacora.getBitacorabyID(this.Bitacoras[i].idBitacora).subscribe(result => {
      this.Bitacora = result;
      this.Bitacora.descripcion = result.descripcion.replace(/<br>/g, "\n");
      $("#NombreArchUpd").html(this.Bitacora.NombreAdjunto);
    });


    this._PopUps.VerPopUpEditar();
  }

  OcultarPopUpEditar() {
    this.IndexUpdate = 0;
    this._PopUps.OcultarPopUpEditar();
    $("#NombreArchUpd").html("");
  }

  DescargarArchivo(i: number) {
    let bitacora = this.Bitacoras[i];

    if (!bitacora || !bitacora.NombreAdjunto) {
      return;
    }

    if (bitacora.Adjunto) {
      // Detectar si es Base64 o una ruta de archivo del servidor
      const esBase64 = bitacora.Adjunto.startsWith('data:') || /^[A-Za-z0-9+/=]+$/.test(bitacora.Adjunto);
      
      if (esBase64) {
        // Es Base64 (data URI o Base64 puro)
        let base64Data = bitacora.Adjunto;
        let mimeType = "application/octet-stream";
        
        if (bitacora.Adjunto.includes(',')) {
          // Formato: data:application/pdf;base64,XXXX
          const partes = bitacora.Adjunto.split(',');
          const header = partes[0];
          base64Data = partes[1];
          
          const match = header.match(/data:([^;]+)/);
          if (match) {
            mimeType = match[1];
          }
        }
        
        try {
          let binary = this.fixBinary(atob(base64Data));
          let blob = new Blob([binary], { type: mimeType });
          
          if (mimeType === 'application/pdf') {
            let url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 100);
            return;
          }

          if (navigator.msSaveBlob) {
            return navigator.msSaveBlob(blob, bitacora.NombreAdjunto);
          }

          let link = document.createElement('a');
          link.href = window.URL.createObjectURL(blob);
          link.download = bitacora.NombreAdjunto;
          document.body.appendChild(link);
          link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          link.remove();
          window.URL.revokeObjectURL(link.href);
          return;
        } catch (e) {
          console.error('Error decodificando Base64:', e);
          Swal.fire('Error', 'El archivo adjunto está corrupto o tiene formato incorrecto', 'error');
          return;
        }
      } else {
        // Es una ruta de archivo del servidor (ej: /uploads/archivo.pdf o C:\uploads\archivo.pdf)
        // Construir URL completa si es necesario
        let urlArchivo = bitacora.Adjunto;
        
        // Si no empieza con http, asumir que es ruta relativa del servidor de archivos
        if (!urlArchivo.match(/^https?:\/\//i)) {
          // Usar el puerto 3800 donde está el servidor de archivos según el código actual
          urlArchivo = 'http://trazas-nbi.com:3800' + (urlArchivo.startsWith('/') ? '' : '/') + urlArchivo;
        }
        
        window.open(urlArchivo, '_blank');
        return;
      }
    }

    // Si no hay Adjunto, intentar con la ruta antigua (legacy)
    let rutaArchivo = this.getRutaDescarga(bitacora);

    if (!rutaArchivo) {
      return;
    }

    window.open(rutaArchivo, '_blank');

    setTimeout(() => {
      this.OcultarPopUpEditar();
    }, 50);
  }

  private getRutaDescarga(bitacora: { ruta?: string, NombreAdjunto: string }): string {
    if (bitacora.ruta) {
      if (/^(https?:)?\/\//i.test(bitacora.ruta)) {
        return bitacora.ruta;
      }

      return environment.node + bitacora.ruta.replace(/^\/+/, '');
    }

    return this.url ? this.url + bitacora.NombreAdjunto : null;
  }

  fixBinary(bin) {
    var length = bin.length;
    var buf = new ArrayBuffer(length);
    var arr = new Uint8Array(buf);
    for (var i = 0; i < length; i++) {
      arr[i] = bin.charCodeAt(i);
    }
    return buf;
  }

  NombreArchivo() {
    $("#NombreArchUpd").html($("#fileuploadUPD")[0].files[0].name);
    if ($("#fileuploadUPD")[0].files.length > 0) {
      this._Comunes.getFileBlob($("#fileuploadUPD")[0].files[0]).then(blob => {
        this.Bitacora.NombreAdjunto = $("#fileuploadUPD")[0].files[0].name;
        this.Bitacora.Adjunto = blob.toString();
      }).catch(e =>
        // console.log(e)
        console.log("Hola mundo")
      );
    }
  }

  //*************************************************** CRUD ***************************************************

  Actualizar() {
    this.loading = true;
    this.Bitacora.descripcion = this.Bitacora.descripcion.replace(/\n/g, "<br>");

    if ($("#fileuploadUPD")[0].files.length > 0) {
      this._sBitacora.AdjuntarArchivo($("#fileuploadUPD")[0].files[0], this.SubProyecto.nombreSubProyecto, this.TipoBitacora.toString()).then(res => {

        this.Bitacora.NombreAdjunto = $("#fileuploadUPD")[0].files[0].name;
        this.Bitacora.Adjunto = null;
        //console.log(this.Bitacora);

        this._sBitacora.postUpdDelBitacora(this.Bitacora).success(result => {
          //console.log(result);
          this.OcultarPopUpEditar();
          this.traeBitacora();
          this.loading = false;
        })
          .error(e => {
            // console.log(e);
            // console.log("Hola mundo")
            this.loading = false;
          });

      }).catch(e => {
        // console.log(e)
        // console.log("Hola mundo")
      });
    } else {
      this._sBitacora.postUpdDelBitacora(this.Bitacora).success(result => {
        //console.log(result);
        this.OcultarPopUpEditar();
        this.traeBitacora();
      });
    }
  }

  Eliminar() {
    // Verificar que hay una bitácora seleccionada
    if (!this.Bitacora || !this.Bitacora.idBitacora) {
      Swal.fire('Error', 'No hay ninguna bitácora seleccionada', 'error');
      return;
    }

    this.Bitacora.idUsuarioRemovedor = this.usuario.idUsuario;
    this.LoadingTabla = true;

    this._sBitacora.postUpdDelBitacora(this.Bitacora).success(result => {
      // Cerrar el modal de Bootstrap usando jQuery
      $('#exampleModalLong').modal('hide');
      
      // Mostrar mensaje y recargar página
      Swal.fire({
        type: 'success',
        title: 'Eliminado',
        text: 'La bitácora ha sido eliminada',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        // Recargar la página después de eliminar
        window.location.reload();
      });
      
    }).error(e => {
      console.error('Error al eliminar:', e);
      this.LoadingTabla = false;
      Swal.fire('Error', 'No se pudo eliminar la bitácora', 'error');
    });

  }

}