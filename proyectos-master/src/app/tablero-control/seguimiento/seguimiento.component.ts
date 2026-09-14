import { Component, OnInit, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';

//Share
import { PopUps } from '../../Share/PopUps';
import { Router } from '@angular/router';

//Model
import { mSubProyecto } from '../../models/mSubProyecto';
import { mDetalleSubProyecto } from '../../models/mDetalleSubProyecto';
import { mEtapa } from '../../models/mEtapa';
import { mVis_UsuarioPersona } from '../../models/mVis_UsuarioPersona';
import { mCorreo } from '../../models/mCorreo';

//Servicios
import { sSubProyecto } from '../../services/sSubProyecto.service';
import { sDetalleSubProyecto } from '../../services/sDetalleSubProyecto.service';
import { sEtapa } from '../../services/sEtapa.service';
import { sVis_UsuarioPersona } from '../../services/sVis_UsuarioPersona.service';
import { sProyecto } from '../../services/sProyecto.service';
import { sUsuario } from '../../services/sUsuario.service';
import { sMail } from '../../services/sMail.service';
import { sCorreo } from '../../services/Personalizados/sCorreo.service';
import { Comunes } from '../../Share/Comunes';
import { firestoreDB } from '../../firebase-init';

declare var $: any;
declare var Swal: any;

@Component({
  selector: 'app-seguimiento',
  templateUrl: './seguimiento.component.html',
  styleUrls: ['./seguimiento.component.css'],
  providers: [
    sSubProyecto,
    sDetalleSubProyecto,
    sEtapa,
    sVis_UsuarioPersona,
    sProyecto,
    sUsuario,
    sMail,
    sCorreo,
    Comunes
  ]
})
export class SeguimientoComponent implements OnInit, OnChanges {

  @Input() idEtapa: number;
  @Input() soloLectura: boolean = false;

  @Output() ActualizarSubProy = new EventEmitter();

  //Objetos
  SubProyecto: mSubProyecto;
  EtapaActual: mDetalleSubProyecto;
  Etapa: mEtapa;
  Coordinador: mVis_UsuarioPersona

  //Detalles
  DetalleSubProyecto: Array<mDetalleSubProyecto>;
  EtapasPrevias: Array<mDetalleSubProyecto>;

  //Fechas
  fechaInicio: Date;
  fechaTermino: Date;

  //DiasDiferencia
  DiasDiferenciaReal: number;

  //Avance
  AvanceProgramado: number;

  //PopUp
  texto: string;
  msg: boolean;

  constructor(
    private _sSubProyecto: sSubProyecto,
    private _sDetalleSubProyecto: sDetalleSubProyecto,
    private _sEtapa: sEtapa,
    private _sVis_UsuarioPersona: sVis_UsuarioPersona,
    private _sProyecto: sProyecto,
    private _sUsuario: sUsuario,
    private _sMail: sMail,
    private _sCorreo: sCorreo,
    private Comunes: Comunes
  ) {
    this.texto = "";
    this.msg = false;
    this.SubProyecto = new mSubProyecto(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    this.Etapa = new mEtapa(null, null, null, null, null, null, null, null, null, null, null, null);
    this.EtapaActual = new mDetalleSubProyecto(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    this.Coordinador = new mVis_UsuarioPersona(null, null, null, null, null, null)
    this.SubProyecto = JSON.parse(localStorage.SubProyecto);
  }

  ngOnInit() {

    $("#txtInicioReal").val("");
    $("#txtTerminoReal").val("");

    $(".date").datetimepicker(
      {
        format: 'DD/MM/YYYY'
      }
    );

    this._sDetalleSubProyecto.getDetalleSubProyectobyidSubProyecto(this.SubProyecto.idSubProyecto).subscribe(result => {

      this.DetalleSubProyecto = result;

      this.EtapaActual = result.find(element => { return element.vigente == true; });
      this.EtapasPrevias = result.filter(element => { return element.idEtapa < this.EtapaActual.idEtapa; });
      //Retorna nombre de Etapa
      this._sEtapa.getEtapabyID(this.EtapaActual.idEtapa).subscribe(result => {
        this.Etapa = result;
        localStorage.setItem('Etapa', JSON.stringify(result));
      });
      //Retorna nombre de usuario Coordinador
      this._sVis_UsuarioPersona.getVis_UsuarioPersonabyidUsuario(this.SubProyecto.idUsuarioCoordinador).subscribe(result => {
        this.Coordinador = result[0];
      });

      //Calcula dias previos
      let dias: number = 0;
      this.EtapasPrevias.forEach(element => {
        dias += element.duracion;
      });

      this.asignaFechasProgramadas(dias);

      if (this.EtapaActual.fechaInicioReal != null) {
        let inicio = this.EtapaActual.fechaInicioReal.split("T")[0]
        $("#txtInicioReal").val(inicio.split("-")[2] + "/" + inicio.split("-")[1] + "/" + inicio.split("-")[0]);
      }

      if (this.EtapaActual.fechaTerminoReal != null) {
        let termino = this.EtapaActual.fechaTerminoReal.split("T")[0]
        $("#txtTerminoReal").val(termino.split("-")[2] + "/" + termino.split("-")[1] + "/" + termino.split("-")[0]);
      }

      if (this.EtapaActual.fechaInicioReal != null && this.EtapaActual.fechaTerminoReal != null) {
        this.DiasDiferenciaReal = Math.round((Date.parse(this.EtapaActual.fechaTerminoReal) - Date.parse(this.EtapaActual.fechaInicioReal)) / 1000 / 60 / 60 / 24);
      }

    });

  }

  private asignaFechasProgramadas(dias: number) {
    this.fechaInicio = new Date(this.SubProyecto.fechaInicio);
    this.fechaTermino = new Date(this.SubProyecto.fechaInicio);
    this.fechaInicio.setDate(this.fechaInicio.getDate() + dias);
    this.fechaTermino.setDate(this.fechaTermino.getDate() + dias + this.EtapaActual.duracion);
    let DiasDiferencia: number;
    DiasDiferencia = Math.round((Date.parse(new Date().toString()) - Date.parse(this.fechaInicio.toString())) / 1000 / 60 / 60 / 24);
    this.AvanceProgramado = DiasDiferencia > this.EtapaActual.duracion ? 100 : DiasDiferencia < 0 ? 0 : DiasDiferencia * 100 / this.EtapaActual.duracion;
  }

  ngOnChanges(cambio: SimpleChanges) {
    if (cambio.idEtapa && cambio.idEtapa.currentValue)
      this.findEtapaAnterior(cambio.idEtapa.currentValue)
  }

  //CRUD

  Agregar(Form) {
    if (this.soloLectura) {
      return;
    }

    this.texto = "";
    this.msg = false;

    let idEtapa: number;
    const etapaFinalizada = this.EtapaActual.vistoBuenoEtapa || this.EtapaActual.avanceReal >= 100;

    idEtapa = this.EtapaActual.idEtapa
    if (etapaFinalizada) {
      this.EtapaActual.avanceReal = 100;
      this.EtapaActual.vigente = false;
    }
    if (this.EtapaActual.idEtapa == 17 && etapaFinalizada) {
      this.SubProyecto.idEstadoProyecto = 5;
      this._sSubProyecto.postUpdDelSubProyecto(this.SubProyecto);
    }

    this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.EtapaActual).success(result => {
      if (!this.EtapaActual.vigente) {

        do {
          idEtapa = idEtapa + 1
        } while (idEtapa == 2 || idEtapa == 4 || idEtapa == 6 || idEtapa == 8 || idEtapa == 11 || idEtapa == 14);

        this.EtapaActual = this.DetalleSubProyecto.find(element => element.idEtapa == idEtapa);
        let vigente = this.DetalleSubProyecto.find(el => el.vigente && this.EtapaActual.idEtapa != el.idEtapa)
        if (!vigente)
          this.EtapaActual.vigente = true;
        this._sDetalleSubProyecto.postUpdDelDetalleSubProyecto(this.EtapaActual).success(result => {
          this.ngOnInit();

        });

      }
      this.ActualizarSubProy.emit({ actualizar: true });
      this.texto = "Se ha actualizado de forma correcta el estado del proyecto";
      this.msg = true;
    });
  }

  //Funciones

  AvanceReal() {
    if (this.soloLectura) { return; }
    if (!this.EtapaActual.vistoBuenoEtapa) { this.EtapaActual.avanceReal = 100 };
  }

  setDate() {
    if (this.soloLectura) { return; }
    if (!this.EtapaActual.fechaInicioReal){
      this.EtapaActual.fechaInicioReal = this.Comunes.retDateToSaveString(new Date());
      $("#txtInicioReal").val(this.Comunes.retFechaFormat(this.EtapaActual.fechaInicioReal));
    }
    if (!this.EtapaActual.fechaTerminoReal){
      this.EtapaActual.fechaTerminoReal = this.Comunes.retDateToSaveString(new Date());
      $("#txtTerminoReal").val(this.Comunes.retFechaFormat(this.EtapaActual.fechaInicioReal));
    }
  }

  asignaFechaTermino() {
    if (this.soloLectura) { return; }
    let dia = $("#txtTerminoReal").val().split("/")[0];
    let mes = $("#txtTerminoReal").val().split("/")[1];
    let agno = $("#txtTerminoReal").val().split("/")[2];
    this.EtapaActual.fechaTerminoReal = agno + "-" + mes + "-" + dia + "T00:00:00";
  }

  asignaFechaInicio() {
    if (this.soloLectura) { return; }
    let dia = $("#txtInicioReal").val().split("/")[0];
    let mes = $("#txtInicioReal").val().split("/")[1];
    let agno = $("#txtInicioReal").val().split("/")[2];
    this.EtapaActual.fechaInicioReal = agno + "-" + mes + "-" + dia + "T00:00:00";
  }

  fechaToString(fecha: Date) {
    return fecha.getFullYear() + "-" + (fecha.getMonth() + 1).toString().padStart(2, "0") + "-" + fecha.getDate() + "T00:00:00";
  }

  finalizarProyecto() {
    if (this.soloLectura) { return; }
    Swal.fire({
      title: '¿Esta seguro de finalizar el proyecto?',
      text: "Se enviará la solicitud de cierre para validación del Director y el proyecto no quedará finalizado hasta aprobación.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Solicitar validación'
    }).then((result) => {
      if (result.value) {
        this.Finalizando()
      }
    })
  }

  Finalizando() {
    if (this.soloLectura) { return; }
    this.enviarCorreoValidacionCierreDirector((correoEnviado, mensajeError) => {
      this.guardarSolicitudCierrePendiente();

      if (!correoEnviado) {
        Swal.fire(
          'Solicitud registrada sin correo',
          (mensajeError || 'No fue posible enviar el correo al Director, pero la solicitud quedó guardada para validación.') +
          ' El cierre quedará pendiente hasta que el Director la valide desde la pantalla correspondiente.',
          'warning'
        );
        return;
      }

      Swal.fire(
        'Solicitud enviada',
        'La finalización quedó pendiente de validación. El Director debe aprobarla desde la pantalla de cierre.',
        'success'
      );
    });
  }

  private guardarSolicitudCierrePendiente() {
    const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');
    const enlaceValidacion = `http://proyectos.trazas-nbi.com/Validacion-Cierre?subproyecto=${this.SubProyecto.idSubProyecto}&autoselect=true`;
    const solicitud = {
      idSubProyecto: this.SubProyecto.idSubProyecto,
      idProyecto: this.SubProyecto.idProyecto,
      nombreSubProyecto: this.SubProyecto.nombreSubProyecto,
      nombreProyecto: this.SubProyecto.nombreSubProyecto,
      idUsuarioSolicitante: usuarioActual && usuarioActual.idUsuario ? usuarioActual.idUsuario : null,
      fechaSolicitud: new Date().toISOString(),
      estado: 'pendiente_validacion',
      tipo: 'cierre',
      enlaceValidacion: enlaceValidacion
    };

    firestoreDB.collection('solicitudesCierre')
      .where('idSubProyecto', '==', solicitud.idSubProyecto)
      .where('estado', '==', 'pendiente_validacion')
      .get()
      .then((snapshot: any) => {
        if (!snapshot.empty) {
          return;
        }

        return firestoreDB.collection('solicitudesCierre').add(solicitud);
      })
      .catch((error) => {
        if (error && error.code === 'permission-denied') {
          console.warn('No se pudo guardar la solicitud de cierre en Firestore por permisos insuficientes. El correo se envió igual.', error);
          return;
        }
        console.error('Error guardando la solicitud de cierre en Firebase:', error);
      });
  }

  private enviarCorreoValidacionCierreDirector(done: (enviado: boolean, errorMsg?: string) => void) {
    this._sProyecto.getProyectobyID(this.SubProyecto.idProyecto).subscribe(
      proyecto => {
        if (!proyecto || !proyecto.idUsuarioDirector) {
          console.warn('No se encontró Director de Proyecto para solicitar validación de cierre.');
          done(false, 'No se encontró Director de Proyecto asignado.');
          return;
        }

        this._sUsuario.getUsuariobyID(proyecto.idUsuarioDirector).subscribe(
          usuarioDirector => {
            if (!usuarioDirector || !usuarioDirector.idPersona) {
              console.warn('No se encontró usuario/persona del Director de Proyecto.');
              done(false, 'No se encontró la información del Director de Proyecto.');
              return;
            }

            this._sMail.getMailbyidPersona(usuarioDirector.idPersona).subscribe(
              mails => {
                const correosDirector = this.obtenerCorreosActivos(mails);
                if (correosDirector.length < 1) {
                  console.warn('El Director de Proyecto no tiene correo activo para notificación de cierre.');
                  done(false, 'El Director de Proyecto no tiene correo activo configurado.');
                  return;
                }

                const enlaceValidacion = `http://proyectos.trazas-nbi.com/Validacion-Cierre?subproyecto=${this.SubProyecto.idSubProyecto}&autoselect=true`;
                const asunto = `Solicitud de validación de cierre - ${this.SubProyecto.nombreSubProyecto}`;
                const mensaje = `Estimado Director(a),\n\n` +
                  `Se solicita su validación para finalizar el proyecto/subproyecto: ${this.SubProyecto.nombreSubProyecto}.\n` +
                  `Por favor, revise la información y decida si aprueba o rechaza el cierre.\n\n` +
                  `Enlace de validación: ${enlaceValidacion}\n\n` +
                  `Atentamente,\nSistema de Gestión de Proyectos`;

                const correoEnviar: mCorreo = new mCorreo(correosDirector.join(','), asunto, mensaje);
                this._sCorreo.postCorreo(correoEnviar).subscribe(
                  () => {
                    console.log('Correo de validación de cierre enviado al Director de Proyecto.');
                    done(true);
                  },
                  err => {
                    console.error('Error enviando correo de validación de cierre:', err);
                    done(false, 'Error al enviar correo al Director de Proyecto.');
                  }
                );
              },
              err => {
                console.error('Error obteniendo correo del Director de Proyecto:', err);
                done(false, 'No fue posible obtener el correo del Director de Proyecto.');
              }
            );
          },
          err => {
            console.error('Error obteniendo usuario Director de Proyecto:', err);
            done(false, 'No fue posible obtener los datos del Director de Proyecto.');
          }
        );
      },
      err => {
        console.error('Error obteniendo proyecto para validación de cierre:', err);
        done(false, 'No fue posible obtener el proyecto para gestionar el cierre.');
      }
    );
  }

  private obtenerCorreosActivos(mails: Array<any>): Array<string> {
    const correos = (mails || [])
      .filter(mail => mail && mail.activo !== false && mail.direccionMail && mail.direccionMail.toString().trim().length > 0)
      .map(mail => mail.direccionMail.toString().trim());

    return correos.filter((correo, index, self) => self.indexOf(correo) === index);
  }

  retEtapa(idEtapa: number) {
    do {
      idEtapa = idEtapa + 1
    } while (idEtapa == 2 || idEtapa == 4 || idEtapa == 6 || idEtapa == 8 || idEtapa == 11 || idEtapa == 14);
    return idEtapa;
  }

  findEtapaAnterior(idEtapa) {
    this._sDetalleSubProyecto.getDetalleSubProyectobyidSubProyecto(this.SubProyecto.idSubProyecto).subscribe(result => {
      this.EtapaActual = result.find(element => element.idEtapa == idEtapa);
      this.Comunes.DespliegaFecha('#txtInicioReal', this.EtapaActual.fechaInicioReal);
      this.Comunes.DespliegaFecha('#txtTerminoReal', this.EtapaActual.fechaTerminoReal);
      this.DiasDiferenciaReal = this.Comunes.calDuracionProy(this.EtapaActual.fechaInicioReal, this.EtapaActual.fechaTerminoReal)

      this.EtapasPrevias = result.filter(element => { return element.idEtapa < this.EtapaActual.idEtapa; });
      this._sEtapa.getEtapabyID(this.EtapaActual.idEtapa).subscribe(result => {
        this.Etapa = result;
        localStorage.setItem('Etapa', JSON.stringify(result));
      });

      let dias: number = 0;
      this.EtapasPrevias.forEach(element => {
        dias += element.duracion;
      });

      this.asignaFechasProgramadas(dias);

    });
  }

}