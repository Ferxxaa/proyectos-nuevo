import { Component, OnInit, OnDestroy } from '@angular/core';

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

  constructor(
    private _http: Http,
    private _sMis_Proyectos: sMis_Proyectos,
    private _sSubProyecto: sSubProyecto,
    private router: Router,
    private _sProyectoMatriz: sProyectoMatriz,
    private _sProyecto: sProyecto,
    private _sEstadoProyecto: sEstadoProyecto,
    private ClienteProyecto: sUsuarioClienteProyecto,
    private _sDetalleSubProyecto: sDetalleSubProyecto
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
        snapshot.forEach((doc: any) => {
          const control = doc.data();
          if (control.activo !== false && control.idSubProyecto) {
            ids.add(Number(control.idSubProyecto));
          }
        });
        this.subProyectosConControlAvance = ids;
      }, (error: any) => {
        console.error('Error al cargar controles de avance existentes:', error);
      });

    this.unsubscribeHallazgos = firestoreDB.collection('hallazgos')
      .onSnapshot((snapshot: any) => {
        const ids = new Set<number>();
        snapshot.forEach((doc: any) => {
          const hallazgo = doc.data();
          const idSubProyecto = Number(hallazgo && hallazgo.idSubProyecto);
          if (hallazgo && hallazgo.ambito !== 'oficina' && idSubProyecto > 0) {
            ids.add(idSubProyecto);
          }
        });
        this.subProyectosConHallazgos = ids;
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
    this.router.navigate(['/Proyectos-CartasGantt']);
  }

  verControlHallazgos() {
    localStorage.setItem(
      'subProyectosHallazgosSeleccionados',
      JSON.stringify(this.subProyectosHallazgosSeleccionados)
    );
    this.router.navigate(['/Proyectos-ControlHallazgosSeleccionados']);
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

  applyFilters() {
    const base = [...(this.MisProyectosOriginal || [])];
    let lista = base;

    const estadoSel   = Number(this.drdEstado);
    const matrizSel   = Number(this.drdProyectoMatriz);
    const proyectoSel = Number(this.drdProyecto);

    if (matrizSel > 0) {
      const pm = this.ProyectosMatriz.find(x => x.idProyectoMatriz == matrizSel);
      if (pm && pm.nombreProyectoMatriz) {
        lista = lista.filter(el => el.nombreProyectoMatriz == pm.nombreProyectoMatriz);
      }
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

    if (estadoSel === 0 && matrizSel === 0 && proyectoSel === 0 && (!this.searchText || this.searchText.trim().length === 0)) {
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

  // Siempre devuelve un color: no quedan casos sin semáforo
  private calcularSemaforo(proyecto: any): string {
    const difAvance = (Number(proyecto.AvanceProgramado) || 0) - (Number(proyecto.AvanceReal) || 0);
    const total = Number(proyecto.DuracionTotal) || 0;
    const difDuracion = total > 0 ? total - (Number(proyecto.duracionReal) || 0) : null;

    if (difAvance > 3 || (difDuracion !== null && difDuracion < -10)) {
      return 'rojo';
    }
    if (difAvance <= 0 && (difDuracion === null || difDuracion >= 0)) {
      return 'verde';
    }
    return 'amarillo';
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