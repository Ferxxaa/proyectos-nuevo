import { Component, OnInit, Input } from '@angular/core';
import { mDetalleSubProyecto } from '../../models/mDetalleSubProyecto';
import { mMis_Proyectos } from '../../models/mMis_Proyectos';
import { sMis_Proyectos } from '../../services/sMis_Proyectos.service';
import { sDetalleSubProyecto } from '../../services/sDetalleSubProyecto.service';
import { Comunes } from '../../Share/Comunes';

const MS_DIA = 1000 * 60 * 60 * 24;

@Component({
  selector: 'app-desplegable-tablero-control',
  templateUrl: './desplegable-tablero-control.component.html',
  styleUrls: ['./desplegable-tablero-control.component.css'],
  providers: [
    sMis_Proyectos,
    sDetalleSubProyecto,
    Comunes
  ]
})
export class DesplegableTableroControlComponent implements OnInit {

  @Input() Seguimiento: any;

  miProyecto: any;

  // Evita que un cálculo viejo pise al más reciente
  private idCalculo: number = 0;

  constructor(
    private _sMis_Proyectos: sMis_Proyectos,
    private _sDetalleSubProyecto: sDetalleSubProyecto,
    private comunes: Comunes
  ) {
    try {
      this.miProyecto = JSON.parse(localStorage.getItem('miProyecto') || 'null');
    } catch (err) {
      this.miProyecto = null;
    }
  }

  ngOnInit() {
    this.recalcular();
  }

  // ----------------------------------------------------------------- Display

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

  // 'neutro' | 'rojo' | 'amarillo' | 'verde' | null (mientras carga)
  get colorSemaforo(): string {
    if (!this.miProyecto) {
      return null;
    }
    if (!this.proyectoIniciado) {
      return 'neutro';
    }
    return this.miProyecto.Semaforo || null;
  }

