export class mSponsor{

    constructor(
        public idSponsor: number,
        public nombreSponsor: string,
        public rutaSponsor: string,
        public logoSponsor: string,
        public fechaCreacion: string,
        public activo: boolean,
        public fechaRemocion: string,
        public idUsuarioCreador: number,
        public idUsuarioRemovedor: number
    ){}

}
