import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { firestoreDB } from '../../firebase-init';

declare var Swal: any;

/**
 * Control de asistencia diario por subproyecto. Alimenta las Estadísticas mensuales de HH.
 * Firestore: un documento por mes en 'asistenciaHH' ({idSubProyecto}_{anio}_{mes}), con los
 * trabajadores en trabajadores.{id} y sus datos en dias.{dia}.{jornada|extra|capacitacion}.
 * Cada cambio guarda el día y actualiza 'estadisticasHH' en la misma operación.
 */
const COLECCION = 'asistenciaHH';
const COLECCION_HH = 'estadisticasHH';

export const HORAS_JORNADA = 8.5;
/** Indicador de Estadísticas HH que recibe las horas de capacitación. */
export const CAMPO_CAPACITACION = 'hhCharlasDiarias';

/** Fecha del solsticio de invierno en Chile; desde 2028 hay que confirmarla con el decreto de cada año. */
const DIA_PUEBLOS_INDIGENAS: { [anio: number]: number } = { 2024: 20, 2025: 20, 2026: 21, 2027: 21, 2028: 20, 2029: 20, 2030: 21 };

/** Feriados por ley puntual, como elecciones. Agregar aquí con formato { 'aaaa-m-d': 'Nombre' }. */
const FERIADOS_ESPECIALES: { [fecha: string]: string } = {
  '2025-11-16': 'Elecciones',
  '2025-12-14': 'Elecciones'
};

function getPascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

/** Ley 19.668: de martes a jueves pasa al lunes anterior, y el viernes al lunes siguiente. */
function moverALunes(anio: number, mes: number, dia: number): Date {
  const fecha = new Date(anio, mes - 1, dia);
  const semana = fecha.getDay();
  if (semana >= 2 && semana <= 4) { return new Date(anio, mes - 1, dia - (semana - 1)); }
  if (semana === 5) { return new Date(anio, mes - 1, dia + 3); }
  return fecha;
}

/** Feriados nacionales de Chile, con clave 'mes-dia'. No incluye los regionales ni comunales. */
export function getFeriadosChile(anio: number): { [clave: string]: string } {
  const feriados: { [clave: string]: string } = {};
  const agregar = (fecha: Date, nombre: string) => {
    feriados[(fecha.getMonth() + 1) + '-' + fecha.getDate()] = nombre;
  };
  const fijo = (mes: number, dia: number, nombre: string) => agregar(new Date(anio, mes - 1, dia), nombre);
  const pascua = getPascua(anio);

  fijo(1, 1, 'Año Nuevo');
  agregar(new Date(anio, pascua.getMonth(), pascua.getDate() - 2), 'Viernes Santo');
  agregar(new Date(anio, pascua.getMonth(), pascua.getDate() - 1), 'Sábado Santo');
  fijo(5, 1, 'Día del Trabajo');
  fijo(5, 21, 'Día de las Glorias Navales');
  fijo(6, DIA_PUEBLOS_INDIGENAS[anio] || 21, 'Día Nacional de los Pueblos Indígenas');
  agregar(moverALunes(anio, 6, 29), 'San Pedro y San Pablo');
  fijo(7, 16, 'Día de la Virgen del Carmen');
  fijo(8, 15, 'Asunción de la Virgen');
  fijo(9, 18, 'Independencia Nacional');
  fijo(9, 19, 'Día de las Glorias del Ejército');
  agregar(moverALunes(anio, 10, 12), 'Encuentro de Dos Mundos');
  fijo(11, 1, 'Día de Todos los Santos');
  fijo(12, 8, 'Inmaculada Concepción');
  fijo(12, 25, 'Navidad');

  // Ley 20.299: de martes pasa al viernes anterior, y de miércoles al viernes siguiente
  const iglesias = new Date(anio, 9, 31).getDay();
  agregar(new Date(anio, 9, 31 + (iglesias === 2 ? -4 : iglesias === 3 ? 2 : 0)), 'Día de las Iglesias Evangélicas');

  // Leyes 20.215 y 20.983
  const septiembre = new Date(anio, 8, 18).getDay();
  if (septiembre === 2 || septiembre === 6) { fijo(9, 17, 'Feriado adicional de Fiestas Patrias'); }
  if (septiembre === 3) { fijo(9, 20, 'Feriado adicional de Fiestas Patrias'); }
  if (new Date(anio, 0, 1).getDay() === 0) { fijo(1, 2, 'Feriado adicional de Año Nuevo'); }

  Object.keys(FERIADOS_ESPECIALES).forEach(fecha => {
    const partes = fecha.split('-').map(Number);
    if (partes[0] === anio) { fijo(partes[1], partes[2], FERIADOS_ESPECIALES[fecha]); }
  });

  return feriados;
}

