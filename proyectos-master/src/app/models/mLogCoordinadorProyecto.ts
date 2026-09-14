export class mLogCoordinadorProyecto{

    constructor(
        public idLogCoordinadorProyecto: number,
        public idCoordinadorProyecto: number,
        public idProyecto: number,
        public idUsuarioCoordinador: number,
        public activo: boolean,
        public fechaCreacion: string,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
