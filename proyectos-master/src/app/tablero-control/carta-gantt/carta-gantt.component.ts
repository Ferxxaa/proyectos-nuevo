import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { mDetalleSubProyecto } from '../../models/mDetalleSubProyecto';
import { mSubProyecto } from '../../models/mSubProyecto';
import { mEtapa } from '../../models/mEtapa';
import { sEtapa } from '../../services/sEtapa.service';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/forkJoin';

interface EtapaGantt {
  idEtapa: number;
  nombre: string;
  fechaInicioProgramada: Date;
  fechaTerminoProgramada: Date;
  fechaInicioReal: Date;
  fechaTerminoReal: Date;
  avanceProgramado: number;
  avanceReal: number;
  duracionProgramada: number;
  duracionReal: number;
  ponderado: number;
}

@Component({
  selector: 'app-carta-gantt',
  templateUrl: './carta-gantt.component.html',
  styleUrls: ['./carta-gantt.component.css'],
  providers: [sEtapa]
})
export class CartaGanttComponent implements OnInit, OnChanges {

  private readonly etapasNBI = [2, 4, 6, 8, 11, 14];
  private readonly nombresEtapasTablero: { [idEtapa: number]: string } = {
    1: 'Requerimiento',
    2: 'NBI 1',
    3: 'Factibilidad',
    4: 'NBI 2',
    5: 'Layout',
    6: 'NBI 3',
    7: 'Proyecto',
    8: 'NBI 4',
    9: 'Regularización',
    10: 'Licitación Adjudicación',
    11: 'NBI 5',
    12: 'Construcción',
    13: 'Habilitación',
    14: 'NBI 6',
    15: 'Cierre contratista',
    16: 'Cierre cliente',
    17: 'Cierre mantención'
  };

  @Input() detalleSeguimiento: mDetalleSubProyecto[];
  @Input() nombreProyecto: string = '';
  @Input() subProyecto: mSubProyecto;

  etapas: EtapaGantt[] = [];
  fechaMinima: Date;
  fechaMaxima: Date;
  totalDias: number = 0;
  escala: number = 1;
  SubProyecto: mSubProyecto;
  avanceTotalProyecto: number = 0;
  etapaActualId: number = null;

  constructor(private _sEtapa: sEtapa) {
    this.SubProyecto = JSON.parse(localStorage.SubProyecto || 'null');
  }

  get nombreProyectoVisible(): string {
    return this.nombreProyecto || (this.SubProyecto && this.SubProyecto.nombreSubProyecto) || '';
  }

  ngOnInit() {
    this.procesarDatos();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['subProyecto'] && this.subProyecto) {
      this.SubProyecto = this.subProyecto;
    }

