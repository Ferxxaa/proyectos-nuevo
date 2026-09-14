export class mLogTipoMail{

    constructor(
        public idLogTipoMail: number,
        public idTipoMail: number,
        public nombreTipoMail: string,
        public idSponsor: number,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