  retColor(Etapa: string) {
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

  // ----------------------------------------------------------------- Carga

  // Se mantiene por compatibilidad: el tablero lo llama cuando emite la primera etapa
  actualizaMiProyecto(miProyecto: mMis_Proyectos) {
    this.recalcular();
  }

  // Se mantiene por compatibilidad (TableroControl.setInicioReal)
  agregaDuracionProyecto(EtapaInicial: mDetalleSubProyecto) {
    this.recalcular();
  }

  recalcular() {
    const idSubProyecto = (this.Seguimiento && this.Seguimiento.idSubProyecto) ||
      (this.miProyecto && this.miProyecto.idSubProyecto);
    if (!idSubProyecto) {
      return;
    }

    const idActual = ++this.idCalculo;

    const vista: Promise<any> = new Promise(resolve => {
      this._sMis_Proyectos.getMis_ProyectosbyidSubProyecto(idSubProyecto).subscribe(
        res => resolve(res && res.length ? res[0] : null),
        () => resolve(null)
      );
    });

    const detalle: Promise<any[]> = Promise.resolve(
      this._sDetalleSubProyecto.asyncDetalleSubProyectobyidSubProyecto(idSubProyecto)
    ).catch(() => []);

    Promise.all([vista, detalle]).then(([datosVista, etapasDetalle]) => {
      if (idActual !== this.idCalculo) {
        return;
      }
      const base = { ...(this.miProyecto || {}), ...(datosVista || {}) } as any;
      if (this.Seguimiento && this.Seguimiento.fechaInicio) {
        base.fechaInicio = this.Seguimiento.fechaInicio;
      }
      this.miProyecto = this.calcularIndicadores(base, etapasDetalle || []);
    }).catch(err => {
      console.error('DesplegableTableroControl - error al calcular indicadores:', err);
    });
  }

  // ----------------------------------------------------------------- Cálculo
  // Mismo cálculo que MisProyectosComponent.calDuracionProy

  private calcularIndicadores(proyecto: any, detalle: any[]): any {
    const copy = { ...proyecto } as any;
    const etapas = (detalle || []).slice().sort((a, b) => Number(a.idEtapa) - Number(b.idEtapa));
    const etapaActual = etapas.find(etapa => etapa.vigente);

    // Duración total
    const duracionVista = this.leerNumero(copy, ['DuracionTotal', 'duracionTotal']);
    const duracionEtapas = etapas.reduce((total, etapa) => total + (Number(etapa.duracion) || 0), 0);
    copy.DuracionTotal = duracionVista !== null && duracionVista > 0 ? duracionVista : duracionEtapas;

    // Avance real del proyecto
    const realVista = this.leerNumero(copy, ['AvanceReal', 'avanceReal']);
    const realEtapas = etapas.length ? this.calcularAvanceReal(etapas) : 0;
    copy.AvanceReal = this.elegirAvance(realVista, realEtapas, etapas.length > 0);

    // Avance programado del proyecto
    const progVista = this.leerNumero(copy, ['AvanceProgramado', 'avanceProgramado']);
    const progEtapas = etapas.length
      ? this.calcularAvanceProgramado(etapas, copy.fechaInicio, copy.DuracionTotal)
      : 0;
    copy.AvanceProgramado = this.elegirAvance(progVista, progEtapas, etapas.length > 0);

    // Avance real de la etapa vigente
    const realEtapaVista = this.leerNumero(copy, ['AvanceRealEtapa', 'avanceRealEtapa']);
    const realEtapaActual = etapaActual ? this.normalizarPorcentaje(etapaActual.avanceReal) : 0;
    copy.AvanceRealEtapa = this.elegirAvance(realEtapaVista, realEtapaActual, !!etapaActual);

    // Duración real
    if (etapas.length) {
      if (Number(copy.idEstadoProyecto) <= 4) {
        const primeraConInicio = etapas.find(etapa => !!etapa.fechaInicioReal);
        const inicioReal = primeraConInicio ? new Date(primeraConInicio.fechaInicioReal).getTime() : NaN;
        const hoyDia = new Date();
        hoyDia.setHours(0, 0, 0, 0);
        copy.duracionReal = !isNaN(inicioReal) && inicioReal > 0
          ? Math.max(0, Math.round((hoyDia.getTime() - inicioReal) / MS_DIA))
          : 0;
      } else {
        copy.duracionReal = etapas.reduce((acc, d) => acc + this.calcDuracionReal(d), 0);
      }
    } else {
      copy.duracionReal = Math.max(0, Number(copy.duracionReal) || 0);
    }

    this.normalizarIndicadoresProyecto(copy);
    copy.Semaforo = this.calcularSemaforo(copy);

    return copy;
  }

  private calcDuracionReal(detalleSP): number {
    if (!detalleSP) {
      return 0;
    }
    const inicio = new Date(detalleSP.fechaInicioReal).getTime();
    const termino = new Date(detalleSP.fechaTerminoReal).getTime();
    return inicio && termino ? Math.ceil((termino - inicio) / MS_DIA) : 0;
  }

  private calcularSemaforo(proyecto: any): string {
    const difAvance = (Number(proyecto.AvanceProgramado) || 0) - (Number(proyecto.AvanceReal) || 0);
    const total = Number(proyecto.DuracionTotal) || 0;
    const difDuracion = total > 0 ? total - (Number(proyecto.duracionReal) || 0) : null;

    if (difAvance > 3 || (difDuracion !== null && difDuracion < -10)) {
      return 'rojo';
    }
    if (difAvance <= 0 && (difDuracion === null || difDuracion >= 0)) {
      return 'verde';
    }
    return 'amarillo';
  }

  private normalizarIndicadoresProyecto(proyecto: any) {
    proyecto.AvanceReal = this.normalizarPorcentaje(proyecto.AvanceReal);
    proyecto.AvanceRealEtapa = this.normalizarPorcentaje(proyecto.AvanceRealEtapa);

    const fechaInicio = proyecto.fechaInicio ? new Date(proyecto.fechaInicio) : null;
    const hoy = new Date();

    if (fechaInicio && !isNaN(fechaInicio.getTime())) {
      fechaInicio.setHours(0, 0, 0, 0);
      hoy.setHours(0, 0, 0, 0);
      if (hoy.getTime() < fechaInicio.getTime()) {
        proyecto.AvanceProgramado = 0;
        proyecto.duracionReal = 0;
        return;
      }
    }

    proyecto.AvanceProgramado = this.normalizarPorcentaje(proyecto.AvanceProgramado);
    proyecto.duracionReal = Math.max(0, Number(proyecto.duracionReal) || 0);
  }

  private calcularAvanceReal(etapas: any[]): number {
    const ponderadoTotal = etapas.reduce((total, etapa) => total + (Number(etapa.ponderado) || 0), 0);

    if (ponderadoTotal <= 0) {
      // Sin ponderados configurados: se pondera por días de cada etapa (igual que el programado),
      // así las NBI y etapas de 0 días no inflan ni diluyen el avance
      const diasTotal = etapas.reduce((total, etapa) => total + (Number(etapa.duracion) || 0), 0);
      if (diasTotal > 0) {
        const avanceDias = etapas.reduce((total, etapa) => {
          return total + this.normalizarPorcentaje(etapa.avanceReal) * (Number(etapa.duracion) || 0);
        }, 0);
        return this.normalizarPorcentaje(avanceDias / diasTotal);
      }
      const promedio = etapas.reduce((total, etapa) => total + this.normalizarPorcentaje(etapa.avanceReal), 0) / etapas.length;
      return this.normalizarPorcentaje(promedio);
    }

    const avance = etapas.reduce((total, etapa) => {
      return total + this.normalizarPorcentaje(etapa.avanceReal) * (Number(etapa.ponderado) || 0);
    }, 0);

    return this.normalizarPorcentaje(avance / ponderadoTotal);
  }

  private calcularAvanceProgramado(etapas: any[], fechaInicioProyecto: string, duracionTotal: number): number {
    const inicio = fechaInicioProyecto ? new Date(fechaInicioProyecto) : null;
    if (!inicio || isNaN(inicio.getTime())) {
      return 0;
    }
    inicio.setHours(0, 0, 0, 0);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ponderadoTotal = etapas.reduce((total, etapa) => total + (Number(etapa.ponderado) || 0), 0);

    if (ponderadoTotal > 0) {
      let diasPrevios = 0;
      let avance = 0;
      etapas.forEach(etapa => {
        const duracion = Number(etapa.duracion) || 0;
        const inicioEtapa = inicio.getTime() + diasPrevios * MS_DIA;
        const transcurridos = (hoy.getTime() - inicioEtapa) / MS_DIA;
        const avanceEtapa = duracion <= 0
          ? (transcurridos >= 0 ? 100 : 0)
          : Math.max(0, Math.min(100, transcurridos * 100 / duracion));
        avance += avanceEtapa * (Number(etapa.ponderado) || 0);
        diasPrevios += duracion;
      });
      return this.normalizarPorcentaje(avance / ponderadoTotal);
    }

    if (duracionTotal > 0) {
      const transcurridos = (hoy.getTime() - inicio.getTime()) / MS_DIA;
      return this.normalizarPorcentaje(transcurridos * 100 / duracionTotal);
    }

    return 0;
  }

  // Si hay etapas manda el cálculo por etapas (la vista trae valores desfasados);
  // la vista sólo se usa como respaldo cuando no hay detalle de etapas
  private elegirAvance(valorVista: number | null, valorEtapas: number, hayEtapas: boolean): number {
    if (hayEtapas) {
      return valorEtapas;
    }
    return valorVista !== null ? valorVista : 0;
  }

  private leerNumero(obj: any, nombres: string[]): number | null {
    if (!obj) return null;
    for (const nombre of nombres) {
      const valor = obj[nombre];
      if (valor !== undefined && valor !== null && valor !== '' && !isNaN(Number(valor))) {
        return Number(valor);
      }
    }
    return null;
  }

  private obtenerFechaInicioProyecto(): Date | null {
    const fecha = (this.Seguimiento && this.Seguimiento.fechaInicio) || (this.miProyecto && this.miProyecto.fechaInicio);
    if (!fecha) {
      return null;
    }
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? null : d;
  }

  private normalizarPorcentaje(valor: any): number {
    const numero = Number(valor) || 0;
    return Math.max(0, Math.min(100, Number(numero.toFixed(2))));
  }

}