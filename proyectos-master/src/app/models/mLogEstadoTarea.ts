export class mLogEstadoTarea{

    constructor(
        public idLogTarea: number,
        public idEstadoTarea: number,
        public nombreEstadoTarea: string,
        public pendiente: boolean,
        public idSponsor: number,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
