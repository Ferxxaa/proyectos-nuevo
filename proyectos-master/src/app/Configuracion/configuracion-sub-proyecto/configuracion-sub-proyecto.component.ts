import { Component, OnInit } from '@angular/core';

//Share
import { PopUps } from '../../Share/PopUps';

//Model
import { mVis_ProyectosMatrizCoordinador } from '../../models/mVis_ProyectosMatrizCoordinador';
import { mProyecto } from '../../models/mProyecto';
import { mSubProyecto } from '../../models/mSubProyecto';
import { mDetalleSubProyecto } from '../../models/mDetalleSubProyecto';

//Servicios
import { sVis_ProyectosMatrizCoordinador } from '../../services/sVis_ProyectosMatrizCoordinador.service';
import { sProyecto } from '../../services/sProyecto.service';
import { sSubProyecto } from '../../services/sSubProyecto.service';
import { sDetalleSubProyecto } from '../../services/sDetalleSubProyecto.service';
import { sCorreo } from '../../services/Personalizados/sCorreo.service';
import { mCorreo } from '../../models/mCorreo';

declare var jQuery: any;
declare var $: any;

@Component({
  selector: 'app-configuracion-sub-proyecto',
  templateUrl: './configuracion-sub-proyecto.component.html',
  styleUrls: ['./configuracion-sub-proyecto.component.css'],
  providers: [
    sVis_ProyectosMatrizCoordinador,
    sProyecto,
    sSubProyecto,
    sDetalleSubProyecto,
    sCorreo
  ]
})
export class ConfiguracionSubProyectoComponent implements OnInit {

  //Select
  ProyectosMatriz: Array<mVis_ProyectosMatrizCoordinador>;
  Proyectos: Array<mProyecto>;
  SubProyectos: Array<mSubProyecto>;

  //Control
  drdProyectoMatriz;
  drdProyecto;
  drdSubProyecto;

  //Ponderado
  sumPonderado;

  //Objetos
  usuario: any;
  SubProyecto: mSubProyecto;
  Requerimiento: mDetalleSubProyecto;
  NBI1: mDetalleSubProyecto;
  Factibilidad: mDetalleSubProyecto;
  NBI2: mDetalleSubProyecto;
  Layout: mDetalleSubProyecto;
  NBI3: mDetalleSubProyecto;
  Proyecto: mDetalleSubProyecto;
  NBI4: mDetalleSubProyecto;
  Regularizacion: mDetalleSubProyecto;
  NBI5: mDetalleSubProyecto;
  LicitacionAdjudicacion: mDetalleSubProyecto;
  NBI6: mDetalleSubProyecto;
  Construccion: mDetalleSubProyecto;
  Habilitacion: mDetalleSubProyecto;
  NBI7: mDetalleSubProyecto;
  Contratista: mDetalleSubProyecto;
  Cliente: mDetalleSubProyecto;
  Mantencion: mDetalleSubProyecto;

  //TablaFechas
  Inicios: Array<any>;
  Terminos: Array<any>;

  //Loading
  Loading: boolean;
  LoadingTabla: boolean;

  //ValidacionUpd
  lastUpdate: mDetalleSubProyecto[];

  //PopUp
  texto: string;
  msg: boolean;

