export class mArchivoAdjunto{

    constructor(
        public idArchivoAdjunto: number,
        public nombreArchivo: string,
        public ruta: string,
        public idTipoArchivoAdjunto: number,
        public idSponsorCliente: number,
        public idSponsor: number,
        public idProyectoMatriz: number,
        public idProyecto: number,
        public idSubProyecto: number,
        public idEtapa: number,
        public idDetalleSubProyecto: number,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
