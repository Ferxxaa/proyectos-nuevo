import { Component, OnInit } from '@angular/core';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { sMis_Proyectos } from '../../services/sMis_Proyectos.service';
import { sUsuarioClienteProyecto } from '../../services/sUsuarioClienteProyecto.service';
import { sSubProyecto } from '../../services/sSubProyecto.service';

/**
 * CORE > Control Asistencia.
 * Página con el selector de subproyecto y el Control de asistencia diario
 * (antes era Reportes > Estadísticas HH). Las estadísticas mensuales de HH
 * están en Tablero de Control > Estadísticas SSO/MA/INCS > Seguridad.
 */
@Component({
  selector: 'app-control-asistencia-page',
  templateUrl: './control-asistencia-page.component.html',
  styleUrls: ['./control-asistencia-page.component.css'],
  providers: [sMis_Proyectos, sUsuarioClienteProyecto]
})
export class ControlAsistenciaPageComponent implements OnInit {

  subProyectos: any[] = [];
  subProyectosFiltrados: any[] = [];
  subProyecto: any = null;
  idSubProyectoSeleccionado: any = '';
  busqueda: string = '';
  listaAbierta: boolean = false;
  indiceActivo: number = -1;
  soloLectura: boolean = true;
  cargandoPermisos: boolean = true;
  cargandoSubProyectos: boolean = true;
  cargandoSeleccion: boolean = false;
  errorCarga: boolean = false;
  errorSeleccion: boolean = false;

  private solicitudSeleccion: number = 0;

  constructor(
    private _sUsuariosPerfiles: sUsuariosPerfiles,
    private _sMisProyectos: sMis_Proyectos,
    private _sUsuarioClienteProyecto: sUsuarioClienteProyecto,
    private _sSubProyecto: sSubProyecto
  ) {}

