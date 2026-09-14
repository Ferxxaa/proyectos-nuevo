export class mControlAvance {
    constructor(
        public idControlAvance: number,
        public idProyecto: number,
        public numeroAvance: number,  // % Avance
        public codigo: string,
        public tipo: string,
        public descripcion: string,
        public revisionActual: number,
        public estado: string, // VA-Validado, VC-Validado con observaciones, NV-No Validado, NR-Revisión
        public clasificacion: string, // Usuario escribe manualmente
        public fechaInicioContrato: string,
        public fechaTerminoContrato: string,
        public fechaTerminoReal: string,
        public fechaCierre: string,
        public correoN: string,
        public fechaRespuesta: string,
        public correoM: string,
        public fechaCierre2: string,
        public correoN2: string,
        public fechaRespuesta2: string,
        public observaciones: string,
        public activo: boolean,
        public fechaCreacion: string,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number,
        public porcentajePorInicio?: number,  // % basado en fecha inicio
        public porcentajePorFechaComp?: number,  // % basado en fecha término comprometido
        public fechaInicioProyecto?: string,  // Alias para fechaInicioContrato
        public fechaTerminoComprometido?: string,  // Alias para fechaTerminoContrato
        public porcentajeReal?: number,  // % real (manual) de avance al terminar
        public fechaInicio?: string,  // Fecha de inicio real
        public fechaTermino?: string,  // Fecha de término real
        public fechaInicioProgramada?: string,  // Fecha de inicio programada
        public fechaTerminoProgramada?: string,  // Fecha de término programada
        public avanceProgramado?: number,  // % avance calculado de fechas programadas
        public avanceReal?: number  // % avance real (ingresado manualmente)
    ) { }
}
