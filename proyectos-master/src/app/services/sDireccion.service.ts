import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mDireccion } from '../models/mDireccion';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sDireccion{

    constructor(
        public _http : Http
    ){}

    getDireccion(): Observable<any>{
        return this._http.get(configuracion.url+'Direccion').map((res: Response) => res.json());
    }

    getDireccionbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Direccion/'+_id).map((res: Response) => res.json());
    }

    getDireccionbyidDireccion(_idDireccion:number): Observable<any>{
        return this._http.get(configuracion.url+'Direccion/GetDireccionbyidDireccion/idDireccion='+_idDireccion).map((res: Response) => res.json());
    }

    getDireccionbycalle(_calle:string): Observable<any>{
        return this._http.get(configuracion.url+'Direccion/GetDireccionbycalle/calle='+encodeURIComponent(_calle)).map((res: Response) => res.json());
    }

    getDireccionbynumero(_numero:string): Observable<any>{
        return this._http.get(configuracion.url+'Direccion/GetDireccionbynumero/numero='+encodeURIComponent(_numero)).map((res: Response) => res.json());
    }

    getDireccionbyreferencia(_referencia:string): Observable<any>{
        return this._http.get(configuracion.url+'Direccion/GetDireccionbyreferencia/referencia='+encodeURIComponent(_referencia)).map((res: Response) => res.json());
    }

    getDireccionbyidComuna(_idComuna:number): Observable<any>{
        return this._http.get(configuracion.url+'Direccion/GetDireccionbyidComuna/idComuna='+_idComuna).map((res: Response) => res.json());
    }

    getDireccionbyidTipoDireccion(_idTipoDireccion:number): Observable<any>{
        return this._http.get(configuracion.url+'Direccion/GetDireccionbyidTipoDireccion/idTipoDireccion='+_idTipoDireccion).map((res: Response) => res.json());
    }

    getDireccionbyidPersona(_idPersona:number): Observable<any>{
        return this._http.get(configuracion.url+'Direccion/GetDireccionbyidPersona/idPersona='+_idPersona).map((res: Response) => res.json());
    }

    getDireccionbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Direccion/GetDireccionbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getDireccionbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Direccion/GetDireccionbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getDireccionbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Direccion/GetDireccionbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getDireccionbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Direccion/GetDireccionbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getDireccionbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Direccion/GetDireccionbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddDireccion(_Direccion:mDireccion):any{
        return $.post( configuracion.url+'Direccion', _Direccion )
    }

    postUpdDelDireccion(_Direccion:mDireccion):any{
        return $.post( configuracion.url+'Direccion/'+_Direccion.idDireccion, _Direccion )
    }
}
