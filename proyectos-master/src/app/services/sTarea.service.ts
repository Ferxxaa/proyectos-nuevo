import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mTarea } from '../models/mTarea';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sTarea{

    constructor(
        public _http : Http
    ){}

    getTarea(): Observable<any>{
        return this._http.get(configuracion.url+'Tarea').map((res: Response) => res.json());
    }

    getTareabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/'+_id).map((res: Response) => res.json());
    }

    getTareabyidTarea(_idTarea:number): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyidTarea/idTarea='+_idTarea).map((res: Response) => res.json());
    }

    getTareabyidDetalleSubProyecto(_idDetalleSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyidDetalleSubProyecto/idDetalleSubProyecto='+_idDetalleSubProyecto).map((res: Response) => res.json());
    }

    getTareabynombreTarea(_nombreTarea:string): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabynombreTarea/nombreTarea='+_nombreTarea).map((res: Response) => res.json());
    }

    getTareabydescripcionTarea(_descripcionTarea:string): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabydescripcionTarea/descripcionTarea='+_descripcionTarea).map((res: Response) => res.json());
    }

    getTareabyidUsuarioResponsable(_idUsuarioResponsable:number): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyidUsuarioResponsable/idUsuarioResponsable='+_idUsuarioResponsable).map((res: Response) => res.json());
    }

    getTareabyfechaInicioProgramado(_fechaInicioProgramado:Date): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyfechaInicioProgramado/fechaInicioProgramado='+_fechaInicioProgramado).map((res: Response) => res.json());
    }

    getTareabyfechaTerminoProgramado(_fechaTerminoProgramado:Date): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyfechaTerminoProgramado/fechaTerminoProgramado='+_fechaTerminoProgramado).map((res: Response) => res.json());
    }

    getTareabyfechaInicioReal(_fechaInicioReal:Date): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyfechaInicioReal/fechaInicioReal='+_fechaInicioReal).map((res: Response) => res.json());
    }

    getTareabyfechaTerminoReal(_fechaTerminoReal:Date): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyfechaTerminoReal/fechaTerminoReal='+_fechaTerminoReal).map((res: Response) => res.json());
    }

    getTareabyidEstadoTarea(_idEstadoTarea:number): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyidEstadoTarea/idEstadoTarea='+_idEstadoTarea).map((res: Response) => res.json());
    }

    getTareabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getTareabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getTareabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getTareabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getTareabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    getTareabyprioridad(_prioridad:string): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyprioridad/prioridad='+_prioridad).map((res: Response) => res.json());
    }

    getTareabyarea(_area:string): Observable<any>{
        return this._http.get(configuracion.url+'Tarea/GetTareabyarea/area='+_area).map((res: Response) => res.json());
    }

    postAddTarea(_Tarea:mTarea):any{
        console.log(configuracion.url+'Tarea');
        
        return $.post( configuracion.url+'Tarea', _Tarea )
    }

    postUpdDelTarea(_Tarea:mTarea):any{
        return $.post( configuracion.url+'Tarea/'+_Tarea.idTarea, _Tarea )
    }
}
