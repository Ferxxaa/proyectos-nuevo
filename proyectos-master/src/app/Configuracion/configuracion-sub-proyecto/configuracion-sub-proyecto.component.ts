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

  CargaSubProyectos() {
    this.ResetForm();
    this.drdSubProyecto = 0;
    if (this.drdProyecto > 0) {
      this._sSubProyecto.getSubProyectobyidProyecto(this.drdProyecto).subscribe(
        result => {
          // Solo subproyectos en estado 3 o 4 (pendiente de validación)
          this.SubProyectos = result.filter(el => el.idEstadoProyecto == 3 || el.idEstadoProyecto == 4);
        }
      );
    }
  }

  CargaDatosSubProyecto() {
    this.ResetForm();
    if (this.drdSubProyecto > 0) {
      this._sSubProyecto.getSubProyectobyID(this.drdSubProyecto).subscribe(result => {
        this.SubProyecto = result;
        this.CargaFecha();
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
          // ✅ Ordenar por idEtapa: el orden de inserción en BD NO es confiable
          const ordenado: mDetalleSubProyecto[] = [...result].sort((a, b) => Number(a.idEtapa) - Number(b.idEtapa));

          this.lastUpdate = ordenado.map(element => ({ ...element }));

          this.Requerimiento = this.porEtapa(ordenado, 1) || this.Requerimiento;
          this.NBI1 = this.porEtapa(ordenado, 2) || this.NBI1;
          this.Factibilidad = this.porEtapa(ordenado, 3) || this.Factibilidad;
          this.NBI2 = this.porEtapa(ordenado, 4) || this.NBI2;
          this.Layout = this.porEtapa(ordenado, 5) || this.Layout;
          this.NBI3 = this.porEtapa(ordenado, 6) || this.NBI3;
          this.Proyecto = this.porEtapa(ordenado, 7) || this.Proyecto;
          this.NBI4 = this.porEtapa(ordenado, 8) || this.NBI4;
          this.Regularizacion = this.porEtapa(ordenado, 9) || this.Regularizacion;
          this.NBI5 = this.porEtapa(ordenado, 10) || this.NBI5;
          this.LicitacionAdjudicacion = this.porEtapa(ordenado, 11) || this.LicitacionAdjudicacion;
          this.NBI6 = this.porEtapa(ordenado, 12) || this.NBI6;
          this.Construccion = this.porEtapa(ordenado, 13) || this.Construccion;
          this.Habilitacion = this.porEtapa(ordenado, 14) || this.Habilitacion;
          this.NBI7 = this.porEtapa(ordenado, 15) || this.NBI7;
          this.Contratista = this.porEtapa(ordenado, 16) || this.Contratista;
          this.Cliente = this.porEtapa(ordenado, 17) || this.Cliente;
          this.Mantencion = this.porEtapa(ordenado, 18) || this.Mantencion;

          this.CargaFecha();
          this.SumaPonderado();
        }
        this.Loading = false;
      }
    );
  }

  private porEtapa(lista: mDetalleSubProyecto[], idEtapa: number): mDetalleSubProyecto {
    return lista.find(d => Number(d.idEtapa) === idEtapa);
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

  // ✅ Suma días sin mutar la fecha base y forzando número (evita "4" string concatenado)
  private sumarDias(base: Date, dias: any): Date {
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + (Number(dias) || 0));
    return d;
  }

  CargaFecha() {
    if (!this.SubProyecto || !this.SubProyecto.fechaInicio) {
      return;
    }

    // Cada tramo: NBI previo (espera) + etapa. Índice = columna de fechas en la tabla.
    const tramos: Array<{ nbi: mDetalleSubProyecto, etapa: mDetalleSubProyecto }> = [
      { nbi: null, etapa: this.Requerimiento },               // 0
      { nbi: this.NBI1, etapa: this.Factibilidad },           // 1
      { nbi: this.NBI2, etapa: this.Layout },                 // 2
      { nbi: this.NBI3, etapa: this.Proyecto },               // 3
      { nbi: this.NBI4, etapa: this.Regularizacion },         // 4
      { nbi: this.NBI5, etapa: this.LicitacionAdjudicacion }, // 5
      { nbi: this.NBI6, etapa: this.Construccion },           // 6
      { nbi: null, etapa: this.Habilitacion },                // 7
      { nbi: this.NBI7, etapa: this.Contratista },            // 8
      { nbi: null, etapa: this.Cliente },                     // 9
      { nbi: null, etapa: this.Mantencion }                   // 10
    ];

    let cursor = new Date(this.SubProyecto.fechaInicio);

    tramos.forEach((t, i) => {
      const inicio = this.sumarDias(cursor, t.nbi ? t.nbi.duracion : 0);
      const termino = this.sumarDias(inicio, t.etapa.duracion);
      this.Inicios[i] = inicio;
      this.Terminos[i] = termino;
      cursor = termino;
    });
  }

  SumaPonderado() {
    this.sumPonderado = this.Requerimiento.ponderado + this.Factibilidad.ponderado + this.Layout.ponderado + this.Proyecto.ponderado + this.Regularizacion.ponderado + this.LicitacionAdjudicacion.ponderado + this.Construccion.ponderado + this.Habilitacion.ponderado + this.Contratista.ponderado + this.Cliente.ponderado + this.Mantencion.ponderado;
  }

  AsignaSPaDetalle() {
    this.detalleToArray().forEach(d => d.idSubProyecto = this.drdSubProyecto);
  }

  //*************************************************** CRUD ***************************************************

  // ✅ Guarda uno tras otro (en orden de etapa), no los 18 en paralelo
  private guardarSecuencial(detalles: mDetalleSubProyecto[], esNuevo: boolean): Promise<any> {
    return detalles.reduce((p: Promise<any>, d) => p.then(() => esNuevo
      ? this._sDetalleSubProyecto.postAddDetalleSubProyecto(d)
      : this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(d)
    ), Promise.resolve());
  }

  Agregar(Form) {
    this.texto = "";
    this.msg = false;
    this.Loading = true;

    const detalles = this.detalleToArray();
    const esNuevo = this.Requerimiento.idDetalleSubProyecto === null;

    if (esNuevo) {
      this.sendMailCreacion(detalles);
    } else {
      this.actualizaSubProyecto(this.SubProyecto);
      this.sendMailEditar(this.lastUpdate, detalles);
    }

    this.guardarSecuencial(detalles, esNuevo)
      .then(() => {
        this.texto = esNuevo ? "Configuración creada de forma exitosa" : "Configuracion actualizada de forma exitosa";
        this.msg = true;
        this.ResetDrd();
        this.ResetForm();
        this.Loading = false;
      })
      .catch(err => {
        console.error('Error guardando detalle subproyecto', err);
        this.texto = "Ocurrió un error al guardar la configuración";
        this.msg = true;
        this.Loading = false;
      });
  }

  actualizaSubProyecto(subProyecto) {
    subProyecto.ponderadoValidado = false;
    subProyecto.presupuestoValidado = false;
    subProyecto.ritmoValidado = false;
    subProyecto.idEstadoProyecto = 4; // Pasa a "pendiente de validación"

    this._sSubProyecto.postUpdDelSubProyecto(subProyecto)
      .then(arg => console.log(subProyecto));
  }

  detalleToArray(): mDetalleSubProyecto[] {
    return [
      this.Requerimiento, this.NBI1, this.Factibilidad, this.NBI2, this.Layout, this.NBI3, this.Proyecto, this.NBI4, this.Regularizacion,
      this.NBI5, this.LicitacionAdjudicacion, this.NBI6, this.Construccion, this.Habilitacion, this.NBI7, this.Contratista, this.Cliente, this.Mantencion
    ];
  }

  private estiloCorreo(): string {
    return `<html>
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
  }

  sendMailEditar(last, nuevo) {
    const linkValidacion = `http://proyectos.trazas-nbi.com/Configuracion-ValidacionSubProyecto?subproyecto=${this.drdSubProyecto}&autoselect=true`;
    let msj: string = this.estiloCorreo();

    msj += `
    Estimado Usuario,
      Informamos a ud que se ha realizado una modificación a la configuracion de los ritmos del subproyecto: <b>${this.SubProyecto.nombreSubProyecto}</b> con el siguiente formato:

      <div class='caja'>
      <h3>Registro antiguo</h3>`;
    msj += this.retTabla(last);
    msj += `</div>
      <div class='caja'>
      <h3>Registro nuevo</h3>`;
    msj += this.retTabla(nuevo);
    msj += `</div>
    <a href="${linkValidacion}" target="_blank">Validación de configuración</a>
    </body></html>`;

    let correoEnviar: mCorreo = new mCorreo("jolivares@trazas.cl", 'Cambio en la configuración', msj);
    this._sCorreo.postCorreo(correoEnviar).subscribe(res => { });
  }

  sendMailCreacion(nuevo) {
    const linkValidacion = `http://proyectos.trazas-nbi.com/Configuracion-ValidacionSubProyecto?subproyecto=${this.drdSubProyecto}&autoselect=true`;
    let msj: string = this.estiloCorreo();

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
    this._sCorreo.postCorreo(correoEnviar).subscribe(res => { });
  }

  // ✅ Mismo orden que detalleToArray() (idEtapa 1..18)
  retHeader(): string {
    return `
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
      <th style="background: #003366; color: #fff;">Regularización</th>
      <th style="background: #ccc; color: #000; width: 50px;">NBI 5</th>
      <th style="background: #4a5a6a; color: #fff;">Licitación Adjudicación</th>
      <th style="background: #ccc; color: #000; width: 50px;">NBI 6</th>
      <th style="background: #FFCC00; color: #fff;">Construcción</th>
      <th style="background: #FF9900; color: #fff;">Habilitación</th>
      <th style="background: #ccc; color: #000; width: 50px;">NBI 7</th>
      <th style="background: #FF3300; color: #fff;">Cierre contratista</th>
      <th style="background: #FF3300; color: #fff;">Cierre cliente</th>
      <th style="background: #FF3300; color: #fff;">Cierre mantención</th>
    </tr>
    `;
  }

  retTabla(tabla): string {
    const lista: mDetalleSubProyecto[] = [...(tabla || [])].sort((a, b) => Number(a.idEtapa) - Number(b.idEtapa));
    let msj = "<table style='border-collapse: collapse; border-spacing: 0'>";
    msj += this.retHeader();

    //Dias
    msj += `<tr><td>Dias</td>`;
    lista.forEach(element => { msj += `<td>${element.duracion}</td>`; });
    msj += `</tr>`;

    //Ponderado
    msj += `<tr><td>Ponderación</td>`;
    lista.forEach(element => { msj += `<td>${element.ponderado ? element.ponderado : ''}</td>`; });
    msj += `</tr>`;

    //Montos
    msj += `<tr><td>Presupuesto</td>`;
    lista.forEach(element => { msj += `<td>${element.presupuesto ? element.presupuesto : ''}</td>`; });
    msj += `</tr>`;

    msj += "</table>";
    return msj;
  }

}