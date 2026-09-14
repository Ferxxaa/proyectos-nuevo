import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mEtapa } from '../models/mEtapa';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sEtapa{

    constructor(
        public _http : Http
    ){}

    getEtapa(): Observable<any>{
        return this._http.get(configuracion.url+'Etapa').map((res: Response) => res.json());
    }

    getEtapabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Etapa/'+_id).map((res: Response) => res.json());
    }

    getEtapabyidEtapa(_idEtapa:number): Observable<any>{
        return this._http.get(configuracion.url+'Etapa/GetEtapabyidEtapa/idEtapa='+_idEtapa).map((res: Response) => res.json());
    }

    getEtapabynombreEtapa(_nombreEtapa:string): Observable<any>{
        return this._http.get(configuracion.url+'Etapa/GetEtapabynombreEtapa/nombreEtapa='+_nombreEtapa).map((res: Response) => res.json());
    }

    getEtapabynombreControlIngreso(_nombreControlIngreso:string): Observable<any>{
        return this._http.get(configuracion.url+'Etapa/GetEtapabynombreControlIngreso/nombreControlIngreso='+_nombreControlIngreso).map((res: Response) => res.json());
    }

    getEtapabyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'Etapa/GetEtapabyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getEtapabyorder(_order:number): Observable<any>{
        return this._http.get(configuracion.url+'Etapa/GetEtapabyorder/order='+_order).map((res: Response) => res.json());
    }

    getEtapabyidTipoEtapa(_idTipoEtapa:number): Observable<any>{
        return this._http.get(configuracion.url+'Etapa/GetEtapabyidTipoEtapa/idTipoEtapa='+_idTipoEtapa).map((res: Response) => res.json());
    }

    getEtapabyidEtapaSiguiente(_idEtapaSiguiente:number): Observable<any>{
        return this._http.get(configuracion.url+'Etapa/GetEtapabyidEtapaSiguiente/idEtapaSiguiente='+_idEtapaSiguiente).map((res: Response) => res.json());
    }

    getEtapabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Etapa/GetEtapabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getEtapabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Etapa/GetEtapabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getEtapabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Etapa/GetEtapabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getEtapabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Etapa/GetEtapabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getEtapabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Etapa/GetEtapabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddEtapa(_Etapa:mEtapa):any{
        return $.post( configuracion.url+'Etapa', _Etapa )
    }

    postUpdDelEtapa(_Etapa:mEtapa):any{
        return $.post( configuracion.url+'Etapa/'+_Etapa.idEtapa, _Etapa )
    }
}
