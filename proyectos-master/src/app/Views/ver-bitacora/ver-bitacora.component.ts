import { Component, OnInit, OnDestroy, Input } from '@angular/core';

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
import { sOrdenBitacora } from '../../services/Personalizados/sOrdenBitacora.service';
import { environment } from '../../../environments/environment';

declare var jQuery: any;
declare var $: any;
declare var Swal: any;

let contadorInstancias = 0;

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
    sCorreo,
    sOrdenBitacora
  ]
})
export class VerBitacoraComponent implements OnInit, OnDestroy {

  @Input() TipoBitacora: number;
  @Input() soloLectura: boolean = false;
  url: string;

  // Base del Node de archivos antiguo (solo para bitácoras previas a Firebase)
  private readonly NODE_BASE: string = 'http://trazas-nbi.com:3800/api/';

  // IDs únicos por instancia (Proyectos / SSOMA / Calidad están en la misma página)
  private readonly uid: string = 'vb' + (++contadorInstancias);
  readonly modalId: string = 'modalEditarBitacora_' + this.uid;
  readonly modalTitleId: string = 'modalEditarBitacoraTitle_' + this.uid;
  readonly fileId: string = 'fileuploadUPD_' + this.uid;
  readonly nombreArchId: string = 'NombreArchUpd_' + this.uid;
  private modalParent: Node | null = null;
  private modalNextSibling: Node | null = null;
  private elementoFocoAnterior: HTMLElement | null = null;
  private eventosModalRegistrados: boolean = false;

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
  cargandoDetalle: boolean = false;

  //Indices
  IndexUpdate: number;

  //Orden (compartido en Firestore)
  dragIndex: number = null;
  dragOverIndex: number = null;
  hayOrden: boolean = false;

  constructor(
    private _PopUps: PopUps,
    private _Comunes: Comunes,
    private _sVis_VerBitacora: sVis_VerBitacora,
    private _sPrioridad: sPrioridad,
    private _sBitacora: sBitacora,
    private _sOrdenBitacora: sOrdenBitacora
  ) {
    this.Loader = true;
    this.usuario = JSON.parse(localStorage.usuario);
    this.Bitacora = this.bitacoraVacia();
    this.url = this.NODE_BASE;
    this.loading = false;
  }

  ngOnInit() {
    this._sPrioridad.getPrioridad().subscribe(result => {
      // ids como número para que calcen con el select ([ngValue])
      this.Prioridades = (result || []).map((p: any) => ({ ...p, idPrioridad: +p.idPrioridad }));
    });
    this.SubProyecto = JSON.parse(localStorage.SubProyecto);
    this.traeBitacora();
    this.url = this.NODE_BASE + (this.retUrl(this.TipoBitacora) || '');
  }

  ngOnDestroy() {
    const modal = this.$modal();
    const elemento = modal[0] as HTMLElement;
    if (elemento && elemento.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
    }
    try { modal.modal('hide'); } catch (e) { }
    this.restaurarModal();
    modal.off('.verBitacora');
  }

  private bitacoraVacia(): mBitacora {
    return new mBitacora(null, null, 0, null, null, new Date().toString(), true, null, this.usuario.idUsuario, null, null, null, null);
  }

  //*************************************************** Helpers DOM (scoped a esta instancia) ***************************************************

  private $modal(): any { return $('#' + this.modalId); }
  private $file(): any { return $('#' + this.fileId); }
  private $nombreArch(): any { return $('#' + this.nombreArchId); }

  private archivoSeleccionado(): any {
    const input = this.$file()[0];
    return input && input.files && input.files.length > 0 ? input.files[0] : null;
  }

  //*************************************************** Carga ***************************************************

