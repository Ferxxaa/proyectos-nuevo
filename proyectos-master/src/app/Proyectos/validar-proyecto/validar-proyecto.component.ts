import { Component, OnInit } from '@angular/core';

//Share
import { PopUps } from '../../Share/PopUps';

//Model
import { mVis_DirectorProyectoMatriz } from '../../models/mVis_DirectorProyectoMatriz';
import { mTabla_ProyectosNoValidados } from '../../models/mTabla_ProyectosNoValidados';
import { mProyecto } from '../../models/mProyecto';
import { mMail } from '../../models/mMail';
import { mCorreo } from '../../models/mCorreo';

//Servicio
import { sVis_DirectorProyectoMatriz } from '../../services/sVis_DirectorProyectoMatriz.service';
import { sTabla_ProyectosNoValidados } from '../../services/sTabla_ProyectosNoValidados.service';
import { sProyecto } from '../../services/sProyecto.service';
import { sPais } from '../../services/sPais.service';
import { sRegion } from '../../services/sRegion.service';
import { sMail } from '../../services/sMail.service';
import { sUsuario } from '../../services/sUsuario.service';
import { sCorreo } from '../../services/Personalizados/sCorreo.service';

@Component({
  selector: 'app-validar-proyecto',
  templateUrl: './validar-proyecto.component.html',
  styleUrls: ['./validar-proyecto.component.css'],
  providers: [
    sVis_DirectorProyectoMatriz,
    sTabla_ProyectosNoValidados,
    sProyecto,
    sPais,
    sRegion,
    PopUps,
    sMail,
    sUsuario,
    sCorreo
  ]
})
export class ValidarProyectoComponent implements OnInit {

  //Select
  ProyectosMatriz: Array<mVis_DirectorProyectoMatriz>;
  Proyectos: Array<mTabla_ProyectosNoValidados>;
  ProyectosFiltro: Array<mTabla_ProyectosNoValidados>;

  //Controles
  drdProyectoMatriz;
  drdProyecto;

  //Objetos
  usuario: any;
  Detalle: mProyecto;
  DetalleFaltante: any;

  //Loading;
  Loading: boolean;
  LoadingTabla: boolean;

  //Indices
  IndexUpdate: number;

  //Mensaje
  texto: string;
  msg: boolean;

  //Error
  error:string;

  //Variables para confirmación de correo
  accionPendiente: 'validar' | 'rechazar' | null = null;

