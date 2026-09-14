import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mTipoEtapa } from '../models/mTipoEtapa';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sTipoEtapa{

    constructor(
        public _http : Http
    ){}

    getTipoEtapa(): Observable<any>{
        return this._http.get(configuracion.url+'TipoEtapa').map((res: Response) => res.json());
    }

    getTipoEtapabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoEtapa/'+_id).map((res: Response) => res.json());
    }

    getTipoEtapabyidTipoEtapa(_idTipoEtapa:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoEtapa/GetTipoEtapabyidTipoEtapa/idTipoEtapa='+_idTipoEtapa).map((res: Response) => res.json());
    }

    getTipoEtapabynombreTipoEtapa(_nombreTipoEtapa:string): Observable<any>{
        return this._http.get(configuracion.url+'TipoEtapa/GetTipoEtapabynombreTipoEtapa/nombreTipoEtapa='+_nombreTipoEtapa).map((res: Response) => res.json());
    }

    getTipoEtapabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'TipoEtapa/GetTipoEtapabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getTipoEtapabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'TipoEtapa/GetTipoEtapabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getTipoEtapabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'TipoEtapa/GetTipoEtapabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getTipoEtapabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoEtapa/GetTipoEtapabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getTipoEtapabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'TipoEtapa/GetTipoEtapabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddTipoEtapa(_TipoEtapa:mTipoEtapa):any{
        return $.post( configuracion.url+'TipoEtapa', _TipoEtapa )
    }

    postUpdDelTipoEtapa(_TipoEtapa:mTipoEtapa):any{
        return $.post( configuracion.url+'TipoEtapa/'+_TipoEtapa.idTipoEtapa, _TipoEtapa )
    }
}
