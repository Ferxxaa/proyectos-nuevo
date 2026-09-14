export class mMail{

    constructor(
        public idMail: number,
        public direccionMail: string,
        public idPersona: number,
        public idTipoMail: number,
        public fechaRemocion: string,
        public fechaCreacion: string,
        public activo: boolean,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
