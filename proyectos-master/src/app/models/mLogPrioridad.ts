export class mLogPrioridad{

    constructor(
        public idLogPrioridad: number,
        public idPrioridad: number,
        public nombrePrioridad: string,
        public idSemaforo: number,
        public idSponsor: number,
        public fechaRemocion: string,
        public fechaCreacion: string,
        public activo: boolean,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
