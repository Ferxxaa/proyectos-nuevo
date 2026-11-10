import { Component, Input, OnInit } from '@angular/core';
import { firestoreDB } from '../../firebase-init';
import { CAMPO_CAPACITACION } from './control-asistencia.component';
import { sumarHHPrograma, redondear } from '../programa-sso/programa-registro';
import { ProgramaSsoService } from '../programa-sso/programa-sso.service';

/**
 * Estadísticas mensuales de HH por subproyecto.
 * Firestore: un documento por subproyecto y año en 'estadisticasHH' ({idSubProyecto}_{anio}),
 * con los valores en meses.{1-12}.{campo}. Los consolidados pueden leer toda la colección.
 */
const COLECCION = 'estadisticasHH';
const ANIOS_ANTERIORES = 5;

/**
 * HH registradas en los Programas SSO / MA (popup de cada día).
 * Se suman a la misma fila que el Control de asistencia: no se guardan en 'estadisticasHH',
 * se calculan al cargar. Campo del registro -> indicador de esta tabla.
 */
const COLECCIONES_PROGRAMA = ['programaSSO', 'programaMA'];
const MAPA_PROGRAMA: { [campoRegistro: string]: string } = {
  hhTrabajadas: 'hh',
  hhCharlas: 'hhCharlasDiarias',
  hhCapacitacion: 'hhCapacitacion',
  hhOperacional: 'hhOperacional',
  hhOtros: 'hhOtros'
};
/** Indicadores que solo vienen de los programas (no se escriben a mano). */
export const CAMPOS_SOLO_PROGRAMA = ['hhCapacitacion', 'hhOperacional', 'hhOtros'];

export interface IndicadorHH {
  campo: string;
  etiqueta: string;
  decimales: number;
  capacitacion?: boolean;
  inicioCapacitacion?: boolean;
  programa?: boolean;   // solo viene de los Programas SSO/MA (solo lectura)
}

export const INDICADORES_HH: IndicadorHH[] = [
  { campo: 'hh', etiqueta: 'HH trabajadas', decimales: 2 },
  { campo: 'horasExtra', etiqueta: 'Horas extra', decimales: 2 },
  { campo: 'hhOperacional', etiqueta: 'HH operacional', decimales: 2, programa: true },
  { campo: 'hhOtros', etiqueta: 'HH otros', decimales: 2, programa: true },
  { campo: 'hhCharlasDiarias', etiqueta: 'Charlas diarias', decimales: 2, capacitacion: true, inicioCapacitacion: true },
  { campo: 'hhCapacitacion', etiqueta: 'Capacitación', decimales: 2, capacitacion: true, programa: true },
  { campo: 'trabajadores', etiqueta: 'N° de trabajadores', decimales: 0 },
  { campo: 'incidentes', etiqueta: 'N° incidentes', decimales: 0 },
  { campo: 'accidentesBaja', etiqueta: 'Accidentes con baja', decimales: 0 },
  { campo: 'diasPerdidos', etiqueta: 'Días perdidos', decimales: 0 }
];

/** HH de exposición de un mes para IF e IS. */
export function getHhIndice(delMes: any): number {
  if (delMes.hhTotales !== null && delMes.hhTotales !== undefined) { return Number(delMes.hhTotales) || 0; }
  return (Number(delMes.hh) || 0) + (Number(delMes.horasExtra) || 0);
}

export const INDICES_HH = [
  { campo: 'accidentesBaja', etiqueta: 'IF', titulo: 'Índice de frecuencia', base: 1000000 },
  { campo: 'diasPerdidos', etiqueta: 'IS', titulo: 'Índice de severidad', base: 1000 }
];

