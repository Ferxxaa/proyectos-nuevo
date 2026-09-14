import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogPais } from '../models/mLogPais';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogPais{

    constructor(
        public _http : Http
    ){}

    getLogPais(): Observable<any>{
        return this._http.get(configuracion.url+'LogPais').map((res: Response) => res.json());
    }

    getLogPaisbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPais/'+_id).map((res: Response) => res.json());
    }

    getLogPaisbyidLogPais(_idLogPais:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPais/GetLogPaisbyidLogPais/idLogPais='+_idLogPais).map((res: Response) => res.json());
    }

    getLogPaisbyidPais(_idPais:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPais/GetLogPaisbyidPais/idPais='+_idPais).map((res: Response) => res.json());
    }

    getLogPaisbynombrePais(_nombrePais:string): Observable<any>{
        return this._http.get(configuracion.url+'LogPais/GetLogPaisbynombrePais/nombrePais='+_nombrePais).map((res: Response) => res.json());
    }

    getLogPaisbycultura(_cultura:string): Observable<any>{
        return this._http.get(configuracion.url+'LogPais/GetLogPaisbycultura/cultura='+_cultura).map((res: Response) => res.json());
    }

    getLogPaisbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogPais/GetLogPaisbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogPaisbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogPais/GetLogPaisbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogPaisbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogPais/GetLogPaisbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogPaisbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPais/GetLogPaisbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogPaisbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPais/GetLogPaisbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogPais(_LogPais:mLogPais):any{
        return $.post( configuracion.url+'LogPais', _LogPais )
    }

    postUpdDelLogPais(_LogPais:mLogPais):any{
        return $.post( configuracion.url+'LogPais/'+_LogPais.idLogPais, _LogPais )
    }
}
