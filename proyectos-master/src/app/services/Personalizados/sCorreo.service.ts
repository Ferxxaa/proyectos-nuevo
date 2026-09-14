import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';

import { environment } from "../../../environments/environment"
import { mCorreo } from '../../models/mCorreo';
import { Observable } from 'rxjs/Observable';

@Injectable()

export class sCorreo {

    constructor(
        public _http: Http
    ) { }

    postCorreo(Correo: mCorreo): Observable<any> {
        // console.log("Servicio de correo: ", Correo);
        // console.log(environment.node);

        if (Correo.archivo) {
            // console.log("Enviando con adjunto");
            return this._http.post(environment.node + 'correoAttach/', Correo).map((res: Response) => res.json());
        }
        else {
            // console.log("Enviando sin adjunto");
            // console.log(environment.node + 'correo/');
            return this._http.post(environment.node + 'correo/', Correo).map((res: Response) => res.json());
        }
    }

}
