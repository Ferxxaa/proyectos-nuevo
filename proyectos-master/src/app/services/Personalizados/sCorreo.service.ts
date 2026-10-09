import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';

import { environment } from "../../../environments/environment"
import { mCorreo } from '../../models/mCorreo';
import { Observable } from 'rxjs/Observable';

// El envío de correos vive en el backend Node (puerto 3800), no en el ASP.NET (1234).
// environment.node quedó apuntando a :1234 y el ASP.NET no responde el preflight OPTIONS → error CORS.
// Se fija la URL aquí (igual que se hizo con AdjuntarArchivo de la Bitácora) para no tocar
// environment.node de forma global y no romper otros servicios que lo usan.
const URL_NODE_CORREO = 'http://trazas-nbi.com:3800/api/';

@Injectable()

export class sCorreo {

    constructor(
        public _http: Http
    ) { }

    postCorreo(Correo: mCorreo): Observable<any> {
        if (Correo.archivo) {
            return this._http.post(URL_NODE_CORREO + 'correoAttach/', Correo).map((res: Response) => res.json());
        }
        else {
            return this._http.post(URL_NODE_CORREO + 'correo/', Correo).map((res: Response) => res.json());
        }
    }

}