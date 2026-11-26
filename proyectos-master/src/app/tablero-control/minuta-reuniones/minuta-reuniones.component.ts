import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

export type EstadoMinuta = 'EN CURSO' | 'PENDIENTE' | 'APROBADO' | 'CERRADO' | 'RECHAZADO';

export interface AsistenteMinuta {
  nombre: string;
  cargo: string;
  empresa: string;
  asistencia: string;
}

export interface ItemMinuta {
  alcance: string;
  comentario: string;
  responsable: string;
  fecha: string;
  compromiso: string;
  estado: EstadoMinuta;
}

export interface SeccionMinuta {
  titulo: string;
  items: ItemMinuta[];
}

export interface Minuta {
  numero: number;
  fecha: string;
  proyecto: string;
  mandante: string;
  contacto: string;
  direccion: string;
  codigo: string;
  asistentesMandante: AsistenteMinuta[];
  asistentesTrazas: AsistenteMinuta[];
  secciones: SeccionMinuta[];
}

@Component({
  selector: 'app-minuta-reuniones',
  templateUrl: './minuta-reuniones.component.html',
  styleUrls: ['./minuta-reuniones.component.css']
})
export class MinutaReunionesComponent implements OnChanges {
  @Input() idSubProyecto: number;
  @Input() nombreSubProyecto: string;
  @Input() minutas: Minuta[] = [];

  readonly estados: EstadoMinuta[] = ['EN CURSO', 'PENDIENTE', 'APROBADO', 'CERRADO', 'RECHAZADO'];
  readonly opcionesAsistencia: string[] = ['Presente', 'Remoto', 'Ausente'];
  readonly seccionesBase: string[] = [
    'Planificación y desarrollo',
    'Calidad',
    'Acreditaciones',
    'Contrataciones o subcontratos',
    'Puntos varios'
  ];

  minutaActual: Minuta = null;
  colapsadas: { [titulo: string]: boolean } = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.minutas || changes.nombreSubProyecto) {
      if (!this.minutas) { this.minutas = []; }
      this.minutaActual = this.minutas.length ? this.minutas[this.minutas.length - 1] : null;
    }
  }

  nuevaMinuta(): void {
    const anterior = this.minutas.length ? this.minutas[this.minutas.length - 1] : null;
    const fecha = this.hoy();
    const minuta: Minuta = {
      numero: anterior ? anterior.numero + 1 : 1,
      fecha,
      proyecto: anterior ? anterior.proyecto : (this.nombreSubProyecto || ''),
      mandante: anterior ? anterior.mandante : '',
      contacto: anterior ? anterior.contacto : '',
      direccion: anterior ? anterior.direccion : '',
      codigo: anterior ? anterior.codigo : '',
      asistentesMandante: anterior
        ? anterior.asistentesMandante.map(a => ({ ...a, asistencia: '' }))
        : [this.asistenteVacio()],
      asistentesTrazas: anterior
        ? anterior.asistentesTrazas.map(a => ({ ...a, asistencia: '' }))
        : [this.asistenteVacio('TRAZAS')],
      secciones: this.seccionesBase.map(titulo => ({ titulo, items: [this.itemVacio(fecha)] }))
    };
    this.minutas = [...this.minutas, minuta];
    this.minutaActual = minuta;
    this.colapsadas = {};
  }

  seleccionarMinuta(numero: string | number): void {
    const n = Number(numero);
    this.minutaActual = this.minutas.find(m => m.numero === n) || null;
  }

  agregarAsistente(lista: AsistenteMinuta[], empresa = ''): void {
    lista.push(this.asistenteVacio(empresa));
  }

  quitarAsistente(lista: AsistenteMinuta[], index: number): void {
    lista.splice(index, 1);
  }

  agregarItem(seccion: SeccionMinuta): void {
    seccion.items.push(this.itemVacio(this.minutaActual ? this.minutaActual.fecha : this.hoy()));
    this.colapsadas[seccion.titulo] = false;
  }

  quitarItem(seccion: SeccionMinuta, index: number): void {
    seccion.items.splice(index, 1);
  }

  toggleSeccion(seccion: SeccionMinuta): void {
    this.colapsadas[seccion.titulo] = !this.colapsadas[seccion.titulo];
  }

  contarEstado(seccion: SeccionMinuta, estado: EstadoMinuta): number {
    return seccion.items.filter(i => i.estado === estado).length;
  }

  totalItems(): number {
    if (!this.minutaActual) { return 0; }
    return this.minutaActual.secciones.reduce((t, s) => t + s.items.length, 0);
  }

  totalEstado(estado: EstadoMinuta): number {
    if (!this.minutaActual) { return 0; }
    return this.minutaActual.secciones.reduce((t, s) => t + this.contarEstado(s, estado), 0);
  }

  claseEstado(estado: EstadoMinuta): string {
    switch (estado) {
      case 'EN CURSO': return 'estado-en-curso';
      case 'PENDIENTE': return 'estado-pendiente';
      case 'APROBADO': return 'estado-aprobado';
      case 'CERRADO': return 'estado-cerrado';
      case 'RECHAZADO': return 'estado-rechazado';
      default: return '';
    }
  }

  claseAsistencia(valor: string): string {
    switch (valor) {
      case 'Presente': return 'asis-presente';
      case 'Remoto': return 'asis-remoto';
      case 'Ausente': return 'asis-ausente';
      default: return '';
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  private asistenteVacio(empresa = ''): AsistenteMinuta {
    return { nombre: '', cargo: '', empresa, asistencia: '' };
  }

  private itemVacio(fecha: string): ItemMinuta {
    return {
      alcance: '',
      comentario: '',
      responsable: '',
      fecha,
      compromiso: '',
      estado: 'EN CURSO'
    };
  }

  private hoy(): string {
    const d = new Date();
    const mm = ('0' + (d.getMonth() + 1)).slice(-2);
    const dd = ('0' + d.getDate()).slice(-2);
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
}