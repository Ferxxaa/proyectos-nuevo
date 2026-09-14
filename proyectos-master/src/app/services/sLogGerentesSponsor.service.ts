import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogGerentesSponsor } from '../models/mLogGerentesSponsor';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogGerentesSponsor{

    constructor(
        public _http : Http
    ){}

    getLogGerentesSponsor(): Observable<any>{
        return this._http.get(configuracion.url+'LogGerentesSponsor').map((res: Response) => res.json());
    }

    getLogGerentesSponsorbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogGerentesSponsor/'+_id).map((res: Response) => res.json());
    }

    getLogGerentesSponsorbyidLogGerentesSponsor(_idLogGerentesSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogGerentesSponsor/GetLogGerentesSponsorbyidLogGerentesSponsor/idLogGerentesSponsor='+_idLogGerentesSponsor).map((res: Response) => res.json());
    }

    getLogGerentesSponsorbyidGerentesSponsor(_idGerentesSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogGerentesSponsor/GetLogGerentesSponsorbyidGerentesSponsor/idGerentesSponsor='+_idGerentesSponsor).map((res: Response) => res.json());
    }

    getLogGerentesSponsorbyidUsuarioGerente(_idUsuarioGerente:number): Observable<any>{
        return this._http.get(configuracion.url+'LogGerentesSponsor/GetLogGerentesSponsorbyidUsuarioGerente/idUsuarioGerente='+_idUsuarioGerente).map((res: Response) => res.json());
    }

    getLogGerentesSponsorbyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogGerentesSponsor/GetLogGerentesSponsorbyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogGerentesSponsorbyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogGerentesSponsor/GetLogGerentesSponsorbyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogGerentesSponsorbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogGerentesSponsor/GetLogGerentesSponsorbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogGerentesSponsorbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogGerentesSponsor/GetLogGerentesSponsorbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogGerentesSponsorbyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogGerentesSponsor/GetLogGerentesSponsorbyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogGerentesSponsorbyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogGerentesSponsor/GetLogGerentesSponsorbyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogGerentesSponsor(_LogGerentesSponsor:mLogGerentesSponsor):any{
        return $.post( configuracion.url+'LogGerentesSponsor', _LogGerentesSponsor )
    }

    postUpdDelLogGerentesSponsor(_LogGerentesSponsor:mLogGerentesSponsor):any{
        return $.post( configuracion.url+'LogGerentesSponsor/'+_LogGerentesSponsor.idLogGerentesSponsor, _LogGerentesSponsor )
    }
}
