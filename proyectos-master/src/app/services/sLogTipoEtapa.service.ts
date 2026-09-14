import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogTipoEtapa } from '../models/mLogTipoEtapa';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogTipoEtapa{

    constructor(
        public _http : Http
    ){}

    getLogTipoEtapa(): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoEtapa').map((res: Response) => res.json());
    }

    getLogTipoEtapabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoEtapa/'+_id).map((res: Response) => res.json());
    }

    getLogTipoEtapabyidLogTipoEtapa(_idLogTipoEtapa:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoEtapa/GetLogTipoEtapabyidLogTipoEtapa/idLogTipoEtapa='+_idLogTipoEtapa).map((res: Response) => res.json());
    }

    getLogTipoEtapabyidTipoEtapa(_idTipoEtapa:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoEtapa/GetLogTipoEtapabyidTipoEtapa/idTipoEtapa='+_idTipoEtapa).map((res: Response) => res.json());
    }

    getLogTipoEtapabynombreTipoEtapa(_nombreTipoEtapa:string): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoEtapa/GetLogTipoEtapabynombreTipoEtapa/nombreTipoEtapa='+_nombreTipoEtapa).map((res: Response) => res.json());
    }

    getLogTipoEtapabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoEtapa/GetLogTipoEtapabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogTipoEtapabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoEtapa/GetLogTipoEtapabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogTipoEtapabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoEtapa/GetLogTipoEtapabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogTipoEtapabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoEtapa/GetLogTipoEtapabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogTipoEtapabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoEtapa/GetLogTipoEtapabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogTipoEtapa(_LogTipoEtapa:mLogTipoEtapa):any{
        return $.post( configuracion.url+'LogTipoEtapa', _LogTipoEtapa )
    }

    postUpdDelLogTipoEtapa(_LogTipoEtapa:mLogTipoEtapa):any{
        return $.post( configuracion.url+'LogTipoEtapa/'+_LogTipoEtapa.idLogTipoEtapa, _LogTipoEtapa )
    }
}
