export class mMis_Proyectos {

    constructor(
        public DuracionTotal: number,
        public FechaTermino: string,
        public AvanceReal: number,
        public EtapaActual: string,
        public AvanceRealEtapa: number,
        public idUsuarioCoordinador: number,
        public idSubProyecto: number,
        public nombreProyectoMatriz: string,
        public nombreProyecto: string,
        public nombreSubProyecto: string,
        public nombreEstadoProyecto: string,
        public nombreTipoIntervencion: string,
        public superficie: number,
        public fechaInicio: string,
        public fechaCreacion: string,
        public activo: boolean,
        public idProyecto: number,
        public idUsuarioCreador: number,
        public nombre: string,
        public AvanceProgramado: number,
        public idEstadoProyecto: number,
        public Responsable: string,
        public UltBitacora: string,
        public duracionReal?: number
    ) { }

}
