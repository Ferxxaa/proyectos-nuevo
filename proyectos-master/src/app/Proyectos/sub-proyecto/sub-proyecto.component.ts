import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/forkJoin';

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
export class SubProyectoComponent implements OnInit {

  //Select
  ProyectosMatriz: Array<mVis_ProyectosMatrizCoordinador>;
  Proyectos: Array<mProyecto>;
  TiposIntervencion: Array<mTipoIntervencion>;
  Paises: Array<mPais>;
  Regiones: Array<mRegion>;
  Provincias: Array<mProvincia>;
  Comunas: Array<mComuna>;
  Clientes: Array<any>;
  Coordinadores: Array<any>;

  get coordinadoresText(): string {
    if (!this.Coordinadores) return '';
    return this.Coordinadores.map(c => `${c.nombre} ${c.paterno} ${c.materno}`).join(', ');
  }

  //Controles
  drdProyectoMatriz;
  drdProyecto;
  filtroProyectoMatrizTabla: number = 0;
  drdTipoIntervencion;
  drdPais;
  drdRegion;
  drdProvincia;
  drdComuna;
  drdCliente1;
  drdCliente2;
  Gerente;
  centroCosto: string;

  //Objetos
  Proyecto: mVis_Proyectos;
  SubProyectos: Array<mTabla_SubProyecto>;
  EstadosProyecto: Array<any>;
  usuario: any;
  Subproyecto: mSubProyecto;
  Direccion: mDireccion;

  //Indices
  IndexEliminar: number;

  //Loading
  Loading: boolean;
  LoadingTabla: boolean;

  //String
  Cliente1: string;
  Cliente2: string;

  //Error
  error: string;

  //Fechas
  fechaInicioInput: Date;
  fechaTerminoInput: Date;

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

  private Reset() {
    this.drdProyectoMatriz = 0;
    this.drdProyecto = 0;
    this.filtroProyectoMatrizTabla = 0;
    this.drdTipoIntervencion = 0;
    this.drdPais = 0;
    this.drdRegion = 0;
    this.drdProvincia = 0;
    this.drdCliente1 = 0;
    this.drdCliente2 = 0;
    this.Proyecto = new mVis_Proyectos(null, 0, null, null, null, null, "", null, null, null, true, false);
    this.Subproyecto = new mSubProyecto(null, 0, 4, null, null, this.usuario.idUsuario, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 0, null, null, true, null, null, this.usuario.idUsuario, null);
    this.Direccion = new mDireccion(null, null, null, null, 0, 1, null, true, null, null, this.usuario.idUsuario, null);
    $("#txtInicio").val("");
    $("#txtTermino").val("");
    this.Gerente = "";
    this.Proyecto = new mVis_Proyectos(null, 0, null, null, null, null, "", null, null, null, true, false);
  }

  get subProyectosFiltrados(): Array<mTabla_SubProyecto> {
    if (!this.SubProyectos || !this.SubProyectos.length) {
      return this.SubProyectos;
    }

    if (!this.filtroProyectoMatrizTabla) {
      return this.SubProyectos;
    }

    const proyectoMatrizSeleccionado = (this.ProyectosMatriz || []).find(
      proyectoMatriz => proyectoMatriz.idProyectoMatriz === Number(this.filtroProyectoMatrizTabla)
    );

    if (!proyectoMatrizSeleccionado || !proyectoMatrizSeleccionado.nombreProyectoMatriz) {
      return this.SubProyectos;
    }

    const nombreProyectoMatriz = proyectoMatrizSeleccionado.nombreProyectoMatriz.toString().trim().toLowerCase();

    return this.SubProyectos.filter(subProyecto =>
      (subProyecto.nombreProyectoMatriz || '').toString().trim().toLowerCase() === nombreProyectoMatriz
    );
  }

  ngOnInit() {
    this.Loading = true;
    $(".date").datetimepicker({ format: 'DD/MM/YYYY' });

    this._sVis_ProyectosMatrizCoordinador.getVis_ProyectosMatrizCoordinadorbyidUsuarioCoordinador(this.usuario.idUsuario).subscribe(result => {
      this.ProyectosMatriz = result;
      this.Loading = false;
    });

    this._sTipoIntervencion.getTipoIntervencion().subscribe(result => {
      this.TiposIntervencion = result;
    });

    this._sPais.getPais().subscribe(result => {
      this.Paises = result;
    });

    // Cargar usuarios activos
    this.Clientes = [];
    this._sUsuario.getUsuariobyactivo(true).subscribe(
      usuarios => {
        usuarios.forEach(usuario => {
          this._sPersona.getPersonabyID(usuario.idPersona).subscribe(persona => {
            this.Clientes.push({
              idUsuario: usuario.idUsuario,
              nombre: persona.nombre,
              paterno: persona.paterno,
              materno: persona.materno
            });
          });
        });
      }
    );

    this.cargarSubProyectos();
  }

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
        ? Observable.forkJoin(
            idsProyectoMatriz.map(idMatriz =>
              this._sProyecto.getProyectobyidProyectoMatriz(idMatriz)
            )
          )
        : Observable.of([]);

