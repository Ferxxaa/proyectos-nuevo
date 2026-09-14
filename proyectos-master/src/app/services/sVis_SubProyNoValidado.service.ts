import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mVis_SubProyNoValidado } from '../models/mVis_SubProyNoValidado';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sVis_SubProyNoValidado{

    constructor(
        public _http : Http
    ){}

    getVis_SubProyNoValidado(): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado').map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/'+_id).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobyidSubProyecto(_idSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobyidSubProyecto/idSubProyecto='+_idSubProyecto).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobynombreProyectoMatriz(_nombreProyectoMatriz:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobynombreProyectoMatriz/nombreProyectoMatriz='+_nombreProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobynombreProyecto(_nombreProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobynombreProyecto/nombreProyecto='+_nombreProyecto).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobyDirectorSP(_DirectorSP:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobyDirectorSP/DirectorSP='+_DirectorSP).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobynombreSubProyecto(_nombreSubProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobynombreSubProyecto/nombreSubProyecto='+_nombreSubProyecto).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobynombreEstadoProyecto(_nombreEstadoProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobynombreEstadoProyecto/nombreEstadoProyecto='+_nombreEstadoProyecto).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobynombreTipoIntervencion(_nombreTipoIntervencion:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobynombreTipoIntervencion/nombreTipoIntervencion='+_nombreTipoIntervencion).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobysuperficie(_superficie:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobysuperficie/superficie='+_superficie).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobyfechaInicio(_fechaInicio:Date): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobyfechaInicio/fechaInicio='+_fechaInicio).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobyidTipoIntervencion(_idTipoIntervencion:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobyidTipoIntervencion/idTipoIntervencion='+_idTipoIntervencion).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobyidEstadoProyecto(_idEstadoProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobyidEstadoProyecto/idEstadoProyecto='+_idEstadoProyecto).map((res: Response) => res.json());
    }

    getVis_SubProyNoValidadobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_SubProyNoValidado/GetVis_SubProyNoValidadobyactivo/activo='+_activo).map((res: Response) => res.json());
    }
}
