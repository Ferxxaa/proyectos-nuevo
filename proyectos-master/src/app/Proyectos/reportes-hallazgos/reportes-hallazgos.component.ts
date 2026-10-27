import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { firestoreDB } from '../../firebase-init';
import { HallazgoItem, sHallazgos } from '../../services/sHallazgos.service';
import { sMis_Proyectos } from '../../services/sMis_Proyectos.service';
import { sUsuarioClienteProyecto } from '../../services/sUsuarioClienteProyecto.service';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';

interface SubProyectoReporte {
  idSubProyecto: number;
  nombreProyecto: string;
  nombreSubProyecto: string;
  nombreEstadoProyecto: string;
  activo: boolean;
}

interface ConteoAnual {
  anio: number;
  total: number;
}

interface ReporteSubProyecto {
  idSubProyecto: number;
  nombreProyecto: string;
  nombreSubProyecto: string;
  estado: string;
  estadoClase: string;
  total: number;
  abiertos: number;
  cerrados: number;
  prioridadAlta: number;
  pctCierre: number;
  mandante: number;
  nc: number;
  sw: number;
  rp: number;
  /** Conteo por cada tipo de acción (nc, sw, rp, om, fr, nm, la, otro). */
  tipos: { [tipo: string]: number };
}

interface ConteoCategoria {
  nombre: string;
  total: number;
  pct: number;
}

interface ReporteObra {
  nombre: string;
  total: number;
  abiertos: number;
  detectadosMandante: number;
  noConformidad: number;
  stopWork: number;
  refuerzoPositivo: number;
  hallazgosPositivos: number;
  tipos: { [tipo: string]: number };
}

/** Fila de las tablas del Consolidado general (un valor por año + total). */
interface FilaConsolidado {
  key: string;
  label: string;
  clase: string;
  valores: number[];
  total: number;
}

/** Gráficos del Consolidado general. */
interface CgColumnaTipo {
  anio: number;
  total: number;
  vivo: boolean;
  alto: number;
  segmentos: Array<{ label: string; color: string; valor: number }>;
}

interface CgSegmentoDonut {
  label: string;
  color: string;
  valor: number;
  pct: number;
  dash: string;
  offset: number;
}

interface CgColumnaEficacia {
  anio: number;
  vivo: boolean;
  realizadas: number;
  efectivas: number;
  altoRealizadas: number;
  altoEfectivas: number;
  pct: number | null;
}

interface CgColumnaMandante {
  anio: number;
  vivo: boolean;
  desv: number;
  rp: number;
  altoDesv: number;
  altoRp: number;
}

interface CgKpi {
  key: string;
  icono: string;
  clase: string;
  label: string;
  valor: string;
  detalle: string;
}

/** Campos de orden de la tabla; para los tipos de acción se usa 't_' + clave (t_nc, t_sw, t_om...). */
type CampoOrden = string;

/** Tipos de acción de Control de Hallazgos (misma lista y orden). */
declare var Swal: any;

/** Logo que va en la cabecera del Excel. Ruta relativa a la app (carpeta src/assets). */
const LOGO_TRAZAS_URL = 'assets/img/logo-trazas.png';
/** ExcelJS se carga solo al exportar (no hay que instalar nada con npm). */
const EXCELJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js';

/** Paleta del reporte Excel (ARGB). */
const XL = {
  azul: 'FF075F91',
  azulMedio: 'FF0879B2',
  azulSuave: 'FFE5F2F9',
  azulMuySuave: 'FFF4F8FB',
  gris: 'FF5F707B',
  grisClaro: 'FF8796A0',
  borde: 'FFDDE5EA',
  blanco: 'FFFFFFFF',
  texto: 'FF1F3646',
  rojo: 'FFC0392B',
  rojoSuave: 'FFFDECEC',
  verde: 'FF23804F',
  verdeSuave: 'FFE6F6EE',
  naranjo: 'FFC27612',
  naranjoSuave: 'FFFDF3E3'
};

const TIPOS_ACCION: Array<{ key: string; label: string; sigla: string; clase: string; icono: string }> = [
  { key: 'nc', label: 'No Conformidad', sigla: 'NC', clase: 'ta-nc', icono: 'fa-times-circle' },
  { key: 'sw', label: 'Stop Work', sigla: 'SW', clase: 'ta-sw', icono: 'fa-hand-paper-o' },
  { key: 'rp', label: 'Refuerzo Positivo', sigla: 'RP', clase: 'ta-rp', icono: 'fa-thumbs-up' },
  { key: 'om', label: 'Oportunidad de Mejora', sigla: 'OM', clase: 'ta-om', icono: 'fa-lightbulb-o' },
  { key: 'fr', label: 'Flash Report', sigla: 'FR', clase: 'ta-fr', icono: 'fa-bolt' },
  { key: 'nm', label: 'Near Miss', sigla: 'NM', clase: 'ta-nm', icono: 'fa-exclamation-triangle' },
  { key: 'la', label: 'Lección aprendida', sigla: 'LA', clase: 'ta-la', icono: 'fa-graduation-cap' },
  { key: 'otro', label: 'Sin tipo / Otro', sigla: '—', clase: 'ta-otro', icono: 'fa-question-circle' }
];

/** Quién detecta (misma lista que Control de Hallazgos). */
const QUIEN_DETECTA: Array<{ key: string; label: string; clase: string }> = [
  { key: 'mandante', label: 'Mandante', clase: 'qd-mandante' },
  { key: 'interno', label: 'Interno', clase: 'qd-interno' },
  { key: 'vecinos', label: 'Vecinos', clase: 'qd-vecinos' },
  { key: 'otros', label: 'Otros', clase: 'qd-otros' },
  { key: 'sin', label: 'Sin registrar', clase: 'qd-sin' }
];

// ==========================================================
// CONSOLIDADO GENERAL
// Histórico del Excel REG-10-B-24 hasta CONSOLIDADO_ULTIMO_ANIO_HISTORICO.
// Desde el año siguiente todo se calcula en tiempo real con los hallazgos del sistema.
// ==========================================================
const CONSOLIDADO_ULTIMO_ANIO_HISTORICO = 2025;

const CAMPOS_CONSOLIDADO = ['fr', 'rp', 'otros', 'obs', 'sw', 'nc', 'baja', 'media', 'efectivo', 'muy', 'desvMandante', 'rpMandante'];

const CONSOLIDADO_HISTORICO: { [anio: string]: { [campo: string]: number } } = {
  '2017': { fr: 0,  rp: 0, otros: 9, obs: 2, sw: 0, nc: 0, baja: 0, media: 2, efectivo: 3, muy: 1, desvMandante: 1,  rpMandante: 0 },
  '2018': { fr: 0,  rp: 0, otros: 3, obs: 3, sw: 0, nc: 2, baja: 0, media: 0, efectivo: 3, muy: 2, desvMandante: 0,  rpMandante: 0 },
  '2019': { fr: 0,  rp: 0, otros: 2, obs: 1, sw: 0, nc: 1, baja: 0, media: 0, efectivo: 0, muy: 4, desvMandante: 1,  rpMandante: 0 },
  '2020': { fr: 0,  rp: 0, otros: 0, obs: 0, sw: 0, nc: 3, baja: 0, media: 1, efectivo: 3, muy: 2, desvMandante: 0,  rpMandante: 0 },
  '2021': { fr: 0,  rp: 0, otros: 0, obs: 1, sw: 0, nc: 2, baja: 0, media: 0, efectivo: 0, muy: 1, desvMandante: 1,  rpMandante: 0 },
  '2022': { fr: 0,  rp: 0, otros: 0, obs: 3, sw: 1, nc: 5, baja: 0, media: 0, efectivo: 3, muy: 1, desvMandante: 3,  rpMandante: 0 },
  '2023': { fr: 12, rp: 0, otros: 0, obs: 0, sw: 2, nc: 1, baja: 0, media: 0, efectivo: 0, muy: 2, desvMandante: 3,  rpMandante: 0 },
  '2024': { fr: 48, rp: 5, otros: 0, obs: 2, sw: 4, nc: 6, baja: 0, media: 1, efectivo: 1, muy: 1, desvMandante: 11, rpMandante: 4 },
  '2025': { fr: 31, rp: 1, otros: 0, obs: 1, sw: 1, nc: 0, baja: 0, media: 0, efectivo: 0, muy: 1, desvMandante: 2,  rpMandante: 1 }
};

const CONSOLIDADO_TIPOS: Array<{ key: string; label: string; clase: string }> = [
  { key: 'fr', label: 'Flash Report', clase: 'cg-fr' },
  { key: 'rp', label: 'Refuerzo Positivo', clase: 'cg-rp' },
  { key: 'otros', label: 'Otros (Near Miss, Lección aprendida, sin tipo)', clase: 'cg-otros' },
  { key: 'obs', label: 'Observación / Oportunidad de Mejora', clase: 'cg-obs' },
  { key: 'sw', label: 'Stop Work', clase: 'cg-sw' },
  { key: 'nc', label: 'No Conformidad', clase: 'cg-nc' }
];

/** Nombre corto y color de cada tipo para los gráficos del consolidado. */
const CG_ESTILO_TIPO: { [key: string]: { corto: string; color: string } } = {
  // Colores del Excel REG-10-B-24
  fr: { corto: 'Flash Report', color: '#92D050' },
  rp: { corto: 'Refuerzo Positivo', color: '#00B050' },
  otros: { corto: 'Otros', color: '#A0ADB6' },
  obs: { corto: 'Observación / OM', color: '#FFFF00' },
  sw: { corto: 'Stop Work', color: '#FFC000' },
  nc: { corto: 'No Conformidad', color: '#FF0000' }
};

const CONSOLIDADO_EFICACIA: Array<{ key: string; label: string; clase: string }> = [
  { key: 'baja', label: 'Efectividad baja', clase: 'cg-ef-baja' },
  { key: 'media', label: 'Efectividad media', clase: 'cg-ef-media' },
  { key: 'efectivo', label: 'Efectivo', clase: 'cg-ef-efectivo' },
  { key: 'muy', label: 'Muy efectivo', clase: 'cg-ef-muy' }
];

const CONSOLIDADO_MANDANTE: Array<{ key: string; label: string; clase: string }> = [
  { key: 'desvMandante', label: 'Mandante: desviaciones', clase: 'cg-desv' },
  { key: 'rpMandante', label: 'Mandante: refuerzo positivo', clase: 'cg-mrp' }
];

interface ResumenTipoAccion {
  key: string;
  label: string;
  sigla: string;
  clase: string;
  icono: string;
  total: number;
  pct: number;
  mandante: number;
  abiertos: number;
  porDetecta: { [detecta: string]: number };
}

