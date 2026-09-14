import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogArchivoAdjunto } from '../models/mLogArchivoAdjunto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogArchivoAdjunto{

    constructor(
        public _http : Http
    ){}

    getLogArchivoAdjunto(): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto').map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/'+_id).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyidLogArchivoAdjunto(_idLogArchivoAdjunto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyidLogArchivoAdjunto/idLogArchivoAdjunto='+_idLogArchivoAdjunto).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyidArchivoAdjunto(_idArchivoAdjunto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyidArchivoAdjunto/idArchivoAdjunto='+_idArchivoAdjunto).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobynombreArchivo(_nombreArchivo:string): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobynombreArchivo/nombreArchivo='+_nombreArchivo).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyruta(_ruta:string): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyruta/ruta='+_ruta).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyidTipoArchivoAdjunto(_idTipoArchivoAdjunto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyidTipoArchivoAdjunto/idTipoArchivoAdjunto='+_idTipoArchivoAdjunto).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyidSponsorCliente(_idSponsorCliente:number): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyidSponsorCliente/idSponsorCliente='+_idSponsorCliente).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyidSubProyecto(_idSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyidSubProyecto/idSubProyecto='+_idSubProyecto).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyidEtapa(_idEtapa:number): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyidEtapa/idEtapa='+_idEtapa).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyidDetalleSubProyecto(_idDetalleSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyidDetalleSubProyecto/idDetalleSubProyecto='+_idDetalleSubProyecto).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogArchivoAdjuntobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogArchivoAdjunto/GetLogArchivoAdjuntobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogArchivoAdjunto(_LogArchivoAdjunto:mLogArchivoAdjunto):any{
        return $.post( configuracion.url+'LogArchivoAdjunto', _LogArchivoAdjunto )
    }

    postUpdDelLogArchivoAdjunto(_LogArchivoAdjunto:mLogArchivoAdjunto):any{
        return $.post( configuracion.url+'LogArchivoAdjunto/'+_LogArchivoAdjunto.idLogArchivoAdjunto, _LogArchivoAdjunto )
    }
}
