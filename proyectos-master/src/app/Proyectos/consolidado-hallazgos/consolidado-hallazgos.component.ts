import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { HallazgoItem, sHallazgos } from '../../services/sHallazgos.service';
import { sMis_Proyectos } from '../../services/sMis_Proyectos.service';

/** Conteo de hallazgos (se usa por subproyecto, por año y por grupo). */
interface Conteo {
  total: number;
  abiertos: number;
  cerrados: number;
  /** Conteo por tipo de acción (nc, sw, rp, om, fr, nm, la, otro). */
  tipos: { [tipo: string]: number };
  /** Hallazgos que coinciden con el filtro activo. */
  marcados: number;
}

/** Adjunto del hallazgo (solo para ver / abrir). */
interface AdjuntoDetalle {
  nombre: string;
  nombreCorto: string;
  url: string;
  icono: string;
}

/** Un hallazgo listo para mostrarse en el detalle desplegable (solo vista). */
interface DetalleHallazgo {
  id: string;
  fecha: string;
  orden: number;
  anio: number;
  tipoKey: string;
  tipoSigla: string;
  tipoLabel: string;
  tipoClase: string;
  prioridad: string;
  prioridadClase: string;
  estado: string;
  estadoClase: string;
  cerrado: boolean;
  area: string;
  quien: string;
  origen: string;
  archivos: AdjuntoDetalle[];
  marcado: boolean;
}

interface ConsolidadoSubProyecto extends Conteo {
  idSubProyecto: number;
  nombre: string;
  /** Desglose por año (clave = año, "0" = sin año). */
  porAnio: { [anio: string]: Conteo };
  /** Hallazgos del subproyecto (respetando el año elegido), más recientes primero. */
  detalle: DetalleHallazgo[];
  /** Hallazgos del subproyecto por año. */
  detallePorAnio: { [anio: string]: DetalleHallazgo[] };
}

/** Un bloque de la tabla del proyecto: el año y sus subproyectos. */
interface GrupoAnio {
  anio: number;
  conteo: Conteo;
  filas: Array<{ sub: ConsolidadoSubProyecto; conteo: Conteo }>;
}

interface ConsolidadoProyecto extends Conteo {
  idProyecto: number;
  nombre: string;
  subProyectos: ConsolidadoSubProyecto[];
  /** Tabla agrupada por año (más reciente arriba). */
  grupos: GrupoAnio[];
  /** Subproyectos sin ningún hallazgo (se muestran al final, atenuados). */
  sinHallazgos: string[];
  abierto: boolean;
}

interface Totales {
  proyectos: number;
  total: number;
  abiertos: number;
  cerrados: number;
  /** Conteo por tipo de acción (nc, sw, rp, om, fr, nm, la, otro). */
  tipos: { [tipo: string]: number };
}

/** Filtro recibido por queryParams: ?tipoAccion=Stop Work&quienDetecta=Mandante (el año va aparte: ?anio=2026 filtra todo) */
interface FiltroMarcado {
  tipo: string;        // clave normalizada (nc, sw, rp, om, fr, nm, la, otro)
  tipoLabel: string;
  quien: string;       // clave normalizada (mandante, interno, vecinos, otros, sin)
  quienLabel: string;
}

/** Sigla corta de cada tipo de acción (misma lista que Control / Reportes de hallazgos). */
const SIGLAS_TIPO: { [key: string]: string } = {
  nc: 'NC', sw: 'SW', rp: 'RP', om: 'OM', fr: 'FR', nm: 'NM', la: 'LA', otro: 'Sin tipo'
};

/** Columnas por tipo de acción, ordenadas de más grave a menos grave. */
const TIPOS_COLUMNAS: Array<{ key: string; sigla: string; label: string; clase: string }> = [
  { key: 'nc', sigla: 'NC', label: 'No Conformidad', clase: 'ta-nc' },
  { key: 'sw', sigla: 'SW', label: 'Stop Work', clase: 'ta-sw' },
  { key: 'nm', sigla: 'NM', label: 'Near Miss', clase: 'ta-nm' },
  { key: 'rp', sigla: 'RP', label: 'Refuerzo Positivo', clase: 'ta-rp' },
  { key: 'fr', sigla: 'FR', label: 'Flash Report', clase: 'ta-fr' },
  { key: 'om', sigla: 'OM', label: 'Oportunidad de Mejora', clase: 'ta-om' },
  { key: 'la', sigla: 'LA', label: 'Lección aprendida', clase: 'ta-la' },
  { key: 'otro', sigla: 'S/T', label: 'Sin tipo / Otro', clase: 'ta-otro' }
];