interface ResumenDetecta {
  key: string;
  label: string;
  clase: string;
  total: number;
  pct: number;
}

@Component({
  selector: 'app-reportes-hallazgos',
  templateUrl: './reportes-hallazgos.component.html',
  styleUrls: ['./reportes-hallazgos.component.css'],
  providers: [sHallazgos, sMis_Proyectos, sUsuarioClienteProyecto, sUsuariosPerfiles]
})
export class ReportesHallazgosComponent implements OnInit, OnDestroy {
  subProyectos: SubProyectoReporte[] = [];
  hallazgos: HallazgoItem[] = [];
  hallazgosDelAnio: HallazgoItem[] = [];
  aniosDisponibles: number[] = [];
  conteosAnuales: ConteoAnual[] = [];
  reportesSubProyectos: ReporteSubProyecto[] = [];
  anioSeleccionado: number = new Date().getFullYear();
  busqueda: string = '';
  cargandoSubProyectos: boolean = true;
  cargandoHallazgos: boolean = false;
  error: string = '';

  // Filtros y orden de la tabla
  soloConHallazgos: boolean = true;
  ordenCampo: CampoOrden = 'total';
  ordenAsc: boolean = false;
  readonly maxBarrasSubProyecto = 10;

  // Resumen del año seleccionado (precalculado para no recalcular en cada ciclo de Angular)
  totalAbiertos: number = 0;
  totalCerrados: number = 0;
  totalPrioridadAlta: number = 0;
  totalPrioridadMedia: number = 0;
  totalPrioridadBaja: number = 0;
  tasaCierre: number = 0;
  variacionAnual: number | null = null;
  subProyectosConHallazgos: number = 0;
  totalSubProyectos: number = 0;
  maximoAnual: number = 0;
  maximoSubProyecto: number = 0;
  /** Desglose del "en seguimiento" por estado (se muestra dentro del KPI, sin panel aparte). */
  porEstadoAbiertos: ConteoCategoria[] = [];
  topSubProyectos: ReporteSubProyecto[] = [];
  reportesObra: ReporteObra[] = [];
  reportesObraFiltrados: ReporteObra[] = [];

  // Relación con el mandante
  readonly columnasDetecta = QUIEN_DETECTA;
  tiposResumen: ResumenTipoAccion[] = [];
  detectaResumen: ResumenDetecta[] = [];
  totalMandante: number = 0;
  pctMandante: number = 0;
  mandanteAbiertos: number = 0;
  mandanteCerrados: number = 0;
  mandanteVariacion: number | null = null;

  // Consolidado general (todos los años: histórico + sistema)
  readonly ultimoAnioHistorico = CONSOLIDADO_ULTIMO_ANIO_HISTORICO;
  consolidadoAnios: number[] = [];
  consolidadoTipos: FilaConsolidado[] = [];
  consolidadoTiposTotales: number[] = [];
  consolidadoTiposGranTotal: number = 0;
  consolidadoEficacia: FilaConsolidado[] = [];
  consolidadoEficaciaTotales: number[] = [];
  consolidadoEficaciaGranTotal: number = 0;
  consolidadoMejoras: FilaConsolidado[] = [];
  consolidadoPctMejoras: Array<number | null> = [];
  consolidadoPctMejorasTotal: number | null = null;
  consolidadoMandante: FilaConsolidado[] = [];
  consolidadoPctMandante: Array<number | null> = [];
  consolidadoPctMandanteTotal: number | null = null;

  // Gráficos del consolidado
  readonly cgCircunferencia = 2 * Math.PI * 40;
  cgKpis: CgKpi[] = [];
  cgColumnasTipos: CgColumnaTipo[] = [];
  cgLeyendaTipos: Array<{ label: string; color: string; total: number }> = [];
  cgDonut: CgSegmentoDonut[] = [];
  cgColumnasEficacia: CgColumnaEficacia[] = [];
  cgPuntosEficacia: string = '';
  cgColumnasMandante: CgColumnaMandante[] = [];

  // Vista del detalle (una sola tabla con pestañas)
  vistaDetalle: 'subproyecto' | 'obra' = 'subproyecto';
  /** Tipos de acción que se muestran como columnas en el detalle (todos, en el orden de Control de Hallazgos). */
  columnasTipoDetalle: Array<{ key: string; label: string; sigla: string; clase: string; icono: string }> =
    TIPOS_ACCION.filter(t => t.key !== 'otro');
  exportando: boolean = false;

  private todosLosReportes: ReporteSubProyecto[] = [];
  private cargasSubProyectosCompletadas: number = 0;
  private solicitudesCierreCargadas: boolean = false;
  private solicitudesCierre: any[] = [];
  private unsubscribeSolicitudesCierre: (() => void) | null = null;
  private hallazgosSubscription: Subscription = null;

  // Carga rápida: todo se pide en paralelo y se muestra al tiro lo último que se vio (caché local)
  /** true mientras se muestran datos de la caché y se espera la versión fresca. */
  actualizando: boolean = false;
  /** Subproyectos que se van juntando mientras cargan las 3 fuentes. */
  private subProyectosCarga: SubProyectoReporte[] = [];
  private subProyectosListos: boolean = false;
  /** Hallazgos tal cual llegan de Firestore (antes de filtrar por los subproyectos visibles). */
  private hallazgosCrudos: HallazgoItem[] = null;

  constructor(
    private _sMisProyectos: sMis_Proyectos,
    private _sUsuariosPerfiles: sUsuariosPerfiles,
    private _sUsuarioClienteProyecto: sUsuarioClienteProyecto,
    private _sHallazgos: sHallazgos,
    private _router: Router
  ) {}

  ngOnInit() {
    this.calcularConsolidado();
    // 1. Si hay datos guardados de la última visita, se pintan de inmediato
    this.leerCache();
    // 2. Hallazgos y subproyectos se cargan EN PARALELO (antes los hallazgos esperaban a los proyectos)
    this.escucharHallazgos();
    this.cargarSubProyectosDesdeMisProyectos();
    this.cargarSubProyectosFinalizados();
    this.escucharSolicitudesCierre();
  }

  private async cargarSubProyectosDesdeMisProyectos() {
    try {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      const idUsuario = Number(usuario.idUsuario);
      if (!idUsuario) {
        throw new Error('No se encontró el usuario de la sesión.');
      }

      const perfiles = await this._sUsuariosPerfiles
        .getUsuariosPerfilesbyidUsuario(idUsuario).toPromise();
      if (!Array.isArray(perfiles)) {
        throw new Error('La respuesta de perfiles no tiene un formato válido.');
      }

      const esSubGerenteOSeguridad = perfiles.some((perfil: any) =>
        perfil.idPerfil == 1 || perfil.idPerfil == 9
      );
      const proyectosBase = esSubGerenteOSeguridad
        ? await this._sMisProyectos.getMis_Proyectos().toPromise()
        : await this._sMisProyectos.getMis_ProyectosbyidUsuarioCoordinador(idUsuario).toPromise();
      if (!Array.isArray(proyectosBase)) {
        throw new Error('La respuesta de Mis Proyectos no tiene un formato válido.');
      }

      const proyectosCliente = await this._sUsuarioClienteProyecto
        .getUsuarioClienteProyectobyidUsuarioCliente(idUsuario).toPromise();
      if (!Array.isArray(proyectosCliente)) {
        throw new Error('La respuesta de proyectos del cliente no tiene un formato válido.');
      }

      const subProyectosCliente = await Promise.all(proyectosCliente.map((proyecto: any) =>
        this._sMisProyectos.getMis_ProyectosbyidProyecto(proyecto.idProyecto).toPromise()
      ));
      const subProyectosVisibles = proyectosBase.concat(
        ...subProyectosCliente.filter((items: any) => Array.isArray(items))
      ).filter((item: any) => {
        const estado = String(item.nombreEstadoProyecto || '').toLowerCase().trim();
        const matriz = String(item.nombreProyectoMatriz || '').toLowerCase();
        const estadoVisible = !['finalizado', 'finalizada', 'cerrado', 'cerrada'].includes(estado);
        const matrizVisible = ![
          'matriz trazas',
          'proyecto matriz 2',
          'prueba proyecto matriz',
          'prueba cliente'
        ].includes(matriz);
        return estadoVisible && matrizVisible;
      });

      this.agregarSubProyectos(subProyectosVisibles);
      this.completarCargaSubProyectos();
    } catch (error) {
      this.errorCargaSubProyectos('Mis Proyectos', error);
    }
  }

  private cargarSubProyectosFinalizados() {
    this._sMisProyectos.getMis_ProyectosbynombreEstadoProyecto('Finalizado').subscribe(
      (data: any) => {
        this.agregarSubProyectos(data);
        this.completarCargaSubProyectos();
      },
      (error: any) => {
        this.errorCargaSubProyectos('Validación Cierre', error);
      }
    );
  }

  private escucharSolicitudesCierre() {
    this.unsubscribeSolicitudesCierre = firestoreDB.collection('solicitudesCierre')
      .where('estado', '==', 'pendiente_validacion')
      .onSnapshot((snapshot: any) => {
        this.solicitudesCierre = snapshot.docs.map((doc: any) => doc.data() || {});
        this.agregarSubProyectos(this.solicitudesCierre);
        if (!this.solicitudesCierreCargadas) {
          this.solicitudesCierreCargadas = true;
          this.completarCargaSubProyectos();
        }
      }, (error: any) => {
        console.error('Error al cargar solicitudes de cierre para los reportes:', error);
        this.error = 'No se pudieron cargar los proyectos pendientes de Validación Cierre.';
        this.cargandoSubProyectos = false;
      });
  }

  private agregarSubProyectos(data: any) {
    if (!Array.isArray(data)) {
      this.error = 'La respuesta de proyectos no tiene un formato válido.';
      return;
    }

    const subProyectosPorId: { [id: string]: SubProyectoReporte } = {};
    this.subProyectosCarga.forEach(item => {
      subProyectosPorId[String(item.idSubProyecto)] = item;
    });

    data.forEach((item: any) => {
      const idSubProyecto = Number(item && item.idSubProyecto);
      if (!idSubProyecto || idSubProyecto < 1) {
        return;
      }

      const id = String(idSubProyecto);
      const anterior = subProyectosPorId[id];
      subProyectosPorId[id] = {
        idSubProyecto,
        nombreProyecto: String(item.nombreProyecto || (anterior && anterior.nombreProyecto) || 'Proyecto sin nombre'),
        nombreSubProyecto: String(item.nombreSubProyecto || (anterior && anterior.nombreSubProyecto) || 'Subproyecto sin nombre'),
        nombreEstadoProyecto: String(item.nombreEstadoProyecto || (anterior && anterior.nombreEstadoProyecto) || ''),
        activo: item.activo === true || item.activo === 'true' ||
          item.activo === 1 || item.activo === '1' ||
          (!item.hasOwnProperty('activo') && !!(anterior && anterior.activo))
      };
    });

    this.subProyectosCarga = Object.keys(subProyectosPorId).map(id => subProyectosPorId[id]);

    // Cambios posteriores (p. ej. una nueva solicitud de cierre) se reflejan al tiro
    if (this.subProyectosListos) {
      this.subProyectos = this.subProyectosCarga;
      this.procesarHallazgos();
    }
  }

