import { Component, OnDestroy, OnInit } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Router } from '@angular/router';
import { firestoreDB, storageRef } from '../../firebase-init';
import { sUsuario } from '../../services/sUsuario.service';
import { sVis_UsuarioPersona } from '../../services/sVis_UsuarioPersona.service';

declare var Swal: any;

interface TareaOficina {
  id?: string;
  ambito?: string;
  idSubProyecto?: string;
  tipoRegistro?: string;
  titulo: string;
  descripcion: string;
  responsable?: string;
  idUsuarioResponsable: number;
  responsableNombre: string;
  idUsuarioCC: number;
  ccNombre: string;
  area: string;
  fechaCompromiso: string;
  estado: string;
  prioridad: string;
  idUsuarioCreador: number;
  creador: string;
  fechaCreacion: string;
}

interface ResponsableOficina {
  idUsuario: number;
  nombre: string;
  paterno: string;
  materno?: string;
}

interface BitacoraOficina {
  id?: string;
  ambito?: string;
  idSubProyecto?: string;
  tipoRegistro?: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  idUsuarioCreador: number;
  autor: string;
  fechaCreacion: string;
  archivos?: ArchivoOficina[];
}

interface ArchivoOficina {
  nombre: string;
  url: string;
  path: string;
  fechaSubida: string;
}

type PestanaOperacional = 'hallazgos' | 'tareas' | 'bitacoras';

const ID_SUBPROYECTO_OFICINA = 'oficina-operacional';
const TIPO_REGISTRO_TAREA = 'tarea-oficina';
const TIPO_REGISTRO_BITACORA = 'bitacora-oficina';

@Component({
  selector: 'app-hallazgo-operacional',
  templateUrl: './hallazgo-operacional.component.html',
  styleUrls: ['./hallazgo-operacional.component.css'],
  providers: [sUsuario, sVis_UsuarioPersona]
})
export class HallazgoOperacionalComponent implements OnInit, OnDestroy {
  pestanaActiva: PestanaOperacional = 'hallazgos';
  tareas: TareaOficina[] = [];
  bitacoras: BitacoraOficina[] = [];
  usuario: any;
  responsables: ResponsableOficina[] = [];
  areas: Array<{ id: string; nombre: string }> = [
    { id: 'Administracion', nombre: 'Administración' },
    { id: 'SGI', nombre: 'SGI' },
    { id: 'SSO_MA', nombre: 'SSO-MA' },
    { id: 'Estudio', nombre: 'Estudio' },
    { id: 'Comercial', nombre: 'Comercial' },
    { id: 'Gerencia', nombre: 'Gerencia' },
    { id: 'Construccion', nombre: 'Construcción' },
    { id: 'Arquitectura', nombre: 'Arquitectura' }
  ];
  cargandoResponsables: boolean = false;
  guardandoTarea: boolean = false;
  guardandoBitacora: boolean = false;
  archivosBitacora: File[] = [];
  tareaNueva: TareaOficina;
  bitacoraNueva: BitacoraOficina;

  private unsubscribeTareas: (() => void) | null = null;
  private unsubscribeBitacoras: (() => void) | null = null;
  private readonly urlPerfiles = 'http://trazas-nbi.com:1234/api/UsuariosPerfiles/GetUsuariosPerfilesByIdUsuario/IdUsuario=';

  constructor(
    private http: Http,
    private router: Router,
    private sUsuario: sUsuario,
    private sVisUsuarioPersona: sVis_UsuarioPersona
  ) {
    this.usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
    this.tareaNueva = this.crearTareaNueva();
    this.bitacoraNueva = this.crearBitacoraNueva();
  }

  ngOnInit() {
    if (!this.usuario || !this.usuario.idUsuario) {
      this.router.navigate(['/Login']);
      return;
    }

    this.http.get(this.urlPerfiles + this.usuario.idUsuario)
      .map((response: Response) => response.json())
      .subscribe((perfiles: any[]) => {
        const esCliente = Array.isArray(perfiles) && perfiles.some((perfil: any) =>
          perfil.idPerfil == 5 || perfil.idPerfil == 'Clientes'
        );
        if (esCliente) {
          Swal.fire('Acceso restringido', 'Esta sección está disponible solo para usuarios de oficina.', 'warning');
          this.router.navigate(['/Home']);
          return;
        }

        this.cargarResponsables();
        this.cargarTareas();
        this.cargarBitacoras();
      }, (error: any) => {
        console.error('No se pudieron validar los permisos para hallazgos operacionales:', error);
        Swal.fire('Error', 'No se pudieron validar tus permisos. Intenta nuevamente.', 'error');
        this.router.navigate(['/Home']);
      });
  }

