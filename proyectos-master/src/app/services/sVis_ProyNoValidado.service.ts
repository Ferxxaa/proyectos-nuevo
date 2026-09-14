import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mVis_ProyNoValidado } from '../models/mVis_ProyNoValidado';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sVis_ProyNoValidado{

    constructor(
        public _http : Http
    ){}

    getVis_ProyNoValidado(): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyNoValidado').map((res: Response) => res.json());
    }

    getVis_ProyNoValidadobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyNoValidado/'+_id).map((res: Response) => res.json());
    }

    getVis_ProyNoValidadobyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyNoValidado/GetVis_ProyNoValidadobyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_ProyNoValidadobynombreProyectoMatriz(_nombreProyectoMatriz:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyNoValidado/GetVis_ProyNoValidadobynombreProyectoMatriz/nombreProyectoMatriz='+_nombreProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_ProyNoValidadobyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyNoValidado/GetVis_ProyNoValidadobyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getVis_ProyNoValidadobynombreProyecto(_nombreProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyNoValidado/GetVis_ProyNoValidadobynombreProyecto/nombreProyecto='+_nombreProyecto).map((res: Response) => res.json());
    }

    getVis_ProyNoValidadobySubGerente(_SubGerente:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyNoValidado/GetVis_ProyNoValidadobySubGerente/SubGerente='+_SubGerente).map((res: Response) => res.json());
    }

    getVis_ProyNoValidadobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyNoValidado/GetVis_ProyNoValidadobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getVis_ProyNoValidadobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyNoValidado/GetVis_ProyNoValidadobyactivo/activo='+_activo).map((res: Response) => res.json());
    }
}
