import { Component, OnInit } from '@angular/core';
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
export class ProyectoComponent implements OnInit {

  //Select
  ProyectosMatriz: Array<mVis_DirectorProyectoMatriz>;
  Clientes: Array<any>;
  Paises: Array<mPais>;
  Regiones: Array<mRegion>;
  Coordinadores: Array<any>;

  //Controles
  drdProyectoMatriz;
  drdPais;
  drdRegion;
  clientesList: number[] = [0, 0];
  coordinadoresList: number[] = [0, 0, 0, 0, 0];
  clientesExtra: number[] = [];
  coordinadoresExtra: number[] = [];
  fechaInicioInput: Date;
  fechaTerminoInput: Date;

  //Tabla
  dataSource: MatTableDataSource<mTabla_Proyectos>;

  //Objetos
  Proyecto: mProyecto;
  usuario: any;

  //Loading
  Loading: boolean;
  LoadingTabla: boolean;

  //Indices
  IndexUpdate: number;
  IndexEliminar: number;

  //PopUp
  texto: string;
  msg: boolean;

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
    this.clientesList = [0, 0];
    this.coordinadoresList = [0, 0, 0, 0, 0];
    this.clientesExtra = [];
    this.coordinadoresExtra = [];
    this.texto = "";
    this.msg = false;
    this.fechaInicioInput = null;
    this.fechaTerminoInput = null;
    this.usuario = JSON.parse(localStorage.usuario);
    this.Proyecto = new mProyecto(null, 0, "", this.usuario.idUsuario, null, false, null, null, null, 4, 0, null, null, null, null, true, null, null, this.usuario.idUsuario, null);
    this.Loading = false;
    this.LoadingTabla = true;
  }

  ngOnInit() {
    this._sVis_DirectorProyectoMatriz.getVis_DirectorProyectoMatriz().subscribe(
      result => {
        const matricesActivas = (result || []).filter(element => element.activo !== false);
        const matricesUnicas = new Map<number, mVis_DirectorProyectoMatriz>();
        matricesActivas.forEach(element => {
          if (!matricesUnicas.has(element.idProyectoMatriz)) {
            matricesUnicas.set(element.idProyectoMatriz, element);
          }
        });
        this.ProyectosMatriz = Array.from(matricesUnicas.values());
      }
    );

    this._sPais.getPais().subscribe(
      result => {
        this.Paises = result;
      }
    );

    this.Clientes = [];
    this._sUsuario.getUsuario().subscribe(
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

    this.Coordinadores = [];
    this._sUsuario.getUsuario().subscribe(
      usuarios => {
        usuarios.forEach(usuario => {
          this._sPersona.getPersonabyID(usuario.idPersona).subscribe(persona => {
            this.Coordinadores.push({
              idUsuario: usuario.idUsuario,
              nombre: persona.nombre,
              paterno: persona.paterno,
              materno: persona.materno
            });
          });
        });
      }
    );

    this.Reset();
    this.Recarga();
  }

  onFechaInicioChange(event: any) {
    const date = event.value as Date;
    if (date) {
      this.Proyecto.fechaInicio = this.formatDate(date);
    } else {
      this.Proyecto.fechaInicio = null;
    }
  }

  onFechaTerminoChange(event: any) {
    const date = event.value as Date;
    if (date) {
      this.Proyecto.fechaTermino = this.formatDate(date);
    } else {
      this.Proyecto.fechaTermino = null;
    }
  }

  private formatDate(date: Date): string {
    const dia = ('0' + date.getDate()).slice(-2);
    const mes = ('0' + (date.getMonth() + 1)).slice(-2);
    const anio = date.getFullYear();
    return `${anio}-${mes}-${dia}T00:00:00`;
  }

  paisChange() {
    this._sRegion.getRegionbyidPais(this.drdPais).subscribe(
      result => {
        this.Regiones = result;
      }
    );
  }

  asignaFechaInicio() {
    let dia = $("#txtInicio").val().split("/")[0];
    let mes = $("#txtInicio").val().split("/")[1];
    let agno = $("#txtInicio").val().split("/")[2];
    this.Proyecto.fechaInicio = agno + "-" + mes + "-" + dia + "T00:00:00";
  }

  asignaFechaTermino() {
    let dia = $("#txtTermino").val().split("/")[0];
    let mes = $("#txtTermino").val().split("/")[1];
    let agno = $("#txtTermino").val().split("/")[2];
    this.Proyecto.fechaTermino = agno + "-" + mes + "-" + dia + "T00:00:00";
  }

  // *************************************************** CRUD ***************************************************

  Agregar(Form) {
    $("body").attr("style", "overflow-y: hidden;");
    this.texto = "";
    this.msg = false;
    this.Loading = true;
    this._sProyecto.postAddProyecto(this.Proyecto).success(result => {
      this.agregarClientesSecuencial(result.idProyecto, this.obtenerClientesSeleccionados(), () => {
        this.agregarCoordinadoresSecuencial(result.idProyecto, this.obtenerCoordinadoresSeleccionados(), () => {
          this.Recarga();
          setTimeout(() => {
            Form.reset();
            this.Reset();
            this.Loading = false;
            this.texto = "Proyecto creado de forma correcta";
            this.msg = true;
            if (typeof Swal !== 'undefined') {
              Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Proyecto creado correctamente',
                confirmButtonText: 'Aceptar'
              });
            }
          }, 0);
        });
      });
    });
  }

  private Reset() {
    this.Proyecto = new mProyecto(null, 0, "", this.usuario.idUsuario, null, false, null, null, null, 4, 1, null, null, null, 0, true, null, null, this.usuario.idUsuario, null);
    this.drdProyectoMatriz = 0;
    this.clientesList = [0, 0];
    this.coordinadoresList = [0, 0, 0, 0, 0];
    this.clientesExtra = [];
    this.coordinadoresExtra = [];
    this.drdPais = 0;
    this.drdRegion = 0;
    this.fechaInicioInput = null;
    this.fechaTerminoInput = null;
    $("#txtInicio").val("");
    $("#txtTermino").val("");
  }

  private Recarga() {
    this._sTabla_Proyectos.getTabla_ProyectosbyidUsuarioDirector(this.usuario.idUsuario).subscribe(result => {
      this.dataSource.data = result;
      this.LoadingTabla = false;
    }, error => {
      console.log(error);
      this.LoadingTabla = false;
    });
  }

  Actualizar(EForm) {
    $("body").attr("style", "overflow-y: hidden;");
    this.texto = "";
    this.msg = false;
    this.Loading = true;
    let idproyecto = this.Proyecto.idProyecto;
    this._sProyecto.postUpdDelProyecto(this.Proyecto).success(result => {
      this.desactivarClientesSecuencial(idproyecto, () => {
        this.desactivarCoordinadoresSecuencial(idproyecto, () => {
          this.agregarClientesSecuencial(idproyecto, this.obtenerClientesSeleccionados(), () => {
            this.agregarCoordinadoresSecuencial(idproyecto, this.obtenerCoordinadoresSeleccionados(), () => {
              this.Recarga();
              this.OcultarPopUpEditar();
              setTimeout(() => {
                this.Proyecto = new mProyecto(null, 0, "", this.usuario.idUsuario, null, false, null, null, null, 4, 1, null, null, null, 0, true, null, null, this.usuario.idUsuario, null);
                this.drdProyectoMatriz = 0;
                this.drdPais = 0;
                this.drdRegion = 0;
                this.clientesList = [0, 0];
                this.coordinadoresList = [0, 0, 0, 0, 0];
                this.clientesExtra = [];
                this.coordinadoresExtra = [];
                this.fechaInicioInput = null;
                this.fechaTerminoInput = null;
                $("#txtInicio").val("");
                $("#txtTermino").val("");
                this.Loading = false;
                this.texto = "Proyecto actualizado de forma correcta";
                this.msg = true;
              }, 0);
            });
          });
        });
      });
    });
  }

  private obtenerClientesSeleccionados(): number[] {
    const ids = [...this.clientesList]
      .concat(this.clientesExtra || [])
      .map(valor => Number(valor))
      .filter(valor => valor > 0);
    return ids.filter((valor, indice, arr) => arr.indexOf(valor) === indice);
  }

  private obtenerCoordinadoresSeleccionados(): number[] {
    const ids = [...this.coordinadoresList]
      .concat(this.coordinadoresExtra || [])
      .map(valor => Number(valor))
      .filter(valor => valor > 0);
    return ids.filter((valor, indice, arr) => arr.indexOf(valor) === indice);
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
      error => {
        console.log(error);
        done();
      }
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
      error => {
        console.log(error);
        done();
      }
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

  AgregarCliente() {
    this.clientesExtra.push(0);
  }

  QuitarCliente(index?: number) {
    if (!this.clientesExtra.length) return;
    const indice = (index === undefined || index === null) ? this.clientesExtra.length - 1 : index;
    this.clientesExtra.splice(indice, 1);
  }

  AgregarCoordinador() {
    this.coordinadoresExtra.push(0);
  }

  QuitarCoordinador(index?: number) {
    if (!this.coordinadoresExtra.length) return;
    const indice = (index === undefined || index === null) ? this.coordinadoresExtra.length - 1 : index;
    this.coordinadoresExtra.splice(indice, 1);
  }

  Eliminar() {
    $("body").attr("style", "overflow-y: hidden;");
    this.texto = "";
    this.msg = false;
    this.Loading = true;
    this.Proyecto.idProyecto = this.dataSource.data[this.IndexEliminar].idProyecto;
    this.Proyecto.idUsuarioRemovedor = this.usuario.idUsuario;

    this._sProyecto.postUpdDelProyecto(this.Proyecto).success(result => {
      this._PopUps.OcultarConfirmacion();
      this._sTabla_Proyectos.getTabla_ProyectosbyidUsuarioDirector(this.usuario.idUsuario).subscribe(result => {
        this.dataSource.data = result;
      });
      this.Loading = false;
      this.texto = "Proyecto eliminado de forma correcta";
      this.msg = true;
    }).error(error => {
      console.log(error);
      this.Loading = false;
    });

    this._sUsuarioClienteProyecto.getUsuarioClienteProyectobyidProyecto(this.Proyecto.idProyecto).subscribe(
      result => {
        result.forEach(element => {
          element.idUsuarioRemovedor = this.usuario.idUsuario;
          this._sUsuarioClienteProyecto.postUpdDelUsuarioClienteProyecto(element);
          this.Recarga();
        });
      }
    );

    this._sCoordinadorProyecto.getCoordinadorProyectobyidProyecto(this.Proyecto.idProyecto).subscribe(
      result => {
        result.forEach(element => {
          element.idUsuarioRemovedor = this.usuario.idUsuario;
          this._sCoordinadorProyecto.postUpdDelCoordinadorProyecto(element);
          this.Recarga();
        });
        this.Proyecto = new mProyecto(null, 0, "", this.usuario.idUsuario, null, false, null, null, null, 4, 0, null, null, null, null, true, null, null, this.usuario.idUsuario, null);
      }
    );
  }

  // *************************************************** PopUP ***************************************************

  Editar(i: number) {
    this.Reset();
    const idProyecto = this.dataSource.data[i].idProyecto;
    this.IndexUpdate = i;

    this._sProyecto.getProyectobyID(idProyecto).subscribe(result => {
      this.Proyecto = result;
      console.log('>>> ID PROYECTO:', idProyecto);
      if (result.fechaInicio) {
        this.fechaInicioInput = new Date(result.fechaInicio.split("T")[0] + "T12:00:00");
      }
      if (result.fechaTermino) {
        this.fechaTerminoInput = new Date(result.fechaTermino.split("T")[0] + "T12:00:00");
      }
      if (result.idRegion) {
        this._sRegion.getRegionbyID(result.idRegion).subscribe(region => {
          this.drdPais = region.idPais;
          this.paisChange();
        });
      }

      this._sUsuarioClienteProyecto.getUsuarioClienteProyectobyidProyecto(idProyecto).subscribe(
        clientes => {
          console.log('>>> CLIENTES:', clientes);
          this.clientesList = [0, 0];
          this.clientesList[0] = clientes[0] ? clientes[0].idUsuarioCliente : 0;
          this.clientesList[1] = clientes[1] ? clientes[1].idUsuarioCliente : 0;
          this.clientesExtra = (clientes || []).slice(2).map(c => c.idUsuarioCliente || 0);

          this._sCoordinadorProyecto.getCoordinadorProyectobyidProyecto(idProyecto).subscribe(
            coords => {
              console.log('>>> COORDINADORES:', coords);
              this.coordinadoresList = [0, 0, 0, 0, 0];
              this.coordinadoresList[0] = coords[0] ? coords[0].idUsuarioCoordinador : 0;
              this.coordinadoresList[1] = coords[1] ? coords[1].idUsuarioCoordinador : 0;
              this.coordinadoresList[2] = coords[2] ? coords[2].idUsuarioCoordinador : 0;
              this.coordinadoresList[3] = coords[3] ? coords[3].idUsuarioCoordinador : 0;
              this.coordinadoresList[4] = coords[4] ? coords[4].idUsuarioCoordinador : 0;
              this.coordinadoresExtra = (coords || []).slice(5).map(c => c.idUsuarioCoordinador || 0);

              // Abrir modal solo cuando todos los datos están listos
              this._PopUps.VerPopUpEditar();
            },
            error => console.error('>>> ERROR COORDINADORES:', error)
          );
        },
        error => console.error('>>> ERROR CLIENTES:', error)
      );
    });
  }

  OcultarPopUpEditar() {
    this.IndexUpdate = 0;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
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