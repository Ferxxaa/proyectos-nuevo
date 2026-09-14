export class mVis_ProyectoMatriz{

    constructor(
        public idProyectoMatriz: number,
        public Directores: string,
        public nombreProyectoMatriz: string,
        public nombreSponsor: string,
        public SubGerente: string,
        public fechaCreacion: string,
        public activo: boolean,
        public idUsuarioCreador: number,
        public idUsuarioSubGerente: number
    ){}

}
