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

  // Base del Node de archivos (mismo servidor que usa AdjuntarArchivo). Hardcodeado a propósito
  // para no depender de environment.node.
  private readonly NODE_BASE: string = 'http://trazas-nbi.com:3800/api/';

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
    this.url = this.NODE_BASE;
    this.loading = false;
  }

  ngOnInit() {
    this._sPrioridad.getPrioridad().subscribe(result => {
      this.Prioridades = result;
    });
    this.SubProyecto = JSON.parse(localStorage.SubProyecto);
    this.traeBitacora();
    this.url = this.NODE_BASE + (this.retUrl(this.TipoBitacora) || '');
  }

  private traeBitacora() {
    this.Loader = true;
    this._sVis_VerBitacora.getVis_VerBitacorabyidSubProyecto(this.SubProyecto.idSubProyecto).subscribe(result => {
      this.Bitacoras = result.filter(element => { return element.TipoBitacora == this.TipoBitacora; });
      this.Loader = false;
    });
  }

  retUrl(tipo): string {
    const nombre = encodeURIComponent(this.SubProyecto.nombreSubProyecto);
    switch (Number(tipo)) {
      case 1:
        return "adjuntarBitacora/Proyectos/" + nombre + "/";
      case 2:
        return "adjuntarBitacora/SSOMA/" + nombre + "/";
      case 3:
        return "adjuntarBitacora/Calidad/" + nombre + "/";
    }
    return null;
  }

  VerDetalle(i: number) {
    this.IndexUpdate = i;
    this.Bitacora = new mBitacora(null, null, 0, null, null, new Date().toString(), true, null, this.usuario.idUsuario, null, null, null, null);

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

  //*************************************************** Descarga ***************************************************

  DescargarArchivo(i: number) {
    const bitacora: any = this.Bitacoras[i];

    if (!bitacora || !bitacora.NombreAdjunto) {
      return;
    }

    const adjunto: string = bitacora.Adjunto;

    // Registros antiguos que guardaron el archivo en Base64 en la BD
    if (adjunto && this.esBase64(adjunto)) {
      this.abrirBase64(adjunto, bitacora.NombreAdjunto);
      return;
    }

    const candidatas = this.getRutasCandidatas(bitacora);

    if (!candidatas.length) {
      Swal.fire('Error', 'No se pudo determinar la ruta del archivo', 'error');
      return;
    }

    const nombre: string = bitacora.NombreAdjunto;
    const mime = this.mimeDesdeNombre(nombre);
    const visualizable = mime === 'application/pdf' || mime.startsWith('image/');

    // La pestaña se abre ahora, dentro del click, para que el navegador no la bloquee
    const ventana = visualizable ? window.open('', '_blank') : null;

    this.buscarArchivo(candidatas, 0, false).then(res => {

      if (res.blob) {
        const blob = new Blob([res.blob], { type: mime });

        if (visualizable) {
          const urlBlob = window.URL.createObjectURL(blob);
          if (ventana) {
            ventana.location.href = urlBlob;
          } else {
            window.open(urlBlob, '_blank');
          }
          setTimeout(() => window.URL.revokeObjectURL(urlBlob), 60000);
        } else {
          this.descargarBlob(blob, nombre);
        }
        return;
      }

      // Si todo falló por CORS/red (no por "no existe"), se intenta abrir directo
      if (res.soloErroresDeRed) {
        if (ventana) {
          ventana.location.href = candidatas[0];
        } else {
          window.open(candidatas[0], '_blank');
        }
        return;
      }

      if (ventana) {
        ventana.close();
      }
      console.warn('Archivo no encontrado. URLs probadas:', candidatas, 'Adjunto:', adjunto);
      Swal.fire('Archivo no encontrado', 'El archivo no está disponible en el servidor', 'error');
    });
  }

  private buscarArchivo(urls: string[], idx: number, huboRespuesta: boolean): Promise<{ blob: Blob, soloErroresDeRed: boolean }> {
    if (idx >= urls.length) {
      return Promise.resolve({ blob: null, soloErroresDeRed: !huboRespuesta });
    }

    return fetch(urls[idx]).then(r => {
      const contentType = r.headers.get('content-type') || '';
      // El Node responde JSON {"messaje":"No se encuentra el elemento"} cuando no existe
      if (r.ok && contentType.indexOf('application/json') === -1) {
        return r.blob().then(blob => ({ blob: blob, soloErroresDeRed: false }));
      }
      return this.buscarArchivo(urls, idx + 1, true);
    }).catch(() => this.buscarArchivo(urls, idx + 1, huboRespuesta));
  }

  private getRutasCandidatas(bitacora: any): string[] {
    const urls: string[] = [];
    const adjunto: string = bitacora.Adjunto;

    // URL absoluta guardada
    if (adjunto && /^https?:\/\//i.test(adjunto)) {
      urls.push(adjunto);
    }

    // Campo legacy "ruta" de la vista
    if (bitacora.ruta) {
      urls.push(/^(https?:)?\/\//i.test(bitacora.ruta)
        ? bitacora.ruta
        : this.NODE_BASE + bitacora.ruta.replace(/^\/+/, ''));
    }

    const carpeta = this.retUrl(this.TipoBitacora);
    if (carpeta) {
      const nombres: string[] = [];

      // 1) Nombre físico real (ruta que devolvió multiparty al subir)
      if (adjunto && !/^https?:\/\//i.test(adjunto)) {
        const fisico = adjunto.split(/[\\/]/).pop();
        if (fisico) {
          nombres.push(fisico);
        }
      }

      // 2) Nombre original, tal cual y con la tilde en ambos formatos Unicode
      const original: any = bitacora.NombreAdjunto;
      nombres.push(original);
      if (original && original.normalize) {
        nombres.push(original.normalize('NFC'));
        nombres.push(original.normalize('NFD'));
      }

      nombres.forEach(n => urls.push(this.NODE_BASE + carpeta + encodeURIComponent(n)));
    }

    // Sin duplicados
    return urls.filter((u, idx) => urls.indexOf(u) === idx);
  }

  private esBase64(valor: string): boolean {
    if (valor.startsWith('data:')) {
      return true;
    }
    // Un path del servidor es corto; un Base64 de un archivo real es largo
    return valor.length > 256 && /^[A-Za-z0-9+/=\r\n]+$/.test(valor);
  }

  private mimeDesdeNombre(nombre: string): string {
    const ext = (nombre.split('.').pop() || '').toLowerCase();
    const mapa = {
      pdf: 'application/pdf',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg'
    };
    return mapa[ext] || 'application/octet-stream';
  }

  private descargarBlob(blob: Blob, nombre: string) {
    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, nombre);
      return;
    }

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = nombre;
    document.body.appendChild(link);
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(link.href), 60000);
  }

  private abrirBase64(adjunto: string, nombre: string) {
    let base64Data = adjunto;
    let mimeType = this.mimeDesdeNombre(nombre);

    if (adjunto.indexOf(',') > -1) {
      const partes = adjunto.split(',');
      base64Data = partes[1];
      const match = partes[0].match(/data:([^;]+)/);
      if (match && match[1] !== 'application/octet-stream') {
        mimeType = match[1];
      }
    }

    try {
      const binary = this.fixBinary(atob(base64Data.replace(/[\r\n]/g, '')));
      const blob = new Blob([binary], { type: mimeType });

      if (mimeType === 'application/pdf' || mimeType.startsWith('image/')) {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        return;
      }

      this.descargarBlob(blob, nombre);
    } catch (e) {
      console.error('Error decodificando Base64:', e);
      Swal.fire('Error', 'El archivo adjunto está corrupto o tiene formato incorrecto', 'error');
    }
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
      }).catch(e => console.error('Error leyendo archivo:', e));
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

        this._sBitacora.postUpdDelBitacora(this.Bitacora).success(result => {
          this.OcultarPopUpEditar();
          this.traeBitacora();
          this.loading = false;
        }).error(e => {
          console.error('Error al actualizar:', e);
          this.loading = false;
          Swal.fire('Error', 'No se pudo actualizar la bitácora', 'error');
        });

      }).catch(e => {
        console.error('Error al subir archivo:', e);
        this.loading = false;
        Swal.fire('Error', 'No se pudo subir el archivo adjunto', 'error');
      });
    } else {
      this._sBitacora.postUpdDelBitacora(this.Bitacora).success(result => {
        this.OcultarPopUpEditar();
        this.traeBitacora();
        this.loading = false;
      }).error(e => {
        console.error('Error al actualizar:', e);
        this.loading = false;
        Swal.fire('Error', 'No se pudo actualizar la bitácora', 'error');
      });
    }
  }

  Eliminar() {
    if (!this.Bitacora || !this.Bitacora.idBitacora) {
      Swal.fire('Error', 'No hay ninguna bitácora seleccionada', 'error');
      return;
    }

    this.Bitacora.idUsuarioRemovedor = this.usuario.idUsuario;
    this.LoadingTabla = true;

    this._sBitacora.postUpdDelBitacora(this.Bitacora).success(result => {
      $('#exampleModalLong').modal('hide');

      Swal.fire({
        type: 'success',
        title: 'Eliminado',
        text: 'La bitácora ha sido eliminada',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        window.location.reload();
      });

    }).error(e => {
      console.error('Error al eliminar:', e);
      this.LoadingTabla = false;
      Swal.fire('Error', 'No se pudo eliminar la bitácora', 'error');
    });
  }

}