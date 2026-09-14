export class mArchivoEstandar {

    constructor(
        public _id: String | null,
        public nombreArchivo: string,
        public idProyectoMatriz: String,
        public etapa: String,
        public tipo: Number,
        public fechaIngreso?: Date,
    ) { }

}