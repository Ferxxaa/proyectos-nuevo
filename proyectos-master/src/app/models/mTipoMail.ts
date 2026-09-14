export class mTipoMail{

    constructor(
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