  constructor(
    private _sVis_ProyectosMatrizCoordinador: sVis_ProyectosMatrizCoordinador,
    private _sProyecto: sProyecto,
    private _sSubProyecto: sSubProyecto,
    private _sDetalleSubProyecto: sDetalleSubProyecto,
    private _sCorreo: sCorreo
  ) {

    this.texto = "";
    this.msg = false;

    this.ResetDrd();
    this.usuario = JSON.parse(localStorage.usuario);


    this.ResetForm();

    //Update
    this.lastUpdate = null;

    this.SubProyecto = new mSubProyecto(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
  }

  ngOnInit() {

    this._sVis_ProyectosMatrizCoordinador.getVis_ProyectosMatrizCoordinadorbyidUsuarioCoordinador(this.usuario.idUsuario).subscribe(
      result => {
        this.ProyectosMatriz = result;
      }
    );
  }

  CargaProyectos() {
    this.ResetForm();
    this.drdProyecto = 0;
    if (this.drdProyectoMatriz > 0) {
      this._sProyecto.getProyectobyidProyectoMatriz(this.drdProyectoMatriz).subscribe(
        result => {
          this.Proyectos = result;
        }
      );
    }

  }


  CargaDatosSubProyecto() {
    this.ResetForm();
    if (this.drdSubProyecto > 0) {
      this._sSubProyecto.getSubProyectobyID(this.drdSubProyecto).subscribe(result => {
        // console.log(result);
        this.SubProyecto = result; this.CargaFecha();
      });
      this.CargaDatosSP();
    }
  }

  CargaDatosSP() {
    this.Loading = true;
    this.ResetForm();
    this.AsignaSPaDetalle();
    this._sDetalleSubProyecto.getDetalleSubProyectobyidSubProyecto(this.drdSubProyecto).subscribe(
      result => {
        if (result.length > 0) {
          this.lastUpdate = [];
          // this.lastUpdate = [...result];
          result.forEach(element => {
            this.lastUpdate.push({ ...element })
          });
          // console.log(this.lastUpdate);

          console.log("Configuracion SubProyecto", this.lastUpdate);

          this.Requerimiento = result[0];
          this.NBI1 = result[1];
          this.Factibilidad = result[2];
          this.NBI2 = result[3];
          this.Layout = result[4];
          this.NBI3 = result[5];
          this.Proyecto = result[6];
          this.NBI4 = result[7];
          this.Regularizacion = result[8];
          this.NBI5 = result[9];
          this.LicitacionAdjudicacion = result[10];
          this.NBI6 = result[11];
          this.Construccion = result[12];
          this.Habilitacion = result[13];
          this.NBI7 = result[14];
          this.Contratista = result[15];
          this.Cliente = result[16];
          this.Mantencion = result[17];

          this.CargaFecha();
          this.SumaPonderado();
          this.Loading = false;
        }
      }
    );
  }

  private ResetForm() {
    this.sumPonderado = 0;

    this.Requerimiento = new mDetalleSubProyecto(null, null, 1, 0, 0, 0, true, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI1 = new mDetalleSubProyecto(null, null, 2, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Factibilidad = new mDetalleSubProyecto(null, null, 3, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI2 = new mDetalleSubProyecto(null, null, 4, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Layout = new mDetalleSubProyecto(null, null, 5, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI3 = new mDetalleSubProyecto(null, null, 6, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Proyecto = new mDetalleSubProyecto(null, null, 7, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI4 = new mDetalleSubProyecto(null, null, 8, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Regularizacion = new mDetalleSubProyecto(null, null, 9, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI5 = new mDetalleSubProyecto(null, null, 10, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.LicitacionAdjudicacion = new mDetalleSubProyecto(null, null, 11, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI6 = new mDetalleSubProyecto(null, null, 12, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Construccion = new mDetalleSubProyecto(null, null, 13, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Habilitacion = new mDetalleSubProyecto(null, null, 14, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI7 = new mDetalleSubProyecto(null, null, 15, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Contratista = new mDetalleSubProyecto(null, null, 16, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Cliente = new mDetalleSubProyecto(null, null, 17, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Mantencion = new mDetalleSubProyecto(null, null, 18, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);

    this.Inicios = [null, null, null, null, null, null, null, null, null, null, null, null];
    this.Terminos = [null, null, null, null, null, null, null, null, null, null, null, null];
  }

  private ResetDrd() {
    this.drdProyectoMatriz = 0;
    this.drdProyecto = 0;
    this.drdSubProyecto = 0;
  }

  CargaFecha() {
    for (let i = 0; i < 12; i++) {
      this.Inicios[i] = new Date(this.SubProyecto.fechaInicio);
      this.Terminos[i] = new Date(this.SubProyecto.fechaInicio);
    }
    //Requerimiento
    this.Terminos[0].setDate(this.Terminos[0].getDate() + this.Requerimiento.duracion);
    //Factibilidad
    this.Inicios[1].setFullYear(this.Terminos[0].getFullYear());
    this.Inicios[1].setMonth(this.Terminos[0].getMonth());
    this.Inicios[1].setDate(this.Terminos[0].getDate() + this.NBI1.duracion);

    this.Terminos[1].setFullYear(this.Inicios[1].getFullYear());
    this.Terminos[1].setMonth(this.Inicios[1].getMonth());
    this.Terminos[1].setDate(this.Inicios[1].getDate() + this.Factibilidad.duracion);
    //LayOut
    this.Inicios[2].setFullYear(this.Terminos[1].getFullYear());
    this.Inicios[2].setMonth(this.Terminos[1].getMonth());
    this.Inicios[2].setDate(this.Terminos[1].getDate() + this.NBI2.duracion);

    this.Terminos[2].setFullYear(this.Inicios[2].getFullYear());
    this.Terminos[2].setMonth(this.Inicios[2].getMonth());
    this.Terminos[2].setDate(this.Inicios[2].getDate() + this.Layout.duracion);
    //Proyecto
    this.Inicios[3].setFullYear(this.Terminos[2].getFullYear());
    this.Inicios[3].setMonth(this.Terminos[2].getMonth());
    this.Inicios[3].setDate(this.Terminos[2].getDate() + this.NBI3.duracion);

    this.Terminos[3].setFullYear(this.Inicios[3].getFullYear());
    this.Terminos[3].setMonth(this.Inicios[3].getMonth());
    this.Terminos[3].setDate(this.Inicios[3].getDate() + this.Proyecto.duracion);
    //Regularizacion
    this.Inicios[4].setFullYear(this.Terminos[3].getFullYear());
    this.Inicios[4].setMonth(this.Terminos[3].getMonth());
    this.Inicios[4].setDate(this.Terminos[3].getDate() + this.NBI4.duracion);

    this.Terminos[4].setFullYear(this.Inicios[4].getFullYear());
    this.Terminos[4].setMonth(this.Inicios[4].getMonth());
    this.Terminos[4].setDate(this.Inicios[4].getDate() + this.Regularizacion.duracion);
    //Licitación Adjudicación
    this.Inicios[5].setFullYear(this.Terminos[4].getFullYear());
    this.Inicios[5].setMonth(this.Terminos[4].getMonth());
    this.Inicios[5].setDate(this.Terminos[4].getDate() + this.NBI5.duracion);

    this.Terminos[5].setFullYear(this.Inicios[5].getFullYear());
    this.Terminos[5].setMonth(this.Inicios[5].getMonth());
    this.Terminos[5].setDate(this.Inicios[5].getDate() + this.LicitacionAdjudicacion.duracion);
    //Construcción
    this.Inicios[6].setFullYear(this.Terminos[5].getFullYear());
    this.Inicios[6].setMonth(this.Terminos[5].getMonth());
    this.Inicios[6].setDate(this.Terminos[5].getDate() + this.NBI6.duracion);

    this.Terminos[6].setFullYear(this.Inicios[6].getFullYear());
    this.Terminos[6].setMonth(this.Inicios[6].getMonth());
    this.Terminos[6].setDate(this.Inicios[6].getDate() + this.Construccion.duracion);
    //Habilitación
    this.Inicios[7].setFullYear(this.Terminos[6].getFullYear());
    this.Inicios[7].setMonth(this.Terminos[6].getMonth());
    this.Inicios[7].setDate(this.Terminos[6].getDate());

    this.Terminos[7].setFullYear(this.Inicios[7].getFullYear());
    this.Terminos[7].setMonth(this.Inicios[7].getMonth());
    this.Terminos[7].setDate(this.Inicios[7].getDate() + this.Habilitacion.duracion);
    //Cierre Contratista
    this.Inicios[8].setFullYear(this.Terminos[7].getFullYear());
    this.Inicios[8].setMonth(this.Terminos[7].getMonth());
    this.Inicios[8].setDate(this.Terminos[7].getDate() + this.NBI7.duracion);

    this.Terminos[8].setFullYear(this.Inicios[8].getFullYear());
    this.Terminos[8].setMonth(this.Inicios[8].getMonth());
    this.Terminos[8].setDate(this.Inicios[8].getDate() + this.Contratista.duracion);
    //Cierre Cliente
    this.Inicios[9].setFullYear(this.Terminos[8].getFullYear());
    this.Inicios[9].setMonth(this.Terminos[8].getMonth());
    this.Inicios[9].setDate(this.Terminos[8].getDate());

    this.Terminos[9].setFullYear(this.Inicios[9].getFullYear());
    this.Terminos[9].setMonth(this.Inicios[9].getMonth());
    this.Terminos[9].setDate(this.Inicios[9].getDate() + this.Cliente.duracion);
    //Cierre Mantención
    this.Inicios[10].setFullYear(this.Terminos[9].getFullYear());
    this.Inicios[10].setMonth(this.Terminos[9].getMonth());
    this.Inicios[10].setDate(this.Terminos[9].getDate());

    this.Terminos[10].setFullYear(this.Inicios[10].getFullYear());
    this.Terminos[10].setMonth(this.Inicios[10].getMonth());
    this.Terminos[10].setDate(this.Inicios[10].getDate() + this.Mantencion.duracion);
  }

  SumaPonderado() {
    this.sumPonderado = this.Requerimiento.ponderado + this.Factibilidad.ponderado + this.Layout.ponderado + this.Proyecto.ponderado + this.Regularizacion.ponderado + this.LicitacionAdjudicacion.ponderado + this.Construccion.ponderado + this.Habilitacion.ponderado + this.Contratista.ponderado + this.Cliente.ponderado + this.Mantencion.ponderado;
  }

  AsignaSPaDetalle() {
    this.Requerimiento.idSubProyecto = this.drdSubProyecto;
    this.NBI1.idSubProyecto = this.drdSubProyecto;
    this.Factibilidad.idSubProyecto = this.drdSubProyecto;
    this.NBI2.idSubProyecto = this.drdSubProyecto;
    this.Layout.idSubProyecto = this.drdSubProyecto;
    this.NBI3.idSubProyecto = this.drdSubProyecto;
    this.Proyecto.idSubProyecto = this.drdSubProyecto;
    this.NBI4.idSubProyecto = this.drdSubProyecto;
    this.Regularizacion.idSubProyecto = this.drdSubProyecto;
    this.NBI5.idSubProyecto = this.drdSubProyecto;
    this.LicitacionAdjudicacion.idSubProyecto = this.drdSubProyecto;
    this.NBI6.idSubProyecto = this.drdSubProyecto;
    this.Construccion.idSubProyecto = this.drdSubProyecto;
    this.Habilitacion.idSubProyecto = this.drdSubProyecto;
    this.NBI7.idSubProyecto = this.drdSubProyecto;
    this.Contratista.idSubProyecto = this.drdSubProyecto;
    this.Cliente.idSubProyecto = this.drdSubProyecto;
    this.Mantencion.idSubProyecto = this.drdSubProyecto;
  }

  //*************************************************** CRUD ***************************************************

  Agregar(Form) {
    this.texto = "";
    this.msg = false;

    this.Loading = true;
    // console.log(this.SubProyecto);

    if (this.Requerimiento.idDetalleSubProyecto === null) {
      this.sendMailCreacion(this.detalleToArray());
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.Requerimiento).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.NBI1).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.Factibilidad).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.NBI2).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.Layout).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.NBI3).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.Proyecto).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.NBI4).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.Regularizacion).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.NBI5).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.LicitacionAdjudicacion).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.NBI6).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.Construccion).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.Habilitacion).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.NBI7).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.Contratista).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.Cliente).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postAddDetalleSubProyecto(this.Mantencion).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this.texto = "Configuración creada de forma exitosa";
      this.msg = true;
    } else {
      this.actualizaSubProyecto(this.SubProyecto);
      this.sendMailEditar(this.lastUpdate, this.detalleToArray());
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.Requerimiento).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.NBI1).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.Factibilidad).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.NBI2).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.Layout).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.NBI3).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.Proyecto).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.NBI4).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.Regularizacion).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.NBI5).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.LicitacionAdjudicacion).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.NBI6).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.Construccion).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.Habilitacion).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.NBI7).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.Contratista).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.Cliente).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.Mantencion).success(result => { this.ResetDrd(); this.ResetForm(); this.Loading = false; });
      this.texto = "Configuracion actualizada de forma exitosa";
      this.msg = true;
    }
  }

  actualizaSubProyecto(subProyecto) {
  subProyecto.ponderadoValidado = false;
  subProyecto.presupuestoValidado = false;
  subProyecto.ritmoValidado = false;
  subProyecto.idEstadoProyecto = 4; // ✅ Pasa a "pendiente de validación"

  this._sSubProyecto.postUpdDelSubProyecto(subProyecto)
    .then(arg => console.log(subProyecto));
}

  detalleToArray(): mDetalleSubProyecto[] {
    let detalle: mDetalleSubProyecto[];
    detalle = [];
    detalle.push(this.Requerimiento, this.NBI1, this.Factibilidad, this.NBI2, this.Layout, this.NBI3, this.Proyecto, this.NBI4, this.Regularizacion,
      this.NBI5, this.LicitacionAdjudicacion, this.NBI6, this.Construccion, this.Habilitacion, this.NBI7, this.Contratista, this.Cliente, this.Mantencion);
    return detalle;
  }

  sendMailEditar(last, nuevo) {
    const linkValidacion = `http://proyectos.trazas-nbi.com/Configuracion-ValidacionSubProyecto?subproyecto=${this.drdSubProyecto}&autoselect=true`;
    let msj: string = null;
    msj = `<html>
    <head>
      <style>
      th{
        vertical-align: middle !important;
        text-align: center;
        padding: 0.25rem;
        font-weight: 500 !important;
      }
      th,td{
        border: 1px solid #ddd;
      }
      .caja{
        border: 1px solid #ccc;
        margin-bottom: 10px;
        padding: 10px;
      }
      h3 {
        margin-top: 0px;
      }
      </style>
    </head>
    <body>`

    //////////////////////////////////////////////////// Cuerpo del mensaje
    msj += `
    Estimado Usuario,
      Informamos a ud que se ha realizado una modificación a la configuracion de los ritmos del subproyecto: <b>${this.SubProyecto.nombreSubProyecto}</b> con el siguiente formato:
      
      <div class='caja'>
      <h3>Registro antiguo</h3>`
    msj += this.retTabla(last);
    msj += `</div>
      <div class='caja'>
      <h3>Registro nuevo</h3>`
    msj += this.retTabla(nuevo);
    msj += `</div>
    <a href="${linkValidacion}" target="_blank">Validación de configuración</a>
    </body></html>`
    // console.log(msj);
    let correoEnviar: mCorreo = new mCorreo("jolivares@trazas.cl", 'Cambio en la configuración', msj)

    this._sCorreo.postCorreo(correoEnviar).subscribe(res => {
      // console.log(res);
    });
  }

  sendMailCreacion(nuevo) {
    const linkValidacion = `http://proyectos.trazas-nbi.com/Configuracion-ValidacionSubProyecto?subproyecto=${this.drdSubProyecto}&autoselect=true`;
    let msj: string = null;
    msj = `<html>
    <head>
      <style>
      th{
        vertical-align: middle !important;
        text-align: center;
        padding: 0.25rem;
        font-weight: 500 !important;
      }
      th,td{
        border: 1px solid #ddd;
      }
      .caja{
        border: 1px solid #ccc;
        margin-bottom: 10px;
        padding: 10px;
      }
      h3 {
        margin-top: 0px;
      }
      </style>
    </head>
    <body>`;

    msj += `
    Estimado Usuario,
      Informamos a ud que se ha creado la configuracion de ritmos del subproyecto: <b>${this.SubProyecto.nombreSubProyecto}</b> con el siguiente formato:
      
      <div class='caja'>
      <h3>Configuración registrada</h3>`;
    msj += this.retTabla(nuevo);
    msj += `</div>
    <a href="${linkValidacion}" target="_blank">Validación de configuración</a>
    </body></html>`;

    let correoEnviar: mCorreo = new mCorreo("jolivares@trazas.cl", 'Creación de configuración', msj);

    this._sCorreo.postCorreo(correoEnviar).subscribe(res => {
      // console.log(res);
    });
  }

  retHeader(): string {
    let msj: string;
    msj = `
    <tr>
      <th style="background-color:transparent;border-top-style: hidden; border-left-style:hidden"></th>
      <th style="background: #A7C69F; color: #fff;">Requerimiento</th>
      <th style="background: #ccc; color: #000; width: 50px;">NBI 1</th>
      <th style="background: #669933; color: #fff;">Factibilidad</th>
      <th style="background: #ccc; color: #000; width: 50px;">NBI 2</th>
      <th style="background: #0099CC; color: #fff;">Layout</th>
      <th style="background: #ccc; color: #000; width: 50px;">NBI 3</th>
      <th style="background: #006699; color: #fff;">Proyecto</th>
      <th style="background: #ccc; color: #000; width: 50px;">NBI 4</th>
      <th style="background: #003366; color: #fff;">Licitación</th>
      <th style="background: #003366; color: #fff;">Adjudicación</th>
      <th style="background: #ccc; color: #000; width: 50px;">NBI 5</th>
      <th style="background: #FFCC00; color: #fff;">Construcción</th>
      <th style="background: #FF9900; color: #fff;">Habilitación</th>
      <th style="background: #ccc; color: #000; width: 50px;">NBI 6</th>
      <th style="background: #FF3300; color: #fff;">Cierre contratista</th>
      <th style="background: #FF3300; color: #fff;">Cierre cliente</th>
      <th style="background: #FF3300; color: #fff;">Cierre mantención</th>
      <th style="background: #ccc; color: #000; width: 50px;">NBI 7</th>
    </tr>
    `
    return msj
  }

  retTabla(tabla): string {
    let msj: string;
    msj = "<table style='border-collapse: collapse; border-spacing: 0'>"
    msj += this.retHeader();
    //Dias
    msj += `<tr>
      <td>Dias</td>`
    tabla.forEach(element => {
      msj += `
      <td>${element.duracion}</td>`
    });
    msj += `
    </tr>`

    //Ponderado
    msj += `
    <tr>
      <td>Ponderación</td>`
    tabla.forEach(element => {
      msj += `
      <td>${element.ponderado ? element.ponderado : ''}</td>`
    });
    msj += `
    </tr>`

    //Montos
    msj += `
    <tr>
      <td>Presupuesto</td>`
    tabla.forEach(element => {
      msj += `
      <td>${element.presupuesto ? element.presupuesto : ''}</td>`
    });
    msj += `
    </tr>`

    msj += "</table>"

    return msj
  }

  CargaSubProyectos() {
  this.ResetForm();
  this.drdSubProyecto = 0;
  if (this.drdProyectoMatriz > 0) {
    this._sSubProyecto.getSubProyectobyidProyecto(this.drdProyecto).subscribe(
      result => {
        // ✅ TEMPORAL: Ver todos los estados disponibles
        console.log('📋 Todos los subproyectos y sus estados:');
        result.forEach(sp => {
          console.log(`  - "${sp.nombreSubProyecto}" → idEstadoProyecto: ${sp.idEstadoProyecto}`);
        });

        // En el CargaSubProyectos() duplicado que está al final del archivo (el que tiene el console.log temporal)
this.SubProyectos = result.filter(el => el.idEstadoProyecto == 3 || el.idEstadoProyecto == 4);
      }
    )
  }
}

}

