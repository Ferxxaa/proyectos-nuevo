import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mMis_Tareas } from '../models/mMis_Tareas';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sMis_Tareas{

    constructor(
        public _http : Http
    ){}

    getMis_Tareas(): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas').map((res: Response) => res.json());
    }

    getMis_TareasbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/'+_id).map((res: Response) => res.json());
    }

    getMis_TareasbyidTarea(_idTarea:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyidTarea/idTarea='+_idTarea).map((res: Response) => res.json());
    }

    getMis_TareasbyidDetalleSubProyecto(_idDetalleSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyidDetalleSubProyecto/idDetalleSubProyecto='+_idDetalleSubProyecto).map((res: Response) => res.json());
    }

    getMis_TareasbynombreTarea(_nombreTarea:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbynombreTarea/nombreTarea='+_nombreTarea).map((res: Response) => res.json());
    }

    getMis_TareasbydescripcionTarea(_descripcionTarea:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbydescripcionTarea/descripcionTarea='+_descripcionTarea).map((res: Response) => res.json());
    }

    getMis_TareasbyidUsuarioResponsable(_idUsuarioResponsable:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyidUsuarioResponsable/idUsuarioResponsable='+_idUsuarioResponsable).map((res: Response) => res.json());
    }

    getMis_TareasbyfechaInicioProgramado(_fechaInicioProgramado:Date): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyfechaInicioProgramado/fechaInicioProgramado='+_fechaInicioProgramado).map((res: Response) => res.json());
    }

    getMis_TareasbyfechaTerminoProgramado(_fechaTerminoProgramado:Date): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyfechaTerminoProgramado/fechaTerminoProgramado='+_fechaTerminoProgramado).map((res: Response) => res.json());
    }

    getMis_TareasbyfechaInicioReal(_fechaInicioReal:Date): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyfechaInicioReal/fechaInicioReal='+_fechaInicioReal).map((res: Response) => res.json());
    }

    getMis_TareasbyfechaTerminoReal(_fechaTerminoReal:Date): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyfechaTerminoReal/fechaTerminoReal='+_fechaTerminoReal).map((res: Response) => res.json());
    }

    getMis_TareasbyidEstadoTarea(_idEstadoTarea:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyidEstadoTarea/idEstadoTarea='+_idEstadoTarea).map((res: Response) => res.json());
    }

    getMis_TareasbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getMis_Tareasbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_Tareasbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getMis_TareasbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getMis_TareasbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getMis_TareasbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    getMis_Tareasbyprioridad(_prioridad:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_Tareasbyprioridad/prioridad='+_prioridad).map((res: Response) => res.json());
    }

    getMis_Tareasbyarea(_area:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_Tareasbyarea/area='+_area).map((res: Response) => res.json());
    }

    getMis_TareasbyUsuarioResponsable(_UsuarioResponsable:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyUsuarioResponsable/UsuarioResponsable='+_UsuarioResponsable).map((res: Response) => res.json());
    }

    getMis_TareasbyUsuarioCreador(_UsuarioCreador:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyUsuarioCreador/UsuarioCreador='+_UsuarioCreador).map((res: Response) => res.json());
    }

    getMis_TareasbynombreEstadoTarea(_nombreEstadoTarea:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbynombreEstadoTarea/nombreEstadoTarea='+_nombreEstadoTarea).map((res: Response) => res.json());
    }

    getMis_TareasbyidSubProyecto(_idSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyidSubProyecto/idSubProyecto='+_idSubProyecto).map((res: Response) => res.json());
    }

    getMis_TareasbynombreSubProyecto(_nombreSubProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbynombreSubProyecto/nombreSubProyecto='+_nombreSubProyecto).map((res: Response) => res.json());
    }

    getMis_TareasbyHiteraciones(_Hiteraciones:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Tareas/GetMis_TareasbyHiteraciones/Hiteraciones='+_Hiteraciones).map((res: Response) => res.json());
    }
}
