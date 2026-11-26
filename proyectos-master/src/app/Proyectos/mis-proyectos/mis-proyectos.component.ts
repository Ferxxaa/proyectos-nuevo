import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';

//Share
import { PopUps } from '../../Share/PopUps';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { filter } from 'rxjs/operators';

//Model
import { mMis_Proyectos } from '../../models/mMis_Proyectos';
import { mSubProyecto } from '../../models/mSubProyecto';

//Servicios
import { sMis_Proyectos } from '../../services/sMis_Proyectos.service';
import { sSubProyecto } from '../../services/sSubProyecto.service';
import { sProyectoMatriz } from '../../services/sProyectoMatriz.service';
import { sProyecto } from '../../services/sProyecto.service';
import { sEstadoProyecto } from '../../services/sEstadoProyecto.service';
import { Http, Response, Headers } from '@angular/http';
import { sCorreo } from '../../services/Personalizados/sCorreo.service';
import { sUsuarioClienteProyecto } from '../../services/sUsuarioClienteProyecto.service';
import { sDetalleSubProyecto } from '../../services/sDetalleSubProyecto.service';
import { firestoreDB } from '../../firebase-init';

declare var jQuery: any;
declare var $: any;

const MS_DIA = 1000 * 60 * 60 * 24;
/** La primera vez que un usuario entra, se le muestra como nuevo lo de los últimos N días. */
const DIAS_NOVEDADES_INICIALES = 7;

/** Lo nuevo de un sub-proyecto desde la última vez que el usuario lo vio. */
interface NovedadesSubProyecto {
  hallazgos: number;
  avance: number;
  bitacora: number;
  total: number;
}

/** Última vez que el usuario vio cada tipo de novedad de un sub-proyecto (ISO). */
interface VistoSubProyecto {
  hallazgo?: string;
  avance?: string;
  bitacora?: string;
}

@Component({
  selector: 'app-mis-proyectos',
  templateUrl: './mis-proyectos.component.html',
  styleUrls: ['./mis-proyectos.component.css'],
  providers: [
    sMis_Proyectos,
    sSubProyecto,
    sProyectoMatriz,
    sProyecto,
    sEstadoProyecto,
    sCorreo,
    sUsuarioClienteProyecto,
    sDetalleSubProyecto,
  ]
})
export class MisProyectosComponent implements OnInit, OnDestroy {

  getEtapaActual(etapaActual: string): string {
    const etapaNormalizada = (etapaActual || '').trim().toLowerCase();

    if (etapaNormalizada === 'licitación' || etapaNormalizada === 'licitacion') {
      return 'Regularización';
    }

    if (etapaNormalizada === 'adjudicación' || etapaNormalizada === 'adjudicacion' ||
      etapaNormalizada === 'licitación adjudicación' || etapaNormalizada === 'licitacion adjudicacion') {
      return 'Licitación Adjudicación';
    }

    return etapaActual;
  }

  //Select
  ProyectosMatriz: Array<any>;
  /** Opciones de los filtros: salen de los sub-proyectos que ve el usuario (sirve para cualquier perfil). */
  opcionesMatriz: Array<{ valor: string; nombre: string }> = [];
  opcionesProyecto: Array<{ id: string; nombre: string; matriz: string }> = [];
  Proyectos: Array<any>;
  Estados: Array<any>;

  //Controles
  drdProyectoMatriz;
  drdProyecto;
  drdEstado;
  searchText: string = '';

  //Objetos
  usuario: any;
  SubProyecto: mSubProyecto;
  MisProyecto: mMis_Proyectos;

  //Tabla
  MisProyectos: Array<any>;
  MisProyectosOriginal: Array<mMis_Proyectos>;
  subProyectosSeleccionados: number[];
  subProyectosHallazgosSeleccionados: number[];
  subProyectosConControlAvance: Set<number>;
  subProyectosConHallazgos: Set<number>;

  //Loading
  Loading: boolean;
  LoadingTabla: boolean;

  //Perfiles
  SubGerenteProy: boolean;
  Seguridad: boolean;
  cliente: boolean;

  // Evita que un cálculo viejo (más lento) pise el resultado del más reciente
  private idCalculo: number = 0;

  // Suscripción al router para detectar cuando se vuelve a esta vista
  private routerSub: Subscription;
  private unsubscribeControlesAvance: () => void;
  private unsubscribeHallazgos: () => void;