@Component({
  selector: 'app-consolidado-hallazgos',
  templateUrl: './consolidado-hallazgos.component.html',
  styleUrls: ['./consolidado-hallazgos.component.css'],
  providers: [sMis_Proyectos, sHallazgos]
})
export class ConsolidadoHallazgosComponent implements OnInit, OnDestroy {
  // Opcional: si viene, ese proyecto queda primero, destacado y abierto
  @Input() idProyecto: number;

  proyectos: ConsolidadoProyecto[] = [];
  proyectosVisibles: ConsolidadoProyecto[] = [];
  totales: Totales = this.totalesVacios();
  /** Columnas de tipo visibles ("Sin tipo" solo aparece si hay registros sin tipo). */
  columnasTipo: Array<{ key: string; sigla: string; label: string; clase: string }> =
    TIPOS_COLUMNAS.filter(t => t.key !== 'otro');

  busqueda: string = '';
  soloConHallazgos: boolean = true;
  /** Tabla de cada proyecto agrupada por año (siempre activa). */
  agruparPorAnio: boolean = true;

  cargando: boolean = true;
  error: string = '';

  // Marcado desde Reportes de hallazgos
  filtroMarcado: FiltroMarcado = null;

  // Filtros manuales de la barra (tipo de acción, quién detecta y año)
  readonly quienOpciones: string[] = ['Mandante', 'Interno', 'Vecinos', 'Otros', 'Sin registrar'];
  filtroQuien: string = '';
  filtroAnio: string = '';
  /** Año que se está viendo (0 = todos). Con un año elegido, TODO el consolidado cuenta solo ese año (enero a diciembre). */
  anioVista: number = 0;
  aniosDisponibles: number[] = [];
  /** Hallazgos por año para las pestañas. */
  conteoPorAnio: { [anio: string]: number } = {};
  totalTodosLosAnios: number = 0;
  /** Cuántos hallazgos hay de cada tipo con el año / quién detecta elegidos (para los chips). */
  tiposDisponibles: { [tipo: string]: number } = {};
  totalDisponibles: number = 0;

  /** Filas de subproyecto con el detalle de hallazgos desplegado (clave = idSub-año). */
  detalleAbierto: { [clave: string]: boolean } = {};

  /** true cuando el filtro se eligió aquí (se ocultan los proyectos sin coincidencias). */
  private filtroManual: boolean = false;
  etiquetaFiltro: string = '';
  etiquetaCorta: string = '';
  soloMarcados: boolean = false;
  totalMarcados: number = 0;
  proyectosMarcados: number = 0;

  private hallazgos: HallazgoItem[] = [];
  private datosCargados: boolean = false;
  private subscriptionHallazgos: Subscription;
  private subscriptionRuta: Subscription;
  /** Para abrir los proyectos y hacer scroll solo la primera vez por filtro (no en cada actualización de Firestore). */
  private aperturaFiltroAplicada: boolean = false;

  constructor(
    private _sMisProyectos: sMis_Proyectos,
    private _sHallazgos: sHallazgos,
    private _route: ActivatedRoute,
    private _router: Router
  ) {}

  ngOnInit() {
    this.subscriptionRuta = this._route.queryParams.subscribe(params => {
      this.leerFiltro(params || {});
      if (this.datosCargados) {
        this.actualizarConsolidado();
      }
    });

    this._sMisProyectos.getMis_Proyectos().subscribe(
      (data: any) => {
        if (!Array.isArray(data)) {
          this.error = 'No se pudieron cargar los proyectos.';
          this.cargando = false;
          return;
        }

        this.armarProyectos(data);
        this.escucharHallazgos();
      },
      error => {
        console.error('Error al cargar proyectos para el consolidado de hallazgos:', error);
        this.error = 'No se pudieron cargar los proyectos.';
        this.cargando = false;
      }
    );
  }

  ngOnDestroy() {
    if (this.subscriptionHallazgos) {
      this.subscriptionHallazgos.unsubscribe();
    }
    if (this.subscriptionRuta) {
      this.subscriptionRuta.unsubscribe();
    }
  }

  //*************************************************** UI ***************************************************

  toggleProyecto(proyecto: ConsolidadoProyecto) {
    proyecto.abierto = !proyecto.abierto;
  }

  expandirTodos(valor: boolean) {
    this.proyectosVisibles.forEach(p => p.abierto = valor);
    if (!valor) {
      this.detalleAbierto = {};
    }
  }

  onBusqueda(valor: string) {
    this.busqueda = valor;
    this.aplicarFiltro();
  }

  onSoloConHallazgos(valor: boolean) {
    this.soloConHallazgos = valor;
    this.aplicarFiltro();
  }

  onSoloMarcados(valor: boolean) {
    this.navegarFiltro({ solo: valor ? '1' : null });
  }

