export class mVis_SubProyecto{

    constructor(
        public idSubProyecto: number,
        public nombreProyectoMatriz: string,
        public nombreProyecto: string,
        public nombreSubProyecto: string,
        public nombreEstadoProyecto: string,
        public nombreTipoIntervencion: string,
        public superficie: number,
        public fechaInicio: string,
        public fechaCreacion: string,
        public activo: boolean,
        public idProyecto: number,
        public idUsuarioCreador: number
    ){}

}
