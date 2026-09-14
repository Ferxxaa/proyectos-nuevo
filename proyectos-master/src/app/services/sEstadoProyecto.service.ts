import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mEstadoProyecto } from '../models/mEstadoProyecto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sEstadoProyecto{

    constructor(
        public _http : Http
    ){}

    getEstadoProyecto(): Observable<any>{
        return this._http.get(configuracion.url+'EstadoProyecto').map((res: Response) => res.json());
    }

    getEstadoProyectobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'EstadoProyecto/'+_id).map((res: Response) => res.json());
    }

    getEstadoProyectobyidEstadoProyecto(_idEstadoProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'EstadoProyecto/GetEstadoProyectobyidEstadoProyecto/idEstadoProyecto='+_idEstadoProyecto).map((res: Response) => res.json());
    }

    getEstadoProyectobynombreEstadoProyecto(_nombreEstadoProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'EstadoProyecto/GetEstadoProyectobynombreEstadoProyecto/nombreEstadoProyecto='+_nombreEstadoProyecto).map((res: Response) => res.json());
    }

    getEstadoProyectobyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'EstadoProyecto/GetEstadoProyectobyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getEstadoProyectobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'EstadoProyecto/GetEstadoProyectobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getEstadoProyectobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'EstadoProyecto/GetEstadoProyectobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getEstadoProyectobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'EstadoProyecto/GetEstadoProyectobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getEstadoProyectobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'EstadoProyecto/GetEstadoProyectobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getEstadoProyectobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'EstadoProyecto/GetEstadoProyectobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddEstadoProyecto(_EstadoProyecto:mEstadoProyecto):any{
        return $.post( configuracion.url+'EstadoProyecto', _EstadoProyecto )
    }

    postUpdDelEstadoProyecto(_EstadoProyecto:mEstadoProyecto):any{
        return $.post( configuracion.url+'EstadoProyecto/'+_EstadoProyecto.idEstadoProyecto, _EstadoProyecto )
    }
}
