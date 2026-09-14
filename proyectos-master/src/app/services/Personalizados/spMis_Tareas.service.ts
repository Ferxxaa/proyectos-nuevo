import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../../config';
import { mMis_Tareas } from '../../models/mMis_Tareas';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class spMis_Tareas{

    constructor(
        public _http : Http
    ){}

    getMis_TareasbyIdUsuario(_idUsuario:number): Observable<any>{
        return this._http.get(configuracion.url+'pMis_Tareas/GetMis_TareasByIdUsuario/IdUsuario='+_idUsuario).map((res: Response) => res.json());
    }

}
