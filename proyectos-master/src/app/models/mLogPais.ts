export class mLogPais{

    constructor(
        public idLogPais: number,
        public idPais: number,
        public nombrePais: string,
        public cultura: string,
        public activo: boolean,
        public fechaCreacion: string,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
