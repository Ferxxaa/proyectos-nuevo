import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogSubProyecto } from '../models/mLogSubProyecto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogSubProyecto{

    constructor(
        public _http : Http
    ){}

    getLogSubProyecto(): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto').map((res: Response) => res.json());
    }

    getLogSubProyectobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/'+_id).map((res: Response) => res.json());
    }

    getLogSubProyectobyidLogSubProyecto(_idLogSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidLogSubProyecto/idLogSubProyecto='+_idLogSubProyecto).map((res: Response) => res.json());
    }

    getLogSubProyectobyidSubProyecto(_idSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidSubProyecto/idSubProyecto='+_idSubProyecto).map((res: Response) => res.json());
    }

    getLogSubProyectobyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getLogSubProyectobyidEstadoProyecto(_idEstadoProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidEstadoProyecto/idEstadoProyecto='+_idEstadoProyecto).map((res: Response) => res.json());
    }

    getLogSubProyectobynombreSubProyecto(_nombreSubProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobynombreSubProyecto/nombreSubProyecto='+_nombreSubProyecto).map((res: Response) => res.json());
    }

    getLogSubProyectobyidDireccion(_idDireccion:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidDireccion/idDireccion='+_idDireccion).map((res: Response) => res.json());
    }

    getLogSubProyectobyidUsuarioCoordinador(_idUsuarioCoordinador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidUsuarioCoordinador/idUsuarioCoordinador='+_idUsuarioCoordinador).map((res: Response) => res.json());
    }

    getLogSubProyectobyidZona(_idZona:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidZona/idZona='+_idZona).map((res: Response) => res.json());
    }

    getLogSubProyectobyfechaInicio(_fechaInicio:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyfechaInicio/fechaInicio='+_fechaInicio).map((res: Response) => res.json());
    }

    getLogSubProyectobyidUsuarioAbortador(_idUsuarioAbortador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidUsuarioAbortador/idUsuarioAbortador='+_idUsuarioAbortador).map((res: Response) => res.json());
    }

    getLogSubProyectobyfechaAborto(_fechaAborto:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyfechaAborto/fechaAborto='+_fechaAborto).map((res: Response) => res.json());
    }

    getLogSubProyectobyfechaValidacion(_fechaValidacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyfechaValidacion/fechaValidacion='+_fechaValidacion).map((res: Response) => res.json());
    }

    getLogSubProyectobysuperficie(_superficie:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobysuperficie/superficie='+_superficie).map((res: Response) => res.json());
    }

    getLogSubProyectobyidUsuarioValidador(_idUsuarioValidador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidUsuarioValidador/idUsuarioValidador='+_idUsuarioValidador).map((res: Response) => res.json());
    }

    getLogSubProyectobyfechaTermino(_fechaTermino:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyfechaTermino/fechaTermino='+_fechaTermino).map((res: Response) => res.json());
    }

    getLogSubProyectobyvalidado(_validado:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyvalidado/validado='+_validado).map((res: Response) => res.json());
    }

    getLogSubProyectobyritmoValidado(_ritmoValidado:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyritmoValidado/ritmoValidado='+_ritmoValidado).map((res: Response) => res.json());
    }

    getLogSubProyectobyfechaRitmoValidado(_fechaRitmoValidado:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyfechaRitmoValidado/fechaRitmoValidado='+_fechaRitmoValidado).map((res: Response) => res.json());
    }

    getLogSubProyectobyidUsuarioRitmoValidado(_idUsuarioRitmoValidado:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidUsuarioRitmoValidado/idUsuarioRitmoValidado='+_idUsuarioRitmoValidado).map((res: Response) => res.json());
    }

    getLogSubProyectobyponderadoValidado(_ponderadoValidado:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyponderadoValidado/ponderadoValidado='+_ponderadoValidado).map((res: Response) => res.json());
    }

    getLogSubProyectobyfechaPonderadoValidado(_fechaPonderadoValidado:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyfechaPonderadoValidado/fechaPonderadoValidado='+_fechaPonderadoValidado).map((res: Response) => res.json());
    }

    getLogSubProyectobyidUsuarioPonderadoValidado(_idUsuarioPonderadoValidado:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidUsuarioPonderadoValidado/idUsuarioPonderadoValidado='+_idUsuarioPonderadoValidado).map((res: Response) => res.json());
    }

    getLogSubProyectobypresupuestoValidado(_presupuestoValidado:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobypresupuestoValidado/presupuestoValidado='+_presupuestoValidado).map((res: Response) => res.json());
    }

    getLogSubProyectobyfechaPresupuestoValidado(_fechaPresupuestoValidado:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyfechaPresupuestoValidado/fechaPresupuestoValidado='+_fechaPresupuestoValidado).map((res: Response) => res.json());
    }

    getLogSubProyectobyidUsuarioPresupuestoValidado(_idUsuarioPresupuestoValidado:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidUsuarioPresupuestoValidado/idUsuarioPresupuestoValidado='+_idUsuarioPresupuestoValidado).map((res: Response) => res.json());
    }

    getLogSubProyectobyorder(_order:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyorder/order='+_order).map((res: Response) => res.json());
    }

    getLogSubProyectobyidTipoIntervencion(_idTipoIntervencion:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidTipoIntervencion/idTipoIntervencion='+_idTipoIntervencion).map((res: Response) => res.json());
    }

    getLogSubProyectobycentroCosto(_centroCosto:string): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobycentroCosto/centroCosto='+_centroCosto).map((res: Response) => res.json());
    }

    getLogSubProyectobycostoEstimado(_costoEstimado:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobycostoEstimado/costoEstimado='+_costoEstimado).map((res: Response) => res.json());
    }

    getLogSubProyectobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogSubProyectobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogSubProyectobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogSubProyectobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogSubProyectobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogSubProyecto/GetLogSubProyectobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogSubProyecto(_LogSubProyecto:mLogSubProyecto):any{
        return $.post( configuracion.url+'LogSubProyecto', _LogSubProyecto )
    }

    postUpdDelLogSubProyecto(_LogSubProyecto:mLogSubProyecto):any{
        return $.post( configuracion.url+'LogSubProyecto/'+_LogSubProyecto.idLogSubProyecto, _LogSubProyecto )
    }
}
