export class mLogGerentesSponsor{

    constructor(
        public idLogGerentesSponsor: number,
        public idGerentesSponsor: number,
        public idUsuarioGerente: number,
        public idSponsor: number,
        public fechaRemocion: string,
        public fechaCreacion: string,
        public activo: boolean,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
