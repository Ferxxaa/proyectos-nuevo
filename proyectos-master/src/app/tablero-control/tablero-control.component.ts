import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

//Share
import { PopUps } from '../Share/PopUps';

//Model
import { mSubProyecto } from '../models/mSubProyecto';
import { mDetalleSubProyecto } from '../models/mDetalleSubProyecto';
import { mMis_Tareas } from '../models/mMis_Tareas';

//Servicios
import { sSubProyecto } from '../services/sSubProyecto.service';
import { sDetalleSubProyecto } from '../services/sDetalleSubProyecto.service';
import { spMis_Tareas } from '../services/Personalizados/spMis_Tareas.service';
import { sMis_Tareas } from '../services/sMis_Tareas.service';
import { sCorreo } from '../services/Personalizados/sCorreo.service';
import { sTarea } from '../services/sTarea.service';
import { sUsuario } from '../services/sUsuario.service';
import { DesplegableTableroControlComponent } from './desplegable-tablero-control/desplegable-tablero-control.component';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/of';

declare var jQuery: any;
declare var $: any;

@Component({
  selector: 'app-tablero-control',
  templateUrl: './tablero-control.component.html',
  styleUrls: ['./tablero-control.component.css'],
  providers: [
    sSubProyecto,
    sDetalleSubProyecto,
    spMis_Tareas,
    sMis_Tareas,
    sCorreo,
    sTarea,
    sUsuario
  ]
})
export class TableroControlComponent implements OnInit {

  //Pestañas
  rowSeguimiento: boolean;
  rowBitDoc: boolean;
  rowTareas: boolean;
  rowPac: boolean;
  rowSSOMA: boolean;
  rowGantt: boolean;
  rowControlAvance: boolean;
  rowControlHallazgos: boolean;

  //VerBitacora
  verDoc: boolean;
  verSSOMA: boolean;
  verPac: boolean;

  // //Objetos
  SubProyecto: mSubProyecto;
  usuario: any;
  detalleSeguimiento: mDetalleSubProyecto[];

  //Select
  Tareas: Array<mMis_Tareas>;
  
  // Mensaje para cuando no hay tareas del proyecto
  sinTareasProyecto: boolean = false;
  
  // Propiedades para resaltar tarea desde notificación
  tareaDestacada: number | null = null;

  cargaDesplegable: boolean;

  //Permisos
  perfilesUsuario: any[] = [];
  // Mientras se cargan los perfiles, se asume el modo más restrictivo por seguridad
  esCliente: boolean = true;

  idEtapa: number | null;

  @ViewChild(DesplegableTableroControlComponent) desplegable: DesplegableTableroControlComponent;

  constructor(
    private _sSubProyecto: sSubProyecto,
    private _sDetalleSubProyecto: sDetalleSubProyecto,
    private _spMis_Tareas: spMis_Tareas,
    private _sMis_Tareas: sMis_Tareas,
    private _sTarea: sTarea,
    private _sUsuario: sUsuario,
    private _http: Http,
    private route: ActivatedRoute
  ) {
    this.usuario = JSON.parse(localStorage.usuario);
    this.SubProyecto = JSON.parse(localStorage.SubProyecto);

    this.cargaDesplegable = true;

    //VerBitacoras
    this.verDoc = true;
    this.verSSOMA = true;
    this.verPac = true;
    this.detalleSeguimiento = null;
    this.idEtapa = null;
    
    // Inicializar tareas como array vacío
    this.Tareas = [];
  }

  ngOnInit() {
    console.log("Sub Proyecto ID: ", this.SubProyecto.idSubProyecto);
    console.log('Usuario actual:', this.usuario);

    // Cargar los perfiles reales del usuario para determinar si es Cliente (idPerfil == 5)
    this.cargarPerfilesUsuario();
    
    // Verificar si viene de una notificación
    this.route.queryParams.subscribe(params => {
      if (params['destacarTarea']) {
        console.log('🎯 Detectada navegación desde notificación para tarea:', params['destacarTarea']);
        this.tareaDestacada = parseInt(params['destacarTarea']);
        
        // Si viene con el parámetro tab=tareas, abrir directamente esa pestaña
        if (params['tab'] === 'tareas') {
          console.log('📂 Abriendo pestaña de tareas automáticamente');
          this.PestTareas(); // Abrir pestaña de tareas
        }
      }
    });
    
    // Inicializar normalmente con la pestaña de seguimiento si no viene de notificación
    if (!this.tareaDestacada) {
      this.PestSeguimiento();
    }
    
    this._sDetalleSubProyecto.getDetalleSubProyectobyidSubProyecto(this.SubProyecto.idSubProyecto).subscribe(result => {
      console.log('Detalle Sub Proyecto obtenido:', result);
      if (result && result.length > 0) {
        console.log("Guardando detalleSeguimiento: ", result);
        this.detalleSeguimiento = result;
        this.GetMisTareas(result);
        this.cargaDesplegable = true;
      } else {
        console.warn('No se encontraron detalles de subproyecto');
        this.detalleSeguimiento = [];
      }
    }, error => {
      console.error('Error al obtener detalle de subproyecto:', error);
      this.detalleSeguimiento = [];
    });
  }

