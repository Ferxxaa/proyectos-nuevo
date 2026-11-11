import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { sMis_Proyectos } from '../../services/sMis_Proyectos.service';
import { sUsuarioClienteProyecto } from '../../services/sUsuarioClienteProyecto.service';
import { firestoreDB } from '../../firebase-init';
import { ControlAsistenciaComponent } from '../../Proyectos/estadisticas-hh/control-asistencia.component';
import {
  TrabajadorCore, listarTrabajadores, guardarTrabajador, eliminarTrabajador, buscarEnAgenda,
  etiquetaTrabajador, formatearRut, rutValido, limpiarRut, normalizarTexto, ordenarTrabajadores, clavesTrabajador
} from '../trabajadores/trabajadores-core';

const COLECCION_ASISTENCIA = 'asistenciaHH';

interface GrupoSubProyecto {
  id: string;              // idSubProyecto como texto (para comparar)
  idSubProyecto: any;      // valor original (el mismo que usan los documentos de asistencia)
  idProyecto: any;
  nombre: string;
  nombreProyecto: string;
}

/**
 * CORE > Control Asistencia.
 *  - Pestaña "Control de asistencia": todos los subproyectos del mes, ordenados, cada uno con su
 *    tabla (app-control-asistencia en modo embebido). Cada subproyecto se sigue guardando en su
 *    documento de 'asistenciaHH', así las Estadísticas HH de cada uno no cambian.
 *  - Pestaña "Trabajadores": agenda central de CORE (colección 'trabajadoresCore').
 */
@Component({
  selector: 'app-control-asistencia-page',
  templateUrl: './control-asistencia-page.component.html',
  styleUrls: ['./control-asistencia-page.component.css'],
  providers: [sMis_Proyectos, sUsuarioClienteProyecto]
})
export class ControlAsistenciaPageComponent implements OnInit {

  @ViewChildren(ControlAsistenciaComponent) bloques: QueryList<ControlAsistenciaComponent>;

  readonly meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto',
    'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  vista: string = 'asistencia';   // 'asistencia' | 'trabajadores'

  // Permisos y subproyectos que puede ver el usuario
  soloLectura: boolean = true;
  cargandoPermisos: boolean = true;
  cargandoSubProyectos: boolean = true;
  errorCarga: boolean = false;
  subProyectos: any[] = [];
  private permitidos: { [id: string]: any } = {};
  private idUsuario: any = null;

  // Mes que se muestra
  anio: number = new Date().getFullYear();
  mes: number = new Date().getMonth() + 1;
  quincena: number = new Date().getDate() > 15 ? 2 : 1;
  anios: number[] = [];

  // Subproyectos del mes
  grupos: GrupoSubProyecto[] = [];
  cargandoGrupos: boolean = false;
  errorGrupos: boolean = false;
  private resumenes: { [id: string]: any } = {};
  /** Subproyectos donde está cada trabajador este mes (para la agenda). */
  private asignaciones: { [clave: string]: string[] } = {};
  private cargaGrupos: number = 0;
  /** Filas de cada subproyecto en el mes (para marcar en gris los días ya trabajados en otro). */
  private datosSp: { [id: string]: { nombre: string; filas: any[] } } = {};
  ocupacion: any = {};
  /** Subproyectos con trabajadores el mes anterior pero sin nadie este mes (se pueden traer). */
  delMesAnterior: { grupo: GrupoSubProyecto; cantidad: number }[] = [];

  // Agregar trabajador a un subproyecto
  textoTrabajador: string = '';
  textoSubProyecto: string = '';
  mensajeAgregar: string = '';
  errorAgregar: string = '';
  agregando: boolean = false;

  // Agenda
  agenda: TrabajadorCore[] = [];
  cargandoAgenda: boolean = true;
  errorAgenda: boolean = false;
  busquedaAgenda: string = '';
  formulario: TrabajadorCore = this.formularioVacio();
  errorFormulario: string = '';
  guardandoFormulario: boolean = false;
  mensajeAgenda: string = '';

