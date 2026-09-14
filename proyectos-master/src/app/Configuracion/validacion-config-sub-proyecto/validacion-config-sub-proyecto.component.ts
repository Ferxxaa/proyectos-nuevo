import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

//Share
import { PopUps } from '../../Share/PopUps';

//Model
import { mVis_ProyectosMatrizCoordinador } from '../../models/mVis_ProyectosMatrizCoordinador';
import { mProyecto } from '../../models/mProyecto';
import { mSubProyecto } from '../../models/mSubProyecto';
import { mDetalleSubProyecto } from '../../models/mDetalleSubProyecto';

//Servicios
import { sVis_ProyectosMatrizCoordinador } from '../../services/sVis_ProyectosMatrizCoordinador.service';
import { sProyecto } from '../../services/sProyecto.service';
import { sSubProyecto } from '../../services/sSubProyecto.service';
import { sDetalleSubProyecto } from '../../services/sDetalleSubProyecto.service';
import { sUsuario } from '../../services/sUsuario.service';
import { sMail } from '../../services/sMail.service';
import { sCorreo } from '../../services/Personalizados/sCorreo.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { sPerfil } from '../../services/sPerfil.service';

declare var Swal: any;

@Component({
  selector: 'app-validacion-config-sub-proyecto',
  templateUrl: './validacion-config-sub-proyecto.component.html',
  styleUrls: ['./validacion-config-sub-proyecto.component.css'],
  providers: [
    sVis_ProyectosMatrizCoordinador,
    sProyecto,
    sSubProyecto,
    sDetalleSubProyecto,
    sUsuario,
    sMail,
    sCorreo,
    NotificacionesService,
    sUsuariosPerfiles,
    sPerfil
  ]
})
export class ValidacionConfigSubProyectoComponent implements OnInit {

  //Select
  ProyectosMatriz: Array<mVis_ProyectosMatrizCoordinador>;
  Proyectos: Array<mProyecto>;
  SubProyectos: Array<mSubProyecto>;

  //Control
  drdProyectoMatriz;
  drdProyecto;
  drdSubProyecto;

  //Ponderado
  sumPonderado;

  //Objetos
  usuario: any;
  SubProyecto: mSubProyecto;
  Requerimiento: mDetalleSubProyecto;
  NBI1: mDetalleSubProyecto;
  Factibilidad: mDetalleSubProyecto;
  NBI2: mDetalleSubProyecto;
  Layout: mDetalleSubProyecto;
  NBI3: mDetalleSubProyecto;
  Proyecto: mDetalleSubProyecto;
  NBI4: mDetalleSubProyecto;
  Licitacion: mDetalleSubProyecto;
  Adjudicacion: mDetalleSubProyecto;
  NBI5: mDetalleSubProyecto;
  Construccion: mDetalleSubProyecto;
  Habilitacion: mDetalleSubProyecto;
  NBI6: mDetalleSubProyecto;
  Contratista: mDetalleSubProyecto;
  Cliente: mDetalleSubProyecto;
  Mantencion: mDetalleSubProyecto;
  NBI7: mDetalleSubProyecto;

  //TablaFechas
  Inicios: Array<any>;
  Terminos: Array<any>;

  //Loading
  Loading: boolean;
  LoadingTabla: boolean;
  validando: boolean;

  //ValidacionUpd
  Update: boolean;

  //PopUp
  texto: string;
  msg: boolean;

