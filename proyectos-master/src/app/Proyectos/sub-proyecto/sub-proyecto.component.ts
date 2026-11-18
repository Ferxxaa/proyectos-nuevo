import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/map';

//Share
import { PopUps } from '../../Share/PopUps';

//Model
import { mProyecto } from '../../models/mProyecto';
import { mVis_Proyectos } from '../../models/mVis_Proyectos';
import { mTipoIntervencion } from '../../models/mTipoIntervencion';
import { mPais } from '../../models/mPais';
import { mRegion } from '../../models/mRegion';
import { mProvincia } from '../../models/mProvincia';
import { mComuna } from '../../models/mComuna';
import { mVis_ProyectosMatrizCoordinador } from '../../models/mVis_ProyectosMatrizCoordinador';
import { mTabla_SubProyecto } from '../../models/mTabla_SubProyecto';
import { mDireccion } from '../../models/mDireccion';
import { mSubProyecto } from '../../models/mSubProyecto';
import { mVis_UsuariosClientes } from '../../models/mVis_UsuariosClientes';
import { mUsuarioClienteProyecto } from '../../models/mUsuarioClienteProyecto';
import { mCoordinadorProyecto } from '../../models/mCoordinadorProyecto';

//Servicios
import { sProyecto } from '../../services/sProyecto.service';
import { sVis_ProyectoMatriz } from '../../services/sVis_ProyectoMatriz.service';
import { sVis_Proyectos } from '../../services/sVis_Proyectos.service';
import { sTipoIntervencion } from '../../services/sTipoIntervencion.service';
import { sPais } from '../../services/sPais.service';
import { sRegion } from '../../services/sRegion.service';
import { sProvincia } from '../../services/sProvincia.service';
import { sComuna } from '../../services/sComuna.service';
import { sVis_ProyectosMatrizCoordinador } from '../../services/sVis_ProyectosMatrizCoordinador.service';
import { sTabla_SubProyecto } from '../../services/sTabla_SubProyecto.service';
import { sDireccion } from '../../services/sDireccion.service';
import { sSubProyecto } from '../../services/sSubProyecto.service';
import { sEstadoProyecto } from '../../services/sEstadoProyecto.service';
import { sCorreo } from '../../services/Personalizados/sCorreo.service';
import { sUsuario } from '../../services/sUsuario.service';
import { sPersona } from '../../services/sPersona.service';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { sUsuarioClienteProyecto } from '../../services/sUsuarioClienteProyecto.service';
import { sCoordinadorProyecto } from '../../services/sCoordinadorProyecto.service';

declare var jQuery: any;
declare var $: any;
declare var Swal: any;

type ModoForm = 'crear' | 'editar';

/** Campo obligatorio que falta. */
interface CampoFaltante {
  clave: string;
  texto: string;
}

/** Copia del formulario de creación mientras se edita otro sub proyecto en el modal. */
interface BorradorCreacion {
  subproyecto: any;
  direccion: any;
  drdProyectoMatriz: number;
  proyectos: Array<mProyecto>;
  centroCosto: string;
  gerente: string;
  coordinadores: Array<any>;
  drdPais: number;
  drdRegion: number;
  drdProvincia: number;
  regiones: Array<mRegion>;
  provincias: Array<mProvincia>;
  comunas: Array<mComuna>;
  clientesList: number[];
  fechaInicio: string;
  fechaTermino: string;
  intentoCrear: boolean;
}

@Component({
  selector: 'app-sub-proyecto',
  templateUrl: './sub-proyecto.component.html',
  styleUrls: ['./sub-proyecto.component.css'],
  providers: [
    sProyecto,
    sVis_ProyectoMatriz,
    sVis_Proyectos,
    sTipoIntervencion,
    sPais,
    sRegion,
    sProvincia,
    sComuna,
    sVis_ProyectosMatrizCoordinador,
    sTabla_SubProyecto,
    sDireccion,
    sSubProyecto,
    sEstadoProyecto,
    PopUps,
    sCorreo,
    sUsuario,
    sPersona,
    sUsuariosPerfiles,
    sUsuarioClienteProyecto,
    sCoordinadorProyecto
  ]
})
export class SubProyectoComponent implements OnInit, AfterViewInit, OnDestroy {

  //Select
  ProyectosMatriz: Array<mVis_ProyectosMatrizCoordinador> = [];
  Proyectos: Array<mProyecto> = [];
  TiposIntervencion: Array<mTipoIntervencion> = [];
  Paises: Array<mPais> = [];
  Regiones: Array<mRegion> = [];
  Provincias: Array<mProvincia> = [];
  Comunas: Array<mComuna> = [];
  Clientes: Array<any> = [];
  Coordinadores: Array<any> = [];

  //Controles
  drdProyectoMatriz = 0;
  drdPais = 0;
  drdRegion = 0;
  drdProvincia = 0;
  clientesList: number[] = [0];
  Gerente = '';
  centroCosto = '';
  fechaInicio = '';    // 'yyyy-mm-dd' (input type="date")
  fechaTermino = '';

