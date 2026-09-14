import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mProyectoMatriz } from '../models/mProyectoMatriz';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sProyectoMatriz{

    constructor(
        public _http : Http
    ){}

    getProyectoMatriz(): Observable<any>{
        return this._http.get(configuracion.url+'ProyectoMatriz').map((res: Response) => res.json());
    }

    getProyectoMatrizbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'ProyectoMatriz/'+_id).map((res: Response) => res.json());
    }

    getProyectoMatrizbyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'ProyectoMatriz/GetProyectoMatrizbyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getProyectoMatrizbynombreProyectoMatriz(_nombreProyectoMatriz:string): Observable<any>{
        return this._http.get(configuracion.url+'ProyectoMatriz/GetProyectoMatrizbynombreProyectoMatriz/nombreProyectoMatriz='+_nombreProyectoMatriz).map((res: Response) => res.json());
    }

    getProyectoMatrizbyidSponsorCliente(_idSponsorCliente:number): Observable<any>{
        return this._http.get(configuracion.url+'ProyectoMatriz/GetProyectoMatrizbyidSponsorCliente/idSponsorCliente='+_idSponsorCliente).map((res: Response) => res.json());
    }

    getProyectoMatrizbyidUsuarioSubGerente(_idUsuarioSubGerente:number): Observable<any>{
        return this._http.get(configuracion.url+'ProyectoMatriz/GetProyectoMatrizbyidUsuarioSubGerente/idUsuarioSubGerente='+_idUsuarioSubGerente).map((res: Response) => res.json());
    }

    getProyectoMatrizbyidEstadoProyecto(_idEstadoProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'ProyectoMatriz/GetProyectoMatrizbyidEstadoProyecto/idEstadoProyecto='+_idEstadoProyecto).map((res: Response) => res.json());
    }

    getProyectoMatrizbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'ProyectoMatriz/GetProyectoMatrizbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getProyectoMatrizbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'ProyectoMatriz/GetProyectoMatrizbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getProyectoMatrizbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'ProyectoMatriz/GetProyectoMatrizbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getProyectoMatrizbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'ProyectoMatriz/GetProyectoMatrizbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getProyectoMatrizbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'ProyectoMatriz/GetProyectoMatrizbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddProyectoMatriz(_ProyectoMatriz:mProyectoMatriz):any{
        return $.post( configuracion.url+'ProyectoMatriz', _ProyectoMatriz )
    }

    postUpdDelProyectoMatriz(_ProyectoMatriz:mProyectoMatriz):any{
        return $.post( configuracion.url+'ProyectoMatriz/'+_ProyectoMatriz.idProyectoMatriz, _ProyectoMatriz )
    }
}
