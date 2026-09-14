export class mNotificacion {
  id: number;
  idUsuario: number;
  tipo: 'tarea' | 'proyecto' | 'reunion' | 'vencimiento' | 'general' | 'ritmo' | 'validacion' | 'bitacora' | 'licitacion' | 'contrato_marco';
  titulo: string;
  descripcion: string;
  fechaCreacion: Date;
  fechaVencimiento?: Date;
  fechaCompromiso?: Date;
  fechaCierre?: Date; // Para licitaciones
  fechaApertura?: Date; // Para licitaciones
  nombreEstadoTarea?: string;
  idEstadoTarea?: number;
  fechaCreacionTarea?: Date;
  idSubProyecto?: number; // ID del subproyecto asociado a la tarea
  nombreSubProyecto?: string; // Nombre del subproyecto asociado a la tarea
  leida: boolean;
  prioridad: 'alta' | 'media' | 'baja';
  icono: string;
  colorFondo: string;
  colorTexto: string;
  enlace?: string; // URL o ruta para navegar
  idReferencia?: number; // ID del elemento relacionado (tarea, proyecto, etc.)
  tipoReferencia?: string; // Tipo del elemento relacionado
  // Campos específicos para licitaciones
  numeroLicitacion?: string;
  montoEstimado?: number;
  estado?: string;
  fechaEntrega?: Date; // Fecha de entrega específica
  fechaUltimaModificacion?: Date; // Para detectar cambios de estado
  tipoEvento?: 'nueva' | 'cambio_estado' | 'vencimiento_entrega'; // Tipo de evento de licitación

  constructor() {
    this.id = 0;
    this.idUsuario = 0;
    this.tipo = 'general';
    this.titulo = '';
    this.descripcion = '';
    this.fechaCreacion = new Date();
    this.leida = false;
    this.prioridad = 'media';
    this.icono = 'fa-bell';
    this.colorFondo = '#f8f9fa';
    this.colorTexto = '#333';
  }
}