  constructor(
    private _sVis_DirectorProyectoMatriz: sVis_DirectorProyectoMatriz,
    private _sTabla_ProyectosNoValidados: sTabla_ProyectosNoValidados,
    private _sProyecto: sProyecto,
    private _sPais: sPais,
    private _sRegion: sRegion,
    private _PopUps: PopUps,
    private _sMail: sMail,
    private _sUsuario: sUsuario,
    private _sCorreo: sCorreo
  ) {
    this.usuario = JSON.parse(localStorage.usuario);
    this.Loading = false;
    this.Detalle = new mProyecto(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    this.DetalleFaltante = { nombreProyectoMatriz: null, nombrePais: null, nombreRegion: null };
  }

  ngOnInit() {

    this._sVis_DirectorProyectoMatriz.getVis_DirectorProyectoMatriz().subscribe(
      result => {
        const matricesActivas = (result || []).filter(element => element.activo !== false);
        const matricesUnicas = new Map<number, mVis_DirectorProyectoMatriz>();

        matricesActivas.forEach(element => {
          if (!matricesUnicas.has(element.idProyectoMatriz)) {
            matricesUnicas.set(element.idProyectoMatriz, element);
          }
        });

        this.ProyectosMatriz = Array.from(matricesUnicas.values());
      }
    )

    this.Buscar();

    this.drdProyectoMatriz = 0;
  }

  //*************************************************** Filtros ***************************************************

  Buscar() {
    this.Proyectos = [];
    this.ProyectosFiltro = [];
    this.LoadingTabla = true;
    this._sTabla_ProyectosNoValidados.getTabla_ProyectosNoValidadosbyidUsuarioDirector(this.usuario.idUsuario).subscribe(
      result => {
        this.Proyectos = result;
        this.ProyectosFiltro = result;
        if (this.drdProyectoMatriz > 0) {
          this.Proyectos = this.Proyectos.filter(element => { return element.idProyectoMatriz == this.drdProyectoMatriz; })
          this.ProyectosFiltro = this.ProyectosFiltro.filter(element => { return element.idProyectoMatriz == this.drdProyectoMatriz; })
        }
        if (this.drdProyecto > 0) {
          this.Proyectos = this.Proyectos.filter(element => { return element.idProyecto == this.drdProyecto; })
        }
        this.LoadingTabla = false;
      }
    )
  }

  CambioProyectoMatriz() {
    this.drdProyecto = 0;
    this.Buscar();
  }

  LimpiarFiltros() {
    this.drdProyectoMatriz = 0;
    this.drdProyecto = 0;
    this.Buscar();
  }

  Filtro(element: mTabla_ProyectosNoValidados) {
    if (element.idProyectoMatriz == this.drdProyectoMatriz) {
      return true;
    }
    else {
      return false;
    }
  }

  //*************************************************** CRUD ***************************************************

  Agregar(Form){

  }

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
    this.Detalle.validado = true;

    this._sProyecto.postUpdDelProyecto(this.Detalle).success(result => {
      
      // Si se solicitó enviar correo, enviarlo
      if (enviarCorreo) {
        this.enviarCorreoValidacion(this.Detalle);
      }

      this.Loading = false;
      this.Detalle = new mProyecto(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
      this.DetalleFaltante = { nombreProyectoMatriz: null, nombrePais: null, nombreRegion: null };
      this.Buscar();
      this.OcultarPopUpDetalle();
      this.texto = "Proyecto validado de forma exitosa" + (enviarCorreo ? " y correo enviado" : "");
      this.msg = true;
    });
  }

  // Ejecutar rechazo
  private EjecutarRechazo(enviarCorreo: boolean) {
    this.texto = "";
    this.msg = false;
    this.Loading = true;
    
    // Guardar información antes de modificar
    let nomProy: string = this.Detalle.nombreProyecto;
    let idCreador: number = this.Detalle.idUsuarioCreador;
    
    // Marcar el proyecto como rechazado/eliminado
    this.Detalle.activo = false;
    this.Detalle.validado = false;
    this.Detalle.idUsuarioRemovedor = this.usuario.idUsuario;
    this.Detalle.fechaRemocion = new Date().toISOString();

    this._sProyecto.postUpdDelProyecto(this.Detalle).success(result => {
      
      if (enviarCorreo) {
        this.EnviarCorreoRechazo(idCreador, nomProy);
      }

      this.Loading = false;
      this.Detalle = new mProyecto(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
      this.DetalleFaltante = { nombreProyectoMatriz: null, nombrePais: null, nombreRegion: null };
      this.Buscar();
      this.OcultarPopUpDetalle();
      this.texto = "Proyecto rechazado de forma exitosa";
      this.msg = true;
    });
  }

  // Enviar correo de validación
  private enviarCorreoValidacion(proyecto: mProyecto) {
    this._sUsuario.getUsuariobyID(proyecto.idUsuarioCreador).subscribe(usuario => {
      this._sMail.getMailbyidPersona(usuario.idPersona).subscribe(mails => {
        if (mails && mails.length > 0) {
          const mensaje = `
            <p>Estimado/a,</p>
            <p>Le informamos que el Proyecto <strong>${proyecto.nombreProyecto}</strong> ha sido <strong>validado exitosamente</strong>.</p>
            <p>Ya puede proceder con las siguientes etapas del proyecto.</p>
            <br>
            <p>Saludos cordiales</p>
          `;
          
          const correo = new mCorreo(
            mails[0].direccionMail,
            `Proyecto Validado: ${proyecto.nombreProyecto}`,
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

  EnviarCorreoRechazo(idUsuarioCreador: number, nombreProyecto: string) {
    this._sUsuario.getUsuariobyID(idUsuarioCreador).subscribe(result => {
      this._sMail.getMailbyidPersona(result.idPersona).subscribe(result => {
        window.location.href = "mailto:" + result[0].direccionMail + "?subject=Rechazo proyecto " + nombreProyecto + "&body=Estimado, %0D%0DEl proyecto '" + nombreProyecto + "' ha sido rechazado por los siguientes motivos: %0D";
      });
    });
  }

  //*************************************************** PopUP Confirm ***************************************************

  VerDetalle(i: number) {
    this.IndexUpdate = i;
    this._sProyecto.getProyectobyID(this.Proyectos[i].idProyecto).subscribe(result => {

      this.Detalle = result;
      this.DetalleFaltante.nombreProyectoMatriz = this.Proyectos[i].nombreProyectoMatriz;
      // this.DetalleFaltante.NombrePais= this.
      this._sRegion.getRegionbyID(result.idRegion).subscribe(result => {
        this.DetalleFaltante.nombreRegion = result.nombreRegion;
        this._sPais.getPaisbyID(result.idPais).subscribe(result => {
          this.DetalleFaltante.nombrePais = result.nombrePais;
        });

      });

    });
    this._PopUps.VerPopUpEditar();
  }

  OcultarPopUpDetalle() {
    this.IndexUpdate = 0;
    this._PopUps.OcultarPopUpEditar();
  }

}
