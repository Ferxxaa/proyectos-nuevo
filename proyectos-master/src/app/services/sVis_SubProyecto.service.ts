import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mVis_SubProyecto } from '../models/mVis_SubProyecto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sVis_SubProyecto{

    constructor(
        public _http : Http
    ){}

    getVis_SubProyecto(): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyecto').map((res: Response) => res.json());
    }

    getVis_SubProyectobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyecto/'+_id).map((res: Response) => res.json());
    }

    getVis_SubProyectobyidSubProyecto(_idSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyecto/GetVis_SubProyectobyidSubProyecto/idSubProyecto='+_idSubProyecto).map((res: Response) => res.json());
    }

    getVis_SubProyectobynombreProyectoMatriz(_nombreProyectoMatriz:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyecto/GetVis_SubProyectobynombreProyectoMatriz/nombreProyectoMatriz='+_nombreProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_SubProyectobynombreProyecto(_nombreProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyecto/GetVis_SubProyectobynombreProyecto/nombreProyecto='+_nombreProyecto).map((res: Response) => res.json());
    }

    getVis_SubProyectobynombreSubProyecto(_nombreSubProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyecto/GetVis_SubProyectobynombreSubProyecto/nombreSubProyecto='+_nombreSubProyecto).map((res: Response) => res.json());
    }

    getVis_SubProyectobynombreEstadoProyecto(_nombreEstadoProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyecto/GetVis_SubProyectobynombreEstadoProyecto/nombreEstadoProyecto='+_nombreEstadoProyecto).map((res: Response) => res.json());
    }

    getVis_SubProyectobynombreTipoIntervencion(_nombreTipoIntervencion:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyecto/GetVis_SubProyectobynombreTipoIntervencion/nombreTipoIntervencion='+_nombreTipoIntervencion).map((res: Response) => res.json());
    }

    getVis_SubProyectobysuperficie(_superficie:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyecto/GetVis_SubProyectobysuperficie/superficie='+_superficie).map((res: Response) => res.json());
    }

    getVis_SubProyectobyfechaInicio(_fechaInicio:Date): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyecto/GetVis_SubProyectobyfechaInicio/fechaInicio='+_fechaInicio).map((res: Response) => res.json());
    }

    getVis_SubProyectobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyecto/GetVis_SubProyectobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getVis_SubProyectobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyecto/GetVis_SubProyectobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getVis_SubProyectobyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyecto/GetVis_SubProyectobyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getVis_SubProyectobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyecto/GetVis_SubProyectobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }
}