  private traeBitacora() {
    this.Loader = true;

    // El orden se pide en paralelo con las bitácoras
    const ordenPromise = this._sOrdenBitacora.getOrden(this.SubProyecto.idSubProyecto, this.TipoBitacora);

    this._sVis_VerBitacora.getVis_VerBitacorabyidSubProyecto(this.SubProyecto.idSubProyecto).subscribe(result => {
      const filtradas = result.filter(element => { return element.TipoBitacora == this.TipoBitacora; });

      ordenPromise.then(orden => {
        this.Bitacoras = this.aplicarOrden(filtradas, orden);
        this.hayOrden = orden.length > 0;
        this.Loader = false;
      }).catch(() => {
        this.Bitacoras = filtradas;
        this.hayOrden = false;
        this.Loader = false;
      });
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
    this.Bitacora = this.bitacoraVacia();
    this.cargandoDetalle = true;
    this.limpiarArchivoUpd();

    this.prepararModal();
    this.$modal().modal('show');

    this._sBitacora.getBitacorabyID(this.Bitacoras[i].idBitacora).subscribe(result => {
      if (!result) {
        this.cargandoDetalle = false;
        Swal.fire('Error', 'No se pudo cargar la bitácora', 'error');
        return;
      }
      this.Bitacora = result;
      this.Bitacora.idPrioridad = +result.idPrioridad || 0;
      this.Bitacora.descripcion = (result.descripcion || '').replace(/<br\s*\/?>/gi, "\n");
      this.$nombreArch().html(this.Bitacora.NombreAdjunto || '');
      this.cargandoDetalle = false;
    }, e => {
      console.error('Error al cargar bitácora:', e);
      this.cargandoDetalle = false;
      Swal.fire('Error', 'No se pudo cargar la bitácora', 'error');
    });
  }

  OcultarPopUpEditar() {
    this.IndexUpdate = 0;
    const modal = this.$modal()[0] as HTMLElement;
    if (modal && modal.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
    }
    this.$modal().modal('hide');
    this.$nombreArch().html("");
  }

  private prepararModal() {
    const modal = this.$modal();
    const elemento = modal[0] as HTMLElement;
    if (!elemento) { return; }

    if (!this.modalParent) {
      this.modalParent = elemento.parentNode;
      this.modalNextSibling = elemento.nextSibling;
    }
    this.elementoFocoAnterior = document.activeElement as HTMLElement;

    if (!this.eventosModalRegistrados) {
      modal.on('hide.bs.modal.verBitacora', () => {
        const foco = document.activeElement as HTMLElement;
        if (foco && elemento.contains(foco)) { foco.blur(); }
      });
      modal.on('hidden.bs.modal.verBitacora', () => {
        this.restaurarModal();
        if (this.elementoFocoAnterior && document.body.contains(this.elementoFocoAnterior)) {
          this.elementoFocoAnterior.focus();
        }
        this.elementoFocoAnterior = null;
      });
      this.eventosModalRegistrados = true;
    }

    document.body.appendChild(elemento);
  }

  private restaurarModal() {
    const elemento = this.$modal()[0] as HTMLElement;
    if (!elemento || !this.modalParent) { return; }
    const siguiente = this.modalNextSibling && this.modalNextSibling.parentNode === this.modalParent
      ? this.modalNextSibling
      : null;
    this.modalParent.insertBefore(elemento, siguiente);
  }

  //*************************************************** Orden ***************************************************

  // Las bitácoras nuevas (que no están en el orden guardado) quedan arriba, en el orden que manda el backend
  private aplicarOrden(lista: any[], orden: any[]): any[] {
    if (!orden || !orden.length) {
      return lista;
    }

    const pos: { [id: string]: number } = {};
    orden.forEach((id, idx) => pos[String(id)] = idx);

    const nuevas = lista.filter(b => pos[String(b.idBitacora)] === undefined);
    const conocidas = lista
      .filter(b => pos[String(b.idBitacora)] !== undefined)
      .sort((a, b) => pos[String(a.idBitacora)] - pos[String(b.idBitacora)]);

    return nuevas.concat(conocidas);
  }

  // Se guarda apenas se suelta la bitácora
  private guardarOrden() {
    this.hayOrden = true;
    const ids = this.Bitacoras.map((b: any) => b.idBitacora);
    this._sOrdenBitacora.guardarOrden(this.SubProyecto.idSubProyecto, this.TipoBitacora, ids, this.usuario.idUsuario)
      .catch(e => {
        console.error('Error al guardar orden en Firebase:', e);
        Swal.fire('Error', 'No se pudo guardar el orden para todos los usuarios', 'error');
      });
  }

  private moverBitacora(desde: number, hasta: number) {
    if (desde === hasta || desde < 0 || hasta < 0 || desde >= this.Bitacoras.length || hasta >= this.Bitacoras.length) {
      return;
    }
    const item = this.Bitacoras.splice(desde, 1)[0];
    this.Bitacoras.splice(hasta, 0, item);
    this.guardarOrden();
  }

  RestablecerOrden() {
    this._sOrdenBitacora.borrarOrden(this.SubProyecto.idSubProyecto, this.TipoBitacora)
      .catch(e => console.error('Error al borrar orden en Firebase:', e))
      .then(() => {
        this.hayOrden = false;
        this.traeBitacora();
      });
  }

  onDragStart(i: number, ev: any) {
    if (this.soloLectura) {
      return;
    }
    this.dragIndex = i;
    try {
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text', String(i)); // Firefox necesita setData para arrastrar
    } catch (e) { }
  }

  onDragOver(i: number, ev: any) {
    if (this.dragIndex === null) {
      return;
    }
    ev.preventDefault();
    try {
      ev.dataTransfer.dropEffect = 'move';
    } catch (e) { }
    this.dragOverIndex = i;
  }

  onDrop(i: number, ev: any) {
    ev.preventDefault();
    if (this.dragIndex !== null && this.dragIndex !== i) {
      this.moverBitacora(this.dragIndex, i);
    }
    this.onDragEnd();
  }

  onDragEnd() {
    this.dragIndex = null;
    this.dragOverIndex = null;
  }

  //*************************************************** Descarga ***************************************************

  DescargarArchivo(i: number) {
    const bitacora: any = this.Bitacoras[i];

    if (!bitacora || !bitacora.NombreAdjunto) {
      return;
    }

    const adjunto: string = bitacora.Adjunto;

    // Nuevos: URL de Firebase Storage (o cualquier URL https absoluta) -> se abre directo.
    if (adjunto && /^https:\/\//i.test(adjunto)) {
      window.open(adjunto, '_blank');
      return;
    }

    // Registros antiguos que guardaron el archivo en Base64 en la BD
    if (adjunto && this.esBase64(adjunto)) {
      this.abrirBase64(adjunto, bitacora.NombreAdjunto);
      return;
    }

    // Registros antiguos del Node :3800
    const candidatas = this.getRutasCandidatas(bitacora);

    if (!candidatas.length) {
      Swal.fire('Error', 'No se pudo determinar la ruta del archivo', 'error');
      return;
    }

    const nombre: string = bitacora.NombreAdjunto;
    const mime = this.mimeDesdeNombre(nombre);
    const visualizable = mime === 'application/pdf' || mime.startsWith('image/');

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
      if (r.ok && contentType.indexOf('application/json') === -1) {
        return r.blob().then(blob => ({ blob: blob, soloErroresDeRed: false }));
      }
      return this.buscarArchivo(urls, idx + 1, true);
    }).catch(() => this.buscarArchivo(urls, idx + 1, huboRespuesta));
  }

