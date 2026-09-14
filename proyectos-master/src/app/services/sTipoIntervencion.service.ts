import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mTipoIntervencion } from '../models/mTipoIntervencion';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sTipoIntervencion{

    constructor(
        public _http : Http
    ){}

    getTipoIntervencion(): Observable<any>{
        return this._http.get(configuracion.url+'TipoIntervencion').map((res: Response) => res.json());
    }

    getTipoIntervencionbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoIntervencion/'+_id).map((res: Response) => res.json());
    }

    getTipoIntervencionbyidTipoIntervencion(_idTipoIntervencion:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoIntervencion/GetTipoIntervencionbyidTipoIntervencion/idTipoIntervencion='+_idTipoIntervencion).map((res: Response) => res.json());
    }

    getTipoIntervencionbynombreTipoIntervencion(_nombreTipoIntervencion:string): Observable<any>{
        return this._http.get(configuracion.url+'TipoIntervencion/GetTipoIntervencionbynombreTipoIntervencion/nombreTipoIntervencion='+_nombreTipoIntervencion).map((res: Response) => res.json());
    }

    getTipoIntervencionbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoIntervencion/GetTipoIntervencionbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getTipoIntervencionbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'TipoIntervencion/GetTipoIntervencionbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getTipoIntervencionbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'TipoIntervencion/GetTipoIntervencionbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getTipoIntervencionbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'TipoIntervencion/GetTipoIntervencionbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getTipoIntervencionbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoIntervencion/GetTipoIntervencionbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getTipoIntervencionbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoIntervencion/GetTipoIntervencionbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddTipoIntervencion(_TipoIntervencion:mTipoIntervencion):any{
        return $.post( configuracion.url+'TipoIntervencion', _TipoIntervencion )
    }

    postUpdDelTipoIntervencion(_TipoIntervencion:mTipoIntervencion):any{
        return $.post( configuracion.url+'TipoIntervencion/'+_TipoIntervencion.idTipoIntervencion, _TipoIntervencion )
    }
}
