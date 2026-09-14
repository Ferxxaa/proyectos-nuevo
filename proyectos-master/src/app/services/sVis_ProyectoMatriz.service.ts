import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mVis_ProyectoMatriz } from '../models/mVis_ProyectoMatriz';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sVis_ProyectoMatriz{

    constructor(
        public _http : Http
    ){}

    getVis_ProyectoMatriz(): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectoMatriz').map((res: Response) => res.json());
    }

    getVis_ProyectoMatrizbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectoMatriz/'+_id).map((res: Response) => res.json());
    }

    getVis_ProyectoMatrizbyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectoMatriz/GetVis_ProyectoMatrizbyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_ProyectoMatrizbyDirectores(_Directores:String): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectoMatriz/GetVis_ProyectoMatrizbyDirectores/Directores='+_Directores).map((res: Response) => res.json());
    }

    getVis_ProyectoMatrizbynombreProyectoMatriz(_nombreProyectoMatriz:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectoMatriz/GetVis_ProyectoMatrizbynombreProyectoMatriz/nombreProyectoMatriz='+_nombreProyectoMatriz).map((res: Response) => res.json());
    }

    getVis_ProyectoMatrizbynombreSponsor(_nombreSponsor:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectoMatriz/GetVis_ProyectoMatrizbynombreSponsor/nombreSponsor='+_nombreSponsor).map((res: Response) => res.json());
    }

    getVis_ProyectoMatrizbySubGerente(_SubGerente:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectoMatriz/GetVis_ProyectoMatrizbySubGerente/SubGerente='+_SubGerente).map((res: Response) => res.json());
    }

    getVis_ProyectoMatrizbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectoMatriz/GetVis_ProyectoMatrizbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getVis_ProyectoMatrizbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectoMatriz/GetVis_ProyectoMatrizbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getVis_ProyectoMatrizbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectoMatriz/GetVis_ProyectoMatrizbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getVis_ProyectoMatrizbyidUsuarioSubGerente(_idUsuarioSubGerente:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_ProyectoMatriz/GetVis_ProyectoMatrizbyidUsuarioSubGerente/idUsuarioSubGerente='+_idUsuarioSubGerente).map((res: Response) => res.json());
    }
}
