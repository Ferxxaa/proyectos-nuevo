import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogDirectorProyectoMatriz } from '../models/mLogDirectorProyectoMatriz';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogDirectorProyectoMatriz{

    constructor(
        public _http : Http
    ){}

    getLogDirectorProyectoMatriz(): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectorProyectoMatriz').map((res: Response) => res.json());
    }

    getLogDirectorProyectoMatrizbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectorProyectoMatriz/'+_id).map((res: Response) => res.json());
    }

    getLogDirectorProyectoMatrizbyidLogDirectorProyectoMatriz(_idLogDirectorProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectorProyectoMatriz/GetLogDirectorProyectoMatrizbyidLogDirectorProyectoMatriz/idLogDirectorProyectoMatriz='+_idLogDirectorProyectoMatriz).map((res: Response) => res.json());
    }

    getLogDirectorProyectoMatrizbyidDirectorProyectoMatriz(_idDirectorProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectorProyectoMatriz/GetLogDirectorProyectoMatrizbyidDirectorProyectoMatriz/idDirectorProyectoMatriz='+_idDirectorProyectoMatriz).map((res: Response) => res.json());
    }

    getLogDirectorProyectoMatrizbyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectorProyectoMatriz/GetLogDirectorProyectoMatrizbyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getLogDirectorProyectoMatrizbyidUsuarioDirector(_idUsuarioDirector:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectorProyectoMatriz/GetLogDirectorProyectoMatrizbyidUsuarioDirector/idUsuarioDirector='+_idUsuarioDirector).map((res: Response) => res.json());
    }

    getLogDirectorProyectoMatrizbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectorProyectoMatriz/GetLogDirectorProyectoMatrizbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogDirectorProyectoMatrizbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectorProyectoMatriz/GetLogDirectorProyectoMatrizbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogDirectorProyectoMatrizbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectorProyectoMatriz/GetLogDirectorProyectoMatrizbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogDirectorProyectoMatrizbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectorProyectoMatriz/GetLogDirectorProyectoMatrizbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogDirectorProyectoMatrizbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDirectorProyectoMatriz/GetLogDirectorProyectoMatrizbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogDirectorProyectoMatriz(_LogDirectorProyectoMatriz:mLogDirectorProyectoMatriz):any{
        return $.post( configuracion.url+'LogDirectorProyectoMatriz', _LogDirectorProyectoMatriz )
    }

    postUpdDelLogDirectorProyectoMatriz(_LogDirectorProyectoMatriz:mLogDirectorProyectoMatriz):any{
        return $.post( configuracion.url+'LogDirectorProyectoMatriz/'+_LogDirectorProyectoMatriz.idLogDirectorProyectoMatriz, _LogDirectorProyectoMatriz )
    }
}
