export class mLogSemaforo{

    constructor(
        public idLogSemaforo: number,
        public idSemaforo: number,
        public nombreSemaforo: string,
        public imagen: string,
        public idSponsor: number,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
