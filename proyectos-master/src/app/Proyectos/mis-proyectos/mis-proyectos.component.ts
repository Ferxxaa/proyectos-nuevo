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
import { spAvanceProgramado } from '../../services/Personalizados/spAvanceProgramado.service';
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

@Component({
  selector: 'app-mis-proyectos',
  templateUrl: './mis-proyectos.component.html',
  styleUrls: ['./mis-proyectos.component.css'],
  providers: [
    sMis_Proyectos,
    sSubProyecto,
    spAvanceProgramado,
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
  MisProyectos: Array<mMis_Proyectos>;
  MisProyectosOriginal: Array<mMis_Proyectos>;
  subProyectosSeleccionados: number[];
  subProyectosConControlAvance: Set<number>;

  //Loading
  Loading: boolean;
  LoadingTabla: boolean;

  //Perfiles
  SubGerenteProy: boolean;
  Seguridad: boolean;
  cliente: boolean;

  // Suscripción al router para detectar cuando se vuelve a esta vista
  private routerSub: Subscription;
  private unsubscribeControlesAvance: () => void;

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
    this.subProyectosConControlAvance = new Set<number>();
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
  }

  private resetearEstado() {
    this.MisProyectos = [];
    this.MisProyectosOriginal = [];
    this.subProyectosSeleccionados = [];
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
        this.calDuracionProy(this.MisProyectos);
        this.LoadingTabla = false;
      });
    } else {
      this._sMis_Proyectos.getMis_ProyectosbyidUsuarioCoordinador(this.usuario.idUsuario).subscribe(result => {
        this.MisProyectosOriginal = result;
        this.applyFilters();
        this.LoadingTabla = false;
      });
    }
  }

  Detalle(i) {
  const miProyecto = this.MisProyectos[i];
  
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

  verCartasGantt() {
    if (!this.subProyectosSeleccionados.length) {
      return;
    }

    localStorage.setItem('subProyectosGanttSeleccionados', JSON.stringify(this.subProyectosSeleccionados));
    this.router.navigate(['/Proyectos-CartasGantt']);
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
    this.calDuracionProy(this.MisProyectos).catch(err => {
      console.error('MisProyectos - error en calDuracionProy:', err);
      this.LoadingTabla = false;
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

  async calDuracionProy(misProyectos: mMis_Proyectos[]) {
    try {
      const results = await Promise.all((misProyectos || []).map(async el => {
        const detalle = await this._sDetalleSubProyecto.asyncDetalleSubProyectobyidSubProyecto(el.idSubProyecto);
        const copy = { ...el } as any;
        if (detalle && detalle.length) {
          if (copy.idEstadoProyecto <= 4) {
            const dateInicioReal: number  = new Date(detalle[0].fechaInicioReal).getTime();
            const dateTerminoReal: number = new Date().getTime();
            const dateDiff = dateTerminoReal - dateInicioReal;
            const duracionReal = dateInicioReal && dateTerminoReal ? Math.ceil(dateDiff / (1000 * 60 * 60 * 24)) : 0;
            copy.duracionReal = duracionReal;
          } else {
            copy.duracionReal = detalle.reduce((acc, d) => acc + this.calcDuracionReal(d), 0);
          }
        } else {
          copy.duracionReal = 0;
        }

        this.normalizarIndicadoresProyecto(copy);
        return copy;
      }));

      this.MisProyectos = results;
    } finally {
      this.LoadingTabla = false;
    }
  }

  calcDuracionReal(detalleSP): number {
    if (detalleSP) {
      let dateInicioReal: number  = new Date(detalleSP.fechaInicioReal).getTime();
      let dateTerminoReal: number = new Date(detalleSP.fechaTerminoReal).getTime();
      let dateDiff = dateTerminoReal - dateInicioReal;
      return dateInicioReal && dateTerminoReal ? Math.ceil(dateDiff / (1000 * 60 * 60 * 24)) : 0;
    } else {
      return 0;
    }
  }

  private normalizarIndicadoresProyecto(proyecto: any) {
    if (!proyecto) return;

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

    const avanceProgramado = Number(proyecto.AvanceProgramado) || 0;
    proyecto.AvanceProgramado = avanceProgramado < 0 ? 0 : avanceProgramado > 100 ? 100 : avanceProgramado;
    proyecto.duracionReal = Math.max(0, Number(proyecto.duracionReal) || 0);
  }
}