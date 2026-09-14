export class mDirectorProyectoMatriz{

    constructor(
        public idDirectorProyectoMatriz: number,
        public idProyectoMatriz: number,
        public idUsuarioDirector: number,
        public activo: boolean,
        public fechaCreacion: string,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