  constructor(
    private _sVis_ProyectosMatrizCoordinador: sVis_ProyectosMatrizCoordinador,
    private _sProyecto: sProyecto,
    private _sSubProyecto: sSubProyecto,
    private _sDetalleSubProyecto: sDetalleSubProyecto,
    private _sUsuario: sUsuario,
    private _sMail: sMail,
    private _notificacionesService: NotificacionesService,
    private _sUsuariosPerfiles: sUsuariosPerfiles,
    private _sPerfil: sPerfil,
    private route: ActivatedRoute
  ) {
    this.validando = true;
    this.ResetDrd();
    this.usuario = JSON.parse(localStorage.usuario);


    this.ResetForm();

    //Update
    this.Update = false;

    this.SubProyecto = new mSubProyecto(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
  }

  ngOnInit() {
    this._sVis_ProyectosMatrizCoordinador.getVis_ProyectosMatrizCoordinadorbyidUsuarioCoordinador(this.usuario.idUsuario).subscribe(
      result => {
        this.ProyectosMatriz = result;
        
        // Generar notificaciones automáticas para subproyectos pendientes
        this.generarNotificacionesSubproyectosPendientes();
        
        // Verificar si hay parámetros de query para autoseleccionar subproyecto
        this.route.queryParams.subscribe(params => {
          if (params.subproyecto && params.autoselect === 'true') {
            console.log('🎯 Autoseleccionando subproyecto desde notificación:', params.subproyecto);
            this.autoseleccionarSubproyecto(parseInt(params.subproyecto));
          }
        });
      }
    );
  }

  CargaProyectos() {
    this.ResetForm();
    this.drdProyecto = 0;
    if (this.drdProyectoMatriz > 0) {
      this._sProyecto.getProyectobyidProyectoMatriz(this.drdProyectoMatriz).subscribe(
        result => {
          this.Proyectos = result;
        }
      );
    }

  }

  CargaSubProyectos() {
    this.ResetForm();
    this.drdSubProyecto = 0;
    if (this.drdProyectoMatriz > 0) {
      this._sSubProyecto.getSubProyectobyidProyecto(this.drdProyecto).subscribe(
        result => {

          this.SubProyectos = result.filter(el => el.idEstadoProyecto == 4);
        }
      )
    }
  }

  CargaDatosSubProyecto() {
    this.ResetForm();
    if (this.drdSubProyecto > 0) {
      this._sSubProyecto.getSubProyectobyID(this.drdSubProyecto).subscribe(
        result => { 
          this.SubProyecto = result; 
          this.CargaFecha(); 
          
          // Si el subproyecto está en estado de validación pendiente (idEstadoProyecto == 4)
          // notificar a los roles correspondientes
          if (result.idEstadoProyecto == 4) {
            this.notificarCambioRitmoParaValidar();
            this.notificarValidacionMatriz();
            this.notificarValidacionProyecto();
          }
        }
      );
      this.CargaDatosSP();
    }
  }

  CargaDatosSP() {
    this.Loading = true;
    this.ResetForm();
    this.AsignaSPaDetalle();
    this._sDetalleSubProyecto.getDetalleSubProyectobyidSubProyecto(this.drdSubProyecto).subscribe(
      result => {
        if (result.length > 0) {

          this.Requerimiento = result[0];
          this.NBI1 = result[1];
          this.Factibilidad = result[2];
          this.NBI2 = result[3];
          this.Layout = result[4];
          this.NBI3 = result[5];
          this.Proyecto = result[6];
          this.NBI4 = result[7];
          this.Licitacion = result[8];
          this.Adjudicacion = result[9];
          this.NBI5 = result[10];
          this.Construccion = result[11];
          this.Habilitacion = result[12];
          this.NBI6 = result[13];
          this.Contratista = result[14];
          this.Cliente = result[15];
          this.Mantencion = result[16];
          this.NBI7 = result[17];

          this.CargaFecha();
          this.SumaPonderado();
          this.Loading = false;
        }
      }
    );
  }

  private ResetForm() {
    this.sumPonderado = 0;

    this.Requerimiento = new mDetalleSubProyecto(null, null, 1, 0, 0, 0, true, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI1 = new mDetalleSubProyecto(null, null, 2, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Factibilidad = new mDetalleSubProyecto(null, null, 3, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI2 = new mDetalleSubProyecto(null, null, 4, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Layout = new mDetalleSubProyecto(null, null, 5, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI3 = new mDetalleSubProyecto(null, null, 6, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Proyecto = new mDetalleSubProyecto(null, null, 7, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI4 = new mDetalleSubProyecto(null, null, 8, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Licitacion = new mDetalleSubProyecto(null, null, 9, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Adjudicacion = new mDetalleSubProyecto(null, null, 10, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI5 = new mDetalleSubProyecto(null, null, 11, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Construccion = new mDetalleSubProyecto(null, null, 12, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Habilitacion = new mDetalleSubProyecto(null, null, 13, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI6 = new mDetalleSubProyecto(null, null, 14, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Contratista = new mDetalleSubProyecto(null, null, 15, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Cliente = new mDetalleSubProyecto(null, null, 16, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.Mantencion = new mDetalleSubProyecto(null, null, 17, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);
    this.NBI7 = new mDetalleSubProyecto(null, null, 18, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, this.usuario.idUsuario, null);

    this.Inicios = [null, null, null, null, null, null, null, null, null, null, null];
    this.Terminos = [null, null, null, null, null, null, null, null, null, null, null];
  }

  private ResetDrd() {
    this.drdProyectoMatriz = 0;
    this.drdProyecto = 0;
    this.drdSubProyecto = 0;
  }

  LimpiarFiltros() {
    this.ResetDrd();
    this.Proyectos = [];
    this.SubProyectos = [];
    this.ResetForm();
  }

  CargaFecha() {
    for (let i = 0; i < 11; i++) {
      this.Inicios[i] = new Date(this.SubProyecto.fechaInicio);
      this.Terminos[i] = new Date(this.SubProyecto.fechaInicio);
    }
    //Requerimiento
    this.Terminos[0].setDate(this.Terminos[0].getDate() + this.Requerimiento.duracion);
    //Factibilidad
    this.Inicios[1].setFullYear(this.Terminos[0].getFullYear());
    this.Inicios[1].setMonth(this.Terminos[0].getMonth());
    this.Inicios[1].setDate(this.Terminos[0].getDate() + this.NBI1.duracion);

    this.Terminos[1].setFullYear(this.Inicios[1].getFullYear());
    this.Terminos[1].setMonth(this.Inicios[1].getMonth());
    this.Terminos[1].setDate(this.Inicios[1].getDate() + this.Factibilidad.duracion);
    //LayOut
    this.Inicios[2].setFullYear(this.Terminos[1].getFullYear());
    this.Inicios[2].setMonth(this.Terminos[1].getMonth());
    this.Inicios[2].setDate(this.Terminos[1].getDate() + this.NBI2.duracion);

    this.Terminos[2].setFullYear(this.Inicios[2].getFullYear());
    this.Terminos[2].setMonth(this.Inicios[2].getMonth());
    this.Terminos[2].setDate(this.Inicios[2].getDate() + this.Layout.duracion);
    //Proyecto
    this.Inicios[3].setFullYear(this.Terminos[2].getFullYear());
    this.Inicios[3].setMonth(this.Terminos[2].getMonth());
    this.Inicios[3].setDate(this.Terminos[2].getDate() + this.NBI3.duracion);

    this.Terminos[3].setFullYear(this.Inicios[3].getFullYear());
    this.Terminos[3].setMonth(this.Inicios[3].getMonth());
    this.Terminos[3].setDate(this.Inicios[3].getDate() + this.Proyecto.duracion);
    //Licitacion
    this.Inicios[4].setFullYear(this.Terminos[3].getFullYear());
    this.Inicios[4].setMonth(this.Terminos[3].getMonth());
    this.Inicios[4].setDate(this.Terminos[3].getDate() + this.NBI4.duracion);

    this.Terminos[4].setFullYear(this.Inicios[4].getFullYear());
    this.Terminos[4].setMonth(this.Inicios[4].getMonth());
    this.Terminos[4].setDate(this.Inicios[4].getDate() + this.Licitacion.duracion);
    //Adjudicación
    this.Inicios[5].setFullYear(this.Terminos[4].getFullYear());
    this.Inicios[5].setMonth(this.Terminos[4].getMonth());
    this.Inicios[5].setDate(this.Terminos[4].getDate());

    this.Terminos[5].setFullYear(this.Inicios[5].getFullYear());
    this.Terminos[5].setMonth(this.Inicios[5].getMonth());
    this.Terminos[5].setDate(this.Inicios[5].getDate() + this.Adjudicacion.duracion);
    //Construcción
    this.Inicios[6].setFullYear(this.Terminos[5].getFullYear());
    this.Inicios[6].setMonth(this.Terminos[5].getMonth());
    this.Inicios[6].setDate(this.Terminos[5].getDate() + this.NBI5.duracion);

    this.Terminos[6].setFullYear(this.Inicios[6].getFullYear());
    this.Terminos[6].setMonth(this.Inicios[6].getMonth());
    this.Terminos[6].setDate(this.Inicios[6].getDate() + this.Construccion.duracion);
    //Habilitación
    this.Inicios[7].setFullYear(this.Terminos[6].getFullYear());
    this.Inicios[7].setMonth(this.Terminos[6].getMonth());
    this.Inicios[7].setDate(this.Terminos[6].getDate());

    this.Terminos[7].setFullYear(this.Inicios[7].getFullYear());
    this.Terminos[7].setMonth(this.Inicios[7].getMonth());
    this.Terminos[7].setDate(this.Inicios[7].getDate() + this.Habilitacion.duracion);
    //Cierre Contratista
    this.Inicios[8].setFullYear(this.Terminos[7].getFullYear());
    this.Inicios[8].setMonth(this.Terminos[7].getMonth());
    this.Inicios[8].setDate(this.Terminos[7].getDate() + this.NBI6.duracion);

    this.Terminos[8].setFullYear(this.Inicios[8].getFullYear());
    this.Terminos[8].setMonth(this.Inicios[8].getMonth());
    this.Terminos[8].setDate(this.Inicios[8].getDate() + this.Contratista.duracion);
    //Cierre Cliente
    this.Inicios[9].setFullYear(this.Terminos[8].getFullYear());
    this.Inicios[9].setMonth(this.Terminos[8].getMonth());
    this.Inicios[9].setDate(this.Terminos[8].getDate());

    this.Terminos[9].setFullYear(this.Inicios[9].getFullYear());
    this.Terminos[9].setMonth(this.Inicios[9].getMonth());
    this.Terminos[9].setDate(this.Inicios[9].getDate() + this.Cliente.duracion);
    //Cierre Mantención
    this.Inicios[10].setFullYear(this.Terminos[9].getFullYear());
    this.Inicios[10].setMonth(this.Terminos[9].getMonth());
    this.Inicios[10].setDate(this.Terminos[9].getDate());

    this.Terminos[10].setFullYear(this.Inicios[10].getFullYear());
    this.Terminos[10].setMonth(this.Inicios[10].getMonth());
    this.Terminos[10].setDate(this.Inicios[10].getDate() + this.Mantencion.duracion);
  }

  SumaPonderado() {
    this.sumPonderado = this.Requerimiento.ponderado + this.Factibilidad.ponderado + this.Layout.ponderado + this.Proyecto.ponderado + this.Licitacion.ponderado + this.Adjudicacion.ponderado + this.Construccion.ponderado + this.Habilitacion.ponderado + this.Contratista.ponderado + this.Cliente.ponderado + this.Mantencion.ponderado;
  }

  AsignaSPaDetalle() {
    this.Requerimiento.idSubProyecto = this.drdSubProyecto;
    this.NBI1.idSubProyecto = this.drdSubProyecto;
    this.Factibilidad.idSubProyecto = this.drdSubProyecto;
    this.NBI2.idSubProyecto = this.drdSubProyecto;
    this.Layout.idSubProyecto = this.drdSubProyecto;
    this.NBI3.idSubProyecto = this.drdSubProyecto;
    this.Proyecto.idSubProyecto = this.drdSubProyecto;
    this.NBI4.idSubProyecto = this.drdSubProyecto;
    this.Licitacion.idSubProyecto = this.drdSubProyecto;
    this.Adjudicacion.idSubProyecto = this.drdSubProyecto;
    this.NBI5.idSubProyecto = this.drdSubProyecto;
    this.Construccion.idSubProyecto = this.drdSubProyecto;
    this.Habilitacion.idSubProyecto = this.drdSubProyecto;
    this.NBI6.idSubProyecto = this.drdSubProyecto;
    this.Contratista.idSubProyecto = this.drdSubProyecto;
    this.Cliente.idSubProyecto = this.drdSubProyecto;
    this.Mantencion.idSubProyecto = this.drdSubProyecto;
    this.NBI7.idSubProyecto = this.drdSubProyecto;
  }

  cargaSubProyecto(e: mSubProyecto) {
    // console.log(e.idSubProyecto);
    this.SubProyecto = e;
    this.drdSubProyecto = e.idSubProyecto;
    console.log(this.drdSubProyecto);
    this.CargaDatosSP();
  }

  // Método para autoseleccionar subproyecto desde notificación
  private async autoseleccionarSubproyecto(idSubProyecto: number) {
    try {
      console.log('🔍 Buscando datos del subproyecto:', idSubProyecto);
      
      // Obtener datos del subproyecto
      const subproyecto = await this._sSubProyecto.getSubProyectobyID(idSubProyecto).toPromise();
      if (!subproyecto) {
        console.error('❌ Subproyecto no encontrado');
        return;
      }

      // Obtener proyecto
      const proyecto = await this._sProyecto.getProyectobyID(subproyecto.idProyecto).toPromise();
      if (!proyecto) {
        console.error('❌ Proyecto no encontrado');
        return;
      }

      console.log('📋 Configurando dropdowns automáticamente...');
      
      // Configurar los dropdowns en orden
      this.drdProyectoMatriz = proyecto.idProyectoMatriz;
      
      // Cargar proyectos de esa matriz
      await this._sProyecto.getProyectobyidProyectoMatriz(proyecto.idProyectoMatriz).toPromise().then(proyectos => {
        this.Proyectos = proyectos;
        this.drdProyecto = proyecto.idProyecto;
      });

      // Cargar subproyectos de ese proyecto
      await this._sSubProyecto.getSubProyectobyidProyecto(proyecto.idProyecto).toPromise().then(subproyectos => {
        this.SubProyectos = subproyectos.filter(el => el.idEstadoProyecto == 4);
        this.drdSubProyecto = idSubProyecto;
      });

      // Cargar datos del subproyecto
      this.SubProyecto = subproyecto;
      this.CargaDatosSP();

      console.log('✅ Subproyecto autoseleccionado correctamente');

    } catch (error) {
      console.error('❌ Error al autoseleccionar subproyecto:', error);
    }
  }

  //*************************************************** Notificaciones ***************************************************
  
  /**
   * 📋 CONFIGURACIÓN DE NOTIFICACIONES POR ROLES
   * 
   * 🎯 cambio de ritmo por validar     → Director
   * 🎯 ritmo validado o rechazado      → Coordinador  
   * 🎯 validación matriz               → Sub-Gerente
   * 🎯 validación proyecto             → Sub-Gerente
   * 🎯 resultado validación matriz/proyecto → Coordinador
   * 🎯 carga de archivos bitácora      → Coordinador + Director + Sub-Gerente
   */

  private async getUsersByRole(roleName: string): Promise<any[]> {
    try {
      console.log(`🔍 Buscando usuarios con rol: ${roleName}`);
      
      // Mapeo de roles alternativos en caso de que el rol principal no exista
      const roleAlternatives = {
        'Sub-Gerente': ['Gerente', 'Director', 'Administrador'],
        'Director': ['Gerente', 'Administrador'],
        'Coordinador': ['Director', 'Gerente']
      };
      
      // Intentar con el rol principal primero
      const usuarios = await this.buscarUsuariosPorRol(roleName);
      if (usuarios.length > 0) {
        return usuarios;
      }
      
      // Si no se encuentra el rol principal, intentar con alternativas
      if (roleAlternatives[roleName]) {
        console.log(`⚠️ Rol "${roleName}" no encontrado, probando roles alternativos...`);
        
        for (const alternativeRole of roleAlternatives[roleName]) {
          console.log(`🔄 Intentando rol alternativo: ${alternativeRole}`);
          const usuariosAlternativos = await this.buscarUsuariosPorRol(alternativeRole);
          if (usuariosAlternativos.length > 0) {
            console.log(`✅ Usando rol alternativo "${alternativeRole}" con ${usuariosAlternativos.length} usuarios`);
            return usuariosAlternativos;
          }
        }
      }
      
      console.warn(`⚠️ No se encontraron usuarios para el rol "${roleName}" ni sus alternativas`);
      return [];
    } catch (error) {
      console.error(`❌ Error general al obtener usuarios con rol ${roleName}:`, error);
      return [];
    }
  }

  private async buscarUsuariosPorRol(roleName: string): Promise<any[]> {
    try {
      // Primero obtenemos el perfil por nombre
      const perfiles = await this._sPerfil.getPerfilbynombrePerfil(roleName)
        .toPromise()
        .catch(error => {
          if (error.status === 500) {
            console.warn(`⚠️ Error del servidor al buscar perfil "${roleName}"`);
          } else {
            console.warn(`⚠️ Perfil "${roleName}" no encontrado:`, error.message || 'Sin detalles');
          }
          return null;
        });
        
      if (perfiles && perfiles.length > 0) {
        const idPerfil = perfiles[0].idPerfil;
        console.log(`✅ Perfil "${roleName}" encontrado con ID: ${idPerfil}`);
        
        // Luego obtenemos los usuarios con ese perfil
        const usuariosPerfiles = await this._sUsuariosPerfiles.getUsuariosPerfilesbyidPerfil(idPerfil)
          .toPromise()
          .catch(error => {
            console.warn(`⚠️ No se pudieron obtener usuarios del perfil ${idPerfil}:`, error.message);
            return [];
          });
        
        // Obtenemos los detalles de cada usuario
        const usuarios = [];
        for (const usuarioPerfil of usuariosPerfiles || []) {
          if (usuarioPerfil.activo) {
            try {
              const usuarioResponse = await this._sUsuario.getUsuariobyidUsuario(usuarioPerfil.idUsuario).toPromise();
              const usuario = Array.isArray(usuarioResponse)
                ? (usuarioResponse.length > 0 ? usuarioResponse[0] : null)
                : usuarioResponse;
              if (usuario) {
                usuarios.push(usuario);
              }
            } catch (userError) {
              console.warn(`⚠️ Error al obtener detalles del usuario ${usuarioPerfil.idUsuario}:`, userError.message);
            }
          }
        }
        
        console.log(`✅ Encontrados ${usuarios.length} usuarios activos con rol "${roleName}"`);
        return usuarios;
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Error al buscar usuarios por rol ${roleName}:`, error);
      return [];
    }
  }

  private async enviarNotificacionesAUsuarios(usuarios: any[], tipo: 'ritmo' | 'validacion' | 'bitacora', titulo: string, descripcion: string, enlace?: string) {
    for (const usuario of usuarios) {
      this._notificacionesService.crearNotificacionPersonalizada(
        usuario.idUsuario,
        tipo,
        titulo,
        descripcion,
        'alta',
        enlace || '/Proyectos-MisProyectos'
      );
    }
  }

  private async notificarCambioRitmoParaValidar() {
    // Notificar a Directores cuando hay un cambio de ritmo por validar
    const directores = await this.getUsersByRole('Director');
    if (directores.length > 0) {
      const titulo = 'Cambio de ritmo por validar';
      const descripcion = `El SubProyecto "${this.SubProyecto.nombreSubProyecto}" requiere validación de ritmo.`;
      await this.enviarNotificacionesAUsuarios(directores, 'ritmo', titulo, descripcion, '/Configuracion-ValidacionSubProyecto');
    }
  }

  private async notificarValidacionMatriz() {
    // Notificar a Sub-Gerentes cuando se requiere validación de matriz
    const subGerentes = await this.getUsersByRole('Sub-Gerente');
    if (subGerentes.length > 0) {
      const titulo = 'Validación de matriz requerida';
      const descripcion = `El SubProyecto "${this.SubProyecto.nombreSubProyecto}" requiere validación de matriz.`;
      await this.enviarNotificacionesAUsuarios(subGerentes, 'validacion', titulo, descripcion, '/Proyectos-ValidarProyecto');
    }
  }

  private async notificarValidacionProyecto() {
    // Notificar a Sub-Gerentes cuando se requiere validación de proyecto
    const subGerentes = await this.getUsersByRole('Sub-Gerente');
    if (subGerentes.length > 0) {
      const titulo = 'Validación de proyecto requerida';
      const descripcion = `El SubProyecto "${this.SubProyecto.nombreSubProyecto}" requiere validación de proyecto.`;
      await this.enviarNotificacionesAUsuarios(subGerentes, 'validacion', titulo, descripcion, '/Proyectos-ValidarSubProyectos');
    }
  }

  private async notificarResultadoValidacion(tipo: 'matriz' | 'proyecto', aprobado: boolean) {
    // Notificar a Coordinadores sobre el resultado de la validación
    const coordinadores = await this.getUsersByRole('Coordinador');
    if (coordinadores.length > 0) {
      const estado = aprobado ? 'aprobada' : 'rechazada';
      const titulo = `Validación de ${tipo} ${estado}`;
      const descripcion = `La validación de ${tipo} del SubProyecto "${this.SubProyecto.nombreSubProyecto}" ha sido ${estado}.`;
      await this.enviarNotificacionesAUsuarios(coordinadores, 'validacion', titulo, descripcion, '/Proyectos-MisProyectos');
    }
  }

  /**
   * Notifica a múltiples roles cuando se cargan archivos en bitácora
   * Roles notificados: Coordinador + Director + Sub-Gerente
   */
  private async notificarCargaArchivosBitacora(nombreArchivo?: string, observaciones?: string) {
    console.log('🔔 Notificando carga de archivos en bitácora...');
    
    try {
      // Obtener usuarios de los tres roles simultáneamente
      const [coordinadores, directores, subGerentes] = await Promise.all([
        this.getUsersByRole('Coordinador'),
        this.getUsersByRole('Director'),  
        this.getUsersByRole('Sub-Gerente')
      ]);

      // Combinar todos los usuarios únicos
      const todosLosUsuarios = [...coordinadores, ...directores, ...subGerentes];
      const usuariosUnicos = todosLosUsuarios.filter((usuario, index, self) => 
        index === self.findIndex(u => u.idUsuario === usuario.idUsuario)
      );

      if (usuariosUnicos.length > 0) {
        const titulo = 'Archivo cargado en bitácora';
        const archivoInfo = nombreArchivo ? ` (${nombreArchivo})` : '';
        const obsInfo = observaciones ? ` Observaciones: ${observaciones}` : '';
        const descripcion = `Se ha cargado un nuevo archivo en la bitácora del SubProyecto "${this.SubProyecto.nombreSubProyecto}"${archivoInfo}.${obsInfo}`;
        
        await this.enviarNotificacionesAUsuarios(usuariosUnicos, 'bitacora', titulo, descripcion, '/Proyecto-TableroControl');
        
        console.log(`✅ Notificación de bitácora enviada a ${usuariosUnicos.length} usuarios (${coordinadores.length} coordinadores, ${directores.length} directores, ${subGerentes.length} sub-gerentes)`);
      } else {
        console.warn('⚠️ No se encontraron usuarios para notificar carga de bitácora');
      }
    } catch (error) {
      console.error('❌ Error al notificar carga de archivos en bitácora:', error);
    }
  }

  /**
   * 🔧 MÉTODO PÚBLICO PARA ACTIVAR NOTIFICACIONES ESPECÍFICAS
   * Permite activar notificaciones desde componentes externos o eventos específicos
   */
  public async activarNotificacion(tipo: 'cambio-ritmo' | 'ritmo-validado' | 'ritmo-rechazado' | 'validacion-matriz' | 'validacion-proyecto' | 'resultado-matriz' | 'resultado-proyecto' | 'carga-bitacora', datos?: any) {
    console.log(`🔔 Activando notificación: ${tipo}`, datos);
    
    try {
      switch (tipo) {
        case 'cambio-ritmo':
          await this.notificarCambioRitmoParaValidar();
          break;
          
        case 'ritmo-validado':
          const coordinadoresValidado = await this.getUsersByRole('Coordinador');
          if (coordinadoresValidado.length > 0) {
            const titulo = 'Ritmo validado';
            const nombreSubproyecto = (this.SubProyecto && this.SubProyecto.nombreSubProyecto) ? this.SubProyecto.nombreSubProyecto : (datos && datos.nombreSubproyecto) ? datos.nombreSubproyecto : 'Subproyecto';
            const descripcion = `El ritmo del SubProyecto "${nombreSubproyecto}" ha sido validado correctamente.`;
            await this.enviarNotificacionesAUsuarios(coordinadoresValidado, 'ritmo', titulo, descripcion, '/Proyectos-MisProyectos');
          }
          break;
          
        case 'ritmo-rechazado':
          const coordinadoresRechazado = await this.getUsersByRole('Coordinador');
          if (coordinadoresRechazado.length > 0) {
            const titulo = 'Ritmo rechazado';
            const nombreSubproyectoRechazado = (this.SubProyecto && this.SubProyecto.nombreSubProyecto) ? this.SubProyecto.nombreSubProyecto : (datos && datos.nombreSubproyecto) ? datos.nombreSubproyecto : 'Subproyecto';
            const descripcion = `El ritmo del SubProyecto "${nombreSubproyectoRechazado}" ha sido rechazado.`;
            await this.enviarNotificacionesAUsuarios(coordinadoresRechazado, 'ritmo', titulo, descripcion, '/Proyectos-MisProyectos');
          }
          break;
          
        case 'validacion-matriz':
          await this.notificarValidacionMatriz();
          break;
          
        case 'validacion-proyecto':
          await this.notificarValidacionProyecto();
          break;
          
        case 'resultado-matriz':
          const aprobadoMatriz = (datos && datos.aprobado !== undefined) ? datos.aprobado : false;
          await this.notificarResultadoValidacion('matriz', aprobadoMatriz);
          break;
          
        case 'resultado-proyecto':
          const aprobadoProyecto = (datos && datos.aprobado !== undefined) ? datos.aprobado : false;
          await this.notificarResultadoValidacion('proyecto', aprobadoProyecto);
          break;
          
        case 'carga-bitacora':
          const nombreArchivo = (datos && datos.nombreArchivo) ? datos.nombreArchivo : undefined;
          const observaciones = (datos && datos.observaciones) ? datos.observaciones : undefined;
          await this.notificarCargaArchivosBitacora(nombreArchivo, observaciones);
          break;
          
        default:
          console.warn(`⚠️ Tipo de notificación no reconocido: ${tipo}`);
      }
      
      console.log(`✅ Notificación "${tipo}" activada correctamente`);
    } catch (error) {
      console.error(`❌ Error al activar notificación "${tipo}":`, error);
    }
  }

  //*************************************************** Validacion ***************************************************

  Validar() {
    this.validando = false;
    this.texto = "";
    this.msg = false;

    this.Loading = true;

    this._sSubProyecto.getSubProyectobyID(this.drdSubProyecto).subscribe(result => {

      let SubProyectoAnterior = {...result}; // Guardar estado anterior
      let SubProyecto;
      SubProyecto = result;

      //Ritmos
      SubProyecto.ritmoValidado = true;
      SubProyecto.fechaRitmoValidado = new Date();
      SubProyecto.idUsuarioRitmoValidado = this.usuario.idUsuario;

      //Ponderados
      SubProyecto.ponderadoValidado = true;
      SubProyecto.fechaPonderadoValidado = new Date();
      SubProyecto.idUsuarioPonderadoValidado = this.usuario.idUsuario;

      //Presupuesto
      SubProyecto.presupuestoValidado = true;
      SubProyecto.fechaPresupuestoValidado = new Date();
      SubProyecto.idUsuarioPresupuestoValidado = this.usuario.idUsuario;

      this._sSubProyecto.postUpdDelSubProyecto(SubProyecto).success(async result => {
        console.log('✅ Subproyecto validado exitosamente:', result);
        
        // 🔥 DETECTAR Y NOTIFICAR CAMBIOS DE RITMO AUTOMÁTICAMENTE
        this._notificacionesService.detectarCambiosRitmoValidacion(SubProyectoAnterior, SubProyecto, this.usuario);
        
        // 🔥 NOTIFICAR VALIDACIÓN DE MATRIZ Y PROYECTO AUTOMÁTICAMENTE 
        this._notificacionesService.detectarValidacionMatrizProyecto(SubProyecto, this.usuario, 'matriz');
        this._notificacionesService.detectarValidacionMatrizProyecto(SubProyecto, this.usuario, 'proyecto');
        
        // Notificar a coordinadores que el ritmo fue validado (método legacy)
        const coordinadores = await this.getUsersByRole('Coordinador');
        if (coordinadores.length > 0) {
          const titulo = 'Ritmo validado';
          const descripcion = `El ritmo del SubProyecto "${SubProyecto.nombreSubProyecto}" ha sido validado correctamente.`;
          await this.enviarNotificacionesAUsuarios(coordinadores, 'ritmo', titulo, descripcion, '/Proyectos-MisProyectos');
        }
        
        // Notificar también sobre validaciones de matriz y proyecto aprobadas (método legacy)
        await this.notificarResultadoValidacion('matriz', true);
        await this.notificarResultadoValidacion('proyecto', true);
        
        this.ResetDrd();
        this.ResetForm();
        this.Loading = false;
        this.validando = true;
        // this.texto = "Configuración validada de forma correcta";
        // this.msg = true;
        Swal.fire(
          'Configuración',
          'Configuración validada de forma correcta',
          'success'
        )
      });

    });

  }

  Rechazar() {
    Swal.fire({
      title: 'Rechazar configuración',
      text: 'Ambas opciones rechazan la configuración. Seleccione si además desea abrir el correo.',
      icon: 'warning',
      showCloseButton: false,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Rechazar con correo',
      cancelButtonText: 'Rechazar sin correo',
      allowOutsideClick: false
    }).then((decision: any) => {
      if (decision.value) {
        this.ejecutarRechazo(true);
        return;
      }

      if (decision.dismiss) {
        this.ejecutarRechazo(false);
      }
    });
  }

  private ejecutarRechazo(enviarCorreo: boolean) {
    this.validando = false;
    this.texto = "";
    this.msg = false;
    this.Loading = true;

    this._sSubProyecto.getSubProyectobyID(this.drdSubProyecto).subscribe(subProyecto => {
      const nomProy: string = subProyecto.nombreSubProyecto;

      if (enviarCorreo) {
        this._sUsuario.getUsuariobyID(subProyecto.idUsuarioCreador).subscribe(usuarioCreador => {
          this._sMail.getMailbyidPersona(usuarioCreador.idPersona).subscribe(
            async mails => {
              if (mails && mails.length > 0) {
                window.location.href = "mailto:" + mails[0].direccionMail + "?subject=Rechazo configuración del SubProyecto " + nomProy + "&body=Estimado, %0D%0DLa configuración del SubProyecto '" + nomProy + "' esta siendo rechazado por los siguientes motivos: %0D";
              }

              await this.finalizarRechazo(nomProy, enviarCorreo);
            },
            async () => {
              await this.finalizarRechazo(nomProy, false);
            }
          );
        }, async () => {
          await this.finalizarRechazo(nomProy, false);
        });

        return;
      }

      this.finalizarRechazo(nomProy, false);
    }, () => {
      this.Loading = false;
      this.validando = true;
      Swal.fire('Configuración', 'No fue posible rechazar la configuración.', 'error');
    });
  }

private async finalizarRechazo(nomProy: string, enviarCorreo: boolean) {
  
  // ✅ Cambiar estado del subproyecto a "en configuración" (3) para que salga de pendientes
  this._sSubProyecto.getSubProyectobyID(this.drdSubProyecto).subscribe(subProyecto => {

    subProyecto.idEstadoProyecto = 3; // Vuelve a "en configuración" → sale del filtro == 4
    
    // Limpiar validaciones para que el usuario pueda rehacerlas
    subProyecto.ritmoValidado = false;
    subProyecto.fechaRitmoValidado = null;
    subProyecto.idUsuarioRitmoValidado = null;

    subProyecto.ponderadoValidado = false;
    subProyecto.fechaPonderadoValidado = null;
    subProyecto.idUsuarioPonderadoValidado = null;

    subProyecto.presupuestoValidado = false;
    subProyecto.fechaPresupuestoValidado = null;
    subProyecto.idUsuarioPresupuestoValidado = null;

    this._sSubProyecto.postUpdDelSubProyecto(subProyecto).success(async () => {

      // Notificar a coordinadores
      const coordinadores = await this.getUsersByRole('Coordinador');
      if (coordinadores.length > 0) {
        const titulo = 'Ritmo rechazado';
        const descripcion = enviarCorreo
          ? `El ritmo del SubProyecto "${nomProy}" ha sido rechazado. Revise los comentarios enviados por correo.`
          : `El ritmo del SubProyecto "${nomProy}" ha sido rechazado.`;
        await this.enviarNotificacionesAUsuarios(coordinadores, 'ritmo', titulo, descripcion, '/Proyectos-MisProyectos');
      }

      await this.notificarResultadoValidacion('matriz', false);
      await this.notificarResultadoValidacion('proyecto', false);

      this.ResetDrd();
      this.ResetForm();
      this.Loading = false;
      this.validando = true;

      Swal.fire('Configuración', 'Configuración rechazada correctamente.', 'info');
    });
  });
}

  //*************************************************** Notificaciones Automáticas ***************************************************

  /**
   * Genera notificaciones automáticas para todos los subproyectos pendientes de validación
   */
  async generarNotificacionesSubproyectosPendientes() {
    console.log('🔔 Generando notificaciones para subproyectos pendientes de validación...');
    
    try {
      // ❌ ELIMINADO: Datos de prueba innecesarios (Configuración Subproyecto A y B)
      // Solo usar datos reales de validaciones pendientes
      console.log('🔔 Usando solo datos reales de validaciones pendientes (sin datos de prueba)');
      
      // Obtener todos los proyectos matriz del coordinador actual
      for (const proyectoMatriz of this.ProyectosMatriz) {
        
        // Obtener proyectos del proyecto matriz
        const proyectos = await this._sProyecto.getProyectobyidProyectoMatriz(proyectoMatriz.idProyectoMatriz).toPromise();
        
        for (const proyecto of proyectos) {
          
          // Obtener subproyectos del proyecto que están en estado pendiente (idEstadoProyecto == 4)
          const subproyectos = await this._sSubProyecto.getSubProyectobyidProyecto(proyecto.idProyecto).toPromise();
          const subproyectosPendientes = subproyectos.filter(sp => sp.idEstadoProyecto == 4);
          
          console.log(`📋 Proyecto "${proyecto.nombreProyecto}": ${subproyectosPendientes.length} subproyectos pendientes`);
          
          // También crear datos para configuraciones pendientes reales si existen
          if (subproyectosPendientes.length > 0) {
            const configPendientesReales = subproyectosPendientes.map((sp, index) => ({
              id: 100 + index,
              nombre: `Validación: ${sp.nombreSubProyecto}`,
              titulo: sp.nombreSubProyecto,
              descripcion: `Subproyecto "${sp.nombreSubProyecto}" del proyecto "${proyecto.nombreProyecto}" pendiente de validación`,
              fecha: new Date()
            }));
            
            localStorage.setItem('configuracionesPendientes', JSON.stringify(configPendientesReales));
            console.log('💾 Configuraciones reales pendientes guardadas en localStorage:', configPendientesReales.length);
          }
          
          // Generar notificaciones para cada subproyecto pendiente
          for (const subproyecto of subproyectosPendientes) {
            await this.crearNotificacionSubproyectoPendiente(subproyecto, proyecto.nombreProyecto);
          }
        }
      }
      
      console.log('✅ Notificaciones generadas completamente');
      
    } catch (error) {
      console.error('❌ Error al generar notificaciones de subproyectos pendientes:', error);
    }
  }

  /**
   * Crea una notificación específica para un subproyecto pendiente de validación
   */
  private async crearNotificacionSubproyectoPendiente(subproyecto: any, nombreProyecto: string) {
    try {
      // Obtener usuarios con permisos para validar (Directores, Sub-Gerentes)
      const directores = await this.getUsersByRole('Director');
      const subGerentes = await this.getUsersByRole('Sub-Gerente');
      
      const todosLosUsuarios = [...directores, ...subGerentes];
      
      if (todosLosUsuarios.length > 0) {
        const titulo = `🔔 Validación Pendiente: ${subproyecto.nombreSubProyecto}`;
        const descripcion = `El subproyecto "${subproyecto.nombreSubProyecto}" del proyecto "${nombreProyecto}" está pendiente de validación. Haga clic para revisar.`;
        const enlace = `/Configuracion-ValidacionSubProyecto?subproyecto=${subproyecto.idSubProyecto}&autoselect=true`;
        
        console.log(`📨 Creando notificación para "${subproyecto.nombreSubProyecto}" para ${todosLosUsuarios.length} usuarios`);
        
        // Usar el método específico del servicio de notificaciones
        for (const usuario of todosLosUsuarios) {
          this._notificacionesService.crearNotificacionSubproyectoPendiente(
            usuario.idUsuario,
            subproyecto.nombreSubProyecto,
            nombreProyecto,
            subproyecto.idSubProyecto
          );
        }
      }
      
    } catch (error) {
      console.error(`❌ Error al crear notificación para subproyecto ${subproyecto.nombreSubProyecto}:`, error);
    }
  }



}
