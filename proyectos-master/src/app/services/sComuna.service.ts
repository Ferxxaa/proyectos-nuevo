import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mComuna } from '../models/mComuna';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sComuna{

    constructor(
        public _http : Http
    ){}

    getComuna(): Observable<any>{
        return this._http.get(configuracion.url+'Comuna').map((res: Response) => res.json());
    }

    getComunabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Comuna/'+_id).map((res: Response) => res.json());
    }

    getComunabyidComuna(_idComuna:number): Observable<any>{
        return this._http.get(configuracion.url+'Comuna/GetComunabyidComuna/idComuna='+_idComuna).map((res: Response) => res.json());
    }

    getComunabynombreComuna(_nombreComuna:string): Observable<any>{
        return this._http.get(configuracion.url+'Comuna/GetComunabynombreComuna/nombreComuna='+_nombreComuna).map((res: Response) => res.json());
    }

    getComunabyidProvincia(_idProvincia:number): Observable<any>{
        return this._http.get(configuracion.url+'Comuna/GetComunabyidProvincia/idProvincia='+_idProvincia).map((res: Response) => res.json());
    }

    getComunabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Comuna/GetComunabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getComunabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Comuna/GetComunabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getComunabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Comuna/GetComunabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getComunabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Comuna/GetComunabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getComunabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Comuna/GetComunabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddComuna(_Comuna:mComuna):any{
        return $.post( configuracion.url+'Comuna', _Comuna )
    }

    postUpdDelComuna(_Comuna:mComuna):any{
        return $.post( configuracion.url+'Comuna/'+_Comuna.idComuna, _Comuna )
    }
}