  private getRutasCandidatas(bitacora: any): string[] {
    const urls: string[] = [];
    const adjunto: string = bitacora.Adjunto;

    if (adjunto && /^https?:\/\//i.test(adjunto)) {
      urls.push(adjunto);
    }

    if (bitacora.ruta) {
      urls.push(/^(https?:)?\/\//i.test(bitacora.ruta)
        ? bitacora.ruta
        : this.NODE_BASE + bitacora.ruta.replace(/^\/+/, ''));
    }

    const carpeta = this.retUrl(this.TipoBitacora);
    if (carpeta) {
      const nombres: string[] = [];

      if (adjunto && !/^https?:\/\//i.test(adjunto)) {
        const fisico = adjunto.split(/[\\/]/).pop();
        if (fisico) {
          nombres.push(fisico);
        }
      }

      const original: any = bitacora.NombreAdjunto;
      nombres.push(original);
      if (original && original.normalize) {
        nombres.push(original.normalize('NFC'));
        nombres.push(original.normalize('NFD'));
      }

      nombres.forEach(n => urls.push(this.NODE_BASE + carpeta + encodeURIComponent(n)));
    }

    return urls.filter((u, idx) => urls.indexOf(u) === idx);
  }

  private esBase64(valor: string): boolean {
    if (valor.startsWith('data:')) {
      return true;
    }
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

  //*************************************************** Archivo (editar) ***************************************************

  NombreArchivo() {
    const archivo = this.archivoSeleccionado();

    if (!archivo) {
      this.$nombreArch().html(this.Bitacora.NombreAdjunto || "");
      return;
    }

    const error = this._sBitacora.validarNombreArchivo(archivo.name);

    if (error) {
      this.limpiarArchivoUpd();
      this.avisarNombreInvalido(error);
      return;
    }

    this.$nombreArch().html(archivo.name);
  }

  private limpiarArchivoUpd() {
    const $input = this.$file();
    $input.val('');
    $input.closest('.fileinput').removeClass('fileinput-exists').addClass('fileinput-new');
    this.$nombreArch().html(this.Bitacora && this.Bitacora.NombreAdjunto ? this.Bitacora.NombreAdjunto : "");
  }

  private avisarNombreInvalido(mensaje: string) {
    Swal.fire({
      type: 'warning',
      title: 'Nombre de archivo no válido',
      html: mensaje +
        '<br><br>Renombra el archivo usando solo letras <b>sin tildes ni ñ</b>, números, espacios, ' +
        'guion (-), guion bajo (_), puntos y paréntesis, y vuelve a adjuntarlo.'
    });
  }

  //*************************************************** CRUD ***************************************************

  Actualizar() {
    if (!this.Bitacora || !this.Bitacora.idBitacora) {
      Swal.fire('Error', 'No hay ninguna bitácora cargada para editar', 'error');
      return;
    }

    if (!this.Bitacora.idPrioridad || +this.Bitacora.idPrioridad === 0) {
      Swal.fire('Falta la prioridad', 'Selecciona una prioridad para la bitácora', 'warning');
      return;
    }

    if (!this.Bitacora.descripcion || !this.Bitacora.descripcion.trim()) {
      Swal.fire('Falta la descripción', 'La bitácora no puede quedar vacía', 'warning');
      return;
    }

    const archivo = this.archivoSeleccionado();

    if (archivo) {
      const error = this._sBitacora.validarNombreArchivo(archivo.name);
      if (error) {
        this.limpiarArchivoUpd();
        this.avisarNombreInvalido(error);
        return;
      }
    }

    this.loading = true;

    // Se arma una copia para no romper el textarea si falla
    const payload: any = {
      ...this.Bitacora,
      idPrioridad: +this.Bitacora.idPrioridad,
      descripcion: this.Bitacora.descripcion.replace(/\r?\n/g, "<br>")
    };

    if (archivo) {
      this._sBitacora.SubirArchivo(archivo, this.SubProyecto.idSubProyecto, this.TipoBitacora).then(res => {
        payload.NombreAdjunto = res.nombre;
        payload.Adjunto = res.url;
        this.enviarActualizacion(payload);
      }).catch((e: any) => {
        console.error('Error al subir archivo:', e);
        this.loading = false;

        if (e && e.nombreInvalido) {
          this.limpiarArchivoUpd();
          this.avisarNombreInvalido(e.mensaje);
          return;
        }
        Swal.fire('Error', 'No se pudo subir el archivo adjunto' + (e && e.code ? ' (' + e.code + ')' : ''), 'error');
      });
    } else {
      this.enviarActualizacion(payload);
    }
  }

  private enviarActualizacion(payload: any) {
    console.log('[bitacora] actualizando', payload.idBitacora, payload);

    const req: any = this._sBitacora.postUpdDelBitacora(payload);
    if (!req || !req.success) {
      this.loading = false;
      Swal.fire('Error', 'No se pudo enviar la actualización', 'error');
      return;
    }

    req.success(result => {
      console.log('[bitacora] respuesta update', result);
      this.loading = false;
      this.OcultarPopUpEditar();
      this.traeBitacora();
      Swal.fire({ type: 'success', title: 'Bitácora actualizada', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
    });

    const onError = e => {
      console.error('Error al actualizar:', e);
      this.loading = false;
      Swal.fire('Error', 'No se pudo actualizar la bitácora', 'error');
    };
    if (req.error) req.error(onError);
    else if (req.fail) req.fail(onError);
  }

  Eliminar() {
    if (!this.Bitacora || !this.Bitacora.idBitacora) {
      Swal.fire('Error', 'No hay ninguna bitácora seleccionada', 'error');
      return;
    }

    this.Bitacora.idUsuarioRemovedor = this.usuario.idUsuario;
    this.LoadingTabla = true;

    const payload: any = {
      ...this.Bitacora,
      descripcion: (this.Bitacora.descripcion || '').replace(/\r?\n/g, "<br>")
    };

    this._sBitacora.postUpdDelBitacora(payload).success(result => {
      this.$modal().modal('hide');

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
      this.Bitacora.idUsuarioRemovedor = null;
      Swal.fire('Error', 'No se pudo eliminar la bitácora', 'error');
    });
  }

}