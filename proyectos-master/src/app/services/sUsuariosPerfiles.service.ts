import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mUsuariosPerfiles } from '../models/mUsuariosPerfiles';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sUsuariosPerfiles{

    constructor(
        public _http : Http
    ){}

    getUsuariosPerfiles(): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosPerfiles').map((res: Response) => res.json());
    }

    getUsuariosPerfilesbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosPerfiles/'+_id).map((res: Response) => res.json());
    }

    getUsuariosPerfilesbyidUsuarioPerfil(_idUsuarioPerfil:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosPerfiles/GetUsuariosPerfilesbyidUsuarioPerfil/idUsuarioPerfil='+_idUsuarioPerfil).map((res: Response) => res.json());
    }

    getUsuariosPerfilesbyidUsuario(_idUsuario:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosPerfiles/GetUsuariosPerfilesbyidUsuario/idUsuario='+_idUsuario).map((res: Response) => res.json());
    }

    getUsuariosPerfilesbyidPerfil(_idPerfil:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosPerfiles/GetUsuariosPerfilesbyidPerfil/idPerfil='+_idPerfil).map((res: Response) => res.json());
    }

    getUsuariosPerfilesbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosPerfiles/GetUsuariosPerfilesbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getUsuariosPerfilesbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosPerfiles/GetUsuariosPerfilesbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getUsuariosPerfilesbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosPerfiles/GetUsuariosPerfilesbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getUsuariosPerfilesbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosPerfiles/GetUsuariosPerfilesbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getUsuariosPerfilesbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosPerfiles/GetUsuariosPerfilesbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddUsuariosPerfiles(_UsuariosPerfiles:mUsuariosPerfiles):any{
        return $.post( configuracion.url+'UsuariosPerfiles', _UsuariosPerfiles )
    }

    postUpdDelUsuariosPerfiles(_UsuariosPerfiles:mUsuariosPerfiles):any{
        return $.post( configuracion.url+'UsuariosPerfiles/'+_UsuariosPerfiles.idUsuarioPerfil, _UsuariosPerfiles )
    }
}
