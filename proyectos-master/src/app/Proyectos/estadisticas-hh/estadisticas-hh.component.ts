import { Component, Input, OnInit } from '@angular/core';
import { firestoreDB } from '../../firebase-init';

/**
 * Estadísticas mensuales de HH por subproyecto.
 * Firestore: un documento por subproyecto y año en 'estadisticasHH' ({idSubProyecto}_{anio}),
 * con los valores en meses.{1-12}.{campo}. Los consolidados pueden leer toda la colección.
 */
const COLECCION = 'estadisticasHH';
const ANIOS_ANTERIORES = 5;

export interface IndicadorHH {
  campo: string;
  etiqueta: string;
  decimales: number;
  capacitacion?: boolean;
  inicioCapacitacion?: boolean;
}

@Component({
  selector: 'app-estadisticas-hh',
  templateUrl: './estadisticas-hh.component.html',
  styleUrls: ['./estadisticas-hh.component.css']
})
export class EstadisticasHhComponent implements OnInit {

  @Input() idSubProyecto: any = null;
  @Input() idProyecto: any = null;
  @Input() nombreSubProyecto: string = '';
  @Input() soloLectura: boolean = false;

  readonly meses = [
    { numero: 1, nombre: 'Enero' }, { numero: 2, nombre: 'Febrero' }, { numero: 3, nombre: 'Marzo' },
    { numero: 4, nombre: 'Abril' }, { numero: 5, nombre: 'Mayo' }, { numero: 6, nombre: 'Junio' },
    { numero: 7, nombre: 'Julio' }, { numero: 8, nombre: 'Agosto' }, { numero: 9, nombre: 'Septiembre' },
    { numero: 10, nombre: 'Octubre' }, { numero: 11, nombre: 'Noviembre' }, { numero: 12, nombre: 'Diciembre' }
  ];

  readonly indicadores: IndicadorHH[] = [
    { campo: 'hh', etiqueta: 'HH trabajadas', decimales: 2 },
    { campo: 'hhCharlasDiarias', etiqueta: 'Charlas diarias', decimales: 2, capacitacion: true, inicioCapacitacion: true },
    { campo: 'hhEspecificas', etiqueta: 'Específicas', decimales: 2, capacitacion: true },
    { campo: 'hhOtec', etiqueta: 'OTEC', decimales: 2, capacitacion: true },
    { campo: 'hhOtrasCapacitaciones', etiqueta: 'Otros', decimales: 2, capacitacion: true },
    { campo: 'trabajadores', etiqueta: 'N° de trabajadores', decimales: 0 },
    { campo: 'incidentes', etiqueta: 'N° incidentes', decimales: 0 },
    { campo: 'accidentesBaja', etiqueta: 'Accidentes con baja', decimales: 0 },
    { campo: 'diasPerdidos', etiqueta: 'Días perdidos', decimales: 0 }
  ];

  readonly indices = [
    { campo: 'accidentesBaja', etiqueta: 'IF', titulo: 'Índice de frecuencia', base: 1000000 },
    { campo: 'diasPerdidos', etiqueta: 'IS', titulo: 'Índice de severidad', base: 1000 }
  ];

  anios: number[] = [];
  anio: number = new Date().getFullYear();
  readonly mesActual: number = new Date().getMonth() + 1;
  readonly anioActual: number = new Date().getFullYear();
  valores: any = {};
  cargando: boolean = true;
  errorCarga: boolean = false;
  estadoGuardado: string = ''; // '', 'guardando', 'guardado' o 'error'

  private datosPorAnio: { [anio: number]: any } = {};
  private respaldo: { [clave: string]: number | null } = {};
  private guardadosPendientes: number = 0;
  private idUsuario: any = null;