  /** Chip de tipo: si ya estaba elegido lo quita; null = "Todos". */
  filtrarPorTipo(tipo: { key: string; label: string }) {
    const yaElegido = !!tipo && this.esTipoMarcado(tipo.key);
    this.navegarFiltro({ tipoAccion: tipo && !yaElegido ? tipo.label : null, solo: '1' });
  }

  filtrarPorQuien(valor: string) {
    this.navegarFiltro({ quienDetecta: valor || null, solo: '1' });
  }

  filtrarPorAnio(valor: string) {
    this.navegarFiltro({ anio: valor || null });
  }

  /** Clic en la fila del año en la tabla: ve el consolidado de ese año o vuelve a todos. */
  toggleAnio(anio: number, evento?: any) {
    if (evento && evento.stopPropagation) {
      evento.stopPropagation();
    }
    if (!anio) {
      return;
    }
    this.filtrarPorAnio(this.esAnioActivo(anio) ? '' : String(anio));
  }

  esAnioActivo(anio: number): boolean {
    return !!this.filtroAnio && Number(this.filtroAnio) === anio;
  }

  //*************************************************** Detalle de hallazgos ***************************************************

  private claveDetalle(sub: ConsolidadoSubProyecto, anio?: number): string {
    return sub.idSubProyecto + '-' + (anio === undefined || anio === null ? 'todos' : anio);
  }

  /** Clic en un subproyecto: muestra / oculta sus hallazgos. */
  toggleDetalle(sub: ConsolidadoSubProyecto, anio?: number, evento?: any) {
    if (evento && evento.stopPropagation) {
      evento.stopPropagation();
    }
    if (!sub) {
      return;
    }
    const clave = this.claveDetalle(sub, anio);
    this.detalleAbierto[clave] = !this.detalleAbierto[clave];
  }

  estaDetalleAbierto(sub: ConsolidadoSubProyecto, anio?: number): boolean {
    return !!sub && !!this.detalleAbierto[this.claveDetalle(sub, anio)];
  }

  /** Hallazgos a mostrar en el detalle (con "solo marcados" se muestran solo los que coinciden). */
  verDetalle(sub: ConsolidadoSubProyecto, anio?: number): DetalleHallazgo[] {
    if (!sub) {
      return [];
    }
    const lista = (anio === undefined || anio === null)
      ? (sub.detalle || [])
      : ((sub.detallePorAnio && sub.detallePorAnio[String(anio)]) || []);
    if (this.filtroMarcado && this.soloMarcados) {
      return lista.filter(h => h.marcado);
    }
    return lista;
  }

  trackByDetalle(index: number, h: DetalleHallazgo) {
    return h && h.id ? h.id : index;
  }

  trackByAnio(index: number, r: { anio: number }) {
    return r ? r.anio : index;
  }

  trackByFila(index: number, f: { sub: ConsolidadoSubProyecto }) {
    return f && f.sub ? f.sub.idSubProyecto : index;
  }

  /** Cantidad de columnas de la tabla (para las filas de ancho completo). */
  get columnasTabla(): number {
    return 1 + (this.filtroMarcado ? 1 : 0) + 2 + this.columnasTipo.length + 1;
  }

  /** Mezcla los cambios con los queryParams actuales (así el filtro queda en la URL y se puede compartir). */
  private navegarFiltro(cambios: { [k: string]: string }) {
    const actuales = (this._route.snapshot && this._route.snapshot.queryParams) || {};
    const params: { [k: string]: string } = {};
    Object.keys(actuales).forEach(k => params[k] = actuales[k]);
    Object.keys(cambios).forEach(k => {
      if (cambios[k] === null || cambios[k] === undefined || cambios[k] === '') {
        delete params[k];
      } else {
        params[k] = cambios[k];
      }
    });
    if (!params['tipoAccion'] && !params['quienDetecta']) {
      delete params['solo'];
    }
    this._router.navigate([], { relativeTo: this._route, queryParams: params });
  }

  /** Quita la marca: limpia los queryParams y vuelve al consolidado normal. */
  quitarFiltro() {
    this._router.navigate([], { relativeTo: this._route, queryParams: {} });
  }

  coincideBusqueda(nombre: string): boolean {
    const texto = this.normalizar(this.busqueda);
    return !!texto && this.normalizar(nombre).indexOf(texto) > -1;
  }

  esProyectoActual(proyecto: ConsolidadoProyecto): boolean {
    return !!this.idProyecto && proyecto.idProyecto === Number(this.idProyecto);
  }

  esMarcado(item: { marcados: number }): boolean {
    return !!this.filtroMarcado && !!item && item.marcados > 0;
  }

  esAtenuado(item: { marcados: number }): boolean {
    return !!this.filtroMarcado && !!item && item.marcados === 0;
  }

