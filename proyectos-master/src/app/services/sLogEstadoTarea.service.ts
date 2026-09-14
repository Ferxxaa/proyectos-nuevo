import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogEstadoTarea } from '../models/mLogEstadoTarea';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogEstadoTarea{

    constructor(
        public _http : Http
    ){}

    getLogEstadoTarea(): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoTarea').map((res: Response) => res.json());
    }

    getLogEstadoTareabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoTarea/'+_id).map((res: Response) => res.json());
    }

    getLogEstadoTareabyidLogTarea(_idLogTarea:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoTarea/GetLogEstadoTareabyidLogTarea/idLogTarea='+_idLogTarea).map((res: Response) => res.json());
    }

    getLogEstadoTareabyidEstadoTarea(_idEstadoTarea:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoTarea/GetLogEstadoTareabyidEstadoTarea/idEstadoTarea='+_idEstadoTarea).map((res: Response) => res.json());
    }

    getLogEstadoTareabynombreEstadoTarea(_nombreEstadoTarea:string): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoTarea/GetLogEstadoTareabynombreEstadoTarea/nombreEstadoTarea='+_nombreEstadoTarea).map((res: Response) => res.json());
    }

    getLogEstadoTareabypendiente(_pendiente:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoTarea/GetLogEstadoTareabypendiente/pendiente='+_pendiente).map((res: Response) => res.json());
    }

    getLogEstadoTareabyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoTarea/GetLogEstadoTareabyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogEstadoTareabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoTarea/GetLogEstadoTareabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogEstadoTareabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoTarea/GetLogEstadoTareabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogEstadoTareabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoTarea/GetLogEstadoTareabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogEstadoTareabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoTarea/GetLogEstadoTareabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogEstadoTareabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogEstadoTarea/GetLogEstadoTareabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogEstadoTarea(_LogEstadoTarea:mLogEstadoTarea):any{
        return $.post( configuracion.url+'LogEstadoTarea', _LogEstadoTarea )
    }

    postUpdDelLogEstadoTarea(_LogEstadoTarea:mLogEstadoTarea):any{
        return $.post( configuracion.url+'LogEstadoTarea/'+_LogEstadoTarea.idLogTarea, _LogEstadoTarea )
    }
}
