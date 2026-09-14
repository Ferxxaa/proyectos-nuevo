export class mVis_Proyectos{

    constructor(
        public idProyectoMatriz: number,
        public idProyecto: number,
        public nombreProyectoMatriz: string,
        public nombreProyecto: string,
        public Director: string,
        public costoEstimado: number,
        public Clientes: string,
        public Coordinadores: string,
        public fechaInicio: string,
        public fechaCreacion: string,
        public activo: boolean,
        public validado: boolean
    ){}

}
