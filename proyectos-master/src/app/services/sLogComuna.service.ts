import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogComuna } from '../models/mLogComuna';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogComuna{

    constructor(
        public _http : Http
    ){}

    getLogComuna(): Observable<any>{
        return this._http.get(configuracion.url+'LogComuna').map((res: Response) => res.json());
    }

    getLogComunabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogComuna/'+_id).map((res: Response) => res.json());
    }

    getLogComunabyidLogComuna(_idLogComuna:number): Observable<any>{
        return this._http.get(configuracion.url+'LogComuna/GetLogComunabyidLogComuna/idLogComuna='+_idLogComuna).map((res: Response) => res.json());
    }

    getLogComunabyidComuna(_idComuna:number): Observable<any>{
        return this._http.get(configuracion.url+'LogComuna/GetLogComunabyidComuna/idComuna='+_idComuna).map((res: Response) => res.json());
    }

    getLogComunabynombreComuna(_nombreComuna:string): Observable<any>{
        return this._http.get(configuracion.url+'LogComuna/GetLogComunabynombreComuna/nombreComuna='+_nombreComuna).map((res: Response) => res.json());
    }

    getLogComunabyidProvincia(_idProvincia:number): Observable<any>{
        return this._http.get(configuracion.url+'LogComuna/GetLogComunabyidProvincia/idProvincia='+_idProvincia).map((res: Response) => res.json());
    }

    getLogComunabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogComuna/GetLogComunabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogComunabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogComuna/GetLogComunabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogComunabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogComuna/GetLogComunabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogComunabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogComuna/GetLogComunabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogComunabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogComuna/GetLogComunabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogComuna(_LogComuna:mLogComuna):any{
        return $.post( configuracion.url+'LogComuna', _LogComuna )
    }

    postUpdDelLogComuna(_LogComuna:mLogComuna):any{
        return $.post( configuracion.url+'LogComuna/'+_LogComuna.idLogComuna, _LogComuna )
    }
}
