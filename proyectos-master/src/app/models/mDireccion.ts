export class mDireccion{

    constructor(
        public idDireccion: number,
        public calle: string,
        public numero: string,
        public referencia: string,
        public idComuna: number,
        public idTipoDireccion: number,
        public idPersona: number,
        public activo: boolean,
        public fechaCreacion: string,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
