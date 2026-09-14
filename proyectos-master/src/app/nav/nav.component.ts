import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Http, Response, Headers } from '@angular/http';
import { Alert } from 'selenium-webdriver';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent implements OnInit {

  isHomeRoute: boolean = false;
  isProyectosRoute: boolean = false;
  isLicitacionesRoute: boolean = false;
  isTareasRoute: boolean = false;

  //Perfiles
  Sistema: boolean;
  Cliente: boolean;

  //Proyectos
  DirectorProy: boolean;
  CoordinadorProy: boolean;
  SubGerenteProy: boolean;
  Seguridad: boolean;

  //Licitaciones
  DirectorLic: boolean;
  CoordinadorLic: boolean;

  //Finanzas
  Administracion: boolean;
  JefeAdministracion: boolean;
  GerenteAdmin: boolean;

  //Modal de permisos
  mostrarModalPermiso: boolean = false;

  usuario: any = {};
  perfiles: any = [];

  urlBase: string = 'http://trazas-nbi.com:1234/api/'
  controlador: string = 'UsuariosPerfiles/'
  urlFull: string = this.urlBase + this.controlador

  constructor(private _http: Http, private router: Router) {
    this.Sistema = false;
    this.Cliente = false;
    this.DirectorProy = false;
    this.CoordinadorProy = false;
    this.SubGerenteProy = false;
    this.Seguridad = false;
    this.DirectorLic = false;
    this.CoordinadorLic = false;
    this.Administracion = false;
    this.GerenteAdmin = false;
   }

  ngOnInit() {

    this.updateIsHomeRoute(this.router.url);
    this.updateFromWindowLocation();
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateIsHomeRoute(event.urlAfterRedirects || event.url);
      }
    });

    if (!localStorage.hasOwnProperty('usuario')) {
      console.log("usuario no logueado");
    } else {
      try {
        this.usuario = JSON.parse(localStorage.usuario);
        this._http.get(this.urlFull + 'GetUsuariosPerfilesByIdUsuario/IdUsuario=' + this.usuario.idUsuario)
          .map((res: Response) => res.json())
          .subscribe(data => {
            console.log('Perfiles del usuario:', data); // <-- temporal, para verificar formato

            data.forEach(element => {
              if (element.idPerfil == 1) this.SubGerenteProy = true;
              if (element.idPerfil == 2) this.DirectorProy = true;
              if (element.idPerfil == 3) this.CoordinadorProy = true;
              if (element.idPerfil == 4) this.Sistema = true;
              if (element.idPerfil == 5 || element.idPerfil == 'Clientes') this.Cliente = true;
              if (element.idPerfil == 7) this.DirectorLic = true;
              if (element.idPerfil == 8) this.CoordinadorLic = true;
              if (element.idPerfil == 9) this.Seguridad = true;
              if (element.idPerfil == 10) this.Administracion = true;
              if (element.idPerfil == 11) this.GerenteAdmin = true;
              if (element.idPerfil == 12) this.JefeAdministracion = true;
            });
          });
      }
      catch (err) {
        console.log(err.message);
      }
    }
  }

  getGerente(){
    return this.SubGerenteProy;
  }

  // Intercepta clics en secciones restringidas para el rol Cliente
  bloquearAcceso(event: Event) {
    if (this.Cliente) {
      event.preventDefault();
      this.mostrarModalPermiso = true;
    }
  }

  cerrarModalPermiso() {
    this.mostrarModalPermiso = false;
  }

  private updateIsHomeRoute(url: string) {
    const normalized = (url || '').split('?')[0].split('#')[0];
    this.isHomeRoute = normalized === '/Home' || normalized.startsWith('/Home/');
    
    // Detectar sección de Proyectos (incluye Tablero-Control y Gráfico Estructural)
    this.isProyectosRoute = normalized.includes('/Proyectos-') || 
                            normalized.includes('/Configuracion-') ||
                            normalized.includes('/Tablero-Control') ||
                            normalized.includes('/Proyecto-TableroControl') ||
                            normalized.includes('/Grafico-Estructural') ||
                            normalized.includes('/Validacion-Cierre');
    
    // Detectar sección de Licitaciones
    this.isLicitacionesRoute = normalized.includes('/Licitacion-') || 
                               normalized.includes('/Reporte-Licitaciones');
    
    // Detectar sección de Tareas
    this.isTareasRoute = normalized.includes('/Ver-Tareas') || 
                         normalized.includes('/Calendario-Tareas');
  }

  private updateFromWindowLocation() {
    const currentPath = window.location.pathname;
    
    // Detectar sección de Proyectos desde URL externa (incluye Tablero-Control y Gráfico Estructural)
    if (currentPath.includes('/Proyectos-') || currentPath.includes('/Configuracion-') || currentPath.includes('/Tablero-Control') || currentPath.includes('/Proyecto-TableroControl') || currentPath.includes('/Grafico-Estructural') || currentPath.includes('/Validacion-Cierre')) {
      this.isProyectosRoute = true;
    }
    
    // Detectar sección de Licitaciones desde URL externa
    if (currentPath.includes('/Licitacion-') || currentPath.includes('/Reporte-Licitaciones')) {
      this.isLicitacionesRoute = true;
    }
    
    // Detectar sección de Tareas desde URL externa
    if (currentPath.includes('/Ver-Tareas') || currentPath.includes('/Calendario-Tareas')) {
      this.isTareasRoute = true;
    }
  }

}