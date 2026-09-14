import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { mEstadoTarea } from '../../../models/mEstadoTarea';
import { mVis_UsuariosCoordinadores } from '../../../models/mVis_UsuariosCoordinadores';
import { sEstadoTarea } from '../../../services/sEstadoTarea.service';
import { sVis_UsuariosCoordinadores } from '../../../services/sVis_UsuariosCoordinadores.service';

interface select {
  id: string;
  texto: string;
}

interface buscadorTareas {
  estado: string | number;
  prioridad: string | number;
  responsable: string | number;
}

@Component({
  selector: 'app-filtro-mis-tareas',
  templateUrl: './filtro-mis-tareas.component.html',
  styleUrls: ['./filtro-mis-tareas.component.css'],
  providers: [
    sEstadoTarea,
    sVis_UsuariosCoordinadores
  ]
})
export class FiltroMisTareasComponent implements OnInit {

  @Output() buscando = new EventEmitter();

  selectEstado: select;
  selectPrioridad: select;
  selectResponsable: select;
  estado$: Observable<mEstadoTarea[]>;
  prioridad: any[];
  responsable$: Observable<mVis_UsuariosCoordinadores[]>;

  buscar: buscadorTareas;

  constructor(
    private estadoTareas: sEstadoTarea,
    private _sVis_UsuariosCoordinadores: sVis_UsuariosCoordinadores
  ) {
    this.selectEstado = { id: "idEstadoTarea", texto: "nombreEstadoTarea" }
    this.selectPrioridad = { id: "id", texto: "nombre" }
    this.selectResponsable = { id: "idUsuario", texto: "fullname" }
    this.estado$ = this.estadoTareas.getEstadoTarea();
    this.prioridad = [
      { id: "Alta", nombre: "Alta" },
      { id: "Media", nombre: "Media" },
      { id: "Baja", nombre: "Baja" },
    ]
    // this.estado = [{ nombre: "Pendiente" }, { nombre: "En proceso" }]
    this.responsable$ = this._sVis_UsuariosCoordinadores.getVis_UsuariosCoordinadores();
    this.buscar = { estado: 0, prioridad: 0, responsable: 0 }
  }

  ngOnInit() {
  }

  actualizarBuscador(e, propiedad: string) {
    this.buscar[propiedad] = e;
    // emitir inmediatamente para que la tabla se actualice sin necesidad de presionar buscar
    try {
      this.buscando.emit(this.buscar);
    } catch (err) {
      console.warn('Error emitiendo buscador:', err);
    }
  }

  buscador() {
    // console.log("Buscando", this.buscar)
    this.buscando.emit(this.buscar);
  }

  limpiar() {
    this.buscar = { estado: 0, prioridad: 0, responsable: 0 } as any;
    this.buscando.emit(this.buscar);
  }

}
