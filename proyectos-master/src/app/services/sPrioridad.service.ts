import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mPrioridad } from '../models/mPrioridad';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sPrioridad{

    constructor(
        public _http : Http
    ){}

    getPrioridad(): Observable<any>{
        return this._http.get(configuracion.url+'Prioridad').map((res: Response) => res.json());
    }

    getPrioridadbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Prioridad/'+_id).map((res: Response) => res.json());
    }

    getPrioridadbyidPrioridad(_idPrioridad:number): Observable<any>{
        return this._http.get(configuracion.url+'Prioridad/GetPrioridadbyidPrioridad/idPrioridad='+_idPrioridad).map((res: Response) => res.json());
    }

    getPrioridadbynombrePrioridad(_nombrePrioridad:string): Observable<any>{
        return this._http.get(configuracion.url+'Prioridad/GetPrioridadbynombrePrioridad/nombrePrioridad='+_nombrePrioridad).map((res: Response) => res.json());
    }

    getPrioridadbyidSemaforo(_idSemaforo:number): Observable<any>{
        return this._http.get(configuracion.url+'Prioridad/GetPrioridadbyidSemaforo/idSemaforo='+_idSemaforo).map((res: Response) => res.json());
    }

    getPrioridadbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'Prioridad/GetPrioridadbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getPrioridadbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Prioridad/GetPrioridadbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getPrioridadbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Prioridad/GetPrioridadbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getPrioridadbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Prioridad/GetPrioridadbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getPrioridadbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Prioridad/GetPrioridadbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getPrioridadbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Prioridad/GetPrioridadbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddPrioridad(_Prioridad:mPrioridad):any{
        return $.post( configuracion.url+'Prioridad', _Prioridad )
    }

    postUpdDelPrioridad(_Prioridad:mPrioridad):any{
        return $.post( configuracion.url+'Prioridad/'+_Prioridad.idPrioridad, _Prioridad )
    }
}
