import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';

//Share
import { PopUps } from '../../Share/PopUps';
import { Comunes } from '../../Share/Comunes';

//Modelo
import { mPais } from '../../models/mPais';
import { mRegion } from '../../models/mRegion';
import { mProyecto } from '../../models/mProyecto';
import { mUsuarioClienteProyecto } from '../../models/mUsuarioClienteProyecto';
import { mCoordinadorProyecto } from '../../models/mCoordinadorProyecto';
import { mVis_DirectorProyectoMatriz } from '../../models/mVis_DirectorProyectoMatriz';
import { mTabla_Proyectos } from '../../models/mTabla_Proyectos';

//Servicios
import { sPais } from '../../services/sPais.service';
import { sRegion } from '../../services/sRegion.service';
import { sUsuario } from '../../services/sUsuario.service';
import { sPersona } from '../../services/sPersona.service';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { sProyecto } from '../../services/sProyecto.service';
import { sUsuarioClienteProyecto } from '../../services/sUsuarioClienteProyecto.service';
import { sCoordinadorProyecto } from '../../services/sCoordinadorProyecto.service';
import { sVis_DirectorProyectoMatriz } from '../../services/sVis_DirectorProyectoMatriz.service';
import { sTabla_Proyectos } from '../../services/sTabla_Proyectos.service';

declare var jQuery: any;
declare var $: any;
declare var Swal: any;

type ModoForm = 'crear' | 'editar';

/** Campo obligatorio que falta. */
interface CampoFaltante {
  clave: string;
  texto: string;
}

/** Copia del formulario de creación mientras se edita otro proyecto en el modal. */
interface BorradorCreacion {
  proyecto: any;
  clientesList: number[];
  coordinadoresList: number[];
  drdPais: number;
  regiones: Array<mRegion>;
  fechaInicio: string;
  fechaTermino: string;
  intentoCrear: boolean;
}

@Component({
  selector: 'app-proyecto',
  templateUrl: './proyecto.component.html',
  styleUrls: ['./proyecto.component.css'],
  providers: [
    sPais,
    sRegion,
    sUsuario,
    sPersona,
    sUsuariosPerfiles,
    sProyecto,
    PopUps,
    sUsuarioClienteProyecto,
    sCoordinadorProyecto,
    sVis_DirectorProyectoMatriz,
    sTabla_Proyectos,
    Comunes
  ]
})
export class ProyectoComponent implements OnInit, AfterViewInit, OnDestroy {

  //Select
  ProyectosMatriz: Array<mVis_DirectorProyectoMatriz> = [];
  Usuarios: Array<any> = [];   // se usa para clientes y coordinadores
  Paises: Array<mPais> = [];
  Regiones: Array<mRegion> = [];

  //Controles
  drdPais = 0;
  clientesList: number[] = [0];
  coordinadoresList: number[] = [0];
  fechaInicio = '';    // 'yyyy-mm-dd' (input type="date")
  fechaTermino = '';

  //Tabla
  dataSource: MatTableDataSource<mTabla_Proyectos>;
  filtroTabla = '';

  //Objetos
  Proyecto: mProyecto;
  usuario: any;

  //Loading
  Loading = false;
  LoadingTabla = true;

  //Indices
  IndexUpdate: number;
  IndexEliminar: number;

  //PopUp
  texto = '';
  msg = false;

  //Validación
  intentoCrear = false;    // los campos se marcan en rojo recién después del primer intento de guardar
  intentoEditar = false;
  editando = false;        // true mientras el modal de edición está abierto
  private borrador: BorradorCreacion = null;

