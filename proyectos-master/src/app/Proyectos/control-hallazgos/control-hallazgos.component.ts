import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { sProyecto } from '../../services/sProyecto.service';
import { sVis_SubProyNoValidado } from '../../services/sVis_SubProyNoValidado.service';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { sPerfil } from '../../services/sPerfil.service';
import { sMail } from '../../services/sMail.service';
import { mProyecto } from '../../models/mProyecto';
import { firestoreDB, storageRef } from '../../firebase-init';

declare var Swal: any;

interface HallazgoItem {
  id?: string;
  ambito?: string;
  tipoRegistro?: string;
  idUsuarioCreador?: number;
  fecha: string;
  anio: number;
  numero: number;
  tipoAccion: string;
  estado: string;
  areaResponsable: string;
  obra: string;
  quienDetecta: string;
  origenHallazgo: string;
  descripcion: string;
  accionInmediata: string;
  seguimientoResponsable: string;
  prioridad: string;
  archivos: ArchivoHallazgo[];
  bitacoras?: BitacoraHallazgo[];
  idSubProyecto?: string;
  bloqueado?: boolean;
  bloqueadoPor?: number;
  bloqueadoPorNombre?: string;
  fechaBloqueo?: string;
}

interface BitacoraHallazgo {
  id: string;
  fechaRegistro: string;
  prioridad: string;
  descripcionHallazgo: string;
  analisisCausa: string;
  accionInmediata: string;
  responsableInmediata?: string;
  fechaInmediata?: string;
  responsableFechaInmediata?: string;
  accionCorrectiva: string;
  responsableCorrectiva?: string;
  fechaCorrectiva?: string;
  responsableFechaCorrectiva?: string;
  responsableSeguimiento?: string;
  archivos?: ArchivoHallazgo[];
}

interface BitacoraHallazgoForm {
  prioridad: string;
  descripcionHallazgo: string;
  analisisCausa: string;
  accionInmediata: string;
  responsableInmediata: string;
  fechaInmediata: string;
  accionCorrectiva: string;
  responsableCorrectiva: string;
  fechaCorrectiva: string;
  responsableSeguimiento: string;
}

interface ArchivoHallazgo {
  nombre: string;
  url: string;
  path: string;
  fechaSubida: string;
}

type PrioridadSemaforoHallazgo = 'alta' | 'media' | 'baja';

/** Documento de hallazgosConfig donde se guarda la clave de gerencia (hash + salt, nunca la clave en texto plano). */
const DOC_CLAVE_GERENCIA = '_claveGerencia';
/** Documento de hallazgosConfig con el código de recuperación vigente (solo hash). */
const DOC_RECUPERACION_CLAVE = '_recuperacionClave';
/** Credenciales de EmailJS (https://dashboard.emailjs.com). Reemplazar por las de la cuenta de Trazas. */
const EMAILJS_SERVICE_ID = 'service_s0l9tnp';
const EMAILJS_TEMPLATE_ID = 'template_ud73y7s';
const EMAILJS_PUBLIC_KEY = 'eU69rwXxt1sceIIXr';
const MINUTOS_VIGENCIA_CODIGO = 15;
const MAX_INTENTOS_CODIGO = 5;
const SEGUNDOS_ENTRE_ENVIOS = 60;

@Component({
  selector: 'app-control-hallazgos',
  templateUrl: './control-hallazgos.component.html',
  styleUrls: ['./control-hallazgos.component.css'],
  providers: [sProyecto, sVis_SubProyNoValidado, sUsuariosPerfiles, sPerfil, sMail]
})
export class ControlHallazgosComponent implements OnInit, OnDestroy {
  @Input() idProyecto: number | null = null;
  @Input() nombreProyecto: string = '';
  @Input() soloLectura: boolean = false;
  @Input() esOficina: boolean = false;
  @Input() subProyectoSeleccionado: any = null;
  @Input() ocultarFormulario: boolean = false;

  usuario: any;
  proyecto: mProyecto | null = null;
  puedeEliminarHallazgo: boolean = false;
  subProyectoActual: any = null;
  directorSubProyectoId: number | null = null;
  coordinadorTienePermisoEliminar: boolean = false;
  esGerencia: boolean = false;
  /** Solo el perfil SUB-GERENTE puede ver/usar el candado y la clave. */
  esSubGerente: boolean = false;
  private idsPerfilesUsuario: number[] = [];
  private idsPerfilesSubGerente: number[] = [];

  tiposAccion: string[] = [
    'Flash Report',
    'Refuerzo Positivo',
    'Oportunidad de Mejora',
    'Observación',
    'Stop Work',
    'No Conformidad',
    'Leccion aprendida',
    'Near Miss'
  ];

  areasResponsables: string[] = [
    'Arquitectura',
    'Construcción',
    'Administración',
    'Calidad',
    'Seguridad',
    'Medio Ambiente',
    'Medio Ambiente-Calidad'
  ];

  origenesHallazgo: string[] = [
    'No Cumplimiento Proceso',
    'No Cumplimiento Fechas',
    'Reporte de avisos',
    'Reclamo Clientes',
    'Auditoria',
    'Hallazgos Positivos',
    'Otros'
  ];

  quienesDetectan: string[] = [
    'Mandante',
    'Interno',
    'Vecinos',
    'Otros'
  ];

  estadosHallazgo: string[] = [
    'EN DESARROLLO',
    'PENDIENTE',
    'ENVIADA',
    'CERRADA'
  ];

  prioridadesHallazgo: string[] = ['ALTA', 'MEDIA', 'BAJA'];

  nuevoHallazgo: HallazgoItem;
  hallazgos: HallazgoItem[] = [];
  mostrarFormulario: boolean = true;
  nombreProyectoLocal: string = '';
  archivosNuevoHallazgo: File[] = [];
  subiendoArchivosNuevoHallazgo: boolean = false;
  subiendoArchivosPorFila: { [id: string]: boolean } = {};
  archivosSeleccionadosPorFila: { [id: string]: File[] } = {};
  archivoAbiertoFila: string | null = null;
  archivosNuevaBitacora: File[] = [];
  subiendoNuevaBitacora: boolean = false;
  filtroSemaforo: PrioridadSemaforoHallazgo | 'todas' = 'todas';
  hallazgoModalSeleccionado: HallazgoItem | null = null;
  modalBitacoraAbierto: boolean = false;
  nuevaBitacoraForm: BitacoraHallazgoForm = this.crearBitacoraForm();
  bitacorasExpandidas: { [key: string]: boolean } = {};
  registroEnEdicionId: string | null = null;
  hallazgoEnEdicionId: string | null = null;
  hallazgoOriginalEnEdicion: HallazgoItem | null = null;

  /** Hallazgos bloqueados que el gerente desbloqueó con la clave en esta sesión (solo en memoria). */
  accesoTemporalBloqueo: { [id: string]: boolean } = {};

  private unsubscribeHallazgos: (() => void) | null = null;
  private unsubscribePermisoCoordinador: (() => void) | null = null;

  constructor(
    private _sProyecto: sProyecto,
    private _sVisSubProyNoValidado: sVis_SubProyNoValidado,
    private _sUsuariosPerfiles: sUsuariosPerfiles,
    private _sPerfil: sPerfil,
    private _sMail: sMail
  ) {
    const subProyecto = JSON.parse(localStorage.getItem('SubProyecto') || 'null');
    this.subProyectoActual = subProyecto;
    this.nombreProyectoLocal = subProyecto && subProyecto.nombreSubProyecto ? subProyecto.nombreSubProyecto : '';
    this.nuevoHallazgo = this.crearNuevoHallazgo();
  }

  get nombreProyectoVisible(): string {
    if (this.esOficina) {
      return 'Oficina';
    }
    return this.nombreProyecto || this.nombreProyectoLocal || '';
  }

  get nombreObraPredeterminada(): string {
    return this.nombreProyectoVisible || (this.proyecto && this.proyecto.nombreProyecto) || '';
  }

  get totalHallazgosPorPrioridad() {
    const total = { alta: 0, media: 0, baja: 0 };
    this.hallazgos.forEach((item: HallazgoItem) => {
      const prioridad = this.normalizarPrioridad(this.getPrioridadActualHallazgo(item));
      if (prioridad === 'alta') { total.alta++; }
      if (prioridad === 'media') { total.media++; }
      if (prioridad === 'baja') { total.baja++; }
    });
    return total;
  }

  get hallazgosFiltrados(): HallazgoItem[] {
    if (this.filtroSemaforo === 'todas') {
      return this.hallazgos;
    }

    return this.hallazgos.filter((item: HallazgoItem) =>
      this.normalizarPrioridad(this.getPrioridadActualHallazgo(item)) === this.filtroSemaforo
    );
  }

  ngOnInit() {
    this.usuario = JSON.parse(localStorage.usuario || 'null');
    if (this.subProyectoSeleccionado) {
      this.subProyectoActual = this.subProyectoSeleccionado;
      this.nombreProyectoLocal = this.subProyectoSeleccionado.nombreSubProyecto || '';
    }
    this.resetNuevoHallazgo();
    this.cargarDatosIniciales();
    this.cargarPermisoEliminacion();
  }

