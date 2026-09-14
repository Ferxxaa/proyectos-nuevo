import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mVis_UsuarioPersona } from '../models/mVis_UsuarioPersona';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sVis_UsuarioPersona{

    constructor(
        public _http : Http
    ){}

    getVis_UsuarioPersona(): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuarioPersona').map((res: Response) => res.json());
    }

    getVis_UsuarioPersonabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuarioPersona/'+_id).map((res: Response) => res.json());
    }

    getVis_UsuarioPersonabyidUsuario(_idUsuario:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuarioPersona/GetVis_UsuarioPersonabyidUsuario/idUsuario='+_idUsuario).map((res: Response) => res.json());
    }

    getVis_UsuarioPersonabynombre(_nombre:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuarioPersona/GetVis_UsuarioPersonabynombre/nombre='+_nombre).map((res: Response) => res.json());
    }

    getVis_UsuarioPersonabypaterno(_paterno:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuarioPersona/GetVis_UsuarioPersonabypaterno/paterno='+_paterno).map((res: Response) => res.json());
    }

    getVis_UsuarioPersonabymaterno(_materno:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuarioPersona/GetVis_UsuarioPersonabymaterno/materno='+_materno).map((res: Response) => res.json());
    }

    getVis_UsuarioPersonabysexo(_sexo:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuarioPersona/GetVis_UsuarioPersonabysexo/sexo='+_sexo).map((res: Response) => res.json());
    }

    getVis_UsuarioPersonabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuarioPersona/GetVis_UsuarioPersonabyactivo/activo='+_activo).map((res: Response) => res.json());
    }
}
