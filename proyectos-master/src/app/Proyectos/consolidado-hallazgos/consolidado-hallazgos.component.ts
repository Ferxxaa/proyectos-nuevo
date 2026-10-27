import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { HallazgoItem, sHallazgos } from '../../services/sHallazgos.service';
import { sMis_Proyectos } from '../../services/sMis_Proyectos.service';

interface ConsolidadoSubProyecto {
  idSubProyecto: number;
  nombre: string;
  total: number;
  abiertos: number;
  cerrados: number;
  /** Conteo por tipo de acción (nc, sw, rp, om, fr, nm, la, otro). */
  tipos: { [tipo: string]: number };
  /** Hallazgos que coinciden con el filtro que viene desde Reportes de hallazgos. */
  marcados: number;
}

interface ConsolidadoProyecto {
  idProyecto: number;
  nombre: string;
  subProyectos: ConsolidadoSubProyecto[];
  total: number;
  abiertos: number;
  cerrados: number;
  /** Conteo por tipo de acción (nc, sw, rp, om, fr, nm, la, otro). */
  tipos: { [tipo: string]: number };
  marcados: number;
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

/** Filtro recibido por queryParams: ?anio=2026&tipoAccion=Stop Work&quienDetecta=Mandante */
interface FiltroMarcado {
  anio: number;
  tipo: string;        // clave normalizada (nc, sw, rp, om, fr, nm, la, otro)
  tipoLabel: string;
  quien: string;       // clave normalizada (mandante, interno, vecinos, otros, sin)
  quienLabel: string;
}

/** Sigla corta de cada tipo de acción (misma lista que Control / Reportes de hallazgos). */
const SIGLAS_TIPO: { [key: string]: string } = {
  nc: 'NC', sw: 'SW', rp: 'RP', om: 'OM', fr: 'FR', nm: 'NM', la: 'LA', otro: 'Sin tipo'
};

/** Columnas por tipo de acción (mismo orden y colores que Reportes de hallazgos). */
const TIPOS_COLUMNAS: Array<{ key: string; sigla: string; label: string; clase: string }> = [
  { key: 'nc', sigla: 'NC', label: 'No Conformidad', clase: 'ta-nc' },
  { key: 'sw', sigla: 'SW', label: 'Stop Work', clase: 'ta-sw' },
  { key: 'rp', sigla: 'RP', label: 'Refuerzo Positivo', clase: 'ta-rp' },
  { key: 'om', sigla: 'OM', label: 'Oportunidad de Mejora', clase: 'ta-om' },
  { key: 'fr', sigla: 'FR', label: 'Flash Report', clase: 'ta-fr' },
  { key: 'nm', sigla: 'NM', label: 'Near Miss', clase: 'ta-nm' },
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

  cargando: boolean = true;
  error: string = '';

  // Marcado desde Reportes de hallazgos
  filtroMarcado: FiltroMarcado = null;

  // Filtros manuales de la barra (tipo de acción, quién detecta y año)
  readonly quienOpciones: string[] = ['Mandante', 'Interno', 'Vecinos', 'Otros', 'Sin registrar'];
  filtroQuien: string = '';
  filtroAnio: string = '';
  aniosDisponibles: number[] = [];
  /** Cuántos hallazgos hay de cada tipo con el año / quién detecta elegidos (para los chips). */
  tiposDisponibles: { [tipo: string]: number } = {};
  totalDisponibles: number = 0;
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
  /** Para abrir los proyectos marcados y hacer scroll solo la primera vez (no en cada actualización de Firestore). */
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
    this.navegarFiltro({ anio: valor || null, solo: '1' });
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
    if (!params['tipoAccion'] && !params['quienDetecta'] && !params['anio']) {
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

    if (!tipoTxt && !quienTxt && !anio) {
      this.filtroMarcado = null;
      this.etiquetaFiltro = '';
      this.etiquetaCorta = '';
      return;
    }

    const filtro: FiltroMarcado = {
      anio: anio,
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
    if (filtro.anio) { partes.push(partes.length ? String(filtro.anio) : 'Año ' + filtro.anio); }
    this.etiquetaFiltro = partes.join(' · ');

    const corta: string[] = [];
    if (filtro.tipo) { corta.push(SIGLAS_TIPO[filtro.tipo] || filtro.tipoLabel); }
    if (filtro.quienLabel) { corta.push(filtro.quienLabel); }
    if (!corta.length && filtro.anio) { corta.push(String(filtro.anio)); }
    this.etiquetaCorta = corta.join(' · ');
  }

  /** Igual que coincideFiltro pero sin mirar el tipo (para los números de los chips). */
  private coincideSinTipo(hallazgo: HallazgoItem): boolean {
    const f = this.filtroMarcado;
    if (!hallazgo) { return false; }
    if (!f) { return true; }
    if (f.anio && this.obtenerAnio(hallazgo) !== f.anio) { return false; }
    if (f.quien && this.claveQuienDetecta(hallazgo.quienDetecta) !== f.quien) { return false; }
    return true;
  }

  private coincideFiltro(hallazgo: HallazgoItem): boolean {
    const f = this.filtroMarcado;
    if (!f || !hallazgo) {
      return false;
    }
    // Los de oficina también se marcan (quedan en el proyecto "Operacional")
    if (f.anio && this.obtenerAnio(hallazgo) !== f.anio) {
      return false;
    }
    if (f.tipo && this.claveTipoAccion(hallazgo.tipoAccion) !== f.tipo) {
      return false;
    }
    if (f.quien && this.claveQuienDetecta(hallazgo.quienDetecta) !== f.quien) {
      return false;
    }
    return true;
  }

  /** Abre los proyectos marcados y lleva la vista al primero (solo una vez por filtro). */
  private aplicarAperturaFiltro() {
    if (!this.filtroMarcado || this.aperturaFiltroAplicada) {
      return;
    }
    this.aperturaFiltroAplicada = true;
    if (!this.totalMarcados) {
      return;
    }
    // Filtro elegido aquí mismo: solo se abren, sin mover la pantalla
    if (this.filtroManual) {
      this.proyectos.forEach(p => { if (p.marcados > 0) { p.abierto = true; } });
      return;
    }

    this.proyectos.forEach(p => {
      if (p.marcados > 0) {
        p.abierto = true;
      }
    });

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
        mapa[clave] = {
          idProyecto: idProy,
          nombre: String(item.nombreProyecto || item.nombreProyectoMatriz || 'Proyecto sin nombre'),
          subProyectos: [],
          total: 0,
          abiertos: 0,
          cerrados: 0,
          tipos: this.tiposVacios(),
          marcados: 0,
          abierto: !!this.idProyecto && idProy === Number(this.idProyecto)
        };
      }

      mapa[clave].subProyectos.push({
        idSubProyecto: idSub,
        nombre: String(item.nombreSubProyecto || 'Subproyecto sin nombre'),
        total: 0,
        abiertos: 0,
        cerrados: 0,
        tipos: this.tiposVacios(),
        marcados: 0
      });
    });

