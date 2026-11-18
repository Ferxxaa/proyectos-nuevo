import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';

//Share
import { PopUps } from '../../Share/PopUps';

//Modelos
import { mProyectoMatriz } from '../../models/mProyectoMatriz';
import { mVis_UsuarioPersona } from '../../models/mVis_UsuarioPersona';
import { mVis_ProyectoMatriz } from '../../models/mVis_ProyectoMatriz';
import { mDirectorProyectoMatriz } from '../../models/mDirectorProyectoMatriz';

//Servicios
import { sProyectoMatriz } from '../../services/sProyectoMatriz.service';
import { sUsuario } from '../../services/sUsuario.service';
import { sPersona } from '../../services/sPersona.service';
import { sVis_ProyectoMatriz } from '../../services/sVis_ProyectoMatriz.service';
import { sDirectorProyectoMatriz } from '../../services/sDirectorProyectoMatriz.service';

declare var jQuery: any;
declare var $: any;
declare var Swal: any;

type ModoForm = 'crear' | 'editar';

/** Campo obligatorio que falta. */
interface CampoFaltante {
  clave: string;
  texto: string;
}

/** Copia del formulario de creación mientras se edita otro proyecto matriz en el modal. */
interface BorradorCreacion {
  proyectoMatriz: any;
  directoresList: number[];
  intentoCrear: boolean;
}

@Component({
  selector: 'app-proyecto-matriz',
  templateUrl: './proyecto-matriz.component.html',
  styleUrls: ['./proyecto-matriz.component.css'],
  providers: [
    sProyectoMatriz,
    sUsuario,
    sPersona,
    sVis_ProyectoMatriz,
    PopUps,
    sDirectorProyectoMatriz
  ]
})
export class ProyectoMatrizComponent implements OnInit, AfterViewInit, OnDestroy {

  //Select
  Usuarios: Array<any> = [];

  //Controles
  directoresList: number[] = [0];

  //Loading
  Loading = false;
  LoadingTabla = true;

  //Tabla
  ProyectosMatriz: Array<mVis_ProyectoMatriz> = [];
  filtroTabla = '';

  //Objeto
  ProyectoMatriz: mProyectoMatriz;
  usuario: any;

  //Indices
  IndexUpdate: number;
  IndexEliminar: number;

  //PopUp
  texto = '';
  msg = false;

  //Validación
  intentoCrear = false;     // los campos se marcan en rojo recién después del primer intento de guardar
  intentoEditar = false;
  editando = false;         // true mientras el modal de edición está abierto
  private borrador: BorradorCreacion = null;

  constructor(
    private _sProyectoMatriz: sProyectoMatriz,
    private _sUsuario: sUsuario,
    private _sPersona: sPersona,
    private _sVis_ProyectoMatriz: sVis_ProyectoMatriz,
    private _PopUps: PopUps,
    private _sDirectorProyectoMatriz: sDirectorProyectoMatriz
  ) {
    this.usuario = JSON.parse(localStorage.usuario);
    this.ProyectoMatriz = this.proyectoMatrizVacio();
  }

  ngOnInit() {
    this.Recarga();

    // Usuarios activos (para gerente y directores), ordenados por nombre
    this._sUsuario.getUsuariobyactivo(true).subscribe(
      usuarios => {
        (usuarios || []).forEach(usuario => {
          this._sPersona.getPersonabyID(usuario.idPersona).subscribe(persona => {
            if (!persona) { return; }
            const lista = this.Usuarios.concat([{
              idUsuario: usuario.idUsuario,
              nombre: persona.nombre,
              paterno: persona.paterno,
              materno: persona.materno
            }]);
            lista.sort((a, b) => this.nombreCompleto(a).localeCompare(this.nombreCompleto(b)));
            this.Usuarios = lista;
          });
        });
      },
      error => console.log('Error: ' + error)
    );
  }

  ngAfterViewInit() {
    // Si el modal se cierra con Esc o clic afuera, igual se devuelve el formulario de creación
    $('#exampleModalLong').on('hidden.bs.modal', () => this.cerrarEdicion());
  }

  ngOnDestroy() {
    $('#exampleModalLong').off('hidden.bs.modal');
  }

  private proyectoMatrizVacio(): mProyectoMatriz {
    const pm = new mProyectoMatriz(0, "", 1, 0, 4, true, null, null, null, null);
    if (!(pm as any).idUsuarioSubGerente) { (pm as any).idUsuarioSubGerente = 0; }
    return pm;
  }

