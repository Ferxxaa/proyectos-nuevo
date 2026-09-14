import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogEstadoProyecto } from '../models/mLogEstadoProyecto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogEstadoProyecto{

    constructor(
        public _http : Http
    ){}

    getLogEstadoProyecto(): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoProyecto').map((res: Response) => res.json());
    }

    getLogEstadoProyectobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoProyecto/'+_id).map((res: Response) => res.json());
    }

    getLogEstadoProyectobyidLogEstadoProyecto(_idLogEstadoProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoProyecto/GetLogEstadoProyectobyidLogEstadoProyecto/idLogEstadoProyecto='+_idLogEstadoProyecto).map((res: Response) => res.json());
    }

    getLogEstadoProyectobyidEstadoProyecto(_idEstadoProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoProyecto/GetLogEstadoProyectobyidEstadoProyecto/idEstadoProyecto='+_idEstadoProyecto).map((res: Response) => res.json());
    }

    getLogEstadoProyectobynombreEstadoProyecto(_nombreEstadoProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoProyecto/GetLogEstadoProyectobynombreEstadoProyecto/nombreEstadoProyecto='+_nombreEstadoProyecto).map((res: Response) => res.json());
    }

    getLogEstadoProyectobyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoProyecto/GetLogEstadoProyectobyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogEstadoProyectobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoProyecto/GetLogEstadoProyectobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogEstadoProyectobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoProyecto/GetLogEstadoProyectobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogEstadoProyectobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoProyecto/GetLogEstadoProyectobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogEstadoProyectobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoProyecto/GetLogEstadoProyectobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogEstadoProyectobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoProyecto/GetLogEstadoProyectobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogEstadoProyecto(_LogEstadoProyecto:mLogEstadoProyecto):any{
        return $.post( configuracion.url+'LogEstadoProyecto', _LogEstadoProyecto )
    }

    postUpdDelLogEstadoProyecto(_LogEstadoProyecto:mLogEstadoProyecto):any{
        return $.post( configuracion.url+'LogEstadoProyecto/'+_LogEstadoProyecto.idLogEstadoProyecto, _LogEstadoProyecto )
    }
}