  ngOnDestroy() {
    if (this.unsubscribeTareas) {
      this.unsubscribeTareas();
      this.unsubscribeTareas = null;
    }
    if (this.unsubscribeBitacoras) {
      this.unsubscribeBitacoras();
      this.unsubscribeBitacoras = null;
    }
  }

  seleccionarPestana(pestana: PestanaOperacional) {
    this.pestanaActiva = pestana;
  }

  agregarTarea() {
    if (!this.tareaNueva.titulo.trim() || !this.tareaNueva.idUsuarioResponsable ||
        !this.tareaNueva.area || !this.tareaNueva.prioridad || this.guardandoTarea) {
      return;
    }

    const responsable = this.responsables.find((persona: ResponsableOficina) =>
      Number(persona.idUsuario) === Number(this.tareaNueva.idUsuarioResponsable)
    );
    if (!responsable) {
      Swal.fire('Responsable no válido', 'Selecciona un responsable activo para la tarea.', 'warning');
      return;
    }
    const usuarioCC = this.responsables.find((persona: ResponsableOficina) =>
      Number(persona.idUsuario) === Number(this.tareaNueva.idUsuarioCC)
    );

    const tarea: TareaOficina = {
      ambito: 'oficina',
      idSubProyecto: ID_SUBPROYECTO_OFICINA,
      tipoRegistro: TIPO_REGISTRO_TAREA,
      titulo: this.tareaNueva.titulo.trim(),
      descripcion: this.tareaNueva.descripcion.trim(),
      idUsuarioResponsable: Number(responsable.idUsuario),
      responsableNombre: this.nombreResponsable(responsable),
      idUsuarioCC: usuarioCC ? Number(usuarioCC.idUsuario) : 0,
      ccNombre: usuarioCC ? this.nombreResponsable(usuarioCC) : '',
      area: this.tareaNueva.area,
      fechaCompromiso: this.tareaNueva.fechaCompromiso,
      estado: this.tareaNueva.estado,
      prioridad: this.tareaNueva.prioridad,
      idUsuarioCreador: Number(this.usuario && this.usuario.idUsuario),
      creador: this.nombreUsuario(),
      fechaCreacion: new Date().toISOString()
    } as TareaOficina;

    this.guardandoTarea = true;
    firestoreDB.collection('hallazgos').add(tarea)
      .then(() => {
        this.tareaNueva = this.crearTareaNueva();
        Swal.fire('Tarea guardada', 'La tarea de oficina se creó correctamente.', 'success');
      })
      .catch((error: any) => {
        console.error('Error al guardar la tarea operacional:', error);
        Swal.fire('Error', 'No se pudo guardar la tarea: ' + error.message, 'error');
      })
      .then(() => {
        this.guardandoTarea = false;
      });
  }

  cambiarEstadoTarea(tarea: TareaOficina, estado: string) {
    if (!tarea.id || tarea.estado === estado) {
      return;
    }

    firestoreDB.collection('hallazgos').doc(tarea.id)
      .update({ estado: estado })
      .catch((error: any) => {
        console.error('Error al actualizar la tarea operacional:', error);
        Swal.fire('Error', 'No se pudo actualizar el estado: ' + error.message, 'error');
      });
  }

