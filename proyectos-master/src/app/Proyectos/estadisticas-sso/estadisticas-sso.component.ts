import { Component, HostListener, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firestoreDB } from '../../firebase-init';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { sPerfil } from '../../services/sPerfil.service';
import { ACCIDENTES_HISTORICOS, AccidenteHistorico } from './accidentes-historicos';
import * as firebase from 'firebase/app';
import 'firebase/storage';

declare var Swal: any;

/**
 * Seguimiento de accidentes por subproyecto.
 * Firestore: un documento por accidente en 'accidentesSSO', con idSubProyecto para los consolidados.
 */
const COLECCION = 'accidentesSSO';
const COLECCION_MA = 'estadisticasMA';
const COLECCION_CERTIFICADOS_MA = 'certificadosMA';
const MAX_MB_CERTIFICADO = 50;
const MAX_MB_ADJUNTO = 50;
/** Misma clave del candado de Control de Hallazgos (hash + salt en hallazgosConfig). */
const DOC_CLAVE_GERENCIA = '_claveGerencia';
const PRIMER_ANIO_SISTEMA = 2026; // Hasta 2025 manda el registro histórico

const MEDIDAS_MENOR = 'Charlas de 5 minutos, uso de EPP, señalización. Reinducción, cumplimiento programa prevención de riesgos, control de los riesgos.';
const MEDIDAS_INTERMEDIO = 'Charlas de 5 minutos, reinducción, aplicación de procedimientos de trabajo seguro, uso de EPP, inspección de equipos y herramientas, capacitación con el autocuidado, capacitación a línea de mando sobre riesgos asociados, revisar protocolos y procedimientos de ejecución.';
const MEDIDAS_GRAVE = 'Charlas de 5 minutos, evaluación del riesgo antes de iniciar la faena, aplicación de procedimientos de trabajo seguro, supervisión directa, uso de EPP, aplicación de protocolos de seguridad, inspección de equipos y herramientas, capacitación del personal, revisión matriz de riesgos.';

export interface AdjuntoSSO {
  nombre: string;
  ruta: string;
  url: string;
  tamano: number;
  tipo: string;
  idUsuario: any;
  fechaSubida: string;
}

export interface AccidenteSSO {
  id?: string;
  fecha: string;
  tipo: string;
  grado: number;
  diasPerdidos: number;
  descripcion: string;
  medidasControl: string;
  estado: string;
  // Datos del cuadro Excel de accidentes
  nombre?: string;
  rut?: string;
  lugar?: string;
  comuna?: string;
  obra?: string;
  empresa?: string;
  declaracionIncidente?: string;
  informePreliminar?: string;
  informeDefinitivo?: string;
  fechaAltaMedica?: string;
  resolucionMutual?: string;
  adjuntos?: AdjuntoSSO[];
  // Candado (igual que Control de Hallazgos)
  bloqueado?: boolean;
  bloqueadoPor?: number;
  bloqueadoPorNombre?: string;
  fechaBloqueo?: string;
}

interface IndicadorMA {
  campo: string;
  etiqueta: string;
  unidad: string;
  decimales: number;
}

interface RegistroConsolidadoMA {
  idSubProyecto: string;
  nombre: string;
  idProyecto: string;
  nombreProyecto: string;
  anio: number;
  meses: any;
}

interface FilaHistorico extends AccidenteHistorico {
  clave: string;
  numeroFila: number;
}

interface GrupoHistorico {
  anio: number;
  filas: FilaHistorico[];
  diasPerdidos: number;
  graves: number;
}

interface ProyectoConsolidadoMA {
  nombre: string;
  subproyectos: number;
  anios: { anio: number, totales: string[] }[];
  totales: string[];
}

export interface CertificadoMA {
  id?: string;
  idSubProyecto: any;
  idProyecto: any;
  anio: number;
  nombre: string;
  ruta: string;
  url: string;
  tamano: number;
  tipo: string;
  idUsuario: any;
  fechaSubida: string;
  /** Campo del indicador (consumoAgua, ...). Vacío = certificado general del año. */
  indicador?: string;
  /** Desglose o nota que escribe quien sube el archivo. */
  descripcion?: string;
  subidoPor?: string;
}

@Component({
  selector: 'app-estadisticas-sso',
  templateUrl: './estadisticas-sso.component.html',
  styleUrls: ['./estadisticas-sso.component.css'],
  providers: [sPerfil]
})
export class EstadisticasSsoComponent implements OnInit {

  @Input() idSubProyecto: any = null;
  @Input() idProyecto: any = null;
  @Input() nombreSubProyecto: string = '';
  @Input() nombreProyecto: string = '';
  @Input() soloLectura: boolean = false;
  consolidadoHistorico: boolean = false;

  readonly tipos = [
    { nombre: 'Incidente menor', clase: 'tipo-incidente' },
    { nombre: 'Acc. de Trabajo SDP', clase: 'tipo-trabajo-sdp' },
    { nombre: 'Acc. de Trabajo CDP', clase: 'tipo-trabajo-cdp' },
    { nombre: 'Acc. de Trayecto SDP', clase: 'tipo-trayecto-sdp' },
    { nombre: 'Acc. de Trayecto CDP', clase: 'tipo-trayecto-cdp' },
    { nombre: 'Enfermedad Común', clase: 'tipo-enf-comun' },
    { nombre: 'Enfermedad Prof.', clase: 'tipo-enf-prof' }
  ];

  readonly grados = [
    { numero: 1, clasificacion: 'Grado Menor', medidas: MEDIDAS_MENOR },
    { numero: 2, clasificacion: 'Grado Menor', medidas: MEDIDAS_MENOR },
    { numero: 3, clasificacion: 'Grado Intermedio', medidas: MEDIDAS_INTERMEDIO },
    { numero: 4, clasificacion: 'Grado Intermedio', medidas: MEDIDAS_INTERMEDIO },
    { numero: 5, clasificacion: 'Grave', medidas: MEDIDAS_GRAVE },
    { numero: 6, clasificacion: 'Grave', medidas: MEDIDAS_GRAVE }
  ];

  readonly opcionesDeclaracion: string[] = ['Sí', 'No'];
  readonly opcionesInforme: string[] = ['Sí', 'No', 'En ejecución', 'N/A'];
  readonly resolucionesMutual: string[] = ['Trabajo', 'Trayecto', 'Enfermedad Común', 'Enfermedad Profesional', 'N/A'];

  readonly hoy: string = this.getFechaHoy();

  readonly mesesMA = [
    { numero: 1, nombre: 'Enero', corto: 'Ene' }, { numero: 2, nombre: 'Febrero', corto: 'Feb' }, { numero: 3, nombre: 'Marzo', corto: 'Mar' },
    { numero: 4, nombre: 'Abril', corto: 'Abr' }, { numero: 5, nombre: 'Mayo', corto: 'May' }, { numero: 6, nombre: 'Junio', corto: 'Jun' },
    { numero: 7, nombre: 'Julio', corto: 'Jul' }, { numero: 8, nombre: 'Agosto', corto: 'Ago' }, { numero: 9, nombre: 'Septiembre', corto: 'Sep' },
    { numero: 10, nombre: 'Octubre', corto: 'Oct' }, { numero: 11, nombre: 'Noviembre', corto: 'Nov' }, { numero: 12, nombre: 'Diciembre', corto: 'Dic' }
  ];

  readonly indicadoresMA: IndicadorMA[] = [
    { campo: 'consumoAgua', etiqueta: 'Consumo de agua', unidad: 'LTS', decimales: 2 },
    { campo: 'consumoCombustible', etiqueta: 'Consumo de combustible', unidad: 'LTS', decimales: 2 },
    { campo: 'residuosDomiciliarios', etiqueta: 'Consumo de residuos domiciliarios', unidad: 'TONS.', decimales: 2 },
    { campo: 'disposicionEscombros', etiqueta: 'Disposición de escombros', unidad: 'TONS.', decimales: 2 },
    { campo: 'disposicionChatarraMetalica', etiqueta: 'Disposición de chatarra metálica', unidad: 'TONS.', decimales: 2 },
    { campo: 'disposicionResiduosPeligrosos', etiqueta: 'Disposición de residuos peligrosos', unidad: 'TONS.', decimales: 2 },
    { campo: 'disposicionAsbesto', etiqueta: 'Disposición de asbesto', unidad: 'TONS.', decimales: 2 },
    { campo: 'disposicionOtros', etiqueta: 'Disposición de otros', unidad: 'TONS.', decimales: 2 },
    { campo: 'disposicionPapel', etiqueta: 'Disposición de papel', unidad: '', decimales: 2 }
  ];

  aniosMA: number[] = [];
  anioMA: number = new Date().getFullYear();
  readonly mesActualMA: number = new Date().getMonth() + 1;
  readonly anioActualMA: number = new Date().getFullYear();
  valoresMA: any = {};
  cargandoMA: boolean = true;
  errorCargaMA: boolean = false;
  estadoGuardadoMA: string = '';

  // Total acumulado de todos los años: este subproyecto y el proyecto completo
  totalesMASubproyectoHistorico: string[] = [];
  totalesMAProyecto: string[] = [];
  subproyectosProyectoMA: number = 0;
  cargandoTotalProyectoMA: boolean = false;
  errorTotalProyectoMA: boolean = false;
  private otrosSubproyectosMA: { idSubProyecto: string, meses: any }[] = [];

  // Certificado MA: adjuntos por subproyecto y año (Storage + Firestore)
  certificadosMA: CertificadoMA[] = [];
  certificadosMAVista: CertificadoMA[] = [];
  cargandoCertificadosMA: boolean = false;
  errorCertificadosMA: boolean = false;
  subiendoCertificadoMA: boolean = false;
  progresoCertificadoMA: number = 0;
  errorSubidaCertificadoMA: string = '';
  // Adjuntos de cada indicador de MA (se abren debajo de la fila)
  adjuntosIndicadorMA: { [campo: string]: CertificadoMA[] } = {};
  indicadorMAAbierto: string | null = null;
  posicionAdjuntosMA: { top: number, left: number } = { top: 0, left: 0 };
  descripcionNuevaMA: string = '';          // desglose para los archivos que se van a subir
  editandoDescripcionMA: string | null = null;
  textoDescripcionMA: string = '';
  subiendoIndicadorMA: string = '';   // campo que se está subiendo ('' = certificado general)
  errorIndicadorMA: string = '';
  errorIndicadorMACampo: string = '';

