import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mSubProyecto } from '../models/mSubProyecto';
import { mCorreo } from '../models/mCorreo';
import { sCorreo } from './Personalizados/sCorreo.service';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sSubProyecto {

    private readonly validacionSubProyectoUrl = 'http://proyectos.trazas-nbi.com/Proyectos-ValidarSubProyectos';

    constructor(
        public _http: Http,
        private _sCorreo:sCorreo
    ) { }

    getSubProyecto(): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto').map((res: Response) => res.json());
    }

    getSubProyectobyID(_id: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/' + _id).map((res: Response) => res.json());
    }

    getSubProyectobyidSubProyecto(_idSubProyecto: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyidSubProyecto/idSubProyecto=' + _idSubProyecto).map((res: Response) => res.json());
    }

    getSubProyectobyidProyecto(_idProyecto: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyidProyecto/idProyecto=' + _idProyecto).map((res: Response) => res.json());
    }

    getSubProyectobyidEstadoProyecto(_idEstadoProyecto: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyidEstadoProyecto/idEstadoProyecto=' + _idEstadoProyecto).map((res: Response) => res.json());
    }

    getSubProyectobynombreSubProyecto(_nombreSubProyecto: string): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobynombreSubProyecto/nombreSubProyecto=' + _nombreSubProyecto).map((res: Response) => res.json());
    }

    getSubProyectobyidDireccion(_idDireccion: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyidDireccion/idDireccion=' + _idDireccion).map((res: Response) => res.json());
    }

    getSubProyectobyidUsuarioCoordinador(_idUsuarioCoordinador: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyidUsuarioCoordinador/idUsuarioCoordinador=' + _idUsuarioCoordinador).map((res: Response) => res.json());
    }

    getSubProyectobyidZona(_idZona: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyidZona/idZona=' + _idZona).map((res: Response) => res.json());
    }

    getSubProyectobyfechaInicio(_fechaInicio: Date): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyfechaInicio/fechaInicio=' + _fechaInicio).map((res: Response) => res.json());
    }

    getSubProyectobyfechaValidacion(_fechaValidacion: Date): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyfechaValidacion/fechaValidacion=' + _fechaValidacion).map((res: Response) => res.json());
    }

    getSubProyectobyidUsuarioAbortador(_idUsuarioAbortador: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyidUsuarioAbortador/idUsuarioAbortador=' + _idUsuarioAbortador).map((res: Response) => res.json());
    }

    getSubProyectobyfechaAborto(_fechaAborto: Date): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyfechaAborto/fechaAborto=' + _fechaAborto).map((res: Response) => res.json());
    }

    getSubProyectobysuperficie(_superficie: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobysuperficie/superficie=' + _superficie).map((res: Response) => res.json());
    }

    getSubProyectobyfechaTermino(_fechaTermino: Date): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyfechaTermino/fechaTermino=' + _fechaTermino).map((res: Response) => res.json());
    }

    getSubProyectobyidUsuarioValidador(_idUsuarioValidador: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyidUsuarioValidador/idUsuarioValidador=' + _idUsuarioValidador).map((res: Response) => res.json());
    }

    getSubProyectobyvalidado(_validado: boolean): Observable<mSubProyecto[]> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyvalidado/validado=' + _validado).map((res: Response) => res.json());
    }

    getSubProyectobyritmoValidado(_ritmoValidado: boolean): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyritmoValidado/ritmoValidado=' + _ritmoValidado).map((res: Response) => res.json());
    }

    getSubProyectobyfechaRitmoValidado(_fechaRitmoValidado: Date): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyfechaRitmoValidado/fechaRitmoValidado=' + _fechaRitmoValidado).map((res: Response) => res.json());
    }

    getSubProyectobyidUsuarioRitmoValidado(_idUsuarioRitmoValidado: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyidUsuarioRitmoValidado/idUsuarioRitmoValidado=' + _idUsuarioRitmoValidado).map((res: Response) => res.json());
    }

    getSubProyectobyponderadoValidado(_ponderadoValidado: boolean): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyponderadoValidado/ponderadoValidado=' + _ponderadoValidado).map((res: Response) => res.json());
    }

    getSubProyectobyfechaPonderadoValidado(_fechaPonderadoValidado: Date): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyfechaPonderadoValidado/fechaPonderadoValidado=' + _fechaPonderadoValidado).map((res: Response) => res.json());
    }

    getSubProyectobyidUsuarioPonderadoValidado(_idUsuarioPonderadoValidado: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyidUsuarioPonderadoValidado/idUsuarioPonderadoValidado=' + _idUsuarioPonderadoValidado).map((res: Response) => res.json());
    }

    getSubProyectobypresupuestoValidado(_presupuestoValidado: boolean): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobypresupuestoValidado/presupuestoValidado=' + _presupuestoValidado).map((res: Response) => res.json());
    }

    getSubProyectobyfechaPresupuestoValidado(_fechaPresupuestoValidado: Date): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyfechaPresupuestoValidado/fechaPresupuestoValidado=' + _fechaPresupuestoValidado).map((res: Response) => res.json());
    }

    getSubProyectobyidUsuarioPresupuestoValidado(_idUsuarioPresupuestoValidado: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyidUsuarioPresupuestoValidado/idUsuarioPresupuestoValidado=' + _idUsuarioPresupuestoValidado).map((res: Response) => res.json());
    }

    getSubProyectobyorder(_order: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyorder/order=' + _order).map((res: Response) => res.json());
    }

    getSubProyectobyidTipoIntervencion(_idTipoIntervencion: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyidTipoIntervencion/idTipoIntervencion=' + _idTipoIntervencion).map((res: Response) => res.json());
    }

    getSubProyectobycentroCosto(_centroCosto: string): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobycentroCosto/centroCosto=' + _centroCosto).map((res: Response) => res.json());
    }

    getSubProyectobycostoEstimado(_costoEstimado: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobycostoEstimado/costoEstimado=' + _costoEstimado).map((res: Response) => res.json());
    }

    getSubProyectobyactivo(_activo: boolean): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyactivo/activo=' + _activo).map((res: Response) => res.json());
    }

    getSubProyectobyfechaCreacion(_fechaCreacion: Date): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyfechaCreacion/fechaCreacion=' + _fechaCreacion).map((res: Response) => res.json());
    }

    getSubProyectobyfechaRemocion(_fechaRemocion: Date): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyfechaRemocion/fechaRemocion=' + _fechaRemocion).map((res: Response) => res.json());
    }

    getSubProyectobyidUsuarioCreador(_idUsuarioCreador: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyidUsuarioCreador/idUsuarioCreador=' + _idUsuarioCreador).map((res: Response) => res.json());
    }

    getSubProyectobyidUsuarioRemovedor(_idUsuarioRemovedor: number): Observable<any> {
        return this._http.get(configuracion.url + 'SubProyecto/GetSubProyectobyidUsuarioRemovedor/idUsuarioRemovedor=' + _idUsuarioRemovedor).map((res: Response) => res.json());
    }

    postAddSubProyecto(_SubProyecto: mSubProyecto): any {
        const request = $.post(configuracion.url + 'SubProyecto', _SubProyecto);

        request.done((result) => {
            const subProyectoCreado = Object.assign({}, _SubProyecto, result);
            this.sendMailSp(subProyectoCreado);
        });

        return request;
    }

    postUpdDelSubProyecto(_SubProyecto: mSubProyecto): any {
        return $.post(configuracion.url + 'SubProyecto/' + _SubProyecto.idSubProyecto, _SubProyecto)
    }

    private sendMailSp(subProy: mSubProyecto) {
        const linkValidacion = `${this.validacionSubProyectoUrl}?subproyecto=${subProy.idSubProyecto}&autoselect=true`;
        let mensaje = `Estimado, <br>
          <br>
              Informamos que se ha creado el sub proyecto <b>${subProy.nombreSubProyecto}</b><br>
                            el cual se encuentra pendiente de su validacion<br>
                            Puede revisarlo directamente en el siguiente enlace:<br>
                            <a href="${linkValidacion}" target="_blank">Ir a validacion del sub proyecto</a><br>
          `;
        let correoEnviar: mCorreo = new mCorreo("jolivares@trazas.cl", 'Sub proyecto pendiente de validación', mensaje)

        this._sCorreo.postCorreo(correoEnviar).subscribe(res => {
            // console.log(res);
        });
    }
}