  //Tabla
  SubProyectos: Array<mTabla_SubProyecto> = [];
  EstadosProyecto: Array<any> = [];
  filtroProyectoMatrizTabla = 0;
  filtroTabla = '';

  //Objetos
  Proyecto: mVis_Proyectos;
  usuario: any;
  Subproyecto: mSubProyecto;
  Direccion: mDireccion;

  //Indices
  IndexEliminar: number;

  //Loading
  Loading = false;
  LoadingTabla = true;

  //Validación
  intentoCrear = false;     // los campos se marcan en rojo recién después del primer intento de guardar
  intentoEditar = false;
  editando = false;         // true mientras el modal de edición está abierto
  private borrador: BorradorCreacion = null;

  constructor(
    private _sProyecto: sProyecto,
    private _sVis_ProyectoMatriz: sVis_ProyectoMatriz,
    private _svis_Proyectos: sVis_Proyectos,
    private _sTipoIntervencion: sTipoIntervencion,
    private _sPais: sPais,
    private _sRegion: sRegion,
    private _sProvincia: sProvincia,
    private _sComuna: sComuna,
    private _sVis_ProyectosMatrizCoordinador: sVis_ProyectosMatrizCoordinador,
    private _sTabla_SubProyecto: sTabla_SubProyecto,
    private _sDireccion: sDireccion,
    private _sSubProyecto: sSubProyecto,
    private _sEstadoProyecto: sEstadoProyecto,
    private _PopUps: PopUps,
    private _sUsuario: sUsuario,
    private _sPersona: sPersona,
    private _sUsuariosPerfiles: sUsuariosPerfiles,
    private _sUsuarioClienteProyecto: sUsuarioClienteProyecto,
    private _sCoordinadorProyecto: sCoordinadorProyecto
  ) {
    this.usuario = JSON.parse(localStorage.usuario);
    this.Reset();
  }

  ngOnInit() {
    // La tabla necesita las matrices del coordinador: se carga recién cuando llegan
    this._sVis_ProyectosMatrizCoordinador.getVis_ProyectosMatrizCoordinadorbyidUsuarioCoordinador(this.usuario.idUsuario).subscribe(result => {
      const vistos: { [id: number]: boolean } = {};
      this.ProyectosMatriz = (result || [])
        .filter(pm => vistos[pm.idProyectoMatriz] ? false : (vistos[pm.idProyectoMatriz] = true))
        .sort((a, b) => (a.nombreProyectoMatriz || '').localeCompare(b.nombreProyectoMatriz || ''));
      this.cargarSubProyectos();
    }, error => {
      console.log(error);
      this.cargarSubProyectos();
    });

    this._sTipoIntervencion.getTipoIntervencion().subscribe(result => {
      this.TiposIntervencion = result || [];
    });

    this._sPais.getPais().subscribe(result => {
      this.Paises = result || [];
    });

    // Usuarios activos (clientes internos), ordenados por nombre
    this._sUsuario.getUsuariobyactivo(true).subscribe(usuarios => {
      (usuarios || []).forEach(usuario => {
        this._sPersona.getPersonabyID(usuario.idPersona).subscribe(persona => {
          if (!persona) { return; }
          const lista = this.Clientes.concat([{
            idUsuario: usuario.idUsuario,
            nombre: persona.nombre,
            paterno: persona.paterno,
            materno: persona.materno
          }]);
          lista.sort((a, b) => this.nombreCompleto(a).localeCompare(this.nombreCompleto(b)));
          this.Clientes = lista;
        });
      });
    });
  }

  ngAfterViewInit() {
    // Si el modal se cierra con Esc o clic afuera, igual se devuelve el formulario de creación
    $('#exampleModalLong').on('hidden.bs.modal', () => this.cerrarEdicion());
  }

  ngOnDestroy() {
    $('#exampleModalLong').off('hidden.bs.modal');
  }

  private subproyectoVacio(): mSubProyecto {
    const sp = new mSubProyecto(null, 0, 4, null, null, this.usuario.idUsuario, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 0, null, null, true, null, null, this.usuario.idUsuario, null);
    if (!(sp as any).idProyecto) { (sp as any).idProyecto = 0; }
    if (!(sp as any).idTipoIntervencion) { (sp as any).idTipoIntervencion = 0; }
    return sp;
  }

  private direccionVacia(): mDireccion {
    const d = new mDireccion(null, null, null, null, 0, 1, null, true, null, null, this.usuario.idUsuario, null);
    if (!(d as any).idComuna) { (d as any).idComuna = 0; }
    return d;
  }

  private proyectoVistaVacio(): mVis_Proyectos {
    return new mVis_Proyectos(null, 0, null, null, null, null, "", null, null, null, true, false);
  }

