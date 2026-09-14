import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mTabla_SubProyecto } from '../models/mTabla_SubProyecto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sTabla_SubProyecto{

    constructor(
        public _http : Http
    ){}

    getTabla_SubProyecto(): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto').map((res: Response) => res.json());
    }

    getTabla_SubProyectobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/'+_id).map((res: Response) => res.json());
    }

    getTabla_SubProyectobyidUsuarioCoordinador(_idUsuarioCoordinador:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/GetTabla_SubProyectobyidUsuarioCoordinador/idUsuarioCoordinador='+_idUsuarioCoordinador).map((res: Response) => res.json());
    }

    getTabla_SubProyectobyidSubProyecto(_idSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/GetTabla_SubProyectobyidSubProyecto/idSubProyecto='+_idSubProyecto).map((res: Response) => res.json());
    }

    getTabla_SubProyectobynombreProyectoMatriz(_nombreProyectoMatriz:string): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/GetTabla_SubProyectobynombreProyectoMatriz/nombreProyectoMatriz='+_nombreProyectoMatriz).map((res: Response) => res.json());
    }

    getTabla_SubProyectobynombreProyecto(_nombreProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/GetTabla_SubProyectobynombreProyecto/nombreProyecto='+_nombreProyecto).map((res: Response) => res.json());
    }

    getTabla_SubProyectobynombreSubProyecto(_nombreSubProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/GetTabla_SubProyectobynombreSubProyecto/nombreSubProyecto='+_nombreSubProyecto).map((res: Response) => res.json());
    }

    getTabla_SubProyectobynombreEstadoProyecto(_nombreEstadoProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/GetTabla_SubProyectobynombreEstadoProyecto/nombreEstadoProyecto='+_nombreEstadoProyecto).map((res: Response) => res.json());
    }

    getTabla_SubProyectobynombreTipoIntervencion(_nombreTipoIntervencion:string): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/GetTabla_SubProyectobynombreTipoIntervencion/nombreTipoIntervencion='+_nombreTipoIntervencion).map((res: Response) => res.json());
    }

    getTabla_SubProyectobysuperficie(_superficie:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/GetTabla_SubProyectobysuperficie/superficie='+_superficie).map((res: Response) => res.json());
    }

    getTabla_SubProyectobyfechaInicio(_fechaInicio:Date): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/GetTabla_SubProyectobyfechaInicio/fechaInicio='+_fechaInicio).map((res: Response) => res.json());
    }

    getTabla_SubProyectobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/GetTabla_SubProyectobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getTabla_SubProyectobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/GetTabla_SubProyectobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getTabla_SubProyectobyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/GetTabla_SubProyectobyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getTabla_SubProyectobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/GetTabla_SubProyectobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getTabla_SubProyectobynombre(_nombre:string): Observable<any>{
        return this._http.get(configuracion.url+'Tabla_SubProyecto/GetTabla_SubProyectobynombre/nombre='+_nombre).map((res: Response) => res.json());
    }
}
