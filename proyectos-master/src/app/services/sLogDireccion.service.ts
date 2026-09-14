import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogDireccion } from '../models/mLogDireccion';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogDireccion{

    constructor(
        public _http : Http
    ){}

    getLogDireccion(): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion').map((res: Response) => res.json());
    }

    getLogDireccionbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion/'+_id).map((res: Response) => res.json());
    }

    getLogDireccionbyidLogDireccion(_idLogDireccion:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion/GetLogDireccionbyidLogDireccion/idLogDireccion='+_idLogDireccion).map((res: Response) => res.json());
    }

    getLogDireccionbyidDireccion(_idDireccion:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion/GetLogDireccionbyidDireccion/idDireccion='+_idDireccion).map((res: Response) => res.json());
    }

    getLogDireccionbycalle(_calle:string): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion/GetLogDireccionbycalle/calle='+_calle).map((res: Response) => res.json());
    }

    getLogDireccionbynumero(_numero:string): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion/GetLogDireccionbynumero/numero='+_numero).map((res: Response) => res.json());
    }

    getLogDireccionbyreferencia(_referencia:string): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion/GetLogDireccionbyreferencia/referencia='+_referencia).map((res: Response) => res.json());
    }

    getLogDireccionbyidComuna(_idComuna:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion/GetLogDireccionbyidComuna/idComuna='+_idComuna).map((res: Response) => res.json());
    }

    getLogDireccionbyidTipoDireccion(_idTipoDireccion:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion/GetLogDireccionbyidTipoDireccion/idTipoDireccion='+_idTipoDireccion).map((res: Response) => res.json());
    }

    getLogDireccionbyidPersona(_idPersona:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion/GetLogDireccionbyidPersona/idPersona='+_idPersona).map((res: Response) => res.json());
    }

    getLogDireccionbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion/GetLogDireccionbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogDireccionbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion/GetLogDireccionbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogDireccionbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion/GetLogDireccionbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogDireccionbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion/GetLogDireccionbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogDireccionbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDireccion/GetLogDireccionbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogDireccion(_LogDireccion:mLogDireccion):any{
        return $.post( configuracion.url+'LogDireccion', _LogDireccion )
    }

    postUpdDelLogDireccion(_LogDireccion:mLogDireccion):any{
        return $.post( configuracion.url+'LogDireccion/'+_LogDireccion.idLogDireccion, _LogDireccion )
    }
}
