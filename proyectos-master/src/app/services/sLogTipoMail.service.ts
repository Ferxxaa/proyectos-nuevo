import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogTipoMail } from '../models/mLogTipoMail';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogTipoMail{

    constructor(
        public _http : Http
    ){}

    getLogTipoMail(): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoMail').map((res: Response) => res.json());
    }

    getLogTipoMailbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoMail/'+_id).map((res: Response) => res.json());
    }

    getLogTipoMailbyidLogTipoMail(_idLogTipoMail:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoMail/GetLogTipoMailbyidLogTipoMail/idLogTipoMail='+_idLogTipoMail).map((res: Response) => res.json());
    }

    getLogTipoMailbyidTipoMail(_idTipoMail:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoMail/GetLogTipoMailbyidTipoMail/idTipoMail='+_idTipoMail).map((res: Response) => res.json());
    }

    getLogTipoMailbynombreTipoMail(_nombreTipoMail:string): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoMail/GetLogTipoMailbynombreTipoMail/nombreTipoMail='+_nombreTipoMail).map((res: Response) => res.json());
    }

    getLogTipoMailbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoMail/GetLogTipoMailbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogTipoMailbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoMail/GetLogTipoMailbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogTipoMailbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoMail/GetLogTipoMailbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogTipoMailbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoMail/GetLogTipoMailbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogTipoMailbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoMail/GetLogTipoMailbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogTipoMailbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogTipoMail/GetLogTipoMailbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogTipoMail(_LogTipoMail:mLogTipoMail):any{
        return $.post( configuracion.url+'LogTipoMail', _LogTipoMail )
    }

    postUpdDelLogTipoMail(_LogTipoMail:mLogTipoMail):any{
        return $.post( configuracion.url+'LogTipoMail/'+_LogTipoMail.idLogTipoMail, _LogTipoMail )
    }
}
