import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mDirectorProyectoMatriz } from '../models/mDirectorProyectoMatriz';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sDirectorProyectoMatriz{

    constructor(
        public _http : Http
    ){}

    getDirectorProyectoMatriz(): Observable<any>{
        return this._http.get(configuracion.url+'DirectorProyectoMatriz').map((res: Response) => res.json());
    }

    getDirectorProyectoMatrizbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'DirectorProyectoMatriz/'+_id).map((res: Response) => res.json());
    }

    getDirectorProyectoMatrizbyidDirectorProyectoMatriz(_idDirectorProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'DirectorProyectoMatriz/GetDirectorProyectoMatrizbyidDirectorProyectoMatriz/idDirectorProyectoMatriz='+_idDirectorProyectoMatriz).map((res: Response) => res.json());
    }

    getDirectorProyectoMatrizbyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'DirectorProyectoMatriz/GetDirectorProyectoMatrizbyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getDirectorProyectoMatrizbyidUsuarioDirector(_idUsuarioDirector:number): Observable<any>{
        return this._http.get(configuracion.url+'DirectorProyectoMatriz/GetDirectorProyectoMatrizbyidUsuarioDirector/idUsuarioDirector='+_idUsuarioDirector).map((res: Response) => res.json());
    }

    getDirectorProyectoMatrizbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'DirectorProyectoMatriz/GetDirectorProyectoMatrizbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getDirectorProyectoMatrizbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'DirectorProyectoMatriz/GetDirectorProyectoMatrizbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getDirectorProyectoMatrizbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'DirectorProyectoMatriz/GetDirectorProyectoMatrizbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getDirectorProyectoMatrizbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'DirectorProyectoMatriz/GetDirectorProyectoMatrizbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getDirectorProyectoMatrizbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'DirectorProyectoMatriz/GetDirectorProyectoMatrizbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddDirectorProyectoMatriz(_DirectorProyectoMatriz:mDirectorProyectoMatriz):any{
        return $.post( configuracion.url+'DirectorProyectoMatriz', _DirectorProyectoMatriz )
    }

    postUpdDelDirectorProyectoMatriz(_DirectorProyectoMatriz:mDirectorProyectoMatriz):any{
        return $.post( configuracion.url+'DirectorProyectoMatriz/'+_DirectorProyectoMatriz.idDirectorProyectoMatriz, _DirectorProyectoMatriz )
    }
}
