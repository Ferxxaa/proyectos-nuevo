import { Http, Response } from '@angular/http';
import { Router } from '@angular/router';
import { Component, OnInit } from '../../../../node_modules/@angular/core';

@Component({
  selector: 'app-home-adn',
  templateUrl: './home-adn.component.html',
  styleUrls: ['./home-adn.component.css']
})
export class HomeAdnComponent implements OnInit {

  Titulo: string;
  usuario: any = {};
  interno: boolean;

  urlBase: string = 'http://trazas-nbi.com:1234/api/'
  controlador: string = 'UsuariosPerfiles/'
  urlFull: string = this.urlBase + this.controlador

  constructor(
    private _http: Http, private router: Router
  ) {
    this.Titulo = "";
    this.interno = false;
  }

  ngOnInit() {
    this.getUser()
  }

  getUser() {
    if (!localStorage.hasOwnProperty('usuario')) {
      console.log("usuario no logueado");
    } else {
      try {
        this.usuario = JSON.parse(localStorage.usuario);
        this._http.get(this.urlFull + 'GetUsuariosPerfilesByIdUsuario/IdUsuario=' + this.usuario.idUsuario)
          .map((res: Response) => res.json())
          .subscribe(data => {
            data.forEach(element => {
              if (element.idPerfil == 1 || element.idPerfil == 2 || element.idPerfil == 3 || element.idPerfil == 4 ||
                element.idPerfil == 7 || element.idPerfil == 8 || element.idPerfil == 9 || element.idPerfil == 10 || element.idPerfil == 11) {
                this.interno = true;
                return true
              }
              else
                this.interno = false;
            });
            console.log("Soy un usuario interno: ", this.interno);
          })
      }
      catch (err) {
        console.log(err.message);
      }
    }
  }

}
