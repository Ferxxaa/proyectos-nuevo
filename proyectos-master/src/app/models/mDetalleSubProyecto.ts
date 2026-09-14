export class mDetalleSubProyecto{

    constructor(
        public idDetalleSubProyecto: number,
        public idSubProyecto: number,
        public idEtapa: number,
        public duracion: number,
        public presupuesto: number,
        public ponderado: number,
        public vigente: boolean,
        public fechaInicioReal: string,
        public fechaTerminoReal: string,
        public avanceReal: number,
        public superficie: number,
        public costoReal: number,
        public vistoBuenoEtapa: boolean,
        public vistoBuenoRitmo: boolean,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
