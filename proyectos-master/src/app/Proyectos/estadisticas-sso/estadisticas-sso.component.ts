import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firestoreDB } from '../../firebase-init';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
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
const PRIMER_ANIO_SISTEMA = 2026; // Hasta 2025 manda el registro histórico

const MEDIDAS_MENOR = 'Charlas de 5 minutos, uso de EPP, señalización. Reinducción, cumplimiento programa prevención de riesgos, control de los riesgos.';
const MEDIDAS_INTERMEDIO = 'Charlas de 5 minutos, reinducción, aplicación de procedimientos de trabajo seguro, uso de EPP, inspección de equipos y herramientas, capacitación con el autocuidado, capacitación a línea de mando sobre riesgos asociados, revisar protocolos y procedimientos de ejecución.';
const MEDIDAS_GRAVE = 'Charlas de 5 minutos, evaluación del riesgo antes de iniciar la faena, aplicación de procedimientos de trabajo seguro, supervisión directa, uso de EPP, aplicación de protocolos de seguridad, inspección de equipos y herramientas, capacitación del personal, revisión matriz de riesgos.';

export interface AccidenteSSO {
  id?: string;
  fecha: string;
  tipo: string;
  grado: number;
  diasPerdidos: number;
  descripcion: string;
  medidasControl: string;
  estado: string;
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
}

@Component({
  selector: 'app-estadisticas-sso',
  templateUrl: './estadisticas-sso.component.html',
  styleUrls: ['./estadisticas-sso.component.css']
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
    private _sUsuariosPerfiles: sUsuariosPerfiles
  ) {}

  ngOnInit() {
    this.consolidadoHistorico = this.route.snapshot.data['consolidadoSSO'] === true;
    try {
      this.idUsuario = JSON.parse(localStorage.getItem('usuario') || '{}').idUsuario || null;
    } catch (error) {
      this.idUsuario = null;
    }

    if (this.consolidadoHistorico) {
      this.cargarConsolidadoSso();
      return;
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

  private filtrarCertificadosMA() {
    const anio = Number(this.anioMA);
    this.certificadosMAVista = this.certificadosMA
      .filter(item => Number(item.anio) === anio)
      .sort((a, b) => (b.fechaSubida || '').localeCompare(a.fechaSubida || ''));
  }

  subirCertificadosMA(input: any) {
    const archivos: File[] = Array.prototype.slice.call(input.files || []);
    input.value = '';
    if (!archivos.length || this.soloLectura || this.subiendoCertificadoMA) { return; }

    const muyGrande = archivos.filter(archivo => archivo.size > MAX_MB_CERTIFICADO * 1024 * 1024)[0];
    if (muyGrande) {
      this.errorSubidaCertificadoMA = '"' + muyGrande.name + '" pesa más de ' + MAX_MB_CERTIFICADO + ' MB.';
      return;
    }

    const anio = Number(this.anioMA);
    const totalBytes = archivos.reduce((suma, archivo) => suma + archivo.size, 0) || 1;
    const transferidos: number[] = archivos.map(() => 0);

    this.subiendoCertificadoMA = true;
    this.progresoCertificadoMA = 0;
    this.errorSubidaCertificadoMA = '';

    Promise.all(archivos.map((archivo, indice) => this.subirCertificadoMA(archivo, anio, (bytes: number) => {
      transferidos[indice] = bytes;
      const suma = transferidos.reduce((total, valor) => total + valor, 0);
      this.progresoCertificadoMA = Math.min(100, Math.round(suma * 100 / totalBytes));
    })))
      .then((nuevos: CertificadoMA[]) => {
        this.certificadosMA = nuevos.concat(this.certificadosMA);
        this.filtrarCertificadosMA();
        this.subiendoCertificadoMA = false;
      })
      .catch((error: any) => {
        console.error('Error al subir el certificado de MA:', error);
        this.subiendoCertificadoMA = false;
        this.errorSubidaCertificadoMA = 'No se pudieron subir todos los archivos. Inténtalo de nuevo.';
        this.cargarCertificadosMA();
      });
  }

  private subirCertificadoMA(archivo: File, anio: number, alAvanzar: (bytes: number) => void): Promise<CertificadoMA> {
    const ruta = 'certificadosMA/' + this.idSubProyecto + '/' + anio + '/' + Date.now() + '_' + this.limpiarNombreArchivo(archivo.name);
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
                fechaSubida: new Date().toISOString()
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
      return this.normalizarTexto([item.tipo, item.descripcion, item.medidasControl].join(' ')).indexOf(busqueda) !== -1;
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
              lugar: '',
              comuna: '',
              obra: data.nombreSubProyecto || '',
              empresa: '',
              tipo: this.getTipoHistorico(data.tipo),
              resolucion: '',
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
    return { fecha: '', tipo: '', grado: null, diasPerdidos: 0, descripcion: '', medidasControl: '', estado: 'Abierto' };
  }

  abrirNuevo() {
    this.formulario = this.getFormularioVacio();
    if (this.enIncidentes && this.tiposFormulario.length) {
      this.formulario.tipo = this.tiposFormulario[0].nombre;
    }
    this.editandoId = null;
    this.errorFormulario = '';
    this.formularioAbierto = true;
    this.mostrarFormulario();
  }

  editar(item: AccidenteSSO) {
    if (this.soloLectura) { return; }
    this.formulario = { ...item };
    this.editandoId = item.id;
    this.errorFormulario = '';
    this.formularioAbierto = true;
    this.mostrarFormulario();
  }

  cerrarFormulario() {
    this.formularioAbierto = false;
    this.editandoId = null;
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
      idUsuarioActualizacion: this.idUsuario,
      fechaActualizacion: new Date().toISOString()
    };

    const coleccion = firestoreDB.collection(COLECCION);
    const idEditado = this.editandoId;
    const guardado = idEditado
      ? coleccion.doc(idEditado).update(payload).then(() => idEditado)
      : coleccion.add(payload).then((doc: any) => doc.id);

    this.guardando = true;
    guardado
      .then((id: string) => {
        const registro: any = { ...payload, id: id };
        this.accidentes = this.accidentes.filter(item => item.id !== id).concat(registro);
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