import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mVis_UsuariosDirectores } from '../models/mVis_UsuariosDirectores';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sVis_UsuariosDirectores{

    constructor(
        public _http : Http
    ){}

    getVis_UsuariosDirectores(): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosDirectores').map((res: Response) => res.json());
    }

    getVis_UsuariosDirectoresbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosDirectores/'+_id).map((res: Response) => res.json());
    }

    getVis_UsuariosDirectoresbyidDirectoresSponsor(_idDirectoresSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosDirectores/GetVis_UsuariosDirectoresbyidDirectoresSponsor/idDirectoresSponsor='+_idDirectoresSponsor).map((res: Response) => res.json());
    }

    getVis_UsuariosDirectoresbyidUsuario(_idUsuario:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosDirectores/GetVis_UsuariosDirectoresbyidUsuario/idUsuario='+_idUsuario).map((res: Response) => res.json());
    }

    getVis_UsuariosDirectoresbynombre(_nombre:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosDirectores/GetVis_UsuariosDirectoresbynombre/nombre='+_nombre).map((res: Response) => res.json());
    }

    getVis_UsuariosDirectoresbypaterno(_paterno:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosDirectores/GetVis_UsuariosDirectoresbypaterno/paterno='+_paterno).map((res: Response) => res.json());
    }

    getVis_UsuariosDirectoresbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosDirectores/GetVis_UsuariosDirectoresbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getVis_UsuariosDirectoresbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosDirectores/GetVis_UsuariosDirectoresbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }
}
