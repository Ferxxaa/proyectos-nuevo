export class mUsuario{

    constructor(
        public idUsuario: number,
        public idPersona: number,
        public nombreUsuario: string,
        public contraseniaUsuario: string,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
