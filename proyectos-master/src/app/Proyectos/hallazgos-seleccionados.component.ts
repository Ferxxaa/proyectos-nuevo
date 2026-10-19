import { Component, OnInit } from '@angular/core';
import { mSubProyecto } from '../models/mSubProyecto';
import { sSubProyecto } from '../services/sSubProyecto.service';
import { sProyecto } from '../services/sProyecto.service';

interface HallazgosSeleccionados {
  subProyecto: mSubProyecto;
  expandido: boolean;
}

interface GrupoHallazgosSeleccionados {
  idProyecto: number;
  nombreProyecto: string;
  subProyectos: HallazgosSeleccionados[];
  expandido: boolean;
}

@Component({
  selector: 'app-hallazgos-seleccionados',
  templateUrl: './hallazgos-seleccionados.component.html',
  styleUrls: ['./hallazgos-seleccionados.component.css'],
  providers: [sSubProyecto, sProyecto]
})
export class HallazgosSeleccionadosComponent implements OnInit {
  subProyectos: HallazgosSeleccionados[] = [];
  grupos: GrupoHallazgosSeleccionados[] = [];
  nombresProyectos: { [idProyecto: number]: string } = {};
  incluirHallazgosOperacionales: boolean = false;
  hallazgosOperacionalesExpandido: boolean = true;
  cargando: boolean = true;

  constructor(
    private _sSubProyecto: sSubProyecto,
    private _sProyecto: sProyecto
  ) {}

  ngOnInit() {
    this.cargarHallazgosSeleccionados();
  }

  private async cargarHallazgosSeleccionados() {
    const seleccion = JSON.parse(
      localStorage.getItem('subProyectosHallazgosSeleccionados') || '[]'
    ) as number[];
    this.incluirHallazgosOperacionales = JSON.parse(
      localStorage.getItem('incluirHallazgosOperacionales') || 'false'
    ) === true;

    try {
      const resultados = await Promise.all(seleccion.map(async idSubProyecto => {
        const subProyecto = await this._sSubProyecto.getSubProyectobyID(idSubProyecto).toPromise();
        return {
          subProyecto: subProyecto as mSubProyecto,
          expandido: false
        };
      }));

      this.subProyectos = resultados.filter(item => !!item.subProyecto);
      await this.cargarNombresProyectos();
      this.agruparHallazgos();
    } catch (error) {
      console.error('Error al cargar los controles de hallazgos seleccionados:', error);
    } finally {
      this.cargando = false;
    }
  }

  private async cargarNombresProyectos() {
    const idsProyecto = Array.from(new Set(
      this.subProyectos.map(item => item.subProyecto.idProyecto)
    ));
    const proyectos = await Promise.all(idsProyecto.map(idProyecto =>
      this._sProyecto.getProyectobyID(idProyecto).toPromise()
    ));

    proyectos.forEach(proyecto => {
      if (proyecto) {
        const idProyecto = Number(proyecto.idProyecto);
        this.nombresProyectos[idProyecto] = proyecto.nombreProyecto;
      }
    });
  }

  private agruparHallazgos() {
    const grupos: { [idProyecto: string]: GrupoHallazgosSeleccionados } = {};

    this.subProyectos.forEach(item => {
      const idProyecto = item.subProyecto.idProyecto;
      const clave = String(idProyecto);

      if (!grupos[clave]) {
        grupos[clave] = {
          idProyecto,
          nombreProyecto: this.nombresProyectos[idProyecto] || 'Proyecto sin nombre',
          subProyectos: [],
          expandido: true
        };
      }

      grupos[clave].subProyectos.push(item);
    });

    this.grupos = Object.keys(grupos).map(clave => grupos[clave]);
  }

  alternarGrupo(grupo: GrupoHallazgosSeleccionados) {
    grupo.expandido = !grupo.expandido;
  }

  alternarSubProyecto(item: HallazgosSeleccionados) {
    item.expandido = !item.expandido;
  }

  alternarHallazgosOperacionales() {
    this.hallazgosOperacionalesExpandido = !this.hallazgosOperacionalesExpandido;
  }

  guardarInclusionHallazgosOperacionales() {
    localStorage.setItem(
      'incluirHallazgosOperacionales',
      JSON.stringify(this.incluirHallazgosOperacionales)
    );
  }
}
