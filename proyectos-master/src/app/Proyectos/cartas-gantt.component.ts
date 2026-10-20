import { Component, OnInit } from '@angular/core';
import { mDetalleSubProyecto } from '../models/mDetalleSubProyecto';
import { mSubProyecto } from '../models/mSubProyecto';
import { sDetalleSubProyecto } from '../services/sDetalleSubProyecto.service';
import { sSubProyecto } from '../services/sSubProyecto.service';
import { sVis_Proyectos } from '../services/sVis_Proyectos.service';

interface CartaGanttSeleccionada {
  subProyecto: mSubProyecto;
  detalleSeguimiento: mDetalleSubProyecto[];
  expandida: boolean;
}

interface GrupoCartasGantt {
  idProyecto: number;
  nombreProyecto: string;
  nombreMandante: string;
  cartas: CartaGanttSeleccionada[];
  expandido: boolean;
}

@Component({
  selector: 'app-cartas-gantt',
  templateUrl: './cartas-gantt.component.html',
  styleUrls: ['./cartas-gantt.component.css'],
  providers: [sSubProyecto, sDetalleSubProyecto, sVis_Proyectos]
})
export class CartasGanttComponent implements OnInit {
  cartasGantt: CartaGanttSeleccionada[] = [];
  gruposCartasGantt: GrupoCartasGantt[] = [];
  nombresProyectos: { [idProyecto: number]: string } = {};
  nombresMandantes: { [idProyecto: number]: string } = {};
  cargando: boolean = true;

  constructor(
    private _sSubProyecto: sSubProyecto,
    private _sDetalleSubProyecto: sDetalleSubProyecto,
    private _sVisProyectos: sVis_Proyectos
  ) {}

  ngOnInit() {
    this.cargarCartasGantt();
  }

  private async cargarCartasGantt() {
    const seleccion = JSON.parse(localStorage.getItem('subProyectosGanttSeleccionados') || '[]') as number[];

    try {
      this.cartasGantt = await Promise.all(seleccion.map(async idSubProyecto => {
        const subProyecto = await this._sSubProyecto.getSubProyectobyID(idSubProyecto).toPromise();
        const detalleSeguimiento = await this._sDetalleSubProyecto
          .getDetalleSubProyectobyidSubProyecto(idSubProyecto)
          .toPromise();

        return {
          subProyecto: subProyecto as mSubProyecto,
          detalleSeguimiento: (detalleSeguimiento || []) as mDetalleSubProyecto[],
          expandida: false
        };
      }));
      await this.cargarNombresProyectos();
      this.agruparCartas();
    } catch (error) {
      console.error('Error al cargar las cartas Gantt seleccionadas:', error);
    } finally {
      this.cargando = false;
    }
  }

  private async cargarNombresProyectos() {
    const idsProyecto = Array.from(new Set(this.cartasGantt.map(carta => carta.subProyecto.idProyecto)));
    const proyectosVista = await Promise.all(idsProyecto.map(idProyecto =>
      this._sVisProyectos.getVis_ProyectosbyidProyecto(idProyecto).toPromise()
    ));

    proyectosVista.forEach((resultados, index) => {
      const proyecto = (resultados || [])[0];
      if (proyecto) {
        const idProyecto = Number(proyecto.idProyecto) || Number(idsProyecto[index]);
        this.nombresProyectos[idProyecto] = proyecto.nombreProyecto || '';
        this.nombresMandantes[idProyecto] = proyecto.nombreProyectoMatriz || '';
      }
    });
  }

  private agruparCartas() {
    const grupos: { [idProyecto: string]: GrupoCartasGantt } = {};

    this.cartasGantt.forEach(carta => {
      const idProyecto = carta.subProyecto.idProyecto;
      const clave = String(idProyecto);

      if (!grupos[clave]) {
        grupos[clave] = {
          idProyecto,
          nombreProyecto: this.nombresProyectos[idProyecto] || 'Proyecto sin nombre',
          nombreMandante: this.nombresMandantes[idProyecto] || '',
          cartas: [],
          expandido: true
        };
      }

      grupos[clave].cartas.push(carta);
    });

    this.gruposCartasGantt = Object.keys(grupos).map(clave => grupos[clave]);
  }

  alternarGrupo(grupo: GrupoCartasGantt) {
    grupo.expandido = !grupo.expandido;
  }

  alternarCarta(carta: CartaGanttSeleccionada) {
    carta.expandida = !carta.expandida;
  }
}