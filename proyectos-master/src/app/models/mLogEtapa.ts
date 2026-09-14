export class mLogEtapa{

    constructor(
        public idLogEtapa: number,
        public idEtapa: number,
        public nombreEtapa: string,
        public nombreControlIngreso: string,
        public idSponsor: number,
        public order: number,
        public idTipoEtapa: number,
        public idEtapaSiguiente: number,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
