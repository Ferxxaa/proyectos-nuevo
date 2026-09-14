import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

//Share
import { PopUps } from '../../Share/PopUps';

//Model
import { mVis_SubProyNoValidado } from '../../models/mVis_SubProyNoValidado';
import { mVis_DirectorProyectoMatriz } from '../../models/mVis_DirectorProyectoMatriz';
import { mSubProyecto } from '../../models/mSubProyecto';
import { mMail } from '../../models/mMail';
import { mUsuario } from '../../models/mUsuario';
import { mCorreo } from '../../models/mCorreo';

//Servicios
import { sVis_SubProyNoValidado } from '../../services/sVis_SubProyNoValidado.service';
import { sVis_DirectorProyectoMatriz } from '../../services/sVis_DirectorProyectoMatriz.service';
import { sSubProyecto } from '../../services/sSubProyecto.service';
import { sMail } from '../../services/sMail.service';
import { sUsuario } from '../../services/sUsuario.service';
import { sCorreo } from '../../services/Personalizados/sCorreo.service';

declare var jQuery: any;
declare var $: any;

@Component({
  selector: 'app-validar-sub-proyecto',
  templateUrl: './validar-sub-proyecto.component.html',
  styleUrls: ['./validar-sub-proyecto.component.css'],
  providers: [
    PopUps,
    sVis_SubProyNoValidado,
    sVis_DirectorProyectoMatriz,
    sSubProyecto,
    sMail,
    sUsuario,
    sCorreo
  ]
})
export class ValidarSubProyectoComponent implements OnInit {

  //Select
  ProyectosMatriz: Array<any>;
  Proyectos: Array<any>;

  //Controles
  drdProyectoMatriz;
  drdProyecto;

  //Tabla
  SubProyectos: Array<mVis_SubProyNoValidado>;

  //Objetos
  usuario: any;
  Detalle: any;

  //Loading;
  Loading: boolean;
  LoadingTabla: boolean;

  //Mensaje
  texto: string;
  msg: boolean;

  //Variables para confirmación de correo
  accionPendiente: 'validar' | 'rechazar' | null = null;
  private subProyectoAutoseleccionId: number | null = null;
  private intentoAutoseleccionRealizado: boolean = false;