  // Obtiene los perfiles reales del usuario (idPerfil) y determina si es Cliente
  private cargarPerfilesUsuario() {
    const obs = this.cargaPerfiles();
    if (!obs) {
      console.warn('No se pudo cargar perfiles del usuario, se mantiene modo restrictivo');
      this.esCliente = true;
      return;
    }
    obs.subscribe(result => {
      this.perfilesUsuario = result || [];
      this.esCliente = this.perfilesUsuario.some(p => p.idPerfil === 5);
      console.log('Perfiles del usuario:', this.perfilesUsuario, '| esCliente:', this.esCliente);
    }, error => {
      console.error('Error al cargar perfiles del usuario:', error);
      // Ante un error, se mantiene el modo restrictivo por seguridad
      this.perfilesUsuario = [];
      this.esCliente = true;
    });
  }

  PestSeguimiento() {
    this.rowSeguimiento = true;
    this.rowBitDoc = false;
    this.rowSSOMA = false;
    this.rowPac = false;
    this.rowTareas = false;
    this.rowGantt = false;
    this.rowControlAvance = false;
    this.rowControlHallazgos = false;
    $("#TabSeguimiento").attr("class", "nav-link active")
    $("#TabBitDoc").attr("class", "nav-link")
    $("#TabSSOMA").attr("class", "nav-link")
    $("#TabPac").attr("class", "nav-link")
    $("#TabTareas").attr("class", "nav-link")
    $("#TabGantt").attr("class", "nav-link")
    $("#TabControlAvance").attr("class", "nav-link")
    $("#TabControlHallazgos").attr("class", "nav-link")
  }

  PestBitDoc() {
    this.rowSeguimiento = false;
    this.rowBitDoc = true;
    this.rowSSOMA = false;
    this.rowPac = false;
    this.rowTareas = false;
    this.rowGantt = false;
    this.rowControlAvance = false;
    this.rowControlHallazgos = false;
    $("#TabSeguimiento").attr("class", "nav-link")
    $("#TabBitDoc").attr("class", "nav-link active")
    $("#TabSSOMA").attr("class", "nav-link")
    $("#TabPac").attr("class", "nav-link")
    $("#TabTareas").attr("class", "nav-link")
    $("#TabGantt").attr("class", "nav-link")
    $("#TabControlAvance").attr("class", "nav-link")
    $("#TabControlHallazgos").attr("class", "nav-link")
  }

  PestSSOMA() {
    this.rowSeguimiento = false;
    this.rowBitDoc = false;
    this.rowSSOMA = true;
    this.rowPac = false;
    this.rowTareas = false;
    this.rowGantt = false;
    this.rowControlAvance = false;
    this.rowControlHallazgos = false;
    $("#TabSeguimiento").attr("class", "nav-link")
    $("#TabBitDoc").attr("class", "nav-link")
    $("#TabSSOMA").attr("class", "nav-link active")
    $("#TabPac").attr("class", "nav-link")
    $("#TabTareas").attr("class", "nav-link")
    $("#TabGantt").attr("class", "nav-link")
    $("#TabControlAvance").attr("class", "nav-link")
    $("#TabControlHallazgos").attr("class", "nav-link")
  }

  PestCalidad() {
    this.rowSeguimiento = false;
    this.rowBitDoc = false;
    this.rowSSOMA = false;
    this.rowPac = true;
    this.rowTareas = false;
    this.rowGantt = false;
    this.rowControlAvance = false;
    this.rowControlHallazgos = false;
    $("#TabSeguimiento").attr("class", "nav-link")
    $("#TabBitDoc").attr("class", "nav-link")
    $("#TabSSOMA").attr("class", "nav-link")
    $("#TabPac").attr("class", "nav-link active")
    $("#TabTareas").attr("class", "nav-link")
    $("#TabGantt").attr("class", "nav-link")
    $("#TabControlAvance").attr("class", "nav-link")
    $("#TabControlHallazgos").attr("class", "nav-link")
  }

