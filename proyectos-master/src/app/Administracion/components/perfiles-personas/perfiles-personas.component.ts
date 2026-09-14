import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { mPerfil } from '../../../models/mPerfil';
import { mUsuario } from '../../../models/mUsuario';
import { mUsuariosPerfiles } from '../../../models/mUsuariosPerfiles';
import { sPerfil } from '../../../services/sPerfil.service';
import { sUsuario } from '../../../services/sUsuario.service';
import { sUsuariosPerfiles } from '../../../services/sUsuariosPerfiles.service';

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
export class PerfilesPersonasComponent implements OnInit {

  perfiles$: Observable<mPerfil[]>
  usuarios$: Observable<mUsuario[]>
  usuariosPerfiles: mUsuariosPerfiles[]

  constructor(
    private perfiles: sPerfil,
    private usuarios: sUsuario,
    private usuarioPerfil: sUsuariosPerfiles
  ) {
    this.setDefaultValue();
  }

  ngOnInit() {
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

}
