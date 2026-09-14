export class mTabla_ProyectosNoValidados{

    constructor(
        public idUsuarioDirector: number,
        public idProyectoMatriz: number,
        public nombreProyectoMatriz: string,
        public idProyecto: number,
        public nombreProyecto: string,
        public SubGerente: string,
        public fechaCreacion: string,
        public activo: boolean
    ){}

}
