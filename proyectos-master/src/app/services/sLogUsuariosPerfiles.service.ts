import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogUsuariosPerfiles } from '../models/mLogUsuariosPerfiles';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogUsuariosPerfiles{

    constructor(
        public _http : Http
    ){}

    getLogUsuariosPerfiles(): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosPerfiles').map((res: Response) => res.json());
    }

    getLogUsuariosPerfilesbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosPerfiles/'+_id).map((res: Response) => res.json());
    }

    getLogUsuariosPerfilesbyidLogUsuarioPerfil(_idLogUsuarioPerfil:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosPerfiles/GetLogUsuariosPerfilesbyidLogUsuarioPerfil/idLogUsuarioPerfil='+_idLogUsuarioPerfil).map((res: Response) => res.json());
    }

    getLogUsuariosPerfilesbyidUsuarioPerfil(_idUsuarioPerfil:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosPerfiles/GetLogUsuariosPerfilesbyidUsuarioPerfil/idUsuarioPerfil='+_idUsuarioPerfil).map((res: Response) => res.json());
    }

    getLogUsuariosPerfilesbyidUsuario(_idUsuario:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosPerfiles/GetLogUsuariosPerfilesbyidUsuario/idUsuario='+_idUsuario).map((res: Response) => res.json());
    }

    getLogUsuariosPerfilesbyidPerfil(_idPerfil:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosPerfiles/GetLogUsuariosPerfilesbyidPerfil/idPerfil='+_idPerfil).map((res: Response) => res.json());
    }

    getLogUsuariosPerfilesbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosPerfiles/GetLogUsuariosPerfilesbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogUsuariosPerfilesbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosPerfiles/GetLogUsuariosPerfilesbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogUsuariosPerfilesbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosPerfiles/GetLogUsuariosPerfilesbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogUsuariosPerfilesbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosPerfiles/GetLogUsuariosPerfilesbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogUsuariosPerfilesbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosPerfiles/GetLogUsuariosPerfilesbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogUsuariosPerfiles(_LogUsuariosPerfiles:mLogUsuariosPerfiles):any{
        return $.post( configuracion.url+'LogUsuariosPerfiles', _LogUsuariosPerfiles )
    }

    postUpdDelLogUsuariosPerfiles(_LogUsuariosPerfiles:mLogUsuariosPerfiles):any{
        return $.post( configuracion.url+'LogUsuariosPerfiles/'+_LogUsuariosPerfiles.idLogUsuarioPerfil, _LogUsuariosPerfiles )
    }
}