export interface TrabajadorAsistencia {
  id: string;
  nombre: string;
  apellido: string;
  rut: string;
  lugar: string;
  cargo: string;
  orden: number;
  dias: any;
  nuevo?: boolean;
}

@Component({
  selector: 'app-control-asistencia',
  templateUrl: './control-asistencia.component.html',
  styleUrls: ['./control-asistencia.component.css']
})
export class ControlAsistenciaComponent implements OnInit {

  @Input() idSubProyecto: any = null;
  @Input() idProyecto: any = null;
  @Input() nombreSubProyecto: string = '';
  @Input() soloLectura: boolean = false;
  @Input() anios: number[] = [];
  @Input() datosHH: any = {};
  @Output() resumenActualizado = new EventEmitter<any>();

  readonly horasJornada: number = HORAS_JORNADA;
  readonly meses = [
    { numero: 1, nombre: 'Enero', corto: 'ene' }, { numero: 2, nombre: 'Febrero', corto: 'feb' }, { numero: 3, nombre: 'Marzo', corto: 'mar' },
    { numero: 4, nombre: 'Abril', corto: 'abr' }, { numero: 5, nombre: 'Mayo', corto: 'may' }, { numero: 6, nombre: 'Junio', corto: 'jun' },
    { numero: 7, nombre: 'Julio', corto: 'jul' }, { numero: 8, nombre: 'Agosto', corto: 'ago' }, { numero: 9, nombre: 'Septiembre', corto: 'sep' },
    { numero: 10, nombre: 'Octubre', corto: 'oct' }, { numero: 11, nombre: 'Noviembre', corto: 'nov' }, { numero: 12, nombre: 'Diciembre', corto: 'dic' }
  ];
  readonly campos = [
    { campo: 'jornada', etiqueta: 'Día', titulo: 'Jornada' },
    { campo: 'extra', etiqueta: 'H.E.', titulo: 'Horas extra' },
    { campo: 'capacitacion', etiqueta: 'Cap.', titulo: 'Capacitación' }
  ];
  readonly camposTrabajador = [
    { campo: 'nombre', etiqueta: 'Nombre', clase: 'ca-fijo ca-col-nombre', ancho: 96 },
    { campo: 'apellido', etiqueta: 'Apellido', clase: 'ca-fijo ca-col-apellido', ancho: 96 },
    { campo: 'rut', etiqueta: 'RUT', clase: '', ancho: 88 },
    { campo: 'lugar', etiqueta: 'Lugar de trabajo', clase: '', ancho: 78 },
    { campo: 'cargo', etiqueta: 'Profesión / ocupación', clase: '', ancho: 96 }
  ];

  anio: number = new Date().getFullYear();
  mes: number = new Date().getMonth() + 1;
  dias: { numero: number, fecha: string, finDeSemana: boolean, feriado: string }[] = [];
  diasVisibles: { numero: number, fecha: string, finDeSemana: boolean, feriado: string }[] = [];
  quincena: number = 1;
  borrador: TrabajadorAsistencia = null;
  errorFila: string = '';
  trabajadores: TrabajadorAsistencia[] = [];
  trabajadoresAnteriores: TrabajadorAsistencia[] = [];
  totalesFila: { [id: string]: any } = {};
  totalesDia: { [dia: number]: any } = {};
  resumen: any = { hh: 0, trabajadores: 0, jornadas: 0, extra: 0, capacitacion: 0 };

  cargando: boolean = true;
  errorCarga: boolean = false;
  estadoGuardado: string = '';

