import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mVis_DirectorProyectoMatriz } from '../models/mVis_DirectorProyectoMatriz';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sVis_DirectorProyectoMatriz{

    constructor(
        public _http : Http
    ){}

    getVis_DirectorProyectoMatriz(): Observable<any>{
        return this._http.get(configuracion.url+'Vis_DirectorProyectoMatriz').map((res: Response) => res.json());
    }

    getVis_DirectorProyectoMatrizbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_DirectorProyectoMatriz/'+_id).map((res: Response) => res.json());
    }

    getVis_DirectorProyectoMatrizbyidUsuarioDirector(_idUsuarioDirector:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_DirectorProyectoMatriz/GetVis_DirectorProyectoMatrizbyidUsuarioDirector/idUsuarioDirector='+_idUsuarioDirector).map((res: Response) => res.json());
    }

    getVis_DirectorProyectoMatrizbyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_DirectorProyectoMatriz/GetVis_DirectorProyectoMatrizbyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_DirectorProyectoMatrizbynombreProyectoMatriz(_nombreProyectoMatriz:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_DirectorProyectoMatriz/GetVis_DirectorProyectoMatrizbynombreProyectoMatriz/nombreProyectoMatriz='+_nombreProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_DirectorProyectoMatrizbyidDirectorProyectoMatriz(_idDirectorProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_DirectorProyectoMatriz/GetVis_DirectorProyectoMatrizbyidDirectorProyectoMatriz/idDirectorProyectoMatriz='+_idDirectorProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_DirectorProyectoMatrizbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_DirectorProyectoMatriz/GetVis_DirectorProyectoMatrizbyactivo/activo='+_activo).map((res: Response) => res.json());
    }
}
