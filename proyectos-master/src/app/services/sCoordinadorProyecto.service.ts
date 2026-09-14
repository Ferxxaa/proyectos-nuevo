import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mCoordinadorProyecto } from '../models/mCoordinadorProyecto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sCoordinadorProyecto{

    constructor(
        public _http : Http
    ){}

    getCoordinadorProyecto(): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadorProyecto').map((res: Response) => res.json());
    }

    getCoordinadorProyectobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadorProyecto/'+_id).map((res: Response) => res.json());
    }

    getCoordinadorProyectobyidCoordinadorProyecto(_idCoordinadorProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadorProyecto/GetCoordinadorProyectobyidCoordinadorProyecto/idCoordinadorProyecto='+_idCoordinadorProyecto).map((res: Response) => res.json());
    }

    getCoordinadorProyectobyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadorProyecto/GetCoordinadorProyectobyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getCoordinadorProyectobyidUsuarioCoordinador(_idUsuarioCoordinador:number): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadorProyecto/GetCoordinadorProyectobyidUsuarioCoordinador/idUsuarioCoordinador='+_idUsuarioCoordinador).map((res: Response) => res.json());
    }

    getCoordinadorProyectobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadorProyecto/GetCoordinadorProyectobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getCoordinadorProyectobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadorProyecto/GetCoordinadorProyectobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getCoordinadorProyectobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadorProyecto/GetCoordinadorProyectobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getCoordinadorProyectobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadorProyecto/GetCoordinadorProyectobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getCoordinadorProyectobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadorProyecto/GetCoordinadorProyectobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddCoordinadorProyecto(_CoordinadorProyecto:mCoordinadorProyecto):any{
        return $.post( configuracion.url+'CoordinadorProyecto', _CoordinadorProyecto )
    }

    postUpdDelCoordinadorProyecto(_CoordinadorProyecto:mCoordinadorProyecto):any{
        return $.post( configuracion.url+'CoordinadorProyecto/'+_CoordinadorProyecto.idCoordinadorProyecto, _CoordinadorProyecto )
    }
}
