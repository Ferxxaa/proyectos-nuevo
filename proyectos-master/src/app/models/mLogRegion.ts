export class mLogRegion{

    constructor(
        public idLogRegion: number,
        public idRegion: number,
        public nombreRegion: string,
        public idPais: number,
        public activo: boolean,
        public fechaCreacion: string,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