  private idUsuario: any = null;
  private cargaActual: number = 0;
  private guardadosPendientes: number = 0;
  private contadorIds: number = 0;

  ngOnInit() {
    try {
      this.idUsuario = JSON.parse(localStorage.getItem('usuario') || '{}').idUsuario || null;
    } catch (error) {
      this.idUsuario = null;
    }
    if (this.anios.indexOf(this.anio) === -1) {
      this.anios = [this.anio].concat(this.anios);
    }
    this.cargarMes();
  }

  cargarMes() {
    const anio = Number(this.anio);
    const mes = Number(this.mes);
    const carga = ++this.cargaActual;

    this.cargando = true;
    this.errorCarga = false;
    this.estadoGuardado = '';
    this.errorFila = '';
    this.trabajadoresAnteriores = [];
    this.borrador = this.crearBorrador();
    this.prepararDias(anio, mes);
    const hoy = new Date();
    this.seleccionarQuincena(anio === hoy.getFullYear() && mes === hoy.getMonth() + 1 && hoy.getDate() > 15 ? 2 : 1);

    if (!this.idSubProyecto) {
      this.cargando = false;
      this.errorCarga = true;
      return;
    }

    this.leerTrabajadores(anio, mes)
      .then((trabajadores: TrabajadorAsistencia[]) => {
        if (carga !== this.cargaActual) { return; }
        this.trabajadores = trabajadores;
        this.recalcular();
        this.cargando = false;
        if (!trabajadores.length) {
          this.buscarMesAnterior(anio, mes, carga);
        }
      })
      .catch((error: any) => {
        if (carga !== this.cargaActual) { return; }
        console.error('Error al cargar la asistencia:', error);
        this.cargando = false;
        this.errorCarga = true;
      });
  }

  private leerTrabajadores(anio: number, mes: number): Promise<TrabajadorAsistencia[]> {
    return firestoreDB.collection(COLECCION).doc(this.getIdDocumento(anio, mes)).get()
      .then((doc: any) => {
        const mapa = doc.exists ? (doc.data().trabajadores || {}) : {};
        return Object.keys(mapa)
          .filter(id => !mapa[id].eliminado)
          .map(id => ({
            id: id,
            nombre: mapa[id].nombre || '',
            apellido: mapa[id].apellido || '',
            rut: mapa[id].rut || '',
            lugar: mapa[id].lugar || '',
            cargo: mapa[id].cargo || '',
            orden: Number(mapa[id].orden) || 0,
            dias: mapa[id].dias || {}
          }))
          .sort((a, b) => a.orden - b.orden);
      });
  }

  private buscarMesAnterior(anio: number, mes: number, carga: number) {
    const anioAnterior = mes === 1 ? anio - 1 : anio;
    const mesAnterior = mes === 1 ? 12 : mes - 1;

    this.leerTrabajadores(anioAnterior, mesAnterior)
      .then((trabajadores: TrabajadorAsistencia[]) => {
        if (carga === this.cargaActual) { this.trabajadoresAnteriores = trabajadores; }
      })
      .catch((error: any) => console.error('Error al buscar el mes anterior:', error));
  }

  private prepararDias(anio: number, mes: number) {
    const corto = this.meses[mes - 1].corto;
    const total = new Date(anio, mes, 0).getDate();
    const feriados = getFeriadosChile(anio);
    const dias: { numero: number, fecha: string, finDeSemana: boolean, feriado: string }[] = [];
    for (let numero = 1; numero <= total; numero++) {
      const dia = new Date(anio, mes - 1, numero).getDay();
      dias.push({
        numero: numero,
        fecha: numero + '-' + corto,
        finDeSemana: dia === 0 || dia === 6,
        feriado: feriados[mes + '-' + numero] || ''
      });
    }
    this.dias = dias;
  }

