import { Injectable } from '@angular/core';

declare var jQuery: any;
declare var $: any;
declare var Email: any;

@Injectable()

export class Comunes {

    getFileBlob(file) {

        var reader = new FileReader();
        return new Promise(function (resolve, reject) {

            reader.onload = (function (theFile) {
                return function (e) {
                    resolve(e.target.result);
                };
            })(file);

            reader.readAsDataURL(file);
        });
    }

    ReturnFecha(objHtml: any) {
        let dia = objHtml.val().split("/")[0];
        let mes = objHtml.val().split("/")[1];
        let agno = objHtml.val().split("/")[2];
        return agno + "-" + mes + "-" + dia + "T00:00:00";
    }

    SendMail(Formulario, para, subject, descripcion: string) {
        // console.log(mail);
        return Email.send({
            Host: "mail.trazas.cl",
            Username: "nbi@trazas.cl",
            Password: "trazas5523",
            To: para,
            From: "nbi@trazas.cl",
            Subject: subject,
            Body: descripcion
        })
    }

    DespliegaFecha(htmlId: string, fechaString: string) {
        // console.log(fechaString);

        if (fechaString)
            setTimeout(() => $(htmlId).val(this.retFechaFormat(fechaString)), 200);
        else
            setTimeout(() => $(htmlId).val(""), 200);
    }

    retFechaFormat(fecha: string) {
        fecha = fecha.split("T")[0];
        return (
            fecha.split("-")[2] +
            "/" +
            fecha.split("-")[1] +
            "/" +
            fecha.split("-")[0]
        );
    }

    calDuracionProy(fechaInicio: string, fechaTermino: string): number {
        let dateInicioReal: number = new Date(fechaInicio).getTime();
        let dateTerminoReal: number = new Date(fechaTermino).getTime();
        let dateDiff = dateTerminoReal - dateInicioReal;

        return dateInicioReal && dateTerminoReal ? Math.ceil(dateDiff / (1000 * 60 * 60 * 24)) : 0;
    }

    retDateToSaveString(fecha: Date) {
        let dia: string = fecha.getDate().toString().padStart(2, "0");
        let mes: string = (fecha.getMonth() + 1).toString().padStart(2, "0");
        let year: string = fecha.getFullYear().toString().padStart(4, "0");
        return `${year}-${mes}-${dia}T00:00:00`
    }
}