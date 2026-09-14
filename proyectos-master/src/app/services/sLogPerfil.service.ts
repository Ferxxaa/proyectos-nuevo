import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogPerfil } from '../models/mLogPerfil';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogPerfil{

    constructor(
        public _http : Http
    ){}

    getLogPerfil(): Observable<any>{
        return this._http.get(configuracion.url+'LogPerfil').map((res: Response) => res.json());
    }

    getLogPerfilbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPerfil/'+_id).map((res: Response) => res.json());
    }

    getLogPerfilbyidLogPerfil(_idLogPerfil:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPerfil/GetLogPerfilbyidLogPerfil/idLogPerfil='+_idLogPerfil).map((res: Response) => res.json());
    }

    getLogPerfilbyidPerfil(_idPerfil:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPerfil/GetLogPerfilbyidPerfil/idPerfil='+_idPerfil).map((res: Response) => res.json());
    }

    getLogPerfilbynombrePerfil(_nombrePerfil:string): Observable<any>{
        return this._http.get(configuracion.url+'LogPerfil/GetLogPerfilbynombrePerfil/nombrePerfil='+_nombrePerfil).map((res: Response) => res.json());
    }

    getLogPerfilbydescripconPerfil(_descripconPerfil:string): Observable<any>{
        return this._http.get(configuracion.url+'LogPerfil/GetLogPerfilbydescripconPerfil/descripconPerfil='+_descripconPerfil).map((res: Response) => res.json());
    }

    getLogPerfilbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogPerfil/GetLogPerfilbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogPerfilbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogPerfil/GetLogPerfilbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogPerfilbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogPerfil/GetLogPerfilbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogPerfilbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPerfil/GetLogPerfilbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogPerfilbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPerfil/GetLogPerfilbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogPerfil(_LogPerfil:mLogPerfil):any{
        return $.post( configuracion.url+'LogPerfil', _LogPerfil )
    }

    postUpdDelLogPerfil(_LogPerfil:mLogPerfil):any{
        return $.post( configuracion.url+'LogPerfil/'+_LogPerfil.idLogPerfil, _LogPerfil )
    }
}
