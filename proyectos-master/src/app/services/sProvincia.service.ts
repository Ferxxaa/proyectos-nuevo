import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mProvincia } from '../models/mProvincia';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sProvincia{

    constructor(
        public _http : Http
    ){}

    getProvincia(): Observable<any>{
        return this._http.get(configuracion.url+'Provincia').map((res: Response) => res.json());
    }

    getProvinciabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Provincia/'+_id).map((res: Response) => res.json());
    }

    getProvinciabyidProvincia(_idProvincia:number): Observable<any>{
        return this._http.get(configuracion.url+'Provincia/GetProvinciabyidProvincia/idProvincia='+_idProvincia).map((res: Response) => res.json());
    }

    getProvinciabynombreProvincia(_nombreProvincia:string): Observable<any>{
        return this._http.get(configuracion.url+'Provincia/GetProvinciabynombreProvincia/nombreProvincia='+_nombreProvincia).map((res: Response) => res.json());
    }

    getProvinciabyidRegion(_idRegion:number): Observable<any>{
        return this._http.get(configuracion.url+'Provincia/GetProvinciabyidRegion/idRegion='+_idRegion).map((res: Response) => res.json());
    }

    getProvinciabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Provincia/GetProvinciabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getProvinciabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Provincia/GetProvinciabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getProvinciabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Provincia/GetProvinciabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getProvinciabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Provincia/GetProvinciabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getProvinciabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Provincia/GetProvinciabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddProvincia(_Provincia:mProvincia):any{
        return $.post( configuracion.url+'Provincia', _Provincia )
    }

    postUpdDelProvincia(_Provincia:mProvincia):any{
        return $.post( configuracion.url+'Provincia/'+_Provincia.idProvincia, _Provincia )
    }
}