  // ---- Novedades (puntito en la fila): hallazgo, control de avance o bitácora nuevos ----
  /** idSubProyecto → cantidad de cosas nuevas por tipo. Solo trae los que tienen algo. */
  novedades: { [idSubProyecto: number]: NovedadesSubProyecto } = {};
  private docsControlesAvance: any[] = [];
  private docsHallazgos: any[] = [];
  /** Lo que el usuario ya vio, por sub-proyecto (colección misProyectosVistos, un doc por usuario). */
  private vistos: { [idSubProyecto: string]: VistoSubProyecto } = {};
  /** Desde cuándo cuenta "nuevo" para un sub-proyecto que el usuario nunca abrió (su primer ingreso). */
  private vistosDesde: string = '';
  private vistosCargados: boolean = false;
  private unsubscribeVistos: () => void;

  constructor(
    private _http: Http,
    private _sMis_Proyectos: sMis_Proyectos,
    private _sSubProyecto: sSubProyecto,
    private router: Router,
    private _sProyectoMatriz: sProyectoMatriz,
    private _sProyecto: sProyecto,
    private _sEstadoProyecto: sEstadoProyecto,
    private ClienteProyecto: sUsuarioClienteProyecto,
    private _sDetalleSubProyecto: sDetalleSubProyecto,
    private _ngZone: NgZone
  ) {
    this.MisProyectos = [];
    this.MisProyectosOriginal = [];
    this.subProyectosSeleccionados = [];
    this.subProyectosHallazgosSeleccionados = [];
    this.subProyectosConControlAvance = new Set<number>();
    this.subProyectosConHallazgos = new Set<number>();
    this.ProyectosMatriz = [];
    this.Proyectos = [];
    this.Estados = [];
    this.usuario = JSON.parse(localStorage.usuario);
    this.drdProyectoMatriz = 0;
    this.drdProyecto = 0;
    this.drdEstado = 0;
    this.LoadingTabla = true;

    this.SubGerenteProy = false;
    this.Seguridad = false;
    this.cliente = false;
  }

