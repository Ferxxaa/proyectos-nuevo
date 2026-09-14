import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mVis_ProyectosCoordinador } from '../models/mVis_ProyectosCoordinador';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sVis_ProyectosCoordinador{

    constructor(
        public _http : Http
    ){}

    getVis_ProyectosCoordinador(): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosCoordinador').map((res: Response) => res.json());
    }

    getVis_ProyectosCoordinadorbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosCoordinador/'+_id).map((res: Response) => res.json());
    }

    getVis_ProyectosCoordinadorbyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosCoordinador/GetVis_ProyectosCoordinadorbyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getVis_ProyectosCoordinadorbynombreProyecto(_nombreProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosCoordinador/GetVis_ProyectosCoordinadorbynombreProyecto/nombreProyecto='+_nombreProyecto).map((res: Response) => res.json());
    }

    getVis_ProyectosCoordinadorbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosCoordinador/GetVis_ProyectosCoordinadorbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getVis_ProyectosCoordinadorbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosCoordinador/GetVis_ProyectosCoordinadorbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getVis_ProyectosCoordinadorbyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosCoordinador/GetVis_ProyectosCoordinadorbyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_ProyectosCoordinadorbyidUsuarioCoordinador(_idUsuarioCoordinador:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosCoordinador/GetVis_ProyectosCoordinadorbyidUsuarioCoordinador/idUsuarioCoordinador='+_idUsuarioCoordinador).map((res: Response) => res.json());
    }
}
