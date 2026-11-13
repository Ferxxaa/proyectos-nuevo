import { Component, OnInit } from '@angular/core';
import { sSubProyecto } from '../../services/sSubProyecto.service';
import { sProyecto } from '../../services/sProyecto.service';
import { sBibliotecaCertificados, mCertificado, ORIGENES_CERTIFICADO } from '../../services/sBibliotecaCertificados.service';

interface GrupoAnio {
  anio: number;
  archivos: mCertificado[];
}

interface GrupoSubProyecto {
  clave: string;
  idSubProyecto: number;
  nombreSubProyecto: string;
  idProyecto: number;
  nombreProyecto: string;
  finalizado: boolean;
  esOficina: boolean;
  archivos: mCertificado[];
  anios: GrupoAnio[];
  total: number;
}

interface Pestana {
  clave: string;
  titulo: string;
  icono: string;
}

@Component({
  selector: 'app-biblioteca-certificados',
  templateUrl: './biblioteca-certificados.component.html',
  styleUrls: ['./biblioteca-certificados.component.css'],
  providers: [sSubProyecto, sProyecto, sBibliotecaCertificados]
})
export class BibliotecaCertificadosComponent implements OnInit {

  /** ids de idEstadoProyecto que cuentan como finalizado / cerrado (completar si el nombre del estado no viene en el sub-proyecto) */
  private readonly ESTADOS_FINALIZADOS: number[] = [];

  cargando: boolean = true;
  error: string = '';

  origenes: string[] = ORIGENES_CERTIFICADO;
  pestanas: Pestana[] = [
    { clave: 'activos', titulo: 'Activos', icono: 'fa-folder-open-o' },
    { clave: 'finalizados', titulo: 'Finalizados', icono: 'fa-archive' },
    { clave: 'todos', titulo: 'Todos', icono: 'fa-th-large' }
  ];

  // filtros
  pestana: string = 'activos';
  texto: string = '';
  anio: string = 'todos';
  origen: string = 'todos';
  orden: string = 'nombre';

  aniosDisponibles: number[] = [];
  gruposVisibles: GrupoSubProyecto[] = [];
  totalVisibles: number = 0;

  private grupos: GrupoSubProyecto[] = [];
  private expandidos: { [clave: string]: boolean } = {};
  private nombresProyectos: { [idProyecto: number]: string } = {};

  constructor(
    private _sSubProyecto: sSubProyecto,
    private _sProyecto: sProyecto,
    private _sBiblioteca: sBibliotecaCertificados
  ) { }

  ngOnInit() {
    this.cargar();
  }

  private async cargar() {
    this.cargando = true;
    this.error = '';
    try {
      const resultados = await Promise.all([
        this._sSubProyecto.getSubProyecto().toPromise(),
        this._sBiblioteca.listar()
      ]);
      const subProyectos: any[] = resultados[0] || [];
      const certificados: mCertificado[] = resultados[1] || [];

      const mapaSub: { [id: number]: any } = {};
      subProyectos.forEach(sp => { mapaSub[Number(sp.idSubProyecto)] = sp; });

      await this.cargarNombresProyectos(certificados, mapaSub);
      this.construirGrupos(certificados, mapaSub);

      const anios = new Set<number>();
      certificados.forEach(c => anios.add(c.anio));
      this.aniosDisponibles = Array.from(anios).sort((a, b) => b - a);

      this.aplicarFiltros();
    } catch (e) {
      console.error('Error al cargar la biblioteca de certificados:', e);
      this.error = 'No se pudo cargar la biblioteca. Revisa que la colección "bibliotecaCertificados" esté en las reglas de Firestore.';
    } finally {
      this.cargando = false;
    }
  }

  private async cargarNombresProyectos(certificados: mCertificado[], mapaSub: { [id: number]: any }) {
    const ids = new Set<number>();
    certificados.forEach(c => {
      const sp = c.idSubProyecto !== null ? mapaSub[c.idSubProyecto] : null;
      const idProyecto = sp ? Number(sp.idProyecto) : c.idProyecto;
      if (idProyecto) { ids.add(idProyecto); }
    });

    const proyectos = await Promise.all(Array.from(ids).map(id =>
      this._sProyecto.getProyectobyID(id).toPromise().catch(() => null)
    ));
    proyectos.forEach((p: any) => {
      if (p) { this.nombresProyectos[Number(p.idProyecto)] = p.nombreProyecto; }
    });
  }

