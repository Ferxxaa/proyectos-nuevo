export class mLogTipoEtapa{

    constructor(
        public idLogTipoEtapa: number,
        public idTipoEtapa: number,
        public nombreTipoEtapa: string,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
