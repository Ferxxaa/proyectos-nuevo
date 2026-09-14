import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { mDetalleSubProyecto } from '../../models/mDetalleSubProyecto';
import { mSubProyecto } from '../../models/mSubProyecto';

@Component({
  selector: 'app-tabla-header',
  templateUrl: './tabla-header.component.html',
  styleUrls: ['./tabla-header.component.css']
})
export class TablaHeaderComponent implements OnInit {

  //Objetos
  @Input() SubProyecto: mSubProyecto;
  @Input() result;
  @Input() usuario: any;

  @Output() emitEtapa = new EventEmitter();
  @Output() firstEtapa = new EventEmitter();

  Requerimiento: mDetalleSubProyecto;
  NBI1: mDetalleSubProyecto;
  Factibilidad: mDetalleSubProyecto;
  NBI2: mDetalleSubProyecto;
  Layout: mDetalleSubProyecto;
  NBI3: mDetalleSubProyecto;
  Proyecto: mDetalleSubProyecto;
  NBI4: mDetalleSubProyecto;
  Licitacion: mDetalleSubProyecto;
  Adjudicacion: mDetalleSubProyecto;
  NBI5: mDetalleSubProyecto;
  Construccion: mDetalleSubProyecto;
  Habilitacion: mDetalleSubProyecto;
  NBI6: mDetalleSubProyecto;
  Contratista: mDetalleSubProyecto;
  Cliente: mDetalleSubProyecto;
  Mantencion: mDetalleSubProyecto;
  NBI7: mDetalleSubProyecto;

  //TablaFechas
  Terminos: Array<any>;

  constructor() {
    //Reset Objetos
    this.Terminos = [null, null, null, null, null, null, null, null, null, null, null];
  }

  ngOnInit() {
    // console.log(this.result);

    this.setValoresIniciales();
    this.AsignaValorEtapas();

    //Requerimiento
    for (let i = 0; i < 11; i++) {
      this.Terminos[i] = new Date(this.SubProyecto.fechaInicio);
    }
    this.Terminos[0].setDate(this.Terminos[0].getDate() + this.Requerimiento.duracion);
    //Factibilidad
    this.Terminos[1] = this.retDate(this.Terminos[0], this.NBI1.duracion, this.Factibilidad.duracion);
    //LayOut
    this.Terminos[2] = this.retDate(this.Terminos[1], this.NBI2.duracion, this.Layout.duracion);
    //Proyecto
    this.Terminos[3] = this.retDate(this.Terminos[2], this.NBI3.duracion, this.Proyecto.duracion);
    //Licitacion
    this.Terminos[4] = this.retDate(this.Terminos[3], this.NBI4.duracion, this.Licitacion.duracion);
    //Adjudicación
    this.Terminos[5] = this.retDate(this.Terminos[4], 0, this.Adjudicacion.duracion);
    //Construcción
    this.Terminos[6] = this.retDate(this.Terminos[5], this.NBI5.duracion, this.Construccion.duracion);
    //Habilitación
    this.Terminos[7] = this.retDate(this.Terminos[6], 0, this.Habilitacion.duracion);
    //Cierre Contratista
    this.Terminos[8] = this.retDate(this.Terminos[7], this.NBI6.duracion, this.Contratista.duracion);
    //Cierre Cliente
    this.Terminos[9] = this.retDate(this.Terminos[8], 0, this.Cliente.duracion);
    //Cierre Mantención
    this.Terminos[10] = this.retDate(this.Terminos[9], 0, this.Mantencion.duracion);
  }

  private AsignaValorEtapas() {
    this.Requerimiento = this.result[0];
    this.firstEtapa.emit(this.Requerimiento);
    this.NBI1 = this.result[1];
    this.Factibilidad = this.result[2];
    this.NBI2 = this.result[3];
    this.Layout = this.result[4];
    this.NBI3 = this.result[5];
    this.Proyecto = this.result[6];
    this.NBI4 = this.result[7];
    this.Licitacion = this.result[8];
    this.Adjudicacion = this.result[9];
    this.NBI5 = this.result[10];
    this.Construccion = this.result[11];
    this.Habilitacion = this.result[12];
    this.NBI6 = this.result[13];
    this.Contratista = this.result[14];
    this.Cliente = this.result[15];
    this.Mantencion = this.result[16];
    this.NBI7 = this.result[17];
  }

  setValoresIniciales() {
    this.Requerimiento = new mDetalleSubProyecto(null, null, 1, 0, 0, 0, true, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI1 = new mDetalleSubProyecto(null, null, 2, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Factibilidad = new mDetalleSubProyecto(null, null, 3, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI2 = new mDetalleSubProyecto(null, null, 4, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Layout = new mDetalleSubProyecto(null, null, 5, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI3 = new mDetalleSubProyecto(null, null, 6, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Proyecto = new mDetalleSubProyecto(null, null, 7, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI4 = new mDetalleSubProyecto(null, null, 8, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Licitacion = new mDetalleSubProyecto(null, null, 9, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Adjudicacion = new mDetalleSubProyecto(null, null, 10, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI5 = new mDetalleSubProyecto(null, null, 11, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Construccion = new mDetalleSubProyecto(null, null, 12, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Habilitacion = new mDetalleSubProyecto(null, null, 13, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI6 = new mDetalleSubProyecto(null, null, 14, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Contratista = new mDetalleSubProyecto(null, null, 15, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Cliente = new mDetalleSubProyecto(null, null, 16, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Mantencion = new mDetalleSubProyecto(null, null, 17, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI7 = new mDetalleSubProyecto(null, null, 18, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
  }

  retDate(fechaOrigen: Date, duracionNBI: number, duracionEtapa: number) {
    let fecha: Date = new Date();
    fecha.setFullYear(fechaOrigen.getFullYear());
    fecha.setMonth(fechaOrigen.getMonth());
    fecha.setDate(fechaOrigen.getDate() + duracionNBI + duracionEtapa);
    // console.log(fecha, fechaOrigen);

    return fecha
  }

  viewEtapa(idEtapa) {
    // console.log(idEtapa);

    this.result = this.result.map(el => {
      if (el.vigente == true)
        return { ...el, vigente: false }
      else if (el.idEtapa == idEtapa)
        return { ...el, vigente: true }
      else
        return { ...el }
    });
    this.AsignaValorEtapas()
    this.emitEtapa.emit({ idEtapa })
  }

}
