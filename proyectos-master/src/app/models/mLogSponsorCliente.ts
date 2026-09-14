export class mLogSponsorCliente{

    constructor(
        public idLogSponsorCliente: number,
        public idSponsorCliente: number,
        public nombreSponsorCliente: string,
        public rutaSponsorCliente: string,
        public logoSponsorCliente: string,
        public idSponsor: number,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