  private construirGrupos(certificados: mCertificado[], mapaSub: { [id: number]: any }) {
    const grupos: { [clave: string]: GrupoSubProyecto } = {};

    certificados.forEach(c => {
      const esOficina = c.idSubProyecto === null || c.idSubProyecto === undefined;
      const clave = esOficina ? 'oficina' : String(c.idSubProyecto);

      if (!grupos[clave]) {
        const sp = esOficina ? null : mapaSub[c.idSubProyecto];
        const idProyecto = sp ? Number(sp.idProyecto) : (c.idProyecto || null);
        grupos[clave] = {
          clave: clave,
          idSubProyecto: esOficina ? null : c.idSubProyecto,
          nombreSubProyecto: esOficina
            ? 'Hallazgos operacionales / sin sub-proyecto'
            : ((sp && sp.nombreSubProyecto) || c.nombreSubProyecto || ('Sub-proyecto ' + c.idSubProyecto)),
          idProyecto: idProyecto,
          nombreProyecto: esOficina ? 'Oficina' : ((idProyecto && this.nombresProyectos[idProyecto]) || ''),
          finalizado: sp ? this.esFinalizado(sp) : false,
          esOficina: esOficina,
          archivos: [],
          anios: [],
          total: 0
        };
      }
      grupos[clave].archivos.push(c);
    });

    this.grupos = Object.keys(grupos).map(k => grupos[k]);
  }

  private esFinalizado(sp: any): boolean {
    if (this.ESTADOS_FINALIZADOS.indexOf(Number(sp.idEstadoProyecto)) !== -1) { return true; }
    const textos = [sp.nombreEstadoProyecto, sp.estadoProyecto, sp.nombreEstado, sp.estado]
      .filter(t => typeof t === 'string')
      .join(' ');
    return /finaliz|cerrad|terminad/i.test(textos);
  }

  // ---------- filtros ----------

  aplicarFiltros() {
    const texto = this.normalizar(this.texto);
    const visibles: GrupoSubProyecto[] = [];
    let total = 0;

    this.grupos.forEach(g => {
      if (!this.pasaPestana(g, this.pestana)) { return; }

      const coincideGrupo = !texto ||
        this.normalizar(g.nombreSubProyecto + ' ' + g.nombreProyecto).indexOf(texto) !== -1;

      const archivos = g.archivos.filter(c => {
        if (this.anio !== 'todos' && c.anio !== Number(this.anio)) { return false; }
        if (this.origen !== 'todos' && c.origen !== this.origen) { return false; }
        if (texto && !coincideGrupo &&
            this.normalizar(c.nombreArchivo + ' ' + c.referencia + ' ' + c.origen).indexOf(texto) === -1) {
          return false;
        }
        return true;
      });

      if (!archivos.length) { return; }

      visibles.push({
        clave: g.clave,
        idSubProyecto: g.idSubProyecto,
        nombreSubProyecto: g.nombreSubProyecto,
        idProyecto: g.idProyecto,
        nombreProyecto: g.nombreProyecto,
        finalizado: g.finalizado,
        esOficina: g.esOficina,
        archivos: archivos,
        anios: this.agruparPorAnio(archivos),
        total: archivos.length
      });
      total += archivos.length;
    });

    // sub-proyectos por abecedario (oficina siempre primero)
    visibles.sort((a, b) => {
      if (a.esOficina !== b.esOficina) { return a.esOficina ? -1 : 1; }
      return a.nombreSubProyecto.localeCompare(b.nombreSubProyecto, 'es', { sensitivity: 'base' });
    });

    this.gruposVisibles = visibles;
    this.totalVisibles = total;
  }

