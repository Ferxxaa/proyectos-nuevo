import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mPagina } from '../models/mPagina';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sPagina{

    constructor(
        public _http : Http
    ){}

    getPagina(): Observable<any>{
        return this._http.get(configuracion.url+'Pagina').map((res: Response) => res.json());
    }

    getPaginabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Pagina/'+_id).map((res: Response) => res.json());
    }

    getPaginabyidPagina(_idPagina:number): Observable<any>{
        return this._http.get(configuracion.url+'Pagina/GetPaginabyidPagina/idPagina='+_idPagina).map((res: Response) => res.json());
    }

    getPaginabynombrePagina(_nombrePagina:string): Observable<any>{
        return this._http.get(configuracion.url+'Pagina/GetPaginabynombrePagina/nombrePagina='+_nombrePagina).map((res: Response) => res.json());
    }

    getPaginabyruta(_ruta:string): Observable<any>{
        return this._http.get(configuracion.url+'Pagina/GetPaginabyruta/ruta='+_ruta).map((res: Response) => res.json());
    }

    getPaginabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Pagina/GetPaginabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getPaginabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Pagina/GetPaginabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getPaginabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Pagina/GetPaginabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getPaginabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Pagina/GetPaginabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getPaginabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Pagina/GetPaginabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddPagina(_Pagina:mPagina):any{
        return $.post( configuracion.url+'Pagina', _Pagina )
    }

    postUpdDelPagina(_Pagina:mPagina):any{
        return $.post( configuracion.url+'Pagina/'+_Pagina.idPagina, _Pagina )
    }
}