  private completarCargaSubProyectos() {
    this.cargasSubProyectosCompletadas++;
    if (this.cargasSubProyectosCompletadas < 3) {
      return;
    }

    this.subProyectosListos = true;
    this.subProyectos = this.subProyectosCarga;
    this.cargandoSubProyectos = false;

    if (this.error || this.subProyectos.length === 0) {
      this.cargandoHallazgos = false;
      this.actualizando = false;
      return;
    }
    this.procesarHallazgos();
  }

  private errorCargaSubProyectos(origen: string, error: any) {
    console.error('Error al cargar subproyectos desde ' + origen + ':', error);
    this.cargandoSubProyectos = false;
    this.actualizando = false;
    // Si ya se está mostrando la caché, no se tapa la pantalla con el error
    if (!this.hallazgos.length) {
      this.error = 'No se pudieron cargar todos los proyectos de Mis Proyectos y Validación Cierre.';
    }
  }

  ngOnDestroy() {
    if (this.hallazgosSubscription) {
      this.hallazgosSubscription.unsubscribe();
    }
    if (this.unsubscribeSolicitudesCierre) {
      this.unsubscribeSolicitudesCierre();
    }
  }

  private escucharHallazgos() {
    this.hallazgosSubscription = this._sHallazgos.getTodosLosHallazgos().subscribe(
      (hallazgos: HallazgoItem[]) => {
        this.hallazgosCrudos = hallazgos || [];
        if (this.subProyectosListos) {
          this.procesarHallazgos();
        }
      },
      (error: any) => {
        console.error('Error al cargar hallazgos para los reportes:', error);
        this.cargandoHallazgos = false;
        this.actualizando = false;
        if (!this.hallazgos.length) {
          this.error = 'No se pudieron cargar los hallazgos desde Firestore.';
        }
      }
    );
  }

  /** Cruza los hallazgos con los subproyectos visibles. Corre cuando ya llegó lo uno y lo otro. */
  private procesarHallazgos() {
    if (!this.hallazgosCrudos) {
      // Los proyectos llegaron primero: se espera a Firestore (si no hay caché, se ve el esqueleto)
      if (!this.actualizando) {
        this.cargandoHallazgos = true;
      }
      return;
    }

    const idsSubProyectos: { [id: string]: boolean } = {};
    this.subProyectos.forEach(subProyecto => {
      idsSubProyectos[String(subProyecto.idSubProyecto)] = true;
    });

    this.hallazgos = this.hallazgosCrudos.filter(hallazgo =>
      !!hallazgo &&
      !!hallazgo.idSubProyecto &&
      !!idsSubProyectos[String(hallazgo.idSubProyecto)] &&
      hallazgo.ambito !== 'oficina' &&
      hallazgo.tipoRegistro !== 'hallazgo-oficina'
    );
    this.actualizarAnios();
    this.cargandoHallazgos = false;
    this.actualizando = false;
    this.guardarCache();
  }

  // ---------- Caché local (localStorage, por usuario) ----------

  private claveCache(): string {
    try {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      return usuario && usuario.idUsuario ? 'cacheReportesHallazgos_v1_' + usuario.idUsuario : '';
    } catch (e) {
      return '';
    }
  }

  /** Pinta la pantalla con lo último que se vio, mientras llega lo fresco por detrás. */
  private leerCache() {
    const clave = this.claveCache();
    if (!clave) { return; }
    try {
      const cache = JSON.parse(localStorage.getItem(clave) || 'null');
      if (!cache || !Array.isArray(cache.sub) || !Array.isArray(cache.h) || !cache.sub.length) { return; }
      this.subProyectos = cache.sub;
      this.hallazgos = cache.h;
      this.cargandoSubProyectos = false;
      this.cargandoHallazgos = false;
      this.actualizando = true;
      this.actualizarAnios();
    } catch (e) {
      try { localStorage.removeItem(clave); } catch (er) { }
    }
  }

  /** Guarda solo los campos que usa el reporte (sin fotos ni textos largos) para que pese poco. */
  private guardarCache() {
    const clave = this.claveCache();
    if (!clave) { return; }
    const campos = ['idSubProyecto', 'ambito', 'tipoRegistro', 'anio', 'fecha', 'estado', 'prioridad', 'obra',
      'tipoAccion', 'quienDetecta', 'origenHallazgo', 'eficacia', 'efectividad', 'eficaciaMejora',
      'efectividadMejora', 'medicionEficacia', 'evaluacionEficacia'];
    try {
      const h = this.hallazgos.map((item: any) => {
        const liviano: any = {};
        campos.forEach(c => { if (item[c] !== undefined && item[c] !== null && item[c] !== '') { liviano[c] = item[c]; } });
        return liviano;
      });
      localStorage.setItem(clave, JSON.stringify({ t: Date.now(), sub: this.subProyectos, h: h }));
    } catch (e) {
      // Si no cabe en localStorage, simplemente no se guarda
    }
  }

  private actualizarAnios() {
    const anios: number[] = [];
    this.hallazgos.forEach(hallazgo => {
      const anio = this.obtenerAnio(hallazgo);
      if (anio && anios.indexOf(anio) === -1) {
        anios.push(anio);
      }
    });
    this.aniosDisponibles = anios.sort((a, b) => b - a);

    if (this.aniosDisponibles.length && this.aniosDisponibles.indexOf(this.anioSeleccionado) === -1) {
      this.anioSeleccionado = this.aniosDisponibles[0];
    }

    this.conteosAnuales = this.aniosDisponibles
      .map(anio => ({
        anio,
        total: this.hallazgos.filter(hallazgo => this.obtenerAnio(hallazgo) === anio).length
      }))
      .sort((a, b) => a.anio - b.anio);
    this.calcularConsolidado();
    this.actualizarResumenAnual();
  }

  private obtenerAnio(hallazgo: HallazgoItem): number {
    const anioGuardado = Number(hallazgo.anio);
    if (anioGuardado >= 1900 && anioGuardado <= 9999) {
      return anioGuardado;
    }

    const fecha = String(hallazgo.fecha || '').trim();
    const fechaIso = fecha.match(/^(\d{4})[-/]/);
    if (fechaIso) {
      return Number(fechaIso[1]);
    }

    const fechaLocal = fecha.match(/^\d{1,2}[-/]\d{1,2}[-/](\d{4})$/);
    return fechaLocal ? Number(fechaLocal[1]) : 0;
  }

