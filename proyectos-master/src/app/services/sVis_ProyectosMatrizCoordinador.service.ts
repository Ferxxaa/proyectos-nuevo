import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mVis_ProyectosMatrizCoordinador } from '../models/mVis_ProyectosMatrizCoordinador';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sVis_ProyectosMatrizCoordinador{

    constructor(
        public _http : Http
    ){}

    getVis_ProyectosMatrizCoordinador(): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosMatrizCoordinador').map((res: Response) => res.json());
    }

    getVis_ProyectosMatrizCoordinadorbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosMatrizCoordinador/'+_id).map((res: Response) => res.json());
    }

    getVis_ProyectosMatrizCoordinadorbyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosMatrizCoordinador/GetVis_ProyectosMatrizCoordinadorbyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_ProyectosMatrizCoordinadorbynombreProyectoMatriz(_nombreProyectoMatriz:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosMatrizCoordinador/GetVis_ProyectosMatrizCoordinadorbynombreProyectoMatriz/nombreProyectoMatriz='+_nombreProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_ProyectosMatrizCoordinadorbyidUsuarioCoordinador(_idUsuarioCoordinador:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosMatrizCoordinador/GetVis_ProyectosMatrizCoordinadorbyidUsuarioCoordinador/idUsuarioCoordinador='+_idUsuarioCoordinador).map((res: Response) => res.json());
    }

    getVis_ProyectosMatrizCoordinadorbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosMatrizCoordinador/GetVis_ProyectosMatrizCoordinadorbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getVis_ProyectosMatrizCoordinadorbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectosMatrizCoordinador/GetVis_ProyectosMatrizCoordinadorbyactivo/activo='+_activo).map((res: Response) => res.json());
    }
}
