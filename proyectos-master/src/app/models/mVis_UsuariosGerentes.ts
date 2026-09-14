export class mVis_UsuariosGerentes{

    constructor(
        public idGerentesSponsor: number,
        public idUsuario: number,
        public nombre: string,
        public paterno: string,
        public materno: string,
        public activo: boolean,
        public fechaCreacion: string
    ){}

}
