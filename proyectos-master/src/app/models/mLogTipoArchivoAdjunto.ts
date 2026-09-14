export class mLogTipoArchivoAdjunto{

    constructor(
        public idLogTipoArchivoAdjunto: number,
        public idTipoArchivoAdjunto: number,
        public nombreTipoArchivoAdjunto: string,
        public idSponsor: number,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