    const subOperacional: ConsolidadoSubProyecto = {
      idSubProyecto: -1,
      nombre: 'Hallazgos Operacionales',
      total: 0,
      abiertos: 0,
      cerrados: 0,
      tipos: this.tiposVacios(),
      marcados: 0
    };
    mapa['operacional'] = {
      idProyecto: -1,
      nombre: 'Operacional',
      subProyectos: [subOperacional],
      total: 0,
      abiertos: 0,
      cerrados: 0,
      tipos: this.tiposVacios(),
      marcados: 0,
      abierto: true
    };

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
        subPorId[String(sub.idSubProyecto)] = sub;
      });
    });

    this.hallazgos.forEach(hallazgo => {
      if (!hallazgo) {
        return;
      }

      if (hallazgo.ambito === 'oficina' || hallazgo.tipoRegistro === 'hallazgo-oficina') {
        const operacional = subPorId['-1'];
        if (operacional) {
          this.acumularHallazgo(operacional, hallazgo);
        }
        return;
      }

      const sub = subPorId[String(hallazgo.idSubProyecto)];
      if (!sub) {
        return;
      }

      this.acumularHallazgo(sub, hallazgo);
    });

    this.proyectos.forEach(proyecto => {
      this.resetear(proyecto);
      proyecto.subProyectos.forEach(sub => {
        proyecto.total += sub.total;
        proyecto.abiertos += sub.abiertos;
        proyecto.cerrados += sub.cerrados;
        Object.keys(sub.tipos).forEach(k => proyecto.tipos[k] = (proyecto.tipos[k] || 0) + sub.tipos[k]);
        proyecto.marcados += sub.marcados;
      });
      // Con filtro activo, los subproyectos marcados van arriba
      proyecto.subProyectos.sort((a, b) =>
        (this.filtroMarcado ? b.marcados - a.marcados : 0) || a.nombre.localeCompare(b.nombre)
      );
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
      if (this.coincideSinTipo(h)) {
        const k = this.claveTipoAccion(h.tipoAccion);
        disponibles[k] = (disponibles[k] || 0) + 1;
        totalDisponibles++;
      }
    });
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

  private acumularHallazgo(sub: ConsolidadoSubProyecto, hallazgo: HallazgoItem) {
    sub.total++;
    if (String(hallazgo.estado || '').toUpperCase().trim() === 'CERRADA') {
      sub.cerrados++;
    } else {
      sub.abiertos++;
    }

    const tipo = this.claveTipoAccion(hallazgo.tipoAccion);
    sub.tipos[tipo] = (sub.tipos[tipo] || 0) + 1;

    if (this.coincideFiltro(hallazgo)) {
      sub.marcados++;
    }
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

  private resetear(item: any) {
    item.total = 0;
    item.abiertos = 0;
    item.cerrados = 0;
    item.tipos = this.tiposVacios();
    item.marcados = 0;
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