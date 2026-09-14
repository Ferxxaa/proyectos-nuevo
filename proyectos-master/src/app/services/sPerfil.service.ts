import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mPerfil } from '../models/mPerfil';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sPerfil{

    constructor(
        public _http : Http
    ){}

    getPerfil(): Observable<any>{
        return this._http.get(configuracion.url+'Perfil').map((res: Response) => res.json());
    }

    getPerfilbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Perfil/'+_id).map((res: Response) => res.json());
    }

    getPerfilbyidPerfil(_idPerfil:number): Observable<any>{
        return this._http.get(configuracion.url+'Perfil/GetPerfilbyidPerfil/idPerfil='+_idPerfil).map((res: Response) => res.json());
    }

    getPerfilbynombrePerfil(_nombrePerfil:string): Observable<any>{
        return this._http.get(configuracion.url+'Perfil/GetPerfilbynombrePerfil/nombrePerfil='+_nombrePerfil).map((res: Response) => res.json());
    }

    getPerfilbydescripconPerfil(_descripconPerfil:string): Observable<any>{
        return this._http.get(configuracion.url+'Perfil/GetPerfilbydescripconPerfil/descripconPerfil='+_descripconPerfil).map((res: Response) => res.json());
    }

    getPerfilbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Perfil/GetPerfilbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getPerfilbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Perfil/GetPerfilbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getPerfilbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Perfil/GetPerfilbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getPerfilbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Perfil/GetPerfilbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getPerfilbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Perfil/GetPerfilbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddPerfil(_Perfil:mPerfil):any{
        return $.post( configuracion.url+'Perfil', _Perfil )
    }

    postUpdDelPerfil(_Perfil:mPerfil):any{
        return $.post( configuracion.url+'Perfil/'+_Perfil.idPerfil, _Perfil )
    }
}
