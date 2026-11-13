import { Injectable } from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/firestore';

/** Módulos que alimentan la Biblioteca de certificados */
export const ORIGENES_CERTIFICADO: string[] = [
  'Hallazgos',
  'Control de Avance',
  'Programa SSO',
  'Programa MA',
  'Incidentes',
  'Certificados MA',
  'Archivos Estándar'
];

/** Colección Firestore → módulo de origen. Se leen directo los adjuntos que ya existen. */
const FUENTES: { coleccion: string; origen: string }[] = [
  { coleccion: 'hallazgos', origen: 'Hallazgos' },
  { coleccion: 'controlAvance', origen: 'Control de Avance' },
  { coleccion: 'programaSSO', origen: 'Programa SSO' },
  { coleccion: 'programaMA', origen: 'Programa MA' },
  { coleccion: 'accidentesSSO', origen: 'Incidentes' },
  { coleccion: 'certificadosMA', origen: 'Certificados MA' },
  { coleccion: 'archivosEstandar', origen: 'Archivos Estándar' }
];

export interface mCertificado {
  id?: string;
  /** null = oficina / sin sub-proyecto */
  idSubProyecto: number;
  nombreSubProyecto?: string;
  idProyecto?: number;
  origen: string;
  referencia?: string;
  nombreArchivo: string;
  url: string;
  rutaStorage?: string;
  fecha: Date;
  anio?: number;
  usuario?: string;
}

interface Contexto {
  idSubProyecto: number;
  nombreSubProyecto: string;
  idProyecto: number;
  fecha: Date;
  anio: number;
  referencia: string;
  usuario: string;
}

@Injectable()
export class sBibliotecaCertificados {

  private readonly coleccion = 'bibliotecaCertificados';

  private get db() {
    return firebase.firestore();
  }

  /** Lee los adjuntos de todos los módulos + el índice propio, sin duplicados (por URL). */
  listar(): Promise<mCertificado[]> {
    const lecturas = FUENTES.map(f => this.leerFuente(f.coleccion, f.origen));
    lecturas.push(this.leerIndice());

    return Promise.all(lecturas).then(listas => {
      const porUrl: { [url: string]: mCertificado } = {};
      // el índice va al final: si un archivo está en los dos, gana el del índice (trae más datos)
      listas.forEach(lista => lista.forEach(c => { porUrl[c.url] = c; }));
      return Object.keys(porUrl).map(k => porUrl[k]);
    });
  }

  // ---------------------------------------------------------------- fuentes

  private leerFuente(coleccion: string, origen: string): Promise<mCertificado[]> {
    return this.db.collection(coleccion).get().then(snap => {
      const lista: mCertificado[] = [];
      snap.forEach(doc => {
        const data: any = doc.data();
        const ctx = this.contextoDe(data, this.contextoVacio(), doc.id);
        this.recorrer(data, ctx, origen, doc.id, lista, 0, null);
      });
      return lista;
    }).catch(e => {
      console.warn('Biblioteca: no se pudo leer la colección "' + coleccion + '"', e);
      return [];
    });
  }

  private leerIndice(): Promise<mCertificado[]> {
    return this.db.collection(this.coleccion).get().then(snap => {
      const lista: mCertificado[] = [];
      snap.forEach(doc => {
        const d: any = doc.data();
        if (!d.url) { return; }
        const fecha = this.aFecha(d.fecha) || new Date();
        lista.push({
          id: doc.id,
          idSubProyecto: this.aNumero(d.idSubProyecto),
          nombreSubProyecto: d.nombreSubProyecto || '',
          idProyecto: this.aNumero(d.idProyecto),
          origen: d.origen || 'Otros',
          referencia: d.referencia || '',
          nombreArchivo: d.nombreArchivo || this.nombreDesdeUrl(d.url),
          url: d.url,
          rutaStorage: d.rutaStorage || '',
          fecha: fecha,
          anio: d.anio ? Number(d.anio) : fecha.getFullYear(),
          usuario: d.usuario || ''
        });
      });
      return lista;
    }).catch(e => {
      console.warn('Biblioteca: no se pudo leer "' + this.coleccion + '"', e);
      return [];
    });
  }

