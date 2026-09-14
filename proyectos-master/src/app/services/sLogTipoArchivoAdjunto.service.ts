import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogTipoArchivoAdjunto } from '../models/mLogTipoArchivoAdjunto';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogTipoArchivoAdjunto{

    constructor(
        public _http : Http
    ){}

    getLogTipoArchivoAdjunto(): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoArchivoAdjunto').map((res: Response) => res.json());
    }

    getLogTipoArchivoAdjuntobyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoArchivoAdjunto/'+_id).map((res: Response) => res.json());
    }

    getLogTipoArchivoAdjuntobyidLogTipoArchivoAdjunto(_idLogTipoArchivoAdjunto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoArchivoAdjunto/GetLogTipoArchivoAdjuntobyidLogTipoArchivoAdjunto/idLogTipoArchivoAdjunto='+_idLogTipoArchivoAdjunto).map((res: Response) => res.json());
    }

    getLogTipoArchivoAdjuntobyidTipoArchivoAdjunto(_idTipoArchivoAdjunto:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoArchivoAdjunto/GetLogTipoArchivoAdjuntobyidTipoArchivoAdjunto/idTipoArchivoAdjunto='+_idTipoArchivoAdjunto).map((res: Response) => res.json());
    }

    getLogTipoArchivoAdjuntobynombreTipoArchivoAdjunto(_nombreTipoArchivoAdjunto:string): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoArchivoAdjunto/GetLogTipoArchivoAdjuntobynombreTipoArchivoAdjunto/nombreTipoArchivoAdjunto='+_nombreTipoArchivoAdjunto).map((res: Response) => res.json());
    }

    getLogTipoArchivoAdjuntobyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoArchivoAdjunto/GetLogTipoArchivoAdjuntobyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogTipoArchivoAdjuntobyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoArchivoAdjunto/GetLogTipoArchivoAdjuntobyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogTipoArchivoAdjuntobyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoArchivoAdjunto/GetLogTipoArchivoAdjuntobyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogTipoArchivoAdjuntobyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoArchivoAdjunto/GetLogTipoArchivoAdjuntobyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogTipoArchivoAdjuntobyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoArchivoAdjunto/GetLogTipoArchivoAdjuntobyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogTipoArchivoAdjuntobyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoArchivoAdjunto/GetLogTipoArchivoAdjuntobyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogTipoArchivoAdjunto(_LogTipoArchivoAdjunto:mLogTipoArchivoAdjunto):any{
        return $.post( configuracion.url+'LogTipoArchivoAdjunto', _LogTipoArchivoAdjunto )
    }

    postUpdDelLogTipoArchivoAdjunto(_LogTipoArchivoAdjunto:mLogTipoArchivoAdjunto):any{
        return $.post( configuracion.url+'LogTipoArchivoAdjunto/'+_LogTipoArchivoAdjunto.idLogTipoArchivoAdjunto, _LogTipoArchivoAdjunto )
    }
}
