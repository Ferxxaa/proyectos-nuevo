import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mZona } from '../models/mZona';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sZona{

    constructor(
        public _http : Http
    ){}

    getZona(): Observable<any>{
        return this._http.get(configuracion.url+'Zona').map((res: Response) => res.json());
    }

    getZonabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Zona/'+_id).map((res: Response) => res.json());
    }

    getZonabyidZona(_idZona:number): Observable<any>{
        return this._http.get(configuracion.url+'Zona/GetZonabyidZona/idZona='+_idZona).map((res: Response) => res.json());
    }

    getZonabynombreZona(_nombreZona:string): Observable<any>{
        return this._http.get(configuracion.url+'Zona/GetZonabynombreZona/nombreZona='+_nombreZona).map((res: Response) => res.json());
    }

    getZonabyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'Zona/GetZonabyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getZonabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Zona/GetZonabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getZonabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Zona/GetZonabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getZonabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Zona/GetZonabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getZonabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Zona/GetZonabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getZonabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Zona/GetZonabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddZona(_Zona:mZona):any{
        return $.post( configuracion.url+'Zona', _Zona )
    }

    postUpdDelZona(_Zona:mZona):any{
        return $.post( configuracion.url+'Zona/'+_Zona.idZona, _Zona )
    }
}