  /** Limpia el formulario de creación. */
  Reset() {
    this.drdProyectoMatriz = 0;
    this.Proyectos = [];
    this.Proyecto = this.proyectoVistaVacio();
    this.Subproyecto = this.subproyectoVacio();
    this.Direccion = this.direccionVacia();
    this.drdPais = 0;
    this.drdRegion = 0;
    this.drdProvincia = 0;
    this.Regiones = [];
    this.Provincias = [];
    this.Comunas = [];
    this.clientesList = [0];
    this.Gerente = '';
    this.centroCosto = '';
    this.Coordinadores = [];
    this.fechaInicio = '';
    this.fechaTermino = '';
    this.intentoCrear = false;
  }

  nombreCompleto(p: any): string {
    return (((p && p.nombre) || '') + ' ' + ((p && p.paterno) || '')).trim();
  }

  // *************************************************** TABLA ***************************************************

  private cargarSubProyectos() {
    this.LoadingTabla = true;

    Observable.forkJoin(
      this._sTabla_SubProyecto.getTabla_SubProyectobyidUsuarioCoordinador(this.usuario.idUsuario),
      this._sTabla_SubProyecto.getTabla_SubProyectobyidUsuarioCreador(this.usuario.idUsuario),
      this._sSubProyecto.getSubProyectobyidUsuarioCoordinador(this.usuario.idUsuario),
      this._sSubProyecto.getSubProyectobyidUsuarioCreador(this.usuario.idUsuario),
      this._sEstadoProyecto.getEstadoProyecto()
    ).subscribe(([subProyectosCoordinador, subProyectosCreador, subProyectosDirectosCoordinador, subProyectosDirectosCreador, estadosProyecto]) => {
      this.EstadosProyecto = estadosProyecto || [];

      const idsProyectoMatriz = (this.ProyectosMatriz || []).map(pm => pm.idProyectoMatriz);

      const proyectosPorMatriz$ = idsProyectoMatriz.length
        ? Observable.forkJoin(idsProyectoMatriz.map(idMatriz => this._sProyecto.getProyectobyidProyectoMatriz(idMatriz)))
        : Observable.of([]);

      proyectosPorMatriz$.subscribe((resultadosProyectos: any[]) => {
        const todosLosProyectos: Array<any> = (resultadosProyectos || []).reduce((acc, arr) => [...acc, ...(arr || [])], []);
        const idsProyecto = todosLosProyectos
          .map(p => p.idProyecto)
          .filter((id, index, self) => self.indexOf(id) === index);

        const subProyectosPorProyecto$ = idsProyecto.length
          ? Observable.forkJoin(idsProyecto.map(idProyecto => this._sTabla_SubProyecto.getTabla_SubProyectobyidProyecto(idProyecto)))
          : Observable.of([]);

        subProyectosPorProyecto$.subscribe((resultadosSubProyectos: any[]) => {
          const subProyectosDeMatrices = (resultadosSubProyectos || []).reduce((acc, arr) => [...acc, ...(arr || [])], []);

          const subProyectosTabla = this.unificarPorId([
            ...(subProyectosCoordinador || []),
            ...(subProyectosCreador || []),
            ...(subProyectosDeMatrices || [])
          ]);

          const subProyectosDirectos = this.unificarPorId([
            ...(subProyectosDirectosCoordinador || []),
            ...(subProyectosDirectosCreador || [])
          ]);

          const idsEnTabla = subProyectosTabla.reduce((mapa, sp) => { mapa[sp.idSubProyecto] = true; return mapa; }, {});
          const subProyectosFaltantes = subProyectosDirectos.filter(sp => sp && sp.activo !== false && !idsEnTabla[sp.idSubProyecto]);

          if (!subProyectosFaltantes.length) {
            this.SubProyectos = subProyectosTabla;
            this.LoadingTabla = false;
            return;
          }

          Observable.forkJoin(subProyectosFaltantes.map(sp => this.construirFilaSubProyecto(sp)))
            .subscribe((reconstruidos: any[]) => {
              this.SubProyectos = this.unificarPorId([...subProyectosTabla, ...(reconstruidos || []).filter(sp => !!sp)]);
              this.LoadingTabla = false;
            }, error => {
              console.log(error);
              this.SubProyectos = subProyectosTabla;
              this.LoadingTabla = false;
            });

        }, error => { console.log(error); this.SubProyectos = []; this.LoadingTabla = false; });
      }, error => { console.log(error); this.SubProyectos = []; this.LoadingTabla = false; });
    }, error => { console.log(error); this.SubProyectos = []; this.LoadingTabla = false; });
  }

  private unificarPorId(lista: Array<any>): Array<any> {
    const porId = (lista || []).reduce((mapa, sp) => {
      if (sp && sp.idSubProyecto != null) { mapa[sp.idSubProyecto] = sp; }
      return mapa;
    }, {});
    return Object.keys(porId).map(id => porId[id]);
  }

