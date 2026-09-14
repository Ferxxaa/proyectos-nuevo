export class mMis_Tareas{

    constructor(
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
        public prioridad: string,
        public area: string,
        public UsuarioResponsable: string,
        public UsuarioCreador: string,
        public nombreEstadoTarea: string,
        public idSubProyecto: number,
        public nombreSubProyecto: string,
        public Hiteraciones: number,
        public observacionTarea?: string
    ){}

}
