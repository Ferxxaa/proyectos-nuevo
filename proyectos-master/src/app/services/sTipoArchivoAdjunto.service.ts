import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mTipoArchivoAdjunto } from '../models/mTipoArchivoAdjunto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sTipoArchivoAdjunto{

    constructor(
        public _http : Http
    ){}

    getTipoArchivoAdjunto(): Observable<any>{
        return this._http.get(configuracion.url+'TipoArchivoAdjunto').map((res: Response) => res.json());
    }

    getTipoArchivoAdjuntobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoArchivoAdjunto/'+_id).map((res: Response) => res.json());
    }

    getTipoArchivoAdjuntobyidTipoArchivoAdjunto(_idTipoArchivoAdjunto:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoArchivoAdjunto/GetTipoArchivoAdjuntobyidTipoArchivoAdjunto/idTipoArchivoAdjunto='+_idTipoArchivoAdjunto).map((res: Response) => res.json());
    }

    getTipoArchivoAdjuntobynombreTipoArchivoAdjunto(_nombreTipoArchivoAdjunto:string): Observable<any>{
        return this._http.get(configuracion.url+'TipoArchivoAdjunto/GetTipoArchivoAdjuntobynombreTipoArchivoAdjunto/nombreTipoArchivoAdjunto='+_nombreTipoArchivoAdjunto).map((res: Response) => res.json());
    }

    getTipoArchivoAdjuntobyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoArchivoAdjunto/GetTipoArchivoAdjuntobyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getTipoArchivoAdjuntobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'TipoArchivoAdjunto/GetTipoArchivoAdjuntobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getTipoArchivoAdjuntobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'TipoArchivoAdjunto/GetTipoArchivoAdjuntobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getTipoArchivoAdjuntobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'TipoArchivoAdjunto/GetTipoArchivoAdjuntobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getTipoArchivoAdjuntobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoArchivoAdjunto/GetTipoArchivoAdjuntobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getTipoArchivoAdjuntobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoArchivoAdjunto/GetTipoArchivoAdjuntobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddTipoArchivoAdjunto(_TipoArchivoAdjunto:mTipoArchivoAdjunto):any{
        return $.post( configuracion.url+'TipoArchivoAdjunto', _TipoArchivoAdjunto )
    }

    postUpdDelTipoArchivoAdjunto(_TipoArchivoAdjunto:mTipoArchivoAdjunto):any{
        return $.post( configuracion.url+'TipoArchivoAdjunto/'+_TipoArchivoAdjunto.idTipoArchivoAdjunto, _TipoArchivoAdjunto )
    }
}
