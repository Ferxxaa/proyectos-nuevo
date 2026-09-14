import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogProyecto } from '../models/mLogProyecto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogProyecto{

    constructor(
        public _http : Http
    ){}

    getLogProyecto(): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto').map((res: Response) => res.json());
    }

    getLogProyectobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/'+_id).map((res: Response) => res.json());
    }

    getLogProyectobyidLogProyecto(_idLogProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyidLogProyecto/idLogProyecto='+_idLogProyecto).map((res: Response) => res.json());
    }

    getLogProyectobyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getLogProyectobyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getLogProyectobynombreProyecto(_nombreProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobynombreProyecto/nombreProyecto='+_nombreProyecto).map((res: Response) => res.json());
    }

    getLogProyectobyidUsuarioDirector(_idUsuarioDirector:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyidUsuarioDirector/idUsuarioDirector='+_idUsuarioDirector).map((res: Response) => res.json());
    }

    getLogProyectobyidUsuarioValidador(_idUsuarioValidador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyidUsuarioValidador/idUsuarioValidador='+_idUsuarioValidador).map((res: Response) => res.json());
    }

    getLogProyectobyvalidado(_validado:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyvalidado/validado='+_validado).map((res: Response) => res.json());
    }

    getLogProyectobyfechaValidacion(_fechaValidacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyfechaValidacion/fechaValidacion='+_fechaValidacion).map((res: Response) => res.json());
    }

    getLogProyectobyidUsuarioAbortador(_idUsuarioAbortador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyidUsuarioAbortador/idUsuarioAbortador='+_idUsuarioAbortador).map((res: Response) => res.json());
    }

    getLogProyectobyfechaAborto(_fechaAborto:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyfechaAborto/fechaAborto='+_fechaAborto).map((res: Response) => res.json());
    }

    getLogProyectobyidEstadoProyecto(_idEstadoProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyidEstadoProyecto/idEstadoProyecto='+_idEstadoProyecto).map((res: Response) => res.json());
    }

    getLogProyectobyidRegion(_idRegion:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyidRegion/idRegion='+_idRegion).map((res: Response) => res.json());
    }

    getLogProyectobyfechaInicio(_fechaInicio:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyfechaInicio/fechaInicio='+_fechaInicio).map((res: Response) => res.json());
    }

    getLogProyectobyfechaTermino(_fechaTermino:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyfechaTermino/fechaTermino='+_fechaTermino).map((res: Response) => res.json());
    }

    getLogProyectobycentroCosto(_centroCosto:string): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobycentroCosto/centroCosto='+_centroCosto).map((res: Response) => res.json());
    }

    getLogProyectobycostoEstimado(_costoEstimado:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobycostoEstimado/costoEstimado='+_costoEstimado).map((res: Response) => res.json());
    }

    getLogProyectobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogProyectobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogProyectobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogProyectobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogProyectobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyecto/GetLogProyectobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogProyecto(_LogProyecto:mLogProyecto):any{
        return $.post( configuracion.url+'LogProyecto', _LogProyecto )
    }

    postUpdDelLogProyecto(_LogProyecto:mLogProyecto):any{
        return $.post( configuracion.url+'LogProyecto/'+_LogProyecto.idLogProyecto, _LogProyecto )
    }
}
