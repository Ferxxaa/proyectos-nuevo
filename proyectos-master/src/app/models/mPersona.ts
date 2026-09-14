export class mPersona{

    constructor(
        public idPersona: number,
        public rut: string,
        public nombre: string,
        public paterno: string,
        public materno: string,
        public fechaNacimiento: string,
        public sexo: string,
        public idEstadoCivil: number,
        public personaValida: boolean,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
