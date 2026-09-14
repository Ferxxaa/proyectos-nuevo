import { Component, Input, OnInit, SimpleChanges } from '@angular/core';

declare var $: any;

@Component({
  selector: 'app-permisos-finanzas',
  templateUrl: './permisos-finanzas.component.html',
  styleUrls: ['../permisos-proyectos/permisos-proyectos.component.css']
})
export class PermisosFinanzasComponent implements OnInit {

  @Input() perfil: number | string;

  administracion: any;
  jefeAdministracion: any;
  gerente: any;

  constructor() { }

  ngOnInit() {
    this.administracion = $('table tbody td:nth-child(3)');
    this.jefeAdministracion = $('table tbody td:nth-child(4)');
    this.gerente = $('table tbody td:nth-child(5)');
  }

  ngOnChanges(cambio: SimpleChanges) {
    if (!cambio.perfil.firstChange) {
      this.clearClass();
      switch (cambio.perfil.currentValue) {
        case '10':
          this.administracion.addClass('active');
          break;
        case '11':
          this.gerente.addClass('active');
          break;
        case '12':
          this.jefeAdministracion.addClass('active');
          break;
        default:
          break;
      }
    }
  }

  clearClass() {
    this.administracion.removeClass('active');
    this.jefeAdministracion.removeClass('active');
    this.gerente.removeClass('active');
  }

}
