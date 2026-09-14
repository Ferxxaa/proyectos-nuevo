import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogBitacora } from '../models/mLogBitacora';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogBitacora{

    constructor(
        public _http : Http
    ){}

    getLogBitacora(): Observable<any>{
        return this._http.get(configuracion.url+'LogBitacora').map((res: Response) => res.json());
    }

    getLogBitacorabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogBitacora/'+_id).map((res: Response) => res.json());
    }

    getLogBitacorabyidLogBitacora(_idLogBitacora:number): Observable<any>{
        return this._http.get(configuracion.url+'LogBitacora/GetLogBitacorabyidLogBitacora/idLogBitacora='+_idLogBitacora).map((res: Response) => res.json());
    }

    getLogBitacorabyidBitacora(_idBitacora:number): Observable<any>{
        return this._http.get(configuracion.url+'LogBitacora/GetLogBitacorabyidBitacora/idBitacora='+_idBitacora).map((res: Response) => res.json());
    }

    getLogBitacorabydescripcion(_descripcion:string): Observable<any>{
        return this._http.get(configuracion.url+'LogBitacora/GetLogBitacorabydescripcion/descripcion='+_descripcion).map((res: Response) => res.json());
    }

    getLogBitacorabyidPrioridad(_idPrioridad:number): Observable<any>{
        return this._http.get(configuracion.url+'LogBitacora/GetLogBitacorabyidPrioridad/idPrioridad='+_idPrioridad).map((res: Response) => res.json());
    }

    getLogBitacorabyidArchivoAdjunto(_idArchivoAdjunto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogBitacora/GetLogBitacorabyidArchivoAdjunto/idArchivoAdjunto='+_idArchivoAdjunto).map((res: Response) => res.json());
    }

    getLogBitacorabyidDetalleSubProyecto(_idDetalleSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogBitacora/GetLogBitacorabyidDetalleSubProyecto/idDetalleSubProyecto='+_idDetalleSubProyecto).map((res: Response) => res.json());
    }

    getLogBitacorabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogBitacora/GetLogBitacorabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogBitacorabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogBitacora/GetLogBitacorabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogBitacorabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogBitacora/GetLogBitacorabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogBitacorabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogBitacora/GetLogBitacorabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogBitacorabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogBitacora/GetLogBitacorabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogBitacora(_LogBitacora:mLogBitacora):any{
        return $.post( configuracion.url+'LogBitacora', _LogBitacora )
    }

    postUpdDelLogBitacora(_LogBitacora:mLogBitacora):any{
        return $.post( configuracion.url+'LogBitacora/'+_LogBitacora.idLogBitacora, _LogBitacora )
    }
}
