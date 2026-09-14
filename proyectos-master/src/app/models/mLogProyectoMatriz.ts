export class mLogProyectoMatriz{

    constructor(
        public idLogProyectoMatriz: number,
        public idProyectoMatriz: number,
        public nombreProyectoMatriz: string,
        public idSponsorCliente: number,
        public idUsuarioSubGerente: number,
        public idEstadoProyecto: number,
        public activo: boolean,
        public fechaCreacion: string,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