  porcentajeCerrados(item: { total: number, cerrados: number }): number {
    if (!item || !item.total) {
      return 0;
    }
    return Math.round((item.cerrados * 100) / item.total);
  }

  trackByProyecto(index: number, proyecto: ConsolidadoProyecto) {
    return proyecto.idProyecto;
  }

  trackBySubProyecto(index: number, sub: ConsolidadoSubProyecto) {
    return sub.idSubProyecto;
  }

  //*************************************************** Filtro desde Reportes ***************************************************

  private leerFiltro(params: any) {
    const anio = Number(params['anio']) || 0;
    const tipoTxt = String(params['tipoAccion'] || '').trim();
    const quienTxt = String(params['quienDetecta'] || '').trim();

    this.aperturaFiltroAplicada = false;
    this.filtroManual = params['solo'] === '1';
    this.soloMarcados = this.filtroManual;
    this.filtroQuien = quienTxt;
    this.filtroAnio = anio ? String(anio) : '';
    this.anioVista = anio;

    if (!tipoTxt && !quienTxt) {
      this.filtroMarcado = null;
      this.etiquetaFiltro = '';
      this.etiquetaCorta = '';
      return;
    }

    const filtro: FiltroMarcado = {
      tipo: tipoTxt ? this.claveTipoAccion(tipoTxt) : '',
      tipoLabel: tipoTxt,
      quien: quienTxt ? this.claveQuienParam(quienTxt) : '',
      quienLabel: quienTxt
    };
    this.filtroMarcado = filtro;

    const partes: string[] = [];
    if (filtro.tipoLabel) { partes.push(filtro.tipoLabel); }
    if (filtro.quienLabel) {
      partes.push(filtro.quien === 'sin' ? 'sin registrar quién detecta' : 'detectados por ' + filtro.quienLabel);
    }
    this.etiquetaFiltro = partes.join(' · ');

    const corta: string[] = [];
    if (filtro.tipo) { corta.push(SIGLAS_TIPO[filtro.tipo] || filtro.tipoLabel); }
    if (filtro.quienLabel) { corta.push(filtro.quienLabel); }
    this.etiquetaCorta = corta.join(' · ');
  }

  /** Igual que coincideFiltro pero sin mirar el tipo (para los números de los chips). */
  private coincideSinTipo(hallazgo: HallazgoItem): boolean {
    const f = this.filtroMarcado;
    if (!hallazgo) { return false; }
    if (!f) { return true; }
    if (f.quien && this.claveQuienDetecta(hallazgo.quienDetecta) !== f.quien) { return false; }
    return true;
  }

  private coincideFiltro(hallazgo: HallazgoItem): boolean {
    const f = this.filtroMarcado;
    if (!f || !hallazgo) {
      return false;
    }
    // Los de oficina también se marcan (quedan en el proyecto "Operacional")
    if (f.tipo && this.claveTipoAccion(hallazgo.tipoAccion) !== f.tipo) {
      return false;
    }
    if (f.quien && this.claveQuienDetecta(hallazgo.quienDetecta) !== f.quien) {
      return false;
    }
    return true;
  }

  /**
   * Cada vez que cambia un filtro (tipo, quién detecta o año) se abren los proyectos que
   * tienen resultados para que los hallazgos queden a la vista. Solo una vez por filtro,
   * así no se vuelven a abrir en cada actualización de Firestore si el usuario los cierra.
   */
  private aplicarAperturaFiltro() {
    if (this.aperturaFiltroAplicada) {
      return;
    }
    this.aperturaFiltroAplicada = true;

    // Solo año elegido: se abren los proyectos con hallazgos ese año
    if (!this.filtroMarcado) {
      if (this.anioVista) {
        this.proyectos.forEach(p => { if (p.total > 0) { p.abierto = true; } });
      }
      return;
    }

    if (!this.totalMarcados) {
      return;
    }

    this.proyectos.forEach(p => {
      if (p.marcados > 0) {
        p.abierto = true;
      }
    });

    // Filtro elegido aquí mismo: solo se abren, sin mover la pantalla
    if (this.filtroManual) {
      return;
    }

    setTimeout(() => {
      const el: any = document.querySelector('.proyecto-marcado');
      if (el && el.scrollIntoView) {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {
          el.scrollIntoView(true);
        }
      }
    }, 300);
  }

  //*************************************************** Datos ***************************************************

