export class mEstadoCivil{

    constructor(
        public idEstadoCivil: number,
        public nombreEstadoCivil: string,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
