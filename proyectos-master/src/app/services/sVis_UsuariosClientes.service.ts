import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mVis_UsuariosClientes } from '../models/mVis_UsuariosClientes';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sVis_UsuariosClientes{

    constructor(
        public _http : Http
    ){}

    getVis_UsuariosClientes(): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosClientes').map((res: Response) => res.json());
    }

    getVis_UsuariosClientesbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosClientes/'+_id).map((res: Response) => res.json());
    }

    getVis_UsuariosClientesbyidUsuario(_idUsuario:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosClientes/GetVis_UsuariosClientesbyidUsuario/idUsuario='+_idUsuario).map((res: Response) => res.json());
    }

    getVis_UsuariosClientesbynombre(_nombre:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosClientes/GetVis_UsuariosClientesbynombre/nombre='+_nombre).map((res: Response) => res.json());
    }

    getVis_UsuariosClientesbypaterno(_paterno:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosClientes/GetVis_UsuariosClientesbypaterno/paterno='+_paterno).map((res: Response) => res.json());
    }

    getVis_UsuariosClientesbymaterno(_materno:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosClientes/GetVis_UsuariosClientesbymaterno/materno='+_materno).map((res: Response) => res.json());
    }

    getVis_UsuariosClientesbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosClientes/GetVis_UsuariosClientesbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getVis_UsuariosClientesbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosClientes/GetVis_UsuariosClientesbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }
}