  ngOnInit() {
    this.suscribirVistos();
    this.suscribirControlesAvance();
    this.cargarTodo();

    // Detectar cuando se navega de vuelta a esta ruta y recargar
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (event.url.includes('MisProyectos')) {
          this.resetearEstado();
          this.cargarTodo();
        }
      });
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
    if (this.unsubscribeControlesAvance) {
      this.unsubscribeControlesAvance();
    }
    if (this.unsubscribeHallazgos) {
      this.unsubscribeHallazgos();
    }
    if (this.unsubscribeVistos) {
      this.unsubscribeVistos();
    }
  }

  private resetearEstado() {
    this.MisProyectos = [];
    this.MisProyectosOriginal = [];
    this.subProyectosSeleccionados = [];
    this.subProyectosHallazgosSeleccionados = [];
    this.ProyectosMatriz = [];
    this.Proyectos = [];
    this.Estados = [];
    this.drdProyectoMatriz = 0;
    this.drdProyecto = 0;
    this.drdEstado = 0;
    this.searchText = '';
    this.SubGerenteProy = false;
    this.Seguridad = false;
    this.cliente = false;
    this.LoadingTabla = true;
  }

  private cargarTodo() {
    this._sProyectoMatriz.getProyectoMatrizbyidUsuarioSubGerente(this.usuario.idUsuario).subscribe(result => {
      this.ProyectosMatriz = result;
    });

    this._sProyecto.getProyectobyidUsuarioDirector(this.usuario.idUsuario).subscribe(result => {
      this.Proyectos = result;
    });

    this._sEstadoProyecto.getEstadoProyecto().subscribe(result => {
      this.Estados = result;
    });

    this.cargaPerfiles();
    this.getCliente();
  }

  cargaPerfiles() {
    let urlBase: string = 'http://trazas-nbi.com:1234/api/';
    let controlador: string = 'UsuariosPerfiles/';
    let urlFull: string = urlBase + controlador;

    if (!localStorage.hasOwnProperty('usuario')) {
      // usuario no logueado
    } else {
      try {
        this.usuario = JSON.parse(localStorage.usuario);
        this._http.get(urlFull + 'GetUsuariosPerfilesByIdUsuario/IdUsuario=' + this.usuario.idUsuario)
          .map((res: Response) => res.json())
          .subscribe(data => {
            data.forEach(element => {
              if (element.idPerfil == 1) this.SubGerenteProy = true;
              if (element.idPerfil == 9) this.Seguridad = true;
            });

            this.cargaMisProyectos();
          });
      } catch (err) {
        console.error(err.message);
      }
    }
  }

  private getCliente() {
    this.ClienteProyecto.getUsuarioClienteProyectobyidUsuarioCliente(this.usuario.idUsuario).subscribe(res => {
      if (res.length) {
        this.cliente = true;
        res.forEach(proyecto => {
          this._sMis_Proyectos.getMis_ProyectosbyidProyecto(proyecto.idProyecto).subscribe(res => {
            this.MisProyectosOriginal = this.MisProyectosOriginal.concat(res);
            this.MisProyectosOriginal = Array.from(new Set(this.MisProyectosOriginal.map(el => el.idSubProyecto))).map(id => {
              const proyecto = this.MisProyectosOriginal.find(el => el.idSubProyecto == id);
              if (proyecto && this.Proyectos && this.ProyectosMatriz) {
                const proyectoBase = this.Proyectos.find(p => p.idProyecto === proyecto.idProyecto);
                if (proyectoBase && proyectoBase.idProyectoMatriz) {
                  const matriz = this.ProyectosMatriz.find(pm => pm.idProyectoMatriz === proyectoBase.idProyectoMatriz);
                  if (matriz) {
                    proyecto.nombreProyectoMatriz = matriz.nombreProyectoMatriz;
                  }
                }
              }
              return proyecto;
            });
            this.applyFilters();
          });
        });
      }
    });
  }

  private cargaMisProyectos() {
    if (this.SubGerenteProy || this.Seguridad) {
      this._sMis_Proyectos.getMis_Proyectos().subscribe(res => {
        this.MisProyectosOriginal = Array.from(new Set(res.map(el => el.idSubProyecto))).map(id => {
          const proyecto = res.find(el => el.idSubProyecto == id);
          if (proyecto && this.Proyectos && this.ProyectosMatriz) {
            const proyectoBase = this.Proyectos.find(p => p.idProyecto === proyecto.idProyecto);
            if (proyectoBase && proyectoBase.idProyectoMatriz) {
              const matriz = this.ProyectosMatriz.find(pm => pm.idProyectoMatriz === proyectoBase.idProyectoMatriz);
              if (matriz) {
                proyecto.nombreProyectoMatriz = matriz.nombreProyectoMatriz;
              }
            }
          }
          return proyecto;
        });

        this.applyFilters();
      });
    } else {
      this._sMis_Proyectos.getMis_ProyectosbyidUsuarioCoordinador(this.usuario.idUsuario).subscribe(result => {
        this.MisProyectosOriginal = result;
        this.applyFilters();
      });
    }
  }

  // Recibe el objeto (no el índice), porque la tabla se pinta ordenada por el pipe
  Detalle(miProyecto: any) {
    if (!miProyecto) {
      return;
    }

    // Guardar miProyecto de inmediato
    localStorage.setItem('miProyecto', JSON.stringify(miProyecto));

    // Al entrar al sub-proyecto, todo lo nuevo queda como visto (se apaga el puntito)
    this.marcarVisto([miProyecto.idSubProyecto], ['hallazgo', 'avance', 'bitacora']);

    // Feedback visual mientras se obtiene el SubProyecto
    this.LoadingTabla = true;

    this._sSubProyecto.getSubProyectobyID(miProyecto.idSubProyecto).subscribe(result => {
      localStorage.setItem('SubProyecto', JSON.stringify(result));
      this.router.navigate(['/Proyecto-TableroControl']);
    }, error => {
      console.error('Error al cargar subproyecto:', error);
      this.LoadingTabla = false;
    });
  }

  estaSeleccionadoParaGantt(idSubProyecto: number): boolean {
    return this.subProyectosSeleccionados.indexOf(idSubProyecto) !== -1;
  }

  tieneControlAvance(idSubProyecto: number): boolean {
    return this.subProyectosConControlAvance.has(idSubProyecto);
  }

  estaSeleccionadoParaHallazgos(idSubProyecto: number): boolean {
    return this.subProyectosHallazgosSeleccionados.indexOf(idSubProyecto) !== -1;
  }

  tieneControlHallazgos(idSubProyecto: number): boolean {
    return this.subProyectosConHallazgos.has(idSubProyecto);
  }

  private suscribirControlesAvance() {
    this.unsubscribeControlesAvance = firestoreDB.collection('controlAvance')
      .onSnapshot((snapshot: any) => {
        const ids = new Set<number>();
        const docs: any[] = [];
        snapshot.forEach((doc: any) => {
          const control = doc.data();
          if (control.activo !== false && control.idSubProyecto) {
            ids.add(Number(control.idSubProyecto));
            docs.push(control);
          }
        });
        this._ngZone.run(() => {
          this.subProyectosConControlAvance = ids;
          this.docsControlesAvance = docs;
          this.calcularNovedades();
        });
      }, (error: any) => {
        console.error('Error al cargar controles de avance existentes:', error);
      });

    this.unsubscribeHallazgos = firestoreDB.collection('hallazgos')
      .onSnapshot((snapshot: any) => {
        const ids = new Set<number>();
        const docs: any[] = [];
        snapshot.forEach((doc: any) => {
          const hallazgo = doc.data();
          const idSubProyecto = Number(hallazgo && hallazgo.idSubProyecto);
          if (hallazgo && hallazgo.ambito !== 'oficina' && idSubProyecto > 0) {
            ids.add(idSubProyecto);
            docs.push(hallazgo);
          }
        });
        this._ngZone.run(() => {
          this.subProyectosConHallazgos = ids;
          this.docsHallazgos = docs;
          this.calcularNovedades();
        });
      }, (error: any) => {
        console.error('Error al cargar hallazgos existentes:', error);
      });
  }

  cambiarSeleccionGantt(proyecto: mMis_Proyectos, event: Event) {
    event.stopPropagation();
    const indice = this.subProyectosSeleccionados.indexOf(proyecto.idSubProyecto);

    if (indice === -1) {
      this.subProyectosSeleccionados.push(proyecto.idSubProyecto);
    } else {
      this.subProyectosSeleccionados.splice(indice, 1);
    }
  }

  cambiarSeleccionHallazgos(proyecto: mMis_Proyectos, event: Event) {
    event.stopPropagation();
    const indice = this.subProyectosHallazgosSeleccionados.indexOf(proyecto.idSubProyecto);

    if (indice === -1) {
      this.subProyectosHallazgosSeleccionados.push(proyecto.idSubProyecto);
    } else {
      this.subProyectosHallazgosSeleccionados.splice(indice, 1);
    }
  }

  verCartasGantt() {
    if (!this.subProyectosSeleccionados.length) {
      return;
    }

    localStorage.setItem('subProyectosGanttSeleccionados', JSON.stringify(this.subProyectosSeleccionados));
    // Ver su Carta Gantt cuenta como ver el control de avance y sus notas de bitácora
    this.marcarVisto(this.subProyectosSeleccionados, ['avance', 'bitacora']);
    this.router.navigate(['/Proyectos-CartasGantt']);
  }

  verControlHallazgos() {
    this.marcarVisto(this.subProyectosHallazgosSeleccionados, ['hallazgo']);
    localStorage.setItem(
      'subProyectosHallazgosSeleccionados',
      JSON.stringify(this.subProyectosHallazgosSeleccionados)
    );
    this.router.navigate(['/Proyectos-ControlHallazgosSeleccionados']);
  }

  // =========================================================================
  // NOVEDADES: puntito en la fila cuando hay un hallazgo, control de avance
  // o bitácora nuevos que el usuario todavía no ha visto
  // =========================================================================

  private getIdUsuario(): number {
    return Number(this.usuario && this.usuario.idUsuario) || 0;
  }

  private claveVistosLocal(): string {
    return 'misProyectosVistos_' + this.getIdUsuario();
  }

  /** Copia local de lo visto: respaldo si Firestore no responde (ej. falta la regla de la colección). */
  private leerVistosLocal(): { desde: string; vistos: any } | null {
    try {
      const raw = localStorage.getItem(this.claveVistosLocal());
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  private guardarVistosLocal() {
    try {
      localStorage.setItem(this.claveVistosLocal(), JSON.stringify({ desde: this.vistosDesde, vistos: this.vistos }));
    } catch (e) { }
  }

  /** Punto de partida para un usuario nuevo: hace N días (así ve lo reciente, pero no todo lo antiguo). */
  private desdeInicial(): string {
    return new Date(Date.now() - DIAS_NOVEDADES_INICIALES * MS_DIA).toISOString();
  }

  /** Lee (y escucha) lo que este usuario ya vio. */
  private suscribirVistos() {
    const idUsuario = this.getIdUsuario();
    if (!idUsuario) { return; }

    // Mientras llega Firestore, se usa la copia local (o los últimos días) para no esperar
    const local = this.leerVistosLocal();
    const inicialLocal = this.desdeInicial();
    this.vistosDesde = local && local.desde && local.desde < inicialLocal ? local.desde : inicialLocal;
    this.vistos = (local && local.vistos) || {};
    this.vistosCargados = true;
    this.calcularNovedades();

    const ref = firestoreDB.collection('misProyectosVistos').doc(String(idUsuario));
    this.unsubscribeVistos = ref.onSnapshot((doc: any) => {
      this._ngZone.run(() => {
        if (!doc.exists) {
          // Primera vez en Firestore: parte desde la copia local o desde hace N días
          ref.set({ idUsuario: idUsuario, desde: this.vistosDesde, vistos: this.vistos }, { merge: true })
            .catch((error: any) => console.error('No se pudo crear el registro de vistos (revisa la regla de misProyectosVistos):', error));
          this.guardarVistosLocal();
          this.calcularNovedades();
          return;
        }
        const data = doc.data() || {};
        // Nunca más reciente que hace N días: si el registro se creó "hoy" (versión anterior), igual se ve lo reciente
        const inicial = this.desdeInicial();
        const guardado = data.desde || '';
        this.vistosDesde = guardado && guardado < inicial ? guardado : inicial;
        this.vistos = data.vistos || {};
        this.guardarVistosLocal();
        this.calcularNovedades();
      });
    }, (error: any) => {
      // Sin permiso / sin conexión: sigue funcionando con la copia local
      console.error('No se pudo leer lo visto en Mis Proyectos (revisa la regla de misProyectosVistos):', error);
    });
  }

  /** Marca como visto (ahora) los tipos indicados de esos sub-proyectos. */
  private marcarVisto(idsSubProyecto: number[], tipos: Array<'hallazgo' | 'avance' | 'bitacora'>) {
    const idUsuario = this.getIdUsuario();
    if (!idUsuario || !idsSubProyecto || !idsSubProyecto.length) { return; }
    const ahora = new Date().toISOString();
    const cambios: any = {};
    idsSubProyecto.forEach(id => {
      const clave = String(Number(id));
      if (!Number(clave)) { return; }
      const actual: VistoSubProyecto = { ...(this.vistos[clave] || {}) };
      tipos.forEach(tipo => {
        actual[tipo] = ahora;
        cambios['vistos.' + clave + '.' + tipo] = ahora;
      });
      this.vistos[clave] = actual;
    });
    if (!Object.keys(cambios).length) { return; }
    this.guardarVistosLocal();
    this.calcularNovedades();
    firestoreDB.collection('misProyectosVistos').doc(String(idUsuario)).update(cambios)
      .catch(() => {
        // Si el doc todavía no existía, se crea con lo visto
        firestoreDB.collection('misProyectosVistos').doc(String(idUsuario))
          .set({ idUsuario: idUsuario, desde: this.vistosDesde || ahora, vistos: this.vistos }, { merge: true })
          .catch((error: any) => console.error('No se pudo guardar lo visto:', error));
      });
  }

  /** Desde qué momento cuenta como "nuevo" ese tipo en ese sub-proyecto. */
  private desdeNovedad(idSubProyecto: number, tipo: 'hallazgo' | 'avance' | 'bitacora'): string {
    const visto = this.vistos[String(idSubProyecto)];
    return (visto && visto[tipo]) || this.vistosDesde || '';
  }

  /** Lo creó otra persona (lo propio no se marca como nuevo). Sin creador registrado, cuenta. */
  private esDeOtro(idUsuarioCreador: any): boolean {
    const creador = Number(idUsuarioCreador) || 0;
    return !creador || creador !== this.getIdUsuario();
  }

  private calcularNovedades() {
    if (!this.vistosCargados || !this.vistosDesde) { this.novedades = {}; return; }
    const resultado: { [id: number]: NovedadesSubProyecto } = {};
    const sumar = (id: number, tipo: 'hallazgos' | 'avance' | 'bitacora') => {
      if (!id) { return; }
      if (!resultado[id]) { resultado[id] = { hallazgos: 0, avance: 0, bitacora: 0, total: 0 }; }
      resultado[id][tipo]++;
      resultado[id].total++;
    };

    // Control de avance: láminas / títulos nuevos y notas de bitácora nuevas
    (this.docsControlesAvance || []).forEach(control => {
      const id = Number(control.idSubProyecto);
      if (!id) { return; }
      const desdeAvance = this.desdeNovedad(id, 'avance');
      if (control.fechaCreacion && control.fechaCreacion > desdeAvance && this.esDeOtro(control.idUsuarioCreador)) {
        sumar(id, 'avance');
      }
      const desdeBitacora = this.desdeNovedad(id, 'bitacora');
      (Array.isArray(control.bitacora) ? control.bitacora : []).forEach((nota: any) => {
        if (nota && nota.fechaCreacion && nota.fechaCreacion > desdeBitacora && this.esDeOtro(nota.idUsuarioCreador)) {
          sumar(id, 'bitacora');
        }
      });
    });

    // Hallazgos nuevos y registros nuevos en la bitácora de cada hallazgo
    (this.docsHallazgos || []).forEach(hallazgo => {
      const id = Number(hallazgo.idSubProyecto);
      if (!id) { return; }
      const desdeHallazgo = this.desdeNovedad(id, 'hallazgo');
      if (hallazgo.fechaCreacion && hallazgo.fechaCreacion > desdeHallazgo && this.esDeOtro(hallazgo.idUsuarioCreador)) {
        sumar(id, 'hallazgos');
      }
      const desdeBitacora = this.desdeNovedad(id, 'bitacora');
      (Array.isArray(hallazgo.bitacoras) ? hallazgo.bitacoras : []).forEach((registro: any) => {
        if (registro && registro.fechaRegistro && registro.fechaRegistro > desdeBitacora && this.esDeOtro(registro.idUsuarioCreador)) {
          sumar(id, 'bitacora');
        }
      });
    });

    this.novedades = resultado;
  }

  getNovedades(idSubProyecto: number): NovedadesSubProyecto | null {
    const n = this.novedades[Number(idSubProyecto)];
    return n && n.total > 0 ? n : null;
  }

  textoNovedad(cantidad: number, singular: string, plural: string): string {
    return cantidad + ' ' + (cantidad === 1 ? singular : plural) + ' sin ver';
  }

  /** Cuántos sub-proyectos de la tabla tienen algo nuevo. */
  get totalConNovedades(): number {
    return (this.MisProyectos || []).filter(p => !!this.getNovedades(p.idSubProyecto)).length;
  }

  Buscar() {
    if (!this.cliente) {
      this._sMis_Proyectos.getMis_ProyectosbyidUsuarioCoordinador(this.usuario.idUsuario).subscribe(result => {
        this.MisProyectosOriginal = result;
        this.applyFilters();
        this.LoadingTabla = false;
      });
    } else {
      this.getCliente();
    }
  }

  /**
   * Arma las opciones de Proyecto Matriz y Proyecto con lo que el usuario realmente ve en la tabla
   * (más lo que traigan los servicios de subgerente / director). Así un coordinador también tiene filtros.
   */
  private armarOpcionesFiltro() {
    // solo sub-proyectos activos (no finalizados/cerrados) y de matrices visibles
    const base = (this.MisProyectosOriginal || []).filter(el => this.esActivo(el) && !this.esMatrizOculta(el));
    const clave = (t: any) => String(t || '').trim().toUpperCase();

    const matrices: { [k: string]: string } = {};
    base.forEach(el => { if (clave(el.nombreProyectoMatriz)) { matrices[clave(el.nombreProyectoMatriz)] = String(el.nombreProyectoMatriz).trim(); } });
    this.opcionesMatriz = Object.keys(matrices)
      .map(k => ({ valor: k, nombre: matrices[k] }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

    const proyectos: { [id: string]: { id: string; nombre: string; matriz: string } } = {};
    base.forEach(el => {
      if (el.idProyecto === undefined || el.idProyecto === null) { return; }
      const id = String(el.idProyecto);
      if (!proyectos[id]) { proyectos[id] = { id: id, nombre: String(el.nombreProyecto || ('Proyecto ' + id)).trim(), matriz: clave(el.nombreProyectoMatriz) }; }
    });
    const matrizSel = this.matrizSeleccionada();
    this.opcionesProyecto = Object.keys(proyectos).map(k => proyectos[k])
      .filter(p => !matrizSel || p.matriz === matrizSel)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }

  /** Activo = sin estado o con estado distinto de finalizado/cerrado. */
  private esActivo(el: any): boolean {
    const estado = (el && el.nombreEstadoProyecto || '').toLowerCase().trim();
    return !estado || ['finalizado', 'finalizada', 'cerrado', 'cerrada'].indexOf(estado) < 0;
  }

  /** Matrices de prueba que no se muestran. */
  private esMatrizOculta(el: any): boolean {
    const nombre = (el && el.nombreProyectoMatriz || '').toLowerCase().trim();
    return ['matriz trazas', 'proyecto matriz 2', 'prueba proyecto matriz', 'prueba cliente'].indexOf(nombre) >= 0;
  }

  /** Matriz elegida (clave en mayúsculas) o '' si es "Todos". */
  private matrizSeleccionada(): string {
    const v = this.drdProyectoMatriz;
    if (v === null || v === undefined || v === 0 || String(v) === '0' || String(v) === '') { return ''; }
    // compatibilidad: si viene un id numérico de matriz, se traduce a su nombre
    const pm = (this.ProyectosMatriz || []).find(x => String(x.idProyectoMatriz) === String(v));
    return String(pm ? pm.nombreProyectoMatriz : v).trim().toUpperCase();
  }

  /** Al cambiar la matriz, si el proyecto elegido no es de esa matriz se vuelve a "Todos". */
  cambiarMatriz() {
    this.armarOpcionesFiltro();
    if (Number(this.drdProyecto) > 0 && !this.opcionesProyecto.some(p => p.id === String(this.drdProyecto))) {
      this.drdProyecto = 0;
    }
    this.applyFilters();
  }

  applyFilters() {
    this.armarOpcionesFiltro();
    const base = [...(this.MisProyectosOriginal || [])];
    let lista = base;

    const estadoSel   = Number(this.drdEstado);
    const matrizSel   = this.matrizSeleccionada();
    const proyectoSel = Number(this.drdProyecto);

    if (matrizSel) {
      lista = lista.filter(el => String(el.nombreProyectoMatriz || '').trim().toUpperCase() === matrizSel);
    }

    if (proyectoSel > 0) {
      lista = lista.filter(el => el.idProyecto == proyectoSel);
    }

    if (estadoSel > 0) {
      lista = lista.filter(el => el.idEstadoProyecto == estadoSel);
    }

    if (this.searchText && this.searchText.trim().length > 0) {
      const searchTerm = this.searchText.toLowerCase().trim();
      lista = lista.filter(el => {
        return (el.nombreProyectoMatriz || '').toLowerCase().includes(searchTerm) ||
               (el.nombreProyecto       || '').toLowerCase().includes(searchTerm) ||
               (el.nombreSubProyecto    || '').toLowerCase().includes(searchTerm) ||
               (el.Responsable          || '').toLowerCase().includes(searchTerm);
      });
    }

    if (estadoSel === 0 && !matrizSel && proyectoSel === 0 && (!this.searchText || this.searchText.trim().length === 0)) {
      lista = base.filter(el => {
        const estado = (el.nombreEstadoProyecto || '').toLowerCase().trim();
        if (!estado) return true;
        return !['finalizado', 'finalizada', 'cerrado', 'cerrada'].includes(estado);
      });
    }

    const nombresOcultos = [
      'matriz trazas',
      'proyecto matriz 2',
      'prueba proyecto matriz',
      'prueba cliente'
    ];
    lista = lista.filter(el => {
      const nombre = (el.nombreProyectoMatriz || '').toLowerCase();
      return !nombresOcultos.includes(nombre);
    });

    this.MisProyectos = Array.from(new Set(lista.map(el => el.idSubProyecto)))
      .map(id => lista.find(el => el.idSubProyecto == id));

    this.LoadingTabla = true;
    const idCalculo = ++this.idCalculo;
    this.calDuracionProy(this.MisProyectos, idCalculo).catch(err => {
      console.error('MisProyectos - error en calDuracionProy:', err);
      if (idCalculo === this.idCalculo) {
        this.LoadingTabla = false;
      }
    });
  }

  limpiarFiltros() {
    this.drdProyectoMatriz = 0;
    this.drdProyecto = 0;
    this.drdEstado = 0;
    this.searchText = '';
    this.applyFilters();
  }

  crearProyectoMatriz() {
    this.router.navigate(['/Proyectos-ProyectoMatriz']);
  }

  crearProyecto() {
    this.router.navigate(['/Proyectos-Proyecto']);
  }

  crearSubProyecto() {
    this.router.navigate(['/Proyectos-SubProyecto']);
  }

  async calDuracionProy(misProyectos: mMis_Proyectos[], idCalculo?: number) {
    const idActual = idCalculo !== undefined ? idCalculo : ++this.idCalculo;
    try {
      const results = await Promise.all((misProyectos || []).map(async el => {
        const detalle = await this._sDetalleSubProyecto.asyncDetalleSubProyectobyidSubProyecto(el.idSubProyecto);
        const copy = { ...el } as any;
        const etapas = (detalle || []).slice().sort((a, b) => Number(a.idEtapa) - Number(b.idEtapa));
        const etapaActual = etapas.find(etapa => etapa.vigente);

        // --- Duración total (vista; si viene vacía, suma de duraciones de etapas)
        const duracionVista = this.leerNumero(copy, ['DuracionTotal', 'duracionTotal']);
        const duracionEtapas = etapas.reduce((total, etapa) => total + (Number(etapa.duracion) || 0), 0);
        copy.DuracionTotal = duracionVista !== null && duracionVista > 0 ? duracionVista : duracionEtapas;

        // --- Avance real del proyecto
        const realVista = this.leerNumero(copy, ['AvanceReal', 'avanceReal']);
        const realEtapas = etapas.length ? this.calcularAvanceReal(etapas) : 0;
        copy.AvanceReal = this.elegirAvance(realVista, realEtapas, etapas.length > 0);

        // --- Avance programado del proyecto (no de la etapa)
        const progVista = this.leerNumero(copy, ['AvanceProgramado', 'avanceProgramado']);
        const progEtapas = etapas.length
          ? this.calcularAvanceProgramado(etapas, copy.fechaInicio, copy.DuracionTotal)
          : 0;
        copy.AvanceProgramado = this.elegirAvance(progVista, progEtapas, etapas.length > 0);

        // --- Avance real de la etapa vigente
        const realEtapaVista = this.leerNumero(copy, ['AvanceRealEtapa', 'avanceRealEtapa']);
        const realEtapaActual = etapaActual ? this.normalizarPorcentaje(etapaActual.avanceReal) : 0;
        copy.AvanceRealEtapa = this.elegirAvance(realEtapaVista, realEtapaActual, !!etapaActual);

        // --- Duración real
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
          copy.duracionReal = 0;
        }

        this.normalizarIndicadoresProyecto(copy);

        copy.Desviacion = copy.DuracionTotal > 0 && copy.duracionReal > 0
          ? copy.duracionReal * 100 / copy.DuracionTotal
          : null;
        copy.Semaforo = this.calcularSemaforo(copy);

        return copy;
      }));

      // Sólo el cálculo más reciente actualiza la tabla
      if (idActual === this.idCalculo) {
        this.MisProyectos = results;
      }
    } finally {
      if (idActual === this.idCalculo) {
        this.LoadingTabla = false;
      }
    }
  }

  calcDuracionReal(detalleSP): number {
    if (detalleSP) {
      let dateInicioReal: number  = new Date(detalleSP.fechaInicioReal).getTime();
      let dateTerminoReal: number = new Date(detalleSP.fechaTerminoReal).getTime();
      let dateDiff = dateTerminoReal - dateInicioReal;
      return dateInicioReal && dateTerminoReal ? Math.ceil(dateDiff / MS_DIA) : 0;
    } else {
      return 0;
    }
  }

  /**
   * Semáforo por diferencia porcentual entre avance programado y real:
   *  verde    = hasta 5% bajo lo programado
   *  amarillo = más de 5% y menos de 10% bajo lo programado
   *  rojo     = 10% o más bajo lo programado
   */
  private calcularSemaforo(proyecto: any): string {
    const difAvance = (Number(proyecto.AvanceProgramado) || 0) - (Number(proyecto.AvanceReal) || 0);
    if (difAvance >= 10) {
      return 'rojo';
    }
    if (difAvance > 5) {
      return 'amarillo';
    }
    return 'verde';
  }

  /** Texto del semáforo para el tooltip. */
  textoSemaforo(proyecto: any): string {
    const base = proyecto.Semaforo === 'rojo' ? 'Atrasado' : (proyecto.Semaforo === 'amarillo' ? 'En riesgo' : 'Al día');
    const diferencia = (Number(proyecto.AvanceProgramado) || 0) - (Number(proyecto.AvanceReal) || 0);
    if (diferencia <= 0) { return base + ' · avance real igual o superior al programado'; }
    return base + ' · ' + diferencia.toFixed(1) + '% bajo lo programado';
  }

  private normalizarIndicadoresProyecto(proyecto: any) {
    if (!proyecto) return;

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

  // Promedio ponderado real: divide por la suma de ponderados (sirvan o no 100)
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

  // Avance programado del PROYECTO: cada etapa avanza según su ventana de fechas,
  // ponderada igual que el avance real (así semáforo compara peras con peras)
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

  // Lee el primer campo con valor entre varias variantes de nombre (PascalCase / camelCase)
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

  private normalizarPorcentaje(valor: any): number {
    const porcentaje = Number(valor) || 0;
    return Math.max(0, Math.min(100, Number(porcentaje.toFixed(2))));
  }
}