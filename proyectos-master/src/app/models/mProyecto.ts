export class mProyecto{

    constructor(
        public idProyecto: number,
        public idProyectoMatriz: number,
        public nombreProyecto: string,
        public idUsuarioDirector: number,
        public idUsuarioValidador: number,
        public validado: boolean,
        public fechaValidacion: string,
        public idUsuarioAbortador: number,
        public fechaAborto: string,
        public idEstadoProyecto: number,
        public idRegion: number,
        public fechaInicio: string,
        public fechaTermino: string,
        public centroCosto: string,
        public costoEstimado: number,
        public activo: boolean,
        public fechaCreacion: string,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
