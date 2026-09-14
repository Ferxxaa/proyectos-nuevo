import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../../config';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class spAvanceProgramado{

    constructor(
        public _http : Http
    ){}

    getMis_TareasbyIdUsuario(_IdSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'pAvanceProgramado/GetAvanceProgramado/IdSubProyecto='+_IdSubProyecto).map((res: Response) => res.json());
    }

}
