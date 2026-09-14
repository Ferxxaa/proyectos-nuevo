import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogTipoIntervencion } from '../models/mLogTipoIntervencion';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogTipoIntervencion{

    constructor(
        public _http : Http
    ){}

    getLogTipoIntervencion(): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoIntervencion').map((res: Response) => res.json());
    }

    getLogTipoIntervencionbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoIntervencion/'+_id).map((res: Response) => res.json());
    }

    getLogTipoIntervencionbyidLogTipoIntervencion(_idLogTipoIntervencion:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoIntervencion/GetLogTipoIntervencionbyidLogTipoIntervencion/idLogTipoIntervencion='+_idLogTipoIntervencion).map((res: Response) => res.json());
    }

    getLogTipoIntervencionbyidTipoIntervencion(_idTipoIntervencion:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoIntervencion/GetLogTipoIntervencionbyidTipoIntervencion/idTipoIntervencion='+_idTipoIntervencion).map((res: Response) => res.json());
    }

    getLogTipoIntervencionbynombreTipoIntervencion(_nombreTipoIntervencion:string): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoIntervencion/GetLogTipoIntervencionbynombreTipoIntervencion/nombreTipoIntervencion='+_nombreTipoIntervencion).map((res: Response) => res.json());
    }

    getLogTipoIntervencionbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoIntervencion/GetLogTipoIntervencionbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogTipoIntervencionbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoIntervencion/GetLogTipoIntervencionbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogTipoIntervencionbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoIntervencion/GetLogTipoIntervencionbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogTipoIntervencionbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoIntervencion/GetLogTipoIntervencionbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogTipoIntervencionbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoIntervencion/GetLogTipoIntervencionbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogTipoIntervencionbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoIntervencion/GetLogTipoIntervencionbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogTipoIntervencion(_LogTipoIntervencion:mLogTipoIntervencion):any{
        return $.post( configuracion.url+'LogTipoIntervencion', _LogTipoIntervencion )
    }

    postUpdDelLogTipoIntervencion(_LogTipoIntervencion:mLogTipoIntervencion):any{
        return $.post( configuracion.url+'LogTipoIntervencion/'+_LogTipoIntervencion.idLogTipoIntervencion, _LogTipoIntervencion )
    }
}
