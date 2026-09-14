import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mMail } from '../models/mMail';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sMail{

    constructor(
        public _http : Http
    ){}

    getMail(): Observable<any>{
        return this._http.get(configuracion.url+'Mail').map((res: Response) => res.json());
    }

    getMailbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Mail/'+_id).map((res: Response) => res.json());
    }

    getMailbyidMail(_idMail:number): Observable<any>{
        return this._http.get(configuracion.url+'Mail/GetMailbyidMail/idMail='+_idMail).map((res: Response) => res.json());
    }

    getMailbydireccionMail(_direccionMail:string): Observable<any>{
        return this._http.get(configuracion.url+'Mail/GetMailbydireccionMail/direccionMail='+_direccionMail).map((res: Response) => res.json());
    }

    getMailbyidPersona(_idPersona:number): Observable<any>{
        return this._http.get(configuracion.url+'Mail/GetMailbyidPersona/idPersona='+_idPersona).map((res: Response) => res.json());
    }

    getMailbyidTipoMail(_idTipoMail:number): Observable<any>{
        return this._http.get(configuracion.url+'Mail/GetMailbyidTipoMail/idTipoMail='+_idTipoMail).map((res: Response) => res.json());
    }

    getMailbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Mail/GetMailbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getMailbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Mail/GetMailbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getMailbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Mail/GetMailbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getMailbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Mail/GetMailbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getMailbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Mail/GetMailbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddMail(_Mail:mMail):any{
        return $.post( configuracion.url+'Mail', _Mail )
    }

    postUpdDelMail(_Mail:mMail):any{
        return $.post( configuracion.url+'Mail/'+_Mail.idMail, _Mail )
    }
}
