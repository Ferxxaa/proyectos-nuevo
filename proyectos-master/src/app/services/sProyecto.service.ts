import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mProyecto } from '../models/mProyecto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sProyecto{

    constructor(
        public _http : Http
    ){}

    getProyecto(): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto').map((res: Response) => res.json());
    }

    getProyectobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/'+_id).map((res: Response) => res.json());
    }

    getProyectobyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getProyectobyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getProyectobynombreProyecto(_nombreProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobynombreProyecto/nombreProyecto='+_nombreProyecto).map((res: Response) => res.json());
    }

    getProyectobyidUsuarioDirector(_idUsuarioDirector:number): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyidUsuarioDirector/idUsuarioDirector='+_idUsuarioDirector).map((res: Response) => res.json());
    }

    getProyectobyidUsuarioValidador(_idUsuarioValidador:number): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyidUsuarioValidador/idUsuarioValidador='+_idUsuarioValidador).map((res: Response) => res.json());
    }

    getProyectobyvalidado(_validado:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyvalidado/validado='+_validado).map((res: Response) => res.json());
    }

    getProyectobyfechaValidacion(_fechaValidacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyfechaValidacion/fechaValidacion='+_fechaValidacion).map((res: Response) => res.json());
    }

    getProyectobyidUsuarioAbortador(_idUsuarioAbortador:number): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyidUsuarioAbortador/idUsuarioAbortador='+_idUsuarioAbortador).map((res: Response) => res.json());
    }

    getProyectobyfechaAborto(_fechaAborto:Date): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyfechaAborto/fechaAborto='+_fechaAborto).map((res: Response) => res.json());
    }

    getProyectobyidEstadoProyecto(_idEstadoProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyidEstadoProyecto/idEstadoProyecto='+_idEstadoProyecto).map((res: Response) => res.json());
    }

    getProyectobyidRegion(_idRegion:number): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyidRegion/idRegion='+_idRegion).map((res: Response) => res.json());
    }

    getProyectobyfechaInicio(_fechaInicio:Date): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyfechaInicio/fechaInicio='+_fechaInicio).map((res: Response) => res.json());
    }

    getProyectobyfechaTermino(_fechaTermino:Date): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyfechaTermino/fechaTermino='+_fechaTermino).map((res: Response) => res.json());
    }

    getProyectobycentroCosto(_centroCosto:string): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobycentroCosto/centroCosto='+_centroCosto).map((res: Response) => res.json());
    }

    getProyectobycostoEstimado(_costoEstimado:number): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobycostoEstimado/costoEstimado='+_costoEstimado).map((res: Response) => res.json());
    }

    getProyectobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getProyectobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getProyectobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getProyectobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getProyectobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Proyecto/GetProyectobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddProyecto(_Proyecto:mProyecto):any{
        return $.post( configuracion.url+'Proyecto', _Proyecto )
    }

    postUpdDelProyecto(_Proyecto:mProyecto):any{
        return $.post( configuracion.url+'Proyecto/'+_Proyecto.idProyecto, _Proyecto )
    }
}
