export class mTipoDireccion{

    constructor(
        public idTipoDireccion: number,
        public nombreTipoDireccion: string,
        public idSponsor: number,
        public activo: boolean,
        public fechaCreacion: string,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
