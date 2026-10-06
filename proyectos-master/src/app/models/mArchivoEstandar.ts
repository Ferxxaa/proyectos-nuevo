export class mArchivoEstandar {

    // Respaldo en Firebase (no viene de Mongo, se completa desde Firestore)
    urlFirebase?: string;
    rutaFirebase?: string;

    constructor(
        public _id: String | null,
        public nombreArchivo: string,
        public idProyectoMatriz: String,
        public etapa: String,
        public tipo: Number,
        public fechaIngreso?: Date,
    ) { }

}