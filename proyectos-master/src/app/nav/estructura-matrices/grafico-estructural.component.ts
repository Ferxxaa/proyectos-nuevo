import { Component, OnInit } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Router } from '@angular/router';
import { sSubProyecto } from '../../services/sSubProyecto.service';
import { sVis_ProyectoMatriz } from '../../services/sVis_ProyectoMatriz.service';
import { sVis_Proyectos } from '../../services/sVis_Proyectos.service';
import { sVis_SubProyecto } from '../../services/sVis_SubProyecto.service';

@Component({
  selector: 'app-grafico-estructural',
  templateUrl: './grafico-estructural.component.html',
  styleUrls: ['./grafico-estructural.component.css'],
  providers: [sVis_ProyectoMatriz, sVis_Proyectos, sVis_SubProyecto, sSubProyecto]
})
export class GraficoEstructuralComponent implements OnInit {

  matrices: any[] = [];
  proyectos: any[] = [];
  subProyectos: any[] = [];

  matrizSeleccionada: any = null;
  idMatrizFiltro: number = 0;

  cargando: boolean = false;
  error: string = '';

  constructor(
    private _sMatriz: sVis_ProyectoMatriz,
    private _sProyectos: sVis_Proyectos,
    private _sSubProyectos: sVis_SubProyecto,
    private _sSubProyecto: sSubProyecto,
    private router: Router
  ) {}

  ngOnInit() {
    this._sMatriz.getVis_ProyectoMatriz().subscribe(
      data => {
        this.matrices = data;
      },
      err => {
        this.error = 'Error al cargar las matrices.';
      }
    );
  }

  onMatrizChange(idMatriz: number) {
    this.idMatrizFiltro = Number(idMatriz);
    if (!this.idMatrizFiltro) {
      this.matrizSeleccionada = null;
      this.proyectos = [];
      this.subProyectos = [];
      return;
    }

    this.cargando = true;
    this.error = '';
    this.proyectos = [];
    this.subProyectos = [];
    this.matrizSeleccionada = this.matrices.find(m => m.idProyectoMatriz === this.idMatrizFiltro) || null;

    this._sProyectos.getVis_ProyectosbyidProyectoMatriz(this.idMatrizFiltro).subscribe(
      dataProyectos => {
        this.proyectos = dataProyectos;

        if (this.matrizSeleccionada && this.matrizSeleccionada.nombreProyectoMatriz) {
          this._sSubProyectos.getVis_SubProyectobynombreProyectoMatriz(
            this.matrizSeleccionada.nombreProyectoMatriz
          ).subscribe(
            dataSub => {
              this.subProyectos = dataSub;
              this.cargando = false;
            },
            err => {
              this.subProyectos = [];
              this.cargando = false;
            }
          );
        } else {
          this.cargando = false;
        }
      },
      err => {
        this.error = 'Error al cargar los proyectos de la matriz.';
        this.cargando = false;
      }
    );
  }

  getSubProyectosByProyecto(idProyecto: number): any[] {
    return this.subProyectos
      .filter(sp => sp.idProyecto === idProyecto)
      .sort((subProyectoA, subProyectoB) => {
        const prioridadA = this.getSubProyectoSortPriority(subProyectoA);
        const prioridadB = this.getSubProyectoSortPriority(subProyectoB);

        if (prioridadA !== prioridadB) {
          return prioridadA - prioridadB;
        }

        const nombreA = (subProyectoA.nombreSubProyecto || '').toString().toLowerCase();
        const nombreB = (subProyectoB.nombreSubProyecto || '').toString().toLowerCase();
        return nombreA.localeCompare(nombreB);
      });
  }

  isSubProyectoActivo(subProyecto: any): boolean {
    const estadoNormalizado = this.getEstadoNormalizado(subProyecto);

    if (estadoNormalizado) {
      return estadoNormalizado === 'activo';
    }

    return subProyecto && (subProyecto.activo === true || subProyecto.activo === 'true' || subProyecto.activo === 1);
  }

  isSubProyectoCerradoOFinalizado(subProyecto: any): boolean {
    const estadoNormalizado = this.getEstadoNormalizado(subProyecto);
    return estadoNormalizado.includes('cerrad') || estadoNormalizado.includes('finaliz');
  }

  private getSubProyectoSortPriority(subProyecto: any): number {
    if (this.isSubProyectoActivo(subProyecto)) {
      return 0;
    }

    if (this.isSubProyectoCerradoOFinalizado(subProyecto)) {
      return 2;
    }

    return 1;
  }

  private getEstadoNormalizado(subProyecto: any): string {
    return ((subProyecto && subProyecto.nombreEstadoProyecto) || '')
      .toString()
      .trim()
      .toLowerCase();
  }

  irATableroControl(subProyecto: any, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }

    if (!subProyecto || !subProyecto.idSubProyecto) {
      return;
    }

    this._sSubProyecto.getSubProyectobyID(subProyecto.idSubProyecto).subscribe(
      result => {
        localStorage.setItem('SubProyecto', JSON.stringify(result));
        this.router.navigate([`/Tablero-Control/${subProyecto.idSubProyecto}`]);
      },
      err => {
        this.error = 'Error al abrir el tablero de control del subproyecto.';
      }
    );
  }

  selectedNombre: string = '';

  toggleNombre(nombre: string, event: MouseEvent) {
    event.stopPropagation();
    this.selectedNombre = this.selectedNombre === nombre ? '' : nombre;
  }

  cerrarNombre() {
    this.selectedNombre = '';
  }
}
