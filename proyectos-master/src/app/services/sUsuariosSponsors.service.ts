import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mUsuariosSponsors } from '../models/mUsuariosSponsors';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sUsuariosSponsors{

    constructor(
        public _http : Http
    ){}

    getUsuariosSponsors(): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosSponsors').map((res: Response) => res.json());
    }

    getUsuariosSponsorsbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosSponsors/'+_id).map((res: Response) => res.json());
    }

    getUsuariosSponsorsbyidUsuarioSponsor(_idUsuarioSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosSponsors/GetUsuariosSponsorsbyidUsuarioSponsor/idUsuarioSponsor='+_idUsuarioSponsor).map((res: Response) => res.json());
    }

    getUsuariosSponsorsbyidUsuario(_idUsuario:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosSponsors/GetUsuariosSponsorsbyidUsuario/idUsuario='+_idUsuario).map((res: Response) => res.json());
    }

    getUsuariosSponsorsbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosSponsors/GetUsuariosSponsorsbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getUsuariosSponsorsbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosSponsors/GetUsuariosSponsorsbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getUsuariosSponsorsbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosSponsors/GetUsuariosSponsorsbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getUsuariosSponsorsbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosSponsors/GetUsuariosSponsorsbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getUsuariosSponsorsbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosSponsors/GetUsuariosSponsorsbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getUsuariosSponsorsbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'UsuariosSponsors/GetUsuariosSponsorsbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddUsuariosSponsors(_UsuariosSponsors:mUsuariosSponsors):any{
        return $.post( configuracion.url+'UsuariosSponsors', _UsuariosSponsors )
    }

    postUpdDelUsuariosSponsors(_UsuariosSponsors:mUsuariosSponsors):any{
        return $.post( configuracion.url+'UsuariosSponsors/'+_UsuariosSponsors.idUsuarioSponsor, _UsuariosSponsors )
    }
}