  constructor(
    private _sPais: sPais,
    private _sRegion: sRegion,
    private _sUsuario: sUsuario,
    private _sPersona: sPersona,
    private _sUsuariosPerfiles: sUsuariosPerfiles,
    private _sProyecto: sProyecto,
    private _PopUps: PopUps,
    private _sUsuarioClienteProyecto: sUsuarioClienteProyecto,
    private _sCoordinadorProyecto: sCoordinadorProyecto,
    private _sVis_DirectorProyectoMatriz: sVis_DirectorProyectoMatriz,
    private _sTabla_Proyectos: sTabla_Proyectos,
    private _Comunes: Comunes
  ) {
    this.dataSource = new MatTableDataSource();
    this.usuario = JSON.parse(localStorage.usuario);
    this.Proyecto = this.proyectoVacio();
  }

  ngOnInit() {
    this._sVis_DirectorProyectoMatriz.getVis_DirectorProyectoMatriz().subscribe(
      result => {
        const vistos: { [id: number]: boolean } = {};
        this.ProyectosMatriz = (result || [])
          .filter(m => m.activo !== false)
          .filter(m => vistos[m.idProyectoMatriz] ? false : (vistos[m.idProyectoMatriz] = true))
          .sort((a, b) => (a.nombreProyectoMatriz || '').localeCompare(b.nombreProyectoMatriz || ''));
      }
    );

    this._sPais.getPais().subscribe(result => {
      this.Paises = result || [];
    });

    // Una sola carga de usuarios para clientes y coordinadores
    this._sUsuario.getUsuario().subscribe(usuarios => {
      (usuarios || []).forEach(usuario => {
        this._sPersona.getPersonabyID(usuario.idPersona).subscribe(persona => {
          if (!persona) { return; }
          const lista = this.Usuarios.concat([{
            idUsuario: usuario.idUsuario,
            nombre: persona.nombre,
            paterno: persona.paterno,
            materno: persona.materno
          }]);
          lista.sort((a, b) => this.nombreCompleto(a).localeCompare(this.nombreCompleto(b)));
          this.Usuarios = lista;
        });
      });
    });

    this.Reset();
    this.Recarga();
  }

  ngAfterViewInit() {
    // Si el modal se cierra con Esc o clic afuera, igual se devuelve el formulario de creación
    $('#exampleModalLong').on('hidden.bs.modal', () => this.cerrarEdicion());
  }

  ngOnDestroy() {
    $('#exampleModalLong').off('hidden.bs.modal');
  }

  private proyectoVacio(): mProyecto {
    const p = new mProyecto(null, 0, "", this.usuario.idUsuario, null, false, null, null, null, 4, 1, null, null, null, 0, true, null, null, this.usuario.idUsuario, null);
    (p as any).idProyectoMatriz = 0;
    (p as any).idRegion = 0;
    return p;
  }

  nombreCompleto(p: any): string {
    return (((p && p.nombre) || '') + ' ' + ((p && p.paterno) || '')).trim();
  }

  // *************************************************** FECHAS / UBICACIÓN ***************************************************

  onFechaInicio(valor: string) {
    this.fechaInicio = valor || '';
    this.Proyecto.fechaInicio = this.fechaInicio ? this.fechaInicio + 'T00:00:00' : null;
  }

  onFechaTermino(valor: string) {
    this.fechaTermino = valor || '';
    this.Proyecto.fechaTermino = this.fechaTermino ? this.fechaTermino + 'T00:00:00' : null;
  }

  paisChange() {
    (this.Proyecto as any).idRegion = 0;
    this.cargarRegiones();
  }

  private cargarRegiones() {
    if (!(Number(this.drdPais) > 0)) {
      this.Regiones = [];
      return;
    }
    this._sRegion.getRegionbyidPais(this.drdPais).subscribe(result => {
      this.Regiones = result || [];
    });
  }

  // *************************************************** CLIENTES / COORDINADORES ***************************************************

  AgregarCliente() { this.clientesList.push(0); }
  QuitarCliente(i: number) {
    if (this.clientesList.length > 1) { this.clientesList.splice(i, 1); } else { this.clientesList[0] = 0; }
  }

  AgregarCoordinador() { this.coordinadoresList.push(0); }
  QuitarCoordinador(i: number) {
    if (this.coordinadoresList.length > 1) { this.coordinadoresList.splice(i, 1); } else { this.coordinadoresList[0] = 0; }
  }

