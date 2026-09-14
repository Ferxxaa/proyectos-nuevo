import { Injectable } from '@angular/core';
import { Http, Response, Headers } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mControlAvance } from '../models/mControlAvance';
import { mTabla_ControlAvance } from '../models/mTabla_ControlAvance';

declare var jQuery: any;
declare var $: any;

@Injectable()
export class sControlAvance {

    constructor(
        public _http: Http
    ) { }

    // Obtener todos los controles de avance
    getControlAvance(): Observable<any> {
        let url = configuracion.url + 'ControlAvance/get/ControlAvance';
        return this._http.get(url).map(res => res.json());
    }

    // Obtener control de avance por ID
    getControlAvancebyID(_id: number): Observable<any> {
        let json = JSON.stringify({ idControlAvance: _id });
        let params = 'json=' + json;
        let url = configuracion.url + 'ControlAvance/get/ControlAvancebyID?' + params;

        return this._http.get(url).map(res => res.json());
    }

    // Obtener controles de avance por ID de proyecto
    getControlAvancebyidProyecto(_idProyecto: number): Observable<any> {
        let json = JSON.stringify({ idProyecto: _idProyecto });
        let params = 'json=' + json;
        let url = configuracion.url + 'ControlAvance/get/ControlAvancebyidProyecto?' + params;

        return this._http.get(url).map(res => res.json());
    }

    // Obtener tabla de controles de avance por ID de proyecto
    getTabla_ControlAvancebyidProyecto(_idProyecto: number): Observable<any> {
        let json = JSON.stringify({ idProyecto: _idProyecto });
        let params = 'json=' + json;
        let url = configuracion.url + 'ControlAvance/get/Tabla_ControlAvancebyidProyecto?' + params;

        return this._http.get(url).map(res => res.json());
    }

    // Agregar nuevo control de avance
    postAddControlAvance(_ControlAvance: mControlAvance): any {
        let json = JSON.stringify(_ControlAvance);
        let params = 'json=' + json;
        let url = configuracion.url + 'ControlAvance/post/AddControlAvance';
        let headers = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' });

        return this._http.post(url, params, { headers: headers }).map(res => res.json());
    }

    // Actualizar control de avance
    postUpdDelControlAvance(_ControlAvance: mControlAvance): any {
        let json = JSON.stringify(_ControlAvance);
        let params = 'json=' + json;
        let url = configuracion.url + 'ControlAvance/post/UpdDelControlAvance';
        let headers = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' });

        return this._http.post(url, params, { headers: headers }).map(res => res.json());
    }
}
