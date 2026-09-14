import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { sProyecto } from '../../services/sProyecto.service';
import { sVis_SubProyNoValidado } from '../../services/sVis_SubProyNoValidado.service';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { mProyecto } from '../../models/mProyecto';
import { firestoreDB, storageRef } from '../../firebase-init';

declare var Swal: any;

interface HallazgoItem {
  id?: string;
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

@Component({
  selector: 'app-control-hallazgos',
  templateUrl: './control-hallazgos.component.html',
  styleUrls: ['./control-hallazgos.component.css'],
  providers: [sProyecto, sVis_SubProyNoValidado, sUsuariosPerfiles]
})
export class ControlHallazgosComponent implements OnInit, OnDestroy {
  @Input() idProyecto: number | null = null;
  @Input() nombreProyecto: string = '';
  @Input() soloLectura: boolean = false;

  usuario: any;
  proyecto: mProyecto | null = null;
  puedeEliminarHallazgo: boolean = false;
  subProyectoActual: any = null;
  directorSubProyectoId: number | null = null;
  coordinadorTienePermisoEliminar: boolean = false;
  esGerencia: boolean = false;

  tiposAccion: string[] = [
    'Flash Report',
    'Refuerzo Positivo',
    'Oportunidad de Mejora',
    'Observación',
    'Stop Work',
    'No Conformidad',
    'Leccion aprendida'
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

  private unsubscribeHallazgos: (() => void) | null = null;
  private unsubscribePermisoCoordinador: (() => void) | null = null;

  constructor(
    private _sProyecto: sProyecto,
    private _sVisSubProyNoValidado: sVis_SubProyNoValidado,
    private _sUsuariosPerfiles: sUsuariosPerfiles
  ) {
    const subProyecto = JSON.parse(localStorage.getItem('SubProyecto') || 'null');
    this.subProyectoActual = subProyecto;
    this.nombreProyectoLocal = subProyecto && subProyecto.nombreSubProyecto ? subProyecto.nombreSubProyecto : '';
    this.nuevoHallazgo = this.crearNuevoHallazgo();
  }

  get nombreProyectoVisible(): string {
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

    const datosAGuardar = { ...this.nuevoHallazgo };
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
    if (!this.puedeEliminarHallazgo) {
      Swal.fire('Acceso denegado', this.getMensajePermisoEliminacion(), 'warning');
      return;
    }

    if (!item || !item.id) {
      return;
    }

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
    if (this.soloLectura || !item.id || this.hallazgoEnEdicionId !== item.id) {
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
    this.modalBitacoraAbierto = false;
    this.hallazgoModalSeleccionado = null;
    this.registroEnEdicionId = null;
    this.archivosNuevaBitacora = [];
  }

  editarHallazgo(item: HallazgoItem) {
    if (this.soloLectura || !item.id || this.hallazgoEnEdicionId) {
      return;
    }

    this.hallazgoEnEdicionId = item.id;
    this.hallazgoOriginalEnEdicion = {
      ...item,
      archivos: (item.archivos || []).slice(),
      bitacoras: item.bitacoras ? item.bitacoras.slice() : []
    };
  }

  guardarEdicionHallazgo() {
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

  getPrioridadLabel(prioridad: PrioridadSemaforoHallazgo | 'todas'): string {
    if (prioridad === 'alta') { return 'Alta'; }
    if (prioridad === 'media') { return 'Media'; }
    if (prioridad === 'baja') { return 'Baja'; }
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
    if (!files || files.length === 0 || !item.id) {
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
    if (this.soloLectura) {
      return;
    }

    this.nuevaBitacoraForm.prioridad = prioridad;
  }

  getPrioridadActualHallazgo(item: HallazgoItem): string {
    const ultima = this.getUltimaBitacora(item);
    return (ultima && ultima.prioridad) ? ultima.prioridad : (item.prioridad || 'MEDIA');
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
    if (this.soloLectura || !item || !item.id) {
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
    if (this.soloLectura) {
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
    if (this.soloLectura || !item || !item.id) {
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
    if (this.soloLectura || !item || !item.id) {
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
    if (this.soloLectura || !item || !item.id) {
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

    const idUsuarioActual = Number(this.usuario.idUsuario);
    const idUsuarioCreadorSubProyecto = Number(this.subProyectoActual && this.subProyectoActual.idUsuarioCreador);
    return idUsuarioActual > 0 && (
      idUsuarioActual === idUsuarioCreadorSubProyecto ||
      this.esGerencia
    );
  }

  esCoordinadorSubProyecto(): boolean {
    if (!this.usuario || !this.usuario.idUsuario || !this.subProyectoActual) {
      return false;
    }

    return Number(this.subProyectoActual.idUsuarioCoordinador) === Number(this.usuario.idUsuario);
  }

  getMensajePermisoEliminacion(): string {
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
    return this.subProyectoActual && this.subProyectoActual.idSubProyecto
      ? String(this.subProyectoActual.idSubProyecto)
      : 'sin-subproyecto';
  }

  private getIdConfigHallazgos(): string {
    return this.subProyectoActual && this.subProyectoActual.idSubProyecto
      ? String(this.subProyectoActual.idSubProyecto)
      : 'sin-subproyecto';
  }

  private cargarDatosIniciales() {
    const idSubProyecto = this.getIdSubProyectoActual();

    if (this.unsubscribeHallazgos) {
      this.unsubscribeHallazgos();
    }

    this.unsubscribeHallazgos = firestoreDB.collection('hallazgos')
      .where('idSubProyecto', '==', idSubProyecto)
      .onSnapshot((snapshot: any) => {
        const items: HallazgoItem[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data() || {};
          items.push({
            id: doc.id,
            ...data,
            prioridad: data.prioridad || 'MEDIA',
            archivos: Array.isArray(data.archivos) ? data.archivos : [],
            bitacoras: Array.isArray(data.bitacoras) ? data.bitacoras : []
          } as HallazgoItem);
        });
        items.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        items.forEach((item, index) => {
          item.numero = items.length - index;
        });
        this.hallazgos = items;

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
        this.actualizarPermisoEliminacion();
      },
      () => {
        this.esGerencia = false;
        this.actualizarPermisoEliminacion();
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