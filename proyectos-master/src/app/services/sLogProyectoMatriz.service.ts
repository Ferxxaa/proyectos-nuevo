import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogProyectoMatriz } from '../models/mLogProyectoMatriz';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogProyectoMatriz{

    constructor(
        public _http : Http
    ){}

    getLogProyectoMatriz(): Observable<any>{
        return this._http.get(configuracion.url+'LogProyectoMatriz').map((res: Response) => res.json());
    }

    getLogProyectoMatrizbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyectoMatriz/'+_id).map((res: Response) => res.json());
    }

    getLogProyectoMatrizbyidLogProyectoMatriz(_idLogProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyectoMatriz/GetLogProyectoMatrizbyidLogProyectoMatriz/idLogProyectoMatriz='+_idLogProyectoMatriz).map((res: Response) => res.json());
    }

    getLogProyectoMatrizbyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyectoMatriz/GetLogProyectoMatrizbyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getLogProyectoMatrizbynombreProyectoMatriz(_nombreProyectoMatriz:string): Observable<any>{
        return this._http.get(configuracion.url+'LogProyectoMatriz/GetLogProyectoMatrizbynombreProyectoMatriz/nombreProyectoMatriz='+_nombreProyectoMatriz).map((res: Response) => res.json());
    }

    getLogProyectoMatrizbyidSponsorCliente(_idSponsorCliente:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyectoMatriz/GetLogProyectoMatrizbyidSponsorCliente/idSponsorCliente='+_idSponsorCliente).map((res: Response) => res.json());
    }

    getLogProyectoMatrizbyidUsuarioSubGerente(_idUsuarioSubGerente:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyectoMatriz/GetLogProyectoMatrizbyidUsuarioSubGerente/idUsuarioSubGerente='+_idUsuarioSubGerente).map((res: Response) => res.json());
    }

    getLogProyectoMatrizbyidEstadoProyecto(_idEstadoProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyectoMatriz/GetLogProyectoMatrizbyidEstadoProyecto/idEstadoProyecto='+_idEstadoProyecto).map((res: Response) => res.json());
    }

    getLogProyectoMatrizbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogProyectoMatriz/GetLogProyectoMatrizbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogProyectoMatrizbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogProyectoMatriz/GetLogProyectoMatrizbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogProyectoMatrizbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogProyectoMatriz/GetLogProyectoMatrizbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogProyectoMatrizbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyectoMatriz/GetLogProyectoMatrizbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogProyectoMatrizbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProyectoMatriz/GetLogProyectoMatrizbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogProyectoMatriz(_LogProyectoMatriz:mLogProyectoMatriz):any{
        return $.post( configuracion.url+'LogProyectoMatriz', _LogProyectoMatriz )
    }

    postUpdDelLogProyectoMatriz(_LogProyectoMatriz:mLogProyectoMatriz):any{
        return $.post( configuracion.url+'LogProyectoMatriz/'+_LogProyectoMatriz.idLogProyectoMatriz, _LogProyectoMatriz )
    }
}
