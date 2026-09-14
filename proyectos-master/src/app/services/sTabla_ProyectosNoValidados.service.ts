import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mTabla_ProyectosNoValidados } from '../models/mTabla_ProyectosNoValidados';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sTabla_ProyectosNoValidados{

    constructor(
        public _http : Http
    ){}

    getTabla_ProyectosNoValidados(): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_ProyectosNoValidados').map((res: Response) => res.json());
    }

    getTabla_ProyectosNoValidadosbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_ProyectosNoValidados/'+_id).map((res: Response) => res.json());
    }

    getTabla_ProyectosNoValidadosbyidUsuarioDirector(_idUsuarioDirector:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_ProyectosNoValidados/GetTabla_ProyectosNoValidadosbyidUsuarioDirector/idUsuarioDirector='+_idUsuarioDirector).map((res: Response) => res.json());
    }

    getTabla_ProyectosNoValidadosbyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_ProyectosNoValidados/GetTabla_ProyectosNoValidadosbyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getTabla_ProyectosNoValidadosbynombreProyectoMatriz(_nombreProyectoMatriz:string): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_ProyectosNoValidados/GetTabla_ProyectosNoValidadosbynombreProyectoMatriz/nombreProyectoMatriz='+_nombreProyectoMatriz).map((res: Response) => res.json());
    }

    getTabla_ProyectosNoValidadosbyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_ProyectosNoValidados/GetTabla_ProyectosNoValidadosbyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getTabla_ProyectosNoValidadosbynombreProyecto(_nombreProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_ProyectosNoValidados/GetTabla_ProyectosNoValidadosbynombreProyecto/nombreProyecto='+_nombreProyecto).map((res: Response) => res.json());
    }

    getTabla_ProyectosNoValidadosbySubGerente(_SubGerente:string): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_ProyectosNoValidados/GetTabla_ProyectosNoValidadosbySubGerente/SubGerente='+_SubGerente).map((res: Response) => res.json());
    }

    getTabla_ProyectosNoValidadosbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_ProyectosNoValidados/GetTabla_ProyectosNoValidadosbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getTabla_ProyectosNoValidadosbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_ProyectosNoValidados/GetTabla_ProyectosNoValidadosbyactivo/activo='+_activo).map((res: Response) => res.json());
    }
}