  private armarProyectos(data: any[]) {
    const mapa: { [id: string]: ConsolidadoProyecto } = {};
    const subVistos: { [id: string]: boolean } = {};

    data.forEach((item: any) => {
      const idSub = Number(item && item.idSubProyecto);
      if (!(idSub > 0) || subVistos[String(idSub)]) {
        return;
      }
      subVistos[String(idSub)] = true;

      const idProy = Number(item.idProyecto) || 0;
      const clave = String(idProy);

      if (!mapa[clave]) {
        mapa[clave] = this.proyectoVacio(
          idProy,
          String(item.nombreProyecto || item.nombreProyectoMatriz || 'Proyecto sin nombre'),
          !!this.idProyecto && idProy === Number(this.idProyecto)
        );
      }

      mapa[clave].subProyectos.push(this.subVacio(idSub, String(item.nombreSubProyecto || 'Subproyecto sin nombre')));
    });

    const operacional = this.proyectoVacio(-1, 'Operacional', true);
    operacional.subProyectos.push(this.subVacio(-1, 'Hallazgos Operacionales'));
    mapa['operacional'] = operacional;

    this.proyectos = Object.keys(mapa).map(k => mapa[k]);
  }

  private escucharHallazgos() {
    this.subscriptionHallazgos = this._sHallazgos.getTodosLosHallazgos().subscribe(
      hallazgos => {
        this.hallazgos = hallazgos || [];
        this.datosCargados = true;
        this.actualizarConsolidado();
        this.cargando = false;
      },
      error => {
        console.error('Error al cargar hallazgos para el consolidado:', error);
        this.error = 'No se pudieron cargar los hallazgos.';
        this.cargando = false;
      }
    );
  }

  private actualizarConsolidado() {
    const subPorId: { [id: string]: ConsolidadoSubProyecto } = {};

    this.proyectos.forEach(proyecto => {
      proyecto.subProyectos.forEach(sub => {
        this.resetear(sub);
        sub.porAnio = {};
        sub.detalle = [];
        sub.detallePorAnio = {};
        subPorId[String(sub.idSubProyecto)] = sub;
      });
    });

    // Conteo por año para las pestañas (antes de recortar por el año elegido)
    const porAnio: { [anio: string]: number } = {};
    let totalTodos = 0;

    this.hallazgos.forEach(hallazgo => {
      if (!hallazgo) {
        return;
      }

      const esOficina = hallazgo.ambito === 'oficina' || hallazgo.tipoRegistro === 'hallazgo-oficina';
      const sub = esOficina ? subPorId['-1'] : subPorId[String(hallazgo.idSubProyecto)];
      if (!sub) {
        return;
      }

      const anio = this.obtenerAnio(hallazgo);
      porAnio[String(anio)] = (porAnio[String(anio)] || 0) + 1;
      totalTodos++;

      // Con un año elegido solo entra lo de ese año (1 de enero al 31 de diciembre)
      if (this.anioVista && anio !== this.anioVista) {
        return;
      }

      this.acumularHallazgo(sub, hallazgo);
    });

    this.conteoPorAnio = porAnio;
    this.totalTodosLosAnios = totalTodos;

    this.proyectos.forEach(proyecto => {
      this.resetear(proyecto);
      proyecto.subProyectos.forEach(sub => {
        this.sumarConteo(proyecto, sub);
        this.ordenarDetalle(sub);
      });
      // Con filtro activo, los subproyectos marcados van arriba
      proyecto.subProyectos.sort((a, b) =>
        (this.filtroMarcado ? b.marcados - a.marcados : 0) || a.nombre.localeCompare(b.nombre)
      );
      this.armarGrupos(proyecto);
    });

    // Con filtro: marcados primero (más marcados arriba). Luego proyecto actual y alfabético.
    this.proyectos.sort((a, b) => {
      if (this.filtroMarcado && a.marcados !== b.marcados) {
        return b.marcados - a.marcados;
      }
      const aActual = this.esProyectoActual(a) ? 0 : 1;
      const bActual = this.esProyectoActual(b) ? 0 : 1;
      if (aActual !== bActual) {
        return aActual - bActual;
      }
      return a.nombre.localeCompare(b.nombre);
    });

    // Años y conteos para los filtros de la barra
    const anios: { [a: string]: boolean } = {};
    const disponibles: { [tipo: string]: number } = this.tiposVacios();
    let totalDisponibles = 0;
    this.hallazgos.forEach(h => {
      if (!h) { return; }
      const a = this.obtenerAnio(h);
      if (a) { anios[String(a)] = true; }
      if (this.anioVista && a !== this.anioVista) { return; }
      if (this.coincideSinTipo(h)) {
        const k = this.claveTipoAccion(h.tipoAccion);
        disponibles[k] = (disponibles[k] || 0) + 1;
        totalDisponibles++;
      }
    });
    if (this.anioVista) { anios[String(this.anioVista)] = true; }
    this.aniosDisponibles = Object.keys(anios).map(a => Number(a)).sort((a, b) => b - a);
    this.tiposDisponibles = disponibles;
    this.totalDisponibles = totalDisponibles;

    const hayOtro = this.proyectos.some(p => p.tipos['otro'] > 0);
    this.columnasTipo = TIPOS_COLUMNAS.filter(t => t.key !== 'otro' || hayOtro);

    this.totalMarcados = this.proyectos.reduce((t, p) => t + p.marcados, 0);
    this.proyectosMarcados = this.proyectos.filter(p => p.marcados > 0).length;

    this.aplicarAperturaFiltro();
    this.aplicarFiltro();
  }