  ngOnDestroy() {
    if (this.unsubscribeHallazgos) {
      this.unsubscribeHallazgos();
    }
    if (this.unsubscribePermisoCoordinador) {
      this.unsubscribePermisoCoordinador();
    }
  }

  agregarHallazgo() {
    if (this.soloLectura) {
      return;
    }

    if (!this.nuevoHallazgo.fecha || !this.nuevoHallazgo.tipoAccion || !this.nuevoHallazgo.areaResponsable) {
      return;
    }

    const fechaValor = new Date(this.nuevoHallazgo.fecha);
    this.nuevoHallazgo.anio = fechaValor.getFullYear();
    this.nuevoHallazgo.numero = this.hallazgos.length + 1;
    this.nuevoHallazgo.idSubProyecto = this.getIdSubProyectoActual();

    const datosAGuardar = { ...this.nuevoHallazgo, bloqueado: false };
    if (this.esOficina) {
      datosAGuardar.ambito = 'oficina';
      datosAGuardar.tipoRegistro = 'hallazgo-oficina';
      datosAGuardar.idUsuarioCreador = Number(this.usuario && this.usuario.idUsuario);
    }
    datosAGuardar.archivos = [];
    delete datosAGuardar.id;

    firestoreDB.collection('hallazgos').add(datosAGuardar)
      .then((docRef: any) => {
        if (!this.archivosNuevoHallazgo.length) {
          this.resetNuevoHallazgo();
          return;
        }

        this.subiendoArchivosNuevoHallazgo = true;
        this.subirArchivosAHallazgo(docRef.id, this.archivosNuevoHallazgo)
          .then(() => {
            this.subiendoArchivosNuevoHallazgo = false;
            this.resetNuevoHallazgo();
            Swal.fire({
              icon: 'success',
              title: 'Hallazgo guardado',
              text: 'El hallazgo y sus adjuntos se guardaron correctamente.',
              timer: 1800,
              showConfirmButton: false
            });
          })
          .catch((error: any) => {
            this.subiendoArchivosNuevoHallazgo = false;
            Swal.fire('Advertencia', 'El hallazgo se creó, pero falló la subida de adjuntos: ' + error.message, 'warning');
          });
      })
      .catch((error: any) => {
        Swal.fire('Error', 'No se pudo guardar el hallazgo: ' + error.message, 'error');
      });
  }

  eliminarHallazgo(item: HallazgoItem) {
    if (this.soloLectura) { return; }
    if (!this.puedeEliminarEsteHallazgo(item)) {
      Swal.fire('Acceso denegado', this.getMensajePermisoEliminacion(), 'warning');
      return;
    }

    if (!item || !item.id) {
      return;
    }

    if (item.bloqueado) {
      this.pedirAccesoHallazgoBloqueado(item).then((ok: boolean) => {
        if (ok) { this.confirmarEliminarHallazgo(item); }
      });
      return;
    }

    this.confirmarEliminarHallazgo(item);
  }

