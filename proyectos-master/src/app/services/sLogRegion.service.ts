import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogRegion } from '../models/mLogRegion';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogRegion{

    constructor(
        public _http : Http
    ){}

    getLogRegion(): Observable<any>{
        return this._http.get(configuracion.url+'LogRegion').map((res: Response) => res.json());
    }

    getLogRegionbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogRegion/'+_id).map((res: Response) => res.json());
    }

    getLogRegionbyidLogRegion(_idLogRegion:number): Observable<any>{
        return this._http.get(configuracion.url+'LogRegion/GetLogRegionbyidLogRegion/idLogRegion='+_idLogRegion).map((res: Response) => res.json());
    }

    getLogRegionbyidRegion(_idRegion:number): Observable<any>{
        return this._http.get(configuracion.url+'LogRegion/GetLogRegionbyidRegion/idRegion='+_idRegion).map((res: Response) => res.json());
    }

    getLogRegionbynombreRegion(_nombreRegion:string): Observable<any>{
        return this._http.get(configuracion.url+'LogRegion/GetLogRegionbynombreRegion/nombreRegion='+_nombreRegion).map((res: Response) => res.json());
    }

    getLogRegionbyidPais(_idPais:number): Observable<any>{
        return this._http.get(configuracion.url+'LogRegion/GetLogRegionbyidPais/idPais='+_idPais).map((res: Response) => res.json());
    }

    getLogRegionbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogRegion/GetLogRegionbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogRegionbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogRegion/GetLogRegionbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogRegionbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogRegion/GetLogRegionbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogRegionbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogRegion/GetLogRegionbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogRegionbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogRegion/GetLogRegionbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogRegion(_LogRegion:mLogRegion):any{
        return $.post( configuracion.url+'LogRegion', _LogRegion )
    }

    postUpdDelLogRegion(_LogRegion:mLogRegion):any{
        return $.post( configuracion.url+'LogRegion/'+_LogRegion.idLogRegion, _LogRegion )
    }
}
