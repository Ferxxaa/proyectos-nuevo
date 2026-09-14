import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogSponsor } from '../models/mLogSponsor';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogSponsor{

    constructor(
        public _http : Http
    ){}

    getLogSponsor(): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsor').map((res: Response) => res.json());
    }

    getLogSponsorbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsor/'+_id).map((res: Response) => res.json());
    }

    getLogSponsorbyidLogSponsor(_idLogSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsor/GetLogSponsorbyidLogSponsor/idLogSponsor='+_idLogSponsor).map((res: Response) => res.json());
    }

    getLogSponsorbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsor/GetLogSponsorbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogSponsorbynombreSponsor(_nombreSponsor:string): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsor/GetLogSponsorbynombreSponsor/nombreSponsor='+_nombreSponsor).map((res: Response) => res.json());
    }

    getLogSponsorbyrutaSponsor(_rutaSponsor:string): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsor/GetLogSponsorbyrutaSponsor/rutaSponsor='+_rutaSponsor).map((res: Response) => res.json());
    }

    getLogSponsorbylogoSponsor(_logoSponsor:string): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsor/GetLogSponsorbylogoSponsor/logoSponsor='+_logoSponsor).map((res: Response) => res.json());
    }

    getLogSponsorbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsor/GetLogSponsorbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogSponsorbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsor/GetLogSponsorbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogSponsorbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsor/GetLogSponsorbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogSponsorbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsor/GetLogSponsorbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogSponsorbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSponsor/GetLogSponsorbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogSponsor(_LogSponsor:mLogSponsor):any{
        return $.post( configuracion.url+'LogSponsor', _LogSponsor )
    }

    postUpdDelLogSponsor(_LogSponsor:mLogSponsor):any{
        return $.post( configuracion.url+'LogSponsor/'+_LogSponsor.idLogSponsor, _LogSponsor )
    }
}
