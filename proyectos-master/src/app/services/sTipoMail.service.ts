import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mTipoMail } from '../models/mTipoMail';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sTipoMail{

    constructor(
        public _http : Http
    ){}

    getTipoMail(): Observable<any>{
        return this._http.get(configuracion.url+'TipoMail').map((res: Response) => res.json());
    }

    getTipoMailbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoMail/'+_id).map((res: Response) => res.json());
    }

    getTipoMailbyidTipoMail(_idTipoMail:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoMail/GetTipoMailbyidTipoMail/idTipoMail='+_idTipoMail).map((res: Response) => res.json());
    }

    getTipoMailbynombreTipoMail(_nombreTipoMail:string): Observable<any>{
        return this._http.get(configuracion.url+'TipoMail/GetTipoMailbynombreTipoMail/nombreTipoMail='+_nombreTipoMail).map((res: Response) => res.json());
    }

    getTipoMailbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoMail/GetTipoMailbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getTipoMailbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'TipoMail/GetTipoMailbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getTipoMailbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'TipoMail/GetTipoMailbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getTipoMailbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'TipoMail/GetTipoMailbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getTipoMailbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoMail/GetTipoMailbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getTipoMailbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoMail/GetTipoMailbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddTipoMail(_TipoMail:mTipoMail):any{
        return $.post( configuracion.url+'TipoMail', _TipoMail )
    }

    postUpdDelTipoMail(_TipoMail:mTipoMail):any{
        return $.post( configuracion.url+'TipoMail/'+_TipoMail.idTipoMail, _TipoMail )
    }
}
