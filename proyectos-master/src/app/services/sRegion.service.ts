import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mRegion } from '../models/mRegion';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sRegion{

    constructor(
        public _http : Http
    ){}

    getRegion(): Observable<any>{
        return this._http.get(configuracion.url+'Region').map((res: Response) => res.json());
    }

    getRegionbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Region/'+_id).map((res: Response) => res.json());
    }

    getRegionbyidRegion(_idRegion:number): Observable<any>{
        return this._http.get(configuracion.url+'Region/GetRegionbyidRegion/idRegion='+_idRegion).map((res: Response) => res.json());
    }

    getRegionbynombreRegion(_nombreRegion:string): Observable<any>{
        return this._http.get(configuracion.url+'Region/GetRegionbynombreRegion/nombreRegion='+_nombreRegion).map((res: Response) => res.json());
    }

    getRegionbyidPais(_idPais:number): Observable<any>{
        return this._http.get(configuracion.url+'Region/GetRegionbyidPais/idPais='+_idPais).map((res: Response) => res.json());
    }

    getRegionbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Region/GetRegionbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getRegionbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Region/GetRegionbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getRegionbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Region/GetRegionbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getRegionbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Region/GetRegionbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getRegionbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Region/GetRegionbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddRegion(_Region:mRegion):any{
        return $.post( configuracion.url+'Region', _Region )
    }

    postUpdDelRegion(_Region:mRegion):any{
        return $.post( configuracion.url+'Region/'+_Region.idRegion, _Region )
    }
}