  actualizarResumenAnual() {
    this.hallazgosDelAnio = this.hallazgos.filter(hallazgo =>
      this.obtenerAnio(hallazgo) === this.anioSeleccionado
    );

    // Subproyectos con solicitud de cierre pendiente (para mostrar su estado real en la tabla)
    const pendientesCierre: { [id: string]: boolean } = {};
    (this.solicitudesCierre || []).forEach((s: any) => {
      if (s && s.idSubProyecto) { pendientesCierre[String(s.idSubProyecto)] = true; }
    });

    const reportesPorId: { [id: string]: ReporteSubProyecto } = {};

    this.subProyectos.forEach(subProyecto => {
      const id = String(subProyecto.idSubProyecto);
      const estado = pendientesCierre[id] && !subProyecto.nombreEstadoProyecto
        ? 'Pendiente de cierre'
        : (subProyecto.nombreEstadoProyecto || (subProyecto.activo ? 'Activo' : 'Inactivo'));

      reportesPorId[id] = {
        idSubProyecto: subProyecto.idSubProyecto,
        nombreProyecto: subProyecto.nombreProyecto,
        nombreSubProyecto: subProyecto.nombreSubProyecto,
        estado: estado,
        estadoClase: this.claseEstadoSubProyecto(estado),
        total: 0,
        abiertos: 0,
        cerrados: 0,
        prioridadAlta: 0,
        pctCierre: 0,
        mandante: 0,
        nc: 0,
        sw: 0,
        rp: 0,
        tipos: this.tiposAccionVacios()
      };
    });

    // Matriz tipo de acción × quién detecta
    const resumenTipos: { [key: string]: ResumenTipoAccion } = {};
    TIPOS_ACCION.forEach(t => {
      const porDetecta: { [k: string]: number } = {};
      QUIEN_DETECTA.forEach(q => porDetecta[q.key] = 0);
      resumenTipos[t.key] = {
        key: t.key, label: t.label, sigla: t.sigla, clase: t.clase, icono: t.icono,
        total: 0, pct: 0, mandante: 0, abiertos: 0, porDetecta: porDetecta
      };
    });
    const totalesDetecta: { [k: string]: number } = {};
    QUIEN_DETECTA.forEach(q => totalesDetecta[q.key] = 0);
    let mandanteAbiertos = 0;
    let mandanteCerrados = 0;

    let abiertos = 0;
    let cerrados = 0;
    let alta = 0;
    let media = 0;
    let baja = 0;
    const estadosAbiertos: { [estado: string]: number } = {};
    const obras: { [obra: string]: ReporteObra } = {};

    this.hallazgosDelAnio.forEach(hallazgo => {
      const estadoHallazgo = (hallazgo.estado || '').toUpperCase().trim();
      const cerrado = estadoHallazgo === 'CERRADA';
      // Igual que en Control de Hallazgos: sin prioridad se considera MEDIA
      const prioridad = (hallazgo.prioridad || 'MEDIA').toUpperCase().trim();

      if (cerrado) { cerrados++; } else { abiertos++; }
      if (prioridad === 'ALTA') { alta++; } else if (prioridad === 'BAJA') { baja++; } else { media++; }

      if (!cerrado) {
        const nombreEstado = estadoHallazgo || 'SIN ESTADO';
        estadosAbiertos[nombreEstado] = (estadosAbiertos[nombreEstado] || 0) + 1;
      }

      const nombreObra = String(hallazgo.obra || '').trim() || 'Sin obra';
      const claveObra = this.normalizar(nombreObra);
      if (!obras[claveObra]) {
        obras[claveObra] = {
          nombre: nombreObra,
          total: 0,
          abiertos: 0,
          detectadosMandante: 0,
          noConformidad: 0,
          stopWork: 0,
          refuerzoPositivo: 0,
          hallazgosPositivos: 0,
          tipos: this.tiposAccionVacios()
        };
      }

      const reporteObra = obras[claveObra];
      const claveTipoAccion = this.claveTipoAccion(hallazgo.tipoAccion);
      const claveDetecta = this.claveQuienDetecta(hallazgo.quienDetecta);
      const esMandante = claveDetecta === 'mandante';
      const origenNormalizado = this.normalizar(hallazgo.origenHallazgo);

      const resumenTipo = resumenTipos[claveTipoAccion];
      resumenTipo.total++;
      resumenTipo.porDetecta[claveDetecta]++;
      if (!cerrado) { resumenTipo.abiertos++; }
      if (esMandante) {
        resumenTipo.mandante++;
        if (cerrado) { mandanteCerrados++; } else { mandanteAbiertos++; }
      }
      totalesDetecta[claveDetecta]++;

      reporteObra.total++;
      if (!cerrado) {
        reporteObra.abiertos++;
      }
      if (esMandante) {
        reporteObra.detectadosMandante++;
      }
      reporteObra.tipos[claveTipoAccion] = (reporteObra.tipos[claveTipoAccion] || 0) + 1;
      if (claveTipoAccion === 'nc') {
        reporteObra.noConformidad++;
      }
      if (claveTipoAccion === 'sw') {
        reporteObra.stopWork++;
      }
      if (claveTipoAccion === 'rp') {
        reporteObra.refuerzoPositivo++;
      }
      if (origenNormalizado.indexOf('hallazgo positivo') !== -1) {
        reporteObra.hallazgosPositivos++;
      }

      const reporte = reportesPorId[String(hallazgo.idSubProyecto)];
      if (!reporte) {
        return;
      }

      reporte.total++;
      if (cerrado) {
        reporte.cerrados++;
      } else {
        reporte.abiertos++;
      }
      if (prioridad === 'ALTA') {
        reporte.prioridadAlta++;
      }
      if (esMandante) { reporte.mandante++; }
      if (claveTipoAccion === 'nc') { reporte.nc++; }
      if (claveTipoAccion === 'sw') { reporte.sw++; }
      if (claveTipoAccion === 'rp') { reporte.rp++; }
      reporte.tipos[claveTipoAccion] = (reporte.tipos[claveTipoAccion] || 0) + 1;
    });

    const totalAnio = this.hallazgosDelAnio.length;
    this.totalAbiertos = abiertos;
    this.totalCerrados = cerrados;
    this.totalPrioridadAlta = alta;
    this.totalPrioridadMedia = media;
    this.totalPrioridadBaja = baja;
    this.tasaCierre = totalAnio ? Math.round(cerrados * 100 / totalAnio) : 0;

    const anterior = this.conteosAnuales.filter(c => c.anio === this.anioSeleccionado - 1)[0];
    this.variacionAnual = anterior ? totalAnio - anterior.total : null;
    this.maximoAnual = this.conteosAnuales.reduce((maximo, item) => Math.max(maximo, item.total), 0);

    this.porEstadoAbiertos = this.aCategorias(estadosAbiertos, abiertos);
    // Columnas de tipo para las tablas de detalle ("Sin tipo" solo si hay registros sin tipo)
    this.columnasTipoDetalle = TIPOS_ACCION.filter(t => t.key !== 'otro' || resumenTipos['otro'].total > 0);

    this.reportesObra = Object.keys(obras)
      .map(clave => obras[clave])
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));

    // Relación con el mandante
    this.tiposResumen = TIPOS_ACCION
      .map(t => {
        const r = resumenTipos[t.key];
        r.pct = totalAnio ? Math.round(r.total * 100 / totalAnio) : 0;
        return r;
      })
      // "Sin tipo" solo aparece si hay registros sin tipo
      .filter(r => r.key !== 'otro' || r.total > 0);

    this.detectaResumen = QUIEN_DETECTA
      .map(q => ({
        key: q.key,
        label: q.label,
        clase: q.clase,
        total: totalesDetecta[q.key],
        pct: totalAnio ? Math.round(totalesDetecta[q.key] * 100 / totalAnio) : 0
      }))
      .filter(d => d.key !== 'sin' || d.total > 0);

    this.totalMandante = totalesDetecta['mandante'];
    this.pctMandante = totalAnio ? Math.round(this.totalMandante * 100 / totalAnio) : 0;
    this.mandanteAbiertos = mandanteAbiertos;
    this.mandanteCerrados = mandanteCerrados;

    const mandanteAnioAnterior = this.hallazgos.filter(h =>
      this.obtenerAnio(h) === this.anioSeleccionado - 1 && this.claveQuienDetecta(h.quienDetecta) === 'mandante'
    ).length;
    this.mandanteVariacion = anterior ? this.totalMandante - mandanteAnioAnterior : null;


    this.todosLosReportes = Object.keys(reportesPorId).map(id => {
      const r = reportesPorId[id];
      r.pctCierre = r.total ? Math.round(r.cerrados * 100 / r.total) : 0;
      return r;
    });
    this.totalSubProyectos = this.todosLosReportes.length;
    this.subProyectosConHallazgos = this.todosLosReportes.filter(reporte => reporte.total > 0).length;

    this.filtrarReportes();
  }

  // ==========================================================
  // Consolidado general: histórico (Excel) + años del sistema
  // ==========================================================

  private calcularConsolidado() {
    const porAnio: { [anio: string]: { [campo: string]: number } } = {};

    Object.keys(CONSOLIDADO_HISTORICO).forEach(anio => {
      const base = this.consolidadoVacio();
      CAMPOS_CONSOLIDADO.forEach(c => base[c] = CONSOLIDADO_HISTORICO[anio][c] || 0);
      porAnio[anio] = base;
    });

    // El año en curso siempre aparece, aunque todavía no tenga hallazgos
    const anioActual = new Date().getFullYear();
    if (anioActual > CONSOLIDADO_ULTIMO_ANIO_HISTORICO) {
      porAnio[String(anioActual)] = this.consolidadoVacio();
    }

    this.hallazgos.forEach(hallazgo => {
      const anio = this.obtenerAnio(hallazgo);
      if (!anio || anio <= CONSOLIDADO_ULTIMO_ANIO_HISTORICO) { return; }

      const clave = String(anio);
      if (!porAnio[clave]) { porAnio[clave] = this.consolidadoVacio(); }
      const c = porAnio[clave];

      const tipo = this.claveTipoAccion(hallazgo.tipoAccion);
      c[this.campoTipoConsolidado(tipo)]++;

      const eficacia = this.claveEficacia(hallazgo);
      if (eficacia) { c[eficacia]++; }

      if (this.claveQuienDetecta(hallazgo.quienDetecta) === 'mandante') {
        if (tipo === 'rp') { c['rpMandante']++; } else { c['desvMandante']++; }
      }
    });

    this.consolidadoAnios = Object.keys(porAnio).map(a => Number(a)).sort((a, b) => a - b);

    const fila = (def: { key: string; label: string; clase: string }): FilaConsolidado => {
      const valores = this.consolidadoAnios.map(a => porAnio[String(a)][def.key] || 0);
      return { key: def.key, label: def.label, clase: def.clase, valores: valores, total: this.sumar(valores) };
    };

    // 1. NC y mejoras operacionales
    this.consolidadoTipos = CONSOLIDADO_TIPOS.map(d => fila(d));
    this.consolidadoTiposTotales = this.sumarColumnas(this.consolidadoTipos);
    this.consolidadoTiposGranTotal = this.sumar(this.consolidadoTiposTotales);

    // 2. Eficacia de las mejoras
    this.consolidadoEficacia = CONSOLIDADO_EFICACIA.map(d => fila(d));
    this.consolidadoEficaciaTotales = this.sumarColumnas(this.consolidadoEficacia);
    this.consolidadoEficaciaGranTotal = this.sumar(this.consolidadoEficaciaTotales);

    // 3. Mejoras operacionales
    const efectivas = this.consolidadoAnios.map(a =>
      (porAnio[String(a)]['efectivo'] || 0) + (porAnio[String(a)]['muy'] || 0)
    );
    const totalEfectivas = this.sumar(efectivas);
    this.consolidadoMejoras = [
      { key: 'hallazgos', label: 'Total hallazgos', clase: 'cg-hallazgos',
        valores: this.consolidadoTiposTotales, total: this.consolidadoTiposGranTotal },
      { key: 'realizadas', label: 'Total mejoras realizadas', clase: 'cg-realizadas',
        valores: this.consolidadoEficaciaTotales, total: this.consolidadoEficaciaGranTotal },
      { key: 'efectivas', label: 'Total mejoras efectivas', clase: 'cg-efectivas',
        valores: efectivas, total: totalEfectivas }
    ];
    this.consolidadoPctMejoras = efectivas.map((e, i) => this.pctDecimal(e, this.consolidadoEficaciaTotales[i]));
    this.consolidadoPctMejorasTotal = this.pctDecimal(totalEfectivas, this.consolidadoEficaciaGranTotal);

    // 4. Interacción con clientes (mandante)
    this.consolidadoMandante = CONSOLIDADO_MANDANTE.map(d => fila(d));
    const desv = this.consolidadoMandante[0];
    const rp = this.consolidadoMandante[1];
    this.consolidadoPctMandante = rp.valores.map((v, i) => this.pctDecimal(v, v + desv.valores[i]));
    this.consolidadoPctMandanteTotal = this.pctDecimal(rp.total, rp.total + desv.total);

    this.calcularGraficosConsolidado();
  }

  /** Arma la geometría de los gráficos del consolidado (se calcula una vez, no en cada ciclo). */
  private calcularGraficosConsolidado() {
    const anios = this.consolidadoAnios;
    const alto = (valor: number, maximo: number) => !maximo || !valor ? 0 : Math.max(3, valor * 100 / maximo);

    // 1. Columnas apiladas por año y tipo
    const maxAnual = this.consolidadoTiposTotales.reduce((m, v) => Math.max(m, v), 0);
    this.cgColumnasTipos = anios.map((anio, i) => ({
      anio: anio,
      total: this.consolidadoTiposTotales[i] || 0,
      vivo: this.esAnioVivo(anio),
      alto: alto(this.consolidadoTiposTotales[i] || 0, maxAnual),
      segmentos: this.consolidadoTipos
        .filter(f => f.valores[i] > 0)
        .map(f => ({ label: CG_ESTILO_TIPO[f.key].corto, color: CG_ESTILO_TIPO[f.key].color, valor: f.valores[i] }))
    }));
    this.cgLeyendaTipos = this.consolidadoTipos.map(f => ({
      label: CG_ESTILO_TIPO[f.key].corto, color: CG_ESTILO_TIPO[f.key].color, total: f.total
    }));

    // 2. Dona con la distribución histórica por tipo
    const granTotal = this.consolidadoTiposGranTotal;
    const C = this.cgCircunferencia;
    let acumulado = 0;
    this.cgDonut = this.consolidadoTipos
      .filter(f => f.total > 0)
      .slice()
      .sort((a, b) => b.total - a.total)
      .map(f => {
        const largo = granTotal ? f.total * C / granTotal : 0;
        const visible = largo > 2 ? largo - 1.2 : largo; // pequeño espacio entre segmentos
        const seg: CgSegmentoDonut = {
          label: CG_ESTILO_TIPO[f.key].corto,
          color: CG_ESTILO_TIPO[f.key].color,
          valor: f.total,
          pct: granTotal ? Math.round(f.total * 1000 / granTotal) / 10 : 0,
          dash: visible.toFixed(2) + ' ' + (C - visible).toFixed(2),
          offset: -acumulado
        };
        acumulado += largo;
        return seg;
      });

    // 3. Eficacia: mejoras realizadas vs efectivas + línea de % efectividad
    const efectivas = this.consolidadoMejoras.length ? this.consolidadoMejoras[2].valores : [];
    const maxEficacia = this.consolidadoEficaciaTotales.reduce((m, v) => Math.max(m, v), 0);
    this.cgColumnasEficacia = anios.map((anio, i) => ({
      anio: anio,
      vivo: this.esAnioVivo(anio),
      realizadas: this.consolidadoEficaciaTotales[i] || 0,
      efectivas: efectivas[i] || 0,
      altoRealizadas: alto(this.consolidadoEficaciaTotales[i] || 0, maxEficacia),
      altoEfectivas: alto(efectivas[i] || 0, maxEficacia),
      pct: this.consolidadoPctMejoras[i]
    }));
    this.cgPuntosEficacia = this.cgColumnasEficacia
      .map((c, i) => c.pct === null ? '' : ((i + 0.5) * 10) + ',' + (100 - c.pct))
      .filter(p => !!p)
      .join(' ');

    // 4. Mandante: desviaciones vs refuerzos positivos
    const desv = this.consolidadoMandante[0];
    const rp = this.consolidadoMandante[1];
    const maxMandante = desv.valores.concat(rp.valores).reduce((m, v) => Math.max(m, v), 0);
    this.cgColumnasMandante = anios.map((anio, i) => ({
      anio: anio,
      vivo: this.esAnioVivo(anio),
      desv: desv.valores[i] || 0,
      rp: rp.valores[i] || 0,
      altoDesv: alto(desv.valores[i] || 0, maxMandante),
      altoRp: alto(rp.valores[i] || 0, maxMandante)
    }));

    // KPIs del consolidado
    let iPico = 0;
    this.consolidadoTiposTotales.forEach((v, i) => { if (v > this.consolidadoTiposTotales[iPico]) { iPico = i; } });
    const anioActual = new Date().getFullYear();
    const iActual = anios.indexOf(anioActual);
    const totalActual = iActual !== -1 ? this.consolidadoTiposTotales[iActual] : 0;
    const totalAnterior = iActual > 0 ? this.consolidadoTiposTotales[iActual - 1] : null;
    const variacion = totalAnterior === null ? null : totalActual - totalAnterior;
    const totalEfectivas = this.consolidadoMejoras.length ? this.consolidadoMejoras[2].total : 0;

    this.cgKpis = [
      { key: 'historico', icono: 'fa-database', clase: 'cg-kpi-azul', label: 'Hallazgos históricos',
        valor: String(granTotal), detalle: anios.length ? 'Desde ' + anios[0] + ' (' + anios.length + ' años)' : '' },
      { key: 'pico', icono: 'fa-line-chart', clase: 'cg-kpi-naranjo', label: 'Año con más hallazgos',
        valor: anios.length ? String(anios[iPico]) : '—', detalle: anios.length ? this.consolidadoTiposTotales[iPico] + ' hallazgos' : '' },
      { key: 'eficacia', icono: 'fa-check-circle', clase: 'cg-kpi-verde', label: 'Efectividad de las mejoras',
        valor: this.formatoPct(this.consolidadoPctMejorasTotal),
        detalle: totalEfectivas + ' de ' + this.consolidadoEficaciaGranTotal + ' mejoras efectivas' },
      { key: 'actual', icono: 'fa-bolt', clase: 'cg-kpi-vivo', label: 'Hallazgos ' + anioActual + ' (en vivo)',
        valor: String(totalActual),
        detalle: variacion === null ? 'Desde el sistema' : (variacion > 0 ? '+' : '') + variacion + ' vs ' + (anioActual - 1) }
    ];
  }

  private consolidadoVacio(): { [campo: string]: number } {
    const vacio: { [campo: string]: number } = {};
    CAMPOS_CONSOLIDADO.forEach(c => vacio[c] = 0);
    return vacio;
  }

  /** Tipos del sistema → filas del Excel histórico. */
  private campoTipoConsolidado(tipo: string): string {
    switch (tipo) {
      case 'fr': return 'fr';
      case 'rp': return 'rp';
      case 'om': return 'obs';
      case 'sw': return 'sw';
      case 'nc': return 'nc';
      default: return 'otros';
    }
  }

  /** Lee la medición de eficacia de la mejora (acepta varios nombres de campo y textos). */
  private claveEficacia(hallazgo: HallazgoItem): string {
    const h: any = hallazgo || {};
    const valor = h.eficacia || h.efectividad || h.eficaciaMejora || h.efectividadMejora ||
      h.medicionEficacia || h.evaluacionEficacia || '';
    const e = this.normalizar(valor);
    if (!e) { return ''; }
    if (e.indexOf('muy') !== -1) { return 'muy'; }
    if (e.indexOf('baja') !== -1 || e.indexOf('no efectiv') !== -1 || e.indexOf('ineficaz') !== -1) { return 'baja'; }
    if (e.indexOf('media') !== -1 || e.indexOf('parcial') !== -1) { return 'media'; }
    if (e.indexOf('efectiv') !== -1 || e.indexOf('eficaz') !== -1 || e.indexOf('alta') !== -1) { return 'efectivo'; }
    return '';
  }

  private sumar(valores: number[]): number {
    return valores.reduce((t, v) => t + (v || 0), 0);
  }

  private sumarColumnas(filas: FilaConsolidado[]): number[] {
    return this.consolidadoAnios.map((a, i) => filas.reduce((t, f) => t + (f.valores[i] || 0), 0));
  }

  private pctDecimal(valor: number, total: number): number | null {
    return total ? Math.round(valor * 1000 / total) / 10 : null;
  }

  esAnioVivo(anio: number): boolean {
    return anio > CONSOLIDADO_ULTIMO_ANIO_HISTORICO;
  }

  formatoPct(valor: number | null): string {
    return valor === null || valor === undefined ? '—' : valor.toFixed(1).replace('.', ',') + '%';
  }

  clasePct(valor: number | null): string {
    if (valor === null || valor === undefined) { return 'num-cero'; }
    if (valor < 40) { return 'cg-pct-bajo'; }
    if (valor < 80) { return 'cg-pct-medio'; }
    return 'cg-pct-alto';
  }

  filtrarReportes() {
    const busqueda = this.normalizar(this.busqueda);

    const filtrados = this.todosLosReportes.filter(reporte => {
      if (this.soloConHallazgos && reporte.total === 0) { return false; }
      if (!busqueda) { return true; }
      return this.normalizar(reporte.nombreProyecto).indexOf(busqueda) !== -1 ||
        this.normalizar(reporte.nombreSubProyecto).indexOf(busqueda) !== -1;
    });

    this.reportesSubProyectos = this.ordenarReportes(filtrados);
    this.reportesObraFiltrados = this.reportesObra.filter(obra =>
      !busqueda || this.normalizar(obra.nombre).indexOf(busqueda) !== -1
    );

    // Gráfico: los subproyectos con más hallazgos (siempre por total, sin importar el orden de la tabla)
    this.topSubProyectos = filtrados
      .filter(r => r.total > 0)
      .slice()
      .sort((a, b) => b.total - a.total || a.nombreSubProyecto.localeCompare(b.nombreSubProyecto))
      .slice(0, this.maxBarrasSubProyecto);
    this.maximoSubProyecto = this.topSubProyectos.reduce((maximo, item) => Math.max(maximo, item.total), 0);
  }

  toggleSoloConHallazgos() {
    this.soloConHallazgos = !this.soloConHallazgos;
    this.filtrarReportes();
  }

  limpiarBusqueda() {
    this.busqueda = '';
    this.filtrarReportes();
  }

  ordenarPor(campo: CampoOrden) {
    if (this.ordenCampo === campo) {
      this.ordenAsc = !this.ordenAsc;
    } else {
      this.ordenCampo = campo;
      // Texto de A a Z; números de mayor a menor
      this.ordenAsc = campo === 'nombre' || campo === 'estado';
    }
    this.reportesSubProyectos = this.ordenarReportes(this.reportesSubProyectos);
  }

  iconoOrden(campo: CampoOrden): string {
    if (this.ordenCampo !== campo) { return 'fa-sort'; }
    return this.ordenAsc ? 'fa-sort-asc' : 'fa-sort-desc';
  }

  private ordenarReportes(lista: ReporteSubProyecto[]): ReporteSubProyecto[] {
    const campo = this.ordenCampo;
    const dir = this.ordenAsc ? 1 : -1;
    return lista.slice().sort((a, b) => {
      let comp = 0;
      if (campo === 'nombre') {
        comp = a.nombreSubProyecto.localeCompare(b.nombreSubProyecto);
      } else if (campo === 'estado') {
        comp = a.estado.localeCompare(b.estado);
      } else {
        if (campo.indexOf('t_') === 0) {
          const k = campo.substring(2);
          comp = (a.tipos[k] || 0) - (b.tipos[k] || 0);
        } else {
          comp = (a[campo] as number) - (b[campo] as number);
        }
      }
      if (comp === 0) {
        comp = (b.total - a.total) * dir || a.nombreSubProyecto.localeCompare(b.nombreSubProyecto) * dir;
      }
      return comp * dir;
    });
  }

  alturaAnual(total: number): number {
    return this.maximoAnual ? Math.max(6, total * 100 / this.maximoAnual) : 0;
  }

  anchoSubProyecto(valor: number): number {
    return this.maximoSubProyecto ? valor * 100 / this.maximoSubProyecto : 0;
  }

  pctDelAnio(valor: number): number {
    const total = this.hallazgosDelAnio.length;
    return total ? Math.round(valor * 100 / total) : 0;
  }

  seleccionarAnio(anio: number) {
    this.anioSeleccionado = anio;
    this.actualizarResumenAnual();
  }

  claseEstadoHallazgo(estado: string): string {
    switch ((estado || '').toUpperCase()) {
      case 'CERRADA': return 'eh-cerrada';
      case 'EN DESARROLLO': return 'eh-desarrollo';
      case 'PENDIENTE': return 'eh-pendiente';
      case 'ENVIADA': return 'eh-enviada';
      default: return 'eh-otro';
    }
  }

  // ==========================================================
  // Exportar a Excel tipo reporte (con logo de Trazas)
  // ==========================================================

  async exportarExcel() {
    if (this.exportando) { return; }
    this.exportando = true;

    try {
      const ExcelJS = await this.cargarExcelJS();
      const logo = await this.cargarLogoBase64();

      const wb = new ExcelJS.Workbook();
      wb.creator = 'Trazas NBI';
      wb.created = new Date();
      const logoId = logo ? wb.addImage({ base64: logo.base64, extension: logo.extension }) : null;
      // El logo se escala a 56 px de alto respetando su proporción
      this.logoExcelAncho = logo ? Math.round(56 * logo.ancho / logo.alto) : 150;

      this.xlHojaResumen(wb, logoId);
      this.xlHojaSubProyectos(wb, logoId);
      this.xlHojaObras(wb, logoId);
      this.xlHojaConsolidado(wb, logoId);

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      this.descargarBlob(blob, 'Reporte_Hallazgos_' + this.anioSeleccionado + '.xlsx');
    } catch (error) {
      console.error('No se pudo generar el Excel, se exporta en CSV:', error);
      this.toast('No se pudo generar el Excel. Se descargó en formato CSV.', 'warning');
      this.exportarCsv();
    } finally {
      this.exportando = false;
    }
  }

  private cargarExcelJS(): Promise<any> {
    const w: any = window;
    if (w.ExcelJS) { return Promise.resolve(w.ExcelJS); }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = EXCELJS_CDN;
      script.async = true;
      script.onload = () => w.ExcelJS ? resolve(w.ExcelJS) : reject(new Error('ExcelJS no quedó disponible'));
      script.onerror = () => reject(new Error('No se pudo cargar ExcelJS'));
      document.head.appendChild(script);
    });
  }

  /** Lee el logo como base64. Si no existe, el reporte sale igual con el nombre "TRAZAS NBI". */
  private logoExcelAncho: number = 150;

  private cargarLogoBase64(): Promise<{ base64: string; extension: string; ancho: number; alto: number } | null> {
    return new Promise(resolve => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', LOGO_TRAZAS_URL, true);
        xhr.responseType = 'blob';
        xhr.onload = () => {
          if (xhr.status < 200 || xhr.status >= 300 || !xhr.response) { resolve(null); return; }
          const tipo = String(xhr.response.type || '');
          if (tipo.indexOf('image/') !== 0) { resolve(null); return; }
          const lector = new FileReader();
          lector.onloadend = () => {
            const dataUrl = String(lector.result || '');
            const extension = tipo.indexOf('jpeg') !== -1 || tipo.indexOf('jpg') !== -1 ? 'jpeg' : (tipo.indexOf('gif') !== -1 ? 'gif' : 'png');
            if (!dataUrl) { resolve(null); return; }
            // Medir el logo para no deformarlo
            const img = new Image();
            img.onload = () => resolve({
              base64: dataUrl,
              extension: extension,
              ancho: img.naturalWidth || 300,
              alto: img.naturalHeight || 112
            });
            img.onerror = () => resolve(null);
            img.src = dataUrl;
          };
          lector.onerror = () => resolve(null);
          lector.readAsDataURL(xhr.response);
        };
        xhr.onerror = () => resolve(null);
        xhr.send();
      } catch (e) {
        resolve(null);
      }
    });
  }

  // ---------- Hojas ----------

  private xlHojaResumen(wb: any, logoId: number | null) {
    const ws = this.xlCrearHoja(wb, 'Resumen', 7, logoId, 'Reporte de Hallazgos ' + this.anioSeleccionado,
      'Resumen anual y relación con el mandante');
    [32, 14, 14, 14, 14, 14, 14].forEach((w, i) => ws.getColumn(i + 1).width = w);
    let fila = 7;

    // Indicadores
    fila = this.xlTituloSeccion(ws, fila, 'Indicadores del año', 7);
    const variacion = this.variacionAnual === null ? '—' : (this.variacionAnual > 0 ? '+' : '') + this.variacionAnual + ' vs ' + (this.anioSeleccionado - 1);
    fila = this.xlTabla(ws, fila, [
      { header: 'Indicador' },
      { header: 'Valor', numero: true },
      { header: 'Detalle' }
    ], [
      ['Hallazgos del año', this.hallazgosDelAnio.length, variacion],
      ['En seguimiento', this.totalAbiertos, this.pctDelAnio(this.totalAbiertos) + '% del año'],
      ['Cerrados', this.totalCerrados, 'Tasa de cierre ' + this.tasaCierre + '%'],
      ['Prioridad alta', this.totalPrioridadAlta, this.pctDelAnio(this.totalPrioridadAlta) + '% del año'],
      ['Prioridad media', this.totalPrioridadMedia, this.pctDelAnio(this.totalPrioridadMedia) + '% del año'],
      ['Prioridad baja', this.totalPrioridadBaja, this.pctDelAnio(this.totalPrioridadBaja) + '% del año'],
      ['Subproyectos con hallazgos', this.subProyectosConHallazgos, 'de ' + this.totalSubProyectos]
    ], { mergeUltimaHasta: 7 });
    fila += 1;

    // Relación con el mandante
    fila = this.xlTituloSeccion(ws, fila, 'Relación con el mandante', 7);
    const varMandante = this.mandanteVariacion === null ? '—' : (this.mandanteVariacion > 0 ? '+' : '') + this.mandanteVariacion + ' vs ' + (this.anioSeleccionado - 1);
    fila = this.xlTabla(ws, fila, [
      { header: 'Indicador' },
      { header: 'Valor', numero: true },
      { header: 'Detalle' }
    ], [
      ['Generados desde el mandante', this.totalMandante, this.pctMandante + '% del año'],
      ['Mandante: en seguimiento', this.mandanteAbiertos, ''],
      ['Mandante: cerrados', this.mandanteCerrados, ''],
      ['Variación mandante', null, varMandante]
    ], { mergeUltimaHasta: 7, resaltarPrimeraFila: true });
    fila += 1;

    // Matriz tipo de acción × quién detecta
    fila = this.xlTituloSeccion(ws, fila, 'Tipo de acción según quién detecta', 7);
    const cols: any[] = [{ header: 'Tipo de acción' }]
      .concat(this.detectaResumen.map(d => ({ header: d.label, numero: true, mandante: d.key === 'mandante' })) as any)
      .concat([{ header: 'Total', numero: true, total: true }] as any);
    const filasMatriz = this.tiposResumen.map(t =>
      [t.sigla + ' · ' + t.label as any]
        .concat(this.detectaResumen.map(d => t.porDetecta[d.key] || 0))
        .concat([t.total])
    );
    const filaTotal = ['Total' as any]
      .concat(this.detectaResumen.map(d => d.total))
      .concat([this.hallazgosDelAnio.length]);
    fila = this.xlTabla(ws, fila, cols, filasMatriz, { filaTotal: filaTotal });
    fila += 1;

    // Hallazgos por año
    fila = this.xlTituloSeccion(ws, fila, 'Hallazgos por año', 7);
    this.xlTabla(ws, fila, [
      { header: 'Año' },
      { header: 'Hallazgos', numero: true }
    ], this.conteosAnuales.map(c => [String(c.anio) + (c.anio === this.anioSeleccionado ? '  (año del reporte)' : ''), c.total]), {});
  }

  private xlHojaSubProyectos(wb: any, logoId: number | null) {
    const columnas = [
      { header: 'Proyecto', ancho: 30 },
      { header: 'Subproyecto', ancho: 34 },
      { header: 'Estado', ancho: 18 },
      { header: 'Total', ancho: 9, numero: true, total: true },
      { header: 'En seguimiento', ancho: 13, numero: true },
      { header: 'Cerrados', ancho: 10, numero: true },
      { header: '% Cierre', ancho: 10, porcentaje: true },
      { header: 'Prioridad alta', ancho: 12, numero: true, alerta: true },
      { header: 'Mandante', ancho: 11, numero: true, mandante: true }
    ].concat(this.xlColumnasTipo());
    const ws = this.xlCrearHoja(wb, 'Por subproyecto', columnas.length, logoId,
      'Detalle por subproyecto · ' + this.anioSeleccionado,
      this.reportesSubProyectos.length + ' subproyectos' + (this.busqueda ? ' · filtro: "' + this.busqueda + '"' : ''));
    columnas.forEach((c, i) => ws.getColumn(i + 1).width = c.ancho);

    const filas = this.reportesSubProyectos.map(r => [
      r.nombreProyecto, r.nombreSubProyecto, r.estado,
      r.total, r.abiertos, r.cerrados, r.total ? r.pctCierre / 100 : null,
      r.prioridadAlta, r.mandante
    ].concat(this.columnasTipoDetalle.map(t => r.tipos[t.key] || 0)));
    const suma = (k: string) => this.reportesSubProyectos.reduce((t, r) => t + (r[k] || 0), 0);
    const sumaTipo = (k: string) => this.reportesSubProyectos.reduce((t, r) => t + (r.tipos[k] || 0), 0);
    const totalSub = suma('total');
    const filaTotal = ['Total', '', '', totalSub, suma('abiertos'), suma('cerrados'),
      totalSub ? suma('cerrados') / totalSub : null, suma('prioridadAlta'), suma('mandante')]
      .concat(this.columnasTipoDetalle.map(t => sumaTipo(t.key)));

    const inicio = 7;
    this.xlTabla(ws, inicio, columnas, filas, { filaTotal: filaTotal, autoFiltro: true });
    ws.views = [{ state: 'frozen', ySplit: inicio, xSplit: 2 }];
  }

  private xlHojaObras(wb: any, logoId: number | null) {
    const columnas = [
      { header: 'Obra', ancho: 40 },
      { header: 'Total', ancho: 9, numero: true, total: true },
      { header: 'En seguimiento', ancho: 13, numero: true },
      { header: 'Mandante', ancho: 11, numero: true, mandante: true }
    ].concat(this.xlColumnasTipo())
      .concat([{ header: 'Hallazgos Positivos (origen)', ancho: 16, numero: true, positivo: true } as any]);
    const ws = this.xlCrearHoja(wb, 'Por obra', columnas.length, logoId,
      'Detalle por obra · ' + this.anioSeleccionado,
      this.reportesObraFiltrados.length + ' obras' + (this.busqueda ? ' · filtro: "' + this.busqueda + '"' : ''));
    columnas.forEach((c, i) => ws.getColumn(i + 1).width = c.ancho);

    const filas = this.reportesObraFiltrados.map(o => [
      o.nombre as any, o.total, o.abiertos, o.detectadosMandante
    ].concat(this.columnasTipoDetalle.map(t => o.tipos[t.key] || 0)).concat([o.hallazgosPositivos]));
    const suma = (k: string) => this.reportesObraFiltrados.reduce((t, o) => t + (o[k] || 0), 0);
    const sumaTipo = (k: string) => this.reportesObraFiltrados.reduce((t, o) => t + (o.tipos[k] || 0), 0);
    const filaTotal = ['Total' as any, suma('total'), suma('abiertos'), suma('detectadosMandante')]
      .concat(this.columnasTipoDetalle.map(t => sumaTipo(t.key)))
      .concat([suma('hallazgosPositivos')]);

    const inicio = 7;
    this.xlTabla(ws, inicio, columnas, filas, { filaTotal: filaTotal, autoFiltro: true });
    ws.views = [{ state: 'frozen', ySplit: inicio, xSplit: 1 }];
  }

  private xlHojaConsolidado(wb: any, logoId: number | null) {
    const anios = this.consolidadoAnios;
    const n = anios.length + 2;
    const vivos = anios.filter(a => this.esAnioVivo(a));
    const ws = this.xlCrearHoja(wb, 'Consolidado general', n, logoId, 'Consolidado general de hallazgos',
      'Histórico ' + (anios[0] || '') + '–' + this.ultimoAnioHistorico +
      (vivos.length ? ' · ' + vivos.join(', ') + ' calculado desde el sistema (*)' : ''));
    ws.getColumn(1).width = 42;
    for (let c = 2; c <= n; c++) { ws.getColumn(c).width = c === n ? 11 : 9; }

    const columnas = (titulo: string): any[] => [{ header: titulo } as any]
      .concat(anios.map(a => ({ header: String(a) + (this.esAnioVivo(a) ? ' *' : ''), numero: true })))
      .concat([{ header: 'Totales', numero: true, total: true }]);
    const filas = (lista: FilaConsolidado[]): any[][] =>
      lista.map(f => [f.label as any].concat(f.valores).concat([f.total]));
    const filaPct = (label: string, pcts: Array<number | null>, total: number | null): any[] =>
      [label as any].concat(pcts.map(p => this.formatoPct(p))).concat([this.formatoPct(total)]);

    let fila = 7;
    fila = this.xlTituloSeccion(ws, fila, 'Cuadros de análisis - NC y mejoras operacionales', n);
    fila = this.xlTabla(ws, fila, columnas('Tipo de acción'), filas(this.consolidadoTipos), {
      filaTotal: ['Total' as any].concat(this.consolidadoTiposTotales).concat([this.consolidadoTiposGranTotal])
    });
    fila += 1;

    fila = this.xlTituloSeccion(ws, fila, 'Medición de la eficacia de las mejoras', n);
    fila = this.xlTabla(ws, fila, columnas('Eficacia'), filas(this.consolidadoEficacia), {
      filaTotal: ['Total' as any].concat(this.consolidadoEficaciaTotales).concat([this.consolidadoEficaciaGranTotal])
    });
    fila += 1;

    fila = this.xlTituloSeccion(ws, fila, 'Mejoras operacionales', n);
    fila = this.xlTabla(ws, fila, columnas('Indicador'),
      filas(this.consolidadoMejoras).concat([
        filaPct('% efectividad del hallazgo', this.consolidadoPctMejoras, this.consolidadoPctMejorasTotal)
      ]), {});
    fila += 1;

    fila = this.xlTituloSeccion(ws, fila, 'Interacción con clientes (mandante)', n);
    fila = this.xlTabla(ws, fila, columnas('Indicador'),
      filas(this.consolidadoMandante).concat([
        filaPct('% interacción positiva (R. positivo / total mandante)', this.consolidadoPctMandante, this.consolidadoPctMandanteTotal)
      ]), {});
    fila += 1;

    const nota = ws.getCell('A' + fila);
    nota.value = 'Años ' + (anios[0] || '') + '–' + this.ultimoAnioHistorico + ': registro histórico REG-10-B-24. ' +
      '(*) Años calculados con los hallazgos registrados en el sistema.';
    nota.font = { name: 'Calibri', size: 9, italic: true, color: { argb: XL.grisClaro } };
  }

  // ---------- Helpers de formato ----------

  /** Crea la hoja con la cabecera tipo reporte: logo, título, subtítulo y franja de color. */
  private xlCrearHoja(wb: any, nombre: string, columnas: number, logoId: number | null, titulo: string, subtitulo: string): any {
    const ws = wb.addWorksheet(nombre, {
      properties: { defaultRowHeight: 18 },
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
        margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.3 } },
      headerFooter: { oddFooter: '&L&8Trazas NBI · Reporte de hallazgos&R&8Página &P de &N' },
      views: [{ showGridLines: false }]
    });

    const ultima = this.xlColumna(Math.max(columnas, 4));
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const generado = 'Generado el ' + this.fechaHoy() + (usuario && usuario.nombreUsuario ? ' por ' + usuario.nombreUsuario : '');

    ws.getRow(1).height = 22;
    ws.getRow(2).height = 26;
    ws.getRow(3).height = 18;
    ws.getRow(4).height = 18;
    ws.getRow(5).height = 6;

    // Logo (o texto si no hay logo)
    if (logoId !== null && logoId !== undefined) {
      ws.addImage(logoId, { tl: { col: 0.15, row: 0.4 }, ext: { width: Math.min(this.logoExcelAncho, 220), height: 56 }, editAs: 'oneCell' });
    } else {
      ws.mergeCells('A2:A3');
      const marca = ws.getCell('A2');
      marca.value = 'TRAZAS NBI';
      marca.font = { name: 'Calibri', size: 16, bold: true, color: { argb: XL.azul } };
      marca.alignment = { vertical: 'middle', horizontal: 'left' };
    }

    ws.mergeCells('C2:' + ultima + '2');
    const t = ws.getCell('C2');
    t.value = titulo;
    t.font = { name: 'Calibri', size: 18, bold: true, color: { argb: XL.texto } };
    t.alignment = { vertical: 'middle', horizontal: 'right' };

    ws.mergeCells('C3:' + ultima + '3');
    const st = ws.getCell('C3');
    st.value = subtitulo;
    st.font = { name: 'Calibri', size: 11, color: { argb: XL.gris } };
    st.alignment = { vertical: 'middle', horizontal: 'right' };

    ws.mergeCells('C4:' + ultima + '4');
    const g = ws.getCell('C4');
    g.value = generado;
    g.font = { name: 'Calibri', size: 9, italic: true, color: { argb: XL.grisClaro } };
    g.alignment = { vertical: 'middle', horizontal: 'right' };

    // Franja azul bajo la cabecera
    for (let c = 1; c <= Math.max(columnas, 4); c++) {
      ws.getRow(5).getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.azul } };
    }
    return ws;
  }

  private xlTituloSeccion(ws: any, fila: number, texto: string, columnas: number): number {
    ws.mergeCells('A' + fila + ':' + this.xlColumna(columnas) + fila);
    const c = ws.getCell('A' + fila);
    c.value = texto.toUpperCase();
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: XL.azul } };
    c.alignment = { vertical: 'middle' };
    c.border = { bottom: { style: 'medium', color: { argb: XL.azulMedio } } };
    ws.getRow(fila).height = 22;
    return fila + 2;
  }

  /**
   * Escribe una tabla con encabezado azul, filas cebra, bordes y fila de totales.
   * Devuelve la siguiente fila libre.
   */
  private xlTabla(ws: any, filaInicio: number, columnas: any[], filas: any[][], opciones: any): number {
    const borde = { style: 'thin', color: { argb: XL.borde } };
    const bordes = { top: borde, left: borde, bottom: borde, right: borde };
    const n = columnas.length;

    // Encabezado
    const head = ws.getRow(filaInicio);
    head.height = 30;
    columnas.forEach((col, i) => {
      const cell = head.getCell(i + 1);
      cell.value = col.header;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: XL.blanco } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.mandante ? XL.azulMedio : XL.azul } };
      cell.alignment = { vertical: 'middle', horizontal: col.numero || col.porcentaje ? 'center' : 'left', wrapText: true };
      cell.border = bordes;
    });
    if (opciones.mergeUltimaHasta && opciones.mergeUltimaHasta > n) {
      ws.mergeCells(this.xlColumna(n) + filaInicio + ':' + this.xlColumna(opciones.mergeUltimaHasta) + filaInicio);
    }

    let fila = filaInicio + 1;

    if (!filas.length) {
      ws.mergeCells('A' + fila + ':' + this.xlColumna(Math.max(n, opciones.mergeUltimaHasta || n)) + fila);
      const vacio = ws.getCell('A' + fila);
      vacio.value = 'Sin datos para ' + this.anioSeleccionado;
      vacio.font = { italic: true, color: { argb: XL.grisClaro } };
      vacio.alignment = { horizontal: 'center' };
      return fila + 1;
    }

    filas.forEach((valores, idx) => {
      const row = ws.getRow(fila);
      row.height = 18;
      const cebra = idx % 2 === 1;
      valores.forEach((valor, i) => {
        const col = columnas[i] || {};
        const cell = row.getCell(i + 1);
        cell.value = valor === undefined ? null : valor;
        cell.font = { name: 'Calibri', size: 10, color: { argb: XL.texto } };
        cell.border = bordes;
        cell.alignment = { vertical: 'middle', horizontal: col.numero || col.porcentaje ? 'center' : 'left', wrapText: !col.numero };

        let fondo = cebra ? XL.azulMuySuave : XL.blanco;
        if (col.mandante) { fondo = XL.azulSuave; }
        if (opciones.resaltarPrimeraFila && idx === 0) { fondo = XL.azulSuave; cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: XL.azul } }; }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondo } };

        if (col.porcentaje && typeof valor === 'number') {
          cell.numFmt = '0%';
          const color = valor < 0.4 ? XL.rojo : (valor < 0.8 ? XL.naranjo : XL.verde);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: color } };
        } else if (typeof valor === 'number' && valor > 0) {
          if (col.alerta) { cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: XL.rojo } }; }
          if (col.positivo) { cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: XL.verde } }; }
          if (col.mandante) { cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: XL.azul } }; }
          if (col.total) { cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: XL.texto } }; }
        } else if (valor === 0) {
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FFB9C4CC' } };
        }
      });
      if (opciones.mergeUltimaHasta && opciones.mergeUltimaHasta > n) {
        ws.mergeCells(this.xlColumna(n) + fila + ':' + this.xlColumna(opciones.mergeUltimaHasta) + fila);
      }
      fila++;
    });

    if (opciones.autoFiltro) {
      ws.autoFilter = { from: { row: filaInicio, column: 1 }, to: { row: fila - 1, column: n } };
    }

    if (opciones.filaTotal) {
      const row = ws.getRow(fila);
      row.height = 20;
      opciones.filaTotal.forEach((valor: any, i: number) => {
        const col = columnas[i] || {};
        const cell = row.getCell(i + 1);
        cell.value = valor;
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: XL.azul } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.azulSuave } };
        cell.border = { top: { style: 'medium', color: { argb: XL.azulMedio } }, left: borde, bottom: borde, right: borde };
        cell.alignment = { vertical: 'middle', horizontal: col.numero || col.porcentaje ? 'center' : 'left' };
        if (col.porcentaje && typeof valor === 'number') { cell.numFmt = '0%'; }
      });
      fila++;
    }

    return fila;
  }

  private xlColumna(n: number): string {
    let s = '';
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  private fechaHoy(): string {
    const d = new Date();
    const p = (x: number) => (x < 10 ? '0' : '') + x;
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  private descargarBlob(blob: Blob, nombre: string) {
    const nav: any = window.navigator;
    if (nav && nav.msSaveOrOpenBlob) {
      nav.msSaveOrOpenBlob(blob, nombre);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private toast(titulo: string, icon: string) {
    try {
      Swal.fire({ title: titulo, icon: icon, timer: 3000, showConfirmButton: false, toast: true, position: 'top-end' });
    } catch (e) { }
  }

  // Respaldo: exporta a CSV si ExcelJS no se pudo cargar
  private exportarCsv() {
    const sep = ';';
    const limpiar = (v: any) => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';
    const filas: string[] = [
      ['Reporte de hallazgos ' + this.anioSeleccionado].map(limpiar).join(sep),
      '',
      ['Relación con el mandante'].map(limpiar).join(sep),
      ['Tipo de acción'].concat(QUIEN_DETECTA.map(q => q.label)).concat(['Total']).map(limpiar).join(sep)
    ];
    this.tiposResumen.forEach(t => {
      filas.push([t.label as any]
        .concat(QUIEN_DETECTA.map(q => t.porDetecta[q.key]))
        .concat([t.total])
        .map(limpiar).join(sep));
    });
    filas.push(['Total' as any]
      .concat(QUIEN_DETECTA.map(q => this.totalDetecta(q.key)))
      .concat([this.hallazgosDelAnio.length])
      .map(limpiar).join(sep));
    filas.push('');
    filas.push(['Proyecto', 'Subproyecto', 'Estado', 'Total', 'En seguimiento', 'Cerrados', '% cierre', 'Prioridad alta',
      'Detectados por mandante'].concat(this.columnasTipoDetalle.map(t => t.label)).map(limpiar).join(sep));
    this.reportesSubProyectos.forEach(r => {
      filas.push([
        r.nombreProyecto as any, r.nombreSubProyecto, r.estado,
        r.total, r.abiertos, r.cerrados, r.pctCierre + '%', r.prioridadAlta,
        r.mandante
      ].concat(this.columnasTipoDetalle.map(t => r.tipos[t.key] || 0)).map(limpiar).join(sep));
    });
    filas.push('');
    filas.push([
      'Obra',
      'Total',
      'En seguimiento',
      'Detectados por mandante'
    ].concat(this.columnasTipoDetalle.map(t => t.label)).concat(['Origen: Hallazgos Positivos']).map(limpiar).join(sep));
    this.reportesObraFiltrados.forEach(obra => {
      filas.push([
        obra.nombre,
        obra.total,
        obra.abiertos,
        obra.detectadosMandante
      ].concat(this.columnasTipoDetalle.map(t => obra.tipos[t.key] || 0))
        .concat([obra.hallazgosPositivos]).map(limpiar).join(sep));
    });

    // Consolidado general
    const cabeceraCg = (titulo: string) => [titulo].concat(this.consolidadoAnios.map(a => String(a))).concat(['Totales']).map(limpiar).join(sep);
    const filaCg = (f: FilaConsolidado) => [f.label as any].concat(f.valores).concat([f.total]).map(limpiar).join(sep);
    filas.push('');
    filas.push(['Consolidado general'].map(limpiar).join(sep));
    filas.push(cabeceraCg('Tipo de acción'));
    this.consolidadoTipos.forEach(f => filas.push(filaCg(f)));
    filas.push(['Total' as any].concat(this.consolidadoTiposTotales).concat([this.consolidadoTiposGranTotal]).map(limpiar).join(sep));
    filas.push('');
    filas.push(cabeceraCg('Eficacia'));
    this.consolidadoEficacia.forEach(f => filas.push(filaCg(f)));
    filas.push(['Total' as any].concat(this.consolidadoEficaciaTotales).concat([this.consolidadoEficaciaGranTotal]).map(limpiar).join(sep));
    filas.push('');
    filas.push(cabeceraCg('Mejoras operacionales'));
    this.consolidadoMejoras.forEach(f => filas.push(filaCg(f)));
    filas.push(['% efectividad del hallazgo' as any].concat(this.consolidadoPctMejoras.map(p => this.formatoPct(p)))
      .concat([this.formatoPct(this.consolidadoPctMejorasTotal)]).map(limpiar).join(sep));
    filas.push('');
    filas.push(cabeceraCg('Interacción con clientes'));
    this.consolidadoMandante.forEach(f => filas.push(filaCg(f)));
    filas.push(['% interacción positiva' as any].concat(this.consolidadoPctMandante.map(p => this.formatoPct(p)))
      .concat([this.formatoPct(this.consolidadoPctMandanteTotal)]).map(limpiar).join(sep));

    const contenido = '\ufeff' + filas.join('\r\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const nombre = 'reporte-hallazgos-' + this.anioSeleccionado + '.csv';
    const nav: any = window.navigator;

    if (nav && nav.msSaveOrOpenBlob) {
      nav.msSaveOrOpenBlob(blob, nombre);
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  trackByReporte(index: number, r: ReporteSubProyecto) { return r ? r.idSubProyecto : index; }
  // Ojo: Angular llama a los trackBy sin el contexto del componente (sin `this`)
  trackByObra(index: number, obra: ReporteObra) { return obra ? obra.nombre : index; }
  trackByAnio(index: number, c: ConteoAnual) { return c ? c.anio : index; }
  trackByNombre(index: number, c: ConteoCategoria) { return c ? c.nombre : index; }
  trackByIndex(index: number) { return index; }

  /**
   * Abre el listado del consolidado con el filtro de la tarjeta pinchada.
   * Va por queryParams (?anio=2026&tipoAccion=Stop Work&quienDetecta=Mandante) y además
   * queda en sessionStorage ('filtroConsolidadoHallazgos') por si el consolidado lo lee de ahí.
   */
  irAConsolidado(filtros: { tipoAccion?: string; quienDetecta?: string }, evento?: any) {
    if (evento) { evento.stopPropagation(); }
    const params: { [k: string]: any } = { anio: this.anioSeleccionado };
    if (filtros.tipoAccion) { params['tipoAccion'] = filtros.tipoAccion; }
    if (filtros.quienDetecta) { params['quienDetecta'] = filtros.quienDetecta; }
    try { sessionStorage.setItem('filtroConsolidadoHallazgos', JSON.stringify(params)); } catch (e) { }
    this._router.navigate(['/Proyectos-ConsolidadoHallazgos'], { queryParams: params });
  }

  totalDetecta(key: string): number {
    const d = this.detectaResumen.filter(x => x.key === key)[0];
    return d ? d.total : 0;
  }

  pctDe(valor: number, total: number): number {
    return total ? Math.round(valor * 100 / total) : 0;
  }

  trackByKey(index: number, item: any) { return item ? item.key : index; }

  private tiposAccionVacios(): { [tipo: string]: number } {
    const vacio: { [tipo: string]: number } = {};
    TIPOS_ACCION.forEach(t => vacio[t.key] = 0);
    return vacio;
  }

  /** Columnas de Excel por tipo de acción (NC y SW en rojo, RP/FR/LA en verde). */
  private xlColumnasTipo(): any[] {
    return this.columnasTipoDetalle.map(t => ({
      header: t.sigla === '—' ? 'Sin tipo' : t.sigla,
      ancho: 8,
      numero: true,
      alerta: t.key === 'nc' || t.key === 'sw',
      positivo: t.key === 'rp' || t.key === 'fr' || t.key === 'la'
    }));
  }

  /** Agrupa el tipo de acción guardado en una clave fija (acepta siglas y textos con o sin tilde). */
  private claveTipoAccion(tipo: string): string {
    const t = this.normalizar(tipo);
    if (!t) { return 'otro'; }
    if (t === 'nc' || t.indexOf('no conformidad') !== -1) { return 'nc'; }
    if (t === 'sw' || t.indexOf('stop work') !== -1) { return 'sw'; }
    if (t === 'rp' || t.indexOf('refuerzo positivo') !== -1) { return 'rp'; }
    if (t === 'om' || t.indexOf('oportunidad de mejora') !== -1 || t.indexOf('observacion') !== -1) { return 'om'; }
    if (t.indexOf('flash report') !== -1) { return 'fr'; }
    if (t.indexOf('near miss') !== -1) { return 'nm'; }
    if (t.indexOf('leccion aprendida') !== -1) { return 'la'; }
    return 'otro';
  }

  private claveQuienDetecta(valor: string): string {
    const q = this.normalizar(valor);
    if (!q) { return 'sin'; }
    if (q.indexOf('mandante') !== -1) { return 'mandante'; }
    if (q.indexOf('interno') !== -1) { return 'interno'; }
    if (q.indexOf('vecino') !== -1) { return 'vecinos'; }
    return 'otros';
  }

  private aCategorias(mapa: { [k: string]: number }, total: number): ConteoCategoria[] {
    return Object.keys(mapa)
      .map(nombre => ({ nombre: nombre, total: mapa[nombre], pct: total ? Math.round(mapa[nombre] * 100 / total) : 0 }))
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
  }

  private claseEstadoSubProyecto(estado: string): string {
    const e = this.normalizar(estado);
    if (e.indexOf('pendiente') !== -1 || e.indexOf('validac') !== -1) { return 'es-pendiente'; }
    if (e.indexOf('finaliz') !== -1 || e.indexOf('cerrad') !== -1) { return 'es-finalizado'; }
    if (e.indexOf('inactiv') !== -1 || e.indexOf('paus') !== -1 || e.indexOf('detenid') !== -1) { return 'es-inactivo'; }
    return 'es-activo';
  }

  private normalizar(texto: string): string {
    let t = (texto || '').toString().toLowerCase().trim();
    try { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { }
    return t;
  }
}