  private construirFilaSubProyecto(subProyecto: mSubProyecto): Observable<mTabla_SubProyecto> {
    return Observable.forkJoin(
      this._svis_Proyectos.getVis_ProyectosbyidProyecto(subProyecto.idProyecto),
      this._sTipoIntervencion.getTipoIntervencionbyID(subProyecto.idTipoIntervencion)
    ).map(([proyectosVista, tipoIntervencion]: any[]) => {
      const proyectoVista = (proyectosVista || [])[0];
      const estado = (this.EstadosProyecto || []).filter(e => e.idEstadoProyecto === subProyecto.idEstadoProyecto)[0];

      return new mTabla_SubProyecto(
        subProyecto.idUsuarioCoordinador,
        subProyecto.idSubProyecto,
        proyectoVista ? proyectoVista.nombreProyectoMatriz : '',
        proyectoVista ? proyectoVista.nombreProyecto : '',
        subProyecto.nombreSubProyecto,
        estado ? estado.nombreEstadoProyecto : '',
        tipoIntervencion ? tipoIntervencion.nombreTipoIntervencion : '',
        subProyecto.superficie,
        subProyecto.fechaInicio,
        subProyecto.fechaCreacion,
        subProyecto.activo,
        subProyecto.idProyecto,
        subProyecto.idUsuarioCreador,
        ''
      );
    });
  }

  /** Tabla filtrada por matriz y por el buscador. */
  get subProyectosFiltrados(): Array<mTabla_SubProyecto> {
    let datos: any[] = this.SubProyectos || [];

    if (Number(this.filtroProyectoMatrizTabla) > 0) {
      const matriz = (this.ProyectosMatriz || []).filter(pm => pm.idProyectoMatriz === Number(this.filtroProyectoMatrizTabla))[0];
      if (matriz && matriz.nombreProyectoMatriz) {
        const nombre = String(matriz.nombreProyectoMatriz).trim().toLowerCase();
        datos = datos.filter(sp => String(sp.nombreProyectoMatriz || '').trim().toLowerCase() === nombre);
      }
    }

    const filtro = (this.filtroTabla || '').trim().toLowerCase();
    if (filtro) {
      datos = datos.filter(sp =>
        [sp.idSubProyecto, sp.nombreSubProyecto, sp.nombreProyecto, sp.nombreProyectoMatriz, sp.nombreTipoIntervencion, sp.nombreEstadoProyecto]
          .some(v => v !== null && v !== undefined && String(v).toLowerCase().indexOf(filtro) !== -1)
      );
    }
    return datos;
  }

  /** Color de la etiqueta de estado según el nombre. */
  claseEstado(estado: string): string {
    const e = (estado || '').toLowerCase();
    if (e.indexOf('termin') !== -1 || e.indexOf('cerrad') !== -1 || e.indexOf('finaliz') !== -1) { return 'pz-estado-fin'; }
    if (e.indexOf('paus') !== -1 || e.indexOf('deten') !== -1 || e.indexOf('suspend') !== -1) { return 'pz-estado-pausa'; }
    if (e.indexOf('anul') !== -1 || e.indexOf('cancel') !== -1) { return 'pz-estado-anulado'; }
    return 'pz-estado-activo';
  }

  // *************************************************** PROYECTO / UBICACIÓN ***************************************************

  CargaProyectos() {
    this.Gerente = '';
    this.centroCosto = '';
    this.Coordinadores = [];
    this.Proyectos = [];
    this.Proyecto = this.proyectoVistaVacio();
    (this.Subproyecto as any).idProyecto = 0;

    if (!(Number(this.drdProyectoMatriz) > 0)) { return; }

    this._sProyecto.getProyectobyidProyectoMatriz(this.drdProyectoMatriz).subscribe(result => {
      this.Proyectos = (result || []).filter(p => p.activo !== false)
        .sort((a, b) => (a.nombreProyecto || '').localeCompare(b.nombreProyecto || ''));
    });

    this._sVis_ProyectoMatriz.getVis_ProyectoMatrizbyID(this.drdProyectoMatriz).subscribe(result => {
      this.Gerente = result ? result.SubGerente : '';
    });
  }

  CargaDatosProyecto() {
    this.centroCosto = '';
    this.Coordinadores = [];
    this.Proyecto = this.proyectoVistaVacio();
    if (!(Number(this.Subproyecto.idProyecto) > 0)) { return; }

    this._sProyecto.getProyectobyID(this.Subproyecto.idProyecto).subscribe(result => {
      if (!result) { return; }
      this.centroCosto = result.centroCosto;
      this._svis_Proyectos.getVis_ProyectosbyidProyecto(result.idProyecto).subscribe(vista => {
        this.Proyecto = (vista || [])[0] || this.proyectoVistaVacio();
        this.asignarCoordinadoresDesdeTexto(this.Proyecto ? (this.Proyecto as any).Coordinadores : '');
      });
    });
  }