  eliminarTarea(tarea: TareaOficina) {
    if (!this.puedeEliminarTarea(tarea)) {
      Swal.fire('Acceso denegado', 'Solo quien creó la tarea puede eliminarla.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Eliminar tarea',
      text: '¿Quieres eliminar esta tarea de oficina?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (result.value) {
        firestoreDB.collection('hallazgos').doc(tarea.id).delete()
          .catch((error: any) => {
            console.error('Error al eliminar la tarea operacional:', error);
            Swal.fire('Error', 'No se pudo eliminar la tarea: ' + error.message, 'error');
          });
      }
    });
  }

  puedeEliminarTarea(tarea: TareaOficina): boolean {
    return Number(tarea.idUsuarioCreador) === Number(this.usuario && this.usuario.idUsuario);
  }

  agregarBitacora() {
    if (!this.bitacoraNueva.titulo.trim() || !this.bitacoraNueva.descripcion.trim() || this.guardandoBitacora) {
      return;
    }

    const registro: BitacoraOficina = {
      ambito: 'oficina',
      idSubProyecto: ID_SUBPROYECTO_OFICINA,
      tipoRegistro: TIPO_REGISTRO_BITACORA,
      titulo: this.bitacoraNueva.titulo.trim(),
      descripcion: this.bitacoraNueva.descripcion.trim(),
      fecha: this.bitacoraNueva.fecha,
      idUsuarioCreador: Number(this.usuario && this.usuario.idUsuario),
      autor: this.nombreUsuario(),
      fechaCreacion: new Date().toISOString()
    } as BitacoraOficina;

    const archivosSubidos: ArchivoOficina[] = [];
    this.guardandoBitacora = true;
    this.subirArchivosBitacora(this.archivosBitacora)
      .then((archivos: ArchivoOficina[]) => {
        archivosSubidos.push.apply(archivosSubidos, archivos);
        return firestoreDB.collection('hallazgos').add({
          ...registro,
          archivos: archivos
        }).then(() => archivos);
      })
      .then((archivos: ArchivoOficina[]) => {
        this.bitacoraNueva = this.crearBitacoraNueva();
        this.archivosBitacora = [];
        Swal.fire('Registro guardado', 'La entrada de bitácora se creó correctamente.', 'success');
        return archivos;
      })
      .catch((error: any) => {
        console.error('Error al guardar la bitácora operacional:', error);
        return Promise.all(archivosSubidos.map((archivo: ArchivoOficina) =>
          storageRef.ref(archivo.path).delete().catch((cleanupError: any) => {
            console.error('No se pudo limpiar un adjunto de bitácora tras fallar el registro:', archivo.path, cleanupError);
          })
        )).then(() => {
          Swal.fire('Error', 'No se pudo guardar la entrada: ' + error.message, 'error');
        });
      })
      .then(() => {
        this.guardandoBitacora = false;
      });
  }

  eliminarBitacora(registro: BitacoraOficina) {
    if (!this.puedeEliminarBitacora(registro)) {
      Swal.fire('Acceso denegado', 'Solo quien creó la entrada puede eliminarla.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Eliminar entrada',
      text: '¿Quieres eliminar esta entrada de bitácora?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result: any) => {
      if (result.value) {
        firestoreDB.collection('hallazgos').doc(registro.id).delete()
          .then(() => {
            const archivos = Array.isArray(registro.archivos) ? registro.archivos : [];
            return Promise.all(archivos.map((archivo: ArchivoOficina) =>
              storageRef.ref(archivo.path).delete().then(() => null).catch((error: any) => {
                console.error('No se pudo eliminar el adjunto de bitácora:', archivo.path, error);
                return archivo.nombre;
              })
            ));
          })
          .then((fallidos: string[]) => {
            const nombresFallidos = fallidos.filter((nombre: string) => !!nombre);
            if (nombresFallidos.length) {
              Swal.fire('Entrada eliminada', 'No se pudieron eliminar estos adjuntos: ' + nombresFallidos.join(', '), 'warning');
            }
          })
          .catch((error: any) => {
            console.error('Error al eliminar la bitácora operacional:', error);
            Swal.fire('Error', 'No se pudo eliminar la entrada: ' + error.message, 'error');
          });
      }
    });
  }

  puedeEliminarBitacora(registro: BitacoraOficina): boolean {
    return Number(registro.idUsuarioCreador) === Number(this.usuario && this.usuario.idUsuario);
  }

  onArchivosBitacoraSeleccionados(event: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const permitidas = ['pdf', 'xls', 'xlsx', 'doc', 'docx', 'ppt', 'pptx', 'csv', 'txt', 'jpg', 'jpeg', 'png'];
    const rechazadas: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const archivo = files[i];
      const extension = archivo.name.split('.').pop().toLowerCase();
      if (permitidas.indexOf(extension) === -1) {
        rechazadas.push(archivo.name);
      } else {
        this.archivosBitacora.push(archivo);
      }
    }
    event.target.value = '';

    if (rechazadas.length) {
      Swal.fire('Formato no permitido', 'No se adjuntaron: ' + rechazadas.join(', '), 'warning');
    }
  }

  quitarArchivoBitacora(index: number) {
    this.archivosBitacora.splice(index, 1);
  }

  getIconoArchivo(nombre: string): string {
    const extension = (nombre.split('.').pop() || '').toLowerCase();
    if (extension === 'pdf') { return 'fa-file-pdf-o'; }
    if (['xls', 'xlsx', 'csv'].indexOf(extension) !== -1) { return 'fa-file-excel-o'; }
    if (['doc', 'docx'].indexOf(extension) !== -1) { return 'fa-file-word-o'; }
    if (['ppt', 'pptx'].indexOf(extension) !== -1) { return 'fa-file-powerpoint-o'; }
    if (['jpg', 'jpeg', 'png'].indexOf(extension) !== -1) { return 'fa-file-image-o'; }
    return 'fa-file-text-o';
  }

  private subirArchivosBitacora(archivos: File[]): Promise<ArchivoOficina[]> {
    const subidos: ArchivoOficina[] = [];
    let subida = Promise.resolve();

    archivos.forEach((archivo: File, index: number) => {
      subida = subida.then(() => {
        const ruta = 'controlHallazgos/' + ID_SUBPROYECTO_OFICINA + '/bitacoras/' +
          Date.now() + '_' + index + '_' + archivo.name;
        const referencia = storageRef.ref(ruta);
        return referencia.put(archivo)
          .then(() => referencia.getDownloadURL())
          .then((url: string) => {
            subidos.push({
              nombre: archivo.name,
              url: url,
              path: ruta,
              fechaSubida: new Date().toISOString()
            });
          });
      });
    });

    return subida.then(() => subidos).catch((error: any) => {
      return Promise.all(subidos.map((archivo: ArchivoOficina) =>
        storageRef.ref(archivo.path).delete().catch((cleanupError: any) => {
          console.error('No se pudo limpiar un adjunto de bitácora tras fallar la carga:', archivo.path, cleanupError);
        })
      )).then(() => {
        throw error;
      });
    });
  }

  private cargarTareas() {
    this.unsubscribeTareas = firestoreDB.collection('hallazgos')
      .where('ambito', '==', 'oficina')
      .onSnapshot((snapshot: any) => {
        const tareas: TareaOficina[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data() || {};
          if (data.tipoRegistro === TIPO_REGISTRO_TAREA) {
            tareas.push({ id: doc.id, ...data } as TareaOficina);
          }
        });
        this.tareas = tareas.sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''));
      }, (error: any) => {
        console.error('Error al cargar las tareas operacionales:', error);
        Swal.fire('Error', 'No se pudieron cargar las tareas de oficina: ' + error.message, 'error');
      });
  }

  private cargarResponsables() {
    this.cargandoResponsables = true;
    this.sUsuario.getUsuariobyactivo(true).subscribe((usuarios: any[]) => {
      this.sVisUsuarioPersona.getVis_UsuarioPersona().subscribe((personas: any[]) => {
        const idsActivos = (usuarios || []).map((usuario: any) => Number(usuario.idUsuario));
        this.responsables = (personas || [])
          .filter((persona: any) => idsActivos.indexOf(Number(persona.idUsuario)) !== -1)
          .sort((a: any, b: any) => this.nombreResponsable(a).localeCompare(this.nombreResponsable(b)));
        this.cargandoResponsables = false;
      }, (error: any) => {
        this.cargandoResponsables = false;
        console.error('Error al cargar los nombres de usuarios responsables:', error);
        Swal.fire('Error', 'No se pudieron cargar los responsables de las tareas.', 'error');
      });
    }, (error: any) => {
      this.cargandoResponsables = false;
      console.error('Error al cargar los usuarios activos para tareas:', error);
      Swal.fire('Error', 'No se pudieron cargar los usuarios activos para asignar tareas.', 'error');
    });
  }

  private nombreResponsable(persona: any): string {
    return [persona && persona.nombre, persona && persona.paterno, persona && persona.materno]
      .filter((parte: string) => !!parte)
      .join(' ');
  }

  private cargarBitacoras() {
    this.unsubscribeBitacoras = firestoreDB.collection('hallazgos')
      .where('ambito', '==', 'oficina')
      .onSnapshot((snapshot: any) => {
        const bitacoras: BitacoraOficina[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data() || {};
          if (data.tipoRegistro === TIPO_REGISTRO_BITACORA) {
            bitacoras.push({ id: doc.id, ...data } as BitacoraOficina);
          }
        });
        this.bitacoras = bitacoras.sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''));
      }, (error: any) => {
        console.error('Error al cargar las bitácoras operacionales:', error);
        Swal.fire('Error', 'No se pudieron cargar las bitácoras de oficina: ' + error.message, 'error');
      });
  }

  private crearTareaNueva(): TareaOficina {
    return {
      titulo: '',
      descripcion: '',
      idUsuarioResponsable: 0,
      responsableNombre: '',
      idUsuarioCC: 0,
      ccNombre: '',
      area: '',
      fechaCompromiso: '',
      estado: 'Pendiente',
      prioridad: 'Media',
      idUsuarioCreador: 0,
      creador: '',
      fechaCreacion: ''
    };
  }

  private crearBitacoraNueva(): BitacoraOficina {
    return {
      titulo: '',
      descripcion: '',
      fecha: this.fechaActual(),
      idUsuarioCreador: 0,
      autor: '',
      fechaCreacion: ''
    };
  }

  private fechaActual(): string {
    const hoy = new Date();
    return hoy.getFullYear() + '-' + ('0' + (hoy.getMonth() + 1)).slice(-2) + '-' + ('0' + hoy.getDate()).slice(-2);
  }

  private nombreUsuario(): string {
    if (!this.usuario) {
      return '';
    }
    return [this.usuario.nombre, this.usuario.paterno, this.usuario.materno]
      .filter((parte: string) => !!parte)
      .join(' ');
  }
}
