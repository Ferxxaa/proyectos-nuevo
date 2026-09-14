import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mBitacora } from '../models/mBitacora';
import { environment } from '../../environments/environment';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sBitacora{

    constructor(
        public _http : Http
    ){}

    getBitacora(): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora').map((res: Response) => res.json());
    }

    getBitacorabyID(_id:number): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora/'+_id).map((res: Response) => res.json());
    }

    getBitacorabyidBitacora(_idBitacora:number): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora/GetBitacorabyidBitacora/idBitacora='+_idBitacora).map((res: Response) => res.json());
    }

    getBitacorabydescripcion(_descripcion:string): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora/GetBitacorabydescripcion/descripcion='+_descripcion).map((res: Response) => res.json());
    }

    getBitacorabyidPrioridad(_idPrioridad:number): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora/GetBitacorabyidPrioridad/idPrioridad='+_idPrioridad).map((res: Response) => res.json());
    }

    getBitacorabyidArchivoAdjunto(_idArchivoAdjunto:number): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora/GetBitacorabyidArchivoAdjunto/idArchivoAdjunto='+_idArchivoAdjunto).map((res: Response) => res.json());
    }

    getBitacorabyidDetalleSubProyecto(_idDetalleSubProyecto:number): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora/GetBitacorabyidDetalleSubProyecto/idDetalleSubProyecto='+_idDetalleSubProyecto).map((res: Response) => res.json());
    }

    getBitacorabyfechaCreacion(_fechaCreacion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora/GetBitacorabyfechaCreacion/fechaCreacion='+_fechaCreacion).map((res: Response) => res.json());
    }

    getBitacorabyactivo(_activo:boolean): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora/GetBitacorabyactivo/activo='+_activo).map((res: Response) => res.json());
    }

    getBitacorabyfechaRemocion(_fechaRemocion:Date): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora/GetBitacorabyfechaRemocion/fechaRemocion='+_fechaRemocion).map((res: Response) => res.json());
    }

    getBitacorabyidUsuarioCreador(_idUsuarioCreador:number): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora/GetBitacorabyidUsuarioCreador/idUsuarioCreador='+_idUsuarioCreador).map((res: Response) => res.json());
    }

    getBitacorabyidUsuarioRemovedor(_idUsuarioRemovedor:number): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora/GetBitacorabyidUsuarioRemovedor/idUsuarioRemovedor='+_idUsuarioRemovedor).map((res: Response) => res.json());
    }

    getBitacorabyAdjunto(_Adjunto:string): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora/GetBitacorabyAdjunto/Adjunto='+_Adjunto).map((res: Response) => res.json());
    }

    getBitacorabyNombreAdjunto(_NombreAdjunto:string): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora/GetBitacorabyNombreAdjunto/NombreAdjunto='+_NombreAdjunto).map((res: Response) => res.json());
    }

    getBitacorabyTipoBitacora(_TipoBitacora:number): Observable<any>{
        return this._http.get(configuracion.url+'Bitacora/GetBitacorabyTipoBitacora/TipoBitacora='+_TipoBitacora).map((res: Response) => res.json());
    }

    AdjuntarArchivo(file, subProyecto: string, tipo) {
        return new Promise((resolve, reject) => {
            var formData = new FormData();
            var xhr = new XMLHttpRequest();

            formData.append('adjuntar', file, file.name);
            formData.append('subProy', subProyecto);
            formData.append('Tipo', tipo);

            xhr.onreadystatechange = () => {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        resolve(JSON.parse(xhr.response));
                    } else {
                        reject(xhr.response);
                    }
                }
            }

            xhr.open('POST', 'http://trazas-nbi.com:3800/api/' + 'adjuntarBitacora', true);
            xhr.send(formData);
        });
    }

    postAddBitacora(_Bitacora:mBitacora):any{
        return $.post( configuracion.url+'Bitacora', _Bitacora )
    }

    postUpdDelBitacora(_Bitacora:mBitacora):any{
        return $.post( configuracion.url+'Bitacora/'+_Bitacora.idBitacora, _Bitacora )
    }
}