  /** Arma la tabla del proyecto agrupada por año: fila del año + sus subproyectos. */
  private armarGrupos(proyecto: ConsolidadoProyecto) {
    const grupos: { [anio: string]: GrupoAnio } = {};

    proyecto.subProyectos.forEach(sub => {
      Object.keys(sub.porAnio).forEach(k => {
        const conteo = sub.porAnio[k];
        if (!conteo || !conteo.total) {
          return;
        }
        if (!grupos[k]) {
          grupos[k] = { anio: Number(k), conteo: this.conteoVacio(), filas: [] };
        }
        grupos[k].filas.push({ sub: sub, conteo: conteo });
        this.sumarConteo(grupos[k].conteo, conteo);
      });
    });

    const lista = Object.keys(grupos)
      .map(k => grupos[k])
      .sort((a, b) => this.ordenAnio(a.anio, b.anio));

    lista.forEach(g => g.filas.sort((a, b) =>
      (this.filtroMarcado ? b.conteo.marcados - a.conteo.marcados : 0) || a.sub.nombre.localeCompare(b.sub.nombre)
    ));

    proyecto.grupos = lista;
    proyecto.sinHallazgos = proyecto.subProyectos
      .filter(s => !s.total)
      .map(s => s.nombre);
  }

  private acumularHallazgo(sub: ConsolidadoSubProyecto, hallazgo: HallazgoItem) {
    const marcado = this.coincideFiltro(hallazgo);
    this.sumarHallazgo(sub, hallazgo, marcado);

    const anio = this.obtenerAnio(hallazgo);
    const k = String(anio);
    if (!sub.porAnio[k]) {
      sub.porAnio[k] = this.conteoVacio();
    }
    this.sumarHallazgo(sub.porAnio[k], hallazgo, marcado);

    // Detalle para la fila desplegable
    const detalle = this.armarDetalle(hallazgo, anio, marcado);
    sub.detalle.push(detalle);
    if (!sub.detallePorAnio[k]) {
      sub.detallePorAnio[k] = [];
    }
    sub.detallePorAnio[k].push(detalle);
  }

  private armarDetalle(hallazgo: HallazgoItem, anio: number, marcado: boolean): DetalleHallazgo {
    const h: any = hallazgo;
    const tipoKey = this.claveTipoAccion(hallazgo.tipoAccion);
    const col = TIPOS_COLUMNAS.filter(t => t.key === tipoKey)[0] || TIPOS_COLUMNAS[TIPOS_COLUMNAS.length - 1];
    const fechaTxt = String(hallazgo.fecha || '').trim();
    const estadoTxt = String(hallazgo.estado || '').trim().toUpperCase();
    const cerrado = this.esCerrado(hallazgo);
    const prioridad = this.prioridadDe(h);
    const tipoTxt = String(hallazgo.tipoAccion || '').trim();

    return {
      id: String(h.id || ''),
      fecha: this.formatearFecha(fechaTxt) || (anio ? String(anio) : '—'),
      orden: this.ordenFecha(fechaTxt, anio),
      anio: anio,
      tipoKey: tipoKey,
      tipoSigla: col.sigla,
      tipoLabel: tipoTxt ? (tipoTxt === 'Near Miss' ? 'NEAR MISS' : tipoTxt) : col.label,
      tipoClase: col.clase,
      prioridad: prioridad,
      prioridadClase: 'prio-' + prioridad.toLowerCase(),
      estado: estadoTxt || '—',
      estadoClase: this.claseEstado(estadoTxt),
      cerrado: cerrado,
      area: String(h.areaResponsable || '').trim() || '—',
      quien: String(hallazgo.quienDetecta || '').trim() || 'Sin registrar',
      origen: String(h.origenHallazgo || '').trim() || '—',
      archivos: (Array.isArray(h.archivos) ? h.archivos : [])
        .filter((a: any) => a && a.url)
        .map((a: any) => {
          const nombre = String(a.nombre || 'Archivo');
          return {
            nombre: nombre,
            nombreCorto: nombre.length > 18 ? nombre.substring(0, 18).trim() + '...' : nombre,
            url: String(a.url),
            icono: this.iconoArchivo(nombre, String(a.url))
          };
        }),
      marcado: marcado
    };
  }

