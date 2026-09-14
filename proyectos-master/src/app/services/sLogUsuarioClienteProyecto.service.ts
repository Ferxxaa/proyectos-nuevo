import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogUsuarioClienteProyecto } from '../models/mLogUsuarioClienteProyecto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogUsuarioClienteProyecto{

    constructor(
        public _http : Http
    ){}

    getLogUsuarioClienteProyecto(): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioClienteProyecto').map((res: Response) => res.json());
    }

    getLogUsuarioClienteProyectobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioClienteProyecto/'+_id).map((res: Response) => res.json());
    }

    getLogUsuarioClienteProyectobyidLogUsuarioClienteProyecto(_idLogUsuarioClienteProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioClienteProyecto/GetLogUsuarioClienteProyectobyidLogUsuarioClienteProyecto/idLogUsuarioClienteProyecto='+_idLogUsuarioClienteProyecto).map((res: Response) => res.json());
    }

    getLogUsuarioClienteProyectobyidUsuarioClienteProyecto(_idUsuarioClienteProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioClienteProyecto/GetLogUsuarioClienteProyectobyidUsuarioClienteProyecto/idUsuarioClienteProyecto='+_idUsuarioClienteProyecto).map((res: Response) => res.json());
    }

    getLogUsuarioClienteProyectobyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioClienteProyecto/GetLogUsuarioClienteProyectobyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getLogUsuarioClienteProyectobyidUsuarioCliente(_idUsuarioCliente:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioClienteProyecto/GetLogUsuarioClienteProyectobyidUsuarioCliente/idUsuarioCliente='+_idUsuarioCliente).map((res: Response) => res.json());
    }

    getLogUsuarioClienteProyectobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioClienteProyecto/GetLogUsuarioClienteProyectobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogUsuarioClienteProyectobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioClienteProyecto/GetLogUsuarioClienteProyectobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogUsuarioClienteProyectobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioClienteProyecto/GetLogUsuarioClienteProyectobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogUsuarioClienteProyectobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioClienteProyecto/GetLogUsuarioClienteProyectobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogUsuarioClienteProyectobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuarioClienteProyecto/GetLogUsuarioClienteProyectobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogUsuarioClienteProyecto(_LogUsuarioClienteProyecto:mLogUsuarioClienteProyecto):any{
        return $.post( configuracion.url+'LogUsuarioClienteProyecto', _LogUsuarioClienteProyecto )
    }

    postUpdDelLogUsuarioClienteProyecto(_LogUsuarioClienteProyecto:mLogUsuarioClienteProyecto):any{
        return $.post( configuracion.url+'LogUsuarioClienteProyecto/'+_LogUsuarioClienteProyecto.idLogUsuarioClienteProyecto, _LogUsuarioClienteProyecto )
    }
}
