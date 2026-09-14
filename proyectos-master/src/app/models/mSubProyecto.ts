export class mSubProyecto{

    constructor(
        public idSubProyecto: number,
        public idProyecto: number,
        public idEstadoProyecto: number,
        public nombreSubProyecto: string,
        public idDireccion: number,
        public idUsuarioCoordinador: number,
        public idZona: number,
        public fechaInicio: string,
        public fechaValidacion: string,
        public idUsuarioAbortador: number,
        public fechaAborto: string,
        public superficie: number,
        public fechaTermino: string,
        public idUsuarioValidador: number,
        public validado: boolean,
        public ritmoValidado: boolean,
        public fechaRitmoValidado: string,
        public idUsuarioRitmoValidado: number,
        public ponderadoValidado: boolean,
        public fechaPonderadoValidado: string,
        public idUsuarioPonderadoValidado: number,
        public presupuestoValidado: boolean,
        public fechaPresupuestoValidado: string,
        public idUsuarioPresupuestoValidado: number,
        public order: number,
        public idTipoIntervencion: number,
        public centroCosto: string,
        public costoEstimado: number,
        public activo: boolean,
        public fechaCreacion: string,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
