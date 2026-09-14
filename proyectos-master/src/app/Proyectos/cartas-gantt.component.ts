import { Component, OnInit } from '@angular/core';
import { mDetalleSubProyecto } from '../models/mDetalleSubProyecto';
import { mSubProyecto } from '../models/mSubProyecto';
import { sDetalleSubProyecto } from '../services/sDetalleSubProyecto.service';
import { sSubProyecto } from '../services/sSubProyecto.service';
import { sProyecto } from '../services/sProyecto.service';

interface CartaGanttSeleccionada {
  subProyecto: mSubProyecto;
  detalleSeguimiento: mDetalleSubProyecto[];
  expandida: boolean;
}

interface GrupoCartasGantt {
  idProyecto: number;
  nombreProyecto: string;
  cartas: CartaGanttSeleccionada[];
  expandido: boolean;
}

@Component({
  selector: 'app-cartas-gantt',
  templateUrl: './cartas-gantt.component.html',
  styleUrls: ['./cartas-gantt.component.css'],
  providers: [sSubProyecto, sDetalleSubProyecto, sProyecto]
})
export class CartasGanttComponent implements OnInit {
  cartasGantt: CartaGanttSeleccionada[] = [];
  gruposCartasGantt: GrupoCartasGantt[] = [];
  cargando: boolean = true;
  indiceCartaArrastrada: number = -1;
  idGrupoArrastrado: number = -1;

  constructor(
    private _sSubProyecto: sSubProyecto,
    private _sDetalleSubProyecto: sDetalleSubProyecto,
    private _sProyecto: sProyecto
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

  nombresProyectos: { [idProyecto: number]: string } = {};

  private agruparCartas() {
    const grupos: { [idProyecto: string]: GrupoCartasGantt } = {};

    this.cartasGantt.forEach(carta => {
      const idProyecto = carta.subProyecto.idProyecto;
      const clave = String(idProyecto);

      if (!grupos[clave]) {
        grupos[clave] = {
          idProyecto,
          nombreProyecto: this.nombresProyectos[idProyecto] || 'Proyecto sin nombre',
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

  iniciarArrastre(grupo: GrupoCartasGantt, indice: number, event: DragEvent) {
    this.idGrupoArrastrado = grupo.idProyecto;
    this.indiceCartaArrastrada = indice;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(grupo.cartas[indice].subProyecto.idSubProyecto));
    }
  }

  permitirSoltar(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  soltarCarta(grupo: GrupoCartasGantt, indiceDestino: number, event: DragEvent) {
    event.preventDefault();

    if (this.idGrupoArrastrado !== grupo.idProyecto || this.indiceCartaArrastrada < 0) {
      this.limpiarArrastre();
      return;
    }

    const cartas = grupo.cartas;
    const carta = cartas.splice(this.indiceCartaArrastrada, 1)[0];
    const elementoDestino = event.currentTarget as HTMLElement;
    const rectanguloDestino = elementoDestino.getBoundingClientRect();
    const soltarDespues = event.clientY > rectanguloDestino.top + rectanguloDestino.height / 2;
    let nuevoIndice = indiceDestino + (soltarDespues ? 1 : 0);

    if (this.indiceCartaArrastrada < nuevoIndice) {
      nuevoIndice--;
    }

    cartas.splice(nuevoIndice, 0, carta);
    this.cartasGantt = this.gruposCartasGantt.reduce((resultado, grupoActual) => resultado.concat(grupoActual.cartas), []);
    localStorage.setItem('subProyectosGanttSeleccionados', JSON.stringify(
      this.cartasGantt.map(cartaActual => cartaActual.subProyecto.idSubProyecto)
    ));
    this.limpiarArrastre();
  }

  terminarArrastre() {
    this.limpiarArrastre();
  }

  private limpiarArrastre() {
    this.indiceCartaArrastrada = -1;
    this.idGrupoArrastrado = -1;
  }
}