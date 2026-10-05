import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { switchMap } from 'rxjs/operators';

import { mArchivoEstandar } from '../models/mArchivoEstandar';

declare var jQuery: any;
declare var $: any;

// Backend Node (Express). NO usar environment.node/url (IIS :1234).
const NODE_URL = 'http://trazas-nbi.com:3800/api/';

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
            formData.append('tipo', tipo.toString())

            xhr.onreadystatechange = () => {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        try {
                            resolve(JSON.parse(xhr.response));
                        } catch (e) {
                            resolve(xhr.response);
                        }
                    } else {
                        reject(xhr.response || 'Error al subir el archivo (status ' + xhr.status + ')');
                    }
                }
            }

            xhr.onerror = () => reject('Error de red al subir el archivo');

            xhr.open('POST', NODE_URL + 'adjuntar', true);
            xhr.send(formData);
        });
    }

    getArchivosEstandares(): Observable<mArchivoEstandar[]> {
        return this._http.get(NODE_URL + this.path).map((res: Response) => res.json());
    }

    getArchivosEstandaresByTipo(tipo: number): Observable<mArchivoEstandar[]> {
        return this._http.get(NODE_URL + this.path + '/tipo/' + tipo).map((res: Response) => res.json());
    }

    // Primero sube el archivo y solo si sale bien crea el registro,
    // así no quedan registros en Mongo sin archivo físico.
    postArchivosEstandares(file, archivoEstandar: mArchivoEstandar): Observable<any> {
        const crearRegistro = () =>
            this._http.post(NODE_URL + this.path + '/', archivoEstandar).map((res: Response) => res.json());

        if (!file)
            return crearRegistro();

        return fromPromise(this.AdjuntarArchivo(file, archivoEstandar.tipo)).pipe(
            switchMap(() => crearRegistro())
        );
    }

    putArchivosEstandares(archivoEstandar: mArchivoEstandar): any {
        return this._http.put(NODE_URL + this.path + '/' + archivoEstandar._id, archivoEstandar).map((res: Response) => res.json());
    }

    deleteArchivosEstandares(archivoEstandar: mArchivoEstandar): any {
        return this._http.delete(NODE_URL + this.path + '/' + archivoEstandar._id).map((res: Response) => res.json());
    }

}