  PestTareas() {
    this.rowSeguimiento = false;
    this.rowBitDoc = false;
    this.rowSSOMA = false;
    this.rowPac = false;
    this.rowTareas = true;
    this.rowGantt = false;
    this.rowControlAvance = false;
    this.rowControlHallazgos = false;
    $("#TabSeguimiento").attr("class", "nav-link")
    $("#TabBitDoc").attr("class", "nav-link")
    $("#TabSSOMA").attr("class", "nav-link")
    $("#TabPac").attr("class", "nav-link")
    $("#TabTareas").attr("class", "nav-link active")
    $("#TabGantt").attr("class", "nav-link")
    $("#TabControlAvance").attr("class", "nav-link")
    $("#TabControlHallazgos").attr("class", "nav-link")
    
    // Cargar las tareas cuando se abre la pestaña
    if (this.detalleSeguimiento && this.detalleSeguimiento.length > 0) {
      console.log('Cargando tareas en PestTareas()');
      this.GetMisTareas(this.detalleSeguimiento);
    } else {
      console.warn('No hay detalleSeguimiento disponible para cargar tareas');
    }
  }

  PestGantt() {
    this.rowSeguimiento = false;
    this.rowBitDoc = false;
    this.rowSSOMA = false;
    this.rowPac = false;
    this.rowTareas = false;
    this.rowGantt = true;
    this.rowControlAvance = false;
    this.rowControlHallazgos = false;
    $("#TabSeguimiento").attr("class", "nav-link")
    $("#TabBitDoc").attr("class", "nav-link")
    $("#TabSSOMA").attr("class", "nav-link")
    $("#TabPac").attr("class", "nav-link")
    $("#TabTareas").attr("class", "nav-link")
    $("#TabGantt").attr("class", "nav-link active")
    $("#TabControlAvance").attr("class", "nav-link")
    $("#TabControlHallazgos").attr("class", "nav-link")
  }

  PestControlAvance() {
    this.rowSeguimiento = false;
    this.rowBitDoc = false;
    this.rowSSOMA = false;
    this.rowPac = false;
    this.rowTareas = false;
    this.rowGantt = false;
    this.rowControlAvance = true;
    this.rowControlHallazgos = false;
    $("#TabSeguimiento").attr("class", "nav-link")
    $("#TabBitDoc").attr("class", "nav-link")
    $("#TabSSOMA").attr("class", "nav-link")
    $("#TabPac").attr("class", "nav-link")
    $("#TabTareas").attr("class", "nav-link")
    $("#TabGantt").attr("class", "nav-link")
    $("#TabControlAvance").attr("class", "nav-link active")
    $("#TabControlHallazgos").attr("class", "nav-link")
  }

  PestControlHallazgos() {
    this.rowSeguimiento = false;
    this.rowBitDoc = false;
    this.rowSSOMA = false;
    this.rowPac = false;
    this.rowTareas = false;
    this.rowGantt = false;
    this.rowControlAvance = false;
    this.rowControlHallazgos = true;
    $("#TabSeguimiento").attr("class", "nav-link")
    $("#TabBitDoc").attr("class", "nav-link")
    $("#TabSSOMA").attr("class", "nav-link")
    $("#TabPac").attr("class", "nav-link")
    $("#TabTareas").attr("class", "nav-link")
    $("#TabGantt").attr("class", "nav-link")
    $("#TabControlAvance").attr("class", "nav-link")
    $("#TabControlHallazgos").attr("class", "nav-link active")
  }

  ActualizaSP() {
    this.detalleSeguimiento = null;
    this.cargaDesplegable = false;
    this.ngOnInit();
  }

  ActualizaDoc() {
    this.verDoc = false;
    setTimeout(() => {
      this.verDoc = true;
    }, 1000);
  }

  ActualizaSSOMA() {
    this.verSSOMA = false;
    setTimeout(() => {
      this.verSSOMA = true;
    }, 1000);
  }

  ActualizaPac() {
    this.verPac = false;
    setTimeout(() => {
      this.verPac = true;
    }, 1000);
  }

