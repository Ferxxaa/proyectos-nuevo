export class mTipoIntervencion{

    constructor(
        public idTipoIntervencion: number,
        public nombreTipoIntervencion: string,
        public idSponsor: number,
        public activo: boolean,
        public fechaCreacion: string,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
