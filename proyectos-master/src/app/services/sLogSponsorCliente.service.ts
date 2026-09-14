import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogSponsorCliente } from '../models/mLogSponsorCliente';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogSponsorCliente{

    constructor(
        public _http : Http
    ){}

    getLogSponsorCliente(): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsorCliente').map((res: Response) => res.json());
    }

    getLogSponsorClientebyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsorCliente/'+_id).map((res: Response) => res.json());
    }

    getLogSponsorClientebyidLogSponsorCliente(_idLogSponsorCliente:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsorCliente/GetLogSponsorClientebyidLogSponsorCliente/idLogSponsorCliente='+_idLogSponsorCliente).map((res: Response) => res.json());
    }

    getLogSponsorClientebyidSponsorCliente(_idSponsorCliente:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsorCliente/GetLogSponsorClientebyidSponsorCliente/idSponsorCliente='+_idSponsorCliente).map((res: Response) => res.json());
    }

    getLogSponsorClientebynombreSponsorCliente(_nombreSponsorCliente:string): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsorCliente/GetLogSponsorClientebynombreSponsorCliente/nombreSponsorCliente='+_nombreSponsorCliente).map((res: Response) => res.json());
    }

    getLogSponsorClientebyrutaSponsorCliente(_rutaSponsorCliente:string): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsorCliente/GetLogSponsorClientebyrutaSponsorCliente/rutaSponsorCliente='+_rutaSponsorCliente).map((res: Response) => res.json());
    }

    getLogSponsorClientebylogoSponsorCliente(_logoSponsorCliente:string): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsorCliente/GetLogSponsorClientebylogoSponsorCliente/logoSponsorCliente='+_logoSponsorCliente).map((res: Response) => res.json());
    }

    getLogSponsorClientebyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsorCliente/GetLogSponsorClientebyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogSponsorClientebyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsorCliente/GetLogSponsorClientebyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogSponsorClientebyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsorCliente/GetLogSponsorClientebyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogSponsorClientebyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsorCliente/GetLogSponsorClientebyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogSponsorClientebyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsorCliente/GetLogSponsorClientebyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogSponsorClientebyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsorCliente/GetLogSponsorClientebyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogSponsorCliente(_LogSponsorCliente:mLogSponsorCliente):any{
        return $.post( configuracion.url+'LogSponsorCliente', _LogSponsorCliente )
    }

    postUpdDelLogSponsorCliente(_LogSponsorCliente:mLogSponsorCliente):any{
        return $.post( configuracion.url+'LogSponsorCliente/'+_LogSponsorCliente.idLogSponsorCliente, _LogSponsorCliente )
    }
}