  private GetMisTareas(detalleSP: any[]) {
    let filtro = detalleSP.map(tarea => tarea.idDetalleSubProyecto);
    console.log('Filtro de detalles de subproyecto:', filtro);
    
    this.getAllTareas().subscribe(result => {
      console.log('Tareas obtenidas:', result);
      
      if (!result || result.length === 0) {
        console.warn('No se obtuvieron tareas');
        this.Tareas = [];
        return;
      }

      const esJolivares = this.usuario.nombreUsuario && 
        this.usuario.nombreUsuario.toLowerCase().includes('jolivares');
      const esGerencia = this.perfilesUsuario.some(p => 
        p.idPerfil === 1 || p.idPerfil === 2 || p.idPerfil === 11
      );
      
      const puedeVerTodas = this.usuario && (esJolivares || esGerencia);
      console.log('Puede ver todas las tareas:', puedeVerTodas);

      let tareasFiltradasPorUsuario;
      
      if (puedeVerTodas) {
        tareasFiltradasPorUsuario = result.filter(tarea => tarea.idEstadoTarea == 1 || tarea.idEstadoTarea == 2);
      } else {
        tareasFiltradasPorUsuario = result.filter(tarea => {
          const estadoValido = tarea.idEstadoTarea == 1 || tarea.idEstadoTarea == 2;
          const esResponsable = tarea.idUsuarioResponsable == this.usuario.idUsuario;
          const esCreador = tarea.idUsuarioCreador == this.usuario.idUsuario;
          return estadoValido && (esResponsable || esCreador);
        });
      }
      
      console.log('Tareas filtradas por usuario:', tareasFiltradasPorUsuario.length);
      
      this.Tareas = this.filtrarTareas(tareasFiltradasPorUsuario, filtro);
      console.log('📋 Tareas finales para mostrar en este proyecto:', this.Tareas.length);
      
      this.sinTareasProyecto = this.Tareas.length === 0;
      
      if (this.sinTareasProyecto) {
        console.log('💡 Se mostrará mensaje explicativo: "No hay tareas específicas de este proyecto"');
      }
      
      if (this.tareaDestacada && this.Tareas.length > 0) {
        setTimeout(() => {
          this.scrollHaciaTareaDestacada();
        }, 500);
      }
    }, error => {
      console.error('Error al obtener tareas:', error);
      this.Tareas = [];
    });
  }

  recargarTareas() {
    console.log('🔄 Recargando tareas después de crear una nueva');
    this.GetMisTareas(this.detalleSeguimiento);
  }

  esTareaDestacada(tarea: mMis_Tareas): boolean {
    return this.tareaDestacada !== null && tarea.idTarea === this.tareaDestacada;
  }

  obtenerClasesFila(tarea: mMis_Tareas): string {
    let clases = '';
    if (this.esTareaDestacada(tarea)) {
      clases += 'tarea-destacada ';
    }
    return clases;
  }

  scrollHaciaTareaDestacada() {
    if (this.tareaDestacada) {
      const elemento = document.getElementById(`tarea-${this.tareaDestacada}`);
      if (elemento) {
        console.log('🎯 Haciendo scroll hacia tarea destacada:', this.tareaDestacada);
        elemento.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        setTimeout(() => {
          console.log('✨ Removiendo resaltado de tarea');
          this.tareaDestacada = null;
        }, 5000);
      }
    }
  }

  filtrarTareas(arrTareas: mMis_Tareas[], filtro: any[]): mMis_Tareas[] {
    console.log('🔍 Filtrando tareas por proyecto específico');
    console.log('Total tareas disponibles:', arrTareas ? arrTareas.length : 0);
    console.log('Filtro de IDs de detalleSubProyecto:', filtro);
    
    if (!arrTareas || arrTareas.length === 0) {
      console.log('❌ No hay tareas disponibles para filtrar');
      return [];
    }
    
    if (!filtro || filtro.length === 0) {
      console.log('❌ No hay filtro de proyecto definido');
      return [];
    }
    
    const tareasDelProyecto = arrTareas.filter(tarea => {
      const tieneDetalleValido = tarea.idDetalleSubProyecto !== null && 
                                tarea.idDetalleSubProyecto !== undefined && 
                                tarea.idDetalleSubProyecto !== 0;
      
      const perteneceAlProyecto = tieneDetalleValido && filtro.includes(tarea.idDetalleSubProyecto);
      
      if (perteneceAlProyecto) {
        console.log(`✅ Tarea #${tarea.idTarea} pertenece al proyecto (idDetalleSubProyecto: ${tarea.idDetalleSubProyecto})`);
      }
      
      return perteneceAlProyecto;
    });
    
    console.log(`📊 Resultado del filtrado:`);
    console.log(`- Tareas específicas del proyecto: ${tareasDelProyecto.length}`);
    
    const tareasGenerales = arrTareas.filter(tarea => 
      tarea.idDetalleSubProyecto === null || 
      tarea.idDetalleSubProyecto === undefined || 
      tarea.idDetalleSubProyecto === 0
    );
    
    if (tareasGenerales.length > 0) {
      console.log(`ℹ️ Hay ${tareasGenerales.length} tareas generales (sin proyecto específico) - no se muestran aquí`);
      console.log('💡 Las tareas generales se pueden ver en "Mis Tareas"');
    }
    
    if (tareasDelProyecto.length === 0) {
      console.log('🚨 No hay tareas específicas para este proyecto');
      console.log('💡 Para crear tareas de este proyecto, usa el botón "Crear Tarea" en esta pestaña');
    }
    
    return tareasDelProyecto;
  }

