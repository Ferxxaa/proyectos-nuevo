import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mTabla_Proyectos } from '../models/mTabla_Proyectos';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sTabla_Proyectos{

    constructor(
        public _http : Http
    ){}

    getTabla_Proyectos(): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_Proyectos').map((res: Response) => res.json());
    }

    getTabla_ProyectosbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_Proyectos/'+_id).map((res: Response) => res.json());
    }

    getTabla_ProyectosbyidUsuarioDirector(_idUsuarioDirector:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_Proyectos/GetTabla_ProyectosbyidUsuarioDirector/idUsuarioDirector='+_idUsuarioDirector).map((res: Response) => res.json());
    }

    getTabla_ProyectosbyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_Proyectos/GetTabla_ProyectosbyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getTabla_ProyectosbyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_Proyectos/GetTabla_ProyectosbyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getTabla_ProyectosbynombreProyectoMatriz(_nombreProyectoMatriz:string): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_Proyectos/GetTabla_ProyectosbynombreProyectoMatriz/nombreProyectoMatriz='+_nombreProyectoMatriz).map((res: Response) => res.json());
    }

    getTabla_ProyectosbynombreProyecto(_nombreProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_Proyectos/GetTabla_ProyectosbynombreProyecto/nombreProyecto='+_nombreProyecto).map((res: Response) => res.json());
    }

    getTabla_ProyectosbyDirector(_Director:string): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_Proyectos/GetTabla_ProyectosbyDirector/Director='+_Director).map((res: Response) => res.json());
    }

    getTabla_ProyectosbycostoEstimado(_costoEstimado:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_Proyectos/GetTabla_ProyectosbycostoEstimado/costoEstimado='+_costoEstimado).map((res: Response) => res.json());
    }

    getTabla_ProyectosbyClientes(_Clientes:String): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_Proyectos/GetTabla_ProyectosbyClientes/Clientes='+_Clientes).map((res: Response) => res.json());
    }

    getTabla_ProyectosbyCoordinadores(_Coordinadores:String): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_Proyectos/GetTabla_ProyectosbyCoordinadores/Coordinadores='+_Coordinadores).map((res: Response) => res.json());
    }

    getTabla_ProyectosbyfechaInicio(_fechaInicio:Date): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_Proyectos/GetTabla_ProyectosbyfechaInicio/fechaInicio='+_fechaInicio).map((res: Response) => res.json());
    }

    getTabla_ProyectosbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_Proyectos/GetTabla_ProyectosbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getTabla_Proyectosbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_Proyectos/GetTabla_Proyectosbyactivo/activo='+_activo).map((res: Response) => res.json());
    }
}
