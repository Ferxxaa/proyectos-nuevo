import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { mDetalleSubProyecto } from '../../models/mDetalleSubProyecto';
import { mSubProyecto } from '../../models/mSubProyecto';

/*
 * ✅ MODELO DE ETAPAS = CATÁLOGO DE LA BD (tabla Etapa). NO CAMBIAR LOS idEtapa.
 *  9 Regularización (prop: Licitacion) | 10 Licitación Adjudicación (prop: Adjudicacion) | 11 NBI5
 * 12 Construcción | 13 Habilitación | 14 NBI6 | 15-17 Cierres | 18 NBI7
 */

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

  Requerimiento: mDetalleSubProyecto;  // 1
  NBI1: mDetalleSubProyecto;           // 2
  Factibilidad: mDetalleSubProyecto;   // 3
  NBI2: mDetalleSubProyecto;           // 4
  Layout: mDetalleSubProyecto;         // 5
  NBI3: mDetalleSubProyecto;           // 6
  Proyecto: mDetalleSubProyecto;       // 7
  NBI4: mDetalleSubProyecto;           // 8
  Licitacion: mDetalleSubProyecto;     // 9
  Adjudicacion: mDetalleSubProyecto;   // 10
  NBI5: mDetalleSubProyecto;           // 11
  Construccion: mDetalleSubProyecto;   // 12
  Habilitacion: mDetalleSubProyecto;   // 13
  NBI6: mDetalleSubProyecto;           // 14
  Contratista: mDetalleSubProyecto;    // 15
  Cliente: mDetalleSubProyecto;        // 16
  Mantencion: mDetalleSubProyecto;     // 17
  NBI7: mDetalleSubProyecto;           // 18

  //TablaFechas
  Terminos: Array<any>;

  constructor() {
    this.Terminos = [null, null, null, null, null, null, null, null, null, null, null];
  }

  ngOnInit() {
    this.setValoresIniciales();
    this.AsignaValorEtapas();
    this.CalculaTerminos();
  }

  private porEtapa(idEtapa: number): mDetalleSubProyecto {
    return (this.result || []).find(d => Number(d.idEtapa) === idEtapa);
  }

  private AsignaValorEtapas() {
    // ✅ Asignar por idEtapa, nunca por posición
    this.Requerimiento = this.porEtapa(1) || this.Requerimiento;
    this.firstEtapa.emit(this.Requerimiento);
    this.NBI1 = this.porEtapa(2) || this.NBI1;
    this.Factibilidad = this.porEtapa(3) || this.Factibilidad;
    this.NBI2 = this.porEtapa(4) || this.NBI2;
    this.Layout = this.porEtapa(5) || this.Layout;
    this.NBI3 = this.porEtapa(6) || this.NBI3;
    this.Proyecto = this.porEtapa(7) || this.Proyecto;
    this.NBI4 = this.porEtapa(8) || this.NBI4;
    this.Licitacion = this.porEtapa(9) || this.Licitacion;
    this.Adjudicacion = this.porEtapa(10) || this.Adjudicacion;
    this.NBI5 = this.porEtapa(11) || this.NBI5;
    this.Construccion = this.porEtapa(12) || this.Construccion;
    this.Habilitacion = this.porEtapa(13) || this.Habilitacion;
    this.NBI6 = this.porEtapa(14) || this.NBI6;
    this.Contratista = this.porEtapa(15) || this.Contratista;
    this.Cliente = this.porEtapa(16) || this.Cliente;
    this.Mantencion = this.porEtapa(17) || this.Mantencion;
    this.NBI7 = this.porEtapa(18) || this.NBI7;
  }

  private CalculaTerminos() {
    if (!this.SubProyecto || !this.SubProyecto.fechaInicio) {
      return;
    }

    const tramos: Array<{ nbi: mDetalleSubProyecto, etapa: mDetalleSubProyecto }> = [
      { nbi: null, etapa: this.Requerimiento },      // 0
      { nbi: this.NBI1, etapa: this.Factibilidad },  // 1
      { nbi: this.NBI2, etapa: this.Layout },        // 2
      { nbi: this.NBI3, etapa: this.Proyecto },      // 3
      { nbi: this.NBI4, etapa: this.Licitacion },    // 4 Regularización
      { nbi: null, etapa: this.Adjudicacion },       // 5 Licitación Adjudicación
      { nbi: this.NBI5, etapa: this.Construccion },  // 6
      { nbi: null, etapa: this.Habilitacion },       // 7
      { nbi: this.NBI6, etapa: this.Contratista },   // 8
      { nbi: null, etapa: this.Cliente },            // 9
      { nbi: null, etapa: this.Mantencion }          // 10
    ];

    let cursor = new Date(this.SubProyecto.fechaInicio);
    tramos.forEach((t, i) => {
      cursor = this.retDate(cursor, t.nbi ? t.nbi.duracion : 0, t.etapa.duracion);
      this.Terminos[i] = cursor;
    });
  }

  setValoresIniciales() {
    const u = this.usuario ? this.usuario.idUsuario : null;
    this.Requerimiento = new mDetalleSubProyecto(null, null, 1, 0, 0, 0, true, null, null, null, null, null, false, false, null, true, null, u, null);
    this.NBI1 = new mDetalleSubProyecto(null, null, 2, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Factibilidad = new mDetalleSubProyecto(null, null, 3, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.NBI2 = new mDetalleSubProyecto(null, null, 4, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Layout = new mDetalleSubProyecto(null, null, 5, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.NBI3 = new mDetalleSubProyecto(null, null, 6, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Proyecto = new mDetalleSubProyecto(null, null, 7, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.NBI4 = new mDetalleSubProyecto(null, null, 8, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Licitacion = new mDetalleSubProyecto(null, null, 9, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Adjudicacion = new mDetalleSubProyecto(null, null, 10, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.NBI5 = new mDetalleSubProyecto(null, null, 11, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Construccion = new mDetalleSubProyecto(null, null, 12, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Habilitacion = new mDetalleSubProyecto(null, null, 13, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.NBI6 = new mDetalleSubProyecto(null, null, 14, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Contratista = new mDetalleSubProyecto(null, null, 15, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Cliente = new mDetalleSubProyecto(null, null, 16, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Mantencion = new mDetalleSubProyecto(null, null, 17, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.NBI7 = new mDetalleSubProyecto(null, null, 18, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, u, null);
  }

  // Suma sin mutar el origen y forzando número
  retDate(fechaOrigen: Date, duracionNBI: any, duracionEtapa: any) {
    const fecha = new Date(fechaOrigen.getTime());
    fecha.setDate(fecha.getDate() + (Number(duracionNBI) || 0) + (Number(duracionEtapa) || 0));
    return fecha;
  }

  viewEtapa(idEtapa) {
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