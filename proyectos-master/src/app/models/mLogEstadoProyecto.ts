export class mLogEstadoProyecto{

    constructor(
        public idLogEstadoProyecto: number,
        public idEstadoProyecto: number,
        public nombreEstadoProyecto: string,
        public idSponsor: number,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
