import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';

import { sUsuario } from '../../services/sUsuario.service';
import { mUsuario } from '../../models/mUsuario';
import { mPerfil } from '../../models/mPerfil';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { mUsuariosPerfiles } from '../../models/mUsuariosPerfiles';
import { sPerfil } from '../../services/sPerfil.service';
import { PopUpContentComponent } from '../../share/components/pop-up-content/pop-up-content.component';

declare var $: any;

@Component({
  selector: 'app-perfiles',
  templateUrl: './perfiles.component.html',
  styleUrls: ['./perfiles.component.css'],
  providers: [
    sUsuario,
    sPerfil,
    sUsuariosPerfiles
  ]
})
export class PerfilesComponent implements OnInit, AfterViewInit, OnDestroy {

  usuarios: Array<mUsuario>;

  Perfiles: Array<mPerfil>;
  perfil: mPerfil;

  categoria: string | number;

  usuarioPerfiles: Array<mUsuariosPerfiles>;
  usuarioPerfil: mUsuariosPerfiles;

  @ViewChild(PopUpContentComponent) popup: PopUpContentComponent

  constructor(
    private _sUsuario: sUsuario,
    private _sPerfil: sPerfil,
    private _sUsuarioPerfil: sUsuariosPerfiles
  ) {
    // this.perfil={idPerfil:null,descripconPerfil:null,nombrePerfil:null,activo:true,fechaCreacion:null,fechaRemocion:null,idUsuarioCreador:null,idUsuarioRemovedor:null}
    this.limpiar();
  }

  ngOnInit() {
    this._sUsuario.getUsuario().subscribe(res => {
      this.usuarios = res;
    });
    this._sPerfil.getPerfil().subscribe(perfiles => {
      this.Perfiles = perfiles;
      // console.log(perfiles);

    });
  }

  ngAfterViewInit() {
    $('#sidebar').addClass('administracion');
  }

  limpiar() {
    this.categoria = "0";
    this.usuarioPerfil = { idUsuarioPerfil: null, idUsuario: 0, idPerfil: 0, fechaCreacion: null, activo: true, idUsuarioCreador: 1, idUsuarioRemovedor: null, fechaRemocion: null }
    this.usuarios = [];
    this.Perfiles = [];
    this.usuarioPerfiles = [];
  }

  /************************** CRUD ******************************/

  cargaPerfiles() {
    let perfiles = [];
    this.usuarioPerfiles = [];
    this._sUsuarioPerfil.getUsuariosPerfilesbyidUsuario(this.usuarioPerfil.idUsuario).subscribe(res => {
      // this.usuarioPerfiles = res;
      res.forEach(element => {
        this._sPerfil.getPerfilbyID(element.idPerfil).subscribe(perfil => {
          perfil.usuarioPerfil = element.idUsuarioPerfil;
          // this.usuarioPerfiles.push(perfil);
          perfiles.push(perfil)
          if (perfiles.length == res.length)
            this.usuarioPerfiles = perfiles;
        });
      });
    });
  }

  AgregaUsuarioPerfil() {
    this._sUsuarioPerfil.postAddUsuariosPerfiles(this.usuarioPerfil).success(res => {
      this.cargaPerfiles();
    })
  }

  eliminarPerfil(idUsuarioPerfil) {
    console.log(idUsuarioPerfil);
    this._sUsuarioPerfil.getUsuariosPerfilesbyID(idUsuarioPerfil).subscribe(res => {
      res.idUsuarioRemovedor = 1;
      // console.log(res);
      this._sUsuarioPerfil.postUpdDelUsuariosPerfiles(res).success(del => {
        this.cargaPerfiles();
      });
    })
  }

  ngOnDestroy() {
    $('#sidebar').removeClass('administracion');
  }

}
