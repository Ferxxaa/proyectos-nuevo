import { Component, OnInit } from '@angular/core';
import { Http, Response, Headers } from '@angular/http';
import 'rxjs/add/operator/map'

import { Md5 } from 'ts-md5/dist/md5';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { MainComponent } from '../main/main.component';

declare var jQuery: any;
declare var $: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  title: string;
  holterUser: string;
  holterPass: string;
  usuario: any = {};
  login: any = {};
  error: boolean;
  msgError: string;
  status: boolean;

  master;

  //Loading
  Load: boolean;

  constructor(private _http: Http, private router: Router) {
    this.title = 'Login NBI';
    this.holterUser = 'Username'
    this.holterPass = 'Password'
    //this.getUsuarios();
    this.error = false
    this.msgError = ""
    this.status = true;
    this.Load = false;

    this.master = new MainComponent(this.router);
    if (this.master.header) {
      router.navigate(["/Home"]);
    }

  }

  Entrar(form: NgForm): void {
    this.Load = true;
    this.error = true;
    this._http.get('http://trazas-nbi.com:1234/api/Usuario/GetUsuarioBynombreUsuario/nombreusuario=' + form.value.txtuser)
      //return this._http.get('http://localhost:2188/api/usuario/')
      .map((res: Response) => res.json())
      .subscribe(usuario => {
        this.Load = false;
        this.usuario = usuario;
        // console.log(this.usuario);
        if (this.usuario[0] === undefined) {
          this.error = true;
          this.msgError = "Error de autenticación";
        }
        else {
          this.status = false;
          if (this.usuario && Md5.hashStr(form.value.txtpass) == this.usuario[0].contraseniaUsuario) {
            localStorage.setItem('usuario', JSON.stringify(this.usuario[0]));
            this.router.navigate(['/Home']);
          }
          else {
            this.error = true;
            this.msgError = "Error de autenticación";
          }
        }
      },
        err => {
          console.log("Error de login");
          this.Load = false;
        }
      )
      ;
  }

  ngOnInit() {
    this.status = false;
    $('#content').attr('class', 'content login fondo');
    $('body').attr('class', 'bg2');
  }

}

