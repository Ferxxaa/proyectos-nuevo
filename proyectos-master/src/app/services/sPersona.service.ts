import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mPersona } from '../models/mPersona';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sPersona{

    constructor(
        public _http : Http
    ){}

    getPersona(): Observable<any>{
        return this._http.get(configuracion.url+'Persona').map((res: Response) => res.json());
    }

    getPersonabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Persona/'+_id).map((res: Response) => res.json());
    }

    getPersonabyidPersona(_idPersona:number): Observable<any>{
        return this._http.get(configuracion.url+'Persona/GetPersonabyidPersona/idPersona='+_idPersona).map((res: Response) => res.json());
    }

    getPersonabyrut(_rut:string): Observable<any>{
        return this._http.get(configuracion.url+'Persona/GetPersonabyrut/rut='+_rut).map((res: Response) => res.json());
    }

    getPersonabynombre(_nombre:string): Observable<any>{
        return this._http.get(configuracion.url+'Persona/GetPersonabynombre/nombre='+_nombre).map((res: Response) => res.json());
    }

    getPersonabypaterno(_paterno:string): Observable<any>{
        return this._http.get(configuracion.url+'Persona/GetPersonabypaterno/paterno='+_paterno).map((res: Response) => res.json());
    }

    getPersonabymaterno(_materno:string): Observable<any>{
        return this._http.get(configuracion.url+'Persona/GetPersonabymaterno/materno='+_materno).map((res: Response) => res.json());
    }

    getPersonabyfechaNacimiento(_fechaNacimiento:Date): Observable<any>{
        return this._http.get(configuracion.url+'Persona/GetPersonabyfechaNacimiento/fechaNacimiento='+_fechaNacimiento).map((res: Response) => res.json());
    }

    getPersonabysexo(_sexo:string): Observable<any>{
        return this._http.get(configuracion.url+'Persona/GetPersonabysexo/sexo='+_sexo).map((res: Response) => res.json());
    }

    getPersonabyidEstadoCivil(_idEstadoCivil:number): Observable<any>{
        return this._http.get(configuracion.url+'Persona/GetPersonabyidEstadoCivil/idEstadoCivil='+_idEstadoCivil).map((res: Response) => res.json());
    }

    getPersonabypersonaValida(_personaValida:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Persona/GetPersonabypersonaValida/personaValida='+_personaValida).map((res: Response) => res.json());
    }

    getPersonabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Persona/GetPersonabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getPersonabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Persona/GetPersonabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getPersonabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Persona/GetPersonabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getPersonabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Persona/GetPersonabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getPersonabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Persona/GetPersonabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddPersona(_Persona:mPersona):any{
        return $.post( configuracion.url+'Persona', _Persona )
    }

    postUpdDelPersona(_Persona:mPersona):any{
        return $.post( configuracion.url+'Persona/'+_Persona.idPersona, _Persona )
    }
}