  private asignarCoordinadoresDesdeTexto(texto: string) {
    const vistos: { [k: string]: boolean } = {};
    this.Coordinadores = (texto || '')
      .split(/\s*\|\s*|\s*,\s*|\s*;\s*|\r?\n/)
      .map(n => n.trim())
      .filter(n => {
        if (!n) { return false; }
        const clave = n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (vistos[clave]) { return false; }
        vistos[clave] = true;
        return true;
      })
      .map(n => {
        const partes = n.split(/\s+/);
        return { nombre: partes[0] || '', paterno: partes[1] || '', materno: partes.slice(2).join(' ') };
      });
  }

  CargaRegiones() {
    this.drdRegion = 0;
    this.drdProvincia = 0;
    (this.Direccion as any).idComuna = 0;
    this.Regiones = [];
    this.Provincias = [];
    this.Comunas = [];
    if (!(Number(this.drdPais) > 0)) { return; }
    this._sRegion.getRegionbyidPais(this.drdPais).subscribe(result => { this.Regiones = result || []; });
  }

  CargaProvincias() {
    this.drdProvincia = 0;
    (this.Direccion as any).idComuna = 0;
    this.Provincias = [];
    this.Comunas = [];
    if (!(Number(this.drdRegion) > 0)) { return; }
    this._sProvincia.getProvinciabyidRegion(this.drdRegion).subscribe(result => { this.Provincias = result || []; });
  }

  CargaComunas() {
    (this.Direccion as any).idComuna = 0;
    this.Comunas = [];
    if (!(Number(this.drdProvincia) > 0)) { return; }
    this._sComuna.getComunabyidProvincia(this.drdProvincia).subscribe(result => { this.Comunas = result || []; });
  }

  onFechaInicio(valor: string) {
    this.fechaInicio = valor || '';
    (this.Subproyecto as any).fechaInicio = this.fechaInicio ? this.fechaInicio + 'T00:00:00' : null;
  }

  onFechaTermino(valor: string) {
    this.fechaTermino = valor || '';
    (this.Subproyecto as any).fechaTermino = this.fechaTermino ? this.fechaTermino + 'T00:00:00' : null;
  }

  // *************************************************** CLIENTES ***************************************************

  AgregarCliente() { this.clientesList.push(0); }

  QuitarCliente(i: number) {
    if (this.clientesList.length > 1) { this.clientesList.splice(i, 1); } else { this.clientesList[0] = 0; }
  }

  usuarioUsado(lista: number[], idUsuario: number, indiceActual: number): boolean {
    return lista.some((id, i) => i !== indiceActual && Number(id) === Number(idUsuario));
  }

  trackIndex(i: number) { return i; }

  private clientesSeleccionados(): number[] {
    const ids = (this.clientesList || []).map(v => Number(v)).filter(v => v > 0);
    return ids.filter((v, i, arr) => arr.indexOf(v) === i);
  }

  private ejecutarSecuencial(items: any[], accion: (item: any, next: () => void) => void, done: () => void) {
    const lista = items || [];
    const ejecutar = (index: number) => {
      if (index >= lista.length) { done(); return; }
      accion(lista[index], () => ejecutar(index + 1));
    };
    ejecutar(0);
  }

  private idClienteDe(c: any): number {
    return Number(c && (c.idUsuarioCliente || c.idUsuario)) || 0;
  }

  /** Agrega al proyecto solo los clientes que todavía no tiene (antes se duplicaban). */
  private agregarClientesNuevos(idProyecto: number, clientes: number[], done: () => void) {
    if (!clientes.length) { done(); return; }
    this._sUsuarioClienteProyecto.getUsuarioClienteProyectobyidProyecto(idProyecto).subscribe(actuales => {
      const yaEstan = (actuales || []).map(c => this.idClienteDe(c));
      const nuevos = clientes.filter(id => yaEstan.indexOf(id) === -1);
      this.ejecutarSecuencial(nuevos, (idCliente, next) => {
        const cp = new mUsuarioClienteProyecto(null, idProyecto, idCliente, true, null, null, this.usuario.idUsuario, null);
        this._sUsuarioClienteProyecto.postAddUsuarioClienteProyecto(cp).success(() => next()).error(() => next());
      }, done);
    }, () => done());
  }

  /** Reemplaza los clientes del proyecto por los elegidos (si no se eligió ninguno, se dejan como están). */
  private reemplazarClientes(idProyecto: number, clientes: number[], done: () => void) {
    if (!clientes.length) { done(); return; }
    this._sUsuarioClienteProyecto.getUsuarioClienteProyectobyidProyecto(idProyecto).subscribe(actuales => {
      this.ejecutarSecuencial(actuales || [], (element, next) => {
        element.idUsuarioRemovedor = this.usuario.idUsuario;
        this._sUsuarioClienteProyecto.postUpdDelUsuarioClienteProyecto(element).success(() => next()).error(() => next());
      }, () => {
        this.ejecutarSecuencial(clientes, (idCliente, next) => {
          const cp = new mUsuarioClienteProyecto(null, idProyecto, idCliente, true, null, null, this.usuario.idUsuario, null);
          this._sUsuarioClienteProyecto.postAddUsuarioClienteProyecto(cp).success(() => next()).error(() => next());
        }, done);
      });
    }, () => done());
  }

