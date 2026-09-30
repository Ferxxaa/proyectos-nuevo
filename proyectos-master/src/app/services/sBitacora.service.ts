import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestMethod, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { configuracion } from '../config';
import { mBitacora } from '../models/mBitacora';
import { environment } from '../../environments/environment';

import * as firebase from 'firebase/app';
import 'firebase/storage';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class sBitacora{

    // Solo letras sin tilde, números, espacio, guion, guion bajo, punto y paréntesis
    private readonly CARACTER_PERMITIDO = /[A-Za-z0-9 _\-.()]/;

    constructor(
        public _http : Http
    ){}

    //*************************************************** Validación ***************************************************

    /**
     * Valida el nombre de un archivo a adjuntar.
     * Devuelve null si es válido, o un mensaje (HTML) con el problema si no lo es.
     */
    validarNombreArchivo(nombreOriginal: string): string {
        if (!nombreOriginal) {
            return 'El archivo no tiene nombre.';
        }

        var nombre: any = nombreOriginal;
        if (nombre.normalize) {
            nombre = nombre.normalize('NFC');
        }

        var invalidos = nombre.split('').filter(c => !this.CARACTER_PERMITIDO.test(c));
        var unicos = invalidos.filter((c, i) => invalidos.indexOf(c) === i);

        if (unicos.length > 0) {
            return 'El nombre <b>' + this.escapar(nombre) + '</b> tiene caracteres no permitidos: <b>'
                + unicos.map(c => '"' + this.escapar(c) + '"').join(' ') + '</b>';
        }

        var puntoExt = nombre.lastIndexOf('.');
        if (puntoExt <= 0 || puntoExt === nombre.length - 1) {
            return 'El archivo <b>' + this.escapar(nombre) + '</b> no tiene una extensión válida.';
        }

        return null;
    }

    private escapar(texto: string): string {
        return texto
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    //*************************************************** Firebase Storage ***************************************************

    private getStorage(): any {
        var app = firebase.apps.length ? firebase.app() : firebase.initializeApp((environment as any).firebase);
        return (app as any).storage();
    }

    /**
     * Sube el archivo a Firebase Storage y devuelve la URL de descarga.
     */
    SubirArchivo(file: File, idSubProyecto: number, tipo: any): Promise<{ nombre: string, url: string, ruta: string }> {

        var error = this.validarNombreArchivo(file ? file.name : null);
        if (error) {
            return Promise.reject({ nombreInvalido: true, mensaje: error });
        }

        var carpetas = { '1': 'Proyectos', '2': 'SSOMA', '3': 'Calidad' };
        var carpeta = carpetas[String(tipo)] || 'Otros';
        var ruta = 'bitacora/' + carpeta + '/' + idSubProyecto + '/' + Date.now() + '_' + file.name;

        var contentType = file.type || 'application/octet-stream';
        var verEnNavegador = contentType === 'application/pdf' || contentType.indexOf('image/') === 0;
        var metadata = {
            contentType: contentType,
            contentDisposition: (verEnNavegador ? 'inline' : 'attachment') + '; filename="' + file.name + '"'
        };

        return new Promise((resolve, reject) => {
            try {
                var ref = this.getStorage().ref(ruta);
                ref.put(file, metadata)
                    .then(() => ref.getDownloadURL())
                    .then(url => resolve({ nombre: file.name, url: url, ruta: ruta }))
                    .catch(e => reject(e));
            } catch (e) {
                reject(e);
            }
        });
    }

    //*************************************************** Consultas ***************************************************

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

    //*************************************************** Legacy (Node :3800) ***************************************************
    // Ya no se usa desde la bitácora; se deja por si otro componente lo llama.

    AdjuntarArchivo(file, subProyecto: string, tipo) {
        return new Promise((resolve, reject) => {

            var error = this.validarNombreArchivo(file ? file.name : null);
            if (error) {
                reject({ nombreInvalido: true, mensaje: error });
                return;
            }

            var formData = new FormData();
            var xhr = new XMLHttpRequest();

            formData.append('subProy', subProyecto);
            formData.append('Tipo', tipo);
            formData.append('adjuntar', file, file.name);

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

    //*************************************************** Escritura ***************************************************

    postAddBitacora(_Bitacora:mBitacora):any{
        return $.post( configuracion.url+'Bitacora', _Bitacora )
    }

    postUpdDelBitacora(_Bitacora:mBitacora):any{
        return $.post( configuracion.url+'Bitacora/'+_Bitacora.idBitacora, _Bitacora )
    }
}