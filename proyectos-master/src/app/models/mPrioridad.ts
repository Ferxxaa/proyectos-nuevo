export class mPrioridad{

    constructor(
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
