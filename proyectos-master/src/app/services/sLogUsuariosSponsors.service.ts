import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogUsuariosSponsors } from '../models/mLogUsuariosSponsors';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogUsuariosSponsors{

    constructor(
        public _http : Http
    ){}

    getLogUsuariosSponsors(): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosSponsors').map((res: Response) => res.json());
    }

    getLogUsuariosSponsorsbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosSponsors/'+_id).map((res: Response) => res.json());
    }

    getLogUsuariosSponsorsbyidLogUsuariosSponsors(_idLogUsuariosSponsors:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosSponsors/GetLogUsuariosSponsorsbyidLogUsuariosSponsors/idLogUsuariosSponsors='+_idLogUsuariosSponsors).map((res: Response) => res.json());
    }

    getLogUsuariosSponsorsbyidUsuarioSponsor(_idUsuarioSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosSponsors/GetLogUsuariosSponsorsbyidUsuarioSponsor/idUsuarioSponsor='+_idUsuarioSponsor).map((res: Response) => res.json());
    }

    getLogUsuariosSponsorsbyidUsuario(_idUsuario:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosSponsors/GetLogUsuariosSponsorsbyidUsuario/idUsuario='+_idUsuario).map((res: Response) => res.json());
    }

    getLogUsuariosSponsorsbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosSponsors/GetLogUsuariosSponsorsbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogUsuariosSponsorsbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosSponsors/GetLogUsuariosSponsorsbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogUsuariosSponsorsbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosSponsors/GetLogUsuariosSponsorsbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogUsuariosSponsorsbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosSponsors/GetLogUsuariosSponsorsbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogUsuariosSponsorsbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosSponsors/GetLogUsuariosSponsorsbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogUsuariosSponsorsbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogUsuariosSponsors/GetLogUsuariosSponsorsbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogUsuariosSponsors(_LogUsuariosSponsors:mLogUsuariosSponsors):any{
        return $.post( configuracion.url+'LogUsuariosSponsors', _LogUsuariosSponsors )
    }

    postUpdDelLogUsuariosSponsors(_LogUsuariosSponsors:mLogUsuariosSponsors):any{
        return $.post( configuracion.url+'LogUsuariosSponsors/'+_LogUsuariosSponsors.idLogUsuariosSponsors, _LogUsuariosSponsors )
    }
}
