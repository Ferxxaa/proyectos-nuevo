import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogMenu } from '../models/mLogMenu';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogMenu{

    constructor(
        public _http : Http
    ){}

    getLogMenu(): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu').map((res: Response) => res.json());
    }

    getLogMenubyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/'+_id).map((res: Response) => res.json());
    }

    getLogMenubyidLogMenu(_idLogMenu:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyidLogMenu/idLogMenu='+_idLogMenu).map((res: Response) => res.json());
    }

    getLogMenubyidMenu(_idMenu:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyidMenu/idMenu='+_idMenu).map((res: Response) => res.json());
    }

    getLogMenubynombreMenu(_nombreMenu:string): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubynombreMenu/nombreMenu='+_nombreMenu).map((res: Response) => res.json());
    }

    getLogMenubyidPagina(_idPagina:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyidPagina/idPagina='+_idPagina).map((res: Response) => res.json());
    }

    getLogMenubyidPadre(_idPadre:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyidPadre/idPadre='+_idPadre).map((res: Response) => res.json());
    }

    getLogMenubyidPerfil(_idPerfil:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyidPerfil/idPerfil='+_idPerfil).map((res: Response) => res.json());
    }

    getLogMenubyremocion(_remocion:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyremocion/remocion='+_remocion).map((res: Response) => res.json());
    }

    getLogMenubyvisualizacion(_visualizacion:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyvisualizacion/visualizacion='+_visualizacion).map((res: Response) => res.json());
    }

    getLogMenubyedicion(_edicion:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyedicion/edicion='+_edicion).map((res: Response) => res.json());
    }

    getLogMenubyidPais(_idPais:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyidPais/idPais='+_idPais).map((res: Response) => res.json());
    }

    getLogMenubyorden(_orden:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyorden/orden='+_orden).map((res: Response) => res.json());
    }

    getLogMenubyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogMenubyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogMenubyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogMenubyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogMenubyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogMenu/GetLogMenubyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogMenu(_LogMenu:mLogMenu):any{
        return $.post( configuracion.url+'LogMenu', _LogMenu )
    }

    postUpdDelLogMenu(_LogMenu:mLogMenu):any{
        return $.post( configuracion.url+'LogMenu/'+_LogMenu.idLogMenu, _LogMenu )
    }
}
