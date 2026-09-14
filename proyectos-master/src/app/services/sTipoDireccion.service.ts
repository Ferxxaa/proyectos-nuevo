import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mTipoDireccion } from '../models/mTipoDireccion';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sTipoDireccion{

    constructor(
        public _http : Http
    ){}

    getTipoDireccion(): Observable<any>{
        return this._http.get(configuracion.url+'TipoDireccion').map((res: Response) => res.json());
    }

    getTipoDireccionbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoDireccion/'+_id).map((res: Response) => res.json());
    }

    getTipoDireccionbyidTipoDireccion(_idTipoDireccion:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoDireccion/GetTipoDireccionbyidTipoDireccion/idTipoDireccion='+_idTipoDireccion).map((res: Response) => res.json());
    }

    getTipoDireccionbynombreTipoDireccion(_nombreTipoDireccion:string): Observable<any>{
        return this._http.get(configuracion.url+'TipoDireccion/GetTipoDireccionbynombreTipoDireccion/nombreTipoDireccion='+_nombreTipoDireccion).map((res: Response) => res.json());
    }

    getTipoDireccionbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoDireccion/GetTipoDireccionbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getTipoDireccionbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'TipoDireccion/GetTipoDireccionbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getTipoDireccionbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'TipoDireccion/GetTipoDireccionbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getTipoDireccionbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'TipoDireccion/GetTipoDireccionbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getTipoDireccionbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoDireccion/GetTipoDireccionbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getTipoDireccionbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoDireccion/GetTipoDireccionbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddTipoDireccion(_TipoDireccion:mTipoDireccion):any{
        return $.post( configuracion.url+'TipoDireccion', _TipoDireccion )
    }

    postUpdDelTipoDireccion(_TipoDireccion:mTipoDireccion):any{
        return $.post( configuracion.url+'TipoDireccion/'+_TipoDireccion.idTipoDireccion, _TipoDireccion )
    }
}
