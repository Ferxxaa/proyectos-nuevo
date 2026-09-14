import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mSponsorClinte } from '../models/mSponsorClinte';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sSponsorClinte{

    constructor(
        public _http : Http
    ){}

    getSponsorClinte(): Observable<any>{
        return this._http.get(configuracion.url+'SponsorClinte').map((res: Response) => res.json());
    }

    getSponsorClintebyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'SponsorClinte/'+_id).map((res: Response) => res.json());
    }

    getSponsorClintebyidSponsorCliente(_idSponsorCliente:number): Observable<any>{
        return this._http.get(configuracion.url+'SponsorClinte/GetSponsorClintebyidSponsorCliente/idSponsorCliente='+_idSponsorCliente).map((res: Response) => res.json());
    }

    getSponsorClintebynombreSponsorCliente(_nombreSponsorCliente:string): Observable<any>{
        return this._http.get(configuracion.url+'SponsorClinte/GetSponsorClintebynombreSponsorCliente/nombreSponsorCliente='+_nombreSponsorCliente).map((res: Response) => res.json());
    }

    getSponsorClintebyrutaSponsorCliente(_rutaSponsorCliente:string): Observable<any>{
        return this._http.get(configuracion.url+'SponsorClinte/GetSponsorClintebyrutaSponsorCliente/rutaSponsorCliente='+_rutaSponsorCliente).map((res: Response) => res.json());
    }

    getSponsorClintebylogoSponsorCliente(_logoSponsorCliente:string): Observable<any>{
        return this._http.get(configuracion.url+'SponsorClinte/GetSponsorClintebylogoSponsorCliente/logoSponsorCliente='+_logoSponsorCliente).map((res: Response) => res.json());
    }

    getSponsorClintebyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'SponsorClinte/GetSponsorClintebyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getSponsorClintebyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'SponsorClinte/GetSponsorClintebyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getSponsorClintebyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'SponsorClinte/GetSponsorClintebyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getSponsorClintebyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'SponsorClinte/GetSponsorClintebyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getSponsorClintebyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'SponsorClinte/GetSponsorClintebyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getSponsorClintebyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'SponsorClinte/GetSponsorClintebyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddSponsorClinte(_SponsorClinte:mSponsorClinte):any{
        return $.post( configuracion.url+'SponsorClinte', _SponsorClinte )
    }

    postUpdDelSponsorClinte(_SponsorClinte:mSponsorClinte):any{
        return $.post( configuracion.url+'SponsorClinte/'+_SponsorClinte.idSponsorCliente, _SponsorClinte )
    }
}
