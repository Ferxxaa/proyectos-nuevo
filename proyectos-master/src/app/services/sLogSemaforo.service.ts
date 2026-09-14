import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogSemaforo } from '../models/mLogSemaforo';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogSemaforo{

    constructor(
        public _http : Http
    ){}

    getLogSemaforo(): Observable<any>{
        return this._http.get(configuracion.url+'LogSemaforo').map((res: Response) => res.json());
    }

    getLogSemaforobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSemaforo/'+_id).map((res: Response) => res.json());
    }

    getLogSemaforobyidLogSemaforo(_idLogSemaforo:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSemaforo/GetLogSemaforobyidLogSemaforo/idLogSemaforo='+_idLogSemaforo).map((res: Response) => res.json());
    }

    getLogSemaforobyidSemaforo(_idSemaforo:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSemaforo/GetLogSemaforobyidSemaforo/idSemaforo='+_idSemaforo).map((res: Response) => res.json());
    }

    getLogSemaforobynombreSemaforo(_nombreSemaforo:string): Observable<any>{
        return this._http.get(configuracion.url+'LogSemaforo/GetLogSemaforobynombreSemaforo/nombreSemaforo='+_nombreSemaforo).map((res: Response) => res.json());
    }

    getLogSemaforobyimagen(_imagen:string): Observable<any>{
        return this._http.get(configuracion.url+'LogSemaforo/GetLogSemaforobyimagen/imagen='+_imagen).map((res: Response) => res.json());
    }

    getLogSemaforobyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSemaforo/GetLogSemaforobyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogSemaforobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSemaforo/GetLogSemaforobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogSemaforobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogSemaforo/GetLogSemaforobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogSemaforobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSemaforo/GetLogSemaforobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogSemaforobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSemaforo/GetLogSemaforobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogSemaforobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSemaforo/GetLogSemaforobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogSemaforo(_LogSemaforo:mLogSemaforo):any{
        return $.post( configuracion.url+'LogSemaforo', _LogSemaforo )
    }

    postUpdDelLogSemaforo(_LogSemaforo:mLogSemaforo):any{
        return $.post( configuracion.url+'LogSemaforo/'+_LogSemaforo.idLogSemaforo, _LogSemaforo )
    }
}
