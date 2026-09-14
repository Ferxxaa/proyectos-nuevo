import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mEstadoTarea } from '../models/mEstadoTarea';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sEstadoTarea{

    constructor(
        public _http : Http
    ){}

    getEstadoTarea(): Observable<mEstadoTarea[]>{
        return this._http.get(configuracion.url+'EstadoTarea').map((res: Response) => res.json());
    }

    getEstadoTareabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'EstadoTarea/'+_id).map((res: Response) => res.json());
    }

    getEstadoTareabyidEstadoTarea(_idEstadoTarea:number): Observable<any>{
        return this._http.get(configuracion.url+'EstadoTarea/GetEstadoTareabyidEstadoTarea/idEstadoTarea='+_idEstadoTarea).map((res: Response) => res.json());
    }

    getEstadoTareabynombreEstadoTarea(_nombreEstadoTarea:string): Observable<any>{
        return this._http.get(configuracion.url+'EstadoTarea/GetEstadoTareabynombreEstadoTarea/nombreEstadoTarea='+_nombreEstadoTarea).map((res: Response) => res.json());
    }

    getEstadoTareabypendiente(_pendiente:boolean): Observable<any>{
        return this._http.get(configuracion.url+'EstadoTarea/GetEstadoTareabypendiente/pendiente='+_pendiente).map((res: Response) => res.json());
    }

    getEstadoTareabyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'EstadoTarea/GetEstadoTareabyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getEstadoTareabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'EstadoTarea/GetEstadoTareabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getEstadoTareabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'EstadoTarea/GetEstadoTareabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getEstadoTareabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'EstadoTarea/GetEstadoTareabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getEstadoTareabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'EstadoTarea/GetEstadoTareabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getEstadoTareabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'EstadoTarea/GetEstadoTareabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddEstadoTarea(_EstadoTarea:mEstadoTarea):any{
        return $.post( configuracion.url+'EstadoTarea', _EstadoTarea )
    }

    postUpdDelEstadoTarea(_EstadoTarea:mEstadoTarea):any{
        return $.post( configuracion.url+'EstadoTarea/'+_EstadoTarea.idEstadoTarea, _EstadoTarea )
    }
}
