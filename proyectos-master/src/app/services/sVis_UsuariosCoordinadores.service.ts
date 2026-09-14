import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mVis_UsuariosCoordinadores } from '../models/mVis_UsuariosCoordinadores';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sVis_UsuariosCoordinadores{

    constructor(
        public _http : Http
    ){}

    getVis_UsuariosCoordinadores(): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosCoordinadores').map((res: Response) => res.json());
    }

    getVis_UsuariosCoordinadoresbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosCoordinadores/'+_id).map((res: Response) => res.json());
    }

    getVis_UsuariosCoordinadoresbyidUsuario(_idUsuario:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosCoordinadores/GetVis_UsuariosCoordinadoresbyidUsuario/idUsuario='+_idUsuario).map((res: Response) => res.json());
    }

    getVis_UsuariosCoordinadoresbynombre(_nombre:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosCoordinadores/GetVis_UsuariosCoordinadoresbynombre/nombre='+_nombre).map((res: Response) => res.json());
    }

    getVis_UsuariosCoordinadoresbypaterno(_paterno:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosCoordinadores/GetVis_UsuariosCoordinadoresbypaterno/paterno='+_paterno).map((res: Response) => res.json());
    }

    getVis_UsuariosCoordinadoresbymaterno(_materno:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosCoordinadores/GetVis_UsuariosCoordinadoresbymaterno/materno='+_materno).map((res: Response) => res.json());
    }

    getVis_UsuariosCoordinadoresbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosCoordinadores/GetVis_UsuariosCoordinadoresbyactivo/activo='+_activo).map((res: Response) => res.json());
    }
}
