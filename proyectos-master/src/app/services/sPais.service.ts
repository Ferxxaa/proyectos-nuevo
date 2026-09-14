import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mPais } from '../models/mPais';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sPais{

    constructor(
        public _http : Http
    ){}

    getPais(): Observable<any>{
        return this._http.get(configuracion.url+'Pais').map((res: Response) => res.json());
    }

    getPaisbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Pais/'+_id).map((res: Response) => res.json());
    }

    getPaisbyidPais(_idPais:number): Observable<any>{
        return this._http.get(configuracion.url+'Pais/GetPaisbyidPais/idPais='+_idPais).map((res: Response) => res.json());
    }

    getPaisbynombrePais(_nombrePais:string): Observable<any>{
        return this._http.get(configuracion.url+'Pais/GetPaisbynombrePais/nombrePais='+_nombrePais).map((res: Response) => res.json());
    }

    getPaisbycultura(_cultura:string): Observable<any>{
        return this._http.get(configuracion.url+'Pais/GetPaisbycultura/cultura='+_cultura).map((res: Response) => res.json());
    }

    getPaisbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Pais/GetPaisbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getPaisbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Pais/GetPaisbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getPaisbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Pais/GetPaisbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getPaisbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Pais/GetPaisbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getPaisbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Pais/GetPaisbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddPais(_Pais:mPais):any{
        return $.post( configuracion.url+'Pais', _Pais )
    }

    postUpdDelPais(_Pais:mPais):any{
        return $.post( configuracion.url+'Pais/'+_Pais.idPais, _Pais )
    }
}
