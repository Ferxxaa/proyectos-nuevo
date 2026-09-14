import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogTipoDireccion } from '../models/mLogTipoDireccion';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogTipoDireccion{

    constructor(
        public _http : Http
    ){}

    getLogTipoDireccion(): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoDireccion').map((res: Response) => res.json());
    }

    getLogTipoDireccionbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoDireccion/'+_id).map((res: Response) => res.json());
    }

    getLogTipoDireccionbyidLogTipoDireccion(_idLogTipoDireccion:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoDireccion/GetLogTipoDireccionbyidLogTipoDireccion/idLogTipoDireccion='+_idLogTipoDireccion).map((res: Response) => res.json());
    }

    getLogTipoDireccionbyidTipoDireccion(_idTipoDireccion:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoDireccion/GetLogTipoDireccionbyidTipoDireccion/idTipoDireccion='+_idTipoDireccion).map((res: Response) => res.json());
    }

    getLogTipoDireccionbynombreTipoDireccion(_nombreTipoDireccion:string): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoDireccion/GetLogTipoDireccionbynombreTipoDireccion/nombreTipoDireccion='+_nombreTipoDireccion).map((res: Response) => res.json());
    }

    getLogTipoDireccionbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoDireccion/GetLogTipoDireccionbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogTipoDireccionbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoDireccion/GetLogTipoDireccionbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogTipoDireccionbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoDireccion/GetLogTipoDireccionbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogTipoDireccionbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoDireccion/GetLogTipoDireccionbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogTipoDireccionbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoDireccion/GetLogTipoDireccionbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogTipoDireccionbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoDireccion/GetLogTipoDireccionbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogTipoDireccion(_LogTipoDireccion:mLogTipoDireccion):any{
        return $.post( configuracion.url+'LogTipoDireccion', _LogTipoDireccion )
    }

    postUpdDelLogTipoDireccion(_LogTipoDireccion:mLogTipoDireccion):any{
        return $.post( configuracion.url+'LogTipoDireccion/'+_LogTipoDireccion.idLogTipoDireccion, _LogTipoDireccion )
    }
}