  /** Misma lógica que Control de Hallazgos: prioridad del hallazgo o de su última bitácora (por defecto MEDIA). */
  private prioridadDe(h: any): string {
    let p = String((h && h.prioridad) || '').trim().toUpperCase();
    if (!p && h && Array.isArray(h.bitacoras) && h.bitacoras.length) {
      let ultima = h.bitacoras[0];
      h.bitacoras.forEach((b: any) => {
        if (b && String(b.fechaRegistro || '') > String((ultima && ultima.fechaRegistro) || '')) { ultima = b; }
      });
      p = String((ultima && ultima.prioridad) || '').trim().toUpperCase();
    }
    return p === 'ALTA' || p === 'BAJA' ? p : 'MEDIA';
  }

  private claseEstado(estado: string): string {
    switch (estado) {
      case 'EN DESARROLLO': return 'estado-en-desarrollo';
      case 'PENDIENTE': return 'estado-pendiente';
      case 'ENVIADA': return 'estado-enviada';
      case 'CERRADA': return 'estado-cerrada';
      default: return '';
    }
  }

  private iconoArchivo(nombre: string, url: string): string {
    const ext = ((nombre || '').split('.').pop() || '').toLowerCase() ||
      ((url || '').split('?')[0].split('.').pop() || '').toLowerCase();
    switch (ext) {
      case 'pdf': return 'fa-file-pdf-o adj-pdf';
      case 'doc':
      case 'docx': return 'fa-file-word-o adj-word';
      case 'xls':
      case 'xlsx': return 'fa-file-excel-o adj-excel';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'fa-file-image-o adj-imagen';
      default: return 'fa-file-o adj-generico';
    }
  }

