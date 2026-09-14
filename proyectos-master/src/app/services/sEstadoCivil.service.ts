import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mEstadoCivil } from '../models/mEstadoCivil';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sEstadoCivil{

    constructor(
        public _http : Http
    ){}

    getEstadoCivil(): Observable<any>{
        return this._http.get(configuracion.url+'EstadoCivil').map((res: Response) => res.json());
    }

    getEstadoCivilbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'EstadoCivil/'+_id).map((res: Response) => res.json());
    }

    getEstadoCivilbyidEstadoCivil(_idEstadoCivil:number): Observable<any>{
        return this._http.get(configuracion.url+'EstadoCivil/GetEstadoCivilbyidEstadoCivil/idEstadoCivil='+_idEstadoCivil).map((res: Response) => res.json());
    }

    getEstadoCivilbynombreEstadoCivil(_nombreEstadoCivil:string): Observable<any>{
        return this._http.get(configuracion.url+'EstadoCivil/GetEstadoCivilbynombreEstadoCivil/nombreEstadoCivil='+_nombreEstadoCivil).map((res: Response) => res.json());
    }

    getEstadoCivilbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'EstadoCivil/GetEstadoCivilbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getEstadoCivilbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'EstadoCivil/GetEstadoCivilbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getEstadoCivilbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'EstadoCivil/GetEstadoCivilbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getEstadoCivilbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'EstadoCivil/GetEstadoCivilbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getEstadoCivilbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'EstadoCivil/GetEstadoCivilbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddEstadoCivil(_EstadoCivil:mEstadoCivil):any{
        return $.post( configuracion.url+'EstadoCivil', _EstadoCivil )
    }

    postUpdDelEstadoCivil(_EstadoCivil:mEstadoCivil):any{
        return $.post( configuracion.url+'EstadoCivil/'+_EstadoCivil.idEstadoCivil, _EstadoCivil )
    }
}
