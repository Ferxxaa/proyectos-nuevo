export class mLogUsuariosSponsors{

    constructor(
        public idLogUsuariosSponsors: number,
        public idUsuarioSponsor: number,
        public idUsuario: number,
        public idSponsor: number,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
