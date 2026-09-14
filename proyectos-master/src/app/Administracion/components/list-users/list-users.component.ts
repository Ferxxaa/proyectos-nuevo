import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Observable } from 'rxjs/Observable';
import { Md5 } from 'ts-md5/dist/md5';
import { mMail } from '../../../models/mMail';
import { sMail } from '../../../services/sMail.service';
import { sPersona } from '../../../services/sPersona.service';
import { sUsuario } from '../../../services/sUsuario.service';
import { PopUpContentComponent } from '../../../share/components/pop-up-content/pop-up-content.component';

declare var Swal: any;

@Component({
  selector: 'app-list-users',
  templateUrl: './list-users.component.html',
  styleUrls: ['./list-users.component.css'],
  providers: [
    sMail
  ]
})
export class ListUsersComponent implements OnInit {

  usuarios$: Observable<any>;
  personas$: Observable<any>[];

  editUser;
  password = new FormControl('',
    [
      Validators.required,
      Validators.minLength(5)
    ]
  );
  editEmail: mMail | null;
  emailControll = new FormControl('',
    [
      Validators.required,
      Validators.minLength(5)
    ]
  );

  @ViewChild('passwd') popUp: PopUpContentComponent;
  @ViewChild('email') popUpEmail: PopUpContentComponent;

  constructor(
    private _sUsuario: sUsuario,
    public _sPersona: sPersona,
    private emailPersona: sMail
  ) {
    this.editEmail = null;
    this.editUser = null;
    this.usuarios$ = this._sUsuario.getUsuariobyactivo(true);
    this.personas$ = [];
  }

  start(){
    this.editEmail = null;
    this.editUser = null;
    this.usuarios$ = this._sUsuario.getUsuariobyactivo(true);
    this.personas$ = [];
    this.usuarios$.subscribe(res => {
      res.forEach(usuario => {
        let obs = this._sPersona.getPersonabyID(usuario.idPersona)
        this.personas$.push(obs)
      });
    });
  }

  ngOnInit() {
    this.usuarios$ = this._sUsuario.getUsuariobyactivo(true);
    this.usuarios$.subscribe(res => {
      res.forEach(usuario => {
        let obs = this._sPersona.getPersonabyID(usuario.idPersona)
        this.personas$.push(obs)
      });
    });
  }

  confirmDelete(user) {
    Swal.fire({
      title: 'Eliminar Usuario',
      text: "¿Esta seguro de eliminar el usuario " + user.nombreUsuario + "?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Eliminar'
    }).then((result) => {
      if (result.value) {
        this.deleteUser(user)
      }
    })
  }

  deleteUser(user) {
    console.log(user);

    user.idUsuarioRemovedor = 1
    this._sUsuario.postUpdDelUsuario(user).success(del => {
      this.ngOnInit();
    });
  }

  addEmail(user) {
    this.editEmail = null;
    this.emailControll.setValue('')
    this.popUpEmail.show();
    this.emailPersona.getMailbyidPersona(user.idPersona).subscribe(res => {
      if (res.length) {
        this.emailControll.setValue(res[0].direccionMail);
        this.editEmail = res[0];
      }
    })
    this.editUser = user;
  }

  editPass(user) {
    this.popUp.show();
    this.editUser = user;
  }

  editUserEmail() {
    // console.log(this.editUser);
    if (this.editEmail) {
      this.editEmail.direccionMail = this.emailControll.value;
      this.emailPersona.postUpdDelMail(this.editEmail).then(res => {
        Swal.fire({
          icon: 'success',
          title: 'Email actualizado de forma exitosa',
        });
        this.closePopup();
      })
    } else {
      let emailPersona: mMail = { activo: true, direccionMail: this.emailControll.value, idPersona: this.editUser.idPersona, idTipoMail: 1, idUsuarioCreador: 1, fechaRemocion: null, fechaCreacion: null, idMail: null, idUsuarioRemovedor: null }
      this.emailPersona.postAddMail(emailPersona).then(res =>{
        Swal.fire({
          icon: 'success',
          title: 'Email agregado de forma exitosa',
        });
        this.closePopup();
      })
    }
  }

  changePassword() {
    this.editUser.contraseniaUsuario = Md5.hashStr(this.password.value);
    this._sUsuario.postUpdDelUsuario(this.editUser).then(res => {
      Swal.fire({
        icon: 'success',
        title: 'Contraseña actualizada de forma exitosa',
      })
      this.closePopup();
    });
  }

  closePopup() {
    this.popUp.hide();
    this.popUpEmail.hide();
  }

}
