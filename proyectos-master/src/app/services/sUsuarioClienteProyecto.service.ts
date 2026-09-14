import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mUsuarioClienteProyecto } from '../models/mUsuarioClienteProyecto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sUsuarioClienteProyecto{

    constructor(
        public _http : Http
    ){}

    getUsuarioClienteProyecto(): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioClienteProyecto').map((res: Response) => res.json());
    }

    getUsuarioClienteProyectobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioClienteProyecto/'+_id).map((res: Response) => res.json());
    }

    getUsuarioClienteProyectobyidUsuarioClienteProyecto(_idUsuarioClienteProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioClienteProyecto/GetUsuarioClienteProyectobyidUsuarioClienteProyecto/idUsuarioClienteProyecto='+_idUsuarioClienteProyecto).map((res: Response) => res.json());
    }

    getUsuarioClienteProyectobyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioClienteProyecto/GetUsuarioClienteProyectobyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getUsuarioClienteProyectobyidUsuarioCliente(_idUsuarioCliente:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioClienteProyecto/GetUsuarioClienteProyectobyidUsuarioCliente/idUsuarioCliente='+_idUsuarioCliente).map((res: Response) => res.json());
    }

    getUsuarioClienteProyectobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioClienteProyecto/GetUsuarioClienteProyectobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getUsuarioClienteProyectobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioClienteProyecto/GetUsuarioClienteProyectobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getUsuarioClienteProyectobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioClienteProyecto/GetUsuarioClienteProyectobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getUsuarioClienteProyectobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioClienteProyecto/GetUsuarioClienteProyectobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getUsuarioClienteProyectobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuarioClienteProyecto/GetUsuarioClienteProyectobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddUsuarioClienteProyecto(_UsuarioClienteProyecto:mUsuarioClienteProyecto):any{
        return $.post( configuracion.url+'UsuarioClienteProyecto', _UsuarioClienteProyecto )
    }

    postUpdDelUsuarioClienteProyecto(_UsuarioClienteProyecto:mUsuarioClienteProyecto):any{
        return $.post( configuracion.url+'UsuarioClienteProyecto/'+_UsuarioClienteProyecto.idUsuarioClienteProyecto, _UsuarioClienteProyecto )
    }
}
