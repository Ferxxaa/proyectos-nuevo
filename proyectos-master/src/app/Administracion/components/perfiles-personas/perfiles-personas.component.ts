import { Component, OnInit, OnDestroy, NgZone, HostListener } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as firebase from 'firebase/app';
import 'firebase/firestore';
import { mPerfil } from '../../../models/mPerfil';
import { mUsuario } from '../../../models/mUsuario';
import { mUsuariosPerfiles } from '../../../models/mUsuariosPerfiles';
import { sPerfil } from '../../../services/sPerfil.service';
import { sUsuario } from '../../../services/sUsuario.service';
import { sUsuariosPerfiles } from '../../../services/sUsuariosPerfiles.service';
import { COLECCION_PERFILES_EXTRA } from '../../../CORE/perfil-administracion';

@Component({
  selector: 'app-perfiles-personas',
  templateUrl: './perfiles-personas.component.html',
  styleUrls: ['./perfiles-personas.component.css'],
  providers: [
    sPerfil,
    sUsuario,
    sUsuariosPerfiles
  ]
})
export class PerfilesPersonasComponent implements OnInit, OnDestroy {

  perfiles$: Observable<mPerfil[]>
  usuarios$: Observable<mUsuario[]>
  usuariosPerfiles: mUsuariosPerfiles[]

  // ===== Perfil Administración CORE (Firestore: perfilesExtra/{idUsuario}) =====
  adminCore: { [idUsuario: string]: boolean } = {};
  cargandoAdminCore: boolean = true;
  errorAdminCore: string = '';
  guardandoAdminCore: { [idUsuario: string]: boolean } = {};
  private unsubAdminCore: any = null;

  /** Popup de confirmación (dar / quitar Administración CORE). */
  confirmUser: mUsuario = null;
  confirmDar: boolean = true;

  constructor(
    private perfiles: sPerfil,
    private usuarios: sUsuario,
    private usuarioPerfil: sUsuariosPerfiles,
    private zone: NgZone
  ) {
    this.setDefaultValue();
  }

  ngOnInit() {
    this.unsubAdminCore = (firebase as any).firestore().collection(COLECCION_PERFILES_EXTRA).onSnapshot((snap: any) => {
      this.zone.run(() => {
        const mapa: { [id: string]: boolean } = {};
        snap.forEach((doc: any) => {
          const d = doc.data() || {};
          mapa[doc.id] = d.administracion === true;
        });
        this.adminCore = mapa;
        this.cargandoAdminCore = false;
        this.errorAdminCore = '';
      });
    }, (error: any) => {
      this.zone.run(() => {
        console.error('No se pudo leer perfilesExtra:', error);
        this.cargandoAdminCore = false;
        this.errorAdminCore = 'No se pudo leer el perfil Administración CORE (¿está perfilesExtra en las reglas de Firestore?).';
      });
    });
  }

  ngOnDestroy() {
    if (this.unsubAdminCore) { this.unsubAdminCore(); }
  }

  setDefaultValue() {
    this.perfiles$ = this.perfiles.getPerfil();
    this.usuarios$ = this.usuarios.getUsuario();
    this.usuarioPerfil.getUsuariosPerfiles().subscribe(el => {
      this.usuariosPerfiles = el;
    })
  }

  userContaintsPerfil({ idUsuario }: mUsuario, { idPerfil }: mPerfil): boolean {
    return this.usuariosPerfiles.filter(userPerfil => userPerfil.idUsuario == idUsuario && userPerfil.idPerfil == idPerfil && userPerfil.activo).length > 0
  }

  addPerfil({ idUsuario }: mUsuario, { idPerfil }: mPerfil) {
    let usuarioPerfil = { idUsuarioPerfil: null, idUsuario: idUsuario, idPerfil: idPerfil, fechaCreacion: null, activo: true, idUsuarioCreador: 1, idUsuarioRemovedor: null, fechaRemocion: null }
    this.usuarioPerfil.postAddUsuariosPerfiles(usuarioPerfil).success(res => {
      this.setDefaultValue();
    })
  }

  eliminarPerfil({ idUsuario }: mUsuario, { idPerfil }: mPerfil) {
    let usuarioPerfil = this.usuariosPerfiles.find(userPerfil => userPerfil.idUsuario == idUsuario && userPerfil.idPerfil == idPerfil && userPerfil.activo)
    usuarioPerfil.idUsuarioRemovedor = 1;
    this.usuarioPerfil.postUpdDelUsuariosPerfiles(usuarioPerfil).success(del => {
      this.setDefaultValue();
    });
  }

  // ===================== Administración CORE =====================

  esAdminCore(user: mUsuario): boolean {
    return !!(user && this.adminCore[String(user.idUsuario)]);
  }

  /** Clic en el check: abre el popup de confirmación. */
  toggleAdminCore(user: mUsuario) {
    if (!user || this.cargandoAdminCore) { return; }
    if (this.guardandoAdminCore[String(user.idUsuario)]) { return; }
    this.confirmUser = user;
    this.confirmDar = !this.esAdminCore(user);
  }

  cancelarConfirm() {
    this.confirmUser = null;
  }

  clickFondoConfirm(evento: MouseEvent) {
    if (evento.target === evento.currentTarget) { this.cancelarConfirm(); }
  }

  @HostListener('document:keydown.escape')
  escapeConfirm() {
    if (this.confirmUser) { this.cancelarConfirm(); }
  }

  aceptarConfirm() {
    const user = this.confirmUser;
    const nuevo = this.confirmDar;
    this.confirmUser = null;
    if (user) { this.guardarAdminCore(user, nuevo); }
  }

  private guardarAdminCore(user: mUsuario, nuevo: boolean) {
    const id = String(user.idUsuario);

    let quien = '';
    try { quien = (JSON.parse(localStorage.getItem('usuario') || '{}') || {}).nombreUsuario || ''; } catch (e) { quien = ''; }

    this.guardandoAdminCore[id] = true;
    this.errorAdminCore = '';
    (firebase as any).firestore().collection(COLECCION_PERFILES_EXTRA).doc(id).set({
      administracion: nuevo,
      nombre: user.nombreUsuario || '',
      actualizado: new Date().toISOString(),
      actualizadoPor: quien
    }, { merge: true })
      .then(() => this.zone.run(() => {
        this.adminCore = Object.assign({}, this.adminCore, { [id]: nuevo });
        delete this.guardandoAdminCore[id];
      }))
      .catch((error: any) => this.zone.run(() => {
        console.error('No se pudo guardar Administración CORE:', error);
        delete this.guardandoAdminCore[id];
        this.errorAdminCore = 'No se pudo guardar. Revisa que perfilesExtra tenga "allow write" en las reglas de Firestore.';
      }));
  }

}