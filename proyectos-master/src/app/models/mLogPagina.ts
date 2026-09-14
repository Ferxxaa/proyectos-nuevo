export class mLogPagina{

    constructor(
        public idLogPagina: number,
        public idPagina: number,
        public nombrePagina: string,
        public ruta: string,
        public fechaRemocion: string,
        public fechaCreacion: string,
        public activo: boolean,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