  // Pestañas del subproyecto: 'seguridad' (accidentes) | 'ma' | 'incidentes'
  vistaSubproyecto: string = 'seguridad';
  totalSeguridad: number = 0;
  totalIncidentes: number = 0;
  readonly accidentesPorPagina: number = 10;
  filtroAnio: string = 'todos';
  filtroEstado: string = 'todos';
  filtroBusqueda: string = '';
  paginaAccidentes: number = 1;
  aniosAccidentes: string[] = [];
  accidentesFiltrados: AccidenteSSO[] = [];
  accidentesPagina: AccidenteSSO[] = [];
  resumenAccidentes: any = { total: 0, abiertos: 0, diasPerdidos: 0, graves: 0 };
  detalleAbiertoId: string | null = null;
  estadisticasSubproyecto: any = this.calcularEstadisticas([], []);
  verReferenciaGrados: boolean = false;

  // Adjuntos de cada registro (Storage: accidentesSSO/<subproyecto>/<registro>/)
  archivosFormulario: File[] = [];
  subiendoAdjuntosId: string | null = null;
  progresoAdjuntos: number = 0;
  errorAdjuntos: string = '';

  // Candado: solo el perfil SUB-GERENTE lo ve y lo usa
  esSubGerente: boolean = false;
  accesoTemporalBloqueo: { [id: string]: boolean } = {};
  private idsPerfilesUsuario: number[] = [];
  private idsPerfilesSubGerente: number[] = [];
  private usuario: any = null;

  accidentes: AccidenteSSO[] = [];
  cargando: boolean = true;
  errorCarga: boolean = false;
  guardando: boolean = false;
  formularioAbierto: boolean = false;
  editandoId: string | null = null;
  errorFormulario: string = '';
  formulario: AccidenteSSO = this.getFormularioVacio();

  sinPermisoConsolidado: boolean = false;
  historicoAnio: string = 'todos';
  historicoBusqueda: string = '';
  historicoAnios: string[] = [];
  historicoFilas: FilaHistorico[] = [];
  historicoGrupos: GrupoHistorico[] = [];
  filaHistoricoAbierta: string | null = null;
  diasSinAccidentes: number | null = null;
  fechaUltimoAccidente: string = '';
  obraUltimoAccidente: string = '';
  private historicoTodas: FilaHistorico[] = [];
  historicoResumen: any = { total: 0, diasPerdidos: 0, graves: 0, conDias: 0 };
  historicoEstadisticas: any = this.calcularEstadisticas([], []);
  errorHistoricoSistema: boolean = false;

  consolidadoVista: string = 'sso';
  consolidadoMAAnios: number[] = [];
  consolidadoMAAnio: number = new Date().getFullYear();
  consolidadoMASubproyecto: string = 'todos';
  consolidadoMASubproyectos: { id: string, nombre: string }[] = [];
  consolidadoMAFilas: { indicador: IndicadorMA, meses: string[], total: string }[] = [];
  consolidadoMAPorSubproyecto: { nombre: string, totales: string[] }[] = [];
  consolidadoMATotales: string[] = [];
  consolidadoMAProyectos: ProyectoConsolidadoMA[] = [];
  consolidadoMATotalesProyectos: string[] = [];
  consolidadoMAResumen: any = { subproyectos: 0, agua: '-', combustible: '-', residuos: '-' };
  errorConsolidadoMA: boolean = false;

  private idUsuario: any = null;
  private accidentesSistema: AccidenteHistorico[] = [];
  private datosMAPorAnio: { [anio: number]: any } = {};
  private respaldoMA: { [clave: string]: number | null } = {};
  private guardadosPendientesMA: number = 0;
  private registrosConsolidadoMA: RegistroConsolidadoMA[] = [];

  constructor(
    private route: ActivatedRoute,
    private _sUsuariosPerfiles: sUsuariosPerfiles,
    private _sPerfil: sPerfil
  ) {}