  ngOnInit() {
    try {
      this.idUsuario = JSON.parse(localStorage.getItem('usuario') || '{}').idUsuario || null;
    } catch (error) {
      this.idUsuario = null;
    }
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.errorCarga = false;

    if (!this.idSubProyecto) {
      this.cargando = false;
      this.errorCarga = true;
      return;
    }

    firestoreDB.collection(COLECCION).where('idSubProyecto', '==', this.idSubProyecto).get()
      .then((snapshot: any) => {
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          this.datosPorAnio[Number(data.anio)] = data.meses || {};
        });
        this.prepararAnios();
        this.seleccionarAnio();
        this.cargando = false;
      })
      .catch((error: any) => {
        console.error('Error al cargar las estadísticas de HH:', error);
        this.cargando = false;
        this.errorCarga = true;
      });
  }

  private prepararAnios() {
    const anios: { [anio: number]: boolean } = {};
    for (let anio = this.anioActual; anio >= this.anioActual - ANIOS_ANTERIORES; anio--) {
      anios[anio] = true;
    }
    Object.keys(this.datosPorAnio).forEach(anio => anios[Number(anio)] = true);
    this.anios = Object.keys(anios).map(Number).sort((a, b) => b - a);
  }

  /** Cambiar de año no vuelve a Firestore: los datos ya están en memoria. */
  seleccionarAnio() {
    const anio = Number(this.anio);
    if (!this.datosPorAnio[anio]) {
      this.datosPorAnio[anio] = {};
    }

    this.meses.forEach(mes => {
      const delMes = this.datosPorAnio[anio][mes.numero] || (this.datosPorAnio[anio][mes.numero] = {});
      this.indicadores.forEach(indicador => {
        const valor = delMes[indicador.campo];
        delMes[indicador.campo] = valor === undefined ? null : valor;
        this.respaldo[this.getClave(anio, mes.numero, indicador.campo)] = delMes[indicador.campo];
      });
    });

    this.valores = this.datosPorAnio[anio];
  }

  guardarCelda(mes: number, indicador: IndicadorHH, input: any) {
    if (this.soloLectura) { return; }

    const anio = Number(this.anio);
    const clave = this.getClave(anio, mes, indicador.campo);
    const valor = this.normalizarValor(input.value, indicador.decimales);

    if (valor === undefined) { // Negativo o inválido: queda lo que estaba
      input.value = this.getTextoCelda(mes, indicador.campo);
      return;
    }

    this.valores[mes][indicador.campo] = valor;
    input.value = this.getTextoCelda(mes, indicador.campo);
    if (valor === this.respaldo[clave]) { return; }

    const anterior = this.respaldo[clave];
    this.respaldo[clave] = valor;
    this.guardadosPendientes++;
    this.estadoGuardado = 'guardando';

    firestoreDB.collection(COLECCION).doc(this.idSubProyecto + '_' + anio).set({
      idSubProyecto: this.idSubProyecto,
      idProyecto: this.idProyecto === undefined ? null : this.idProyecto,
      nombreSubProyecto: this.nombreSubProyecto || '',
      anio: anio,
      idUsuarioActualizacion: this.idUsuario,
      fechaActualizacion: new Date().toISOString(),
      meses: { [mes]: { [indicador.campo]: valor } }
    }, { merge: true })
      .then(() => {
        this.guardadosPendientes--;
        if (!this.guardadosPendientes && this.estadoGuardado !== 'error') {
          this.estadoGuardado = 'guardado';
        }
      })
      .catch((error: any) => {
        console.error('Error al guardar la estadística de HH:', error);
        this.guardadosPendientes--;
        this.respaldo[clave] = anterior;
        this.datosPorAnio[anio][mes][indicador.campo] = anterior;
        this.estadoGuardado = 'error';
      });
  }

  private normalizarValor(texto: string, decimales: number): number | null | undefined {
    const numero = this.leerNumero(texto);
    if (numero === null || numero === undefined) { return numero; }
    const factor = Math.pow(10, decimales);
    return Math.round(numero * factor) / factor;
  }

  /** Formato chileno: 3.780 son tres mil setecientos ochenta y 3.780,5 lleva decimal con coma. */
  private leerNumero(texto: string): number | null | undefined {
    const limpio = (texto || '').replace(/\s/g, '');
    if (!limpio) { return null; }
    if (!/^\d[\d.,]*$/.test(limpio)) { return undefined; }

    let numero = limpio;
    if (limpio.indexOf(',') !== -1) {
      numero = limpio.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
      numero = limpio.replace(/\./g, '');
    }

    const resultado = Number(numero);
    return isNaN(resultado) ? undefined : resultado;
  }

  private getClave(anio: number, mes: number, campo: string): string {
    return anio + '-' + mes + '-' + campo;
  }

  private sumar(campo: string): number | null {
    let total: number | null = null;
    this.meses.forEach(mes => {
      const valor = this.valores[mes.numero] ? this.valores[mes.numero][campo] : null;
      if (valor !== null && valor !== undefined) {
        total = (total || 0) + Number(valor);
      }
    });
    return total;
  }

  private calcularIndice(cantidad: number | null, hh: number | null, base: number): number | null {
    if (cantidad === null || cantidad === undefined || !hh) { return null; }
    return cantidad * base / hh;
  }

  private formatear(valor: number | null): string {
    if (valor === null || valor === undefined) { return '-'; }
    const partes = String(Math.round(valor * 100) / 100).split('.');
    return partes[0].replace(/\B(?=(\d{3})+$)/g, '.') + (partes[1] ? ',' + partes[1] : '');
  }

  getTextoCelda(mes: number, campo: string): string {
    const delMes = this.valores[mes] || {};
    return delMes[campo] === null || delMes[campo] === undefined ? '' : this.formatear(delMes[campo]);
  }

  private sumarCapacitacionMes(mes: number): number | null {
    const delMes = this.valores[mes] || {};
    let total: number | null = null;
    this.indicadores.filter(indicador => indicador.capacitacion).forEach(indicador => {
      const valor = delMes[indicador.campo];
      if (valor !== null && valor !== undefined) {
        total = (total || 0) + Number(valor);
      }
    });
    return total;
  }

  getCapacitacionMes(mes: number): string {
    return this.formatear(this.sumarCapacitacionMes(mes));
  }

  getCapacitacionTotal(): string {
    let total: number | null = null;
    this.meses.forEach(mes => {
      const delMes = this.sumarCapacitacionMes(mes.numero);
      if (delMes !== null) {
        total = (total || 0) + delMes;
      }
    });
    return this.formatear(total);
  }

  getTotal(campo: string): string {
    return this.formatear(this.sumar(campo));
  }

  getIndiceMes(mes: number, indice: any): string {
    const delMes = this.valores[mes] || {};
    return this.formatear(this.calcularIndice(delMes[indice.campo], delMes.hh, indice.base));
  }

  getIndiceAnual(indice: any): string {
    return this.formatear(this.calcularIndice(this.sumar(indice.campo), this.sumar('hh'), indice.base));
  }

  esMesActual(mes: number): boolean {
    return Number(this.anio) === this.anioActual && mes === this.mesActual;
  }

  trackMes(index: number, mes: any) {
    return mes.numero;
  }

  trackCampo(index: number, indicador: any) {
    return indicador.campo;
  }
}