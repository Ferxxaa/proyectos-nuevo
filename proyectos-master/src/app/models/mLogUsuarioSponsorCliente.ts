export class mLogUsuarioSponsorCliente{

    constructor(
        public idLogUsuarioSponsorCliente: number,
        public idUsuarioSponsorCliente: number,
        public idUsuario: number,
        public idSponsorCliente: number,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
