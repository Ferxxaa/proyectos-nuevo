export class mUsuarioClienteProyecto{

    constructor(
        public idUsuarioClienteProyecto: number,
        public idProyecto: number,
        public idUsuarioCliente: number,
        public activo: boolean,
        public fechaCreacion: string,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
