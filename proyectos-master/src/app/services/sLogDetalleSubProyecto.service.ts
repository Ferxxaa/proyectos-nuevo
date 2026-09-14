import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogDetalleSubProyecto } from '../models/mLogDetalleSubProyecto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogDetalleSubProyecto{

    constructor(
        public _http : Http
    ){}

    getLogDetalleSubProyecto(): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto').map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/'+_id).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyidLogDetellaSubProyecto(_idLogDetellaSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyidLogDetellaSubProyecto/idLogDetellaSubProyecto='+_idLogDetellaSubProyecto).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyidDetalleSubProyecto(_idDetalleSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyidDetalleSubProyecto/idDetalleSubProyecto='+_idDetalleSubProyecto).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyidSubProyecto(_idSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyidSubProyecto/idSubProyecto='+_idSubProyecto).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyidEtapa(_idEtapa:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyidEtapa/idEtapa='+_idEtapa).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyduracion(_duracion:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyduracion/duracion='+_duracion).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobypresupuesto(_presupuesto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobypresupuesto/presupuesto='+_presupuesto).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyponderado(_ponderado:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyponderado/ponderado='+_ponderado).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyvigente(_vigente:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyvigente/vigente='+_vigente).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyfechaInicioReal(_fechaInicioReal:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyfechaInicioReal/fechaInicioReal='+_fechaInicioReal).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyfechaTerminoReal(_fechaTerminoReal:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyfechaTerminoReal/fechaTerminoReal='+_fechaTerminoReal).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyavanceReal(_avanceReal:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyavanceReal/avanceReal='+_avanceReal).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobysuperficie(_superficie:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobysuperficie/superficie='+_superficie).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobycostoReal(_costoReal:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobycostoReal/costoReal='+_costoReal).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyvistoBuenoEtapa(_vistoBuenoEtapa:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyvistoBuenoEtapa/vistoBuenoEtapa='+_vistoBuenoEtapa).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyvistoBuenoRitmo(_vistoBuenoRitmo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyvistoBuenoRitmo/vistoBuenoRitmo='+_vistoBuenoRitmo).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogDetalleSubProyectobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogDetalleSubProyecto/GetLogDetalleSubProyectobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogDetalleSubProyecto(_LogDetalleSubProyecto:mLogDetalleSubProyecto):any{
        return $.post( configuracion.url+'LogDetalleSubProyecto', _LogDetalleSubProyecto )
    }

    postUpdDelLogDetalleSubProyecto(_LogDetalleSubProyecto:mLogDetalleSubProyecto):any{
        return $.post( configuracion.url+'LogDetalleSubProyecto/'+_LogDetalleSubProyecto.idLogDetellaSubProyecto, _LogDetalleSubProyecto )
    }
}
