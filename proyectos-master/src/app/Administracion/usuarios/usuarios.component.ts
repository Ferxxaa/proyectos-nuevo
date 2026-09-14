import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { Md5 } from 'ts-md5/dist/md5';

declare var $: any;
declare var Swal: any;

const md5 = new Md5();

//Model
import { mUsuario } from '../../models/mUsuario';
import { mPersona } from '../../models/mPersona';
import { mEstadoCivil } from '../../models/mEstadoCivil';

//Servicios
import { sUsuario } from '../../services/sUsuario.service';
import { sPersona } from '../../services/sPersona.service';
import { sEstadoCivil } from '../../services/sEstadoCivil.service';
import { Form } from '@angular/forms';
import { sMail } from '../../services/sMail.service';
import { mMail } from '../../models/mMail';
import { ListUsersComponent } from '../components/list-users/list-users.component';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
  providers: [
    sUsuario,
    sPersona,
    sEstadoCivil,
    sMail
  ]
})
export class UsuariosComponent implements OnInit, AfterViewInit, OnDestroy {



  //Objetos
  Usuario: mUsuario;
  Persona: mPersona;
  usuario: any;
  email: mMail;

  //Select
  EstadosCiviles: Array<mEstadoCivil>;

  @ViewChild(ListUsersComponent) listUser: ListUsersComponent;

  constructor(
    private _sUsuario: sUsuario,
    private _sPersona: sPersona,
    private _sEstadoCivil: sEstadoCivil,
    private smail: sMail
  ) {
    this.email = { activo: true, direccionMail: '', idPersona: null, idTipoMail: 1, idUsuarioCreador: 1, fechaRemocion: null, fechaCreacion: null, idMail: null, idUsuarioRemovedor: null }
    this.usuario = JSON.parse(localStorage.usuario);
    this.Usuario = new mUsuario(null, null, '', '', '', true, '', this.usuario.idUsuario, null);
    this.Persona = new mPersona(null, '', '', '', '', '', '', 0, true, '', true, '', this.usuario.idUsuario, null);
    this._sEstadoCivil.getEstadoCivil().subscribe(result => {
      //console.log(result);
      this.EstadosCiviles = result;
    });
  }

  ngOnInit() {
    $(".date").datetimepicker(
      {
        format: 'DD/MM/YYYY'
      }
    );
  }

  ngAfterViewInit() {
    $('#sidebar').addClass('administracion');
  }

  asignaFechaNacimiento() {
    let dia = $("#txtTermino").val().split("/")[0];
    let mes = $("#txtTermino").val().split("/")[1];
    let agno = $("#txtTermino").val().split("/")[2];
    this.Persona.fechaNacimiento = agno + "-" + mes + "-" + dia + "T00:00:00";;
  }

  Encriptar() {
    this.Usuario.contraseniaUsuario = md5.appendStr(this.Usuario.contraseniaUsuario).end().toString();
  }

  Agregar(CForm: Form) {
    this._sPersona.postAddPersona(this.Persona).success(result => {
      //console.log(result);
      this.Usuario.idPersona = result.idPersona;
      this.Encriptar()
      this._sUsuario.postAddUsuario(this.Usuario).success(usuarioAdd => {
        this.email.idPersona = usuarioAdd.idPersona
        this.smail.postAddMail(this.email).then(res => {
          this.Persona = new mPersona(null, '', '', '', '', '', '', 0, true, '', true, '', this.usuario.idUsuario, null);
          this.Usuario = new mUsuario(null, null, '', '', '', true, '', this.usuario.idUsuario, null);
          this.email = { activo: true, direccionMail: '', idPersona: null, idTipoMail: 1, idUsuarioCreador: 1, fechaRemocion: null, fechaCreacion: null, idMail: null, idUsuarioRemovedor: null }
          Swal.fire({
            icon: 'success',
            title: 'Usuario creado de forma exitosa',
          });
          $("#txtNacimiento").val("");
          this.listUser.start();
        })
      });
    });
  }

  ngOnDestroy() {
    $('#sidebar').removeClass('administracion');
  }

}
