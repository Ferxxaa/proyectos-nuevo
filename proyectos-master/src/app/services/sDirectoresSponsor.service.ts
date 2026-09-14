import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mDirectoresSponsor } from '../models/mDirectoresSponsor';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sDirectoresSponsor{

    constructor(
        public _http : Http
    ){}

    getDirectoresSponsor(): Observable<any>{
        return this._http.get(configuracion.url+'DirectoresSponsor').map((res: Response) => res.json());
    }

    getDirectoresSponsorbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'DirectoresSponsor/'+_id).map((res: Response) => res.json());
    }

    getDirectoresSponsorbyidDirectoresSponsor(_idDirectoresSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'DirectoresSponsor/GetDirectoresSponsorbyidDirectoresSponsor/idDirectoresSponsor='+_idDirectoresSponsor).map((res: Response) => res.json());
    }

    getDirectoresSponsorbyidUsuarioDirector(_idUsuarioDirector:number): Observable<any>{
        return this._http.get(configuracion.url+'DirectoresSponsor/GetDirectoresSponsorbyidUsuarioDirector/idUsuarioDirector='+_idUsuarioDirector).map((res: Response) => res.json());
    }

    getDirectoresSponsorbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'DirectoresSponsor/GetDirectoresSponsorbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getDirectoresSponsorbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'DirectoresSponsor/GetDirectoresSponsorbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getDirectoresSponsorbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'DirectoresSponsor/GetDirectoresSponsorbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getDirectoresSponsorbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'DirectoresSponsor/GetDirectoresSponsorbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getDirectoresSponsorbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'DirectoresSponsor/GetDirectoresSponsorbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getDirectoresSponsorbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'DirectoresSponsor/GetDirectoresSponsorbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddDirectoresSponsor(_DirectoresSponsor:mDirectoresSponsor):any{
        return $.post( configuracion.url+'DirectoresSponsor', _DirectoresSponsor )
    }

    postUpdDelDirectoresSponsor(_DirectoresSponsor:mDirectoresSponsor):any{
        return $.post( configuracion.url+'DirectoresSponsor/'+_DirectoresSponsor.idDirectoresSponsor, _DirectoresSponsor )
    }
}
