import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mUsuarioSponsorCliente } from '../models/mUsuarioSponsorCliente';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sUsuarioSponsorCliente{

    constructor(
        public _http : Http
    ){}

    getUsuarioSponsorCliente(): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioSponsorCliente').map((res: Response) => res.json());
    }

    getUsuarioSponsorClientebyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioSponsorCliente/'+_id).map((res: Response) => res.json());
    }

    getUsuarioSponsorClientebyidUsuarioSponsorCliente(_idUsuarioSponsorCliente:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioSponsorCliente/GetUsuarioSponsorClientebyidUsuarioSponsorCliente/idUsuarioSponsorCliente='+_idUsuarioSponsorCliente).map((res: Response) => res.json());
    }

    getUsuarioSponsorClientebyidUsuario(_idUsuario:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioSponsorCliente/GetUsuarioSponsorClientebyidUsuario/idUsuario='+_idUsuario).map((res: Response) => res.json());
    }

    getUsuarioSponsorClientebyidSponsorCliente(_idSponsorCliente:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioSponsorCliente/GetUsuarioSponsorClientebyidSponsorCliente/idSponsorCliente='+_idSponsorCliente).map((res: Response) => res.json());
    }

    getUsuarioSponsorClientebyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioSponsorCliente/GetUsuarioSponsorClientebyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getUsuarioSponsorClientebyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioSponsorCliente/GetUsuarioSponsorClientebyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getUsuarioSponsorClientebyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioSponsorCliente/GetUsuarioSponsorClientebyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getUsuarioSponsorClientebyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioSponsorCliente/GetUsuarioSponsorClientebyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getUsuarioSponsorClientebyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioSponsorCliente/GetUsuarioSponsorClientebyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddUsuarioSponsorCliente(_UsuarioSponsorCliente:mUsuarioSponsorCliente):any{
        return $.post( configuracion.url+'UsuarioSponsorCliente', _UsuarioSponsorCliente )
    }

    postUpdDelUsuarioSponsorCliente(_UsuarioSponsorCliente:mUsuarioSponsorCliente):any{
        return $.post( configuracion.url+'UsuarioSponsorCliente/'+_UsuarioSponsorCliente.idUsuarioSponsorCliente, _UsuarioSponsorCliente )
    }
}
