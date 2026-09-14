export class mEstadoProyecto{

    constructor(
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
