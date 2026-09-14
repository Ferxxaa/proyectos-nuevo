export class mBitacora{

    constructor(
        public idBitacora: number,
        public descripcion: string,
        public idPrioridad: number,
        public idArchivoAdjunto: number,
        public idDetalleSubProyecto: number,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number,
        public Adjunto: string,
        public NombreAdjunto: string,
        public TipoBitacora: number
    ){}

}
