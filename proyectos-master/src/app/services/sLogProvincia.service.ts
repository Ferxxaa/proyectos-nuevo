import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogProvincia } from '../models/mLogProvincia';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogProvincia{

    constructor(
        public _http : Http
    ){}

    getLogProvincia(): Observable<any>{
        return this._http.get(configuracion.url+'LogProvincia').map((res: Response) => res.json());
    }

    getLogProvinciabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProvincia/'+_id).map((res: Response) => res.json());
    }

    getLogProvinciabyidLogProvincia(_idLogProvincia:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProvincia/GetLogProvinciabyidLogProvincia/idLogProvincia='+_idLogProvincia).map((res: Response) => res.json());
    }

    getLogProvinciabyidProvincia(_idProvincia:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProvincia/GetLogProvinciabyidProvincia/idProvincia='+_idProvincia).map((res: Response) => res.json());
    }

    getLogProvinciabynombreProvincia(_nombreProvincia:string): Observable<any>{
        return this._http.get(configuracion.url+'LogProvincia/GetLogProvinciabynombreProvincia/nombreProvincia='+_nombreProvincia).map((res: Response) => res.json());
    }

    getLogProvinciabyidRegion(_idRegion:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProvincia/GetLogProvinciabyidRegion/idRegion='+_idRegion).map((res: Response) => res.json());
    }

    getLogProvinciabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogProvincia/GetLogProvinciabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogProvinciabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogProvincia/GetLogProvinciabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogProvinciabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogProvincia/GetLogProvinciabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogProvinciabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProvincia/GetLogProvinciabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogProvinciabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogProvincia/GetLogProvinciabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogProvincia(_LogProvincia:mLogProvincia):any{
        return $.post( configuracion.url+'LogProvincia', _LogProvincia )
    }

    postUpdDelLogProvincia(_LogProvincia:mLogProvincia):any{
        return $.post( configuracion.url+'LogProvincia/'+_LogProvincia.idLogProvincia, _LogProvincia )
    }
}