  /** yyyy-mm-dd → dd-mm-yyyy (igual que se ve en Control de Hallazgos). */
  private formatearFecha(fecha: string): string {
    const iso = (fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? iso[3] + '-' + iso[2] + '-' + iso[1] : fecha;
  }

  /** Detalle más reciente primero. */
  private ordenarDetalle(sub: ConsolidadoSubProyecto) {
    const orden = (a: DetalleHallazgo, b: DetalleHallazgo) => b.orden - a.orden;
    sub.detalle.sort(orden);
    Object.keys(sub.detallePorAnio).forEach(k => sub.detallePorAnio[k].sort(orden));
  }

  private sumarHallazgo(c: Conteo, hallazgo: HallazgoItem, marcado: boolean) {
    c.total++;
    if (this.esCerrado(hallazgo)) {
      c.cerrados++;
    } else {
      c.abiertos++;
    }
    const tipo = this.claveTipoAccion(hallazgo.tipoAccion);
    c.tipos[tipo] = (c.tipos[tipo] || 0) + 1;
    if (marcado) {
      c.marcados++;
    }
  }

  private sumarConteo(destino: Conteo, origen: Conteo) {
    destino.total += origen.total;
    destino.abiertos += origen.abiertos;
    destino.cerrados += origen.cerrados;
    destino.marcados += origen.marcados;
    Object.keys(origen.tipos).forEach(k => destino.tipos[k] = (destino.tipos[k] || 0) + origen.tipos[k]);
  }

  private esCerrado(hallazgo: HallazgoItem): boolean {
    return String(hallazgo.estado || '').toUpperCase().trim() === 'CERRADA';
  }

  /** Más reciente primero; el 0 ("Sin año") siempre al final. */
  private ordenAnio(a: number, b: number): number {
    if (!a && !b) { return 0; }
    if (!a) { return 1; }
    if (!b) { return -1; }
    return b - a;
  }

  aplicarFiltro() {
    const texto = this.normalizar(this.busqueda);

    this.proyectosVisibles = this.proyectos.filter(proyecto => {
      const coincideSubProyecto = texto && proyecto.subProyectos.some(sub =>
        this.normalizar(sub.nombre).indexOf(texto) > -1
      );
      if (coincideSubProyecto) {
        proyecto.abierto = true;
      }

      if (this.filtroMarcado && this.soloMarcados && proyecto.marcados === 0) {
        return false;
      }
      if (this.soloConHallazgos && proyecto.total === 0 && !this.esProyectoActual(proyecto)) {
        return false;
      }
      if (!texto) {
        return true;
      }
      if (this.normalizar(proyecto.nombre).indexOf(texto) > -1) {
        return true;
      }
      return proyecto.subProyectos.some(sub => this.normalizar(sub.nombre).indexOf(texto) > -1);
    });

    const totales = this.totalesVacios();
    this.proyectosVisibles.forEach(p => {
      totales.proyectos++;
      totales.total += p.total;
      totales.abiertos += p.abiertos;
      totales.cerrados += p.cerrados;
      Object.keys(p.tipos).forEach(k => totales.tipos[k] = (totales.tipos[k] || 0) + p.tipos[k]);
    });
    this.totales = totales;
  }

  //*************************************************** Helpers ***************************************************

  private resetear(item: Conteo) {
    item.total = 0;
    item.abiertos = 0;
    item.cerrados = 0;
    item.tipos = this.tiposVacios();
    item.marcados = 0;
  }

  private conteoVacio(): Conteo {
    return { total: 0, abiertos: 0, cerrados: 0, tipos: this.tiposVacios(), marcados: 0 };
  }

  private subVacio(id: number, nombre: string): ConsolidadoSubProyecto {
    return {
      idSubProyecto: id,
      nombre: nombre,
      total: 0,
      abiertos: 0,
      cerrados: 0,
      tipos: this.tiposVacios(),
      marcados: 0,
      porAnio: {},
      detalle: [],
      detallePorAnio: {}
    };
  }

  private proyectoVacio(id: number, nombre: string, abierto: boolean): ConsolidadoProyecto {
    return {
      idProyecto: id,
      nombre: nombre,
      subProyectos: [],
      grupos: [],
      sinHallazgos: [],
      total: 0,
      abiertos: 0,
      cerrados: 0,
      tipos: this.tiposVacios(),
      marcados: 0,
      abierto: abierto
    };
  }

  private totalesVacios(): Totales {
    return { proyectos: 0, total: 0, abiertos: 0, cerrados: 0, tipos: this.tiposVacios() };
  }

  private tiposVacios(): { [tipo: string]: number } {
    const vacio: { [tipo: string]: number } = {};
    TIPOS_COLUMNAS.forEach(t => vacio[t.key] = 0);
    return vacio;
  }

  /** La columna del tipo que viene marcado desde Reportes queda destacada. */
  esTipoMarcado(key: string): boolean {
    return !!this.filtroMarcado && this.filtroMarcado.tipo === key;
  }

  trackByTipo(index: number, t: { key: string }) {
    return t ? t.key : index;
  }

  /** Valor numérico para ordenar por fecha (acepta yyyy-mm-dd y dd-mm-yyyy). */
  private ordenFecha(fecha: string, anio: number): number {
    const iso = fecha.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (iso) {
      return Number(iso[1]) * 10000 + Number(iso[2]) * 100 + Number(iso[3]);
    }
    const local = fecha.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (local) {
      return Number(local[3]) * 10000 + Number(local[2]) * 100 + Number(local[1]);
    }
    return anio ? anio * 10000 : 0;
  }

  /** Mismo cálculo de año que Reportes de hallazgos (campo anio o la fecha). */
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

  /** Mismo agrupado de tipo de acción que Reportes de hallazgos. */
  private claveTipoAccion(tipo: string): string {
    const t = this.normalizar(tipo);
    if (!t) { return 'otro'; }
    if (t === 'nc' || t.indexOf('no conformidad') !== -1) { return 'nc'; }
    if (t === 'sw' || t.indexOf('stop work') !== -1) { return 'sw'; }
    if (t === 'rp' || t.indexOf('refuerzo positivo') !== -1) { return 'rp'; }
    if (t === 'om' || t.indexOf('oportunidad de mejora') !== -1 || t.indexOf('observacion') !== -1) { return 'om'; }
    if (t === 'fr' || t.indexOf('flash report') !== -1) { return 'fr'; }
    if (t === 'nm' || t.indexOf('near miss') !== -1) { return 'nm'; }
    if (t === 'la' || t.indexOf('leccion aprendida') !== -1) { return 'la'; }
    return 'otro';
  }

  /** Mismo agrupado de "quién detecta" que Reportes de hallazgos. */
  private claveQuienDetecta(valor: string): string {
    const q = this.normalizar(valor);
    if (!q) { return 'sin'; }
    if (q.indexOf('mandante') !== -1) { return 'mandante'; }
    if (q.indexOf('interno') !== -1) { return 'interno'; }
    if (q.indexOf('vecino') !== -1) { return 'vecinos'; }
    return 'otros';
  }

  /** El parámetro llega con la etiqueta del reporte ("Sin registrar" = sin dato). */
  private claveQuienParam(valor: string): string {
    const q = this.normalizar(valor);
    if (q === 'sin registrar' || q === 'sin') { return 'sin'; }
    return this.claveQuienDetecta(valor);
  }

  private normalizar(valor: string): string {
    let texto: any = String(valor || '').toLowerCase().trim();
    if (texto.normalize) {
      texto = texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
    }
    return texto;
  }
}