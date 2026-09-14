import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogPrioridad } from '../models/mLogPrioridad';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogPrioridad{

    constructor(
        public _http : Http
    ){}

    getLogPrioridad(): Observable<any>{
        return this._http.get(configuracion.url+'LogPrioridad').map((res: Response) => res.json());
    }

    getLogPrioridadbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPrioridad/'+_id).map((res: Response) => res.json());
    }

    getLogPrioridadbyidLogPrioridad(_idLogPrioridad:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPrioridad/GetLogPrioridadbyidLogPrioridad/idLogPrioridad='+_idLogPrioridad).map((res: Response) => res.json());
    }

    getLogPrioridadbyidPrioridad(_idPrioridad:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPrioridad/GetLogPrioridadbyidPrioridad/idPrioridad='+_idPrioridad).map((res: Response) => res.json());
    }

    getLogPrioridadbynombrePrioridad(_nombrePrioridad:string): Observable<any>{
        return this._http.get(configuracion.url+'LogPrioridad/GetLogPrioridadbynombrePrioridad/nombrePrioridad='+_nombrePrioridad).map((res: Response) => res.json());
    }

    getLogPrioridadbyidSemaforo(_idSemaforo:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPrioridad/GetLogPrioridadbyidSemaforo/idSemaforo='+_idSemaforo).map((res: Response) => res.json());
    }

    getLogPrioridadbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPrioridad/GetLogPrioridadbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogPrioridadbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogPrioridad/GetLogPrioridadbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogPrioridadbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogPrioridad/GetLogPrioridadbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogPrioridadbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogPrioridad/GetLogPrioridadbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogPrioridadbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPrioridad/GetLogPrioridadbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogPrioridadbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPrioridad/GetLogPrioridadbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogPrioridad(_LogPrioridad:mLogPrioridad):any{
        return $.post( configuracion.url+'LogPrioridad', _LogPrioridad )
    }

    postUpdDelLogPrioridad(_LogPrioridad:mLogPrioridad):any{
        return $.post( configuracion.url+'LogPrioridad/'+_LogPrioridad.idLogPrioridad, _LogPrioridad )
    }
}