  private recalcular() {
    const resumen = { hh: 0, trabajadores: 0, jornadas: 0, extra: 0, capacitacion: 0 };
    const totalesFila: { [id: string]: any } = {};
    const totalesDia: { [dia: number]: any } = {};

    this.dias.forEach(dia => totalesDia[dia.numero] = { jornada: 0, extra: 0, capacitacion: 0 });

    this.trabajadores.forEach(trabajador => {
      const fila: any = { jornada: 0, extra: 0, capacitacion: 0, hh: 0 };
      this.dias.forEach(dia => {
        const delDia = trabajador.dias[dia.numero] || {};
        this.campos.forEach(item => {
          const valor = Number(delDia[item.campo]) || 0;
          fila[item.campo] += valor;
          totalesDia[dia.numero][item.campo] += valor;
        });
      });
      fila.hh = this.redondear(fila.jornada * HORAS_JORNADA + fila.extra + fila.capacitacion);
      totalesFila[trabajador.id] = fila;

      resumen.hh += fila.hh;
      resumen.jornadas += fila.jornada;
      resumen.extra += fila.extra;
      resumen.capacitacion += fila.capacitacion;
      if (fila.hh > 0) { resumen.trabajadores++; }
    });

    resumen.hh = this.redondear(resumen.hh);
    resumen.capacitacion = this.redondear(resumen.capacitacion);
    this.resumen = resumen;
    this.totalesFila = totalesFila;
    this.totalesDia = totalesDia;
  }

  /** Los valores a cargar en Estadísticas HH. Si el mes no tiene asistencia, no se toca lo escrito a mano. */
  private getValoresMes(anio: number, mes: number): any {
    const anterior = (this.datosHH[anio] && this.datosHH[anio][mes]) || {};
    const valores: any = {};
    const hayHoras = this.resumen.jornadas > 0 || this.resumen.extra > 0;
    const hayCapacitacion = this.resumen.capacitacion > 0;

    if (hayHoras || anterior.asistencia) {
      valores.hh = hayHoras ? this.redondear(this.resumen.jornadas * HORAS_JORNADA) : null;
      valores.horasExtra = hayHoras ? this.redondear(this.resumen.extra) : null;
      valores.hhTotales = hayHoras ? this.resumen.hh : null; // Base de IF e IS
      valores.trabajadores = hayHoras ? this.resumen.trabajadores : null;
      valores.asistencia = hayHoras;
    }
    if (hayCapacitacion || anterior.asistenciaCapacitacion) {
      valores[CAMPO_CAPACITACION] = hayCapacitacion ? this.resumen.capacitacion : null;
      valores.asistenciaCapacitacion = hayCapacitacion;
    }
    return valores;
  }

  private persistir(datos: any, revertir: () => void): Promise<boolean> {
    const anio = Number(this.anio);
    const mes = Number(this.mes);
    const base = {
      idSubProyecto: this.idSubProyecto,
      idProyecto: this.idProyecto === undefined ? null : this.idProyecto,
      nombreSubProyecto: this.nombreSubProyecto || '',
      anio: anio,
      idUsuarioActualizacion: this.idUsuario,
      fechaActualizacion: new Date().toISOString()
    };

    this.recalcular();
    const valoresMes = this.getValoresMes(anio, mes);
    const batch = firestoreDB.batch();
    batch.set(firestoreDB.collection(COLECCION).doc(this.getIdDocumento(anio, mes)),
      { ...base, mes: mes, ...datos }, { merge: true });
    if (Object.keys(valoresMes).length) {
      batch.set(firestoreDB.collection(COLECCION_HH).doc(this.idSubProyecto + '_' + anio),
        { ...base, meses: { [mes]: valoresMes } }, { merge: true });
    }

    this.guardadosPendientes++;
    this.estadoGuardado = 'guardando';

    return batch.commit()
      .then(() => {
        this.guardadosPendientes--;
        if (!this.guardadosPendientes && this.estadoGuardado !== 'error') {
          this.estadoGuardado = 'guardado';
        }
        this.resumenActualizado.emit({ anio: anio, mes: mes, valores: valoresMes });
        return true;
      })
      .catch((error: any) => {
        console.error('Error al guardar la asistencia:', error);
        this.guardadosPendientes--;
        this.estadoGuardado = 'error';
        if (anio === Number(this.anio) && mes === Number(this.mes)) {
          revertir();
          this.recalcular();
        }
        return false;
      });
  }