  constructor(
    private _sUsuariosPerfiles: sUsuariosPerfiles,
    private _sMisProyectos: sMis_Proyectos,
    private _sUsuarioClienteProyecto: sUsuarioClienteProyecto
  ) {}

  ngOnInit() {
    const actual = new Date().getFullYear();
    for (let a = actual + 1; a >= actual - 5; a--) { this.anios.push(a); }

    let usuario: any;
    try {
      usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch (error) {
      usuario = {};
    }
    if (!usuario.idUsuario) {
      this.cargandoPermisos = false;
      this.cargandoSubProyectos = false;
      this.errorCarga = true;
      return;
    }
    this.idUsuario = usuario.idUsuario;

    this._sUsuariosPerfiles.getUsuariosPerfilesbyidUsuario(Number(usuario.idUsuario)).subscribe(
      (perfiles: any[]) => {
        const lista = Array.isArray(perfiles) ? perfiles : [];
        this.soloLectura = lista.some(p => p.idPerfil == 5 || p.idPerfil === 'Clientes');
        this.cargandoPermisos = false;
        this.cargarSubProyectos(usuario.idUsuario, lista);
        if (!this.soloLectura) { this.cargarAgenda(); } else { this.cargandoAgenda = false; }
      },
      error => {
        console.error('Error al verificar permisos de Control Asistencia:', error);
        this.soloLectura = true;
        this.cargandoPermisos = false;
        this.cargandoSubProyectos = false;
        this.errorCarga = true;
      }
    );
  }

  // ===================== Subproyectos permitidos =====================

  private cargarSubProyectos(idUsuario: number, perfiles: any[]) {
    const esCliente = this.soloLectura;
    const esAdministrador = perfiles.some(p => p.idPerfil == 1 || p.idPerfil == 9);

    const fallar = (error: any) => {
      console.error('Error al cargar subproyectos para Control Asistencia:', error);
      this.errorCarga = true;
      this.cargandoSubProyectos = false;
    };

    if (esCliente) {
      this._sUsuarioClienteProyecto.getUsuarioClienteProyectobyidUsuarioCliente(Number(idUsuario)).subscribe(
        (asignaciones: any[]) => {
          const proyectos = Array.isArray(asignaciones) ? asignaciones : [];
          if (!proyectos.length) { this.finalizarCarga([]); return; }
          Promise.all(proyectos.map(a => this._sMisProyectos.getMis_ProyectosbyidProyecto(a.idProyecto).toPromise()))
            .then(res => this.finalizarCarga([].concat.apply([], res || [])))
            .catch(fallar);
        },
        fallar
      );
      return;
    }

    const solicitud = esAdministrador
      ? this._sMisProyectos.getMis_Proyectos()
      : this._sMisProyectos.getMis_ProyectosbyidUsuarioCoordinador(Number(idUsuario));
    solicitud.subscribe((lista: any[]) => this.finalizarCarga(Array.isArray(lista) ? lista : []), fallar);
  }

  private finalizarCarga(lista: any[]) {
    const unicos: { [id: string]: any } = {};
    lista.forEach(sp => {
      if (sp && sp.idSubProyecto !== null && sp.idSubProyecto !== undefined) { unicos[String(sp.idSubProyecto)] = sp; }
    });
    this.permitidos = unicos;
    this.subProyectos = Object.keys(unicos).map(id => unicos[id]).sort((a, b) =>
      (a.nombreSubProyecto || '').localeCompare(b.nombreSubProyecto || '', 'es', { sensitivity: 'base' }));
    this.cargandoSubProyectos = false;
    this.cargarGrupos();
  }

  etiquetaSubProyecto(sp: any): string {
    return [sp.nombreSubProyecto, sp.nombreProyecto].filter(x => !!x).join(' — ');
  }

  private grupoDe(sp: any): GrupoSubProyecto {
    return {
      id: String(sp.idSubProyecto),
      idSubProyecto: sp.idSubProyecto,
      idProyecto: sp.idProyecto === undefined ? null : sp.idProyecto,
      nombre: sp.nombreSubProyecto || ('Subproyecto ' + sp.idSubProyecto),
      nombreProyecto: sp.nombreProyecto || ''
    };
  }

  // ===================== Mes / grupos =====================

  get nombreMes(): string {
    return this.meses[this.mes - 1];
  }

  cambiarPeriodo() {
    this.mes = Number(this.mes);
    this.anio = Number(this.anio);
    this.cargarGrupos();
  }

  seleccionarQuincena(q: number) {
    this.quincena = q;
  }

  /**
   * Subproyectos que se muestran: solo los que tienen trabajadores este mes (y que el usuario puede ver).
   * Los que tenían trabajadores el mes anterior quedan en "delMesAnterior" para poder traerlos.
   */
  cargarGrupos() {
    const carga = ++this.cargaGrupos;
    const anio = this.anio;
    const mes = this.mes;
    const anioAnterior = mes === 1 ? anio - 1 : anio;
    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const aniosConsulta = anioAnterior === anio ? [anio] : [anio, anioAnterior];

    this.cargandoGrupos = true;
    this.errorGrupos = false;
    this.mensajeAgregar = '';
    this.errorAgregar = '';

    Promise.all(aniosConsulta.map(a => firestoreDB.collection(COLECCION_ASISTENCIA).where('anio', '==', a).get()))
      .then((snaps: any[]) => {
        if (carga !== this.cargaGrupos) { return; }
        const ids: { [id: string]: boolean } = {};
        const anteriores: { [id: string]: number } = {};
        const asignaciones: { [clave: string]: string[] } = {};
        const datosSp: { [id: string]: { nombre: string; filas: any[] } } = {};

        snaps.forEach(snap => snap.forEach((doc: any) => {
          const d = doc.data() || {};
          const id = String(d.idSubProyecto);
          const sp = this.permitidos[id];
          if (!sp) { return; }
          const a = Number(d.anio);
          const m = Number(d.mes);
          const mapa = d.trabajadores || {};
          const activos = Object.keys(mapa).filter(k => mapa[k] && !mapa[k].eliminado).map(k => mapa[k]);

          if (a === anio && m === mes) {
            if (!activos.length) { return; }   // sin trabajadores: no se muestra
            ids[id] = true;
            const nombre = sp.nombreSubProyecto || id;
            datosSp[id] = { nombre: nombre, filas: activos };
            activos.forEach(t => this.clavesTrabajador(t).forEach(c => {
              const lista = asignaciones[c] || (asignaciones[c] = []);
              if (lista.indexOf(nombre) < 0) { lista.push(nombre); }
            }));
          } else if (a === anioAnterior && m === mesAnterior && activos.length) {
            anteriores[id] = activos.length;
          }
        }));

        this.asignaciones = asignaciones;
        this.resumenes = {};
        this.datosSp = datosSp;
        this.reconstruirOcupacion();
        this.grupos = Object.keys(ids).map(id => this.grupoDe(this.permitidos[id]))
          .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es', { sensitivity: 'base' }));
        this.delMesAnterior = Object.keys(anteriores).filter(id => !ids[id])
          .map(id => ({ grupo: this.grupoDe(this.permitidos[id]), cantidad: anteriores[id] }))
          .sort((x, y) => x.grupo.nombre.localeCompare(y.grupo.nombre, 'es', { sensitivity: 'base' }));
        this.cargandoGrupos = false;
      })
      .catch((error: any) => {
        if (carga !== this.cargaGrupos) { return; }
        console.error('Error al cargar los subproyectos del mes:', error);
        this.errorGrupos = true;
        this.cargandoGrupos = false;
      });
  }

  private clavesTrabajador(t: any): string[] {
    return clavesTrabajador(t);
  }

  actualizarResumen(evento: any) {
    if (!evento || evento.idSubProyecto === undefined) { return; }
    const id = String(evento.idSubProyecto);
    const antes = this.resumenes[id];

    // Se eliminó al último trabajador: el subproyecto sale de la lista al tiro
    if (antes && antes.trabajadores > 0 && !evento.trabajadores) {
      delete this.resumenes[id];
      delete this.datosSp[id];
      this.grupos = this.grupos.filter(g => g.id !== id);
      this.reconstruirOcupacion();
      return;
    }

    this.resumenes[id] = evento;
    if (evento.filas) {
      const g = this.grupos.filter(x => x.id === id)[0];
      this.datosSp[id] = { nombre: g ? g.nombre : id, filas: evento.filas };
      this.reconstruirOcupacion();
    }
  }

  /**
   * ocupacion[clave][dia][idSubProyecto] = lo que la persona tiene ese día en ese subproyecto.
   * Cada tabla la usa para pintar en gris los días que el trabajador ya tiene en otro subproyecto.
   */
  private reconstruirOcupacion() {
    const oc: any = {};
    Object.keys(this.datosSp).forEach(id => {
      const d = this.datosSp[id];
      (d.filas || []).forEach(t => {
        const dias = t.dias || {};
        const claves = clavesTrabajador(t);
        Object.keys(dias).forEach(dia => {
          const v = dias[dia] || {};
          const jornada = Number(v.jornada) || 0;
          const extra = Number(v.extra) || 0;
          const capacitacion = Number(v.capacitacion) || 0;
          if (!jornada && !extra && !capacitacion) { return; }
          claves.forEach(c => {
            const porDia = oc[c] || (oc[c] = {});
            const porSp = porDia[dia] || (porDia[dia] = {});
            porSp[id] = { nombre: d.nombre, jornada: jornada, extra: extra, capacitacion: capacitacion };
          });
        });
      });
    });
    this.ocupacion = oc;
  }

  get totalHH(): number {
    let t = 0;
    this.grupos.forEach(g => { const r = this.resumenes[g.id]; if (r) { t += Number(r.resumen.hh) || 0; } });
    return Math.round(t * 100) / 100;
  }

  /** Subproyectos con días hábiles pasados sin marcar. */
  get subProyectosPendientes(): number {
    return this.grupos.filter(g => { const r = this.resumenes[g.id]; return r && r.diasPendientes > 0; }).length;
  }

  get totalTrabajadoresMes(): number {
    let t = 0;
    this.grupos.forEach(g => { const r = this.resumenes[g.id]; if (r) { t += Number(r.trabajadores) || 0; } });
    return t;
  }

  formatear(valor: number): string {
    const partes = String(Math.round((valor || 0) * 100) / 100).split('.');
    return partes[0].replace(/\B(?=(\d{3})+$)/g, '.') + (partes[1] ? ',' + partes[1] : '');
  }

  trackGrupo(i: number, g: GrupoSubProyecto) { return g.id; }

  get nombreMesAnterior(): string {
    return this.meses[this.mes === 1 ? 11 : this.mes - 2];
  }

  /** Abre el subproyecto del mes anterior: su tabla ofrece "Copiar a {mes}". */
  traerDelMesAnterior(item: { grupo: GrupoSubProyecto; cantidad: number }) {
    this.delMesAnterior = this.delMesAnterior.filter(x => x !== item);
    if (!this.grupos.some(g => g.id === item.grupo.id)) {
      this.grupos = this.grupos.concat(item.grupo)
        .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es', { sensitivity: 'base' }));
    }
    setTimeout(() => {
      const el = document.getElementById('core-grupo-' + item.grupo.id);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }, 50);
  }

  // ===================== Agregar trabajador a un subproyecto =====================

  etiquetaAgenda(t: TrabajadorCore): string {
    return etiquetaTrabajador(t);
  }

  agregarTrabajador() {
    if (this.soloLectura || this.agregando) { return; }
    this.mensajeAgregar = '';
    this.errorAgregar = '';

    const texto = (this.textoTrabajador || '').trim();
    const t = this.agenda.filter(x => etiquetaTrabajador(x) === texto)[0]
      || buscarEnAgenda(this.agenda, { rut: texto })
      || this.agenda.filter(x => normalizarTexto(x.nombre + ' ' + x.apellido) === normalizarTexto(texto))[0];
    if (!t) {
      this.errorAgregar = texto
        ? 'No está en la agenda. Créalo en la pestaña Trabajadores o escríbelo directo en la fila "Agregar..." del subproyecto.'
        : 'Elige un trabajador de la agenda.';
      return;
    }

    const textoSp = (this.textoSubProyecto || '').trim();
    const sp = this.subProyectos.filter(x => this.etiquetaSubProyecto(x) === textoSp)[0]
      || this.subProyectos.filter(x => normalizarTexto(x.nombreSubProyecto) === normalizarTexto(textoSp))[0];
    if (!sp) {
      this.errorAgregar = 'Elige el subproyecto (lugar de trabajo) de la lista.';
      return;
    }

    const id = String(sp.idSubProyecto);
    this.delMesAnterior = this.delMesAnterior.filter(x => x.grupo.id !== id);
    if (!this.grupos.some(g => g.id === id)) {
      this.grupos = this.grupos.concat(this.grupoDe(sp))
        .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es', { sensitivity: 'base' }));
    }

    this.agregando = true;
    this.esperarBloque(id).then(bloque => {
      this.agregando = false;
      if (!bloque) { this.errorAgregar = 'No se pudo abrir el subproyecto. Intenta de nuevo.'; return; }
      if (bloque.agregarDesdeAgenda(t)) {
        this.mensajeAgregar = t.nombre + ' ' + t.apellido + ' quedó en ' + (sp.nombreSubProyecto || 'el subproyecto') + '.';
        this.textoTrabajador = '';
        const nombre = sp.nombreSubProyecto || id;
        this.clavesTrabajador(t).forEach(c => {
          const lista = this.asignaciones[c] || (this.asignaciones[c] = []);
          if (lista.indexOf(nombre) < 0) { lista.push(nombre); }
        });
        setTimeout(() => {
          const el = document.getElementById('core-grupo-' + id);
          if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        }, 50);
      } else {
        this.errorAgregar = bloque.errorFila || 'No se pudo agregar.';
        bloque.errorFila = '';
      }
    });
  }

  /** Espera a que la tabla del subproyecto exista y termine de cargar. */
  private esperarBloque(id: string): Promise<ControlAsistenciaComponent> {
    return new Promise(resolve => {
      let intentos = 0;
      const revisar = () => {
        const bloque = this.bloques ? this.bloques.find(b => String(b.idSubProyecto) === id) : null;
        if (bloque && !bloque.cargando) { resolve(bloque.errorCarga ? null : bloque); return; }
        if (++intentos > 100) { resolve(null); return; }
        setTimeout(revisar, 100);
      };
      setTimeout(revisar, 0);
    });
  }

  /** Trabajador escrito a mano en una tabla: si no estaba en la agenda, se agrega. */
  agregarAAgendaDesdeAsistencia(tr: any) {
    if (this.soloLectura || !tr) { return; }
    if (buscarEnAgenda(this.agenda, tr)) { return; }
    if (tr.rut && !rutValido(tr.rut)) { return; } // con RUT malo no se guarda en la agenda
    guardarTrabajador({
      id: '', nombre: tr.nombre, apellido: tr.apellido, rut: tr.rut || '', rutLimpio: '', cargo: tr.cargo || ''
    }, this.idUsuario).then(nuevo => {
      if (!this.agenda.some(x => x.id === nuevo.id)) { this.agenda = ordenarTrabajadores(this.agenda.concat(nuevo)); }
    }).catch(error => console.error('No se pudo agregar a la agenda:', error));
  }

  // ===================== Agenda de trabajadores =====================

  cargarAgenda() {
    this.cargandoAgenda = true;
    this.errorAgenda = false;
    listarTrabajadores().then(lista => {
      this.agenda = lista;
      this.cargandoAgenda = false;
    }).catch(error => {
      console.error('Error al cargar la agenda de trabajadores:', error);
      this.errorAgenda = true;
      this.cargandoAgenda = false;
    });
  }

  get agendaFiltrada(): TrabajadorCore[] {
    const terminos = normalizarTexto(this.busquedaAgenda).split(/\s+/).filter(x => !!x);
    if (!terminos.length) { return this.agenda; }
    return this.agenda.filter(t => {
      const texto = normalizarTexto([t.nombre, t.apellido, t.rut, t.rutLimpio, t.cargo].join(' '));
      return terminos.every(x => texto.indexOf(x) >= 0);
    });
  }

  subProyectosDe(t: TrabajadorCore): string[] {
    const res: string[] = [];
    this.clavesTrabajador(t).forEach(c => (this.asignaciones[c] || []).forEach(n => { if (res.indexOf(n) < 0) { res.push(n); } }));
    return res;
  }

  private formularioVacio(): TrabajadorCore {
    return { id: '', nombre: '', apellido: '', rut: '', rutLimpio: '', cargo: '' };
  }

  formatearRutFormulario() {
    if (this.formulario.rut) { this.formulario.rut = formatearRut(this.formulario.rut); }
  }

  editarTrabajador(t: TrabajadorCore) {
    this.formulario = { id: t.id, nombre: t.nombre, apellido: t.apellido, rut: t.rut, rutLimpio: t.rutLimpio, cargo: t.cargo, fechaCreacion: t.fechaCreacion };
    this.errorFormulario = '';
    this.mensajeAgenda = '';
    setTimeout(() => {
      const el = document.getElementById('core-form-nombre');
      if (el) { el.focus(); }
    });
  }

  cancelarFormulario() {
    this.formulario = this.formularioVacio();
    this.errorFormulario = '';
  }

  guardarFormulario() {
    if (this.soloLectura || this.guardandoFormulario) { return; }
    this.errorFormulario = '';
    this.mensajeAgenda = '';
    const f = this.formulario;

    if (!(f.nombre || '').trim() || !(f.apellido || '').trim()) {
      this.errorFormulario = 'Nombre y apellido son obligatorios.';
      return;
    }
    if (f.rut && !rutValido(f.rut)) {
      this.errorFormulario = 'El RUT no es válido (revisa el dígito verificador).';
      return;
    }
    const rut = limpiarRut(f.rut);
    if (rut && this.agenda.some(t => t.rutLimpio === rut && t.id !== f.id)) {
      this.errorFormulario = 'Ya hay un trabajador con ese RUT en la agenda.';
      return;
    }
    if (!rut && this.agenda.some(t => t.id !== f.id &&
      normalizarTexto(t.nombre) === normalizarTexto(f.nombre) && normalizarTexto(t.apellido) === normalizarTexto(f.apellido))) {
      this.errorFormulario = 'Ya hay un trabajador con ese nombre. Agrégale el RUT para diferenciarlo.';
      return;
    }

    const editando = !!f.id;
    this.guardandoFormulario = true;
    guardarTrabajador(f, this.idUsuario).then(guardado => {
      this.agenda = ordenarTrabajadores(this.agenda.filter(t => t.id !== guardado.id).concat(guardado));
      this.mensajeAgenda = guardado.nombre + ' ' + guardado.apellido + (editando ? ' quedó actualizado.' : ' quedó en la agenda.');
      this.formulario = this.formularioVacio();
      this.guardandoFormulario = false;
    }).catch(error => {
      console.error('Error al guardar el trabajador:', error);
      this.errorFormulario = 'No se pudo guardar. Revisa que la colección trabajadoresCore esté en las reglas de Firestore.';
      this.guardandoFormulario = false;
    });
  }

  borrarTrabajador(t: TrabajadorCore) {
    if (this.soloLectura) { return; }
    const enUso = this.subProyectosDe(t);
    const aviso = enUso.length
      ? '\n\nEste mes está en: ' + enUso.join(', ') + '. Ahí sigue apareciendo con sus horas; solo sale de la agenda.'
      : '';
    if (!confirm('¿Eliminar a ' + t.nombre + ' ' + t.apellido + ' de la agenda?' + aviso)) { return; }
    eliminarTrabajador(t.id).then(() => {
      this.agenda = this.agenda.filter(x => x.id !== t.id);
      if (this.formulario.id === t.id) { this.cancelarFormulario(); }
      this.mensajeAgenda = t.nombre + ' ' + t.apellido + ' salió de la agenda.';
    }).catch(error => {
      console.error('Error al eliminar el trabajador:', error);
      this.mensajeAgenda = 'No se pudo eliminar.';
    });
  }

  trackTrabajador(i: number, t: TrabajadorCore) { return t.id; }
}