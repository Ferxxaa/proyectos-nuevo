import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mArchivoAdjunto } from '../models/mArchivoAdjunto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sArchivoAdjunto{

    constructor(
        public _http : Http
    ){}

    getArchivoAdjunto(): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto').map((res: Response) => res.json());
    }

    getArchivoAdjuntobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/'+_id).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyidArchivoAdjunto(_idArchivoAdjunto:number): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyidArchivoAdjunto/idArchivoAdjunto='+_idArchivoAdjunto).map((res: Response) => res.json());
    }

    getArchivoAdjuntobynombreArchivo(_nombreArchivo:string): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobynombreArchivo/nombreArchivo='+_nombreArchivo).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyruta(_ruta:string): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyruta/ruta='+_ruta).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyidTipoArchivoAdjunto(_idTipoArchivoAdjunto:number): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyidTipoArchivoAdjunto/idTipoArchivoAdjunto='+_idTipoArchivoAdjunto).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyidSponsorCliente(_idSponsorCliente:number): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyidSponsorCliente/idSponsorCliente='+_idSponsorCliente).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyidProyectoMatriz(_idProyectoMatriz:number): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyidProyectoMatriz/idProyectoMatriz='+_idProyectoMatriz).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyidProyecto(_idProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyidProyecto/idProyecto='+_idProyecto).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyidSubProyecto(_idSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyidSubProyecto/idSubProyecto='+_idSubProyecto).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyidEtapa(_idEtapa:number): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyidEtapa/idEtapa='+_idEtapa).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyidDetalleSubProyecto(_idDetalleSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyidDetalleSubProyecto/idDetalleSubProyecto='+_idDetalleSubProyecto).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getArchivoAdjuntobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'ArchivoAdjunto/GetArchivoAdjuntobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddArchivoAdjunto(_ArchivoAdjunto:mArchivoAdjunto):any{
        return $.post( configuracion.url+'ArchivoAdjunto', _ArchivoAdjunto )
    }

    postUpdDelArchivoAdjunto(_ArchivoAdjunto:mArchivoAdjunto):any{
        return $.post( configuracion.url+'ArchivoAdjunto/'+_ArchivoAdjunto.idArchivoAdjunto, _ArchivoAdjunto )
    }
}
