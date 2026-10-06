import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { map as rxMap } from 'rxjs/operators';

import { firestoreDB, storageRef } from '../firebase-init';
import { mArchivoEstandar } from '../models/mArchivoEstandar';

declare var jQuery: any;
declare var $: any;

// Backend Node (Express). NO usar environment.node/url (IIS :1234).
const NODE_URL = 'http://trazas-nbi.com:3800/api/';

// Respaldo en Firebase
const COLECCION_FS = 'archivosEstandar';
const CARPETA_STORAGE = 'archivosEstandar';

@Injectable()

export class sArchivoEstandar {

    private path: string;

    // Solo letras sin tilde, números, espacio, guion, guion bajo, punto y paréntesis
    private readonly CARACTER_PERMITIDO = /[A-Za-z0-9 _\-.()]/;

    constructor(
        public _http: Http
    ) {
        this.path = "archivoEstandar"
    }

    //*************************************************** Validación ***************************************************

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

    //*************************************************** Helpers ***************************************************

    private claveFirestore(tipo: any, nombreArchivo: string): string {
        return 'tipo' + tipo + '__' + nombreArchivo;
    }

    private httpPromise(obs: Observable<any>): Promise<any> {
        return new Promise((resolve, reject) => obs.subscribe(resolve, reject));
    }

    //*************************************************** Node :3800 ***************************************************

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

    //*************************************************** Firebase ***************************************************

    private SubirFirebase(file: File, tipo: any): Promise<{ url: string, ruta: string }> {
        var ruta = CARPETA_STORAGE + '/tipo-' + tipo + '/' + file.name;

        var contentType = file.type || 'application/octet-stream';
        var verEnNavegador = contentType === 'application/pdf' || contentType.indexOf('image/') === 0;
        var metadata = {
            contentType: contentType,
            contentDisposition: (verEnNavegador ? 'inline' : 'attachment') + '; filename="' + file.name + '"'
        };

        return new Promise((resolve, reject) => {
            try {
                var ref: any = (storageRef as any).ref(ruta);
                ref.put(file, metadata)
                    .then(() => ref.getDownloadURL())
                    .then(url => resolve({ url: url, ruta: ruta }))
                    .catch(e => reject(e));
            } catch (e) {
                reject(e);
            }
        });
    }

    private getMapaFirebase(tipo: number): Promise<any> {
        return new Promise(resolve => {
            try {
                (firestoreDB as any).collection(COLECCION_FS)
                    .where('tipo', '==', Number(tipo))
                    .get()
                    .then(snap => {
                        var mapa = {};
                        snap.forEach(doc => {
                            var d = doc.data();
                            if (d && d.nombreArchivo) {
                                mapa[d.nombreArchivo] = d;
                            }
                        });
                        resolve(mapa);
                    })
                    .catch(e => {
                        console.warn('No se pudo leer el respaldo de Firebase', e);
                        resolve({});
                    });
            } catch (e) {
                resolve({});
            }
        });
    }

    private borrarFirebase(archivo: mArchivoEstandar): Promise<any> {
        return new Promise(resolve => {
            try {
                var docRef: any = (firestoreDB as any).collection(COLECCION_FS)
                    .doc(this.claveFirestore(archivo.tipo, archivo.nombreArchivo));

                docRef.get()
                    .then(doc => {
                        if (!doc.exists) {
                            return null;
                        }
                        var ruta = doc.data().ruta;
                        var borrarStorage = ruta
                            ? (storageRef as any).ref(ruta).delete().catch(e => console.warn('No se pudo borrar de Storage', e))
                            : Promise.resolve();
                        return borrarStorage.then(() => docRef.delete());
                    })
                    .then(() => resolve(true))
                    .catch(e => {
                        console.warn('No se pudo limpiar Firebase', e);
                        resolve(false);
                    });
            } catch (e) {
                resolve(false);
            }
        });
    }