  /** Evita que un mismo usuario se elija dos veces en la misma lista. */
  usuarioUsado(lista: number[], idUsuario: number, indiceActual: number): boolean {
    return lista.some((id, i) => i !== indiceActual && Number(id) === Number(idUsuario));
  }

  trackIndex(i: number) { return i; }

  private obtenerSeleccionados(lista: number[]): number[] {
    const ids = (lista || []).map(v => Number(v)).filter(v => v > 0);
    return ids.filter((v, i, arr) => arr.indexOf(v) === i);
  }

  // *************************************************** VALIDACIÓN ***************************************************

  faltantes(modo: ModoForm): CampoFaltante[] {
    const lista: CampoFaltante[] = [];
    const p: any = this.Proyecto || {};

    if (!(Number(p.idProyectoMatriz) > 0)) {
      lista.push({ clave: 'matriz', texto: 'Proyecto Matriz' });
    }
    if (!p.nombreProyecto || !String(p.nombreProyecto).trim()) {
      lista.push({ clave: 'nombre', texto: 'Nombre del proyecto' });
    }
    // En la edición el país es opcional (hay proyectos antiguos sin región)
    if (modo === 'crear' && !(Number(this.drdPais) > 0)) {
      lista.push({ clave: 'pais', texto: 'País' });
    }
    if (!this.fechaInicio) {
      lista.push({ clave: 'inicio', texto: 'Fecha de inicio' });
    } else if (this.fechaTermino && this.fechaTermino < this.fechaInicio) {
      lista.push({ clave: 'termino', texto: 'Fecha de término (es anterior al inicio)' });
    }
    if (this.obtenerSeleccionados(this.coordinadoresList).length === 0) {
      lista.push({ clave: 'coordinador', texto: 'Al menos un coordinador' });
    }
    return lista;
  }

  /** ¿Marcar este campo en rojo? Solo después del primer intento de guardar. */
  falta(modo: ModoForm, clave: string): boolean {
    const intento = modo === 'crear' ? this.intentoCrear : this.intentoEditar;
    return intento && this.faltantes(modo).some(f => f.clave === clave);
  }