  loadEtapa(e) {
    this.idEtapa = e.idEtapa;
  }

  setInicioReal(e: mDetalleSubProyecto) {
    this.desplegable.agregaDuracionProyecto(e)
  }

  cargaPerfiles(): Observable<any> {

    let urlBase: string = 'http://trazas-nbi.com:1234/api/';
    let controlador: string = 'UsuariosPerfiles/';
    let urlFull: string = urlBase + controlador;

    if (!localStorage.hasOwnProperty('usuario')) {
      return null;
    } else {
      try {
        this.usuario = JSON.parse(localStorage.usuario);
        return this._http.get(urlFull + 'GetUsuariosPerfilesByIdUsuario/IdUsuario=' + this.usuario.idUsuario)
          .map((res: Response) => res.json())
      }
      catch (err) {
        console.error(err.message);
        return null;
      }
    }
  }

  private getAllTareas(): Observable<any> {
    console.log('Obteniendo tareas del proyecto con ID:', this.SubProyecto.idSubProyecto);
    
    return this._sMis_Tareas.getMis_TareasbyidSubProyecto(this.SubProyecto.idSubProyecto)
      .switchMap(tareas => {
        console.log('Tareas del proyecto obtenidas:', tareas ? tareas.length : 0);
        if (!tareas || tareas.length === 0) {
          console.log('No hay tareas específicas del proyecto, usando método alternativo');
          return this.getTareasAlternativo();
        }
        const observables = tareas.map(tarea => this.enrichTareaWithNames(tarea));
        return Observable.forkJoin(observables).catch(() => Observable.of([]));
      })
      .catch(error => {
        console.error('Error al obtener tareas del proyecto:', error);
        return this.getTareasAlternativo();
      });
  }

  private getTareasAlternativo(): Observable<any> {
    const esGerencia = this.perfilesUsuario.some(p => 
      p.idPerfil === 1 || p.idPerfil === 2 || p.idPerfil === 11
    );
    const esJolivares = this.usuario.nombreUsuario && 
      this.usuario.nombreUsuario.toLowerCase().includes('jolivares');

    if (esGerencia || esJolivares) {
      console.log('Usuario privilegiado: obteniendo todas las tareas para filtrar');
      return this._sMis_Tareas.getMis_Tareas().switchMap(tareas => {
        if (!tareas || tareas.length === 0) {
          return Observable.of([]);
        }
        const observables = tareas.map(tarea => this.enrichTareaWithNames(tarea));
        return Observable.forkJoin(observables).catch(() => Observable.of([]));
      }).catch(() => {
        console.warn('Error al obtener todas las tareas, usando tareas del usuario');
        return this._spMis_Tareas.getMis_TareasbyIdUsuario(this.usuario.idUsuario);
      });
    } else {
      console.log('Usuario normal: obteniendo solo tareas del usuario');
      return this._spMis_Tareas.getMis_TareasbyIdUsuario(this.usuario.idUsuario);
    }
  }

  private enrichTareaWithNames(tarea: any): Observable<any> {
    if (tarea.UsuarioResponsable && tarea.UsuarioCreador) {
      return Observable.of(tarea);
    }

    const responsableObs = tarea.idUsuarioResponsable ? 
      this._sUsuario.getUsuariobyID(tarea.idUsuarioResponsable).catch(() => Observable.of({nombreUsuario: 'Usuario no encontrado'})) :
      Observable.of({nombreUsuario: 'Sin asignar'});
      
    const creadorObs = tarea.idUsuarioCreador ? 
      this._sUsuario.getUsuariobyID(tarea.idUsuarioCreador).catch(() => Observable.of({nombreUsuario: 'Usuario no encontrado'})) :
      Observable.of({nombreUsuario: 'Sin creador'});

    return Observable.forkJoin(responsableObs, creadorObs)
      .map(([responsable, creador]: [any, any]) => {
        return {
          ...tarea,
          UsuarioResponsable: responsable.nombreUsuario || 'Usuario no encontrado',
          UsuarioCreador: creador.nombreUsuario || 'Usuario no encontrado'
        };
      })
      .catch(() => Observable.of({
        ...tarea,
        UsuarioResponsable: 'Error al cargar',
        UsuarioCreador: 'Error al cargar'
      }));
  }

}