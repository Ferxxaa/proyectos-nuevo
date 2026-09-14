import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogCoordinadoresSponsor } from '../models/mLogCoordinadoresSponsor';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogCoordinadoresSponsor{

    constructor(
        public _http : Http
    ){}

    getLogCoordinadoresSponsor(): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadoresSponsor').map((res: Response) => res.json());
    }

    getLogCoordinadoresSponsorbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadoresSponsor/'+_id).map((res: Response) => res.json());
    }

    getLogCoordinadoresSponsorbyidLogCoordinadoresSponsor(_idLogCoordinadoresSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadoresSponsor/GetLogCoordinadoresSponsorbyidLogCoordinadoresSponsor/idLogCoordinadoresSponsor='+_idLogCoordinadoresSponsor).map((res: Response) => res.json());
    }

    getLogCoordinadoresSponsorbyidCoordinadoresSponsor(_idCoordinadoresSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadoresSponsor/GetLogCoordinadoresSponsorbyidCoordinadoresSponsor/idCoordinadoresSponsor='+_idCoordinadoresSponsor).map((res: Response) => res.json());
    }

    getLogCoordinadoresSponsorbyidUsuarioCoordinador(_idUsuarioCoordinador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadoresSponsor/GetLogCoordinadoresSponsorbyidUsuarioCoordinador/idUsuarioCoordinador='+_idUsuarioCoordinador).map((res: Response) => res.json());
    }

    getLogCoordinadoresSponsorbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadoresSponsor/GetLogCoordinadoresSponsorbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogCoordinadoresSponsorbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadoresSponsor/GetLogCoordinadoresSponsorbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogCoordinadoresSponsorbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadoresSponsor/GetLogCoordinadoresSponsorbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogCoordinadoresSponsorbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadoresSponsor/GetLogCoordinadoresSponsorbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogCoordinadoresSponsorbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadoresSponsor/GetLogCoordinadoresSponsorbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogCoordinadoresSponsorbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogCoordinadoresSponsor/GetLogCoordinadoresSponsorbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogCoordinadoresSponsor(_LogCoordinadoresSponsor:mLogCoordinadoresSponsor):any{
        return $.post( configuracion.url+'LogCoordinadoresSponsor', _LogCoordinadoresSponsor )
    }

    postUpdDelLogCoordinadoresSponsor(_LogCoordinadoresSponsor:mLogCoordinadoresSponsor):any{
        return $.post( configuracion.url+'LogCoordinadoresSponsor/'+_LogCoordinadoresSponsor.idLogCoordinadoresSponsor, _LogCoordinadoresSponsor )
    }
}