  private agruparPorAnio(archivos: mCertificado[]): GrupoAnio[] {
    const mapa: { [anio: string]: mCertificado[] } = {};
    archivos.forEach(c => {
      const k = String(c.anio);
      if (!mapa[k]) { mapa[k] = []; }
      mapa[k].push(c);
    });

    const ascendente = this.orden === 'antiguos';
    return Object.keys(mapa)
      .map(k => ({ anio: Number(k), archivos: this.ordenarArchivos(mapa[k]) }))
      .sort((a, b) => ascendente ? a.anio - b.anio : b.anio - a.anio);
  }

  private ordenarArchivos(archivos: mCertificado[]): mCertificado[] {
    const copia = archivos.slice();
    if (this.orden === 'recientes') {
      copia.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    } else if (this.orden === 'antiguos') {
      copia.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    } else {
      copia.sort((a, b) => a.nombreArchivo.localeCompare(b.nombreArchivo, 'es', { sensitivity: 'base', numeric: true }));
    }
    return copia;
  }

  private pasaPestana(g: GrupoSubProyecto, pestana: string): boolean {
    if (pestana === 'activos') { return !g.finalizado; }
    if (pestana === 'finalizados') { return g.finalizado; }
    return true;
  }

  private normalizar(valor: string): string {
    return (valor || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  // ---------- contadores de pestañas ----------

  contarArchivos(pestana: string): number {
    let n = 0;
    this.grupos.forEach(g => { if (this.pasaPestana(g, pestana)) { n += g.archivos.length; } });
    return n;
  }

  contarSubProyectos(pestana: string): number {
    return this.grupos.filter(g => this.pasaPestana(g, pestana) && !g.esOficina).length;
  }

  // ---------- acciones ----------

  cambiarPestana(clave: string) {
    this.pestana = clave;
    this.aplicarFiltros();
  }

  cambiarOrigen(origen: string) {
    this.origen = origen;
    this.aplicarFiltros();
  }

  limpiarFiltros() {
    this.texto = '';
    this.anio = 'todos';
    this.origen = 'todos';
    this.orden = 'nombre';
    this.aplicarFiltros();
  }

  estaExpandido(g: GrupoSubProyecto): boolean {
    if (this.expandidos[g.clave] !== undefined) { return this.expandidos[g.clave]; }
    // por defecto abiertos si hay pocos o si se está buscando
    return this.gruposVisibles.length <= 4 || !!this.texto;
  }

  alternarGrupo(g: GrupoSubProyecto) {
    this.expandidos[g.clave] = !this.estaExpandido(g);
  }

  expandirTodo(valor: boolean) {
    this.gruposVisibles.forEach(g => { this.expandidos[g.clave] = valor; });
  }

  get hayFiltros(): boolean {
    return !!this.texto || this.anio !== 'todos' || this.origen !== 'todos';
  }

  claseOrigen(origen: string): string {
    switch (origen) {
      case 'Hallazgos': return 'bc-origen-hallazgos';
      case 'Control de Avance': return 'bc-origen-avance';
      case 'Programa SSO': return 'bc-origen-sso';
      case 'Programa MA': return 'bc-origen-ma';
      case 'Incidentes': return 'bc-origen-incidentes';
      case 'Certificados MA': return 'bc-origen-certma';
      case 'Archivos Estándar': return 'bc-origen-estandar';
      default: return '';
    }
  }

  iconoArchivo(nombre: string): string {
    const ext = ((nombre || '').split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') { return 'fa-file-pdf-o'; }
    if (['xls', 'xlsx', 'csv'].indexOf(ext) !== -1) { return 'fa-file-excel-o'; }
    if (['doc', 'docx'].indexOf(ext) !== -1) { return 'fa-file-word-o'; }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].indexOf(ext) !== -1) { return 'fa-file-image-o'; }
    if (['zip', 'rar', '7z'].indexOf(ext) !== -1) { return 'fa-file-archive-o'; }
    return 'fa-file-o';
  }

  trackGrupo(index: number, g: GrupoSubProyecto) { return g.clave; }
  trackArchivo(index: number, c: mCertificado) { return c.id || c.url; }
}