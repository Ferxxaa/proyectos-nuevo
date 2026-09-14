import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogUsuarioSponsorCliente } from '../models/mLogUsuarioSponsorCliente';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogUsuarioSponsorCliente{

    constructor(
        public _http : Http
    ){}

    getLogUsuarioSponsorCliente(): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioSponsorCliente').map((res: Response) => res.json());
    }

    getLogUsuarioSponsorClientebyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioSponsorCliente/'+_id).map((res: Response) => res.json());
    }

    getLogUsuarioSponsorClientebyidLogUsuarioSponsorCliente(_idLogUsuarioSponsorCliente:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioSponsorCliente/GetLogUsuarioSponsorClientebyidLogUsuarioSponsorCliente/idLogUsuarioSponsorCliente='+_idLogUsuarioSponsorCliente).map((res: Response) => res.json());
    }

    getLogUsuarioSponsorClientebyidUsuarioSponsorCliente(_idUsuarioSponsorCliente:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioSponsorCliente/GetLogUsuarioSponsorClientebyidUsuarioSponsorCliente/idUsuarioSponsorCliente='+_idUsuarioSponsorCliente).map((res: Response) => res.json());
    }

    getLogUsuarioSponsorClientebyidUsuario(_idUsuario:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioSponsorCliente/GetLogUsuarioSponsorClientebyidUsuario/idUsuario='+_idUsuario).map((res: Response) => res.json());
    }

    getLogUsuarioSponsorClientebyidSponsorCliente(_idSponsorCliente:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioSponsorCliente/GetLogUsuarioSponsorClientebyidSponsorCliente/idSponsorCliente='+_idSponsorCliente).map((res: Response) => res.json());
    }

    getLogUsuarioSponsorClientebyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioSponsorCliente/GetLogUsuarioSponsorClientebyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogUsuarioSponsorClientebyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioSponsorCliente/GetLogUsuarioSponsorClientebyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogUsuarioSponsorClientebyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioSponsorCliente/GetLogUsuarioSponsorClientebyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogUsuarioSponsorClientebyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioSponsorCliente/GetLogUsuarioSponsorClientebyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogUsuarioSponsorClientebyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioSponsorCliente/GetLogUsuarioSponsorClientebyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogUsuarioSponsorCliente(_LogUsuarioSponsorCliente:mLogUsuarioSponsorCliente):any{
        return $.post( configuracion.url+'LogUsuarioSponsorCliente', _LogUsuarioSponsorCliente )
    }

    postUpdDelLogUsuarioSponsorCliente(_LogUsuarioSponsorCliente:mLogUsuarioSponsorCliente):any{
        return $.post( configuracion.url+'LogUsuarioSponsorCliente/'+_LogUsuarioSponsorCliente.idLogUsuarioSponsorCliente, _LogUsuarioSponsorCliente )
    }
}