  /** Recorre el documento completo buscando URLs de archivos (adjuntos), heredando sub-proyecto/fecha de los niveles superiores. */
  private recorrer(valor: any, ctx: Contexto, origen: string, docId: string,
                   lista: mCertificado[], nivel: number, padre: any) {
    if (valor === null || valor === undefined || nivel > 10) { return; }

    if (typeof valor === 'string') {
      if (this.esUrlArchivo(valor)) {
        lista.push({
          id: docId + '|' + valor,
          idSubProyecto: ctx.idSubProyecto,
          nombreSubProyecto: ctx.nombreSubProyecto,
          idProyecto: ctx.idProyecto,
          origen: origen,
          referencia: ctx.referencia,
          nombreArchivo: this.nombreArchivo(padre, valor),
          url: valor,
          fecha: ctx.fecha || new Date(),
          anio: ctx.anio || (ctx.fecha ? ctx.fecha.getFullYear() : new Date().getFullYear()),
          usuario: ctx.usuario
        });
      }
      return;
    }

    if (Array.isArray(valor)) {
      valor.forEach(v => this.recorrer(v, ctx, origen, docId, lista, nivel + 1, padre));
      return;
    }

    if (this.esObjetoPlano(valor)) {
      const nuevoCtx = this.contextoDe(valor, ctx, null);
      Object.keys(valor).forEach(k => this.recorrer(valor[k], nuevoCtx, origen, docId, lista, nivel + 1, valor));
    }
  }

  private contextoVacio(): Contexto {
    return { idSubProyecto: null, nombreSubProyecto: '', idProyecto: null, fecha: null, anio: null, referencia: '', usuario: '' };
  }

  /** Toma del objeto los datos que sirven (sub-proyecto, fecha, número…) y hereda el resto del contexto padre. */
  private contextoDe(o: any, base: Contexto, docId: string): Contexto {
    const ctx: Contexto = {
      idSubProyecto: base.idSubProyecto,
      nombreSubProyecto: base.nombreSubProyecto,
      idProyecto: base.idProyecto,
      fecha: base.fecha,
      anio: base.anio,
      referencia: base.referencia,
      usuario: base.usuario
    };

    // sub-proyecto
    const sub = this.primero(o, ['idSubProyecto', 'idSubproyecto', 'subProyectoId', 'idSubProyectoSeleccionado']);
    if (sub !== null) { ctx.idSubProyecto = this.aNumero(sub); }
    if (o.subProyecto && typeof o.subProyecto === 'object') {
      if (o.subProyecto.idSubProyecto !== undefined) { ctx.idSubProyecto = this.aNumero(o.subProyecto.idSubProyecto); }
      if (o.subProyecto.nombreSubProyecto) { ctx.nombreSubProyecto = o.subProyecto.nombreSubProyecto; }
      if (o.subProyecto.idProyecto !== undefined) { ctx.idProyecto = this.aNumero(o.subProyecto.idProyecto); }
    }
    if (typeof o.nombreSubProyecto === 'string') { ctx.nombreSubProyecto = o.nombreSubProyecto; }
    const proy = this.primero(o, ['idProyecto']);
    if (proy !== null) { ctx.idProyecto = this.aNumero(proy); }

    // si el documento no trae el sub-proyecto, probar con el id del documento ("123" o "123_2026")
    if (docId && ctx.idSubProyecto === null) {
      const m = /^(\d+)(?:[_\-]|$)/.exec(docId);
      if (m) { ctx.idSubProyecto = Number(m[1]); }
    }

    // fecha / año
    const f = this.aFecha(this.primero(o, ['fechaSubida', 'fechaAdjunto', 'fecha', 'fechaHallazgo', 'fechaRegistro',
                                           'fechaCreacion', 'creadoEn', 'createdAt', 'fechaActualizacion', 'date']));
    if (f) { ctx.fecha = f; ctx.anio = f.getFullYear(); }
    const a = this.primero(o, ['anio', 'año', 'year', 'ano']);
    if (a !== null && !isNaN(Number(a)) && Number(a) > 1990) {
      ctx.anio = Number(a);
      if (!ctx.fecha || ctx.fecha.getFullYear() !== ctx.anio) { ctx.fecha = new Date(ctx.anio, 0, 1); }
    }

    // referencia
    const num = this.primero(o, ['numero', 'correlativo', 'nro', 'n']);
    if (num !== null && (typeof num === 'number' || typeof num === 'string') && String(num).length < 10) {
      ctx.referencia = 'N° ' + num;
    }
    const mes = this.primero(o, ['mes', 'nombreMes']);
    if (mes !== null && (typeof mes === 'string' || typeof mes === 'number')) {
      ctx.referencia = (ctx.referencia ? ctx.referencia + ' · ' : '') + 'Mes ' + mes;
    }

    // usuario
    const u = this.primero(o, ['usuario', 'nombreUsuario', 'subidoPor', 'creadoPor', 'responsable']);
    if (typeof u === 'string') { ctx.usuario = u; }

    return ctx;
  }

