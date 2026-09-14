export class mLogUsuarioClienteProyecto{

    constructor(
        public idLogUsuarioClienteProyecto: number,
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
