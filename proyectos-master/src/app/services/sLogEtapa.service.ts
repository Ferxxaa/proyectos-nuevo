import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogEtapa } from '../models/mLogEtapa';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogEtapa{

    constructor(
        public _http : Http
    ){}

    getLogEtapa(): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa').map((res: Response) => res.json());
    }

    getLogEtapabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa/'+_id).map((res: Response) => res.json());
    }

    getLogEtapabyidLogEtapa(_idLogEtapa:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa/GetLogEtapabyidLogEtapa/idLogEtapa='+_idLogEtapa).map((res: Response) => res.json());
    }

    getLogEtapabyidEtapa(_idEtapa:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa/GetLogEtapabyidEtapa/idEtapa='+_idEtapa).map((res: Response) => res.json());
    }

    getLogEtapabynombreEtapa(_nombreEtapa:string): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa/GetLogEtapabynombreEtapa/nombreEtapa='+_nombreEtapa).map((res: Response) => res.json());
    }

    getLogEtapabynombreControlIngreso(_nombreControlIngreso:string): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa/GetLogEtapabynombreControlIngreso/nombreControlIngreso='+_nombreControlIngreso).map((res: Response) => res.json());
    }

    getLogEtapabyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa/GetLogEtapabyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogEtapabyorder(_order:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa/GetLogEtapabyorder/order='+_order).map((res: Response) => res.json());
    }

    getLogEtapabyidTipoEtapa(_idTipoEtapa:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa/GetLogEtapabyidTipoEtapa/idTipoEtapa='+_idTipoEtapa).map((res: Response) => res.json());
    }

    getLogEtapabyidEtapaSiguiente(_idEtapaSiguiente:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa/GetLogEtapabyidEtapaSiguiente/idEtapaSiguiente='+_idEtapaSiguiente).map((res: Response) => res.json());
    }

    getLogEtapabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa/GetLogEtapabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogEtapabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa/GetLogEtapabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogEtapabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa/GetLogEtapabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogEtapabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa/GetLogEtapabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogEtapabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEtapa/GetLogEtapabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogEtapa(_LogEtapa:mLogEtapa):any{
        return $.post( configuracion.url+'LogEtapa', _LogEtapa )
    }

    postUpdDelLogEtapa(_LogEtapa:mLogEtapa):any{
        return $.post( configuracion.url+'LogEtapa/'+_LogEtapa.idLogEtapa, _LogEtapa )
    }
}
