import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mDetalleSubProyecto } from '../models/mDetalleSubProyecto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sDetalleSubProyecto{

    constructor(
        public _http : Http
    ){}

    getDetalleSubProyecto(): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto').map((res: Response) => res.json());
    }

    getDetalleSubProyectobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/'+_id).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyidDetalleSubProyecto(_idDetalleSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyidDetalleSubProyecto/idDetalleSubProyecto='+_idDetalleSubProyecto).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyidSubProyecto(_idSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyidSubProyecto/idSubProyecto='+_idSubProyecto).map((res: Response) => res.json());
    }

    asyncDetalleSubProyectobyidSubProyecto(_idSubProyecto:number){
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyidSubProyecto/idSubProyecto='+_idSubProyecto).map((res: Response) => res.json()).toPromise();
    }

    getDetalleSubProyectobyidEtapa(_idEtapa:number): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyidEtapa/idEtapa='+_idEtapa).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyduracion(_duracion:number): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyduracion/duracion='+_duracion).map((res: Response) => res.json());
    }

    getDetalleSubProyectobypresupuesto(_presupuesto:number): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobypresupuesto/presupuesto='+_presupuesto).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyponderado(_ponderado:number): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyponderado/ponderado='+_ponderado).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyvigente(_vigente:boolean): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyvigente/vigente='+_vigente).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyfechaInicioReal(_fechaInicioReal:Date): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyfechaInicioReal/fechaInicioReal='+_fechaInicioReal).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyfechaTerminoReal(_fechaTerminoReal:Date): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyfechaTerminoReal/fechaTerminoReal='+_fechaTerminoReal).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyavanceReal(_avanceReal:number): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyavanceReal/avanceReal='+_avanceReal).map((res: Response) => res.json());
    }

    getDetalleSubProyectobysuperficie(_superficie:number): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobysuperficie/superficie='+_superficie).map((res: Response) => res.json());
    }

    getDetalleSubProyectobycostoReal(_costoReal:number): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobycostoReal/costoReal='+_costoReal).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyvistoBuenoEtapa(_vistoBuenoEtapa:boolean): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyvistoBuenoEtapa/vistoBuenoEtapa='+_vistoBuenoEtapa).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyvistoBuenoRitmo(_vistoBuenoRitmo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyvistoBuenoRitmo/vistoBuenoRitmo='+_vistoBuenoRitmo).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getDetalleSubProyectobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'DetalleSubProyecto/GetDetalleSubProyectobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddDetalleSubProyecto(_DetalleSubProyecto:mDetalleSubProyecto):any{
        return $.post( configuracion.url+'DetalleSubProyecto', _DetalleSubProyecto )
    }

    postUpdDelDetalleSubProyecto(_DetalleSubProyecto:mDetalleSubProyecto):any{
        return $.post( configuracion.url+'DetalleSubProyecto/'+_DetalleSubProyecto.idDetalleSubProyecto, _DetalleSubProyecto )
    }
}