  // *************************************************** VALIDACIÓN ***************************************************

  faltantes(modo: ModoForm): CampoFaltante[] {
    const lista: CampoFaltante[] = [];
    const sp: any = this.Subproyecto || {};
    const dir: any = this.Direccion || {};

    if (!(Number(this.drdProyectoMatriz) > 0)) {
      lista.push({ clave: 'matriz', texto: 'Proyecto Matriz' });
    }
    if (!(Number(sp.idProyecto) > 0)) {
      lista.push({ clave: 'proyecto', texto: 'Proyecto' });
    }
    if (!sp.nombreSubProyecto || !String(sp.nombreSubProyecto).trim()) {
      lista.push({ clave: 'nombre', texto: 'Nombre del sub proyecto' });
    }
    if (!(Number(sp.idTipoIntervencion) > 0)) {
      lista.push({ clave: 'tipo', texto: 'Tipo de intervención' });
    }
    if (sp.superficie !== null && sp.superficie !== undefined && String(sp.superficie).trim() !== '' && !/^\d+([.,]\d+)?$/.test(String(sp.superficie).trim())) {
      lista.push({ clave: 'superficie', texto: 'Superficie (solo números)' });
    }
    if (!(Number(dir.idComuna) > 0)) {
      lista.push({ clave: 'comuna', texto: 'Comuna (completa país, región y provincia)' });
    }
    if (!this.fechaInicio) {
      lista.push({ clave: 'inicio', texto: 'Fecha de inicio' });
    }
    if (!this.fechaTermino) {
      lista.push({ clave: 'termino', texto: 'Fecha de término' });
    } else if (this.fechaInicio && this.fechaTermino < this.fechaInicio) {
      lista.push({ clave: 'termino', texto: 'Fecha de término (es anterior al inicio)' });
    }
    return lista;
  }

  /** ¿Marcar este campo en rojo? Solo después del primer intento de guardar. */
  falta(modo: ModoForm, clave: string): boolean {
    const intento = modo === 'crear' ? this.intentoCrear : this.intentoEditar;
    return intento && this.faltantes(modo).some(f => f.clave === clave);
  }

  /** Mensaje del campo (para fecha de término puede ser "falta" o "es anterior"). */
  textoFalta(modo: ModoForm, clave: string): string {
    const f = this.faltantes(modo).filter(x => x.clave === clave)[0];
    return f ? f.texto : '';
  }

