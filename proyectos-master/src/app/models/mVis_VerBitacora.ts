export class mVis_VerBitacora{

    constructor(
        public idBitacora: number,
        public descripcion: string,
        public nombrePrioridad: string,
        public nombre: string,
        public paterno: string,
        public fechaCreacion: string,
        public activo: boolean,
        public idArchivoAdjunto: number,
        public nombreArchivo: string,
        public ruta: string,
        public ArchivoActivo: boolean,
        public Adjunto: string,
        public NombreAdjunto: string,
        public idDetalleSubProyecto: number,
        public idSubProyecto: number,
        public TipoBitacora: number
    ){}

}
