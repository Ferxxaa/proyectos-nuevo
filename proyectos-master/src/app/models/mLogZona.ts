export class mLogZona{

    constructor(
        public idLogZona: number,
        public idZona: number,
        public nombreZona: string,
        public idSponsor: number,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
