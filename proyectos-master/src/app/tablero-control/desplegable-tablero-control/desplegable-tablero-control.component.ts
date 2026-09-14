import { Component, OnInit, Input } from '@angular/core';
import { mDetalleSubProyecto } from '../../models/mDetalleSubProyecto';
import { mMis_Proyectos } from '../../models/mMis_Proyectos';
import { sMis_Proyectos } from '../../services/sMis_Proyectos.service';
import { Comunes } from '../../Share/Comunes';

@Component({
  selector: 'app-desplegable-tablero-control',
  templateUrl: './desplegable-tablero-control.component.html',
  styleUrls: ['./desplegable-tablero-control.component.css'],
  providers: [
    sMis_Proyectos,
    Comunes
  ]
})
export class DesplegableTableroControlComponent implements OnInit {

  @Input() Seguimiento: any;

  miProyecto: any;

  constructor(
    private _sMis_Proyectos: sMis_Proyectos,
    private comunes: Comunes
  ) {
    this.miProyecto = JSON.parse(localStorage.miProyecto);
    // localStorage.removeItem('miProyecto');
  }

  ngOnInit() {
    // console.log(this.Seguimiento);
    // console.log(this.miProyecto);
    this.actualizaMiProyecto(this.miProyecto);
  }

  get proyectoIniciado(): boolean {
    const fechaInicio = this.obtenerFechaInicioProyecto();
    if (!fechaInicio) {
      return true;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaInicio.setHours(0, 0, 0, 0);
    return hoy.getTime() >= fechaInicio.getTime();
  }

  get duracionRealDisplay(): number {
    if (!this.miProyecto || !this.proyectoIniciado) {
      return 0;
    }

    return Math.max(0, Number(this.miProyecto.duracionReal) || 0);
  }

  get avanceProgramadoDisplay(): number {
    if (!this.miProyecto || !this.proyectoIniciado) {
      return 0;
    }

    return this.normalizarPorcentaje(this.miProyecto.AvanceProgramado);
  }

  get avanceRealDisplay(): number {
    if (!this.miProyecto) {
      return 0;
    }

    return this.normalizarPorcentaje(this.miProyecto.AvanceReal);
  }

  get desviacionDisplay(): number {
    if (!this.miProyecto || !this.miProyecto.DuracionTotal || !this.proyectoIniciado) {
      return 0;
    }

    const desviacion = 100 - ((this.duracionRealDisplay * 100) / this.miProyecto.DuracionTotal);
    return Number(desviacion.toFixed(2));
  }

  get mostrarSemaforoNeutro(): boolean {
    return !this.proyectoIniciado;
  }

  get mostrarSemaforoRojo(): boolean {
    if (!this.miProyecto || !this.proyectoIniciado) {
      return false;
    }

    const diferencia = this.miProyecto.DuracionTotal - this.duracionRealDisplay;
    return this.avanceProgramadoDisplay - this.avanceRealDisplay > 3 || (diferencia + 10 <= 0);
  }

  get mostrarSemaforoAmarillo(): boolean {
    if (!this.miProyecto || !this.proyectoIniciado) {
      return false;
    }

    const diferencia = this.miProyecto.DuracionTotal - this.duracionRealDisplay;
    return (this.avanceProgramadoDisplay - this.avanceRealDisplay <= 3 && this.avanceRealDisplay - this.avanceProgramadoDisplay < 0)
      && diferencia > 0;
  }

  get mostrarSemaforoVerde(): boolean {
    if (!this.miProyecto || !this.proyectoIniciado) {
      return false;
    }

    const diferencia = this.miProyecto.DuracionTotal - this.duracionRealDisplay;
    return this.avanceRealDisplay - this.avanceProgramadoDisplay >= 0 && diferencia > 0;
  }

  retColor(Etapa: string) {
    // console.log(Etapa);

    switch (Etapa) {
      case 'Requerimiento':
        return '#A7C69F';
      case 'Factibilidad':
        return '#669933';
      case 'Layout':
        return '#0099CC';
      case "Proyecto":
        return '#006699';
      case 'Regularización':
      case 'Licitación':
        return '#004d80';
      case 'Licitación Adjudicación':
        return '#003366';
      case 'Adjudicación':
        return '#003366';
      case "Construcción":
        return '#FFCC00';
      case 'Habilitación':
        return '#FF9900';
      case "Cierre contratista":
        return '#FF3300';
      case "Cierre cliente interno":
        return '#FF3300';
      case 'Cierre mantención':
        return '#FF3300';
    }
  }

  actualizaMiProyecto(miProyecto: mMis_Proyectos) {
    this._sMis_Proyectos.getMis_ProyectosbyidSubProyecto(miProyecto.idSubProyecto).subscribe(res => {
      // console.log("Mis Proyectos Antes", this.miProyecto);}
      if (!this.miProyecto.duracionReal)
        this.miProyecto = res[0];
      else {
        let { duracionReal } = this.miProyecto
        this.miProyecto = { ...res[0], duracionReal }
      }
      // console.log("Mis Proyectos Ahora", this.miProyecto);
    });
  }

  agregaDuracionProyecto(EtapaInicial: mDetalleSubProyecto) {
    let { fechaInicioReal } = EtapaInicial;
    let duracionReal: number = 1;
    let tmp = this.miProyecto;
    if (this.miProyecto.idEstadoProyecto == 4)
      duracionReal = this.diferenciaFechas(this.stringToFecha(fechaInicioReal), new Date());
    this.miProyecto = { ...tmp, fechaInicioReal, duracionReal }
    // console.log(fechaInicioReal, this.miProyecto);
  }

  stringToFecha(fecha: string): Date {
    return new Date(fecha)
  }

  diferenciaFechas(fechaInicio: Date, fechaTermino: Date) {
    return (fechaTermino.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)
  }

  private obtenerFechaInicioProyecto(): Date | null {
    const fecha = (this.Seguimiento && this.Seguimiento.fechaInicio) || (this.miProyecto && this.miProyecto.fechaInicio);
    if (!fecha) {
      return null;
    }

    return new Date(fecha);
  }

  private normalizarPorcentaje(valor: number): number {
    const numero = Number(valor) || 0;
    if (numero < 0) {
      return 0;
    }
    if (numero > 100) {
      return 100;
    }
    return Number(numero.toFixed(2));
  }

}
