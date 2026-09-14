import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogPagina } from '../models/mLogPagina';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogPagina{

    constructor(
        public _http : Http
    ){}

    getLogPagina(): Observable<any>{
        return this._http.get(configuracion.url+'LogPagina').map((res: Response) => res.json());
    }

    getLogPaginabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPagina/'+_id).map((res: Response) => res.json());
    }

    getLogPaginabyidLogPagina(_idLogPagina:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPagina/GetLogPaginabyidLogPagina/idLogPagina='+_idLogPagina).map((res: Response) => res.json());
    }

    getLogPaginabyidPagina(_idPagina:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPagina/GetLogPaginabyidPagina/idPagina='+_idPagina).map((res: Response) => res.json());
    }

    getLogPaginabynombrePagina(_nombrePagina:string): Observable<any>{
        return this._http.get(configuracion.url+'LogPagina/GetLogPaginabynombrePagina/nombrePagina='+_nombrePagina).map((res: Response) => res.json());
    }

    getLogPaginabyruta(_ruta:string): Observable<any>{
        return this._http.get(configuracion.url+'LogPagina/GetLogPaginabyruta/ruta='+_ruta).map((res: Response) => res.json());
    }

    getLogPaginabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogPagina/GetLogPaginabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogPaginabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogPagina/GetLogPaginabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogPaginabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogPagina/GetLogPaginabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogPaginabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPagina/GetLogPaginabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogPaginabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPagina/GetLogPaginabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogPagina(_LogPagina:mLogPagina):any{
        return $.post( configuracion.url+'LogPagina', _LogPagina )
    }

    postUpdDelLogPagina(_LogPagina:mLogPagina):any{
        return $.post( configuracion.url+'LogPagina/'+_LogPagina.idLogPagina, _LogPagina )
    }
}