  ngOnInit() {
    let usuario: any;
    try {
      usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch (error) {
      console.error('No se pudo leer el usuario actual:', error);
      this.cargandoPermisos = false;
      this.cargandoSubProyectos = false;
      this.errorCarga = true;
      return;
    }

    if (!usuario.idUsuario) {
      this.cargandoPermisos = false;
      this.cargandoSubProyectos = false;
      this.errorCarga = true;
      return;
    }

    this._sUsuariosPerfiles.getUsuariosPerfilesbyidUsuario(Number(usuario.idUsuario)).subscribe(
      (perfiles: any[]) => {
        const perfilesUsuario = Array.isArray(perfiles) ? perfiles : [];
        this.soloLectura = perfilesUsuario.some(perfil =>
          perfil.idPerfil == 5 || perfil.idPerfil === 'Clientes'
        );
        this.cargandoPermisos = false;
        this.cargarSubProyectos(usuario.idUsuario, perfilesUsuario);
      },
      error => {
        console.error('Error al verificar permisos de Control Asistencia:', error);
        this.soloLectura = true;
        this.cargandoPermisos = false;
        this.cargandoSubProyectos = false;
        this.errorCarga = true;
      }
    );
  }

  seleccionarSubProyecto(idSubProyecto: any) {
    const solicitud = ++this.solicitudSeleccion;
    this.errorSeleccion = false;
    this.subProyecto = null;

    if (idSubProyecto === '' || idSubProyecto === null || idSubProyecto === undefined) {
      this.cargandoSeleccion = false;
      return;
    }

    this.cargandoSeleccion = true;

    this._sSubProyecto.getSubProyectobyID(Number(idSubProyecto)).subscribe(
      (subProyecto: any) => {
        // Si el usuario ya eligió otro subproyecto, se ignora esta respuesta.
        if (solicitud !== this.solicitudSeleccion) {
          return;
        }

        if (!subProyecto || !subProyecto.idSubProyecto) {
          console.error('La respuesta no contiene el subproyecto seleccionado:', subProyecto);
          this.errorSeleccion = true;
          this.cargandoSeleccion = false;
          return;
        }

        this.subProyecto = subProyecto;
        localStorage.setItem('SubProyecto', JSON.stringify(subProyecto));
        this.cargandoSeleccion = false;
      },
      error => {
        if (solicitud !== this.solicitudSeleccion) {
          return;
        }

        console.error('Error al cargar el subproyecto seleccionado:', error);
        this.errorSeleccion = true;
        this.cargandoSeleccion = false;
      }
    );
  }

  abrirLista() {
    if (this.listaAbierta) {
      return;
    }

    this.listaAbierta = true;
    this.subProyectosFiltrados = this.subProyectos;
    this.indiceActivo = this.subProyectos.findIndex(opcion => this.esSeleccionado(opcion));
    this.mostrarOpcionActiva();
  }

  cerrarLista() {
    this.listaAbierta = false;
    this.indiceActivo = -1;
    this.busqueda = this.obtenerEtiquetaSeleccionada();
  }

  filtrarSubProyectos(texto: string) {
    this.busqueda = texto;
    this.listaAbierta = true;

    const terminos = this.normalizarTexto(texto).split(/\s+/).filter(termino => !!termino);
    this.subProyectosFiltrados = this.subProyectos.filter(opcion => {
      const etiqueta = this.normalizarTexto(this.obtenerEtiqueta(opcion));
      return terminos.every(termino => etiqueta.indexOf(termino) !== -1);
    });
    this.indiceActivo = this.subProyectosFiltrados.length ? 0 : -1;
    this.mostrarOpcionActiva();
  }

  manejarTeclado(evento: KeyboardEvent) {
    switch (evento.key) {
      case 'ArrowDown':
      case 'Down':
        evento.preventDefault();
        this.moverOpcionActiva(1);
        break;
      case 'ArrowUp':
      case 'Up':
        evento.preventDefault();
        this.moverOpcionActiva(-1);
        break;
      case 'Enter':
        if (this.listaAbierta && this.subProyectosFiltrados[this.indiceActivo]) {
          evento.preventDefault();
          this.elegirSubProyecto(this.subProyectosFiltrados[this.indiceActivo]);
        }
        break;
      case 'Escape':
      case 'Esc':
        if (this.listaAbierta) {
          evento.preventDefault();
          this.cerrarLista();
        }
        break;
    }
  }

  elegirSubProyecto(opcion: any) {
    const yaCargado = this.esSeleccionado(opcion) && (this.subProyecto || this.cargandoSeleccion);
    this.idSubProyectoSeleccionado = opcion.idSubProyecto;
    this.cerrarLista();

    if (!yaCargado) {
      this.seleccionarSubProyecto(opcion.idSubProyecto);
    }
  }

  limpiarSeleccion() {
    this.idSubProyectoSeleccionado = '';
    this.busqueda = '';
    this.subProyectosFiltrados = this.subProyectos;
    this.indiceActivo = -1;
    this.seleccionarSubProyecto('');
  }

  esSeleccionado(opcion: any): boolean {
    return String(opcion.idSubProyecto) === String(this.idSubProyectoSeleccionado);
  }

  identificarSubProyecto(indice: number, opcion: any) {
    return opcion.idSubProyecto;
  }

  private cargarSubProyectos(idUsuario: number, perfiles: any[]) {
    const esCliente = this.soloLectura;
    const esAdministradorProyectos = perfiles.some(perfil =>
      perfil.idPerfil == 1 || perfil.idPerfil == 9
    );

    if (esCliente) {
      this._sUsuarioClienteProyecto.getUsuarioClienteProyectobyidUsuarioCliente(Number(idUsuario)).subscribe(
        (asignaciones: any[]) => {
          const proyectos = Array.isArray(asignaciones) ? asignaciones : [];
          if (!proyectos.length) {
            this.finalizarCarga([]);
            return;
          }

          Promise.all(proyectos.map(asignacion =>
            this._sMisProyectos.getMis_ProyectosbyidProyecto(asignacion.idProyecto).toPromise()
          )).then(resultados => {
            this.finalizarCarga([].concat.apply([], resultados || []));
          }).catch(error => {
            console.error('Error al cargar los subproyectos asignados al cliente:', error);
            this.errorCarga = true;
            this.cargandoSubProyectos = false;
          });
        },
        error => {
          console.error('Error al cargar proyectos asignados al cliente:', error);
          this.errorCarga = true;
          this.cargandoSubProyectos = false;
        }
      );
      return;
    }

    const solicitud = esAdministradorProyectos
      ? this._sMisProyectos.getMis_Proyectos()
      : this._sMisProyectos.getMis_ProyectosbyidUsuarioCoordinador(Number(idUsuario));

    solicitud.subscribe(
      (subProyectos: any[]) => this.finalizarCarga(Array.isArray(subProyectos) ? subProyectos : []),
      error => {
        console.error('Error al cargar subproyectos disponibles para Control Asistencia:', error);
        this.errorCarga = true;
        this.cargandoSubProyectos = false;
      }
    );
  }

  private finalizarCarga(subProyectos: any[]) {
    const unicos: { [id: string]: any } = {};
    subProyectos.forEach(subProyecto => {
      if (subProyecto && subProyecto.idSubProyecto !== null && subProyecto.idSubProyecto !== undefined) {
        unicos[String(subProyecto.idSubProyecto)] = subProyecto;
      }
    });
    this.subProyectos = Object.keys(unicos).map(id => unicos[id]).sort((a, b) =>
      (a.nombreSubProyecto || '').localeCompare(b.nombreSubProyecto || '', 'es', { sensitivity: 'base' }) ||
      (a.nombreProyecto || '').localeCompare(b.nombreProyecto || '', 'es', { sensitivity: 'base' })
    );
    this.subProyectosFiltrados = this.subProyectos;
    this.cargandoSubProyectos = false;

    let seleccionado: any = null;
    try {
      seleccionado = JSON.parse(localStorage.getItem('SubProyecto') || 'null');
    } catch (error) {
      console.error('No se pudo leer el subproyecto guardado:', error);
    }

    if (seleccionado && this.subProyectos.some(item =>
      String(item.idSubProyecto) === String(seleccionado.idSubProyecto)
    )) {
      this.idSubProyectoSeleccionado = seleccionado.idSubProyecto;
      this.busqueda = this.obtenerEtiquetaSeleccionada();
      this.seleccionarSubProyecto(seleccionado.idSubProyecto);
    } else {
      this.idSubProyectoSeleccionado = '';
      this.busqueda = '';
      this.subProyecto = null;
    }
  }

  private moverOpcionActiva(direccion: number) {
    if (!this.listaAbierta) {
      this.abrirLista();
      return;
    }

    const total = this.subProyectosFiltrados.length;
    if (!total) {
      return;
    }

    if (this.indiceActivo < 0) {
      this.indiceActivo = direccion > 0 ? 0 : total - 1;
    } else {
      this.indiceActivo = (this.indiceActivo + direccion + total) % total;
    }
    this.mostrarOpcionActiva();
  }

  private mostrarOpcionActiva() {
    setTimeout(() => {
      const opcion = document.getElementById('ehh-opcion-' + this.indiceActivo);
      if (opcion) {
        opcion.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  private obtenerEtiquetaSeleccionada(): string {
    const seleccionado = this.subProyectos.filter(opcion => this.esSeleccionado(opcion))[0];
    return seleccionado ? this.obtenerEtiqueta(seleccionado) : '';
  }

  private obtenerEtiqueta(opcion: any): string {
    return [opcion.nombreSubProyecto, opcion.nombreProyecto].filter(texto => !!texto).join(' — ');
  }

  private normalizarTexto(texto: any): string {
    return (String(texto || '') as any).normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}