  ngOnInit() {
    this.consolidadoHistorico = this.route.snapshot.data['consolidadoSSO'] === true;
    try {
      this.usuario = JSON.parse(localStorage.getItem('usuario') || '{}') || {};
      this.idUsuario = this.usuario.idUsuario || null;
    } catch (error) {
      this.usuario = {};
      this.idUsuario = null;
    }

    if (this.consolidadoHistorico) {
      this.cargarConsolidadoSso();
      return;
    }

    this.cargarPerfilesCandado();
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
        const accidentes: AccidenteSSO[] = [];
        snapshot.forEach((doc: any) => accidentes.push({ ...doc.data(), id: doc.id }));
        this.accidentes = accidentes;
        this.recalcular();
        this.cargando = false;
        this.cargarEstadisticasMA();
        this.cargarCertificadosMA();
      })
      .catch((error: any) => {
        console.error('Error al cargar los accidentes:', error);
        this.cargando = false;
        this.errorCarga = true;
      });
  }

  cargarEstadisticasMA() {
    this.cargandoMA = true;
    this.errorCargaMA = false;

    if (!this.idSubProyecto) {
      this.cargandoMA = false;
      this.errorCargaMA = true;
      return;
    }

    firestoreDB.collection(COLECCION_MA).where('idSubProyecto', '==', this.idSubProyecto).get()
      .then((snapshot: any) => {
        this.datosMAPorAnio = {};
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          this.datosMAPorAnio[Number(data.anio)] = data.meses || {};
        });
        this.prepararAniosMA();
        this.seleccionarAnioMA();
        this.cargandoMA = false;
        this.cargarTotalProyectoMA();
      })
      .catch((error: any) => {
        console.error('Error al cargar las estadísticas de MA:', error);
        this.cargandoMA = false;
        this.errorCargaMA = true;
      });
  }

  private prepararAniosMA() {
    const anios: { [anio: number]: boolean } = {};
    for (let anio = this.anioActualMA; anio >= this.anioActualMA - 5; anio--) {
      anios[anio] = true;
    }
    Object.keys(this.datosMAPorAnio).forEach(anio => anios[Number(anio)] = true);
    this.aniosMA = Object.keys(anios).map(Number).sort((a, b) => b - a);
  }

  seleccionarAnioMA() {
    const anio = Number(this.anioMA);
    if (!this.datosMAPorAnio[anio]) {
      this.datosMAPorAnio[anio] = {};
    }

    this.mesesMA.forEach(mes => {
      const delMes = this.datosMAPorAnio[anio][mes.numero] || (this.datosMAPorAnio[anio][mes.numero] = {});
      this.indicadoresMA.forEach(indicador => {
        const valor = delMes[indicador.campo];
        delMes[indicador.campo] = valor === undefined ? null : valor;
        this.respaldoMA[this.getClaveMA(anio, mes.numero, indicador.campo)] = delMes[indicador.campo];
      });
    });

    this.valoresMA = this.datosMAPorAnio[anio];
    this.filtrarCertificadosMA();
  }

  guardarCeldaMA(mes: number, indicador: IndicadorMA, input: any) {
    if (this.soloLectura) { return; }

    const anio = Number(this.anioMA);
    const clave = this.getClaveMA(anio, mes, indicador.campo);
    const valor = this.normalizarValorMA(input.value, indicador.decimales);

    if (valor === undefined) {
      input.value = this.getTextoCeldaMA(mes, indicador.campo);
      return;
    }

    this.valoresMA[mes][indicador.campo] = valor;
    input.value = this.getTextoCeldaMA(mes, indicador.campo);
    this.recalcularTotalesProyectoMA();
    if (valor === this.respaldoMA[clave]) { return; }

    const anterior = this.respaldoMA[clave];
    this.respaldoMA[clave] = valor;
    this.guardadosPendientesMA++;
    this.estadoGuardadoMA = 'guardando';

    firestoreDB.collection(COLECCION_MA).doc(this.idSubProyecto + '_' + anio).set({
      idSubProyecto: this.idSubProyecto,
      idProyecto: this.idProyecto === undefined ? null : this.idProyecto,
      nombreSubProyecto: this.nombreSubProyecto || '',
      nombreProyecto: this.nombreProyecto || '',
      anio: anio,
      idUsuarioActualizacion: this.idUsuario,
      fechaActualizacion: new Date().toISOString(),
      meses: { [mes]: { [indicador.campo]: valor } }
    }, { merge: true })
      .then(() => {
        this.guardadosPendientesMA--;
        if (!this.guardadosPendientesMA && this.estadoGuardadoMA !== 'error') {
          this.estadoGuardadoMA = 'guardado';
        }
      })
      .catch((error: any) => {
        console.error('Error al guardar la estadística de MA:', error);
        this.guardadosPendientesMA--;
        this.respaldoMA[clave] = anterior;
        this.datosMAPorAnio[anio][mes][indicador.campo] = anterior;
        this.recalcularTotalesProyectoMA();
        this.estadoGuardadoMA = 'error';
      });
  }

  private normalizarValorMA(texto: string, decimales: number): number | null | undefined {
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
    if (isNaN(resultado)) { return undefined; }
    const factor = Math.pow(10, decimales);
    return Math.round(resultado * factor) / factor;
  }

  private getClaveMA(anio: number, mes: number, campo: string): string {
    return anio + '-' + mes + '-' + campo;
  }

  private formatearMA(valor: number | null): string {
    if (valor === null || valor === undefined) { return '-'; }
    const partes = String(Math.round(valor * 100) / 100).split('.');
    return partes[0].replace(/\B(?=(\d{3})+$)/g, '.') + (partes[1] ? ',' + partes[1] : '');
  }

  getTextoCeldaMA(mes: number, campo: string): string {
    const delMes = this.valoresMA[mes] || {};
    return delMes[campo] === null || delMes[campo] === undefined ? '' : this.formatearMA(delMes[campo]);
  }

  getTotalMA(campo: string): string {
    let total: number = 0;
    let hayValores = false;
    this.mesesMA.forEach(mes => {
      const valor = this.valoresMA[mes.numero] ? this.valoresMA[mes.numero][campo] : null;
      if (valor !== null && valor !== undefined) {
        total += Number(valor);
        hayValores = true;
      }
    });
    return this.formatearMA(hayValores ? total : null);
  }

  esMesActualMA(mes: number): boolean {
    return Number(this.anioMA) === this.anioActualMA && mes === this.mesActualMA;
  }

  trackMesMA(index: number, mes: any) {
    return mes.numero;
  }

  trackIndicadorMA(index: number, indicador: IndicadorMA) {
    return indicador.campo;
  }

  /** Trae los demás subproyectos del mismo proyecto (todos los años). */
  cargarTotalProyectoMA() {
    this.errorTotalProyectoMA = false;
    this.otrosSubproyectosMA = [];

    if (!this.tieneProyectoMA) {
      this.recalcularTotalesProyectoMA();
      return;
    }

    this.cargandoTotalProyectoMA = true;
    firestoreDB.collection(COLECCION_MA).where('idProyecto', '==', this.idProyecto).get()
      .then((snapshot: any) => {
        const propio = String(this.idSubProyecto);
        const otros: { idSubProyecto: string, meses: any }[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          // Este subproyecto se toma de lo que está en pantalla, así refleja lo recién editado
          if (String(data.idSubProyecto) !== propio) {
            otros.push({ idSubProyecto: String(data.idSubProyecto), meses: data.meses || {} });
          }
        });
        this.otrosSubproyectosMA = otros;
        this.cargandoTotalProyectoMA = false;
        this.recalcularTotalesProyectoMA();
      })
      .catch((error: any) => {
        console.error('Error al cargar el total del proyecto de MA:', error);
        this.cargandoTotalProyectoMA = false;
        this.errorTotalProyectoMA = true;
        this.recalcularTotalesProyectoMA();
      });
  }

  private recalcularTotalesProyectoMA() {
    const propios = Object.keys(this.datosMAPorAnio).map(anio => ({ meses: this.datosMAPorAnio[Number(anio)] || {} }));
    const todos = propios.concat(this.otrosSubproyectosMA);

    this.totalesMASubproyectoHistorico = this.getTotalesMA(propios);
    this.totalesMAProyecto = this.getTotalesMA(todos);

    const subproyectos: { [id: string]: boolean } = {};
    if (propios.some(registro => this.tieneDatosMA(registro))) { subproyectos[String(this.idSubProyecto)] = true; }
    this.otrosSubproyectosMA
      .filter(registro => this.tieneDatosMA(registro))
      .forEach(registro => subproyectos[registro.idSubProyecto] = true);
    this.subproyectosProyectoMA = Object.keys(subproyectos).length;
  }

  get tieneProyectoMA(): boolean {
    return this.idProyecto !== null && this.idProyecto !== undefined && this.idProyecto !== '';
  }

  // ===== Certificado MA =====

  cargarCertificadosMA() {
    if (!this.idSubProyecto) { return; }
    this.cargandoCertificadosMA = true;
    this.errorCertificadosMA = false;

    firestoreDB.collection(COLECCION_CERTIFICADOS_MA).where('idSubProyecto', '==', this.idSubProyecto).get()
      .then((snapshot: any) => {
        const certificados: CertificadoMA[] = [];
        snapshot.forEach((doc: any) => certificados.push({ ...doc.data(), id: doc.id }));
        this.certificadosMA = certificados;
        this.filtrarCertificadosMA();
        this.cargandoCertificadosMA = false;
      })
      .catch((error: any) => {
        console.error('Error al cargar los certificados de MA:', error);
        this.cargandoCertificadosMA = false;
        this.errorCertificadosMA = true;
      });
  }

  /** Separa los del año: generales (panel Certificado MA) y los de cada indicador. */
  private filtrarCertificadosMA() {
    const anio = Number(this.anioMA);
    const delAnio = this.certificadosMA
      .filter(item => Number(item.anio) === anio)
      .sort((a, b) => (b.fechaSubida || '').localeCompare(a.fechaSubida || ''));

    this.certificadosMAVista = delAnio.filter(item => !item.indicador);

    const porIndicador: { [campo: string]: CertificadoMA[] } = {};
    this.indicadoresMA.forEach(indicador => porIndicador[indicador.campo] = []);
    delAnio.filter(item => !!item.indicador).forEach(item => {
      (porIndicador[item.indicador] || (porIndicador[item.indicador] = [])).push(item);
    });
    this.adjuntosIndicadorMA = porIndicador;
  }

  /** Abre el desplegable de documentos justo debajo del botón del indicador. */
  toggleAdjuntosIndicador(campo: string, evento?: any) {
    if (evento) { evento.stopPropagation(); }
    if (this.indicadorMAAbierto === campo) {
      this.cerrarAdjuntosIndicador();
      return;
    }

    const boton = evento && evento.currentTarget ? (evento.currentTarget as HTMLElement) : null;
    if (boton) {
      const rect = boton.getBoundingClientRect();
      const ancho = 380;
      this.posicionAdjuntosMA = {
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - ancho - 12))
      };
    }
    this.indicadorMAAbierto = campo;
    if (this.errorIndicadorMACampo !== campo) { this.errorIndicadorMA = ''; }
    this.descripcionNuevaMA = '';
    this.editandoDescripcionMA = null;
  }

  cerrarAdjuntosIndicador() {
    this.indicadorMAAbierto = null;
    this.editandoDescripcionMA = null;
  }

  /** "09-11-2026 a las 16:20" */
  getFechaSubidaTexto(iso: string): string {
    const texto = this.getFechaHoraTexto(iso);
    const partes = texto.split(' ');
    return partes.length === 2 ? partes[0] + ' a las ' + partes[1] : texto;
  }

  editarDescripcionAdjuntoMA(archivo: CertificadoMA) {
    if (this.soloLectura) { return; }
    this.editandoDescripcionMA = archivo.id;
    this.textoDescripcionMA = archivo.descripcion || '';
  }

  cancelarDescripcionAdjuntoMA() {
    this.editandoDescripcionMA = null;
    this.textoDescripcionMA = '';
  }

  guardarDescripcionAdjuntoMA(archivo: CertificadoMA) {
    if (this.soloLectura || !archivo.id) { return; }
    const texto = (this.textoDescripcionMA || '').trim();
    const anterior = archivo.descripcion || '';
    this.editandoDescripcionMA = null;
    if (texto === anterior) { return; }

    archivo.descripcion = texto;
    firestoreDB.collection(COLECCION_CERTIFICADOS_MA).doc(archivo.id).update({ descripcion: texto })
      .catch((error: any) => {
        console.error('Error al guardar el desglose del adjunto:', error);
        archivo.descripcion = anterior;
        Swal.fire('Error', 'No se pudo guardar el desglose.', 'error');
      });
  }

  getEtiquetaIndicadorMA(campo: string): string {
    const indicador = this.indicadoresMA.filter(item => item.campo === campo)[0];
    return indicador ? indicador.etiqueta : '';
  }

  /** Clic afuera, Esc, scroll o cambio de tamaño cierran el desplegable (no mientras hay un aviso de SweetAlert). */
  @HostListener('document:click')
  alClickDocumento() {
    if (!this.indicadorMAAbierto || document.querySelector('.swal2-container')) { return; }
    this.cerrarAdjuntosIndicador();
  }

  @HostListener('document:keydown.escape')
  alEscape() {
    if (this.indicadorMAAbierto) { this.cerrarAdjuntosIndicador(); }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  alMoverVentana() {
    if (this.indicadorMAAbierto && !document.querySelector('.swal2-container')) { this.cerrarAdjuntosIndicador(); }
  }

  cantidadAdjuntosIndicador(campo: string): number {
    return (this.adjuntosIndicadorMA[campo] || []).length;
  }

  /** indicador vacío = certificado general del año; con campo = adjunto de ese indicador. */
  subirCertificadosMA(input: any, indicador: string = '') {
    const archivos: File[] = Array.prototype.slice.call(input.files || []);
    input.value = '';
    if (!archivos.length || this.soloLectura || this.subiendoCertificadoMA) { return; }

    const mostrarError = (texto: string) => {
      if (indicador) {
        this.errorIndicadorMA = texto;
        this.errorIndicadorMACampo = indicador;
      } else {
        this.errorSubidaCertificadoMA = texto;
      }
    };

    const muyGrande = archivos.filter(archivo => archivo.size > MAX_MB_CERTIFICADO * 1024 * 1024)[0];
    if (muyGrande) {
      mostrarError('"' + muyGrande.name + '" pesa más de ' + MAX_MB_CERTIFICADO + ' MB.');
      return;
    }

    const anio = Number(this.anioMA);
    const descripcion = indicador ? (this.descripcionNuevaMA || '').trim() : '';
    const totalBytes = archivos.reduce((suma, archivo) => suma + archivo.size, 0) || 1;
    const transferidos: number[] = archivos.map(() => 0);

    this.subiendoCertificadoMA = true;
    this.subiendoIndicadorMA = indicador;
    this.progresoCertificadoMA = 0;
    this.errorSubidaCertificadoMA = '';
    this.errorIndicadorMA = '';

    Promise.all(archivos.map((archivo, indice) => this.subirCertificadoMA(archivo, anio, indicador, descripcion, (bytes: number) => {
      transferidos[indice] = bytes;
      const suma = transferidos.reduce((total, valor) => total + valor, 0);
      this.progresoCertificadoMA = Math.min(100, Math.round(suma * 100 / totalBytes));
    })))
      .then((nuevos: CertificadoMA[]) => {
        this.certificadosMA = nuevos.concat(this.certificadosMA);
        this.filtrarCertificadosMA();
        this.subiendoCertificadoMA = false;
        this.subiendoIndicadorMA = '';
        this.descripcionNuevaMA = '';
      })
      .catch((error: any) => {
        console.error('Error al subir el certificado de MA:', error);
        this.subiendoCertificadoMA = false;
        this.subiendoIndicadorMA = '';
        mostrarError('No se pudieron subir todos los archivos. Inténtalo de nuevo.');
        this.cargarCertificadosMA();
      });
  }

  private subirCertificadoMA(archivo: File, anio: number, indicador: string, descripcion: string, alAvanzar: (bytes: number) => void): Promise<CertificadoMA> {
    const carpeta = indicador ? indicador + '/' : '';
    const ruta = 'certificadosMA/' + this.idSubProyecto + '/' + anio + '/' + carpeta + Date.now() + '_' + this.limpiarNombreArchivo(archivo.name);
    const tipo = archivo.type || 'application/octet-stream';

    return new Promise((resolve, reject) => {
      const tarea: any = (firebase as any).storage().ref(ruta).put(archivo, { contentType: tipo });
      tarea.on('state_changed',
        (estado: any) => alAvanzar(estado.bytesTransferred),
        (error: any) => reject(error),
        () => {
          const referencia = tarea.snapshot.ref;
          const obtenerUrl = referencia && referencia.getDownloadURL
            ? referencia.getDownloadURL()
            : Promise.resolve(tarea.snapshot.downloadURL);

          obtenerUrl
            .then((url: string) => {
              const datos: CertificadoMA = {
                idSubProyecto: this.idSubProyecto,
                idProyecto: this.idProyecto === undefined ? null : this.idProyecto,
                anio: anio,
                nombre: archivo.name,
                ruta: ruta,
                url: url,
                tamano: archivo.size,
                tipo: tipo,
                idUsuario: this.idUsuario,
                fechaSubida: new Date().toISOString(),
                indicador: indicador || '',
                descripcion: descripcion || '',
                subidoPor: this.getNombreUsuarioActual()
              };
              return firestoreDB.collection(COLECCION_CERTIFICADOS_MA).add(datos)
                .then((doc: any) => resolve({ ...datos, id: doc.id }));
            })
            .catch(reject);
        });
    });
  }

  eliminarCertificadoMA(item: CertificadoMA) {
    if (this.soloLectura) { return; }

    Swal.fire({
      title: '¿Eliminar este archivo?',
      text: 'Se borrará "' + item.nombre + '". No se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((resultado: any) => {
      if (!resultado || !(resultado.value || resultado.isConfirmed)) { return; }

      // Si el archivo ya no está en Storage igual se borra el registro
      const borrarArchivo = item.ruta
        ? (firebase as any).storage().ref(item.ruta).delete().catch((error: any) => {
            if (!error || error.code !== 'storage/object-not-found') { throw error; }
          })
        : Promise.resolve();

      borrarArchivo
        .then(() => firestoreDB.collection(COLECCION_CERTIFICADOS_MA).doc(item.id).delete())
        .then(() => {
          this.certificadosMA = this.certificadosMA.filter(certificado => certificado.id !== item.id);
          this.filtrarCertificadosMA();
        })
        .catch((error: any) => {
          console.error('Error al eliminar el certificado de MA:', error);
          Swal.fire('Error', 'No se pudo eliminar el archivo.', 'error');
        });
    });
  }

  private limpiarNombreArchivo(nombre: string): string {
    return (nombre || 'archivo')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w.\-]+/g, '_')
      .substring(0, 120);
  }

  formatearTamano(bytes: number): string {
    const valor = Number(bytes) || 0;
    if (valor < 1024) { return valor + ' B'; }
    if (valor < 1024 * 1024) { return Math.round(valor / 1024) + ' KB'; }
    return (Math.round(valor / 1024 / 1024 * 10) / 10).toString().replace('.', ',') + ' MB';
  }

  getFechaHoraTexto(iso: string): string {
    const fecha = new Date(iso);
    if (isNaN(fecha.getTime())) { return '-'; }
    const dos = (numero: number) => ('0' + numero).slice(-2);
    return dos(fecha.getDate()) + '-' + dos(fecha.getMonth() + 1) + '-' + fecha.getFullYear()
      + ' ' + dos(fecha.getHours()) + ':' + dos(fecha.getMinutes());
  }

  getIconoArchivo(nombre: string): string {
    const extension = ((nombre || '').split('.').pop() || '').toLowerCase();
    if (extension === 'pdf') { return 'fa-file-pdf-o'; }
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic'].indexOf(extension) !== -1) { return 'fa-file-image-o'; }
    if (['doc', 'docx'].indexOf(extension) !== -1) { return 'fa-file-word-o'; }
    if (['xls', 'xlsx', 'csv'].indexOf(extension) !== -1) { return 'fa-file-excel-o'; }
    if (['zip', 'rar', '7z'].indexOf(extension) !== -1) { return 'fa-file-archive-o'; }
    return 'fa-file-o';
  }

  trackCertificadoMA(index: number, item: CertificadoMA) {
    return item.id;
  }

  private recalcular() {
    this.accidentes.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    this.totalIncidentes = this.accidentes.filter(item => this.esIncidente(item)).length;
    this.totalSeguridad = this.accidentes.length - this.totalIncidentes;

    const anios: { [anio: string]: boolean } = {};
    this.registrosVista.forEach(item => {
      const anio = (item.fecha || '').substring(0, 4);
      if (anio) { anios[anio] = true; }
    });
    this.aniosAccidentes = Object.keys(anios).sort((a, b) => b.localeCompare(a));
    if (this.filtroAnio !== 'todos' && !anios[this.filtroAnio]) {
      this.filtroAnio = 'todos';
    }

    // Clasificación por grado de este subproyecto (pestaña activa), año por año
    this.estadisticasSubproyecto = this.calcularEstadisticas(
      this.registrosVista
        .filter(item => (item.fecha || '').length >= 4)
        .map(item => ({ anio: item.fecha.substring(0, 4), grado: Number(item.grado) })),
      this.aniosAccidentes.slice().reverse()
    );

    this.aplicarFiltrosAccidentes();
  }

  /** Al cambiar un filtro se vuelve a la primera página. */
  cambiarFiltrosAccidentes() {
    this.paginaAccidentes = 1;
    this.detalleAbiertoId = null;
    this.aplicarFiltrosAccidentes();
  }

  limpiarFiltrosAccidentes() {
    this.filtroAnio = 'todos';
    this.filtroEstado = 'todos';
    this.filtroBusqueda = '';
    this.cambiarFiltrosAccidentes();
  }

  get hayFiltrosAccidentes(): boolean {
    return this.filtroAnio !== 'todos' || this.filtroEstado !== 'todos' || !!this.filtroBusqueda.trim();
  }

  private aplicarFiltrosAccidentes() {
    const busqueda = this.normalizarTexto(this.filtroBusqueda);

    this.accidentesFiltrados = this.registrosVista.filter(item => {
      if (this.filtroAnio !== 'todos' && (item.fecha || '').substring(0, 4) !== this.filtroAnio) { return false; }
      if (this.filtroEstado !== 'todos' && item.estado !== this.filtroEstado) { return false; }
      if (!busqueda) { return true; }
      return this.normalizarTexto([
        item.tipo, item.descripcion, item.medidasControl, item.nombre, item.rut,
        item.lugar, item.comuna, item.obra, item.empresa, item.resolucionMutual
      ].join(' ')).indexOf(busqueda) !== -1;
    });

    this.resumenAccidentes = {
      total: this.accidentesFiltrados.length,
      abiertos: this.accidentesFiltrados.filter(item => item.estado !== 'Cerrado').length,
      diasPerdidos: this.accidentesFiltrados.reduce((suma, item) => suma + (Number(item.diasPerdidos) || 0), 0),
      graves: this.accidentesFiltrados.filter(item => Number(item.grado) >= 5).length
    };

    this.paginaAccidentes = Math.min(this.paginaAccidentes, this.totalPaginasAccidentes);
    const inicio = (this.paginaAccidentes - 1) * this.accidentesPorPagina;
    this.accidentesPagina = this.accidentesFiltrados.slice(inicio, inicio + this.accidentesPorPagina);
  }

  get totalPaginasAccidentes(): number {
    return Math.max(1, Math.ceil(this.accidentesFiltrados.length / this.accidentesPorPagina));
  }

  get primerAccidentePagina(): number {
    return this.accidentesFiltrados.length ? (this.paginaAccidentes - 1) * this.accidentesPorPagina + 1 : 0;
  }

  get ultimoAccidentePagina(): number {
    return Math.min(this.paginaAccidentes * this.accidentesPorPagina, this.accidentesFiltrados.length);
  }

  cambiarPaginaAccidentes(cambio: number) {
    this.paginaAccidentes = Math.max(1, Math.min(this.paginaAccidentes + cambio, this.totalPaginasAccidentes));
    this.detalleAbiertoId = null;
    this.aplicarFiltrosAccidentes();
  }

  // ===== Pestañas Seguridad / Medio Ambiente / Incidentes =====
  // Seguridad e Incidentes usan la misma colección; se separan por el tipo de registro.

  private esIncidente(item: AccidenteSSO): boolean {
    return (item.tipo || '').indexOf('Incidente') !== -1;
  }

  get enIncidentes(): boolean {
    return this.vistaSubproyecto === 'incidentes';
  }

  get registrosVista(): AccidenteSSO[] {
    const incidentes = this.enIncidentes;
    return this.accidentes.filter(item => incidentes ? this.esIncidente(item) : !this.esIncidente(item));
  }

  get totalVista(): number {
    return this.enIncidentes ? this.totalIncidentes : this.totalSeguridad;
  }

  get palabraRegistro(): string {
    return this.enIncidentes ? 'incidente' : 'accidente';
  }

  get tiposFormulario() {
    const incidentes = this.enIncidentes;
    return this.tipos.filter(tipo => incidentes
      ? tipo.nombre.indexOf('Incidente') !== -1
      : tipo.nombre.indexOf('Incidente') === -1);
  }

  get tituloVista(): string {
    if (this.vistaSubproyecto === 'ma') { return 'Seguimiento MA'; }
    if (this.enIncidentes) { return 'Seguimiento de incidentes'; }
    return 'Seguimiento de seguridad';
  }

  get iconoVista(): string {
    if (this.vistaSubproyecto === 'ma') { return 'fa-leaf'; }
    if (this.enIncidentes) { return 'fa-exclamation-triangle'; }
    return 'fa-shield';
  }

  cambiarVista(vista: string) {
    if (this.vistaSubproyecto === vista) { return; }
    this.vistaSubproyecto = vista;
    this.cerrarFormulario();
    this.filtroAnio = 'todos';
    this.filtroEstado = 'todos';
    this.filtroBusqueda = '';
    this.paginaAccidentes = 1;
    this.detalleAbiertoId = null;
    if (vista !== 'ma') { this.recalcular(); }
  }

  alternarDetalle(item: AccidenteSSO) {
    this.detalleAbiertoId = this.detalleAbiertoId === item.id ? null : item.id;
  }

  private mostrarFormulario() {
    setTimeout(() => {
      const formulario = document.getElementById('sso-formulario');
      if (formulario) { formulario.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
  }

  private calcularEstadisticas(registros: { anio: string, grado: number }[], anios: string[]) {
    const tablaGrados = [1, 2, 3, 4, 5, 6].map(numero => {
      const cantidades = anios.map(anio => registros.filter(item => item.grado === numero && item.anio === anio).length);
      return {
        numero: numero,
        cantidades: cantidades,
        total: cantidades.reduce((suma, cantidad) => suma + cantidad, 0)
      };
    });

    const maximo = tablaGrados.reduce((mayor, fila) => fila.cantidades.reduce((alto, cantidad) => Math.max(alto, cantidad), mayor), 1);

    return {
      anios: anios,
      tablaGrados: tablaGrados,
      total: registros.length,
      totalesAnio: anios.map((anio, indice) => tablaGrados.reduce((suma, fila) => suma + fila.cantidades[indice], 0)),
      grafico: anios.map((anio, indice) => ({
        anio: anio,
        barras: tablaGrados.map(fila => ({
          numero: fila.numero,
          cantidad: fila.cantidades[indice],
          alto: fila.cantidades[indice] * 100 / maximo
        }))
      }))
    };
  }

  get verHistorico(): boolean {
    return this.consolidadoHistorico;
  }

  cargarConsolidadoSso() {
    this.cargando = true;
    this.errorCarga = false;
    this.sinPermisoConsolidado = false;

    if (!this.idUsuario) {
      this.cargando = false;
      this.sinPermisoConsolidado = true;
      return;
    }

    this._sUsuariosPerfiles.getUsuariosPerfilesbyidUsuario(Number(this.idUsuario)).subscribe(
      (perfiles: any) => {
        const esCliente = Array.isArray(perfiles) && perfiles.some((perfil: any) =>
          perfil.idPerfil == 5 || perfil.idPerfil === 'Clientes'
        );
        if (esCliente) {
          this.sinPermisoConsolidado = true;
          this.cargando = false;
          return;
        }

        Promise.all([this.cargarAccidentesSistema(), this.cargarConsolidadoMA()]).then(() => {
          this.prepararHistorico();
          this.prepararConsolidadoMA();
          this.cargando = false;
        });
      },
      (error: any) => {
        console.error('Error al verificar acceso al consolidado SSO:', error);
        this.errorCarga = true;
        this.cargando = false;
      }
    );
  }

  /** Lee las estadísticas de MA de todos los subproyectos y años. */
  private cargarConsolidadoMA(): Promise<void> {
    this.errorConsolidadoMA = false;

    return firestoreDB.collection(COLECCION_MA).get()
      .then((snapshot: any) => {
        const registros: RegistroConsolidadoMA[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          registros.push({
            idSubProyecto: String(data.idSubProyecto),
            nombre: data.nombreSubProyecto || ('Subproyecto ' + data.idSubProyecto),
            idProyecto: data.idProyecto === null || data.idProyecto === undefined ? '' : String(data.idProyecto),
            nombreProyecto: data.nombreProyecto || '',
            anio: Number(data.anio),
            meses: data.meses || {}
          });
        });
        this.registrosConsolidadoMA = registros;
      })
      .catch((error: any) => {
        console.error('Error al cargar el consolidado de MA:', error);
        this.registrosConsolidadoMA = [];
        this.errorConsolidadoMA = true;
      });
  }

  reintentarConsolidadoMA() {
    this.cargarConsolidadoMA().then(() => this.prepararConsolidadoMA());
  }

  private prepararConsolidadoMA() {
    const anios: { [anio: number]: boolean } = {};
    const subproyectos: { [id: string]: string } = {};

    anios[this.anioActualMA] = true;
    this.registrosConsolidadoMA.filter(registro => this.tieneDatosMA(registro)).forEach(registro => {
      anios[registro.anio] = true;
      subproyectos[registro.idSubProyecto] = registro.nombre;
    });

    this.consolidadoMAAnios = Object.keys(anios).map(Number).sort((a, b) => b - a);
    this.consolidadoMASubproyectos = Object.keys(subproyectos)
      .map(id => ({ id: id, nombre: subproyectos[id] }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    this.prepararProyectosMA();
    this.recalcularConsolidadoMA();
  }

  /** Total por proyecto con todos sus años (no depende de los filtros de arriba). */
  private prepararProyectosMA() {
    const conDatos = this.registrosConsolidadoMA.filter(registro => this.tieneDatosMA(registro));
    const grupos: { [clave: string]: { nombre: string, registros: RegistroConsolidadoMA[] } } = {};

    conDatos.forEach(registro => {
      const clave = registro.idProyecto || 'sin-proyecto';
      const grupo = grupos[clave] || (grupos[clave] = { nombre: '', registros: [] });
      if (!grupo.nombre && registro.nombreProyecto) { grupo.nombre = registro.nombreProyecto; }
      grupo.registros.push(registro);
    });

    this.consolidadoMAProyectos = Object.keys(grupos).map(clave => {
      const grupo = grupos[clave];
      const anios: { [anio: number]: boolean } = {};
      const subproyectos: { [id: string]: boolean } = {};
      grupo.registros.forEach(registro => {
        anios[registro.anio] = true;
        subproyectos[registro.idSubProyecto] = true;
      });

      return {
        nombre: grupo.nombre || (clave === 'sin-proyecto' ? 'Sin proyecto' : 'Proyecto ' + clave),
        subproyectos: Object.keys(subproyectos).length,
        anios: Object.keys(anios).map(Number).sort((a, b) => b - a).map(anio => ({
          anio: anio,
          totales: this.getTotalesMA(grupo.registros.filter(registro => registro.anio === anio))
        })),
        totales: this.getTotalesMA(grupo.registros)
      };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));

    this.consolidadoMATotalesProyectos = this.getTotalesMA(conDatos);
  }

  private getTotalesMA(registros: { meses: any }[]): string[] {
    return this.indicadoresMA.map(indicador => this.formatearMA(this.sumarMA(registros, indicador.campo)));
  }

  recalcularConsolidadoMA() {
    const anio = Number(this.consolidadoMAAnio);
    const subproyecto = this.consolidadoMASubproyecto;

    const registros = this.registrosConsolidadoMA
      .filter(registro => registro.anio === anio && this.tieneDatosMA(registro))
      .filter(registro => subproyecto === 'todos' || registro.idSubProyecto === subproyecto)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    this.consolidadoMAFilas = this.indicadoresMA.map(indicador => ({
      indicador: indicador,
      meses: this.mesesMA.map(mes => this.formatearMA(this.sumarMA(registros, indicador.campo, mes.numero))),
      total: this.formatearMA(this.sumarMA(registros, indicador.campo))
    }));

    this.consolidadoMAPorSubproyecto = registros.map(registro => ({
      nombre: registro.nombre,
      totales: this.getTotalesMA([registro])
    }));

    this.consolidadoMATotales = this.consolidadoMAFilas.map(fila => fila.total);

    this.consolidadoMAResumen = {
      subproyectos: registros.length,
      agua: this.formatearMA(this.sumarMA(registros, 'consumoAgua')),
      combustible: this.formatearMA(this.sumarMA(registros, 'consumoCombustible')),
      residuos: this.formatearMA(this.sumarMA(registros, 'residuosDomiciliarios'))
    };
  }

  /** Suma un indicador de todo el año, o de un solo mes si viene el número. */
  private sumarMA(registros: { meses: any }[], campo: string, mes?: number): number | null {
    const meses = mes ? [mes] : this.mesesMA.map(item => item.numero);
    let total: number = 0;
    let hayValores = false;

    registros.forEach(registro => {
      meses.forEach(numero => {
        const delMes = registro.meses ? registro.meses[numero] : null;
        const valor = delMes ? delMes[campo] : null;
        if (valor !== null && valor !== undefined) {
          total += Number(valor);
          hayValores = true;
        }
      });
    });

    return hayValores ? total : null;
  }

  private tieneDatosMA(registro: { meses: any }): boolean {
    return this.indicadoresMA.some(indicador => this.sumarMA([registro], indicador.campo) !== null);
  }

  esMesActualConsolidadoMA(mes: number): boolean {
    return Number(this.consolidadoMAAnio) === this.anioActualMA && mes === this.mesActualMA;
  }

  /** Desde 2026 los datos salen solos de lo registrado en todos los subproyectos. */
  private cargarAccidentesSistema(): Promise<void> {
    return firestoreDB.collection(COLECCION).get()
      .then((snapshot: any) => {
        const registros: AccidenteHistorico[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          const anio = Number((data.fecha || '').substring(0, 4));
          if (anio >= PRIMER_ANIO_SISTEMA) {
            registros.push({
              numero: 0,
              fecha: data.fecha,
              anio: anio,
              lugar: data.lugar || '',
              comuna: data.comuna || '',
              obra: data.obra || data.nombreSubProyecto || '',
              empresa: data.empresa || '',
              tipo: this.getTipoHistorico(data.tipo),
              resolucion: data.resolucionMutual || '',
              grado: Number(data.grado),
              diasPerdidos: Number(data.diasPerdidos) || 0,
              descripcion: data.descripcion || '',
              medidas: data.medidasControl || '',
              organismo: ''
            });
          }
        });
        this.accidentesSistema = registros;
        this.errorHistoricoSistema = false;
      })
      .catch((error: any) => {
        console.error('Error al cargar los accidentes del sistema:', error);
        this.errorHistoricoSistema = true;
      });
  }

  private getTipoHistorico(tipo: string): string {
    const texto = tipo || '';
    if (texto.indexOf('Trabajo') !== -1) { return 'Trabajo'; }
    if (texto.indexOf('Trayecto') !== -1) { return 'Trayecto'; }
    if (texto.indexOf('Incidente') !== -1) { return 'Incidente'; }
    if (texto.indexOf('Prof') !== -1) { return 'Enf. Profesional'; }
    return 'Común';
  }

  private get registrosHistorico(): AccidenteHistorico[] {
    return ACCIDENTES_HISTORICOS.concat(this.accidentesSistema);
  }

  private prepararHistorico() {
    const primero = this.registrosHistorico.reduce((menor, item) => Math.min(menor, item.anio), Number(this.hoy.substring(0, 4)));
    const anios: string[] = [];
    for (let anio = primero; anio <= Number(this.hoy.substring(0, 4)); anio++) {
      anios.push(String(anio));
    }

    // N° correlativo: el más antiguo es el 1, como en el reporte de mejoras
    this.historicoTodas = this.registrosHistorico.slice()
      .sort((a, b) => a.anio - b.anio || (a.fecha || '').localeCompare(b.fecha || ''))
      .map((item, indice) => ({ ...item, clave: 'h' + indice, numeroFila: indice + 1 }));

    this.calcularDiasSinAccidentes();

    this.historicoAnios = anios.slice().reverse();
    this.historicoEstadisticas = this.calcularEstadisticas(
      this.registrosHistorico.map(item => ({ anio: String(item.anio), grado: item.grado })),
      anios
    );
    this.recalcularHistorico();
  }

  recalcularHistorico() {
    const busqueda = this.normalizarTexto(this.historicoBusqueda);

    const filas = this.historicoTodas.filter(item => {
      if (this.historicoAnio !== 'todos' && String(item.anio) !== this.historicoAnio) { return false; }
      if (!busqueda) { return true; }
      return this.normalizarTexto([item.obra, item.lugar, item.comuna, item.empresa, item.descripcion].join(' ')).indexOf(busqueda) !== -1;
    });

    this.historicoFilas = filas.slice().sort((a, b) => b.numeroFila - a.numeroFila);
    this.filaHistoricoAbierta = null;

    const grupos: GrupoHistorico[] = [];
    this.historicoFilas.forEach(item => {
      let grupo = grupos[grupos.length - 1];
      if (!grupo || grupo.anio !== item.anio) {
        grupo = { anio: item.anio, filas: [], diasPerdidos: 0, graves: 0 };
        grupos.push(grupo);
      }
      grupo.filas.push(item);
      grupo.diasPerdidos += item.diasPerdidos || 0;
      if (item.grado >= 5) { grupo.graves++; }
    });
    this.historicoGrupos = grupos;

    this.historicoResumen = {
      total: filas.length,
      diasPerdidos: filas.reduce((suma, item) => suma + (item.diasPerdidos || 0), 0),
      graves: filas.filter(item => item.grado >= 5).length,
      conDias: filas.filter(item => (item.diasPerdidos || 0) > 0).length
    };
  }

  /** Días desde el último accidente de trabajo o de trayecto (los incidentes y enfermedades no cuentan). */
  private calcularDiasSinAccidentes() {
    let ultimo: AccidenteHistorico = null;
    this.registrosHistorico.forEach(item => {
      if (item.tipo !== 'Trabajo' && item.tipo !== 'Trayecto') { return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.fecha || '') || item.fecha > this.hoy) { return; }
      if (!ultimo || item.fecha > ultimo.fecha) { ultimo = item; }
    });

    if (!ultimo) {
      this.diasSinAccidentes = null;
      this.fechaUltimoAccidente = '';
      this.obraUltimoAccidente = '';
      return;
    }

    const aFecha = (texto: string) => {
      const partes = texto.split('-').map(Number);
      return new Date(partes[0], partes[1] - 1, partes[2]);
    };
    // Math.round evita el desfase de una hora en los cambios de horario
    this.diasSinAccidentes = Math.max(0, Math.round((aFecha(this.hoy).getTime() - aFecha(ultimo.fecha).getTime()) / 86400000));
    this.fechaUltimoAccidente = ultimo.fecha;
    this.obraUltimoAccidente = ultimo.obra || ultimo.lugar || '';
  }

  toggleFilaHistorico(item: FilaHistorico) {
    this.filaHistoricoAbierta = this.filaHistoricoAbierta === item.clave ? null : item.clave;
  }

  trackGrupoHistorico(index: number, grupo: GrupoHistorico) {
    return grupo.anio;
  }

  trackFilaHistorico(index: number, item: FilaHistorico) {
    return item.clave;
  }

  private normalizarTexto(texto: string): string {
    return (texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  getClaseTipoHistorico(tipo: string): string {
    switch (tipo) {
      case 'Trabajo': return 'tipo-trabajo-cdp';
      case 'Trayecto': return 'tipo-trayecto-sdp';
      case 'Incidente': return 'tipo-incidente';
      case 'Común': return 'tipo-enf-comun';
      case 'Enf. Profesional': return 'tipo-enf-prof';
      default: return '';
    }
  }

  // Del texto local: toISOString() en la noche de Chile daría el día siguiente
  private getFechaHoy(): string {
    const fecha = new Date();
    const mes = ('0' + (fecha.getMonth() + 1)).slice(-2);
    const dia = ('0' + fecha.getDate()).slice(-2);
    return fecha.getFullYear() + '-' + mes + '-' + dia;
  }

  private getFormularioVacio(): AccidenteSSO {
    return {
      fecha: '', tipo: '', grado: null, diasPerdidos: 0, descripcion: '', medidasControl: '', estado: 'Abierto',
      nombre: '', rut: '', lugar: '', comuna: '', obra: this.nombreSubProyecto || '', empresa: 'Trazas',
      declaracionIncidente: 'Sí', informePreliminar: '', informeDefinitivo: '', fechaAltaMedica: '', resolucionMutual: ''
    };
  }

  abrirNuevo() {
    this.formulario = this.getFormularioVacio();
    if (this.enIncidentes && this.tiposFormulario.length) {
      this.formulario.tipo = this.tiposFormulario[0].nombre;
    }
    this.editandoId = null;
    this.errorFormulario = '';
    this.archivosFormulario = [];
    this.formularioAbierto = true;
    this.mostrarFormulario();
  }

  editar(item: AccidenteSSO) {
    if (this.soloLectura) { return; }
    this.pedirAccesoRegistroBloqueado(item).then((ok: boolean) => {
      if (!ok) { return; }
      this.formulario = { ...this.getFormularioVacio(), ...item, adjuntos: (item.adjuntos || []).slice() };
      this.editandoId = item.id;
      this.errorFormulario = '';
      this.archivosFormulario = [];
      this.formularioAbierto = true;
      this.mostrarFormulario();
    });
  }

  cerrarFormulario() {
    this.formularioAbierto = false;
    this.editandoId = null;
    this.archivosFormulario = [];
  }

  /** Propone las medidas del grado, sin pisar lo que ya se escribió. */
  cambiarGrado(numero: number) {
    const medidasAnteriores = this.getMedidasGrado(this.formulario.grado);
    if (!this.formulario.medidasControl || this.formulario.medidasControl === medidasAnteriores) {
      this.formulario.medidasControl = this.getMedidasGrado(numero);
    }
    this.formulario.grado = numero;
  }

  private getMedidasGrado(numero: number): string {
    const grado = this.grados.filter(item => item.numero === Number(numero))[0];
    return grado ? grado.medidas : '';
  }

  private validarFormulario(): string {
    const datos = this.formulario;
    if (!datos.fecha) { return 'Falta la fecha.'; }
    if (datos.fecha > this.hoy) { return 'La fecha no puede ser futura.'; }
    if (!datos.tipo) { return 'Falta el tipo.'; }
    if (!datos.grado) { return 'Falta el grado.'; }
    if (!(Number(datos.diasPerdidos) >= 0)) { return 'Los días perdidos no pueden ser negativos.'; }
    if (!(datos.descripcion || '').trim()) { return 'Falta la descripción.'; }
    if ((datos.rut || '').trim() && !this.rutValido(datos.rut)) { return 'El RUT no es válido.'; }
    if (datos.fechaAltaMedica && datos.fechaAltaMedica < datos.fecha) { return 'El alta médica no puede ser antes del evento.'; }
    return '';
  }

  guardar() {
    if (this.soloLectura || this.guardando) { return; }

    this.errorFormulario = this.validarFormulario();
    if (this.errorFormulario) { return; }

    const datos = this.formulario;
    const payload = {
      idSubProyecto: this.idSubProyecto,
      idProyecto: this.idProyecto === undefined ? null : this.idProyecto,
      nombreSubProyecto: this.nombreSubProyecto || '',
      fecha: datos.fecha,
      anio: Number(datos.fecha.substring(0, 4)),
      tipo: datos.tipo,
      grado: Number(datos.grado),
      diasPerdidos: Math.round(Number(datos.diasPerdidos) || 0),
      descripcion: datos.descripcion.trim(),
      medidasControl: (datos.medidasControl || '').trim(),
      estado: datos.estado,
      nombre: (datos.nombre || '').trim(),
      rut: (datos.rut || '').trim() ? this.formatearRut(datos.rut) : '',
      lugar: (datos.lugar || '').trim(),
      comuna: (datos.comuna || '').trim(),
      obra: (datos.obra || '').trim(),
      empresa: (datos.empresa || '').trim(),
      declaracionIncidente: datos.declaracionIncidente || '',
      informePreliminar: datos.informePreliminar || '',
      informeDefinitivo: datos.informeDefinitivo || '',
      fechaAltaMedica: datos.fechaAltaMedica || '',
      resolucionMutual: (datos.resolucionMutual || '').trim(),
      idUsuarioActualizacion: this.idUsuario,
      fechaActualizacion: new Date().toISOString()
    };

    const coleccion = firestoreDB.collection(COLECCION);
    const idEditado = this.editandoId;
    const archivos = this.archivosFormulario.slice();
    // Los adjuntos y el candado se manejan aparte: al editar no se tocan
    const guardado = idEditado
      ? coleccion.doc(idEditado).update(payload).then(() => idEditado)
      : coleccion.add({ ...payload, adjuntos: [], bloqueado: false }).then((doc: any) => doc.id);

    this.guardando = true;
    guardado
      .then((id: string) => {
        const previo = this.accidentes.filter(item => item.id === id)[0];
        const registro: any = { adjuntos: [], bloqueado: false, ...previo, ...payload, id: id };
        this.accidentes = this.accidentes.filter(item => item.id !== id).concat(registro);
        if (archivos.length) { this.subirAdjuntos(registro, archivos); }
        if (!idEditado) {
          // Un registro nuevo queda visible aunque hubiera filtros puestos
          this.filtroAnio = 'todos';
          this.filtroEstado = 'todos';
          this.filtroBusqueda = '';
          this.paginaAccidentes = 1;
        }
        this.recalcular();
        this.guardando = false;
        this.cerrarFormulario();
      })
      .catch((error: any) => {
        console.error('Error al guardar el accidente:', error);
        this.guardando = false;
        this.errorFormulario = 'No se pudo guardar. Inténtalo de nuevo.';
      });
  }

  eliminar(item: AccidenteSSO) {
    if (this.soloLectura) { return; }
    if (this.estaBloqueadoParaMi(item)) {
      this.pedirAccesoRegistroBloqueado(item).then((ok: boolean) => { if (ok) { this.eliminar(item); } });
      return;
    }

    Swal.fire({
      title: '¿Eliminar este registro?',
      text: 'Se borrará el ' + this.palabraRegistro + ' del ' + this.getFechaTexto(item.fecha) + '. No se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((resultado: any) => {
      if (!resultado || !(resultado.value || resultado.isConfirmed)) { return; }

      firestoreDB.collection(COLECCION).doc(item.id).delete()
        .then(() => {
          // Los archivos se borran después, sin bloquear si alguno ya no existía
          (item.adjuntos || []).forEach(adjunto => this.borrarArchivoStorage(adjunto.ruta).catch(() => null));
          this.accidentes = this.accidentes.filter(accidente => accidente.id !== item.id);
          if (this.editandoId === item.id) { this.cerrarFormulario(); }
          this.recalcular();
        })
        .catch((error: any) => {
          console.error('Error al eliminar el accidente:', error);
          Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
        });
    });
  }

  // ==========================================================
  // Datos del trabajador: RUT
  // ==========================================================

  formatearRutFormulario() {
    if ((this.formulario.rut || '').trim()) {
      this.formulario.rut = this.formatearRut(this.formulario.rut);
    }
  }

  /** 12345678k -> 12.345.678-K */
  private formatearRut(rut: string): string {
    const limpio = (rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
    if (limpio.length < 2) { return limpio; }
    const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return cuerpo + '-' + limpio.slice(-1);
  }

  private rutValido(rut: string): boolean {
    const limpio = (rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
    if (!/^\d{6,8}[0-9K]$/.test(limpio)) { return false; }
    const cuerpo = limpio.slice(0, -1);
    let suma = 0;
    let multiplo = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += Number(cuerpo.charAt(i)) * multiplo;
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    const resto = 11 - (suma % 11);
    const dv = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
    return dv === limpio.slice(-1);
  }

  /** Color de los chips de Declaración / Informe preliminar / Informe definitivo. */
  getClaseInforme(valor: string): string {
    const texto = this.normalizarTexto(valor);
    if (texto === 'si') { return 'inf-si'; }
    if (texto === 'no') { return 'inf-no'; }
    if (texto.indexOf('ejecucion') !== -1) { return 'inf-proceso'; }
    return 'inf-na';
  }

  // ==========================================================
  // Adjuntos de cada registro
  // ==========================================================

  seleccionarArchivosFormulario(input: any) {
    const archivos: File[] = Array.prototype.slice.call(input.files || []);
    input.value = '';
    const muyGrande = archivos.filter(archivo => archivo.size > MAX_MB_ADJUNTO * 1024 * 1024)[0];
    if (muyGrande) {
      this.errorFormulario = '"' + muyGrande.name + '" pesa más de ' + MAX_MB_ADJUNTO + ' MB.';
      return;
    }
    this.archivosFormulario = this.archivosFormulario.concat(archivos);
  }

  quitarArchivoFormulario(indice: number) {
    this.archivosFormulario = this.archivosFormulario.filter((archivo, i) => i !== indice);
  }

  /** Botón "Adjuntar" del detalle: sube al tiro. */
  adjuntarEnRegistro(item: AccidenteSSO, input: any) {
    const archivos: File[] = Array.prototype.slice.call(input.files || []);
    input.value = '';
    if (!archivos.length || !this.puedeModificar(item)) { return; }

    const muyGrande = archivos.filter(archivo => archivo.size > MAX_MB_ADJUNTO * 1024 * 1024)[0];
    if (muyGrande) {
      this.errorAdjuntos = '"' + muyGrande.name + '" pesa más de ' + MAX_MB_ADJUNTO + ' MB.';
      return;
    }
    this.subirAdjuntos(item, archivos);
  }

  private subirAdjuntos(item: AccidenteSSO, archivos: File[]): Promise<void> {
    const totalBytes = archivos.reduce((suma, archivo) => suma + archivo.size, 0) || 1;
    const transferidos: number[] = archivos.map(() => 0);

    this.subiendoAdjuntosId = item.id;
    this.progresoAdjuntos = 0;
    this.errorAdjuntos = '';

    return Promise.all(archivos.map((archivo, indice) => {
      const ruta = COLECCION + '/' + this.idSubProyecto + '/' + item.id + '/' + Date.now() + '_' + indice + '_' + this.limpiarNombreArchivo(archivo.name);
      return this.subirArchivoStorage(ruta, archivo, (bytes: number) => {
        transferidos[indice] = bytes;
        const suma = transferidos.reduce((total, valor) => total + valor, 0);
        this.progresoAdjuntos = Math.min(100, Math.round(suma * 100 / totalBytes));
      }).then((url: string): AdjuntoSSO => ({
        nombre: archivo.name,
        ruta: ruta,
        url: url,
        tamano: archivo.size,
        tipo: archivo.type || 'application/octet-stream',
        idUsuario: this.idUsuario,
        fechaSubida: new Date().toISOString()
      }));
    }))
      .then((nuevos: AdjuntoSSO[]) => {
        const adjuntos = (item.adjuntos || []).concat(nuevos);
        return firestoreDB.collection(COLECCION).doc(item.id).update({ adjuntos: adjuntos }).then(() => {
          item.adjuntos = adjuntos;
          this.subiendoAdjuntosId = null;
        });
      })
      .catch((error: any) => {
        console.error('Error al subir los adjuntos:', error);
        this.subiendoAdjuntosId = null;
        this.errorAdjuntos = 'No se pudieron subir todos los archivos. Inténtalo de nuevo.';
      });
  }

  eliminarAdjunto(item: AccidenteSSO, adjunto: AdjuntoSSO) {
    if (!this.puedeModificar(item)) { return; }

    Swal.fire({
      title: '¿Eliminar este archivo?',
      text: 'Se borrará "' + adjunto.nombre + '". No se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((resultado: any) => {
      if (!resultado || !(resultado.value || resultado.isConfirmed)) { return; }

      const adjuntos = (item.adjuntos || []).filter(otro => otro.ruta !== adjunto.ruta);
      this.borrarArchivoStorage(adjunto.ruta)
        .then(() => firestoreDB.collection(COLECCION).doc(item.id).update({ adjuntos: adjuntos }))
        .then(() => {
          item.adjuntos = adjuntos;
          if (this.editandoId === item.id) { this.formulario.adjuntos = adjuntos.slice(); }
        })
        .catch((error: any) => {
          console.error('Error al eliminar el adjunto:', error);
          Swal.fire('Error', 'No se pudo eliminar el archivo.', 'error');
        });
    });
  }

  private subirArchivoStorage(ruta: string, archivo: File, alAvanzar: (bytes: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const tarea: any = (firebase as any).storage().ref(ruta).put(archivo, { contentType: archivo.type || 'application/octet-stream' });
      tarea.on('state_changed',
        (estado: any) => alAvanzar(estado.bytesTransferred),
        (error: any) => reject(error),
        () => {
          const referencia = tarea.snapshot.ref;
          const obtenerUrl = referencia && referencia.getDownloadURL
            ? referencia.getDownloadURL()
            : Promise.resolve(tarea.snapshot.downloadURL);
          obtenerUrl.then(resolve, reject);
        });
    });
  }

  /** Si el archivo ya no estaba en Storage se toma como borrado. */
  private borrarArchivoStorage(ruta: string): Promise<any> {
    if (!ruta) { return Promise.resolve(); }
    return (firebase as any).storage().ref(ruta).delete().catch((error: any) => {
      if (!error || error.code !== 'storage/object-not-found') { throw error; }
    });
  }

  // ==========================================================
  // Candado (misma clave que Control de Hallazgos)
  // ==========================================================

  private cargarPerfilesCandado() {
    const idUsuario = Number(this.idUsuario);
    if (!idUsuario) { return; }

    this._sUsuariosPerfiles.getUsuariosPerfilesbyidUsuario(idUsuario).subscribe(
      (perfiles: any) => {
        this.idsPerfilesUsuario = (Array.isArray(perfiles) ? perfiles : [])
          .filter((perfil: any) => perfil.activo !== false && !perfil.fechaRemocion)
          .map((perfil: any) => Number(perfil.idPerfil));
        this.actualizarEsSubGerente();
      },
      () => {
        this.idsPerfilesUsuario = [];
        this.actualizarEsSubGerente();
      }
    );

    // El perfil SUB-GERENTE se busca por nombre, igual que en Control de Hallazgos
    this._sPerfil.getPerfil().subscribe(
      (perfiles: any) => {
        this.idsPerfilesSubGerente = (Array.isArray(perfiles) ? perfiles : [])
          .filter((perfil: any) => this.esNombrePerfilSubGerente(perfil.nombrePerfil))
          .map((perfil: any) => Number(perfil.idPerfil));
        this.actualizarEsSubGerente();
      },
      () => {
        this.idsPerfilesSubGerente = [];
        this.actualizarEsSubGerente();
      }
    );
  }

  private esNombrePerfilSubGerente(nombre: string): boolean {
    const limpio = this.normalizarTexto(nombre).toUpperCase().replace(/[^A-Z]/g, '');
    return limpio.indexOf('SUBGERENTE') === 0;
  }

  private actualizarEsSubGerente() {
    this.esSubGerente = this.idsPerfilesUsuario.some((id: number) => this.idsPerfilesSubGerente.indexOf(id) >= 0);
    if (!this.esSubGerente) { this.accesoTemporalBloqueo = {}; }
  }

  /** true si está bloqueado y el usuario no lo desbloqueó con la clave en esta sesión. */
  estaBloqueadoParaMi(item: AccidenteSSO | null): boolean {
    if (!item || !item.bloqueado) { return false; }
    return !(item.id && this.esSubGerente && this.accesoTemporalBloqueo[item.id]);
  }

  puedeModificar(item: AccidenteSSO): boolean {
    return !this.soloLectura && !!item && !!item.id && !this.estaBloqueadoParaMi(item);
  }

  getTituloBloqueo(item: AccidenteSSO): string {
    if (!item.bloqueado) { return 'Bloquear registro'; }
    const quien = item.bloqueadoPorNombre ? ' por ' + item.bloqueadoPorNombre : '';
    const cuando = item.fechaBloqueo ? ' el ' + this.getFechaHoraTexto(item.fechaBloqueo) : '';
    return 'Bloqueado' + quien + cuando + '. Clic para desbloquear.';
  }

  /** Botón candado: bloquea o desbloquea definitivamente (pide la clave). */
  toggleBloqueoRegistro(item: AccidenteSSO) {
    if (this.soloLectura || !item || !item.id || !this.esSubGerente) { return; }
    if (this.editandoId === item.id) {
      Swal.fire('Registro en edición', 'Guarda o cancela la edición antes de cambiar el bloqueo.', 'info');
      return;
    }

    const bloquear = !item.bloqueado;
    this.obtenerConfigClave().then((config: any) => {
      if (!config) {
        Swal.fire('Sin clave', 'Aún no se ha definido la clave. Defínela en Control de Hallazgos con el botón "Cambiar clave".', 'info');
        return false;
      }
      return this.solicitarYValidarClave(bloquear ? 'Bloquear ' + this.palabraRegistro : 'Desbloquear ' + this.palabraRegistro, config);
    }).then((ok: boolean) => {
      if (!ok) { return; }

      const payload: any = bloquear
        ? {
            bloqueado: true,
            bloqueadoPor: Number(this.idUsuario) || null,
            bloqueadoPorNombre: this.getNombreUsuarioActual(),
            fechaBloqueo: new Date().toISOString()
          }
        : { bloqueado: false, bloqueadoPor: null, bloqueadoPorNombre: '', fechaBloqueo: '' };

      return firestoreDB.collection(COLECCION).doc(item.id).update(payload).then(() => {
        Object.keys(payload).forEach(campo => (item as any)[campo] = payload[campo]);
        delete this.accesoTemporalBloqueo[item.id];
        Swal.fire({
          icon: 'success',
          title: bloquear ? 'Registro bloqueado' : 'Registro desbloqueado',
          text: bloquear
            ? 'Solo el sub-gerente, con la clave, podrá modificar este registro.'
            : 'El registro vuelve a ser editable por los usuarios con permiso.',
          timer: 1800,
          showConfirmButton: false
        });
      });
    }).catch((error: any) => {
      Swal.fire('Error', 'No se pudo cambiar el bloqueo: ' + (error && error.message ? error.message : error), 'error');
    });
  }

  /** Desbloqueo temporal (solo esta sesión) para que el sub-gerente trabaje en un registro bloqueado. */
  pedirAccesoRegistroBloqueado(item: AccidenteSSO): Promise<boolean> {
    if (!item || !item.id) { return Promise.resolve(false); }
    if (!item.bloqueado || this.accesoTemporalBloqueo[item.id]) { return Promise.resolve(true); }

    if (!this.esSubGerente) {
      Swal.fire('Registro bloqueado', 'Este registro no se puede modificar.', 'info');
      return Promise.resolve(false);
    }

    return this.obtenerConfigClave().then((config: any) => {
      if (!config) {
        Swal.fire('Sin clave', 'Aún no se ha definido la clave. Defínela en Control de Hallazgos.', 'info');
        return false;
      }
      return this.solicitarYValidarClave('Registro bloqueado', config);
    }).then((ok: boolean) => {
      if (ok) { this.accesoTemporalBloqueo[item.id] = true; }
      return ok;
    }).catch((error: any) => {
      Swal.fire('Error', 'No se pudo validar la clave: ' + (error && error.message ? error.message : error), 'error');
      return false;
    });
  }

  private obtenerConfigClave(): Promise<any> {
    return firestoreDB.collection('hallazgosConfig').doc(DOC_CLAVE_GERENCIA).get().then((doc: any) => {
      const data = doc.exists ? doc.data() : null;
      return data && data.hash && data.salt ? data : null;
    });
  }

  /** Pide la clave y la compara contra el hash guardado. */
  private solicitarYValidarClave(titulo: string, config: any): Promise<boolean> {
    const promesa = Swal.fire({
      title: titulo,
      html:
        '<p style="font-size:14px;margin-bottom:0">Ingresa la clave</p>' +
        this.htmlCampoClave('swal-clave-validar', 'Clave', 'off'),
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      footer: '<span style="font-size:12px">¿Olvidaste la clave? Recupérala desde Control de Hallazgos.</span>',
      preConfirm: () => {
        const valor = (document.getElementById('swal-clave-validar') as HTMLInputElement).value || '';
        if (this.sha256(config.salt + ':' + valor) !== config.hash) {
          Swal.showValidationMessage('Clave incorrecta');
          return false;
        }
        return true;
      }
    });
    setTimeout(() => this.activarOjosClave(), 0);

    return promesa.then((result: any) => !!(result && result.value === true), () => false);
  }

  private getNombreUsuarioActual(): string {
    const u = this.usuario || {};
    return u.nombreUsuario || u.nombre || u.usuario || u.email || '';
  }

  // Campo de clave con "ojito" (estilos inline porque el popup de SweetAlert queda fuera del CSS del componente)
    private htmlCampoClave(id: string, placeholder: string, autocomplete: string): string {
    return '<div style="position:relative;width:100%;margin:1em auto 0">' +
      '<input id="' + id + '" type="password" class="swal2-input hz-clave-input" placeholder="' + placeholder + '"' +
      ' autocomplete="' + autocomplete + '" autocapitalize="off" autocorrect="off" spellcheck="false"' +
      ' style="margin:0;width:100%;padding-right:48px">' +
      '<button type="button" class="hz-clave-ojo" data-target="' + id + '" title="Mostrar clave" aria-label="Mostrar clave"' +
      ' style="position:absolute;top:50%;right:8px;transform:translateY(-50%);width:34px;height:34px;padding:0;' +
      'border:none;border-radius:50%;background:transparent;color:#8a97a5;font-size:17px;cursor:pointer;' +
      'display:inline-flex;align-items:center;justify-content:center;box-shadow:none;outline:none">' +
      '<i class="fa fa-eye"></i></button>' +
      '</div>';
  }

  /** Conecta los ojitos del popup abierto. enfocarPrimero=false deja el foco donde SweetAlert lo puso. */
  private activarOjosClave(enfocarPrimero: boolean = true): void {
    const popup: HTMLElement = (Swal.getPopup && Swal.getPopup()) || document.body;
    const botones = popup.querySelectorAll('.hz-clave-ojo');

    Array.prototype.forEach.call(botones, (btn: HTMLButtonElement) => {
      if (btn.getAttribute('data-listo') === '1') { return; }
      btn.setAttribute('data-listo', '1');

      const input = document.getElementById(btn.getAttribute('data-target')) as HTMLInputElement;
      if (!input) { return; }

      // Evita que el botón le quite el foco al input
      btn.addEventListener('mousedown', (e: Event) => e.preventDefault());
      btn.addEventListener('mouseenter', () => { btn.style.background = '#eef6fb'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });

      btn.addEventListener('click', () => {
        const mostrar = input.type === 'password';
        input.type = mostrar ? 'text' : 'password';
        const icono = btn.querySelector('i');
        if (icono) { icono.className = mostrar ? 'fa fa-eye-slash' : 'fa fa-eye'; }
        btn.style.color = mostrar ? '#026AA7' : '#8a97a5';
        const titulo = mostrar ? 'Ocultar clave' : 'Mostrar clave';
        btn.title = titulo;
        btn.setAttribute('aria-label', titulo);
        input.focus();
        try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) { }
      });

      // Enter confirma, igual que el input nativo de SweetAlert
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          Swal.clickConfirm();
        }
      });
    });

    if (enfocarPrimero) {
      const primero = popup.querySelector('.hz-clave-input') as HTMLInputElement;
      if (primero) { setTimeout(() => primero.focus(), 50); }
    }
  }

    /** SHA-256 síncrono (UTF-8) — sin dependencias, compatible con navegadores antiguos. */
  private sha256(texto: string): string {
    const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    // Codificación UTF-8 manual (sin unescape/TextEncoder)
    const b: number[] = [];
    for (let i = 0; i < texto.length; i++) {
      let cp = texto.charCodeAt(i);
      if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < texto.length) {
        const lo = texto.charCodeAt(i + 1);
        if (lo >= 0xdc00 && lo <= 0xdfff) {
          cp = 0x10000 + ((cp - 0xd800) << 10) + (lo - 0xdc00);
          i++;
        }
      }
      if (cp < 0x80) {
        b.push(cp);
      } else if (cp < 0x800) {
        b.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
      } else if (cp < 0x10000) {
        b.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      } else {
        b.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      }
    }
    const bitLen = b.length * 8;
    b.push(0x80);
    while (b.length % 64 !== 56) { b.push(0); }
    const high = Math.floor(bitLen / 0x100000000);
    for (let i = 3; i >= 0; i--) { b.push((high >>> (i * 8)) & 0xff); }
    for (let i = 3; i >= 0; i--) { b.push((bitLen >>> (i * 8)) & 0xff); }

    const w = new Array(64);
    for (let o = 0; o < b.length; o += 64) {
      for (let t = 0; t < 16; t++) {
        w[t] = (b[o + t * 4] << 24) | (b[o + t * 4 + 1] << 16) | (b[o + t * 4 + 2] << 8) | b[o + t * 4 + 3];
      }
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      let a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[t] + w[t]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const mj = (a & bb) ^ (a & c) ^ (bb & c);
        const t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map((x: number) => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
  }

  getFechaTexto(fecha: string): string {
    const partes = (fecha || '').split('-');
    return partes.length === 3 ? partes[2] + '-' + partes[1] + '-' + partes[0] : (fecha || '-');
  }

  getClaseTipo(nombre: string): string {
    const tipo = this.tipos.filter(item => item.nombre === nombre)[0];
    return tipo ? tipo.clase : '';
  }

  getClasificacion(numero: number): string {
    const grado = this.grados.filter(item => item.numero === Number(numero))[0];
    return grado ? grado.clasificacion : '-';
  }

  trackAccidente(index: number, item: AccidenteSSO) {
    return item.id;
  }
}