@Component({
  selector: 'app-estadisticas-hh',
  templateUrl: './estadisticas-hh.component.html',
  styleUrls: ['./estadisticas-hh.component.css'],
  providers: [ProgramaSsoService]
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

  readonly indicadores: IndicadorHH[] = INDICADORES_HH;
  readonly indices = INDICES_HH;

  vista: string = 'mensual'; // 'mensual' o 'asistencia'
  anios: number[] = [];
  anio: number = new Date().getFullYear();
  readonly mesActual: number = new Date().getMonth() + 1;
  readonly anioActual: number = new Date().getFullYear();
  valores: any = {};
  cargando: boolean = true;
  errorCarga: boolean = false;
  estadoGuardado: string = ''; // '', 'guardando', 'guardado' o 'error'

  datosPorAnio: { [anio: number]: any } = {};
  /** HH de los Programas SSO/MA por indicador: hhProgramas[anio][mes][campo] (solo los que tienen horas) */
  hhProgramas: { [anio: number]: any } = {};
  cargandoProgramas: boolean = false;
  errorProgramas: boolean = false;
  private cargaProgramas: number = 0;

  constructor(private sPrograma: ProgramaSsoService) {}
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

    this.hhProgramas = {};
    const estadisticas = firestoreDB.collection(COLECCION).where('idSubProyecto', '==', this.idSubProyecto).get();
    // los programas del año se leen en paralelo; si fallan, igual se muestran las estadísticas
    const programas = this.cargarProgramasAnio(Number(this.anio));

    Promise.all([estadisticas, programas])
      .then((resultado: any[]) => {
        const snapshot = resultado[0];
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

  /**
   * Lee los Programas SSO y MA de los 12 meses del año con el mismo servicio de la pestaña Programas
   * y suma por mes las HH registradas en el popup de cada día.
   */
  private cargarProgramasAnio(anio: number): Promise<void> {
    const carga = ++this.cargaProgramas;
    this.cargandoProgramas = true;
    this.errorProgramas = false;

    const lecturas: Promise<any>[] = [];
    let fallas = 0;
    this.meses.forEach(mes => {
      COLECCIONES_PROGRAMA.forEach(coleccion => {
        lecturas.push(
          Promise.resolve(this.sPrograma.obtener(this.idSubProyecto, anio, mes.numero, coleccion))
            .catch((error: any) => {
              fallas++;
              console.error('Error al leer ' + coleccion + ' ' + mes.numero + '/' + anio + ':', error);
              return null;
            })
            .then((programa: any) => ({ mes: mes.numero, programa: programa }))
        );
      });
    });

    return Promise.all(lecturas).then((lista: any[]) => {
      if (carga !== this.cargaProgramas) { return; }
      const delAnio: any = {};
      lista.forEach(item => {
        if (!item.programa) { return; }
        const hh: any = sumarHHPrograma(item.programa);
        Object.keys(MAPA_PROGRAMA).forEach(campoRegistro => {
          const horas = Number(hh[campoRegistro]) || 0;
          if (horas <= 0) { return; }
          const campo = MAPA_PROGRAMA[campoRegistro];
          const delMes = delAnio[item.mes] || (delAnio[item.mes] = {});
          delMes[campo] = redondear((delMes[campo] || 0) + horas);
        });
      });
      this.hhProgramas[anio] = delAnio;
      this.cargandoProgramas = false;
      this.errorProgramas = fallas === lista.length && lista.length > 0;
    });
  }

  /** Botón "Actualizar": vuelve a leer lo registrado en los programas del año visible. */
  actualizarProgramas() {
    const anio = Number(this.anio);
    delete this.hhProgramas[anio];
    this.cargarProgramasAnio(anio);
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
        // aquí queda solo lo guardado (asistencia o manual); lo de programas se suma al mostrar
        const valor = delMes[indicador.campo];
        delMes[indicador.campo] = valor === undefined ? null : valor;
        this.respaldo[this.getClave(anio, mes.numero, indicador.campo)] = delMes[indicador.campo];
      });
    });

    this.valores = this.datosPorAnio[anio];

    // las HH de programas se leen por año, la primera vez que se abre
    if (!this.hhProgramas[anio] && !this.cargando) {
      this.cargarProgramasAnio(anio);
    }
  }

  /** El Control de asistencia ya guardó estos valores: solo se reflejan en la tabla. */
  aplicarAsistencia(evento: { anio: number, mes: number, valores: any }) {
    const delAnio = this.datosPorAnio[evento.anio] || (this.datosPorAnio[evento.anio] = {});
    const delMes = delAnio[evento.mes] || (delAnio[evento.mes] = {});
    Object.keys(evento.valores).forEach(campo => {
      delMes[campo] = evento.valores[campo];
      this.respaldo[this.getClave(evento.anio, evento.mes, campo)] = evento.valores[campo];
    });
  }

  // ===================== Asistencia + Programas =====================

  /** HH que aportan los Programas SSO/MA a ese indicador y mes (null si no hay). */
  getProgramas(mes: number, campo: string): number | null {
    const delAnio = this.hhProgramas[Number(this.anio)];
    const delMes = delAnio ? delAnio[mes] : null;
    const valor = delMes ? delMes[campo] : null;
    return valor === null || valor === undefined ? null : Number(valor);
  }

  /** Valor que se muestra: lo guardado (asistencia o manual) + lo de programas. */
  getValor(mes: number, campo: string): number | null {
    const base = (this.valores[mes] || {})[campo];
    const programas = this.getProgramas(mes, campo);
    const hayBase = base !== null && base !== undefined;
    if (!hayBase && programas === null) { return null; }
    return redondear((hayBase ? Number(base) : 0) + (programas || 0));
  }

  /** Viene del Control de asistencia. */
  esDeAsistencia(mes: number, campo: string): boolean {
    const delMes = this.valores[mes] || {};
    if (campo === CAMPO_CAPACITACION) { return !!delMes.asistenciaCapacitacion; }
    return !!delMes.asistencia && (campo === 'hh' || campo === 'horasExtra' || campo === 'trabajadores');
  }

  /** Tiene horas de los Programas SSO/MA (o es un indicador que solo sale de ahí). */
  esDePrograma(mes: number, campo: string): boolean {
    return CAMPOS_SOLO_PROGRAMA.indexOf(campo) >= 0 || this.getProgramas(mes, campo) !== null;
  }

  /** No se puede escribir a mano: lo calcula la asistencia y/o los programas. */
  esCalculado(mes: number, campo: string): boolean {
    return this.esDeAsistencia(mes, campo) || this.esDePrograma(mes, campo);
  }

  getTituloCelda(mes: number, campo: string): string {
    const partes: string[] = [];
    const base = (this.valores[mes] || {})[campo];
    const programas = this.getProgramas(mes, campo);
    if (base !== null && base !== undefined && CAMPOS_SOLO_PROGRAMA.indexOf(campo) < 0) {
      partes.push((this.esDeAsistencia(mes, campo) ? 'Control de asistencia: ' : 'Ingresado a mano: ') + this.formatear(base));
    }
    if (programas !== null) {
      partes.push('Programas SSO/MA: ' + this.formatear(programas));
    }
    if (!partes.length && CAMPOS_SOLO_PROGRAMA.indexOf(campo) >= 0) {
      return 'Se calcula desde los registros de los Programas SSO y MA';
    }
    return partes.length > 1 ? partes.join(' + ') : (partes[0] || '');
  }

  guardarCelda(mes: number, indicador: IndicadorHH, input: any) {
    if (this.soloLectura || this.esCalculado(mes, indicador.campo)) { return; }

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
      const valor = this.getValor(mes.numero, campo);
      if (valor !== null) {
        total = (total || 0) + valor;
      }
    });
    return total;
  }

  /** HH de exposición del mes: asistencia/manual + HH trabajadas de los programas. */
  private getHhExposicion(mes: number): number {
    return getHhIndice(this.valores[mes] || {}) + (this.getProgramas(mes, 'hh') || 0);
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
    const valor = this.getValor(mes, campo);
    return valor === null ? '' : this.formatear(valor);
  }

  private sumarCapacitacionMes(mes: number): number | null {
    let total: number | null = null;
    this.indicadores.filter(indicador => indicador.capacitacion).forEach(indicador => {
      const valor = this.getValor(mes, indicador.campo);
      if (valor !== null) {
        total = (total || 0) + valor;
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
    return this.formatear(this.calcularIndice(delMes[indice.campo], this.getHhExposicion(mes), indice.base));
  }

  getIndiceAnual(indice: any): string {
    const hh = this.meses.reduce((suma, mes) => suma + this.getHhExposicion(mes.numero), 0);
    return this.formatear(this.calcularIndice(this.sumar(indice.campo), hh, indice.base));
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