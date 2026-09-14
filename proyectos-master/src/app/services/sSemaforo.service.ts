import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mSemaforo } from '../models/mSemaforo';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sSemaforo{

    constructor(
        public _http : Http
    ){}

    getSemaforo(): Observable<any>{
        return this._http.get(configuracion.url+'Semaforo').map((res: Response) => res.json());
    }

    getSemaforobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Semaforo/'+_id).map((res: Response) => res.json());
    }

    getSemaforobyidSemaforo(_idSemaforo:number): Observable<any>{
        return this._http.get(configuracion.url+'Semaforo/GetSemaforobyidSemaforo/idSemaforo='+_idSemaforo).map((res: Response) => res.json());
    }

    getSemaforobynombreSemaforo(_nombreSemaforo:string): Observable<any>{
        return this._http.get(configuracion.url+'Semaforo/GetSemaforobynombreSemaforo/nombreSemaforo='+_nombreSemaforo).map((res: Response) => res.json());
    }

    getSemaforobyimagen(_imagen:string): Observable<any>{
        return this._http.get(configuracion.url+'Semaforo/GetSemaforobyimagen/imagen='+_imagen).map((res: Response) => res.json());
    }

    getSemaforobyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'Semaforo/GetSemaforobyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getSemaforobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Semaforo/GetSemaforobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getSemaforobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Semaforo/GetSemaforobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getSemaforobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Semaforo/GetSemaforobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getSemaforobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Semaforo/GetSemaforobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getSemaforobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Semaforo/GetSemaforobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddSemaforo(_Semaforo:mSemaforo):any{
        return $.post( configuracion.url+'Semaforo', _Semaforo )
    }

    postUpdDelSemaforo(_Semaforo:mSemaforo):any{
        return $.post( configuracion.url+'Semaforo/'+_Semaforo.idSemaforo, _Semaforo )
    }
}