  nombreCompleto(p: any): string {
    return (((p && p.nombre) || '') + ' ' + ((p && p.paterno) || '')).trim();
  }

  // *************************************************** DIRECTORES ***************************************************

  AgregarDirector() { this.directoresList.push(0); }

  QuitarDirector(i: number) {
    if (this.directoresList.length > 1) { this.directoresList.splice(i, 1); } else { this.directoresList[0] = 0; }
  }

  /** Evita elegir dos veces al mismo director. */
  usuarioUsado(lista: number[], idUsuario: number, indiceActual: number): boolean {
    return lista.some((id, i) => i !== indiceActual && Number(id) === Number(idUsuario));
  }

  trackIndex(i: number) { return i; }

  private obtenerDirectoresSeleccionados(): number[] {
    const ids = (this.directoresList || []).map(v => Number(v)).filter(v => v > 0);
    return ids.filter((v, i, arr) => arr.indexOf(v) === i);
  }

  // *************************************************** VALIDACIÓN ***************************************************

  faltantes(modo: ModoForm): CampoFaltante[] {
    const lista: CampoFaltante[] = [];
    const pm: any = this.ProyectoMatriz || {};

    if (!pm.nombreProyectoMatriz || !String(pm.nombreProyectoMatriz).trim()) {
      lista.push({ clave: 'nombre', texto: 'Nombre del proyecto matriz' });
    }
    if (!(Number(pm.idUsuarioSubGerente) > 0)) {
      lista.push({ clave: 'gerente', texto: 'Gerente del proyecto' });
    }
    if (this.obtenerDirectoresSeleccionados().length === 0) {
      lista.push({ clave: 'director', texto: 'Al menos un director' });
    }
    return lista;
  }

  /** ¿Marcar este campo en rojo? Solo después del primer intento de guardar. */
  falta(modo: ModoForm, clave: string): boolean {
    const intento = modo === 'crear' ? this.intentoCrear : this.intentoEditar;
    return intento && this.faltantes(modo).some(f => f.clave === clave);
  }

