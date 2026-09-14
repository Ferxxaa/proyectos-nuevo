import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogZona } from '../models/mLogZona';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogZona{

    constructor(
        public _http : Http
    ){}

    getLogZona(): Observable<any>{
        return this._http.get(configuracion.url+'LogZona').map((res: Response) => res.json());
    }

    getLogZonabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogZona/'+_id).map((res: Response) => res.json());
    }

    getLogZonabyidLogZona(_idLogZona:number): Observable<any>{
        return this._http.get(configuracion.url+'LogZona/GetLogZonabyidLogZona/idLogZona='+_idLogZona).map((res: Response) => res.json());
    }

    getLogZonabyidZona(_idZona:number): Observable<any>{
        return this._http.get(configuracion.url+'LogZona/GetLogZonabyidZona/idZona='+_idZona).map((res: Response) => res.json());
    }

    getLogZonabynombreZona(_nombreZona:string): Observable<any>{
        return this._http.get(configuracion.url+'LogZona/GetLogZonabynombreZona/nombreZona='+_nombreZona).map((res: Response) => res.json());
    }

    getLogZonabyidSponsor(_idSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogZona/GetLogZonabyidSponsor/idSponsor='+_idSponsor).map((res: Response) => res.json());
    }

    getLogZonabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogZona/GetLogZonabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogZonabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogZona/GetLogZonabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogZonabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogZona/GetLogZonabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogZonabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogZona/GetLogZonabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogZonabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogZona/GetLogZonabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogZona(_LogZona:mLogZona):any{
        return $.post( configuracion.url+'LogZona', _LogZona )
    }

    postUpdDelLogZona(_LogZona:mLogZona):any{
        return $.post( configuracion.url+'LogZona/'+_LogZona.idLogZona, _LogZona )
    }
}