  irACampo(modo: ModoForm, clave: string) {
    // La comuna depende de país/región/provincia: se lleva al primero que falte
    let destino = clave;
    if (clave === 'comuna') {
      destino = !(Number(this.drdPais) > 0) ? 'pais' : !(Number(this.drdRegion) > 0) ? 'region' : !(Number(this.drdProvincia) > 0) ? 'provincia' : 'comuna';
    }
    const el = document.getElementById('pz-' + modo + '-' + destino) as HTMLElement;
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

  private avisar(icon: string, titulo: string, texto: string) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({ icon: icon, title: titulo, text: texto, confirmButtonColor: '#026AA7' });
    }
  }

  private normalizarAntesDeGuardar() {
    const sp: any = this.Subproyecto;
    sp.nombreSubProyecto = String(sp.nombreSubProyecto || '').trim();
    sp.idProyecto = Number(sp.idProyecto);
    sp.idTipoIntervencion = Number(sp.idTipoIntervencion);
    if (sp.superficie !== null && sp.superficie !== undefined) {
      sp.superficie = String(sp.superficie).trim().replace(',', '.') || null;
    }
    (this.Direccion as any).idComuna = Number((this.Direccion as any).idComuna);
  }

  // *************************************************** CRUD ***************************************************

  Agregar() {
    if (this.Loading) { return; }
    if (!this.validarYAvisar('crear')) { return; }
    this.normalizarAntesDeGuardar();

    this.Loading = true;
    const idProyecto = Number(this.Subproyecto.idProyecto);
    const clientes = this.clientesSeleccionados();

    this._sDireccion.postAddDireccion(this.Direccion).success(dir => {
      this.Subproyecto.idDireccion = dir.idDireccion;

      this._sSubProyecto.postAddSubProyecto(this.Subproyecto).success(() => {
        this.agregarClientesNuevos(idProyecto, clientes, () => {
          this.Reset();
          this.cargarSubProyectos();
          this.Loading = false;
          this.avisar('success', '¡Listo!', 'Sub proyecto creado correctamente');
        });
      }).error(error => {
        console.log(error);
        this.Loading = false;
        this.avisar('error', 'Error', 'No se pudo crear el sub proyecto. Intenta nuevamente.');
      });
    }).error(error => {
      console.log(error);
      this.Loading = false;
      this.avisar('error', 'Error', 'No se pudo guardar la dirección del sub proyecto.');
    });
  }

  Actualizar() {
    if (this.Loading) { return; }
    if (!this.validarYAvisar('editar')) { return; }
    this.normalizarAntesDeGuardar();

    this.Loading = true;
    const idProyecto = Number(this.Subproyecto.idProyecto);
    const clientes = this.clientesSeleccionados();
    (this.Direccion as any).idDireccion = this.Subproyecto.idDireccion;

    this._sDireccion.postUpdDelDireccion(this.Direccion).success(() => {
      this._sSubProyecto.postUpdDelSubProyecto(this.Subproyecto).success(() => {
        this.reemplazarClientes(idProyecto, clientes, () => {
          this.OcultarPopUpEditar();
          this.cargarSubProyectos();
          this.Loading = false;
          this.avisar('success', '¡Listo!', 'Sub proyecto actualizado correctamente');
        });
      }).error(error => {
        console.log(error);
        this.Loading = false;
        this.avisar('error', 'Error', 'No se pudo actualizar el sub proyecto. Intenta nuevamente.');
      });
    }).error(error => {
      console.log(error);
      this.Loading = false;
      this.avisar('error', 'Error', 'No se pudo actualizar la dirección del sub proyecto.');
    });
  }

  Eliminar() {
    const fila: any = this.SubProyectos[this.IndexEliminar];
    if (!fila || this.Loading) { return; }
    const idSubProyecto = fila.idSubProyecto;
    this.Loading = true;

    // Se elimina con el sub proyecto tal como está guardado (no con lo escrito en el formulario de creación)
    this._sSubProyecto.getSubProyectobyID(idSubProyecto).subscribe(guardado => {
      const aEliminar: any = guardado || this.subproyectoVacio();
      aEliminar.idSubProyecto = idSubProyecto;
      aEliminar.idUsuarioRemovedor = this.usuario.idUsuario;

      this._sSubProyecto.postUpdDelSubProyecto(aEliminar).success(() => {
        this._PopUps.OcultarConfirmacion();
        this.Loading = false;
        this.cargarSubProyectos();
      }).error(error => {
        console.log(error);
        this.Loading = false;
        this.avisar('error', 'Error', 'No se pudo eliminar el sub proyecto.');
      });
    }, error => {
      console.log(error);
      this.Loading = false;
    });
  }

  // *************************************************** PopUP ***************************************************

  private guardarBorrador() {
    this.borrador = {
      subproyecto: Object.assign({}, this.Subproyecto),
      direccion: Object.assign({}, this.Direccion),
      drdProyectoMatriz: this.drdProyectoMatriz,
      proyectos: this.Proyectos,
      centroCosto: this.centroCosto,
      gerente: this.Gerente,
      coordinadores: this.Coordinadores,
      drdPais: this.drdPais,
      drdRegion: this.drdRegion,
      drdProvincia: this.drdProvincia,
      regiones: this.Regiones,
      provincias: this.Provincias,
      comunas: this.Comunas,
      clientesList: this.clientesList.slice(),
      fechaInicio: this.fechaInicio,
      fechaTermino: this.fechaTermino,
      intentoCrear: this.intentoCrear
    };
  }

  private restaurarBorrador() {
    const b = this.borrador;
    if (!b) { return; }
    this.borrador = null;
    this.Subproyecto = Object.assign(this.subproyectoVacio(), b.subproyecto);
    this.Direccion = Object.assign(this.direccionVacia(), b.direccion);
    this.drdProyectoMatriz = b.drdProyectoMatriz;
    this.Proyectos = b.proyectos;
    this.centroCosto = b.centroCosto;
    this.Gerente = b.gerente;
    this.Coordinadores = b.coordinadores;
    this.drdPais = b.drdPais;
    this.drdRegion = b.drdRegion;
    this.drdProvincia = b.drdProvincia;
    this.Regiones = b.regiones;
    this.Provincias = b.provincias;
    this.Comunas = b.comunas;
    this.clientesList = b.clientesList;
    this.fechaInicio = b.fechaInicio;
    this.fechaTermino = b.fechaTermino;
    this.intentoCrear = b.intentoCrear;
  }

  Editar(fila: mTabla_SubProyecto) {
    if (this.editando || this.Loading || !fila) { return; }
    const idSubProyecto = fila.idSubProyecto;
    this.Loading = true;

    this._sSubProyecto.getSubProyectobyID(idSubProyecto).subscribe(sp => {
      if (!sp) { this.Loading = false; return; }

      this.guardarBorrador();
      this.editando = true;
      this.intentoEditar = false;

      this.Subproyecto = sp;
      if (!(sp as any).idTipoIntervencion) { (sp as any).idTipoIntervencion = 0; }
      this.fechaInicio = sp.fechaInicio ? String(sp.fechaInicio).split('T')[0] : '';
      this.fechaTermino = sp.fechaTermino ? String(sp.fechaTermino).split('T')[0] : '';

      this.Direccion = this.direccionVacia();
      this.drdPais = 0; this.drdRegion = 0; this.drdProvincia = 0;
      this.Regiones = []; this.Provincias = []; this.Comunas = [];
      this.clientesList = [0];
      this.Coordinadores = [];
      this.Gerente = '';
      this.centroCosto = '';

      // Proyecto, matriz, gerente, coordinadores y clientes
      const proyecto$ = this._sProyecto.getProyectobyID(sp.idProyecto);
      // Dirección completa (comuna → provincia → región → país)
      const direccion$ = this._sDireccion.getDireccionbyID(sp.idDireccion);

      Observable.forkJoin(proyecto$, direccion$).subscribe(([proyecto, direccion]: any[]) => {
        if (proyecto) {
          this.drdProyectoMatriz = proyecto.idProyectoMatriz;
          this.centroCosto = proyecto.centroCosto;
          this._sProyecto.getProyectobyidProyectoMatriz(proyecto.idProyectoMatriz).subscribe(lista => {
            this.Proyectos = (lista || []).sort((a, b) => (a.nombreProyecto || '').localeCompare(b.nombreProyecto || ''));
          });
          this._sVis_ProyectoMatriz.getVis_ProyectoMatrizbyID(proyecto.idProyectoMatriz).subscribe(pm => {
            this.Gerente = pm ? pm.SubGerente : '';
          });
          this._svis_Proyectos.getVis_ProyectosbyidProyecto(proyecto.idProyecto).subscribe(vista => {
            this.asignarCoordinadoresDesdeTexto(vista && vista[0] ? vista[0].Coordinadores : '');
          });
          this._sUsuarioClienteProyecto.getUsuarioClienteProyectobyidProyecto(proyecto.idProyecto).subscribe(clientes => {
            const ids = (clientes || []).map(c => this.idClienteDe(c)).filter(id => id > 0)
              .filter((v, i, arr) => arr.indexOf(v) === i);
            this.clientesList = ids.length ? ids : [0];
          });
        }

        if (direccion) {
          this.cargarUbicacionDesdeComuna(direccion);
        }

        this.Loading = false;
        this._PopUps.VerPopUpEditar();
      }, error => { console.log(error); this.errorAlAbrir(); });
    }, error => { console.log(error); this.errorAlAbrir(); });
  }

  /** Arma país → región → provincia → comuna a partir de la dirección guardada. */
  private cargarUbicacionDesdeComuna(direccion: any) {
    const idComuna = direccion.idComuna;
    this.Direccion = direccion;
    if (!idComuna) { return; }

    this._sComuna.getComunabyID(idComuna).subscribe(comuna => {
      if (!comuna) { return; }
      this._sProvincia.getProvinciabyID(comuna.idProvincia).subscribe(provincia => {
        if (!provincia) { return; }
        this._sRegion.getRegionbyID(provincia.idRegion).subscribe(region => {
          if (!region) { return; }
          Observable.forkJoin(
            this._sRegion.getRegionbyidPais(region.idPais),
            this._sProvincia.getProvinciabyidRegion(region.idRegion),
            this._sComuna.getComunabyidProvincia(provincia.idProvincia)
          ).subscribe(([regiones, provincias, comunas]: any[]) => {
            this.Regiones = regiones || [];
            this.Provincias = provincias || [];
            this.Comunas = comunas || [];
            this.drdPais = region.idPais;
            this.drdRegion = region.idRegion;
            this.drdProvincia = provincia.idProvincia;
            (this.Direccion as any).idComuna = idComuna;
          });
        });
      });
    });
  }

  private errorAlAbrir() {
    this.Loading = false;
    this.cerrarEdicion();
    this.avisar('error', 'Error', 'No se pudo cargar el sub proyecto para editar.');
  }

  private cerrarEdicion() {
    if (!this.editando) { return; }
    this.editando = false;
    this.intentoEditar = false;
    this.restaurarBorrador();
  }

  OcultarPopUpEditar() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this._PopUps.OcultarPopUpEditar();
    this.cerrarEdicion();
  }

  Confirmacion(fila: mTabla_SubProyecto) {
    this.IndexEliminar = (this.SubProyectos || []).indexOf(fila);
    this._PopUps.Confirmacion();
  }

  get nombreAEliminar(): string {
    const fila: any = this.SubProyectos && this.SubProyectos[this.IndexEliminar];
    return fila ? fila.nombreSubProyecto : '';
  }

  OcultarConfirmacion() {
    this._PopUps.OcultarConfirmacion();
  }
}