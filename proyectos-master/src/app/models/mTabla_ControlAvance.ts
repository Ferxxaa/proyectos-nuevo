export class mTabla_ControlAvance {
    constructor(
        public idControlAvance: number,
        public idProyecto: number,
        public numeroAvance: number,
        public codigo: string,
        public tipo: string,
        public descripcion: string,
        public revisionActual: number,
        public estado: string,
        public clasificacion: string,
        public fechaInicioContrato: string,
        public fechaTerminoContrato: string,
        public fechaTerminoReal: string,
        public fechaCierre: string,
        public correoN: string,
        public fechaRespuesta: string,
        public observaciones: string,
        public activo: boolean
    ) { }
}
