import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogTarea } from '../models/mLogTarea';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogTarea{

    constructor(
        public _http : Http
    ){}

    getLogTarea(): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea').map((res: Response) => res.json());
    }

    getLogTareabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/'+_id).map((res: Response) => res.json());
    }

    getLogTareabyidLogTarea(_idLogTarea:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabyidLogTarea/idLogTarea='+_idLogTarea).map((res: Response) => res.json());
    }

    getLogTareabyidTarea(_idTarea:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabyidTarea/idTarea='+_idTarea).map((res: Response) => res.json());
    }

    getLogTareabyidDetalleSubProyecto(_idDetalleSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabyidDetalleSubProyecto/idDetalleSubProyecto='+_idDetalleSubProyecto).map((res: Response) => res.json());
    }

    getLogTareabynombreTarea(_nombreTarea:string): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabynombreTarea/nombreTarea='+_nombreTarea).map((res: Response) => res.json());
    }

    getLogTareabydescripcionTarea(_descripcionTarea:string): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabydescripcionTarea/descripcionTarea='+_descripcionTarea).map((res: Response) => res.json());
    }

    getLogTareabyidUsuarioResponsable(_idUsuarioResponsable:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabyidUsuarioResponsable/idUsuarioResponsable='+_idUsuarioResponsable).map((res: Response) => res.json());
    }

    getLogTareabyfechaInicioProgramado(_fechaInicioProgramado:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabyfechaInicioProgramado/fechaInicioProgramado='+_fechaInicioProgramado).map((res: Response) => res.json());
    }

    getLogTareabyfechaTerminoProgramado(_fechaTerminoProgramado:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabyfechaTerminoProgramado/fechaTerminoProgramado='+_fechaTerminoProgramado).map((res: Response) => res.json());
    }

    getLogTareabyfechaInicioReal(_fechaInicioReal:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabyfechaInicioReal/fechaInicioReal='+_fechaInicioReal).map((res: Response) => res.json());
    }

    getLogTareabyfechaTerminoReal(_fechaTerminoReal:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabyfechaTerminoReal/fechaTerminoReal='+_fechaTerminoReal).map((res: Response) => res.json());
    }

    getLogTareabyidEstadoTarea(_idEstadoTarea:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabyidEstadoTarea/idEstadoTarea='+_idEstadoTarea).map((res: Response) => res.json());
    }

    getLogTareabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogTareabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogTareabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogTareabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogTareabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTarea/GetLogTareabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogTarea(_LogTarea:mLogTarea):any{
        return $.post( configuracion.url+'LogTarea', _LogTarea )
    }

    postUpdDelLogTarea(_LogTarea:mLogTarea):any{
        return $.post( configuracion.url+'LogTarea/'+_LogTarea.idLogTarea, _LogTarea )
    }
}