    if ((changes['detalleSeguimiento'] || changes['subProyecto']) && this.detalleSeguimiento) {
      this.procesarDatos();
    }
  }

  procesarDatos() {
    if (!this.SubProyecto || !this.detalleSeguimiento || this.detalleSeguimiento.length === 0) {
      this.etapas = [];
      return;
    }

    // Limpiar etapas anteriores para evitar duplicados
    this.etapas = [];
    
    // IDs de etapas principales (ahora incluye NBIs)
    const etapasPrincipales = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    
    // Filtrar solo etapas válidas y ordenar por idEtapa
    const detallesOrdenados = [...this.detalleSeguimiento]
      .filter(detalle => etapasPrincipales.includes(detalle.idEtapa))
      .sort((a, b) => a.idEtapa - b.idEtapa);
    
    // Verificar si ya tenemos datos para evitar reprocesar
    if (detallesOrdenados.length === 0) {
      return;
    }
    
    // Crear array de observables para obtener nombres de etapas
    const etapaObservables = detallesOrdenados.map(detalle => 
      this._sEtapa.getEtapabyID(detalle.idEtapa)
    );

    // Ejecutar todas las peticiones en paralelo
    Observable.forkJoin(etapaObservables).subscribe(etapasInfo => {
      // Limpiar etapas antes de procesar para evitar duplicados
      this.etapas = [];
      let fechaAcumulada = new Date(this.SubProyecto.fechaInicio);
      let fechas: Date[] = [];

      detallesOrdenados.forEach((detalle, index) => {
        const etapaInfo: mEtapa = etapasInfo[index] as any;
        
        // Calcular fechas programadas basadas en la duración
        const fechaInicioProgramada = new Date(fechaAcumulada);
        const fechaTerminoProgramada = new Date(fechaAcumulada);
        fechaTerminoProgramada.setDate(fechaTerminoProgramada.getDate() + detalle.duracion);

        // Calcular avance programado
        const hoy = new Date();
        const diasDesdeInicio = this.calcularDias(fechaInicioProgramada, hoy);
        const avanceProgramado = diasDesdeInicio > detalle.duracion ? 100 : 
                                diasDesdeInicio < 0 ? 0 : 
                                Math.round(diasDesdeInicio * 100 / detalle.duracion);

        const etapa: EtapaGantt = {
          idEtapa: detalle.idEtapa,
          nombre: this.nombresEtapasTablero[detalle.idEtapa] || etapaInfo.nombreEtapa || `Etapa ${detalle.idEtapa}`,
          fechaInicioProgramada: fechaInicioProgramada,
          fechaTerminoProgramada: fechaTerminoProgramada,
          fechaInicioReal: detalle.fechaInicioReal ? new Date(detalle.fechaInicioReal) : null,
          fechaTerminoReal: detalle.fechaTerminoReal ? new Date(detalle.fechaTerminoReal) : null,
          avanceProgramado: avanceProgramado,
          avanceReal: detalle.avanceReal || 0,
          duracionProgramada: detalle.duracion,
          duracionReal: 0,
          ponderado: detalle.ponderado || 0
        };

        // Calcular duración real si existen ambas fechas
        if (etapa.fechaInicioReal && etapa.fechaTerminoReal) {
          etapa.duracionReal = this.calcularDias(etapa.fechaInicioReal, etapa.fechaTerminoReal);
        }

        // Agregar fechas para calcular el rango
        fechas.push(fechaInicioProgramada, fechaTerminoProgramada);
        if (etapa.fechaInicioReal) {
          fechas.push(etapa.fechaInicioReal);
        }
        if (etapa.fechaTerminoReal) {
          fechas.push(etapa.fechaTerminoReal);
        }

        this.etapas.push(etapa);
        
        // Actualizar fecha acumulada para la siguiente etapa
        fechaAcumulada = new Date(fechaTerminoProgramada);
      });

      // Determinar el rango de fechas
      if (fechas.length > 0) {
        this.fechaMinima = new Date(Math.min(...fechas.map(f => f.getTime())));
        this.fechaMaxima = new Date(Math.max(...fechas.map(f => f.getTime())));
        
        // Agregar un pequeño margen al final para evitar cortes
        this.fechaMaxima.setDate(this.fechaMaxima.getDate() + 5);
        
        this.totalDias = this.calcularDias(this.fechaMinima, this.fechaMaxima);
        
        // Calcular escala mejorada para mejor visualización (mínimo 3px por día)
        this.escala = Math.max(3, Math.min(2000 / this.totalDias, 8));
      }
      
      // Calcular avance total del proyecto ponderado
      this.avanceTotalProyecto = this.etapas.reduce((total, etapa) => {
        return total + (etapa.avanceReal * etapa.ponderado / 100);
      }, 0);
      
      // Determinar etapa actual
      this.determinarEtapaActual();
    });
  }

  determinarEtapaActual() {
    const etapasPrincipales = this.etapas.filter(etapa => this.esEtapaPrincipal(etapa.idEtapa));

    if (etapasPrincipales.length === 0) {
      this.etapaActualId = null;
      return;
    }

    // Buscar la primera etapa en progreso (0% < avance < 100%)
    const etapaEnProgreso = etapasPrincipales.find(e => e.avanceReal > 0 && e.avanceReal < 100);
    if (etapaEnProgreso) {
      this.etapaActualId = etapaEnProgreso.idEtapa;
      return;
    }

    // Si no hay etapas en progreso, buscar la primera no iniciada
    const primeraNoIniciada = etapasPrincipales.find(e => e.avanceReal === 0);
    if (primeraNoIniciada) {
      this.etapaActualId = primeraNoIniciada.idEtapa;
      return;
    }

    // Si todas están completadas, tomar la última
    this.etapaActualId = etapasPrincipales[etapasPrincipales.length - 1].idEtapa;
  }

  private esEtapaPrincipal(idEtapa: number): boolean {
    return this.etapasNBI.indexOf(idEtapa) === -1;
  }

  esEtapaActual(idEtapa: number): boolean {
    return this.etapaActualId === idEtapa;
  }

  calcularDias(inicio: Date, fin: Date): number {
    const diff = fin.getTime() - inicio.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  obtenerPosicion(fecha: Date): number {
    if (!fecha || !this.fechaMinima) return 0;
    const dias = this.calcularDias(this.fechaMinima, fecha);
    return dias * this.escala;
  }

  obtenerAncho(duracion: number): number {
    return duracion * this.escala;
  }

  obtenerAnchoAvanceReal(etapa: EtapaGantt): number {
    if (!etapa) return 0;
    const avanceReal = Math.max(0, Math.min(100, etapa.avanceReal || 0));
    const anchoProgramado = this.obtenerAncho(etapa.duracionProgramada || 0);
    return anchoProgramado * (avanceReal / 100);
  }

  formatearFecha(fecha: Date): string {
    if (!fecha) return 'N/A';
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  obtenerMeses(): { nombre: string, ancho: number, posicion: number }[] {
    if (!this.fechaMinima || !this.fechaMaxima) return [];

    const meses = [];
    let fechaActual = new Date(this.fechaMinima);
    fechaActual.setDate(1);

    while (fechaActual <= this.fechaMaxima) {
      const siguienteMes = new Date(fechaActual);
      siguienteMes.setMonth(siguienteMes.getMonth() + 1);

      const inicioMes = new Date(fechaActual);
      const finMes = new Date(siguienteMes);
      finMes.setDate(0); // Último día del mes

      const posicion = this.obtenerPosicion(inicioMes);
      const ancho = this.obtenerAncho(this.calcularDias(inicioMes, finMes > this.fechaMaxima ? this.fechaMaxima : finMes));

      meses.push({
        nombre: inicioMes.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).toUpperCase(),
        ancho: ancho,
        posicion: posicion
      });

      fechaActual = siguienteMes;
    }

    return meses;
  }

  obtenerColorBarra(tipo: string, avance: number): string {
    if (tipo === 'programada') {
      return '#3498db'; // Azul
    } else {
      // Para barras reales, cambiar color según avance
      if (avance >= 100) return '#27ae60'; // Verde
      if (avance >= 50) return '#f39c12'; // Naranja
      return '#e74c3c'; // Rojo
    }
  }

  obtenerColorEtapa(avance: number): string {
    if (avance >= 100) return '#27ae60'; // Verde - Completado
    if (avance > 0) return '#f39c12'; // Naranja - En progreso
    return '#95a5a6'; // Gris - No iniciado
  }

  obtenerColorPorEtapa(idEtapa: number): string {
    // Colores del tablero según idEtapa
    const coloresTablero = {
      1: '#A7C69F',  // Requerimiento
      3: '#669933',  // Factibilidad
      5: '#0099CC',  // Layout
      7: '#006699',  // Proyecto
      9: '#004d80',  // Regularización
      10: '#003366', // Licitación Adjudicación
      12: '#FFCC00', // Construcción
      13: '#FF9900', // Habilitación
      15: '#FF3300', // Cierre contratista
      16: '#FF3300', // Cierre cliente
      17: '#FF3300'  // Cierre mantención
    };
    
    return coloresTablero[idEtapa] || '#999999';
  }

  obtenerColorTextoAvance(idEtapa: number): string {
    // Construcción y Habilitación usan texto negro porque son colores claros
    if (idEtapa === 12 || idEtapa === 13) {
      return '#000';
    }
    // El resto usa texto blanco
    return '#fff';
  }

  // Nuevo método: obtener color dinámico de la barra real basado en comparación con avance programado
  obtenerColorBarraReal(etapa: EtapaGantt): string {
    // Si está completada al 100%, siempre verde
    if (etapa.avanceReal >= 100) {
      return '#28a745'; // Verde
    }
    
    const diferencia = etapa.avanceReal - etapa.avanceProgramado;
    
    // Verde: el real está 5 o más puntos por encima del programado
    if (diferencia >= 5) {
      return '#28a745'; // Verde
    }
    
    // Verde: el real está entre 3 y 4.9 puntos por encima del programado (adelantado)
    if (diferencia >= 3 && diferencia < 5) {
      return '#28a745'; // Verde (cambiado de amarillo)
    }
    
    // Rojo: el real está 5 o más puntos por debajo del programado
    if (diferencia <= -5) {
      return '#dc3545'; // Rojo
    }
    
    // Color normal para diferencias entre -5 y +3 puntos
    return '#ff9800'; // Naranja (color normal)
  }

  // Método auxiliar para obtener el color del borde de la barra real
  getBordeBarraReal(etapa: EtapaGantt): string {
    // Si está completada al 100%, siempre verde oscuro
    if (etapa.avanceReal >= 100) {
      return '#1e7e34'; // Verde oscuro
    }
    
    const diferencia = etapa.avanceReal - etapa.avanceProgramado;
    
    // Verde oscuro: muy adelantado
    if (diferencia >= 5) {
      return '#1e7e34'; // Verde oscuro
    }
    
    // Verde oscuro: ligeramente adelantado (cambiado de amarillo oscuro)
    if (diferencia >= 3 && diferencia < 5) {
      return '#1e7e34'; // Verde oscuro (cambiado de amarillo oscuro)
    }
    
    // Rojo oscuro: muy atrasado
    if (diferencia <= -5) {
      return '#bd2130'; // Rojo oscuro
    }
    
    // Naranja oscuro: rango normal
    return '#e68900'; // Naranja oscuro
  }

  // Método para obtener la posición del día actual en el diagrama
  obtenerPosicionHoy(): number {
    const hoy = new Date();
    return this.obtenerPosicion(hoy);
  }

  // Método para verificar si el día actual está dentro del rango visible
  mostrarLineaHoy(): boolean {
    const hoy = new Date();
    return this.fechaMinima && this.fechaMaxima && hoy >= this.fechaMinima && hoy <= this.fechaMaxima;
  }

  // Método para obtener la fecha actual formateada
  obtenerFechaHoy(): string {
    return this.formatearFecha(new Date());
  }
}