  private confirmarEliminarHallazgo(item: HallazgoItem) {
    Swal.fire({
      title: 'Eliminar hallazgo',
      text: '¿Esta seguro de eliminar este hallazgo?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (result.value) {
        firestoreDB.collection('hallazgos').doc(item.id).delete()
          .catch((error: any) => {
            Swal.fire('Error', 'No se pudo eliminar el hallazgo: ' + error.message, 'error');
          });
      }
    });
  }

  actualizarCampoHallazgo(item: HallazgoItem, campo: string, valor: any) {
    if (this.soloLectura || !item.id || this.hallazgoEnEdicionId !== item.id || this.estaBloqueadoParaMi(item)) {
      return;
    }

    firestoreDB.collection('hallazgos').doc(item.id).update({ [campo]: valor })
      .catch((error: any) => {
        Swal.fire('Error', 'No se pudo actualizar el campo: ' + error.message, 'error');
      });
  }

  toggleFiltroSemaforo(prioridad: PrioridadSemaforoHallazgo) {
    this.filtroSemaforo = this.filtroSemaforo === prioridad ? 'todas' : prioridad;
  }

  limpiarFiltroSemaforo() {
    this.filtroSemaforo = 'todas';
  }

  abrirBitacoraPopup(item: HallazgoItem) {
    this.hallazgoModalSeleccionado = item;
    this.nuevaBitacoraForm = this.crearBitacoraForm(this.getPrioridadActualHallazgo(item));
    this.modalBitacoraAbierto = true;
  }

  cerrarBitacoraPopup() {
    const item = this.hallazgoModalSeleccionado;
    if (item && item.id && item.id !== this.hallazgoEnEdicionId) {
      delete this.accesoTemporalBloqueo[item.id];
    }
    this.modalBitacoraAbierto = false;
    this.hallazgoModalSeleccionado = null;
    this.registroEnEdicionId = null;
    this.archivosNuevaBitacora = [];
  }

  editarHallazgo(item: HallazgoItem) {
    if (this.soloLectura || !item.id || this.hallazgoEnEdicionId) {
      return;
    }

    if (this.estaBloqueadoParaMi(item)) {
      this.pedirAccesoHallazgoBloqueado(item).then((ok: boolean) => {
        if (ok) { this.iniciarEdicionHallazgo(item); }
      });
      return;
    }

    this.iniciarEdicionHallazgo(item);
  }

  private iniciarEdicionHallazgo(item: HallazgoItem) {
    if (!item.id || this.hallazgoEnEdicionId) { return; }
    this.hallazgoEnEdicionId = item.id;
    this.hallazgoOriginalEnEdicion = {
      ...item,
      archivos: (item.archivos || []).slice(),
      bitacoras: item.bitacoras ? item.bitacoras.slice() : []
    };
  }

  guardarEdicionHallazgo() {
    if (this.hallazgoEnEdicionId) {
      delete this.accesoTemporalBloqueo[this.hallazgoEnEdicionId];
    }
    this.hallazgoEnEdicionId = null;
    this.hallazgoOriginalEnEdicion = null;
    Swal.fire({
      icon: 'success',
      title: 'Guardado',
      text: 'Los cambios se guardaron correctamente.',
      timer: 1500,
      showConfirmButton: false
    });
  }

  cancelarEdicionHallazgo(item: HallazgoItem) {
    const original = this.hallazgoOriginalEnEdicion;
    if (item && item.id) {
      delete this.accesoTemporalBloqueo[item.id];
    }
    if (!original || !item.id || original.id !== item.id) {
      this.hallazgoEnEdicionId = null;
      this.hallazgoOriginalEnEdicion = null;
      return;
    }

    const datosRestaurados = {
      fecha: original.fecha,
      tipoAccion: original.tipoAccion,
      estado: original.estado,
      areaResponsable: original.areaResponsable,
      obra: original.obra,
      quienDetecta: original.quienDetecta,
      origenHallazgo: original.origenHallazgo,
      prioridad: original.prioridad,
      archivos: original.archivos || []
    };

    Object.assign(item, datosRestaurados);
    firestoreDB.collection('hallazgos').doc(item.id).update(datosRestaurados)
      .catch((error: any) => {
        Swal.fire('Error', 'No se pudieron cancelar los cambios: ' + error.message, 'error');
      });
    this.hallazgoEnEdicionId = null;
    this.hallazgoOriginalEnEdicion = null;
  }

  getPrioridadLabel(prioridad: string): string {
    const valor = (prioridad || '').toLowerCase();
    if (valor === 'alta') { return 'Alta'; }
    if (valor === 'media') { return 'Media'; }
    if (valor === 'baja') { return 'Baja'; }
    return 'Todas';
  }

  onArchivosNuevoSeleccionados(event: any) {
    const files: FileList = event.target.files;
    this.archivosNuevoHallazgo = [];

    if (!files || files.length === 0) {
      return;
    }

    for (let i = 0; i < files.length; i++) {
      this.archivosNuevoHallazgo.push(files[i]);
    }
  }

  quitarArchivoNuevoHallazgo(index: number) {
    this.archivosNuevoHallazgo.splice(index, 1);
  }

  toggleListaArchivos(item: HallazgoItem) {
    if (!item.id) { return; }
    this.archivoAbiertoFila = this.archivoAbiertoFila === item.id ? null : item.id;
  }

  getIconoArchivoClass(nombre: string, url: string = ''): string {
    const extension = ((nombre || '').split('.').pop() || '').toLowerCase() ||
      ((url || '').split('?')[0].split('.').pop() || '').toLowerCase();
    switch (extension) {
      case 'pdf': return 'fa-file-pdf-o archivo-icono-pdf';
      case 'doc':
      case 'docx': return 'fa-file-word-o icono-archivo-word';
      case 'xls':
      case 'xlsx': return 'fa-file-excel-o icono-archivo-excel';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'fa-file-image-o icono-archivo-imagen';
      default: return 'fa-file-o icono-archivo-generico';
    }
  }

  getNombreCorto(nombre: string, maxLargo: number = 12): string {
    if (!nombre) { return ''; }
    return nombre.length > maxLargo ? nombre.substring(0, maxLargo).trim() + '...' : nombre;
  }

  onArchivosHallazgoExistenteSeleccionados(event: any, item: HallazgoItem) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0 || !item.id || this.estaBloqueadoParaMi(item)) {
      event.target.value = '';
      return;
    }

    const archivos: File[] = [];
    for (let i = 0; i < files.length; i++) {
      archivos.push(files[i]);
    }
    event.target.value = '';

    const idHallazgo = item.id;
    this.archivosSeleccionadosPorFila[idHallazgo] = archivos;
    this.subiendoArchivosPorFila[idHallazgo] = true;
    this.subirArchivosAHallazgo(idHallazgo, archivos)
      .catch((error: any) => {
        Swal.fire('Error', 'No se pudieron subir los archivos: ' + error.message, 'error');
      })
      .then(() => {
        this.subiendoArchivosPorFila[idHallazgo] = false;
        delete this.archivosSeleccionadosPorFila[idHallazgo];
      });
  }

  onArchivosBitacoraSeleccionados(event: any) {
    const files: FileList = event.target.files;
    this.archivosNuevaBitacora = [];

    if (!files || files.length === 0) {
      return;
    }

    for (let i = 0; i < files.length; i++) {
      this.archivosNuevaBitacora.push(files[i]);
    }
  }

  quitarArchivoNuevaBitacora(index: number) {
    this.archivosNuevaBitacora.splice(index, 1);
  }

  getPrioridadClass(prioridad: string): string {
    switch ((prioridad || '').toUpperCase()) {
      case 'ALTA': return 'prioridad-alta';
      case 'MEDIA': return 'prioridad-media';
      case 'BAJA': return 'prioridad-baja';
      default: return '';
    }
  }

  setPrioridadDesdeBitacora(prioridad: string) {
    if (this.soloLectura || (this.hallazgoModalSeleccionado && this.estaBloqueadoParaMi(this.hallazgoModalSeleccionado))) {
      return;
    }

    this.nuevaBitacoraForm.prioridad = prioridad;
  }

  setPrioridadNuevoHallazgo(prioridad: PrioridadSemaforoHallazgo) {
    if (this.soloLectura) { return; }
    this.nuevoHallazgo.prioridad = prioridad.toUpperCase();
  }

  actualizarPrioridadHallazgo(item: HallazgoItem, prioridad: PrioridadSemaforoHallazgo) {
    if (this.soloLectura || this.hallazgoEnEdicionId !== item.id || this.estaBloqueadoParaMi(item)) {
      return;
    }
    this.actualizarCampoHallazgo(item, 'prioridad', prioridad.toUpperCase());
  }

  getPrioridadActualHallazgo(item: HallazgoItem): string {
    if (item && item.prioridad) {
      return item.prioridad;
    }
    const ultima = this.getUltimaBitacora(item);
    return (ultima && ultima.prioridad) ? ultima.prioridad : 'MEDIA';
  }

  getBitacorasOrdenadas(item: HallazgoItem): BitacoraHallazgo[] {
    const bitacoras = Array.isArray(item.bitacoras) ? item.bitacoras.slice() : [];
    return bitacoras.sort((a: BitacoraHallazgo, b: BitacoraHallazgo) =>
      (b.fechaRegistro || '').localeCompare(a.fechaRegistro || '')
    );
  }

  toggleBitacoraGuardada(item: HallazgoItem, registro: BitacoraHallazgo, index: number) {
    const key = this.getClaveBitacora(item, registro, index);
    this.bitacorasExpandidas[key] = !this.bitacorasExpandidas[key];
  }

  estaBitacoraGuardadaExpandida(item: HallazgoItem, registro: BitacoraHallazgo, index: number): boolean {
    const key = this.getClaveBitacora(item, registro, index);
    return !!this.bitacorasExpandidas[key];
  }

  getResumenBitacora(registro: BitacoraHallazgo): string {
    const descripcion = (registro.descripcionHallazgo || '').trim();
    if (!descripcion) {
      return 'Sin descripción';
    }

    if (descripcion.length <= 85) {
      return descripcion;
    }

    return descripcion.substring(0, 85).trim() + '...';
  }

  agregarBitacora(item: HallazgoItem) {
    if (this.soloLectura || !item || !item.id || this.estaBloqueadoParaMi(item)) {
      return;
    }

    const hayContenido = !!(
      (this.nuevaBitacoraForm.descripcionHallazgo || '').trim() ||
      (this.nuevaBitacoraForm.analisisCausa || '').trim() ||
      (this.nuevaBitacoraForm.accionInmediata || '').trim() ||
      (this.nuevaBitacoraForm.accionCorrectiva || '').trim()
    );

    if (!hayContenido) {
      Swal.fire('Falta información', 'Debes completar al menos un campo de la bitácora.', 'info');
      return;
    }

    const idHallazgo = item.id;
    const idEnEdicion = this.registroEnEdicionId;
    const idBitacora = idEnEdicion || ('bit-' + Date.now());
    const registroPrevio = idEnEdicion ? (item.bitacoras || []).find(r => r.id === idEnEdicion) : null;
    const archivosSeleccionados = this.archivosNuevaBitacora.slice();

    this.subiendoNuevaBitacora = true;
    this.subirArchivosDeBitacora(idHallazgo, idBitacora, archivosSeleccionados)
      .then((archivosSubidos: ArchivoHallazgo[]) => {
        const nuevaEntrada: BitacoraHallazgo = {
          id: idBitacora,
          fechaRegistro: registroPrevio ? registroPrevio.fechaRegistro : new Date().toISOString(),
          prioridad: this.nuevaBitacoraForm.prioridad || 'MEDIA',
          descripcionHallazgo: this.nuevaBitacoraForm.descripcionHallazgo || '',
          analisisCausa: this.nuevaBitacoraForm.analisisCausa || '',
          accionInmediata: this.nuevaBitacoraForm.accionInmediata || '',
          responsableInmediata: this.nuevaBitacoraForm.responsableInmediata || '',
          fechaInmediata: this.nuevaBitacoraForm.fechaInmediata || '',
          responsableFechaInmediata: this.componerResponsableFecha(
            this.nuevaBitacoraForm.responsableInmediata,
            this.nuevaBitacoraForm.fechaInmediata
          ),
          accionCorrectiva: this.nuevaBitacoraForm.accionCorrectiva || '',
          responsableCorrectiva: this.nuevaBitacoraForm.responsableCorrectiva || '',
          fechaCorrectiva: this.nuevaBitacoraForm.fechaCorrectiva || '',
          responsableFechaCorrectiva: this.componerResponsableFecha(
            this.nuevaBitacoraForm.responsableCorrectiva,
            this.nuevaBitacoraForm.fechaCorrectiva
          ),
          responsableSeguimiento: (this.nuevaBitacoraForm.responsableSeguimiento || '').trim(),
          archivos: (registroPrevio ? (registroPrevio.archivos || []) : []).concat(archivosSubidos)
        };

        const bitacorasActuales: BitacoraHallazgo[] = Array.isArray(item.bitacoras) ? item.bitacoras.slice() : [];
        const indiceExistente = bitacorasActuales.findIndex(r => r.id === idBitacora);
        if (indiceExistente >= 0) {
          bitacorasActuales[indiceExistente] = nuevaEntrada;
        } else {
          bitacorasActuales.push(nuevaEntrada);
        }

        const payload = {
          bitacoras: bitacorasActuales,
          prioridad: nuevaEntrada.prioridad,
          descripcion: nuevaEntrada.descripcionHallazgo,
          accionInmediata: nuevaEntrada.accionInmediata,
          seguimientoResponsable: (nuevaEntrada.responsableSeguimiento || '').trim() ||
            this.componerResponsableFecha(
              nuevaEntrada.responsableCorrectiva,
              nuevaEntrada.fechaCorrectiva
            )
        };

        return firestoreDB.collection('hallazgos').doc(idHallazgo).update(payload).then(() => {
          item.bitacoras = bitacorasActuales;
          item.prioridad = nuevaEntrada.prioridad;
          this.nuevaBitacoraForm = this.crearBitacoraForm(nuevaEntrada.prioridad);
          this.archivosNuevaBitacora = [];
          this.registroEnEdicionId = null;
        });
      })
      .catch((error: any) => {
        Swal.fire('Error', 'No se pudo guardar la bitácora: ' + error.message, 'error');
      })
      .then(() => {
        this.subiendoNuevaBitacora = false;
      });
  }

  editarRegistroBitacora(registro: BitacoraHallazgo) {
    if (this.soloLectura || (this.hallazgoModalSeleccionado && this.estaBloqueadoParaMi(this.hallazgoModalSeleccionado))) {
      return;
    }

    this.registroEnEdicionId = registro.id;
    this.archivosNuevaBitacora = [];
    this.nuevaBitacoraForm = {
      prioridad: registro.prioridad || 'MEDIA',
      descripcionHallazgo: registro.descripcionHallazgo || '',
      analisisCausa: registro.analisisCausa || '',
      accionInmediata: registro.accionInmediata || '',
      responsableInmediata: registro.responsableInmediata || '',
      fechaInmediata: registro.fechaInmediata || '',
      accionCorrectiva: registro.accionCorrectiva || '',
      responsableCorrectiva: registro.responsableCorrectiva || '',
      fechaCorrectiva: registro.fechaCorrectiva || '',
      responsableSeguimiento: registro.responsableSeguimiento || ''
    };
  }

  cancelarEdicionBitacora() {
    this.registroEnEdicionId = null;
    this.archivosNuevaBitacora = [];
    this.nuevaBitacoraForm = this.crearBitacoraForm();
  }

  eliminarRegistroBitacora(item: HallazgoItem, registro: BitacoraHallazgo) {
    if (this.soloLectura || !item || !item.id || this.estaBloqueadoParaMi(item)) {
      return;
    }

    Swal.fire({
      title: 'Eliminar registro de bitácora',
      text: '¿Eliminar este registro y sus archivos adjuntos?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (!result.value) { return; }

      const archivosDelRegistro = registro.archivos || [];
      const borrados = archivosDelRegistro.map(archivo =>
        storageRef.ref(archivo.path).delete().catch(() => { /* el archivo ya podría no existir en Storage */ })
      );

      Promise.all(borrados).then(() => {
        const bitacorasActuales = (item.bitacoras || []).filter(r => r.id !== registro.id);
        firestoreDB.collection('hallazgos').doc(item.id).update({ bitacoras: bitacorasActuales })
          .then(() => {
            item.bitacoras = bitacorasActuales;
          })
          .catch((error: any) => {
            Swal.fire('Error', 'No se pudo eliminar el registro: ' + error.message, 'error');
          });
      });
    });
  }

  eliminarArchivoDeBitacora(item: HallazgoItem, registro: BitacoraHallazgo, archivo: ArchivoHallazgo) {
    if (this.soloLectura || !item || !item.id || this.estaBloqueadoParaMi(item)) {
      return;
    }

    Swal.fire({
      title: 'Eliminar archivo',
      text: `¿Eliminar "${archivo.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (!result.value) { return; }

      storageRef.ref(archivo.path).delete().catch(() => {
        // si el archivo ya no existe en Storage, igual limpiamos la referencia en Firestore
      }).then(() => {
        const bitacorasActuales = (item.bitacoras || []).map(r => {
          if (r.id !== registro.id) { return r; }
          return { ...r, archivos: (r.archivos || []).filter(a => a.path !== archivo.path) };
        });

        firestoreDB.collection('hallazgos').doc(item.id).update({ bitacoras: bitacorasActuales })
          .then(() => {
            item.bitacoras = bitacorasActuales;
          })
          .catch((error: any) => {
            Swal.fire('Error', 'No se pudo eliminar el archivo: ' + error.message, 'error');
          });
      });
    });
  }

  eliminarArchivoInicial(item: HallazgoItem, archivo: ArchivoHallazgo) {
    if (this.soloLectura || !item || !item.id || this.estaBloqueadoParaMi(item)) {
      return;
    }

    Swal.fire({
      title: 'Eliminar archivo',
      text: `¿Eliminar "${archivo.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (!result.value) { return; }

      storageRef.ref(archivo.path).delete().catch(() => {
        // si el archivo ya no existe en Storage, igual limpiamos la referencia en Firestore
      }).then(() => {
        const archivosActuales = (item.archivos || []).filter(a => a.path !== archivo.path);
        firestoreDB.collection('hallazgos').doc(item.id).update({ archivos: archivosActuales })
          .then(() => {
            item.archivos = archivosActuales;
          })
          .catch((error: any) => {
            Swal.fire('Error', 'No se pudo eliminar el archivo: ' + error.message, 'error');
          });
      });
    });
  }

  getFechaBitacora(fechaIso: string): string {
    if (!fechaIso) {
      return '';
    }

    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) {
      return fechaIso;
    }

    return this.formatearFechaVisual(fecha) + ' ' + ('0' + fecha.getHours()).slice(-2) + ':' + ('0' + fecha.getMinutes()).slice(-2);
  }

  getResponsableFechaInmediata(registro: BitacoraHallazgo): string {
    if (registro.responsableInmediata || registro.fechaInmediata) {
      return this.componerResponsableFecha(registro.responsableInmediata, registro.fechaInmediata);
    }
    return registro.responsableFechaInmediata || '-';
  }

  getResponsableFechaCorrectiva(registro: BitacoraHallazgo): string {
    if (registro.responsableCorrectiva || registro.fechaCorrectiva) {
      return this.componerResponsableFecha(registro.responsableCorrectiva, registro.fechaCorrectiva);
    }
    return registro.responsableFechaCorrectiva || '-';
  }

  getResponsableSeguimiento(registro: BitacoraHallazgo): string {
    const valor = (registro.responsableSeguimiento || '').trim();
    if (valor) {
      return valor;
    }
    return registro.responsableFechaCorrectiva || '-';
  }

  toggleFormularioHallazgos() {
    this.mostrarFormulario = !this.mostrarFormulario;
  }

  puedeAdministrarPermisoCoordinador(): boolean {
    if (!this.usuario || !this.usuario.idUsuario) {
      return false;
    }

    if (this.esOficina) {
      return this.esGerencia;
    }

    const idUsuarioActual = Number(this.usuario.idUsuario);
    const idUsuarioCreadorSubProyecto = Number(this.subProyectoActual && this.subProyectoActual.idUsuarioCreador);
    return idUsuarioActual > 0 && (
      idUsuarioActual === idUsuarioCreadorSubProyecto ||
      this.esGerencia
    );
  }

  esCoordinadorSubProyecto(): boolean {
    if (this.esOficina) {
      return false;
    }
    if (!this.usuario || !this.usuario.idUsuario || !this.subProyectoActual) {
      return false;
    }

    return Number(this.subProyectoActual.idUsuarioCoordinador) === Number(this.usuario.idUsuario);
  }

  getMensajePermisoEliminacion(): string {
    if (this.esOficina) {
      return 'Solo quien creó el hallazgo o un usuario con rol de gerencia puede eliminarlo.';
    }
    if (this.esCoordinadorSubProyecto() && !this.coordinadorTienePermisoEliminar) {
      return 'Como coordinador, debes pedir autorización al creador del subproyecto o a un usuario con rol de gerencia para eliminar hallazgos.';
    }

    return 'Solo el creador del subproyecto o un usuario con rol de gerencia pueden eliminar hallazgos.';
  }

  getTextoPermisoCoordinador(): string {
    return this.coordinadorTienePermisoEliminar
      ? 'Quitar permiso al coordinador'
      : 'Dar permiso al coordinador';
  }

  togglePermisoCoordinador() {
    if (!this.puedeAdministrarPermisoCoordinador()) {
      return;
    }

    const nuevoValor = !this.coordinadorTienePermisoEliminar;

    firestoreDB.collection('hallazgosConfig').doc(this.getIdConfigHallazgos())
      .set({ coordinadorTienePermisoEliminar: nuevoValor }, { merge: true })
      .then(() => {
        const mensaje = nuevoValor
          ? 'El coordinador ya puede eliminar hallazgos en este subproyecto.'
          : 'Se quitó el permiso de eliminación al coordinador.';
        Swal.fire('Permiso actualizado', mensaje, 'success');
      })
      .catch((error: any) => {
        Swal.fire('Error', 'No se pudo actualizar el permiso: ' + error.message, 'error');
      });
    // No es necesario actualizar this.coordinadorTienePermisoEliminar aquí:
    // el onSnapshot de cargarPermisoCoordinador() lo hará automáticamente
    // en cuanto Firestore confirme el cambio, y se sincronizará en todos los navegadores.
  }

  // ==========================================================
  // Candado de gerencia
  // ==========================================================

  /** true si el hallazgo está bloqueado y el usuario actual no lo ha desbloqueado con la clave. */
  estaBloqueadoParaMi(item: HallazgoItem | null): boolean {
    if (!item || !item.bloqueado) { return false; }
    return !(item.id && this.esSubGerente && this.accesoTemporalBloqueo[item.id]);
  }

  /** La bitácora queda en solo lectura si el componente lo está o el hallazgo está bloqueado. */
  bitacoraSoloLectura(item: HallazgoItem | null): boolean {
    return this.soloLectura || this.estaBloqueadoParaMi(item);
  }

  getTituloBloqueo(item: HallazgoItem): string {
    if (!item.bloqueado) { return 'Bloquear hallazgo'; }
    const quien = item.bloqueadoPorNombre ? ' por ' + item.bloqueadoPorNombre : '';
    const cuando = item.fechaBloqueo ? ' el ' + this.getFechaBitacora(item.fechaBloqueo) : '';
    return 'Bloqueado' + quien + cuando + '. Clic para desbloquear.';
  }

  /** Botón candado de la fila: bloquea o desbloquea definitivamente (pide la clave). */
  toggleBloqueoHallazgo(item: HallazgoItem) {
    if (this.soloLectura || !item || !item.id) { return; }
    if (!this.esSubGerente) {
      return;
    }
    if (this.hallazgoEnEdicionId === item.id) {
      Swal.fire('Hallazgo en edición', 'Guarda o cancela la edición antes de cambiar el bloqueo.', 'info');
      return;
    }

    const bloquear = !item.bloqueado;
    this.obtenerConfigClave().then((config: any) => {
      if (!config) {
        // Primera vez: el gerente define la clave y se bloquea el hallazgo
        return this.crearClaveGerencia().then((creada: boolean) => creada ? true : false);
      }
      return this.solicitarYValidarClave(
        bloquear ? 'Bloquear hallazgo #' + item.numero : 'Desbloquear hallazgo #' + item.numero,
        config
      );
    }).then((ok: boolean) => {
      if (!ok) { return; }

      const payload: any = bloquear
        ? {
            bloqueado: true,
            bloqueadoPor: Number(this.usuario && this.usuario.idUsuario) || null,
            bloqueadoPorNombre: this.getNombreUsuarioActual(),
            fechaBloqueo: new Date().toISOString()
          }
        : { bloqueado: false, bloqueadoPor: null, bloqueadoPorNombre: '', fechaBloqueo: '' };

      return firestoreDB.collection('hallazgos').doc(item.id).update(payload).then(() => {
        delete this.accesoTemporalBloqueo[item.id as string];
        Swal.fire({
          icon: 'success',
          title: bloquear ? 'Hallazgo bloqueado' : 'Hallazgo desbloqueado',
          text: bloquear
            ? 'Solo el sub-gerente, con la clave, podrá modificar este hallazgo.'
            : 'El hallazgo vuelve a ser editable por los usuarios con permiso.',
          timer: 1800,
          showConfirmButton: false
        });
      });
    }).catch((error: any) => {
      Swal.fire('Error', 'No se pudo cambiar el bloqueo: ' + (error && error.message ? error.message : error), 'error');
    });
  }

  /** Desbloqueo temporal (solo esta sesión) para que el gerente trabaje en un hallazgo bloqueado. */
  pedirAccesoHallazgoBloqueado(item: HallazgoItem): Promise<boolean> {
    if (!item || !item.id) { return Promise.resolve(false); }
    if (!item.bloqueado || this.accesoTemporalBloqueo[item.id]) { return Promise.resolve(true); }

    if (!this.esSubGerente) {
      Swal.fire('Sin permiso', 'Este hallazgo no se puede modificar.', 'info');
      return Promise.resolve(false);
    }

    return this.obtenerConfigClave().then((config: any) => {
      if (!config) {
        Swal.fire('Sin clave', 'Aún no se ha definido la clave. Desbloquea el hallazgo con el candado para crearla.', 'info');
        return false;
      }
      return this.solicitarYValidarClave('Hallazgo #' + item.numero + ' bloqueado', config);
    }).then((ok: boolean) => {
      if (ok) { this.accesoTemporalBloqueo[item.id as string] = true; }
      return ok;
    }).catch((error: any) => {
      Swal.fire('Error', 'No se pudo validar la clave: ' + (error && error.message ? error.message : error), 'error');
      return false;
    });
  }

  /** Cambiar la clave de gerencia (pide la actual). */
  cambiarClaveGerencia() {
    if (!this.esSubGerente || this.soloLectura) { return; }

    this.obtenerConfigClave().then((config: any) => {
      if (!config) {
        return this.crearClaveGerencia();
      }
      return this.solicitarYValidarClave('Clave actual', config).then((ok: boolean) => {
        if (!ok) { return false; }
        return this.crearClaveGerencia(true);
      });
    }).catch((error: any) => {
      Swal.fire('Error', 'No se pudo cambiar la clave: ' + (error && error.message ? error.message : error), 'error');
    });
  }

  private obtenerConfigClave(): Promise<any> {
    return firestoreDB.collection('hallazgosConfig').doc(DOC_CLAVE_GERENCIA).get().then((doc: any) => {
      const data = doc.exists ? doc.data() : null;
      return data && data.hash && data.salt ? data : null;
    });
  }

  /** Muestra el diálogo para definir una clave nueva (dos veces) y la guarda como hash + salt. */
  private crearClaveGerencia(esCambio: boolean = false): Promise<boolean> {
    return Swal.fire({
      title: esCambio ? 'Nueva clave' : 'Definir clave',
      html:
        '<p style="font-size:13px;margin-bottom:10px">' +
        (esCambio ? 'Ingresa la nueva clave.' : 'Es la primera vez que se usa el candado. Define la clave que solo el sub-gerente conocerá.') +
        '</p>' +
        '<input id="swal-clave-1" type="password" class="swal2-input" placeholder="Clave (mín. 6 caracteres)" autocomplete="new-password">' +
        '<input id="swal-clave-2" type="password" class="swal2-input" placeholder="Repetir clave" autocomplete="new-password">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar clave',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const c1 = (document.getElementById('swal-clave-1') as HTMLInputElement).value || '';
        const c2 = (document.getElementById('swal-clave-2') as HTMLInputElement).value || '';
        if (c1.length < 6) {
          Swal.showValidationMessage('La clave debe tener al menos 6 caracteres');
          return false;
        }
        if (c1 !== c2) {
          Swal.showValidationMessage('Las claves no coinciden');
          return false;
        }
        return c1;
      }
    }).then((result: any) => {
      if (!result || !result.value) { return false; }
      return this.guardarClave(result.value).then(() => {
        Swal.fire({
          icon: 'success',
          title: 'Clave guardada',
          text: 'Guárdala en un lugar seguro. Si la olvidas, puedes restablecerla con un código a tu correo.',
          timer: 2200,
          showConfirmButton: false
        });
        return true;
      });
    });
  }

  private guardarClave(clave: string): Promise<any> {
    const salt = this.generarSalt();
    return firestoreDB.collection('hallazgosConfig').doc(DOC_CLAVE_GERENCIA).set({
      hash: this.sha256(salt + ':' + clave),
      salt: salt,
      actualizadoPor: Number(this.usuario && this.usuario.idUsuario) || null,
      fechaActualizacion: new Date().toISOString()
    });
  }

  /** Pide la clave y la compara contra el hash guardado. */
  private solicitarYValidarClave(titulo: string, config: any): Promise<boolean> {
    let pidioRecuperar = false;
    const onClickOlvide = (ev: any) => {
      const target = ev && ev.target;
      if (target && target.id === 'swal-olvide-clave') {
        ev.preventDefault();
        pidioRecuperar = true;
        Swal.close();
      }
    };
    document.addEventListener('click', onClickOlvide, true);

    return Swal.fire({
      title: titulo,
      text: 'Ingresa la clave',
      input: 'password',
      inputPlaceholder: 'Clave',
      inputAttributes: { autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off' },
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      footer: '<a href="#" id="swal-olvide-clave" style="font-size:12px">¿Olvidaste la clave?</a>',
      preConfirm: (valor: string) => {
        const hash = this.sha256(config.salt + ':' + (valor || ''));
        if (hash !== config.hash) {
          Swal.showValidationMessage('Clave incorrecta');
          return false;
        }
        return true;
      }
    }).then((result: any) => {
      document.removeEventListener('click', onClickOlvide, true);
      if (pidioRecuperar) {
        // Después de recuperar, el usuario vuelve a intentar la acción con su clave nueva
        this.iniciarRecuperacionClave();
        return false;
      }
      return !!(result && result.value === true);
    }, () => {
      document.removeEventListener('click', onClickOlvide, true);
      return false;
    });
  }

  // ==========================================================
  // Recuperación de clave por correo
  // ==========================================================

  /** Envía un código al correo del sub-gerente y le deja definir una clave nueva. */
  iniciarRecuperacionClave() {
    if (!this.esSubGerente || this.soloLectura) { return; }

    let correoDestino = '';
    this.obtenerCorreoUsuarioActual().then((correo: string) => {
      if (!correo) {
        Swal.fire('Sin correo', 'Tu usuario no tiene un correo registrado. Pide que lo agreguen en Usuarios.', 'warning');
        return null;
      }
      correoDestino = correo;
      return firestoreDB.collection('hallazgosConfig').doc(DOC_RECUPERACION_CLAVE).get();
    }).then((doc: any) => {
      if (!doc) { return; }
      const data = doc.exists ? doc.data() : null;
      const ahora = Date.now();
      const enviadoHace = data && data.fechaEnvio ? (ahora - new Date(data.fechaEnvio).getTime()) / 1000 : Infinity;
      const vigente = data && data.expira && new Date(data.expira).getTime() > ahora &&
        Number(data.idUsuario) === Number(this.usuario && this.usuario.idUsuario);

      // Si ya hay un código recién enviado, no se reenvía: se va directo a ingresarlo
      if (vigente && enviadoHace < SEGUNDOS_ENTRE_ENVIOS) {
        return this.pedirCodigoYNuevaClave(correoDestino);
      }

      return Swal.fire({
        title: 'Recuperar clave',
        html: 'Te enviaremos un código de verificación a<br><strong>' + this.enmascararCorreo(correoDestino) + '</strong>',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Enviar código',
        cancelButtonText: 'Cancelar'
      }).then((result: any) => {
        if (!result || !result.value) { return; }
        return this.enviarCodigoRecuperacion(correoDestino).then(() => this.pedirCodigoYNuevaClave(correoDestino));
      });
    }).catch((error: any) => {
      Swal.fire('Error', 'No se pudo iniciar la recuperación: ' + (error && error.message ? error.message : error), 'error');
    });
  }

  private enviarCodigoRecuperacion(correo: string): Promise<any> {
    const codigo = this.generarCodigoRecuperacion();
    const salt = this.generarSalt();
    const ahora = new Date();
    const expira = new Date(ahora.getTime() + MINUTOS_VIGENCIA_CODIGO * 60000);
    const nombre = this.getNombreUsuarioActual();

    return firestoreDB.collection('hallazgosConfig').doc(DOC_RECUPERACION_CLAVE).set({
      codigoHash: this.sha256(salt + ':' + codigo),
      salt: salt,
      idUsuario: Number(this.usuario && this.usuario.idUsuario) || null,
      fechaEnvio: ahora.toISOString(),
      expira: expira.toISOString(),
      intentos: 0
    }).then(() => {
      return this.enviarCorreoEmailJS({
        to_email: correo,
        nombre: nombre,
        codigo: codigo,
        minutos: String(MINUTOS_VIGENCIA_CODIGO)
      }).catch((error: any) => {
        // Si el correo no salió, se elimina el código para que pueda pedir otro al tiro
        return firestoreDB.collection('hallazgosConfig').doc(DOC_RECUPERACION_CLAVE).delete()
          .then(() => { throw error; }, () => { throw error; });
      });
    });
  }

  /** Envía un correo con la API REST de EmailJS (sin instalar paquetes). */
  private enviarCorreoEmailJS(params: { [clave: string]: string }): Promise<void> {
    if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY.indexOf('TU_') === 0) {
      return Promise.reject(new Error('Falta configurar la Public Key de EmailJS.'));
    }

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.emailjs.com/api/v1.0/email/send', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error('EmailJS respondió ' + xhr.status + ': ' + (xhr.responseText || 'error desconocido')));
        }
      };
      xhr.onerror = () => reject(new Error('No se pudo conectar con el servicio de correo.'));
      xhr.send(JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: params
      }));
    });
  }

  private pedirCodigoYNuevaClave(correo: string): Promise<any> {
    return Swal.fire({
      title: 'Restablecer clave',
      html:
        '<p style="font-size:13px;margin-bottom:10px">Ingresa el código que enviamos a <strong>' +
        this.enmascararCorreo(correo) + '</strong> y tu nueva clave.</p>' +
        '<input id="swal-codigo" type="text" class="swal2-input" placeholder="Código del correo" autocomplete="off" style="text-transform:uppercase;letter-spacing:3px">' +
        '<input id="swal-nueva-1" type="password" class="swal2-input" placeholder="Nueva clave (mín. 6 caracteres)" autocomplete="new-password">' +
        '<input id="swal-nueva-2" type="password" class="swal2-input" placeholder="Repetir nueva clave" autocomplete="new-password">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar clave',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        const codigo = ((document.getElementById('swal-codigo') as HTMLInputElement).value || '').trim().toUpperCase();
        const c1 = (document.getElementById('swal-nueva-1') as HTMLInputElement).value || '';
        const c2 = (document.getElementById('swal-nueva-2') as HTMLInputElement).value || '';
        if (!codigo) { Swal.showValidationMessage('Ingresa el código'); return false; }
        if (c1.length < 6) { Swal.showValidationMessage('La clave debe tener al menos 6 caracteres'); return false; }
        if (c1 !== c2) { Swal.showValidationMessage('Las claves no coinciden'); return false; }

        return this.validarCodigoRecuperacion(codigo).then((error: string) => {
          if (error) {
            Swal.showValidationMessage(error);
            return false;
          }
          return c1;
        });
      }
    }).then((result: any) => {
      if (!result || !result.value) { return; }
      return this.guardarClave(result.value).then(() =>
        firestoreDB.collection('hallazgosConfig').doc(DOC_RECUPERACION_CLAVE).delete()
      ).then(() => {
        Swal.fire({
          icon: 'success',
          title: 'Clave restablecida',
          text: 'Ya puedes usar tu nueva clave.',
          timer: 2000,
          showConfirmButton: false
        });
      });
    });
  }

  /** Devuelve '' si el código es válido, o el mensaje de error. */
  private validarCodigoRecuperacion(codigo: string): Promise<string> {
    const ref = firestoreDB.collection('hallazgosConfig').doc(DOC_RECUPERACION_CLAVE);
    return ref.get().then((doc: any) => {
      const data = doc.exists ? doc.data() : null;
      if (!data || !data.codigoHash) {
        return 'No hay un código vigente. Solicita uno nuevo.';
      }
      if (Number(data.idUsuario) !== Number(this.usuario && this.usuario.idUsuario)) {
        return 'Este código fue solicitado por otro usuario.';
      }
      if (new Date(data.expira).getTime() < Date.now()) {
        return 'El código venció. Solicita uno nuevo.';
      }
      const intentos = Number(data.intentos) || 0;
      if (intentos >= MAX_INTENTOS_CODIGO) {
        return 'Demasiados intentos. Solicita un código nuevo.';
      }
      if (this.sha256(data.salt + ':' + codigo) !== data.codigoHash) {
        return ref.update({ intentos: intentos + 1 }).then(() =>
          'Código incorrecto (' + (MAX_INTENTOS_CODIGO - intentos - 1) + ' intentos restantes)'
        );
      }
      return '';
    }).catch((error: any) => 'No se pudo validar el código: ' + (error && error.message ? error.message : error));
  }

  /** Obtiene el correo registrado (módulo Usuarios / sMail) de la persona del usuario conectado. */
  private obtenerCorreoUsuarioActual(): Promise<string> {
    const u = this.usuario || {};
    const correoDirecto = u.direccionMail || u.email || u.correo || '';
    const idPersona = Number(u.idPersona);
    if (!idPersona) {
      return Promise.resolve(correoDirecto);
    }

    const servicio: any = this._sMail;
    let llamada: any = null;
    if (typeof servicio.getMailbyidPersona === 'function') {
      llamada = servicio.getMailbyidPersona(idPersona);
    } else if (typeof servicio.getMailbyIdPersona === 'function') {
      llamada = servicio.getMailbyIdPersona(idPersona);
    } else if (typeof servicio.getMail === 'function') {
      llamada = servicio.getMail();
    }
    if (!llamada) {
      return Promise.resolve(correoDirecto);
    }

    return this.aPromesa(llamada).then((res: any) => {
      const lista: any[] = Array.isArray(res) ? res : (res ? [res] : []);
      const delUsuario = lista.filter((m: any) =>
        m && Number(m.idPersona) === idPersona && m.activo !== false && !m.fechaRemocion && m.direccionMail
      );
      return delUsuario.length ? String(delUsuario[delUsuario.length - 1].direccionMail).trim() : correoDirecto;
    }).catch(() => correoDirecto);
  }

  /** Convierte un Observable, Promise o jqXHR en Promise. */
  private aPromesa(valor: any): Promise<any> {
    if (valor && typeof valor.subscribe === 'function') {
      return new Promise((resolve, reject) => {
        const sub = valor.subscribe((r: any) => { resolve(r); setTimeout(() => sub && sub.unsubscribe && sub.unsubscribe()); }, reject);
      });
    }
    if (valor && typeof valor.then === 'function') {
      return new Promise((resolve, reject) => valor.then(resolve, reject));
    }
    return Promise.resolve(valor);
  }

  private generarCodigoRecuperacion(): string {
    // Sin caracteres confusos (0/O, 1/I/L)
    const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(8);
    const c: any = (window as any).crypto || (window as any).msCrypto;
    if (c && c.getRandomValues) {
      c.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) { bytes[i] = Math.floor(Math.random() * 256); }
    }
    let codigo = '';
    for (let i = 0; i < bytes.length; i++) { codigo += alfabeto.charAt(bytes[i] % alfabeto.length); }
    return codigo;
  }

  private enmascararCorreo(correo: string): string {
    const partes = (correo || '').split('@');
    if (partes.length !== 2) { return correo; }
    const nombre = partes[0];
    const visible = nombre.length <= 2 ? nombre.charAt(0) : nombre.substring(0, 2);
    return this.escaparHtml(visible + '***@' + partes[1]);
  }

  private escaparHtml(texto: string): string {
    return (texto || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private getNombreUsuarioActual(): string {
    const u = this.usuario || {};
    return u.nombreUsuario || u.nombre || u.usuario || u.email || '';
  }

  private generarSalt(): string {
    const bytes = new Uint8Array(16);
    const c: any = (window as any).crypto || (window as any).msCrypto;
    if (c && c.getRandomValues) {
      c.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) { bytes[i] = Math.floor(Math.random() * 256); }
    }
    let hex = '';
    for (let i = 0; i < bytes.length; i++) { hex += ('0' + bytes[i].toString(16)).slice(-2); }
    return hex;
  }

  /** SHA-256 síncrono (UTF-8) — sin dependencias, compatible con navegadores antiguos. */
  private sha256(texto: string): string {
    const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    // Codificación UTF-8 manual (sin unescape/TextEncoder)
    const b: number[] = [];
    for (let i = 0; i < texto.length; i++) {
      let cp = texto.charCodeAt(i);
      if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < texto.length) {
        const lo = texto.charCodeAt(i + 1);
        if (lo >= 0xdc00 && lo <= 0xdfff) {
          cp = 0x10000 + ((cp - 0xd800) << 10) + (lo - 0xdc00);
          i++;
        }
      }
      if (cp < 0x80) {
        b.push(cp);
      } else if (cp < 0x800) {
        b.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
      } else if (cp < 0x10000) {
        b.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      } else {
        b.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      }
    }
    const bitLen = b.length * 8;
    b.push(0x80);
    while (b.length % 64 !== 56) { b.push(0); }
    const high = Math.floor(bitLen / 0x100000000);
    for (let i = 3; i >= 0; i--) { b.push((high >>> (i * 8)) & 0xff); }
    for (let i = 3; i >= 0; i--) { b.push((bitLen >>> (i * 8)) & 0xff); }

    const w = new Array(64);
    for (let o = 0; o < b.length; o += 64) {
      for (let t = 0; t < 16; t++) {
        w[t] = (b[o + t * 4] << 24) | (b[o + t * 4 + 1] << 16) | (b[o + t * 4 + 2] << 8) | b[o + t * 4 + 3];
      }
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      let a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[t] + w[t]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const mj = (a & bb) ^ (a & c) ^ (bb & c);
        const t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map((x: number) => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
  }

  getEstadoClass(estado: string): string {
    switch ((estado || '').toUpperCase()) {
      case 'EN DESARROLLO': return 'estado-en-desarrollo';
      case 'PENDIENTE':     return 'estado-pendiente';
      case 'ENVIADA':       return 'estado-enviada';
      case 'CERRADA':       return 'estado-cerrada';
      default:              return '';
    }
  }

  private crearNuevoHallazgo(): HallazgoItem {
    return {
      fecha: '',
      anio: new Date().getFullYear(),
      numero: 0,
      tipoAccion: '',
      estado: 'PENDIENTE',
      areaResponsable: '',
      obra: this.nombreObraPredeterminada,
      quienDetecta: '',
      origenHallazgo: '',
      descripcion: '',
      accionInmediata: '',
      seguimientoResponsable: '',
      prioridad: 'MEDIA',
      archivos: []
    };
  }

  getTipoClass(tipo: string): string {
    const t = (tipo || '').toLowerCase();
    if (t.includes('near miss'))       return 'tipo-near-miss';
    if (t.includes('flash'))           return 'tipo-flash';
    if (t.includes('positivo') || t === 'rel' || t === 'rel.') return 'tipo-positivo';
    if (t.includes('mejora'))          return 'tipo-mejora';
    if (t.includes('observaci') || t === 'ob' || t === 'ob.') return 'tipo-observacion';
    if (t.includes('stop'))            return 'tipo-stopwork';
    if (t.includes('conformidad'))     return 'tipo-noconformidad';
    if (t.includes('lecci'))           return 'tipo-leccion';
    return '';
  }

  getTipoLabel(tipo: string): string {
    const t = this.normalizarTexto(tipo);

    switch (t) {
      case 'FLASH REPORT':
        return 'Flash';
      case 'REFUERZO POSITIVO':
      case 'REL':
      case 'REL.':
        return 'Refuerzo';
      case 'OPORTUNIDAD DE MEJORA':
        return 'Mejora';
      case 'OBSERVACION':
      case 'OB':
      case 'OB.':
        return 'Observacion';
      case 'STOP WORK':
        return 'Stop Work';
      case 'NO CONFORMIDAD':
        return 'No conformidad';
      case 'LECCION APRENDIDA':
        return 'Leccion';
      default:
        return tipo || 'Seleccione';
    }
  }

  private resetNuevoHallazgo() {
    const hoy = new Date();
    const fecha = this.formatearFechaInput(hoy);

    this.nuevoHallazgo = {
      fecha,
      anio: hoy.getFullYear(),
      numero: this.hallazgos.length + 1,
      tipoAccion: '',
      estado: 'EN DESARROLLO',
      areaResponsable: '',
      obra: this.nombreObraPredeterminada,
      quienDetecta: '',
      origenHallazgo: '',
      descripcion: '',
      accionInmediata: '',
      seguimientoResponsable: '',
      prioridad: 'MEDIA',
      archivos: []
    };
    this.archivosNuevoHallazgo = [];
    this.subiendoArchivosNuevoHallazgo = false;
  }

  private getIdSubProyectoActual(): string {
    if (this.esOficina) {
      return 'oficina-operacional';
    }
    return this.subProyectoActual && this.subProyectoActual.idSubProyecto
      ? String(this.subProyectoActual.idSubProyecto)
      : 'sin-subproyecto';
  }

  private getIdConfigHallazgos(): string {
    if (this.esOficina) {
      return 'oficina-operacional';
    }
    return this.subProyectoActual && this.subProyectoActual.idSubProyecto
      ? String(this.subProyectoActual.idSubProyecto)
      : 'sin-subproyecto';
  }

  private cargarDatosIniciales() {
    const idSubProyecto = this.getIdSubProyectoActual();

    if (this.unsubscribeHallazgos) {
      this.unsubscribeHallazgos();
    }

    const consulta = this.esOficina
      ? firestoreDB.collection('hallazgos').where('ambito', '==', 'oficina')
      : firestoreDB.collection('hallazgos').where('idSubProyecto', '==', idSubProyecto);

    this.unsubscribeHallazgos = consulta
      .onSnapshot((snapshot: any) => {
        const items: HallazgoItem[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data() || {};
          if (this.esOficina && data.tipoRegistro &&
              data.tipoRegistro !== 'hallazgo-oficina') {
            return;
          }
          items.push({
            id: doc.id,
            ...data,
            prioridad: data.prioridad || '',
            archivos: Array.isArray(data.archivos) ? data.archivos : [],
            bitacoras: Array.isArray(data.bitacoras) ? data.bitacoras : [],
            bloqueado: data.bloqueado === true
          } as HallazgoItem);
        });
        items.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        items.forEach((item, index) => {
          item.numero = items.length - index;
        });
        this.hallazgos = items;

        // Si alguien estaba editando un hallazgo que gerencia acaba de bloquear, se le saca del modo edición.
        if (this.hallazgoEnEdicionId) {
          const enEdicion = items.find(i => i.id === this.hallazgoEnEdicionId);
          if (enEdicion && this.estaBloqueadoParaMi(enEdicion)) {
            this.hallazgoEnEdicionId = null;
            this.hallazgoOriginalEnEdicion = null;
          }
        }

        // El modal de bitácora guarda su propio item; hay que refrescarlo o
        // quedaría con los archivos/registros desactualizados tras un snapshot.
        if (this.hallazgoModalSeleccionado && this.hallazgoModalSeleccionado.id) {
          const actualizado = items.find(i => i.id === this.hallazgoModalSeleccionado.id);
          this.hallazgoModalSeleccionado = actualizado || null;
        }
      }, (error: any) => {
        console.error('Error al cargar hallazgos desde Firestore:', error);
      });
  }

  private subirArchivosAHallazgo(hallazgoId: string, archivos: File[]): Promise<void> {
    const rutaBase = this.getIdSubProyectoActual();
    const cargas = archivos.map((archivo: File) => {
      const ruta = 'controlHallazgos/' + rutaBase + '/' + hallazgoId + '/' + Date.now() + '_' + archivo.name;
      const referencia = storageRef.ref(ruta);

      return referencia.put(archivo)
        .then(() => referencia.getDownloadURL())
        .then((url: string) => {
          return {
            nombre: archivo.name,
            url: url,
            path: ruta,
            fechaSubida: new Date().toISOString()
          } as ArchivoHallazgo;
        });
    });

    return Promise.all(cargas).then((nuevosAdjuntos: ArchivoHallazgo[]) => {
      return firestoreDB.collection('hallazgos').doc(hallazgoId).get().then((doc: any) => {
        const data = doc.exists ? doc.data() : {};
        const adjuntosActuales: ArchivoHallazgo[] = data && Array.isArray(data.archivos) ? data.archivos : [];
        return firestoreDB.collection('hallazgos').doc(hallazgoId).update({
          archivos: adjuntosActuales.concat(nuevosAdjuntos)
        });
      });
    });
  }

  /** Sube los archivos de un registro de bitácora a Storage; no toca Firestore (eso lo hace el llamador). */
  private subirArchivosDeBitacora(hallazgoId: string, bitacoraId: string, archivos: File[]): Promise<ArchivoHallazgo[]> {
    if (!archivos || archivos.length === 0) {
      return Promise.resolve([]);
    }

    const rutaBase = this.getIdSubProyectoActual();
    const cargas = archivos.map((archivo: File) => {
      const ruta = 'controlHallazgos/' + rutaBase + '/' + hallazgoId + '/' + bitacoraId + '/' + Date.now() + '_' + archivo.name;
      const referencia = storageRef.ref(ruta);

      return referencia.put(archivo)
        .then(() => referencia.getDownloadURL())
        .then((url: string) => {
          return {
            nombre: archivo.name,
            url: url,
            path: ruta,
            fechaSubida: new Date().toISOString()
          } as ArchivoHallazgo;
        });
    });

    return Promise.all(cargas);
  }

  private cargarPermisoCoordinador() {
    if (this.unsubscribePermisoCoordinador) {
      this.unsubscribePermisoCoordinador();
    }

    this.unsubscribePermisoCoordinador = firestoreDB.collection('hallazgosConfig')
      .doc(this.getIdConfigHallazgos())
      .onSnapshot((doc: any) => {
        const data = doc.exists ? doc.data() : null;
        this.coordinadorTienePermisoEliminar = !!(data && data.coordinadorTienePermisoEliminar === true);
        this.actualizarPermisoEliminacion();
      }, (error: any) => {
        console.error('Error al cargar permiso del coordinador desde Firestore:', error);
        this.coordinadorTienePermisoEliminar = false;
        this.actualizarPermisoEliminacion();
      });
  }

  private actualizarPermisoEliminacion() {
    if (!this.usuario || !this.usuario.idUsuario) {
      this.puedeEliminarHallazgo = false;
      return;
    }

    const idUsuarioActual = Number(this.usuario.idUsuario);
    if (this.esOficina) {
      this.puedeEliminarHallazgo = this.esGerencia ||
        this.hallazgos.some((item: HallazgoItem) => Number(item.idUsuarioCreador) === idUsuarioActual);
      return;
    }
    const idUsuarioCreadorSubProyecto = Number(this.subProyectoActual && this.subProyectoActual.idUsuarioCreador);
    const idUsuarioCoordinadorSubProyecto = Number(this.subProyectoActual && this.subProyectoActual.idUsuarioCoordinador);

    this.puedeEliminarHallazgo = (
      idUsuarioActual > 0 && idUsuarioActual === idUsuarioCreadorSubProyecto
    ) || (
      this.esGerencia
    ) || (
      this.coordinadorTienePermisoEliminar && idUsuarioActual === idUsuarioCoordinadorSubProyecto
    );
  }

  private puedeEliminarEsteHallazgo(item: HallazgoItem): boolean {
    if (this.esOficina) {
      return this.esGerencia ||
        Number(item && item.idUsuarioCreador) === Number(this.usuario && this.usuario.idUsuario);
    }
    return this.puedeEliminarHallazgo;
  }

  private cargarPermisoEliminacion() {
    if (!this.usuario || !this.usuario.idUsuario) {
      this.puedeEliminarHallazgo = false;
      return;
    }

    this.cargarPermisoCoordinador();
    this.actualizarPermisoEliminacion();

    const idUsuarioActual = Number(this.usuario.idUsuario);
    this._sUsuariosPerfiles.getUsuariosPerfilesbyidUsuario(idUsuarioActual).subscribe(
      (perfiles: any) => {
        const listaPerfiles = Array.isArray(perfiles) ? perfiles : [];
        this.esGerencia = listaPerfiles.some((perfil: any) =>
          perfil.idPerfil == 1 || perfil.idPerfil == 2 || perfil.idPerfil == 11
        );
        this.idsPerfilesUsuario = listaPerfiles
          .filter((perfil: any) => perfil.activo !== false && !perfil.fechaRemocion)
          .map((perfil: any) => Number(perfil.idPerfil));
        this.actualizarEsSubGerente();
        this.actualizarPermisoEliminacion();
      },
      () => {
        this.esGerencia = false;
        this.idsPerfilesUsuario = [];
        this.actualizarEsSubGerente();
        this.actualizarPermisoEliminacion();
      }
    );

    // Se busca el perfil SUB-GERENTE por nombre (no por id fijo) en el maestro de perfiles
    this._sPerfil.getPerfil().subscribe(
      (perfiles: any) => {
        const lista = Array.isArray(perfiles) ? perfiles : [];
        this.idsPerfilesSubGerente = lista
          .filter((perfil: any) => this.esNombrePerfilSubGerente(perfil.nombrePerfil))
          .map((perfil: any) => Number(perfil.idPerfil));
        this.actualizarEsSubGerente();
      },
      () => {
        this.idsPerfilesSubGerente = [];
        this.actualizarEsSubGerente();
      }
    );

    if (this.idProyecto) {
      this._sProyecto.getProyectobyID(this.idProyecto).subscribe(
        result => {
          this.proyecto = result;
        },
        () => {
          this.proyecto = null;
        }
      );
    }

    const idSubProyecto = Number(this.subProyectoActual && this.subProyectoActual.idSubProyecto);
    if (!idSubProyecto) {
      return;
    }

    this._sVisSubProyNoValidado.getVis_SubProyNoValidadobyidSubProyecto(idSubProyecto).subscribe(
      result => {
        const detalleSubProyecto = Array.isArray(result) ? result[0] : result;
        this.directorSubProyectoId = detalleSubProyecto && detalleSubProyecto.DirectorSP
          ? Number(detalleSubProyecto.DirectorSP)
          : null;
        this.actualizarPermisoEliminacion();
      },
      () => {
        this.directorSubProyectoId = null;
        this.actualizarPermisoEliminacion();
      }
    );
  }

  private esNombrePerfilSubGerente(nombre: string): boolean {
    // "SUB-GERENTE", "Sub Gerente", "Subgerente", "SUB_GERENTE"...
    const limpio = this.normalizarTexto(nombre).replace(/[^A-Z]/g, '');
    return limpio === 'SUBGERENTE' || limpio.indexOf('SUBGERENTE') === 0;
  }

  private actualizarEsSubGerente() {
    this.esSubGerente = this.idsPerfilesUsuario.some((id: number) => this.idsPerfilesSubGerente.indexOf(id) >= 0);
    if (!this.esSubGerente) {
      this.accesoTemporalBloqueo = {};
    }
  }

  private normalizarTexto(texto: string): string {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  private formatearFechaInput(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = ('0' + (fecha.getMonth() + 1)).slice(-2);
    const dia = ('0' + fecha.getDate()).slice(-2);
    return anio + '-' + mes + '-' + dia;
  }

  private normalizarPrioridad(prioridad: string): PrioridadSemaforoHallazgo | '' {
    const valor = (prioridad || '').trim().toUpperCase();
    if (valor === 'ALTA') { return 'alta'; }
    if (valor === 'MEDIA') { return 'media'; }
    if (valor === 'BAJA') { return 'baja'; }
    return '';
  }

  private crearBitacoraForm(prioridadInicial: string = 'MEDIA'): BitacoraHallazgoForm {
    return {
      prioridad: prioridadInicial,
      descripcionHallazgo: '',
      analisisCausa: '',
      accionInmediata: '',
      responsableInmediata: '',
      fechaInmediata: '',
      accionCorrectiva: '',
      responsableCorrectiva: '',
      fechaCorrectiva: '',
      responsableSeguimiento: ''
    };
  }

  private getUltimaBitacora(item: HallazgoItem): BitacoraHallazgo | null {
    const bitacoras = Array.isArray(item.bitacoras) ? item.bitacoras : [];
    if (!bitacoras.length) {
      return null;
    }

    let ultima = bitacoras[0];
    for (let i = 1; i < bitacoras.length; i++) {
      if ((bitacoras[i].fechaRegistro || '') > (ultima.fechaRegistro || '')) {
        ultima = bitacoras[i];
      }
    }
    return ultima;
  }

  private componerResponsableFecha(responsable?: string, fecha?: string): string {
    const r = (responsable || '').trim();
    const f = this.formatearFechaTexto((fecha || '').trim());
    if (r && f) { return r + ' - ' + f; }
    if (r) { return r; }
    if (f) { return f; }
    return '';
  }

  private getClaveBitacora(item: HallazgoItem, registro: BitacoraHallazgo, index: number): string {
    const idHallazgo = item && item.id ? item.id : 'sin-hallazgo';
    const idRegistro = registro && registro.id ? registro.id : 'idx-' + index;
    return idHallazgo + '__' + idRegistro;
  }

  private formatearFechaVisual(fecha: Date): string {
    const dia = ('0' + fecha.getDate()).slice(-2);
    const mes = ('0' + (fecha.getMonth() + 1)).slice(-2);
    const anio = fecha.getFullYear();
    return dia + '-' + mes + '-' + anio;
  }

  private formatearFechaTexto(texto: string): string {
    if (!texto) {
      return '';
    }

    const soloFecha = texto.split('T')[0];
    const partes = soloFecha.split('-');
    if (partes.length === 3 && partes[0].length === 4) {
      return partes[2] + '-' + partes[1] + '-' + partes[0];
    }
    return texto;
  }
}