import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mMis_Proyectos } from '../models/mMis_Proyectos';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sMis_Proyectos{

    constructor(
        public _http : Http
    ){}

    getMis_Proyectos(): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos').map((res: Response) => res.json());
    }

    getMis_ProyectosbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/'+_id).map((res: Response) => res.json());
    }

    getMis_ProyectosbyDuracionTotal(_DuracionTotal:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbyDuracionTotal/DuracionTotal='+_DuracionTotal).map((res: Response) => res.json());
    }

    getMis_ProyectosbyFechaTermino(_FechaTermino:Date): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbyFechaTermino/FechaTermino='+_FechaTermino).map((res: Response) => res.json());
    }

    getMis_ProyectosbyAvanceReal(_AvanceReal:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbyAvanceReal/AvanceReal='+_AvanceReal).map((res: Response) => res.json());
    }

    getMis_ProyectosbyEtapaActual(_EtapaActual:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbyEtapaActual/EtapaActual='+_EtapaActual).map((res: Response) => res.json());
    }

    getMis_ProyectosbyAvanceRealEtapa(_AvanceRealEtapa:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbyAvanceRealEtapa/AvanceRealEtapa='+_AvanceRealEtapa).map((res: Response) => res.json());
    }

    getMis_ProyectosbyidUsuarioCoordinador(_idUsuarioCoordinador:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbyidUsuarioCoordinador/idUsuarioCoordinador='+_idUsuarioCoordinador).map((res: Response) => res.json());
    }

    getMis_ProyectosbyidSubProyecto(_idSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbyidSubProyecto/idSubProyecto='+_idSubProyecto).map((res: Response) => res.json());
    }

    getMis_ProyectosbynombreProyectoMatriz(_nombreProyectoMatriz:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbynombreProyectoMatriz/nombreProyectoMatriz='+_nombreProyectoMatriz).map((res: Response) => res.json());
    }

    getMis_ProyectosbynombreProyecto(_nombreProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbynombreProyecto/nombreProyecto='+_nombreProyecto).map((res: Response) => res.json());
    }

    getMis_ProyectosbynombreSubProyecto(_nombreSubProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbynombreSubProyecto/nombreSubProyecto='+_nombreSubProyecto).map((res: Response) => res.json());
    }

    getMis_ProyectosbynombreEstadoProyecto(_nombreEstadoProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbynombreEstadoProyecto/nombreEstadoProyecto='+_nombreEstadoProyecto).map((res: Response) => res.json());
    }

    getMis_ProyectosbynombreTipoIntervencion(_nombreTipoIntervencion:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbynombreTipoIntervencion/nombreTipoIntervencion='+_nombreTipoIntervencion).map((res: Response) => res.json());
    }

    getMis_Proyectosbysuperficie(_superficie:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_Proyectosbysuperficie/superficie='+_superficie).map((res: Response) => res.json());
    }

    getMis_ProyectosbyfechaInicio(_fechaInicio:Date): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbyfechaInicio/fechaInicio='+_fechaInicio).map((res: Response) => res.json());
    }

    getMis_ProyectosbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getMis_Proyectosbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_Proyectosbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getMis_ProyectosbyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getMis_ProyectosbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getMis_Proyectosbynombre(_nombre:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_Proyectosbynombre/nombre='+_nombre).map((res: Response) => res.json());
    }

    getMis_ProyectosbyidEstadoProyecto(_idEstadoProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbyidEstadoProyecto/idEstadoProyecto='+_idEstadoProyecto).map((res: Response) => res.json());
    }

    getMis_ProyectosbyResponsable(_Responsable:string): Observable<any>{
        return this._http.get(configuracion.url+'Mis_Proyectos/GetMis_ProyectosbyResponsable/Responsable='+_Responsable).map((res: Response) => res.json());
    }
}