  /** Lleva el foco al campo que falta (clic en el chip de "Falta completar"). */
  irACampo(modo: ModoForm, clave: string) {
    const el = document.getElementById('pz-' + modo + '-' + clave) as HTMLElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => el.focus(), 250);
    }
  }

  private validarYAvisar(modo: ModoForm): boolean {
    if (modo === 'crear') { this.intentoCrear = true; } else { this.intentoEditar = true; }
    const lista = this.faltantes(modo);
    if (!lista.length) { return true; }

    const html = '<ul style="text-align:left;margin:4px 0 0 18px;padding:0;font-size:14px;line-height:1.7">'
      + lista.map(f => '<li>' + f.texto + '</li>').join('')
      + '</ul>';

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: lista.length === 1 ? 'Falta 1 dato obligatorio' : 'Faltan ' + lista.length + ' datos obligatorios',
        html: html,
        confirmButtonText: 'Completar',
        confirmButtonColor: '#026AA7'
      }).then(() => this.irACampo(modo, lista[0].clave));
    } else {
      alert('Falta completar:\n- ' + lista.map(f => f.texto).join('\n- '));
      this.irACampo(modo, lista[0].clave);
    }
    return false;
  }

  private avisarError(texto: string) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({ icon: 'error', title: 'Error', text: texto });
    }
  }

  // *************************************************** CRUD ***************************************************

  Agregar() {
    if (this.Loading) { return; }
    if (!this.validarYAvisar('crear')) { return; }

    this.texto = "";
    this.msg = false;
    this.Loading = true;
    this.Proyecto.nombreProyecto = String(this.Proyecto.nombreProyecto).trim();
    this._sProyecto.postAddProyecto(this.Proyecto).success(result => {
      this.agregarClientesSecuencial(result.idProyecto, this.obtenerSeleccionados(this.clientesList), () => {
        this.agregarCoordinadoresSecuencial(result.idProyecto, this.obtenerSeleccionados(this.coordinadoresList), () => {
          this.Recarga();
          setTimeout(() => {
            this.Reset();
            this.Loading = false;
            this.texto = "Proyecto creado de forma correcta";
            this.msg = true;
            if (typeof Swal !== 'undefined') {
              Swal.fire({ icon: 'success', title: '¡Listo!', text: 'Proyecto creado correctamente', confirmButtonColor: '#026AA7' });
            }
          }, 0);
        });
      });
    }).error(error => {
      console.log(error);
      this.Loading = false;
      this.avisarError('No se pudo crear el proyecto. Intenta nuevamente.');
    });
  }

  /** Limpia el formulario de creación. */
  Reset() {
    this.Proyecto = this.proyectoVacio();
    this.clientesList = [0];
    this.coordinadoresList = [0];
    this.drdPais = 0;
    this.Regiones = [];
    this.fechaInicio = '';
    this.fechaTermino = '';
    this.intentoCrear = false;
  }

  private Recarga() {
    this._sTabla_Proyectos.getTabla_ProyectosbyidUsuarioDirector(this.usuario.idUsuario).subscribe(result => {
      this.dataSource.data = result || [];
      this.LoadingTabla = false;
    }, error => {
      console.log(error);
      this.LoadingTabla = false;
    });
  }

  /** Proyectos filtrados por el buscador (ID, nombre, matriz, clientes o coordinadores). */
  get proyectosFiltrados(): mTabla_Proyectos[] {
    const datos: any[] = this.dataSource.data || [];
    const filtro = (this.filtroTabla || '').trim().toLowerCase();
    if (!filtro) { return datos; }
    return datos.filter(p =>
      [p.idProyecto, p.nombreProyecto, p.nombreProyectoMatriz, p.Clientes, p.Coordinadores]
        .some(v => v !== null && v !== undefined && String(v).toLowerCase().indexOf(filtro) !== -1)
    );
  }

  /** Separa "A | B | C" en una lista (para mostrar como etiquetas). */
  separar(texto: string): string[] {
    return (texto || '').split('|').map(t => t.trim()).filter(t => !!t);
  }

  private indiceReal(p: mTabla_Proyectos): number {
    return (this.dataSource.data || []).indexOf(p);
  }

  Actualizar() {
    if (this.Loading) { return; }
    if (!this.validarYAvisar('editar')) { return; }

    this.texto = "";
    this.msg = false;
    this.Loading = true;
    const idproyecto = this.Proyecto.idProyecto;
    this.Proyecto.nombreProyecto = String(this.Proyecto.nombreProyecto).trim();
    const clientes = this.obtenerSeleccionados(this.clientesList);
    const coordinadores = this.obtenerSeleccionados(this.coordinadoresList);

    this._sProyecto.postUpdDelProyecto(this.Proyecto).success(() => {
      this.desactivarClientesSecuencial(idproyecto, () => {
        this.desactivarCoordinadoresSecuencial(idproyecto, () => {
          this.agregarClientesSecuencial(idproyecto, clientes, () => {
            this.agregarCoordinadoresSecuencial(idproyecto, coordinadores, () => {
              this.Recarga();
              this.OcultarPopUpEditar();
              setTimeout(() => {
                this.Loading = false;
                this.texto = "Proyecto actualizado de forma correcta";
                this.msg = true;
                if (typeof Swal !== 'undefined') {
                  Swal.fire({ icon: 'success', title: '¡Listo!', text: 'Proyecto actualizado correctamente', confirmButtonColor: '#026AA7' });
                }
              }, 0);
            });
          });
        });
      });
    }).error(error => {
      console.log(error);
      this.Loading = false;
      this.avisarError('No se pudo actualizar el proyecto. Intenta nuevamente.');
    });
  }

  private ejecutarSecuencial(items: any[], accion: (item: any, next: () => void) => void, done: () => void) {
    const lista = items || [];
    const ejecutar = (index: number) => {
      if (index >= lista.length) {
        done();
        return;
      }
      accion(lista[index], () => ejecutar(index + 1));
    };
    ejecutar(0);
  }

  private desactivarClientesSecuencial(idProyecto: number, done: () => void) {
    this._sUsuarioClienteProyecto.getUsuarioClienteProyectobyidProyecto(idProyecto).subscribe(
      result => {
        this.ejecutarSecuencial(result || [], (element, next) => {
          element.idUsuarioRemovedor = this.usuario.idUsuario;
          this._sUsuarioClienteProyecto.postUpdDelUsuarioClienteProyecto(element)
            .success(() => next())
            .error(() => next());
        }, done);
      },
      error => { console.log(error); done(); }
    );
  }

  private desactivarCoordinadoresSecuencial(idProyecto: number, done: () => void) {
    this._sCoordinadorProyecto.getCoordinadorProyectobyidProyecto(idProyecto).subscribe(
      result => {
        this.ejecutarSecuencial(result || [], (element, next) => {
          element.idUsuarioRemovedor = this.usuario.idUsuario;
          this._sCoordinadorProyecto.postUpdDelCoordinadorProyecto(element)
            .success(() => next())
            .error(() => next());
        }, done);
      },
      error => { console.log(error); done(); }
    );
  }

  private agregarClientesSecuencial(idProyecto: number, clientes: number[], done: () => void) {
    this.ejecutarSecuencial(clientes || [], (idUsuarioCliente, next) => {
      const clienteProyecto = new mUsuarioClienteProyecto(
        null, idProyecto, idUsuarioCliente, true, null, null, this.usuario.idUsuario, null
      );
      this._sUsuarioClienteProyecto.postAddUsuarioClienteProyecto(clienteProyecto)
        .success(() => next())
        .error(() => next());
    }, done);
  }

  private agregarCoordinadoresSecuencial(idProyecto: number, coordinadores: number[], done: () => void) {
    this.ejecutarSecuencial(coordinadores || [], (idUsuarioCoordinador, next) => {
      const coordinadorProyecto = new mCoordinadorProyecto(
        null, idProyecto, idUsuarioCoordinador, true, null, null, this.usuario.idUsuario, null
      );
      this._sCoordinadorProyecto.postAddCoordinadorProyecto(coordinadorProyecto)
        .success(() => next())
        .error(() => next());
    }, done);
  }

  Eliminar() {
    const fila = this.dataSource.data[this.IndexEliminar];
    if (!fila || this.Loading) { return; }
    const idProyecto = fila.idProyecto;

    this.texto = "";
    this.msg = false;
    this.Loading = true;

    // Se elimina con el proyecto tal como está guardado (no con lo escrito en el formulario de creación)
    this._sProyecto.getProyectobyID(idProyecto).subscribe(proyecto => {
      const aEliminar: any = proyecto || this.proyectoVacio();
      aEliminar.idProyecto = idProyecto;
      aEliminar.idUsuarioRemovedor = this.usuario.idUsuario;

      this._sProyecto.postUpdDelProyecto(aEliminar).success(() => {
        this._PopUps.OcultarConfirmacion();
        this.desactivarClientesSecuencial(idProyecto, () => {
          this.desactivarCoordinadoresSecuencial(idProyecto, () => this.Recarga());
        });
        this.Loading = false;
        this.texto = "Proyecto eliminado de forma correcta";
        this.msg = true;
      }).error(error => {
        console.log(error);
        this.Loading = false;
        this.avisarError('No se pudo eliminar el proyecto.');
      });
    }, error => {
      console.log(error);
      this.Loading = false;
    });
  }

  // *************************************************** PopUP ***************************************************

  private guardarBorrador() {
    this.borrador = {
      proyecto: Object.assign({}, this.Proyecto),
      clientesList: this.clientesList.slice(),
      coordinadoresList: this.coordinadoresList.slice(),
      drdPais: this.drdPais,
      regiones: this.Regiones,
      fechaInicio: this.fechaInicio,
      fechaTermino: this.fechaTermino,
      intentoCrear: this.intentoCrear
    };
  }

  private restaurarBorrador() {
    const b = this.borrador;
    if (!b) { return; }
    this.borrador = null;
    this.Proyecto = Object.assign(this.proyectoVacio(), b.proyecto);
    this.clientesList = b.clientesList;
    this.coordinadoresList = b.coordinadoresList;
    this.drdPais = b.drdPais;
    this.Regiones = b.regiones;
    this.fechaInicio = b.fechaInicio;
    this.fechaTermino = b.fechaTermino;
    this.intentoCrear = b.intentoCrear;
  }

  Editar(p: mTabla_Proyectos) {
    if (this.editando || this.Loading) { return; }
    const i = this.indiceReal(p);
    if (i < 0) { return; }
    const idProyecto = this.dataSource.data[i].idProyecto;
    this.IndexUpdate = i;
    this.Loading = true;

    this._sProyecto.getProyectobyID(idProyecto).subscribe(result => {
      if (!result) { this.Loading = false; return; }

      this.guardarBorrador();
      this.editando = true;
      this.intentoEditar = false;

      this.Proyecto = result;
      if (!(this.Proyecto as any).idProyectoMatriz) { (this.Proyecto as any).idProyectoMatriz = 0; }
      if (!(this.Proyecto as any).idRegion) { (this.Proyecto as any).idRegion = 0; }
      this.fechaInicio = result.fechaInicio ? String(result.fechaInicio).split('T')[0] : '';
      this.fechaTermino = result.fechaTermino ? String(result.fechaTermino).split('T')[0] : '';
      this.drdPais = 0;
      this.Regiones = [];
      this.clientesList = [0];
      this.coordinadoresList = [0];

      if (result.idRegion) {
        this._sRegion.getRegionbyID(result.idRegion).subscribe(region => {
          if (!region) { return; }
          this.drdPais = region.idPais;
          this.cargarRegiones();
        });
      }

      this._sUsuarioClienteProyecto.getUsuarioClienteProyectobyidProyecto(idProyecto).subscribe(
        clientes => {
          const idsClientes = (clientes || []).map(c => c.idUsuarioCliente).filter(id => !!id);
          this.clientesList = idsClientes.length ? idsClientes : [0];

          this._sCoordinadorProyecto.getCoordinadorProyectobyidProyecto(idProyecto).subscribe(
            coords => {
              const idsCoord = (coords || []).map(c => c.idUsuarioCoordinador).filter(id => !!id);
              this.coordinadoresList = idsCoord.length ? idsCoord : [0];

              this.Loading = false;
              this._PopUps.VerPopUpEditar();
            },
            error => { console.error(error); this.errorAlAbrir(); }
          );
        },
        error => { console.error(error); this.errorAlAbrir(); }
      );
    }, error => { console.error(error); this.errorAlAbrir(); });
  }

  private errorAlAbrir() {
    this.Loading = false;
    this.cerrarEdicion();
    this.avisarError('No se pudo cargar el proyecto para editar.');
  }

  private cerrarEdicion() {
    if (!this.editando) { return; }
    this.editando = false;
    this.intentoEditar = false;
    this.IndexUpdate = 0;
    this.restaurarBorrador();
  }

  OcultarPopUpEditar() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this._PopUps.OcultarPopUpEditar();
    this.cerrarEdicion();
  }

  Confirmacion(p: mTabla_Proyectos) {
    this.IndexEliminar = this.indiceReal(p);
    this._PopUps.Confirmacion();
  }

  get nombreAEliminar(): string {
    const fila: any = this.dataSource.data && this.dataSource.data[this.IndexEliminar];
    return fila ? fila.nombreProyecto : '';
  }

  OcultarConfirmacion() {
    this._PopUps.OcultarConfirmacion();
  }
}