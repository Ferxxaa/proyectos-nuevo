import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogMail } from '../models/mLogMail';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogMail{

    constructor(
        public _http : Http
    ){}

    getLogMail(): Observable<any>{
        return this._http.get(configuracion.url+'LogMail').map((res: Response) => res.json());
    }

    getLogMailbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMail/'+_id).map((res: Response) => res.json());
    }

    getLogMailbyidLogMail(_idLogMail:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMail/GetLogMailbyidLogMail/idLogMail='+_idLogMail).map((res: Response) => res.json());
    }

    getLogMailbyidMail(_idMail:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMail/GetLogMailbyidMail/idMail='+_idMail).map((res: Response) => res.json());
    }

    getLogMailbydireccionMail(_direccionMail:string): Observable<any>{
        return this._http.get(configuracion.url+'LogMail/GetLogMailbydireccionMail/direccionMail='+_direccionMail).map((res: Response) => res.json());
    }

    getLogMailbyidPersona(_idPersona:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMail/GetLogMailbyidPersona/idPersona='+_idPersona).map((res: Response) => res.json());
    }

    getLogMailbyidTipoMail(_idTipoMail:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMail/GetLogMailbyidTipoMail/idTipoMail='+_idTipoMail).map((res: Response) => res.json());
    }

    getLogMailbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogMail/GetLogMailbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogMailbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogMail/GetLogMailbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogMailbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogMail/GetLogMailbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogMailbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMail/GetLogMailbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogMailbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMail/GetLogMailbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogMail(_LogMail:mLogMail):any{
        return $.post( configuracion.url+'LogMail', _LogMail )
    }

    postUpdDelLogMail(_LogMail:mLogMail):any{
        return $.post( configuracion.url+'LogMail/'+_LogMail.idLogMail, _LogMail )
    }
}