    //*************************************************** Consultas ***************************************************

    getArchivosEstandares(): Observable<mArchivoEstandar[]> {
        return this._http.get(NODE_URL + this.path).map((res: Response) => res.json());
    }

    // Lista de Mongo + URL de Firebase cuando existe respaldo
    getArchivosEstandaresByTipo(tipo: number): Observable<mArchivoEstandar[]> {
        var mongo$ = this._http.get(NODE_URL + this.path + '/tipo/' + tipo).map((res: Response) => res.json());
        var firebase$ = fromPromise(this.getMapaFirebase(tipo));

        return forkJoin(mongo$, firebase$).pipe(
            rxMap((resultado: any[]) => {
                var lista: mArchivoEstandar[] = resultado[0] || [];
                var mapa = resultado[1] || {};
                return lista.map(a => {
                    var fb = mapa[a.nombreArchivo];
                    if (fb) {
                        a.urlFirebase = fb.url;
                        a.rutaFirebase = fb.ruta;
                    }
                    return a;
                });
            })
        );
    }

    //*************************************************** Escritura ***************************************************

    // Sube al Node (obligatorio) y a Firebase (respaldo), luego crea el registro.
    // Emite { registro, firebaseOk }.
    postArchivosEstandares(file, archivoEstandar: mArchivoEstandar): Observable<any> {
        var crearRegistro = () =>
            this.httpPromise(this._http.post(NODE_URL + this.path + '/', archivoEstandar).map((res: Response) => res.json()));

        var proceso = new Promise((resolve, reject) => {

            if (!file) {
                crearRegistro()
                    .then(registro => resolve({ registro: registro, firebaseOk: false }))
                    .catch(reject);
                return;
            }

            var error = this.validarNombreArchivo(file.name);
            if (error) {
                reject({ nombreInvalido: true, mensaje: error });
                return;
            }

            archivoEstandar.nombreArchivo = file.name;
            var tipo = archivoEstandar.tipo;
            var firebaseOk = false;

            this.AdjuntarArchivo(file, tipo)
                .then(() =>
                    this.SubirFirebase(file, tipo)
                        .then(fb => { firebaseOk = true; return fb; })
                        .catch(e => { console.error('No se pudo subir a Firebase', e); return null; })
                )
                .then((fb: any) =>
                    crearRegistro().then(registro => {
                        if (!fb) {
                            return registro;
                        }
                        var idMongo = registro && (registro._id || (registro.archivoEstandar && registro.archivoEstandar._id)) || null;
                        return (firestoreDB as any).collection(COLECCION_FS)
                            .doc(this.claveFirestore(tipo, file.name))
                            .set({
                                nombreArchivo: file.name,
                                tipo: Number(tipo),
                                url: fb.url,
                                ruta: fb.ruta,
                                idMongo: idMongo,
                                fecha: new Date()
                            })
                            .then(() => registro)
                            .catch(e => {
                                console.error('No se pudo guardar el respaldo en Firestore', e);
                                firebaseOk = false;
                                return registro;
                            });
                    })
                )
                .then(registro => resolve({ registro: registro, firebaseOk: firebaseOk }))
                .catch(reject);
        });

        return fromPromise(proceso);
    }

    putArchivosEstandares(archivoEstandar: mArchivoEstandar): any {
        return this._http.put(NODE_URL + this.path + '/' + archivoEstandar._id, archivoEstandar).map((res: Response) => res.json());
    }

    // Borra el registro de Mongo y limpia el respaldo de Firebase si existe
    deleteArchivosEstandares(archivoEstandar: mArchivoEstandar): Observable<any> {
        var proceso = this.httpPromise(
            this._http.delete(NODE_URL + this.path + '/' + archivoEstandar._id).map((res: Response) => res.json())
        ).then(resultado => this.borrarFirebase(archivoEstandar).then(() => resultado));

        return fromPromise(proceso);
    }

}