import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-select',
  template: `<select class="dropdown-toggle select2-chosen-2 form-control" [(ngModel)]="model" name="select" (change)="cambio()">
  <option value=0 selected>--- Seleccione una opcion ---</option>
  <option *ngFor="let elemento of listado" value={{elemento[id]}}>{{elemento[texto]}}</option>
</select>`,
  styleUrls: []
})
export class SelectComponent implements OnInit {

  @Input() listado: any[];
  @Input() id: string;
  @Input() texto: string;
  @Input() model: string | number;

  @Output() cambiar = new EventEmitter();

  constructor() {}

  ngOnInit() {}

  cambio() {
    this.cambiar.emit(this.model)
  }

}
