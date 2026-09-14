import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mCoordinadoresSponsor } from '../models/mCoordinadoresSponsor';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sCoordinadoresSponsor{

    constructor(
        public _http : Http
    ){}

    getCoordinadoresSponsor(): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadoresSponsor').map((res: Response) => res.json());
    }

    getCoordinadoresSponsorbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadoresSponsor/'+_id).map((res: Response) => res.json());
    }

    getCoordinadoresSponsorbyidCoordinadoresSponsor(_idCoordinadoresSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadoresSponsor/GetCoordinadoresSponsorbyidCoordinadoresSponsor/idCoordinadoresSponsor='+_idCoordinadoresSponsor).map((res: Response) => res.json());
    }

    getCoordinadoresSponsorbyidUsuarioCoordinador(_idUsuarioCoordinador:number): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadoresSponsor/GetCoordinadoresSponsorbyidUsuarioCoordinador/idUsuarioCoordinador='+_idUsuarioCoordinador).map((res: Response) => res.json());
    }

    getCoordinadoresSponsorbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadoresSponsor/GetCoordinadoresSponsorbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getCoordinadoresSponsorbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadoresSponsor/GetCoordinadoresSponsorbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getCoordinadoresSponsorbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadoresSponsor/GetCoordinadoresSponsorbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getCoordinadoresSponsorbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadoresSponsor/GetCoordinadoresSponsorbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getCoordinadoresSponsorbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadoresSponsor/GetCoordinadoresSponsorbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getCoordinadoresSponsorbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'CoordinadoresSponsor/GetCoordinadoresSponsorbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddCoordinadoresSponsor(_CoordinadoresSponsor:mCoordinadoresSponsor):any{
        return $.post( configuracion.url+'CoordinadoresSponsor', _CoordinadoresSponsor )
    }

    postUpdDelCoordinadoresSponsor(_CoordinadoresSponsor:mCoordinadoresSponsor):any{
        return $.post( configuracion.url+'CoordinadoresSponsor/'+_CoordinadoresSponsor.idCoordinadoresSponsor, _CoordinadoresSponsor )
    }
}
