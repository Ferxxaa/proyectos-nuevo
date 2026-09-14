import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mVis_UsuariosGerentes } from '../models/mVis_UsuariosGerentes';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sVis_UsuariosGerentes{

    constructor(
        public _http : Http
    ){}

    getVis_UsuariosGerentes(): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosGerentes').map((res: Response) => res.json());
    }

    getVis_UsuariosGerentesbyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosGerentes/'+_id).map((res: Response) => res.json());
    }

    getVis_UsuariosGerentesbyidGerentesSponsor(_idGerentesSponsor:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosGerentes/GetVis_UsuariosGerentesbyidGerentesSponsor/idGerentesSponsor='+_idGerentesSponsor).map((res: Response) => res.json());
    }

    getVis_UsuariosGerentesbyidUsuario(_idUsuario:number): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosGerentes/GetVis_UsuariosGerentesbyidUsuario/idUsuario='+_idUsuario).map((res: Response) => res.json());
    }

    getVis_UsuariosGerentesbynombre(_nombre:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosGerentes/GetVis_UsuariosGerentesbynombre/nombre='+_nombre).map((res: Response) => res.json());
    }

    getVis_UsuariosGerentesbypaterno(_paterno:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosGerentes/GetVis_UsuariosGerentesbypaterno/paterno='+_paterno).map((res: Response) => res.json());
    }

    getVis_UsuariosGerentesbymaterno(_materno:string): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosGerentes/GetVis_UsuariosGerentesbymaterno/materno='+_materno).map((res: Response) => res.json());
    }

    getVis_UsuariosGerentesbyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosGerentes/GetVis_UsuariosGerentesbyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getVis_UsuariosGerentesbyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Vis_UsuariosGerentes/GetVis_UsuariosGerentesbyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }
}
