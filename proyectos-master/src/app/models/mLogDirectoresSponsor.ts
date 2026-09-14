export class mLogDirectoresSponsor{

    constructor(
        public idLogDirectoresSponsor: number,
        public idDirectoresSponsor: number,
        public idUsuarioDirector: number,
        public idSponsor: number,
        public fechaRemocion: string,
        public fechaCreacion: string,
        public activo: boolean,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