  constructor(
    private _PopUps: PopUps,
    private _sVis_SubProyNoValidado: sVis_SubProyNoValidado,
    private _sVis_DirectorProyectoMatriz: sVis_DirectorProyectoMatriz,
    private _sSubProyecto: sSubProyecto,
    private _sMail: sMail,
    private _sUsuario: sUsuario,
    private _sCorreo: sCorreo,
    private route: ActivatedRoute
  ) {

    this.texto = "";
    this.msg = false;

    this.ProyectosMatriz = [];
    this.Proyectos = [];
    this.usuario = JSON.parse(localStorage.usuario);
    this.drdProyectoMatriz = 0;
    this.drdProyecto = 0;
    this.Detalle = {
      nombreProyectoMatriz: null, nombreProyecto: null, nombreSubProyecto: null, nombreEstadoProyecto: null,
      fechaInicio: null, fechaTermino: null, centroCosto: null, costoEstimado: null, nombreTipoIntervencion: null,
      idSubProyecto: null
    }
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const idSubProyecto = Number(params.subproyecto);
      this.subProyectoAutoseleccionId = params.autoselect === 'true' && idSubProyecto > 0
        ? idSubProyecto
        : null;
      this.intentoAutoseleccionRealizado = false;
    });

    this._sVis_SubProyNoValidado.getVis_SubProyNoValidadobyDirectorSP(this.usuario.idUsuario).subscribe(result => {

      this.SubProyectos = result;
      result.forEach(element => {
        let PM = { idProyectoMatriz: element.idProyectoMatriz, nombreProyectoMatriz: element.nombreProyectoMatriz };
        let P = { idProyecto: element.idProyecto, nombreProyecto: element.nombreProyecto };
        if (this.ProyectosMatriz.filter(element => { return element.idProyectoMatriz == PM.idProyectoMatriz; }).length < 1) {
          this.ProyectosMatriz.push(PM);
        }
        if (this.Proyectos.filter(element => { return element.idProyecto == P.idProyecto; }).length < 1) {
          this.Proyectos.push(P);
        }
      });

      this.intentarAutoseleccionarSubProyecto();

    });
  }

  //Filtro

  LimpiarFiltros() {
    this.drdProyectoMatriz = 0;
    this.drdProyecto = 0;
    this.Buscar();
  }

  Buscar() {
    this.LoadingTabla = true;
    this._sVis_SubProyNoValidado.getVis_SubProyNoValidadobyDirectorSP(this.usuario.idUsuario).subscribe(
      result => {
        this.SubProyectos = result;

        if (this.drdProyectoMatriz > 0) {
          this.SubProyectos = this.SubProyectos.filter(element => { return element.idProyectoMatriz == this.drdProyectoMatriz; })
        }
        if (this.drdProyecto > 0) {
          this.SubProyectos = this.SubProyectos.filter(element => { return element.idProyecto == this.drdProyecto; })
        }
        this.LoadingTabla = false;
        this.intentarAutoseleccionarSubProyecto();
      }
    );
  }

  private intentarAutoseleccionarSubProyecto() {
    if (this.intentoAutoseleccionRealizado || !this.subProyectoAutoseleccionId || !this.SubProyectos || !this.SubProyectos.length) {
      return;
    }

    const index = this.SubProyectos.findIndex(subProyecto => subProyecto.idSubProyecto === this.subProyectoAutoseleccionId);
    if (index < 0) {
      return;
    }

    this.intentoAutoseleccionRealizado = true;
    this.VerDetalle(index);
  }

  //*************************************************** CRUD ***************************************************
  Validar() {
    // Mostrar confirmación para enviar correo
    this.accionPendiente = 'validar';
    this._PopUps.Confirmacion();
  }

  Rechazar() {
    // Mostrar confirmación para enviar correo
    this.accionPendiente = 'rechazar';
    this._PopUps.Confirmacion();
  }

  // Confirmar acción CON envío de correo
  ConfirmarConCorreo() {
    this._PopUps.OcultarConfirmacion();
    
    if (this.accionPendiente === 'validar') {
      this.EjecutarValidacion(true);
    } else if (this.accionPendiente === 'rechazar') {
      this.EjecutarRechazo(true);
    }
    this.accionPendiente = null;
  }

  // Confirmar acción SIN envío de correo
  ConfirmarSinCorreo() {
    this._PopUps.OcultarConfirmacion();
    
    if (this.accionPendiente === 'validar') {
      this.EjecutarValidacion(false);
    } else if (this.accionPendiente === 'rechazar') {
      this.EjecutarRechazo(false);
    }
    this.accionPendiente = null;
  }

  // Cancelar acción
  CancelarAccion() {
    this._PopUps.OcultarConfirmacion();
    this.accionPendiente = null;
  }

  // Ejecutar validación
  private EjecutarValidacion(enviarCorreo: boolean) {
    this.texto = "";
    this.msg = false;
    this.Loading = true;

    this._sSubProyecto.getSubProyectobyID(this.Detalle.idSubProyecto).subscribe(result => {

      let SubProy: mSubProyecto;

      SubProy = result;
      SubProy.validado = true;

      this._sSubProyecto.postUpdDelSubProyecto(SubProy).success(result => {
        
        // Si se solicitó enviar correo, enviarlo
        if (enviarCorreo) {
          this.enviarCorreoValidacion(SubProy);
        }

        this.Buscar();
        this.OcultarPopUpDetalle();
        this.Loading = false;
        this.texto = "SubProyecto validado de forma exitosa" + (enviarCorreo ? " y correo enviado" : "");
        this.msg = true;
      });

    });
  }

  // Ejecutar rechazo
  private EjecutarRechazo(enviarCorreo: boolean) {
    this.Loading = true;

    this._sSubProyecto.getSubProyectobyID(this.Detalle.idSubProyecto).subscribe(result => {
      let nomProy: string = result.nombreSubProyecto;
      
      if (enviarCorreo) {
        // Abrir ventana de correo con plantilla
        this._sUsuario.getUsuariobyID(result.idUsuarioCreador).subscribe(resultUsuario => {
          this._sMail.getMailbyidPersona(resultUsuario.idPersona).subscribe(resultMail => {
            window.location.href = "mailto:" + resultMail[0].direccionMail + 
              "?subject=Rechazo SubProyecto " + nomProy + 
              "&body=Estimado, %0D%0DEl proyecto '" + nomProy + "' esta siendo rechazado por los siguientes motivos: %0D";
          });
        });
      }
      
      // Eliminar subproyecto (con o sin correo)
      this.eliminarSubProyecto(result);
      this.OcultarPopUpDetalle();
      this.Loading = false;
    });
  }

  // Enviar correo de validación
  private enviarCorreoValidacion(subProyecto: mSubProyecto) {
    this._sUsuario.getUsuariobyID(subProyecto.idUsuarioCreador).subscribe(usuario => {
      this._sMail.getMailbyidPersona(usuario.idPersona).subscribe(mails => {
        if (mails && mails.length > 0) {
          const mensaje = `
            <p>Estimado/a,</p>
            <p>Le informamos que el SubProyecto <strong>${subProyecto.nombreSubProyecto}</strong> ha sido <strong>validado exitosamente</strong>.</p>
            <p>Ya puede proceder con las siguientes etapas del proyecto.</p>
            <br>
            <p>Saludos cordiales</p>
          `;
          
          const correo = new mCorreo(
            mails[0].direccionMail,
            `SubProyecto Validado: ${subProyecto.nombreSubProyecto}`,
            mensaje
          );
          
          this._sCorreo.postCorreo(correo).subscribe(
            res => console.log('Correo de validación enviado'),
            err => console.error('Error al enviar correo:', err)
          );
        }
      });
    });
  }

  // Eliminar subproyecto (para rechazo sin correo)
  private eliminarSubProyecto(subProyecto: mSubProyecto) {
    subProyecto.activo = false;
    subProyecto.fechaRemocion = new Date().toISOString();
    subProyecto.idUsuarioRemovedor = this.usuario.idUsuario;
    
    this._sSubProyecto.postUpdDelSubProyecto(subProyecto).success(result => {
      this.Buscar();
      this.texto = "SubProyecto rechazado exitosamente";
      this.msg = true;
    });
  }

  //*************************************************** PopUP Confirm ***************************************************
  VerDetalle(i: number) {
    //this.IndexUpdate = i;
    this._sSubProyecto.getSubProyectobyID(this.SubProyectos[i].idSubProyecto).subscribe(result => {
      this._sVis_SubProyNoValidado.getVis_SubProyNoValidadobyID(this.SubProyectos[i].idSubProyecto).subscribe(result => {
        //console.log("Vista: ", result);
        this.Detalle.nombreProyectoMatriz = result.nombreProyectoMatriz;
        this.Detalle.nombreProyecto = result.nombreProyecto;
        this.Detalle.nombreSubProyecto = result.nombreSubProyecto;
        this.Detalle.nombreEstadoProyecto = result.nombreEstadoProyecto;
        this.Detalle.nombreTipoIntervencion = result.nombreTipoIntervencion;
        //console.log("Detalle SP: ", this.Detalle);
      })
      this.Detalle.idSubProyecto = result.idSubProyecto;
      this.Detalle.fechaInicio = result.fechaInicio;
      this.Detalle.fechaTermino = result.fechaTermino;
      this.Detalle.centroCosto = result.centroCosto;
      this.Detalle.costoEstimado = result.costoEstimado;
      //console.log("SP: ", result);



      // this.Detalle = result;
      //this.DetalleFaltante.nombreProyectoMatriz = this.Proyectos[i].nombreProyectoMatriz;
      // this.DetalleFaltante.NombrePais= this.
      // this._sRegion.getRegionbyID(result.idRegion).subscribe(result => {
      //   this.DetalleFaltante.nombreRegion = result.nombreRegion;
      //   this._sPais.getPaisbyID(result.idPais).subscribe(result => {
      //     this.DetalleFaltante.nombrePais = result.nombrePais;
      //   });

      // });

    });
    this._PopUps.VerPopUpEditar();
  }

  OcultarPopUpDetalle() {
    //this.IndexUpdate = 0;
    this._PopUps.OcultarPopUpEditar();
  }

}
