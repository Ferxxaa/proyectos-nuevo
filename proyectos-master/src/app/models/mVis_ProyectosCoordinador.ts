export class mVis_ProyectosCoordinador{

    constructor(
        public idProyecto: number,
        public nombreProyecto: string,
        public activo: boolean,
        public fechaCreacion: string,
        public idProyectoMatriz: number,
        public idUsuarioCoordinador: number
    ){}

}