  /** Lleva el foco al campo que falta (clic en el chip de "Falta completar"). */
  irACampo(modo: ModoForm, clave: string) {
    const el = document.getElementById('pz-' + modo + '-' + clave) as HTMLElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => el.focus(), 250);
    }
  }

  private validarYAvisar(modo: ModoForm): boolean {
    if (modo === 'crear') { this.intentoCrear = true; } else { this.intentoEditar = true; }
    const lista = this.faltantes(modo);
    if (!lista.length) { return true; }

    const html = '<ul style="text-align:left;margin:4px 0 0 18px;padding:0;font-size:14px;line-height:1.7">'
      + lista.map(f => '<li>' + f.texto + '</li>').join('')
      + '</ul>';

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: lista.length === 1 ? 'Falta 1 dato obligatorio' : 'Faltan ' + lista.length + ' datos obligatorios',
        html: html,
        confirmButtonText: 'Completar',
        confirmButtonColor: '#026AA7'
      }).then(() => this.irACampo(modo, lista[0].clave));
    } else {
      alert('Falta completar:\n- ' + lista.map(f => f.texto).join('\n- '));
      this.irACampo(modo, lista[0].clave);
    }
    return false;
  }

  private avisar(icon: string, titulo: string, texto: string) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({ icon: icon, title: titulo, text: texto, confirmButtonColor: '#026AA7' });
    }
  }

  // *************************************************** CRUD ***************************************************

  Agregar() {
    if (this.Loading) { return; }
    if (!this.validarYAvisar('crear')) { return; }

    this.texto = "";
    this.msg = false;
    this.Loading = true;
    this.ProyectoMatriz.nombreProyectoMatriz = String(this.ProyectoMatriz.nombreProyectoMatriz).trim();
    const directores = this.obtenerDirectoresSeleccionados();

    this._sProyectoMatriz.postAddProyectoMatriz(this.ProyectoMatriz)
      .success(result => {
        this.agregarDirectoresSecuencial(result.idProyectoMatriz, directores, () => {
          this.Reset();
          this.Recarga();
          this.Loading = false;
          this.texto = "Proyecto Matriz creado de forma correcta";
          this.msg = true;
          this.avisar('success', '¡Listo!', 'Proyecto matriz creado correctamente');
        });
      })
      .error(error => {
        console.log(error);
        this.Loading = false;
        this.avisar('error', 'Error', 'No se pudo crear el proyecto matriz. Intenta nuevamente.');
      });
  }

  /** Limpia el formulario de creación. */
  Reset() {
    this.ProyectoMatriz = this.proyectoMatrizVacio();
    this.directoresList = [0];
    this.intentoCrear = false;
  }

  private Recarga() {
    this._sVis_ProyectoMatriz.getVis_ProyectoMatriz().subscribe(result => {
      this.ProyectosMatriz = result || [];
      this.LoadingTabla = false;
    }, error => {
      console.log(error);
      this.LoadingTabla = false;
    });
  }

  /** Tabla filtrada por el buscador (ID, nombre, gerente o directores). */
  get proyectosFiltrados(): mVis_ProyectoMatriz[] {
    const datos: any[] = this.ProyectosMatriz || [];
    const filtro = (this.filtroTabla || '').trim().toLowerCase();
    if (!filtro) { return datos; }
    return datos.filter(p =>
      [p.idProyectoMatriz, p.nombreProyectoMatriz, p.SubGerente, p.Directores]
        .some(v => v !== null && v !== undefined && String(v).toLowerCase().indexOf(filtro) !== -1)
    );
  }

  /** Separa "A | B | C" en etiquetas, sin repetidos (ni por mayúsculas ni por tildes). */
  separar(texto: string): string[] {
    const vistos: { [clave: string]: boolean } = {};
    return (texto || '').split(/[|,]/).map(t => t.trim()).filter(t => {
      if (!t) { return false; }
      const clave = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (vistos[clave]) { return false; }
      vistos[clave] = true;
      return true;
    });
  }

  private indiceReal(p: mVis_ProyectoMatriz): number {
    return (this.ProyectosMatriz || []).indexOf(p);
  }

  Actualizar() {
    if (this.Loading) { return; }
    if (!this.validarYAvisar('editar')) { return; }

    this.texto = "";
    this.msg = false;
    this.Loading = true;
    const idproyectoMatriz = this.ProyectoMatriz.idProyectoMatriz;
    this.ProyectoMatriz.nombreProyectoMatriz = String(this.ProyectoMatriz.nombreProyectoMatriz).trim();
    const directores = this.obtenerDirectoresSeleccionados();

    this._sProyectoMatriz.postUpdDelProyectoMatriz(this.ProyectoMatriz).success(() => {
      this._sDirectorProyectoMatriz.getDirectorProyectoMatrizbyidProyectoMatriz(idproyectoMatriz).subscribe(actuales => {
        this.desactivarDirectoresSecuencial(actuales || [], () => {
          this.agregarDirectoresSecuencial(idproyectoMatriz, directores, () => {
            this.OcultarPopUpEditar();
            this.Recarga();
            this.Loading = false;
            this.texto = "Proyecto Matriz editado de forma correcta";
            this.msg = true;
            this.avisar('success', '¡Listo!', 'Proyecto matriz actualizado correctamente');
          });
        });
      }, error => {
        console.log(error);
        this.Loading = false;
        this.avisar('error', 'Error', 'Se guardó el proyecto, pero no se pudieron actualizar los directores.');
      });
    }).error(error => {
      console.log(error);
      this.Loading = false;
      this.avisar('error', 'Error', 'No se pudo actualizar el proyecto matriz. Intenta nuevamente.');
    });
  }

  private desactivarDirectoresSecuencial(directores: any[], done: () => void) {
    const lista = directores || [];
    const ejecutar = (index: number) => {
      if (index >= lista.length) {
        done();
        return;
      }
      const element = lista[index];
      element.idUsuarioRemovedor = this.usuario.idUsuario;
      this._sDirectorProyectoMatriz.postUpdDelDirectorProyectoMatriz(element)
        .success(() => ejecutar(index + 1))
        .error(() => ejecutar(index + 1));
    };
    ejecutar(0);
  }

  private agregarDirectoresSecuencial(idProyectoMatriz: number, directores: number[], done: () => void) {
    const lista = directores || [];
    const ejecutar = (index: number) => {
      if (index >= lista.length) {
        done();
        return;
      }
      const directorPM = new mDirectorProyectoMatriz(
        null, idProyectoMatriz, lista[index], true, null, null, this.usuario.idUsuario, null
      );
      this._sDirectorProyectoMatriz.postAddDirectorProyectoMatriz(directorPM)
        .success(() => ejecutar(index + 1))
        .error(() => ejecutar(index + 1));
    };
    ejecutar(0);
  }

  Eliminar() {
    const fila: any = this.ProyectosMatriz[this.IndexEliminar];
    if (!fila || this.Loading) { return; }
    const idProyectoMatriz = fila.idProyectoMatriz;

    this.texto = "";
    this.msg = false;
    this.Loading = true;

    // Se elimina con el proyecto matriz tal como está guardado (no con lo escrito en el formulario de creación)
    this._sProyectoMatriz.getProyectoMatrizbyID(idProyectoMatriz).subscribe(guardado => {
      const aEliminar: any = guardado || this.proyectoMatrizVacio();
      aEliminar.idProyectoMatriz = idProyectoMatriz;
      aEliminar.idUsuarioRemovedor = this.usuario.idUsuario;

      this._sProyectoMatriz.postUpdDelProyectoMatriz(aEliminar).success(() => {
        this._PopUps.OcultarConfirmacion();
        this._sDirectorProyectoMatriz.getDirectorProyectoMatrizbyidProyectoMatriz(idProyectoMatriz).subscribe(directores => {
          this.desactivarDirectoresSecuencial(directores || [], () => this.Recarga());
        }, () => this.Recarga());
        this.Loading = false;
        this.texto = "Proyecto Matriz eliminado de forma correcta";
        this.msg = true;
      }).error(error => {
        console.log(error);
        this.Loading = false;
        this.avisar('error', 'Error', 'No se pudo eliminar el proyecto matriz.');
      });
    }, error => {
      console.log(error);
      this.Loading = false;
    });
  }

  // *************************************************** PopUP ***************************************************

  private guardarBorrador() {
    this.borrador = {
      proyectoMatriz: Object.assign({}, this.ProyectoMatriz),
      directoresList: this.directoresList.slice(),
      intentoCrear: this.intentoCrear
    };
  }

  private restaurarBorrador() {
    const b = this.borrador;
    if (!b) { return; }
    this.borrador = null;
    this.ProyectoMatriz = Object.assign(this.proyectoMatrizVacio(), b.proyectoMatriz);
    this.directoresList = b.directoresList;
    this.intentoCrear = b.intentoCrear;
  }

  Editar(p: mVis_ProyectoMatriz) {
    if (this.editando || this.Loading) { return; }
    const i = this.indiceReal(p);
    if (i < 0) { return; }
    const idProyectoMatriz = this.ProyectosMatriz[i].idProyectoMatriz;
    this.IndexUpdate = i;
    this.Loading = true;

    this._sProyectoMatriz.getProyectoMatrizbyID(idProyectoMatriz).subscribe(result => {
      if (!result) { this.Loading = false; return; }

      this._sDirectorProyectoMatriz.getDirectorProyectoMatrizbyidProyectoMatriz(idProyectoMatriz).subscribe(directores => {
        this.guardarBorrador();
        this.editando = true;
        this.intentoEditar = false;

        this.ProyectoMatriz = result;
        if (!(this.ProyectoMatriz as any).idUsuarioSubGerente) { (this.ProyectoMatriz as any).idUsuarioSubGerente = 0; }
        const ids = (directores || []).map(d => d.idUsuarioDirector).filter(id => !!id);
        this.directoresList = ids.length ? ids : [0];

        this.Loading = false;
        this._PopUps.VerPopUpEditar();
      }, error => { console.log(error); this.errorAlAbrir(); });
    }, error => { console.log(error); this.errorAlAbrir(); });
  }

  private errorAlAbrir() {
    this.Loading = false;
    this.cerrarEdicion();
    this.avisar('error', 'Error', 'No se pudo cargar el proyecto matriz para editar.');
  }

  private cerrarEdicion() {
    if (!this.editando) { return; }
    this.editando = false;
    this.intentoEditar = false;
    this.IndexUpdate = 0;
    this.restaurarBorrador();
  }

  OcultarPopUpEditar() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this._PopUps.OcultarPopUpEditar();
    this.cerrarEdicion();
  }

  Confirmacion(p: mVis_ProyectoMatriz) {
    this.IndexEliminar = this.indiceReal(p);
    this._PopUps.Confirmacion();
  }

  get nombreAEliminar(): string {
    const fila: any = this.ProyectosMatriz && this.ProyectosMatriz[this.IndexEliminar];
    return fila ? fila.nombreProyectoMatriz : '';
  }

  OcultarConfirmacion() {
    this._PopUps.OcultarConfirmacion();
  }
}