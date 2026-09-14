export class mComuna{

    constructor(
        public idComuna: number,
        public nombreComuna: string,
        public idProvincia: number,
        public activo: boolean,
        public fechaCreacion: string,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
