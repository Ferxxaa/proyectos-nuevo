export class mLogMenu{

    constructor(
        public idLogMenu: number,
        public idMenu: number,
        public nombreMenu: string,
        public idPagina: number,
        public idPadre: number,
        public idPerfil: number,
        public remocion: boolean,
        public visualizacion: boolean,
        public edicion: boolean,
        public idPais: number,
        public orden: number,
        public fechaRemocion: string,
        public fechaCreacion: string,
        public activo: boolean,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