  guardarCelda(trabajador: TrabajadorAsistencia, dia: number, campo: string, input: any) {
    if (this.soloLectura) { return; }

    const valor = this.leerValor(input.value, campo);
    if (valor === undefined) {
      input.value = this.getTextoCelda(trabajador, dia, campo);
      return;
    }

    const delDia = trabajador.dias[dia] || (trabajador.dias[dia] = {});
    const anterior = delDia[campo] === undefined ? null : delDia[campo];
    delDia[campo] = valor;
    input.value = this.getTextoCelda(trabajador, dia, campo);
    if (valor === anterior) { return; }

    this.persistir(
      { trabajadores: { [trabajador.id]: { dias: { [dia]: { [campo]: valor } } } } },
      () => {
        delDia[campo] = anterior;
        input.value = this.getTextoCelda(trabajador, dia, campo);
      }
    );
  }

  /** Jornada: de 0 a 1 (1 es día completo). Horas extra y capacitación: horas del día. */
  private leerValor(texto: string, campo: string): number | null | undefined {
    const limpio = (texto || '').replace(/\s/g, '');
    if (!limpio) { return null; }
    if (!/^\d+([.,]\d+)?$/.test(limpio)) { return undefined; }

    const valor = this.redondear(Number(limpio.replace(',', '.')));
    return valor > (campo === 'jornada' ? 1 : 24) ? undefined : valor;
  }

  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  formatear(valor: number): string {
    const partes = String(this.redondear(valor || 0)).split('.');
    return partes[0].replace(/\B(?=(\d{3})+$)/g, '.') + (partes[1] ? ',' + partes[1] : '');
  }

  getTextoCelda(trabajador: TrabajadorAsistencia, dia: number, campo: string): string {
    const delDia = trabajador.dias[dia] || {};
    const valor = delDia[campo];
    return valor === null || valor === undefined ? '' : this.formatear(valor);
  }

  getTotalDia(dia: number, campo: string): string {
    const total = this.totalesDia[dia] ? this.totalesDia[dia][campo] : 0;
    return total ? this.formatear(total) : '';
  }

  get nombreMes(): string {
    return this.meses[Number(this.mes) - 1].nombre;
  }

  get nombreMesAnterior(): string {
    return this.meses[Number(this.mes) === 1 ? 11 : Number(this.mes) - 2].nombre;
  }

  /** HH escritas a mano que se reemplazarán con la primera jornada marcada. */
  get hhManual(): number {
    const anio = this.datosHH[Number(this.anio)];
    const delMes = anio ? anio[Number(this.mes)] : null;
    return delMes && !delMes.asistencia && !this.resumen.hh ? Number(delMes.hh) || 0 : 0;
  }

  seleccionarQuincena(quincena: number) {
    this.quincena = quincena;
    this.diasVisibles = this.dias.filter(dia => quincena === 1 ? dia.numero <= 15 : dia.numero > 15);
  }

  /** La tabla lleva su ancho exacto para que los estilos globales no aplasten las columnas. */
  get anchoTabla(): number {
    const trabajador = this.camposTrabajador.reduce((suma, item) => suma + item.ancho, 28);
    return trabajador + (this.soloLectura ? 0 : 26) + this.diasVisibles.length * 108 + 192;
  }

  /** Lista más la fila vacía del final, donde se escribe un trabajador nuevo. */
  get filas(): TrabajadorAsistencia[] {
    return this.soloLectura ? this.trabajadores : this.trabajadores.concat(this.borrador);
  }

  private crearBorrador(): TrabajadorAsistencia {
    return {
      id: this.getIdNuevo(),
      nombre: '',
      apellido: '',
      rut: '',
      lugar: this.nombreSubProyecto || '',
      cargo: '',
      orden: 0,
      dias: {},
      nuevo: true
    };
  }

