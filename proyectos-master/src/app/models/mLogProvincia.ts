export class mLogProvincia{

    constructor(
        public idLogProvincia: number,
        public idProvincia: number,
        public nombreProvincia: string,
        public idRegion: number,
        public activo: boolean,
        public fechaCreacion: string,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
