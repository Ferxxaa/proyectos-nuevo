import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mSponsor } from '../models/mSponsor';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sSponsor{

    constructor(
        public _http : Http
    ){}

    getSponsor(): Observable<any>{
        return this._http.get(configuracion.url+'Sponsor').map((res: Response) => res.json());
    }

    getSponsorbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Sponsor/'+_id).map((res: Response) => res.json());
    }

    getSponsorbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'Sponsor/GetSponsorbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getSponsorbynombreSponsor(_nombreSponsor:string): Observable<any>{
        return this._http.get(configuracion.url+'Sponsor/GetSponsorbynombreSponsor/nombreSponsor='+_nombreSponsor).map((res: Response) => res.json());
    }

    getSponsorbyrutaSponsor(_rutaSponsor:string): Observable<any>{
        return this._http.get(configuracion.url+'Sponsor/GetSponsorbyrutaSponsor/rutaSponsor='+_rutaSponsor).map((res: Response) => res.json());
    }

    getSponsorbylogoSponsor(_logoSponsor:string): Observable<any>{
        return this._http.get(configuracion.url+'Sponsor/GetSponsorbylogoSponsor/logoSponsor='+_logoSponsor).map((res: Response) => res.json());
    }

    getSponsorbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Sponsor/GetSponsorbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getSponsorbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Sponsor/GetSponsorbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getSponsorbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Sponsor/GetSponsorbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getSponsorbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Sponsor/GetSponsorbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getSponsorbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Sponsor/GetSponsorbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddSponsor(_Sponsor:mSponsor):any{
        return $.post( configuracion.url+'Sponsor', _Sponsor )
    }

    postUpdDelSponsor(_Sponsor:mSponsor):any{
        return $.post( configuracion.url+'Sponsor/'+_Sponsor.idSponsor, _Sponsor )
    }
}
