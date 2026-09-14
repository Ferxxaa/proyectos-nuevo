import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mGerentesSponsor } from '../models/mGerentesSponsor';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sGerentesSponsor{

    constructor(
        public _http : Http
    ){}

    getGerentesSponsor(): Observable<any>{
        return this._http.get(configuracion.url+'GerentesSponsor').map((res: Response) => res.json());
    }

    getGerentesSponsorbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'GerentesSponsor/'+_id).map((res: Response) => res.json());
    }

    getGerentesSponsorbyidGerentesSponsor(_idGerentesSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'GerentesSponsor/GetGerentesSponsorbyidGerentesSponsor/idGerentesSponsor='+_idGerentesSponsor).map((res: Response) => res.json());
    }

    getGerentesSponsorbyidUsuarioGerente(_idUsuarioGerente:number): Observable<any>{
        return this._http.get(configuracion.url+'GerentesSponsor/GetGerentesSponsorbyidUsuarioGerente/idUsuarioGerente='+_idUsuarioGerente).map((res: Response) => res.json());
    }

    getGerentesSponsorbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'GerentesSponsor/GetGerentesSponsorbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getGerentesSponsorbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'GerentesSponsor/GetGerentesSponsorbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getGerentesSponsorbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'GerentesSponsor/GetGerentesSponsorbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getGerentesSponsorbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'GerentesSponsor/GetGerentesSponsorbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getGerentesSponsorbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'GerentesSponsor/GetGerentesSponsorbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getGerentesSponsorbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'GerentesSponsor/GetGerentesSponsorbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddGerentesSponsor(_GerentesSponsor:mGerentesSponsor):any{
        return $.post( configuracion.url+'GerentesSponsor', _GerentesSponsor )
    }

    postUpdDelGerentesSponsor(_GerentesSponsor:mGerentesSponsor):any{
        return $.post( configuracion.url+'GerentesSponsor/'+_GerentesSponsor.idGerentesSponsor, _GerentesSponsor )
    }
}
