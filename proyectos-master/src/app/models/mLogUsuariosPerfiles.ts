export class mLogUsuariosPerfiles{

    constructor(
        public idLogUsuarioPerfil: number,
        public idUsuarioPerfil: number,
        public idUsuario: number,
        public idPerfil: number,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
