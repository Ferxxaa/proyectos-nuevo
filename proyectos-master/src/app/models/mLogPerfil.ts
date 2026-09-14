export class mLogPerfil{

    constructor(
        public idLogPerfil: number,
        public idPerfil: number,
        public nombrePerfil: string,
        public descripconPerfil: string,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
