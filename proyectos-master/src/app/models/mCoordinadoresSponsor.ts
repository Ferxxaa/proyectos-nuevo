export class mCoordinadoresSponsor{

    constructor(
        public idCoordinadoresSponsor: number,
        public idUsuarioCoordinador: number,
        public idSponsor: number,
        public fechaRemocion: string,
        public fechaCreacion: string,
        public activo: boolean,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
