export class mLogTarea{

    constructor(
        public idLogTarea: number,
        public idTarea: number,
        public idDetalleSubProyecto: number,
        public nombreTarea: string,
        public descripcionTarea: string,
        public idUsuarioResponsable: number,
        public fechaInicioProgramado: string,
        public fechaTerminoProgramado: string,
        public fechaInicioReal: string,
        public fechaTerminoReal: string,
        public idEstadoTarea: number,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number,
        public observacionTarea?: string
    ){}

}
