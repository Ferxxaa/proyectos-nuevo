import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mVis_VerBitacora } from '../models/mVis_VerBitacora';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sVis_VerBitacora{

    constructor(
        public _http : Http
    ){}

    getVis_VerBitacora(): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora').map((res: Response) => res.json());
    }

    getVis_VerBitacorabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/'+_id).map((res: Response) => res.json());
    }

    getVis_VerBitacorabyidBitacora(_idBitacora:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabyidBitacora/idBitacora='+_idBitacora).map((res: Response) => res.json());
    }

    getVis_VerBitacorabydescripcion(_descripcion:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabydescripcion/descripcion='+_descripcion).map((res: Response) => res.json());
    }

    getVis_VerBitacorabynombrePrioridad(_nombrePrioridad:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabynombrePrioridad/nombrePrioridad='+_nombrePrioridad).map((res: Response) => res.json());
    }

    getVis_VerBitacorabynombre(_nombre:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabynombre/nombre='+_nombre).map((res: Response) => res.json());
    }

    getVis_VerBitacorabypaterno(_paterno:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabypaterno/paterno='+_paterno).map((res: Response) => res.json());
    }

    getVis_VerBitacorabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getVis_VerBitacorabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getVis_VerBitacorabyidArchivoAdjunto(_idArchivoAdjunto:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabyidArchivoAdjunto/idArchivoAdjunto='+_idArchivoAdjunto).map((res: Response) => res.json());
    }

    getVis_VerBitacorabynombreArchivo(_nombreArchivo:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabynombreArchivo/nombreArchivo='+_nombreArchivo).map((res: Response) => res.json());
    }

    getVis_VerBitacorabyruta(_ruta:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabyruta/ruta='+_ruta).map((res: Response) => res.json());
    }

    getVis_VerBitacorabyArchivoActivo(_ArchivoActivo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabyArchivoActivo/ArchivoActivo='+_ArchivoActivo).map((res: Response) => res.json());
    }

    getVis_VerBitacorabyAdjunto(_Adjunto:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabyAdjunto/Adjunto='+_Adjunto).map((res: Response) => res.json());
    }

    getVis_VerBitacorabyNombreAdjunto(_NombreAdjunto:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabyNombreAdjunto/NombreAdjunto='+_NombreAdjunto).map((res: Response) => res.json());
    }

    getVis_VerBitacorabyidDetalleSubProyecto(_idDetalleSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabyidDetalleSubProyecto/idDetalleSubProyecto='+_idDetalleSubProyecto).map((res: Response) => res.json());
    }

    getVis_VerBitacorabyidSubProyecto(_idSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabyidSubProyecto/idSubProyecto='+_idSubProyecto).map((res: Response) => res.json());
    }

    getVis_VerBitacorabyTipoBitacora(_TipoBitacora:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_VerBitacora/GetVis_VerBitacorabyTipoBitacora/TipoBitacora='+_TipoBitacora).map((res: Response) => res.json());
    }
}
