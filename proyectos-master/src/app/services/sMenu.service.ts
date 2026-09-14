import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mMenu } from '../models/mMenu';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sMenu{

    constructor(
        public _http : Http
    ){}

    getMenu(): Observable<any>{
        return this._http.get(configuracion.url+'Menu').map((res: Response) => res.json());
    }

    getMenubyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Menu/'+_id).map((res: Response) => res.json());
    }

    getMenubyidMenu(_idMenu:number): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubyidMenu/idMenu='+_idMenu).map((res: Response) => res.json());
    }

    getMenubynombreMenu(_nombreMenu:string): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubynombreMenu/nombreMenu='+_nombreMenu).map((res: Response) => res.json());
    }

    getMenubyidPagina(_idPagina:number): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubyidPagina/idPagina='+_idPagina).map((res: Response) => res.json());
    }

    getMenubyidPadre(_idPadre:number): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubyidPadre/idPadre='+_idPadre).map((res: Response) => res.json());
    }

    getMenubyidPerfil(_idPerfil:number): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubyidPerfil/idPerfil='+_idPerfil).map((res: Response) => res.json());
    }

    getMenubyremocion(_remocion:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubyremocion/remocion='+_remocion).map((res: Response) => res.json());
    }

    getMenubyvisualizacion(_visualizacion:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubyvisualizacion/visualizacion='+_visualizacion).map((res: Response) => res.json());
    }

    getMenubyedicion(_edicion:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubyedicion/edicion='+_edicion).map((res: Response) => res.json());
    }

    getMenubyidPais(_idPais:number): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubyidPais/idPais='+_idPais).map((res: Response) => res.json());
    }

    getMenubyorden(_orden:number): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubyorden/orden='+_orden).map((res: Response) => res.json());
    }

    getMenubyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getMenubyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getMenubyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getMenubyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getMenubyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Menu/GetMenubyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddMenu(_Menu:mMenu):any{
        return $.post( configuracion.url+'Menu', _Menu )
    }

    postUpdDelMenu(_Menu:mMenu):any{
        return $.post( configuracion.url+'Menu/'+_Menu.idMenu, _Menu )
    }
}
