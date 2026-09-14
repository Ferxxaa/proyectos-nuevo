import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mLogPersona } from '../models/mLogPersona';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sLogPersona{

    constructor(
        public _http : Http
    ){}

    getLogPersona(): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona').map((res: Response) => res.json());
    }

    getLogPersonabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/'+_id).map((res: Response) => res.json());
    }

    getLogPersonabyidLogPersona(_idLogPersona:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabyidLogPersona/idLogPersona='+_idLogPersona).map((res: Response) => res.json());
    }

    getLogPersonabyidPersona(_idPersona:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabyidPersona/idPersona='+_idPersona).map((res: Response) => res.json());
    }

    getLogPersonabyrut(_rut:string): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabyrut/rut='+_rut).map((res: Response) => res.json());
    }

    getLogPersonabynombre(_nombre:string): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabynombre/nombre='+_nombre).map((res: Response) => res.json());
    }

    getLogPersonabypaterno(_paterno:string): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabypaterno/paterno='+_paterno).map((res: Response) => res.json());
    }

    getLogPersonabymaterno(_materno:string): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabymaterno/materno='+_materno).map((res: Response) => res.json());
    }

    getLogPersonabyfechaNacimiento(_fechaNacimiento:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabyfechaNacimiento/fechaNacimiento='+_fechaNacimiento).map((res: Response) => res.json());
    }

    getLogPersonabysexo(_sexo:string): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabysexo/sexo='+_sexo).map((res: Response) => res.json());
    }

    getLogPersonabyidEstadoCivil(_idEstadoCivil:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabyidEstadoCivil/idEstadoCivil='+_idEstadoCivil).map((res: Response) => res.json());
    }

    getLogPersonabypersonaValida(_personaValida:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabypersonaValida/personaValida='+_personaValida).map((res: Response) => res.json());
    }

    getLogPersonabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getLogPersonabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getLogPersonabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getLogPersonabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getLogPersonabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'LogPersona/GetLogPersonabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddLogPersona(_LogPersona:mLogPersona):any{
        return $.post( configuracion.url+'LogPersona', _LogPersona )
    }

    postUpdDelLogPersona(_LogPersona:mLogPersona):any{
        return $.post( configuracion.url+'LogPersona/'+_LogPersona.idLogPersona, _LogPersona )
    }
}