  // ---------------------------------------------------------------- índice (registro manual opcional)

  registrar(datos: {
    idSubProyecto: number;
    nombreSubProyecto?: string;
    idProyecto?: number;
    origen: string;
    referencia?: string;
    nombreArchivo: string;
    url: string;
    rutaStorage?: string;
    fecha?: any;
    usuario?: string;
  }): Promise<string> {
    const fecha = this.aFecha(datos.fecha) || new Date();
    const doc: any = {
      idSubProyecto: this.aNumero(datos.idSubProyecto),
      nombreSubProyecto: datos.nombreSubProyecto,
      idProyecto: this.aNumero(datos.idProyecto),
      origen: datos.origen,
      referencia: datos.referencia,
      nombreArchivo: datos.nombreArchivo,
      url: datos.url,
      rutaStorage: datos.rutaStorage,
      fecha: fecha,
      anio: fecha.getFullYear(),
      usuario: datos.usuario,
      creadoEn: new Date()
    };
    Object.keys(doc).forEach(k => { if (doc[k] === undefined) { delete doc[k]; } });
    return this.db.collection(this.coleccion).add(doc).then(ref => ref.id);
  }

  eliminarPorUrl(url: string): Promise<void> {
    return this.db.collection(this.coleccion).where('url', '==', url).get().then(snap => {
      const batch = this.db.batch();
      snap.forEach(doc => batch.delete(doc.ref));
      return batch.commit();
    });
  }

  // ---------------------------------------------------------------- utilidades

  private esUrlArchivo(s: string): boolean {
    if (!/^https?:\/\//i.test(s) || s.length > 2000) { return false; }
    if (/firebasestorage\.googleapis\.com|storage\.googleapis\.com|appspot\.com\/o\//i.test(s)) { return true; }
    if (/:3800\//.test(s)) { return true; }
    return /\.(pdf|docx?|xlsx?|xlsm|csv|pptx?|jpe?g|png|gif|webp|bmp|zip|rar|7z|dwg|txt|msg)(\?|#|$)/i.test(s);
  }

  private nombreArchivo(padre: any, url: string): string {
    if (padre && typeof padre === 'object') {
      const n = this.primero(padre, ['nombreArchivo', 'nombreOriginal', 'nombre', 'name', 'fileName', 'filename', 'titulo']);
      if (typeof n === 'string' && n.trim()) { return n.trim(); }
    }
    return this.nombreDesdeUrl(url);
  }

  private nombreDesdeUrl(url: string): string {
    try {
      let ruta = url.split('?')[0];
      const iO = ruta.indexOf('/o/');
      if (iO !== -1) { ruta = ruta.substring(iO + 3); }
      ruta = decodeURIComponent(ruta);
      const partes = ruta.split('/');
      return partes[partes.length - 1] || 'archivo';
    } catch (e) {
      return 'archivo';
    }
  }

  private primero(o: any, claves: string[]): any {
    for (let i = 0; i < claves.length; i++) {
      const v = o[claves[i]];
      if (v !== undefined && v !== null && v !== '') { return v; }
    }
    return null;
  }

  private esObjetoPlano(v: any): boolean {
    if (!v || typeof v !== 'object') { return false; }
    if (typeof v.toDate === 'function' || v instanceof Date) { return false; }
    const proto = Object.getPrototypeOf(v);
    return proto === Object.prototype || proto === null;
  }

  private aNumero(v: any): number {
    if (v === null || v === undefined || v === '') { return null; }
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  private aFecha(valor: any): Date {
    if (!valor) { return null; }
    if (typeof valor.toDate === 'function') { return valor.toDate(); }
    if (valor instanceof Date) { return valor; }
    if (typeof valor === 'object' && typeof valor.seconds === 'number') { return new Date(valor.seconds * 1000); }
    if (typeof valor === 'number') {
      const fn: Date = new Date(Number(valor));
      return isNaN(fn.getTime()) ? null : fn;
    }
    if (typeof valor === 'string') {
      const texto: string = String(valor);
      // dd/MM/yyyy o dd-MM-yyyy
      const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(texto);
      const fs: Date = m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : new Date(texto);
      return isNaN(fs.getTime()) ? null : fs;
    }
    return null;
  }
}