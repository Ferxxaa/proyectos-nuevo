import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogDirectoresSponsor } from '../models/mLogDirectoresSponsor';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogDirectoresSponsor{

    constructor(
        public _http : Http
    ){}

    getLogDirectoresSponsor(): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectoresSponsor').map((res: Response) => res.json());
    }

    getLogDirectoresSponsorbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectoresSponsor/'+_id).map((res: Response) => res.json());
    }

    getLogDirectoresSponsorbyidLogDirectoresSponsor(_idLogDirectoresSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectoresSponsor/GetLogDirectoresSponsorbyidLogDirectoresSponsor/idLogDirectoresSponsor='+_idLogDirectoresSponsor).map((res: Response) => res.json());
    }

    getLogDirectoresSponsorbyidDirectoresSponsor(_idDirectoresSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectoresSponsor/GetLogDirectoresSponsorbyidDirectoresSponsor/idDirectoresSponsor='+_idDirectoresSponsor).map((res: Response) => res.json());
    }

    getLogDirectoresSponsorbyidUsuarioDirector(_idUsuarioDirector:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectoresSponsor/GetLogDirectoresSponsorbyidUsuarioDirector/idUsuarioDirector='+_idUsuarioDirector).map((res: Response) => res.json());
    }

    getLogDirectoresSponsorbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectoresSponsor/GetLogDirectoresSponsorbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogDirectoresSponsorbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectoresSponsor/GetLogDirectoresSponsorbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogDirectoresSponsorbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectoresSponsor/GetLogDirectoresSponsorbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogDirectoresSponsorbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectoresSponsor/GetLogDirectoresSponsorbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogDirectoresSponsorbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectoresSponsor/GetLogDirectoresSponsorbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogDirectoresSponsorbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectoresSponsor/GetLogDirectoresSponsorbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogDirectoresSponsor(_LogDirectoresSponsor:mLogDirectoresSponsor):any{
        return $.post( configuracion.url+'LogDirectoresSponsor', _LogDirectoresSponsor )
    }

    postUpdDelLogDirectoresSponsor(_LogDirectoresSponsor:mLogDirectoresSponsor):any{
        return $.post( configuracion.url+'LogDirectoresSponsor/'+_LogDirectoresSponsor.idLogDirectoresSponsor, _LogDirectoresSponsor )
    }
}
