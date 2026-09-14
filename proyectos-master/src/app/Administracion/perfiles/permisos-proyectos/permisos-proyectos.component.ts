import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

declare var $: any;

@Component({
  selector: 'app-permisos-proyectos',
  templateUrl: './permisos-proyectos.component.html',
  styleUrls: ['./permisos-proyectos.component.css']
})
export class PermisosProyectosComponent implements OnInit, OnChanges {

  @Input() perfil: number | string;

  clientes: any;
  sistema: any;
  coordinador: any;
  director: any;
  subGerent: any;

  constructor() { }

  ngOnInit() {
    this.clientes = $('table tbody td:nth-child(2)');
    this.sistema = $('table tbody td:nth-child(3)');
    this.coordinador = $('table tbody td:nth-child(4)');
    this.director = $('table tbody td:nth-child(5)');
    this.subGerent = $('table tbody td:nth-child(6)');
  }

  ngOnChanges(cambio: SimpleChanges) {
    if (!cambio.perfil.firstChange) {
      this.clearClass()
      switch (cambio.perfil.currentValue) {
        case '1':
          this.subGerent.addClass('active');
          break;
        case '2':
          this.director.addClass('active');
          break;
        case '3':
          this.coordinador.addClass('active');
          break;
        case '4':
          this.sistema.addClass('active');
          break;
        case '5':
          this.clientes.addClass('active');
          break;
        default:
          break;
      }
    }
  }

  clearClass() {
    this.clientes.removeClass('active');
    this.sistema.removeClass('active');
    this.coordinador.removeClass('active');
    this.director.removeClass('active');
    this.subGerent.removeClass('active');
  }

}
