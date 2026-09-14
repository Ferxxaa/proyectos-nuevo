import { Component, Input, OnInit, SimpleChanges } from '@angular/core';

declare var $: any;

@Component({
  selector: 'app-permisos-licitaciones',
  templateUrl: './permisos-licitaciones.component.html',
  styleUrls: ['../permisos-proyectos/permisos-proyectos.component.css']
})
export class PermisosLicitacionesComponent implements OnInit {

  @Input() perfil: number | string;

  coordinador: any;
  director: any;

  constructor() { }

  ngOnInit() {
    this.coordinador = $('table tbody td:nth-child(2)');
    this.director = $('table tbody td:nth-child(3)');
  }

  ngOnChanges(cambio: SimpleChanges) {
    if (!cambio.perfil.firstChange) {
      this.clearClass()
      switch (cambio.perfil.currentValue) {
        case '7':
          this.director.addClass('active');
          break;
        case '8':
          this.coordinador.addClass('active');
          break;
        default:
          break;
      }
    }
  }

  clearClass() {
    this.coordinador.removeClass('active');
    this.director.removeClass('active');
  }

}
