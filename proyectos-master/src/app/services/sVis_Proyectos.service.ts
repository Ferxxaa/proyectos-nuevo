import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mVis_Proyectos } from '../models/mVis_Proyectos';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sVis_Proyectos{

    constructor(
        public _http : Http
    ){}

    getVis_Proyectos(): Observable<any>{
        return this._http.get(configuracion.url+'Vis_Proyectos').map((res: Response) => res.json());
    }

    getVis_ProyectosbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_Proyectos/'+_id).map((res: Response) => res.json());
    }

    getVis_ProyectosbyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_Proyectos/GetVis_ProyectosbyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_ProyectosbyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_Proyectos/GetVis_ProyectosbyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getVis_ProyectosbynombreProyectoMatriz(_nombreProyectoMatriz:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_Proyectos/GetVis_ProyectosbynombreProyectoMatriz/nombreProyectoMatriz='+_nombreProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_ProyectosbynombreProyecto(_nombreProyecto:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_Proyectos/GetVis_ProyectosbynombreProyecto/nombreProyecto='+_nombreProyecto).map((res: Response) => res.json());
    }

    getVis_ProyectosbyDirector(_Director:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_Proyectos/GetVis_ProyectosbyDirector/Director='+_Director).map((res: Response) => res.json());
    }

    getVis_ProyectosbycostoEstimado(_costoEstimado:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_Proyectos/GetVis_ProyectosbycostoEstimado/costoEstimado='+_costoEstimado).map((res: Response) => res.json());
    }

    getVis_ProyectosbyClientes(_Clientes:String): Observable<any>{
        return this._http.get(configuracion.url+'Vis_Proyectos/GetVis_ProyectosbyClientes/Clientes='+_Clientes).map((res: Response) => res.json());
    }

    getVis_ProyectosbyCoordinadores(_Coordinadores:String): Observable<any>{
        return this._http.get(configuracion.url+'Vis_Proyectos/GetVis_ProyectosbyCoordinadores/Coordinadores='+_Coordinadores).map((res: Response) => res.json());
    }

    getVis_ProyectosbyfechaInicio(_fechaInicio:Date): Observable<any>{
        return this._http.get(configuracion.url+'Vis_Proyectos/GetVis_ProyectosbyfechaInicio/fechaInicio='+_fechaInicio).map((res: Response) => res.json());
    }

    getVis_ProyectosbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Vis_Proyectos/GetVis_ProyectosbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getVis_Proyectosbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_Proyectos/GetVis_Proyectosbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getVis_Proyectosbyvalidado(_validado:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_Proyectos/GetVis_Proyectosbyvalidado/validado='+_validado).map((res: Response) => res.json());
    }
}
