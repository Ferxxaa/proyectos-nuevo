import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { environment } from "../../environments/environment";

import { mArchivoEstandar } from '../models/mArchivoEstandar';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sArchivoEstandar {

    private path: string;

    constructor(
        public _http: Http
    ) {
        this.path = "archivoEstandar"
    }

    AdjuntarArchivo(file, tipo: Number) {
        return new Promise((resolve, reject) => {
            var formData = new FormData();
            var xhr = new XMLHttpRequest();

            formData.append('adjuntar', file, file.name)
            formData.append('tipo',tipo.toString())

            xhr.onreadystatechange = () => {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        resolve(JSON.parse(xhr.response));
                    } else {
                        reject(xhr.response);
                    }
                }
            }

            xhr.open('POST', environment.node + 'adjuntar', true);
            xhr.send(formData);
        });
    }

    getArchivosEstandares(): Observable<mArchivoEstandar[]> {
        return this._http.get(environment.node + this.path).map((res: Response) => res.json());
    }

    getArchivosEstandaresByTipo(tipo: number): Observable<mArchivoEstandar[]> {
        return this._http.get(environment.node + this.path + '/tipo/' + tipo).map((res: Response) => res.json());
    }

    postArchivosEstandares(file, archivoEstandar: mArchivoEstandar): any {
        if (file)
            this.AdjuntarArchivo(file,archivoEstandar.tipo)
        return this._http.post(environment.node + this.path + '/', archivoEstandar).map((res: Response) => res.json());
    }

    putArchivosEstandares(archivoEstandar: mArchivoEstandar): any {
        return this._http.put(environment.node + this.path + '/' + archivoEstandar._id, archivoEstandar).map((res: Response) => res.json());
    }

    deleteArchivosEstandares(archivoEstandar: mArchivoEstandar): any {
        return this._http.delete(environment.node + this.path + '/' + archivoEstandar._id).map((res: Response) => res.json());
    }

}