      proyectosPorMatriz$.subscribe(resultadosProyectos => {
        const todosLosProyectos: Array<any> = resultadosProyectos.reduce((acc, arr) => [...acc, ...(arr || [])], []);
        const idsProyecto = todosLosProyectos
          .map(p => p.idProyecto)
          .filter((id, index, self) => self.indexOf(id) === index);

        const subProyectosPorProyecto$ = idsProyecto.length
          ? Observable.forkJoin(
              idsProyecto.map(idProyecto =>
                this._sTabla_SubProyecto.getTabla_SubProyectobyidProyecto(idProyecto)
              )
            )
          : Observable.of([]);

        subProyectosPorProyecto$.subscribe(resultadosSubProyectos => {
          const subProyectosDeMatrices = resultadosSubProyectos.reduce((acc, arr) => [...acc, ...(arr || [])], []);

          const subProyectosTabla = this.unificarSubProyectosTabla([
            ...(subProyectosCoordinador || []),
            ...(subProyectosCreador || []),
            ...(subProyectosDeMatrices || [])
          ]);

          const subProyectosDirectos = this.unificarSubProyectosDirectos([
            ...(subProyectosDirectosCoordinador || []),
            ...(subProyectosDirectosCreador || [])
          ]);

          const idsEnTabla = subProyectosTabla.reduce((mapa, subProyecto) => {
            mapa[subProyecto.idSubProyecto] = true;
            return mapa;
          }, {});

          const subProyectosFaltantes = subProyectosDirectos.filter(subProyecto => {
            return subProyecto && subProyecto.activo !== false && !idsEnTabla[subProyecto.idSubProyecto];
          });

          if (!subProyectosFaltantes.length) {
            this.SubProyectos = subProyectosTabla;
            this.LoadingTabla = false;
            return;
          }

          Observable.forkJoin(
            subProyectosFaltantes.map(subProyecto => this.construirFilaSubProyecto(subProyecto))
          ).subscribe(subProyectosReconstruidos => {
            this.SubProyectos = this.unificarSubProyectosTabla([
              ...subProyectosTabla,
              ...(subProyectosReconstruidos || []).filter(sp => !!sp)
            ]);
            this.LoadingTabla = false;
          }, error => {
            console.log(error);
            this.SubProyectos = subProyectosTabla;
            this.LoadingTabla = false;
          });

        }, error => {
          console.log(error);
          this.SubProyectos = [];
          this.LoadingTabla = false;
        });
      }, error => {
        console.log(error);
        this.SubProyectos = [];
        this.LoadingTabla = false;
      });

    }, error => {
      console.log(error);
      this.SubProyectos = [];
      this.LoadingTabla = false;
    });
  }

  private unificarSubProyectosTabla(subProyectos: Array<mTabla_SubProyecto>): Array<mTabla_SubProyecto> {
    const subProyectosPorId = (subProyectos || []).reduce((mapa, subProyecto) => {
      if (subProyecto && subProyecto.idSubProyecto != null) {
        mapa[subProyecto.idSubProyecto] = subProyecto;
      }
      return mapa;
    }, {});

    return Object.keys(subProyectosPorId).map(idSubProyecto => subProyectosPorId[idSubProyecto]);
  }

  private unificarSubProyectosDirectos(subProyectos: Array<mSubProyecto>): Array<mSubProyecto> {
    const subProyectosPorId = (subProyectos || []).reduce((mapa, subProyecto) => {
      if (subProyecto && subProyecto.idSubProyecto != null) {
        mapa[subProyecto.idSubProyecto] = subProyecto;
      }
      return mapa;
    }, {});

    return Object.keys(subProyectosPorId).map(idSubProyecto => subProyectosPorId[idSubProyecto]);
  }

  private construirFilaSubProyecto(subProyecto: mSubProyecto): Observable<mTabla_SubProyecto> {
    return Observable.forkJoin(
      this._svis_Proyectos.getVis_ProyectosbyidProyecto(subProyecto.idProyecto),
      this._sTipoIntervencion.getTipoIntervencionbyID(subProyecto.idTipoIntervencion)
    ).map(([proyectosVista, tipoIntervencion]) => {
      const proyectoVista = (proyectosVista || [])[0];
      const estadoProyecto = (this.EstadosProyecto || []).find(estado => estado.idEstadoProyecto === subProyecto.idEstadoProyecto);

      return new mTabla_SubProyecto(
        subProyecto.idUsuarioCoordinador,
        subProyecto.idSubProyecto,
        proyectoVista ? proyectoVista.nombreProyectoMatriz : '',
        proyectoVista ? proyectoVista.nombreProyecto : '',
        subProyecto.nombreSubProyecto,
        estadoProyecto ? estadoProyecto.nombreEstadoProyecto : '',
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

  private asignarCoordinadoresDesdeTexto(coordinadoresTexto: string) {
    const nombres = (coordinadoresTexto || '')
      .split(/\s*\|\s*|\s*,\s*|\s*;\s*|\r?\n/)
      .map(nombre => nombre.trim())
      .filter(nombre => !!nombre);

    this.Coordinadores = nombres.map(nombreCompleto => {
      const partes = nombreCompleto.split(/\s+/).filter(parte => !!parte);
      return {
        nombre: partes[0] || '',
        paterno: partes[1] || '',
        materno: partes.slice(2).join(' ')
      };
    });
  }

  getSubProyectoIndex(subProyecto: mTabla_SubProyecto): number {
    if (!subProyecto || !this.SubProyectos) {
      return -1;
    }
    return this.SubProyectos.findIndex(item => item.idSubProyecto === subProyecto.idSubProyecto);
  }

  CargaProyectos() {
    this.Gerente = "";
    this.centroCosto = "";
    this.Proyecto = new mVis_Proyectos(null, 0, null, null, null, null, "", null, null, null, true, false);
    this.Subproyecto.idProyecto = 0;

    if (this.drdProyectoMatriz > 0) {
      this._sProyecto.getProyectobyidProyectoMatriz(this.drdProyectoMatriz).subscribe(result => {
        this.Proyectos = result;
      });
    }

    this._sVis_ProyectoMatriz.getVis_ProyectoMatrizbyID(this.drdProyectoMatriz).subscribe(result => {
      this.Gerente = result.SubGerente;
    });
  }

  CargaDatosProyecto() {
    this.centroCosto = "";
    this.Coordinadores = [];
    this.Proyecto = new mVis_Proyectos(null, 0, null, null, null, null, "", null, null, null, true, false);

    this._sProyecto.getProyectobyID(this.Subproyecto.idProyecto).subscribe(result => {
      this.centroCosto = result.centroCosto;
      this._svis_Proyectos.getVis_ProyectosbyidProyecto(result.idProyecto).subscribe(result => {
        this.Proyecto = result[0];
        this.asignarCoordinadoresDesdeTexto(this.Proyecto ? this.Proyecto.Coordinadores : '');
      });
    });
  }

  CargaRegiones() {
    this.drdRegion = 0;
    this.drdProvincia = 0;
    this.drdComuna = 0;
    this._sRegion.getRegionbyidPais(this.drdPais).subscribe(result => {
      this.Regiones = result;
    });
  }

  CargaProvincias() {
    this.drdProvincia = 0;
    this.Direccion.idComuna = 0;
    this._sProvincia.getProvinciabyidRegion(this.drdRegion).subscribe(result => {
      this.Provincias = result;
    });
  }

  CargaComunas() {
    this.Direccion.idComuna = 0;
    this._sComuna.getComunabyidProvincia(this.drdProvincia).subscribe(result => {
      this.Comunas = result;
    });
  }

  asignaFechaInicio(inputId: string = 'txtInicio') {
    let dia = $("#" + inputId).val().split("/")[0];
    let mes = $("#" + inputId).val().split("/")[1];
    let agno = $("#" + inputId).val().split("/")[2];
    this.Subproyecto.fechaInicio = agno + "-" + mes + "-" + dia + "T00:00:00";
  }

  asignaFechaTermino(inputId: string = 'txtTermino') {
    let dia = $("#" + inputId).val().split("/")[0];
    let mes = $("#" + inputId).val().split("/")[1];
    let agno = $("#" + inputId).val().split("/")[2];
    this.Subproyecto.fechaTermino = agno + "-" + mes + "-" + dia + "T00:00:00";
  }

  onFechaInicioChange(event) {
    let fecha = event.value;
    if (fecha) {
      let agno = fecha.getFullYear();
      let mes = ('0' + (fecha.getMonth() + 1)).slice(-2);
      let dia = ('0' + fecha.getDate()).slice(-2);
      this.Subproyecto.fechaInicio = agno + "-" + mes + "-" + dia + "T00:00:00";
    }
  }

  onFechaTerminoChange(event) {
    let fecha = event.value;
    if (fecha) {
      let agno = fecha.getFullYear();
      let mes = ('0' + (fecha.getMonth() + 1)).slice(-2);
      let dia = ('0' + fecha.getDate()).slice(-2);
      this.Subproyecto.fechaTermino = agno + "-" + mes + "-" + dia + "T00:00:00";
    }
  }

  ValidaCliente(Clientes): boolean {
    if (Clientes == null) {
      return false;
    } else {
      this.Cliente1 = Clientes.split(' | ')[0];
      this.Cliente2 = Clientes.split(' | ')[1];
      return true;
    }
  }

  //*************************************************** CRUD ***************************************************

  Agregar(Form) {
    if (this.Direccion.idComuna == 0 || this.Direccion.idComuna == null) {
      this.error = "Debe seleccionar una Comuna antes de crear el Sub-Proyecto.";
      return;
    }
    this.error = null;

    this._sDireccion.postAddDireccion(this.Direccion).success(result => {
      this.Subproyecto.idDireccion = result.idDireccion;

      this._sSubProyecto.postAddSubProyecto(this.Subproyecto).success(result => {
        let idSubProyecto = result.idSubProyecto;

        let ClienteProyecto: mUsuarioClienteProyecto;

        if (this.drdCliente1 > 0) {
          ClienteProyecto = new mUsuarioClienteProyecto(null, this.Subproyecto.idProyecto, this.drdCliente1, true, null, null, this.usuario.idUsuario, null);
          this._sUsuarioClienteProyecto.postAddUsuarioClienteProyecto(ClienteProyecto);
        }

        if (this.drdCliente2 > 0) {
          ClienteProyecto = new mUsuarioClienteProyecto(null, this.Subproyecto.idProyecto, this.drdCliente2, true, null, null, this.usuario.idUsuario, null);
          this._sUsuarioClienteProyecto.postAddUsuarioClienteProyecto(ClienteProyecto);
        }

        this.cargarSubProyectos();
        this.Subproyecto = new mSubProyecto(null, 0, 4, null, null, this.usuario.idUsuario, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 0, null, null, true, null, null, this.usuario.idUsuario, null);
        Form.reset();
        this.Reset();

        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: 'SubProyecto creado correctamente',
            confirmButtonText: 'Aceptar'
          });
        }
      });
    });
  }

  Actualizar(EForm) {
  // Guardar idDireccion antes de cualquier reset
  const idDireccion = this.Subproyecto.idDireccion;
  const idProyecto = this.Subproyecto.idProyecto;

  // Asegurarse que la dirección tenga el id correcto
  this.Direccion.idDireccion = idDireccion;

  this._sDireccion.postUpdDelDireccion(this.Direccion).success(result => {

    this._sSubProyecto.postUpdDelSubProyecto(this.Subproyecto).success(result => {

      if (this.drdCliente1 > 0 || this.drdCliente2 > 0) {
        this._sUsuarioClienteProyecto.getUsuarioClienteProyectobyidProyecto(idProyecto).subscribe(clientesActuales => {
          (clientesActuales || []).forEach(element => {
            element.idUsuarioRemovedor = this.usuario.idUsuario;
            this._sUsuarioClienteProyecto.postUpdDelUsuarioClienteProyecto(element);
          });

          let ClienteProyecto: mUsuarioClienteProyecto;

          if (this.drdCliente1 > 0) {
            ClienteProyecto = new mUsuarioClienteProyecto(null, idProyecto, this.drdCliente1, true, null, null, this.usuario.idUsuario, null);
            this._sUsuarioClienteProyecto.postAddUsuarioClienteProyecto(ClienteProyecto);
          }

          if (this.drdCliente2 > 0) {
            ClienteProyecto = new mUsuarioClienteProyecto(null, idProyecto, this.drdCliente2, true, null, null, this.usuario.idUsuario, null);
            this._sUsuarioClienteProyecto.postAddUsuarioClienteProyecto(ClienteProyecto);
          }

          this.cargarSubProyectos();
        });
      } else {
        this.cargarSubProyectos();
      }

      this.Subproyecto = new mSubProyecto(null, 0, 4, null, null, this.usuario.idUsuario, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 0, null, null, true, null, null, this.usuario.idUsuario, null);
      this.Reset();
      this.OcultarPopUpEditar();
    });
  });
}

  Eliminar() {
    this.Loading = true;
    this.Subproyecto.idSubProyecto = this.SubProyectos[this.IndexEliminar].idSubProyecto;
    this.Subproyecto.idUsuarioRemovedor = this.usuario.idUsuario;

    this._sSubProyecto.postUpdDelSubProyecto(this.Subproyecto)
      .success(result => {
        this._PopUps.OcultarConfirmacion();
        this.Loading = false;
        this.Subproyecto = new mSubProyecto(null, 0, 4, null, null, this.usuario.idUsuario, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 0, null, null, true, null, null, this.usuario.idUsuario, null);
        this.cargarSubProyectos();
      }).error(error => {
        console.log(error);
        this.Loading = false;
      });
  }

  //*************************************************** PopUP Confirm ***************************************************

  Editar(i: number) {
    let idSubProyecto: number;
    idSubProyecto = this.SubProyectos[i].idSubProyecto;

    // Resetear solo los campos del modal sin llamar ngOnInit()
    // para no interferir con los datos ya cargados en la tabla
    this.drdCliente1 = 0;
    this.drdCliente2 = 0;
    this.Coordinadores = [];

    this._sSubProyecto.getSubProyectobyID(idSubProyecto).subscribe(result => {
      this.Subproyecto = result;

      // Fechas
      let inicio = result.fechaInicio.split("T")[0];
      let termino = result.fechaTermino.split("T")[0];
      $("#txtInicioEdit").val(inicio.split("-")[2] + "/" + inicio.split("-")[1] + "/" + inicio.split("-")[0]);
      $("#txtTerminoEdit").val(termino.split("-")[2] + "/" + termino.split("-")[1] + "/" + termino.split("-")[0]);

      // Dirección
      this._sDireccion.getDireccionbyID(this.Subproyecto.idDireccion).subscribe(result => {
        let direccion = result;

        this._sComuna.getComunabyID(result.idComuna).subscribe(result => {
          let Comuna = result;

          this._sProvincia.getProvinciabyID(result.idProvincia).subscribe(result => {
            let provincia = result;

            this._sRegion.getRegionbyID(result.idRegion).subscribe(result => {
              let region = result;

              this._sPais.getPaisbyidPais(result.idPais).subscribe(result => {
                this.Paises = result;
                this.drdPais = region.idPais;

                this._sRegion.getRegionbyidPais(region.idPais).subscribe(result => {
                  this.Regiones = result;
                  this.drdRegion = region.idRegion;

                  this._sProvincia.getProvinciabyidRegion(region.idRegion).subscribe(result => {
                    this.Provincias = result;
                    this.drdProvincia = provincia.idProvincia;

                    this._sComuna.getComunabyidProvincia(provincia.idProvincia).subscribe(result => {
                      this.Comunas = result;
                      this.drdComuna = Comuna.idComuna;
                      this.Direccion = direccion;
                    });
                  });
                });
              });
            });
          });
        });
      });

      // Proyecto
      this._sProyecto.getProyectobyID(result.idProyecto).subscribe(result => {
        this.drdProyectoMatriz = result.idProyectoMatriz;

        this._sVis_ProyectoMatriz.getVis_ProyectoMatrizbyID(this.drdProyectoMatriz).subscribe(result => {
          this.Gerente = result.SubGerente;
        });

        this._sProyecto.getProyectobyidProyectoMatriz(this.drdProyectoMatriz).subscribe(result => {
          this.Proyectos = result;
        });

        // Cargar clientes del proyecto
        this._sUsuarioClienteProyecto.getUsuarioClienteProyectobyidProyecto(result.idProyecto).subscribe(clientes => {
          if (clientes && clientes.length > 0) {
            this.drdCliente1 = clientes[0].idUsuario;
            if (clientes.length > 1) {
              this.drdCliente2 = clientes[1].idUsuario;
            }
          }
        });

        this._svis_Proyectos.getVis_ProyectosbyidProyecto(result.idProyecto).subscribe(proyectosVista => {
          this.asignarCoordinadoresDesdeTexto(proyectosVista && proyectosVista[0] ? proyectosVista[0].Coordinadores : '');
        });
      });
    });

    this._PopUps.VerPopUpEditar();
  }

  OcultarPopUpEditar() {
    this.drdProyectoMatriz = 0;
    this.drdCliente1 = 0;
    this.drdCliente2 = 0;
    this.Subproyecto = new mSubProyecto(null, 0, 4, null, null, this.usuario.idUsuario, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 0, null, null, true, null, null, this.usuario.idUsuario, null);
    this._PopUps.OcultarPopUpEditar();
  }

  Confirmacion(i) {
    this._PopUps.Confirmacion();
    this.IndexEliminar = i;
  }

  OcultarConfirmacion() {
    this._PopUps.OcultarConfirmacion();
  }
}