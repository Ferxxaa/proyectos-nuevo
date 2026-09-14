import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogCoordinadorProyecto } from '../models/mLogCoordinadorProyecto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogCoordinadorProyecto{

    constructor(
        public _http : Http
    ){}

    getLogCoordinadorProyecto(): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadorProyecto').map((res: Response) => res.json());
    }

    getLogCoordinadorProyectobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadorProyecto/'+_id).map((res: Response) => res.json());
    }

    getLogCoordinadorProyectobyidLogCoordinadorProyecto(_idLogCoordinadorProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadorProyecto/GetLogCoordinadorProyectobyidLogCoordinadorProyecto/idLogCoordinadorProyecto='+_idLogCoordinadorProyecto).map((res: Response) => res.json());
    }

    getLogCoordinadorProyectobyidCoordinadorProyecto(_idCoordinadorProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadorProyecto/GetLogCoordinadorProyectobyidCoordinadorProyecto/idCoordinadorProyecto='+_idCoordinadorProyecto).map((res: Response) => res.json());
    }

    getLogCoordinadorProyectobyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadorProyecto/GetLogCoordinadorProyectobyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getLogCoordinadorProyectobyidUsuarioCoordinador(_idUsuarioCoordinador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadorProyecto/GetLogCoordinadorProyectobyidUsuarioCoordinador/idUsuarioCoordinador='+_idUsuarioCoordinador).map((res: Response) => res.json());
    }

    getLogCoordinadorProyectobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadorProyecto/GetLogCoordinadorProyectobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogCoordinadorProyectobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadorProyecto/GetLogCoordinadorProyectobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogCoordinadorProyectobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadorProyecto/GetLogCoordinadorProyectobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogCoordinadorProyectobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadorProyecto/GetLogCoordinadorProyectobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogCoordinadorProyectobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadorProyecto/GetLogCoordinadorProyectobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogCoordinadorProyecto(_LogCoordinadorProyecto:mLogCoordinadorProyecto):any{
        return $.post( configuracion.url+'LogCoordinadorProyecto', _LogCoordinadorProyecto )
    }

    postUpdDelLogCoordinadorProyecto(_LogCoordinadorProyecto:mLogCoordinadorProyecto):any{
        return $.post( configuracion.url+'LogCoordinadorProyecto/'+_LogCoordinadorProyecto.idLogCoordinadorProyecto, _LogCoordinadorProyecto )
    }
}
