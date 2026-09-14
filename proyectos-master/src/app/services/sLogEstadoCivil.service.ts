import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogEstadoCivil } from '../models/mLogEstadoCivil';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogEstadoCivil{

    constructor(
        public _http : Http
    ){}

    getLogEstadoCivil(): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoCivil').map((res: Response) => res.json());
    }

    getLogEstadoCivilbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoCivil/'+_id).map((res: Response) => res.json());
    }

    getLogEstadoCivilbyidLogEstadoCivil(_idLogEstadoCivil:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoCivil/GetLogEstadoCivilbyidLogEstadoCivil/idLogEstadoCivil='+_idLogEstadoCivil).map((res: Response) => res.json());
    }

    getLogEstadoCivilbyidEstadoCivil(_idEstadoCivil:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoCivil/GetLogEstadoCivilbyidEstadoCivil/idEstadoCivil='+_idEstadoCivil).map((res: Response) => res.json());
    }

    getLogEstadoCivilbynombreEstadoCivil(_nombreEstadoCivil:string): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoCivil/GetLogEstadoCivilbynombreEstadoCivil/nombreEstadoCivil='+_nombreEstadoCivil).map((res: Response) => res.json());
    }

    getLogEstadoCivilbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoCivil/GetLogEstadoCivilbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogEstadoCivilbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoCivil/GetLogEstadoCivilbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogEstadoCivilbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoCivil/GetLogEstadoCivilbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogEstadoCivilbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoCivil/GetLogEstadoCivilbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogEstadoCivilbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoCivil/GetLogEstadoCivilbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogEstadoCivil(_LogEstadoCivil:mLogEstadoCivil):any{
        return $.post( configuracion.url+'LogEstadoCivil', _LogEstadoCivil )
    }

    postUpdDelLogEstadoCivil(_LogEstadoCivil:mLogEstadoCivil):any{
        return $.post( configuracion.url+'LogEstadoCivil/'+_LogEstadoCivil.idLogEstadoCivil, _LogEstadoCivil )
    }
}