  /** Un trabajador nuevo se guarda cuando su fila tiene nombre y apellido. */
  guardarDato(trabajador: TrabajadorAsistencia, campo: string, input: any) {
    if (this.soloLectura) { return; }

    const valor = (input.value || '').trim();
    const anterior = trabajador[campo];
    this.errorFila = '';
    input.value = valor;
    if (valor === anterior) { return; }

    if (!trabajador.nuevo && !valor && (campo === 'nombre' || campo === 'apellido')) {
      input.value = anterior;
      this.errorFila = 'El trabajador debe tener nombre y apellido.';
      return;
    }
    if (campo === 'rut' && this.rutRepetido(valor, trabajador.id)) {
      input.value = anterior;
      this.errorFila = 'Ya hay un trabajador con ese RUT en este mes.';
      return;
    }

    trabajador[campo] = valor;

    if (trabajador.nuevo) {
      if (trabajador.nombre && trabajador.apellido) { this.confirmarBorrador(trabajador); }
      return;
    }

    this.persistir({ trabajadores: { [trabajador.id]: { [campo]: valor } } }, () => {
      trabajador[campo] = anterior;
      input.value = anterior;
    });
  }

  private confirmarBorrador(trabajador: TrabajadorAsistencia) {
    trabajador.nuevo = false;
    trabajador.orden = this.getSiguienteOrden();
    this.trabajadores = this.trabajadores.concat(trabajador);
    this.trabajadoresAnteriores = [];
    this.borrador = this.crearBorrador();

    this.persistir({ trabajadores: { [trabajador.id]: this.getDatosTrabajador(trabajador) } }, () => {
      this.trabajadores = this.trabajadores.filter(item => item.id !== trabajador.id);
    });
  }

  private rutRepetido(rut: string, id: string): boolean {
    const limpio = this.limpiarRut(rut);
    return !!limpio && this.trabajadores.some(item => item.id !== id && this.limpiarRut(item.rut) === limpio);
  }

  copiarMesAnterior() {
    if (this.soloLectura || !this.trabajadoresAnteriores.length) { return; }

    const orden = this.getSiguienteOrden();
    const nuevos = this.trabajadoresAnteriores.map((item, indice) => ({
      id: this.getIdNuevo(),
      nombre: item.nombre,
      apellido: item.apellido,
      rut: item.rut,
      lugar: item.lugar,
      cargo: item.cargo,
      orden: orden + indice,
      dias: {}
    }));
    const datos: any = {};
    nuevos.forEach(item => datos[item.id] = this.getDatosTrabajador(item));

    this.trabajadores = this.trabajadores.concat(nuevos);
    this.trabajadoresAnteriores = [];
    this.persistir({ trabajadores: datos }, () => {
      this.trabajadores = this.trabajadores.filter(item => !datos[item.id]);
    });
  }

  eliminar(trabajador: TrabajadorAsistencia) {
    if (this.soloLectura) { return; }

    Swal.fire({
      title: '¿Quitar a este trabajador?',
      text: trabajador.nombre + ' ' + trabajador.apellido + ' saldrá de ' + this.nombreMes + ' y sus horas dejarán de contar.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar'
    }).then((resultado: any) => {
      if (!resultado || !(resultado.value || resultado.isConfirmed)) { return; }

      const lista = this.trabajadores;
      this.trabajadores = lista.filter(item => item.id !== trabajador.id);
      this.persistir({ trabajadores: { [trabajador.id]: { eliminado: true } } }, () => {
        this.trabajadores = lista;
      });
    });
  }

  private getDatosTrabajador(trabajador: TrabajadorAsistencia): any {
    return {
      nombre: trabajador.nombre,
      apellido: trabajador.apellido,
      rut: trabajador.rut,
      lugar: trabajador.lugar,
      cargo: trabajador.cargo,
      orden: trabajador.orden
    };
  }

  private getIdNuevo(): string {
    return 't' + Date.now() + '_' + (++this.contadorIds);
  }

  private getSiguienteOrden(): number {
    return this.trabajadores.reduce((mayor, item) => Math.max(mayor, item.orden), 0) + 1;
  }

  private limpiarRut(rut: string): string {
    return (rut || '').replace(/[.\-\s]/g, '').toLowerCase();
  }

  private getIdDocumento(anio: number, mes: number): string {
    return this.idSubProyecto + '_' + anio + '_' + mes;
  }

  trackDia(index: number, dia: any) {
    return dia.numero;
  }

  trackCampo(index: number, item: any) {
    return item.campo;
  }

  trackTrabajador(index: number, trabajador: TrabajadorAsistencia) {
    return trabajador.id;
  }
}