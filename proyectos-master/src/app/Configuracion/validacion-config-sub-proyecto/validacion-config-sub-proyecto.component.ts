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

/*
 * ✅ MODELO DE ETAPAS = CATÁLOGO DE LA BD (tabla Etapa). NO CAMBIAR LOS idEtapa.
 *  9 Regularización (prop: Licitacion) | 10 Licitación Adjudicación (prop: Adjudicacion) | 11 NBI5
 * 12 Construcción | 13 Habilitación | 14 NBI6 | 15-17 Cierres | 18 NBI7
 */

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
  Requerimiento: mDetalleSubProyecto;  // 1
  NBI1: mDetalleSubProyecto;           // 2
  Factibilidad: mDetalleSubProyecto;   // 3
  NBI2: mDetalleSubProyecto;           // 4
  Layout: mDetalleSubProyecto;         // 5
  NBI3: mDetalleSubProyecto;           // 6
  Proyecto: mDetalleSubProyecto;       // 7
  NBI4: mDetalleSubProyecto;           // 8
  Licitacion: mDetalleSubProyecto;     // 9  "Regularización"
  Adjudicacion: mDetalleSubProyecto;   // 10 "Licitación Adjudicación"
  NBI5: mDetalleSubProyecto;           // 11
  Construccion: mDetalleSubProyecto;   // 12
  Habilitacion: mDetalleSubProyecto;   // 13
  NBI6: mDetalleSubProyecto;           // 14
  Contratista: mDetalleSubProyecto;    // 15
  Cliente: mDetalleSubProyecto;        // 16
  Mantencion: mDetalleSubProyecto;     // 17
  NBI7: mDetalleSubProyecto;           // 18

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
    if (this.drdProyecto > 0) {
      this._sSubProyecto.getSubProyectobyidProyecto(this.drdProyecto).subscribe(
        result => {
          this.SubProyectos = result.filter(el => el.idEstadoProyecto == 4);
        }
      );
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
          // ✅ Asignar por idEtapa, nunca por posición
          this.Requerimiento = this.porEtapa(result, 1) || this.Requerimiento;
          this.NBI1 = this.porEtapa(result, 2) || this.NBI1;
          this.Factibilidad = this.porEtapa(result, 3) || this.Factibilidad;
          this.NBI2 = this.porEtapa(result, 4) || this.NBI2;
          this.Layout = this.porEtapa(result, 5) || this.Layout;
          this.NBI3 = this.porEtapa(result, 6) || this.NBI3;
          this.Proyecto = this.porEtapa(result, 7) || this.Proyecto;
          this.NBI4 = this.porEtapa(result, 8) || this.NBI4;
          this.Licitacion = this.porEtapa(result, 9) || this.Licitacion;
          this.Adjudicacion = this.porEtapa(result, 10) || this.Adjudicacion;
          this.NBI5 = this.porEtapa(result, 11) || this.NBI5;
          this.Construccion = this.porEtapa(result, 12) || this.Construccion;
          this.Habilitacion = this.porEtapa(result, 13) || this.Habilitacion;
          this.NBI6 = this.porEtapa(result, 14) || this.NBI6;
          this.Contratista = this.porEtapa(result, 15) || this.Contratista;
          this.Cliente = this.porEtapa(result, 16) || this.Cliente;
          this.Mantencion = this.porEtapa(result, 17) || this.Mantencion;
          this.NBI7 = this.porEtapa(result, 18) || this.NBI7;

          this.CargaFecha();
          this.SumaPonderado();
        }
        this.Loading = false;
      }
    );
  }

  private porEtapa(lista: mDetalleSubProyecto[], idEtapa: number): mDetalleSubProyecto {
    return lista.find(d => Number(d.idEtapa) === idEtapa);
  }

  private ResetForm() {
    this.sumPonderado = 0;
    const u = this.usuario.idUsuario;

    this.Requerimiento = new mDetalleSubProyecto(null, null, 1, 0, 0, 0, true, null, null, null, null, null, false, false, null, true, null, u, null);
    this.NBI1 = new mDetalleSubProyecto(null, null, 2, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Factibilidad = new mDetalleSubProyecto(null, null, 3, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.NBI2 = new mDetalleSubProyecto(null, null, 4, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Layout = new mDetalleSubProyecto(null, null, 5, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.NBI3 = new mDetalleSubProyecto(null, null, 6, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Proyecto = new mDetalleSubProyecto(null, null, 7, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.NBI4 = new mDetalleSubProyecto(null, null, 8, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Licitacion = new mDetalleSubProyecto(null, null, 9, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Adjudicacion = new mDetalleSubProyecto(null, null, 10, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.NBI5 = new mDetalleSubProyecto(null, null, 11, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Construccion = new mDetalleSubProyecto(null, null, 12, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Habilitacion = new mDetalleSubProyecto(null, null, 13, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.NBI6 = new mDetalleSubProyecto(null, null, 14, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Contratista = new mDetalleSubProyecto(null, null, 15, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Cliente = new mDetalleSubProyecto(null, null, 16, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.Mantencion = new mDetalleSubProyecto(null, null, 17, 0, 0, 0, false, null, null, null, null, null, false, false, null, true, null, u, null);
    this.NBI7 = new mDetalleSubProyecto(null, null, 18, 0, null, null, false, null, null, null, null, null, false, false, null, true, null, u, null);

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

  private sumarDias(base: Date, dias: any): Date {
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + (Number(dias) || 0));
    return d;
  }

  // ✅ Mismo cálculo que Configuracion-SubProyecto
  CargaFecha() {
    if (!this.SubProyecto || !this.SubProyecto.fechaInicio) {
      return;
    }

    const tramos: Array<{ nbi: mDetalleSubProyecto, etapa: mDetalleSubProyecto }> = [
      { nbi: null, etapa: this.Requerimiento },      // 0
      { nbi: this.NBI1, etapa: this.Factibilidad },  // 1
      { nbi: this.NBI2, etapa: this.Layout },        // 2
      { nbi: this.NBI3, etapa: this.Proyecto },      // 3
      { nbi: this.NBI4, etapa: this.Licitacion },    // 4 Regularización
      { nbi: null, etapa: this.Adjudicacion },       // 5 Licitación Adjudicación
      { nbi: this.NBI5, etapa: this.Construccion },  // 6
      { nbi: null, etapa: this.Habilitacion },       // 7
      { nbi: this.NBI6, etapa: this.Contratista },   // 8
      { nbi: null, etapa: this.Cliente },            // 9
      { nbi: null, etapa: this.Mantencion }          // 10
    ];

    let cursor = new Date(this.SubProyecto.fechaInicio);
    tramos.forEach((t, i) => {
      const inicio = this.sumarDias(cursor, t.nbi ? t.nbi.duracion : 0);
      const termino = this.sumarDias(inicio, t.etapa.duracion);
      this.Inicios[i] = inicio;
      this.Terminos[i] = termino;
      cursor = termino;
    });
  }

  SumaPonderado() {
    this.sumPonderado = this.Requerimiento.ponderado + this.Factibilidad.ponderado + this.Layout.ponderado + this.Proyecto.ponderado + this.Licitacion.ponderado + this.Adjudicacion.ponderado + this.Construccion.ponderado + this.Habilitacion.ponderado + this.Contratista.ponderado + this.Cliente.ponderado + this.Mantencion.ponderado;
  }

  AsignaSPaDetalle() {
    [
      this.Requerimiento, this.NBI1, this.Factibilidad, this.NBI2, this.Layout, this.NBI3, this.Proyecto, this.NBI4,
      this.Licitacion, this.Adjudicacion, this.NBI5, this.Construccion, this.Habilitacion, this.NBI6,
      this.Contratista, this.Cliente, this.Mantencion, this.NBI7
    ].forEach(d => d.idSubProyecto = this.drdSubProyecto);
  }

  cargaSubProyecto(e: mSubProyecto) {
    this.SubProyecto = e;
    this.drdSubProyecto = e.idSubProyecto;
    console.log(this.drdSubProyecto);
    this.CargaDatosSP();
  }

  // Método para autoseleccionar subproyecto desde notificación
  private async autoseleccionarSubproyecto(idSubProyecto: number) {
    try {
      console.log('🔍 Buscando datos del subproyecto:', idSubProyecto);

      const subproyecto = await this._sSubProyecto.getSubProyectobyID(idSubProyecto).toPromise();
      if (!subproyecto) {
        console.error('❌ Subproyecto no encontrado');
        return;
      }

      const proyecto = await this._sProyecto.getProyectobyID(subproyecto.idProyecto).toPromise();
      if (!proyecto) {
        console.error('❌ Proyecto no encontrado');
        return;
      }

      console.log('📋 Configurando dropdowns automáticamente...');

      this.drdProyectoMatriz = proyecto.idProyectoMatriz;

      await this._sProyecto.getProyectobyidProyectoMatriz(proyecto.idProyectoMatriz).toPromise().then(proyectos => {
        this.Proyectos = proyectos;
        this.drdProyecto = proyecto.idProyecto;
      });

      await this._sSubProyecto.getSubProyectobyidProyecto(proyecto.idProyecto).toPromise().then(subproyectos => {
        this.SubProyectos = subproyectos.filter(el => el.idEstadoProyecto == 4);
        this.drdSubProyecto = idSubProyecto;
      });

      this.SubProyecto = subproyecto;
      this.CargaDatosSP();

      console.log('✅ Subproyecto autoseleccionado correctamente');

    } catch (error) {
      console.error('❌ Error al autoseleccionar subproyecto:', error);
    }
  }

  //*************************************************** Notificaciones ***************************************************

  private async getUsersByRole(roleName: string): Promise<any[]> {
    try {
      console.log(`🔍 Buscando usuarios con rol: ${roleName}`);

      const roleAlternatives = {
        'Sub-Gerente': ['Gerente', 'Director', 'Administrador'],
        'Director': ['Gerente', 'Administrador'],
        'Coordinador': ['Director', 'Gerente']
      };

      const usuarios = await this.buscarUsuariosPorRol(roleName);
      if (usuarios.length > 0) {
        return usuarios;
      }

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

        const usuariosPerfiles = await this._sUsuariosPerfiles.getUsuariosPerfilesbyidPerfil(idPerfil)
          .toPromise()
          .catch(error => {
            console.warn(`⚠️ No se pudieron obtener usuarios del perfil ${idPerfil}:`, error.message);
            return [];
          });

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
    const directores = await this.getUsersByRole('Director');
    if (directores.length > 0) {
      const titulo = 'Cambio de ritmo por validar';
      const descripcion = `El SubProyecto "${this.SubProyecto.nombreSubProyecto}" requiere validación de ritmo.`;
      await this.enviarNotificacionesAUsuarios(directores, 'ritmo', titulo, descripcion, '/Configuracion-ValidacionSubProyecto');
    }
  }

  private async notificarValidacionMatriz() {
    const subGerentes = await this.getUsersByRole('Sub-Gerente');
    if (subGerentes.length > 0) {
      const titulo = 'Validación de matriz requerida';
      const descripcion = `El SubProyecto "${this.SubProyecto.nombreSubProyecto}" requiere validación de matriz.`;
      await this.enviarNotificacionesAUsuarios(subGerentes, 'validacion', titulo, descripcion, '/Proyectos-ValidarProyecto');
    }
  }

  private async notificarValidacionProyecto() {
    const subGerentes = await this.getUsersByRole('Sub-Gerente');
    if (subGerentes.length > 0) {
      const titulo = 'Validación de proyecto requerida';
      const descripcion = `El SubProyecto "${this.SubProyecto.nombreSubProyecto}" requiere validación de proyecto.`;
      await this.enviarNotificacionesAUsuarios(subGerentes, 'validacion', titulo, descripcion, '/Proyectos-ValidarSubProyectos');
    }
  }

  private async notificarResultadoValidacion(tipo: 'matriz' | 'proyecto', aprobado: boolean) {
    const coordinadores = await this.getUsersByRole('Coordinador');
    if (coordinadores.length > 0) {
      const estado = aprobado ? 'aprobada' : 'rechazada';
      const titulo = `Validación de ${tipo} ${estado}`;
      const descripcion = `La validación de ${tipo} del SubProyecto "${this.SubProyecto.nombreSubProyecto}" ha sido ${estado}.`;
      await this.enviarNotificacionesAUsuarios(coordinadores, 'validacion', titulo, descripcion, '/Proyectos-MisProyectos');
    }
  }

  private async notificarCargaArchivosBitacora(nombreArchivo?: string, observaciones?: string) {
    console.log('🔔 Notificando carga de archivos en bitácora...');

    try {
      const [coordinadores, directores, subGerentes] = await Promise.all([
        this.getUsersByRole('Coordinador'),
        this.getUsersByRole('Director'),
        this.getUsersByRole('Sub-Gerente')
      ]);

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
    Swal.fire({
      title: 'Validar configuración',
      text: '¿Está seguro que desea validar la configuración de este SubProyecto?',
      icon: 'question',
      showCloseButton: true,
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Validar',
      cancelButtonText: 'Cancelar',
      allowOutsideClick: true,
      allowEscapeKey: true
    }).then((decision: any) => {
      if (decision.value) {
        this.ejecutarValidacion();
      }
    });
  }

  private ejecutarValidacion() {
    this.validando = false;
    this.texto = "";
    this.msg = false;

    this.Loading = true;

    this._sSubProyecto.getSubProyectobyID(this.drdSubProyecto).subscribe(result => {

      let SubProyectoAnterior = { ...result };
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

        this._notificacionesService.detectarCambiosRitmoValidacion(SubProyectoAnterior, SubProyecto, this.usuario);
        this._notificacionesService.detectarValidacionMatrizProyecto(SubProyecto, this.usuario, 'matriz');
        this._notificacionesService.detectarValidacionMatrizProyecto(SubProyecto, this.usuario, 'proyecto');

        const coordinadores = await this.getUsersByRole('Coordinador');
        if (coordinadores.length > 0) {
          const titulo = 'Ritmo validado';
          const descripcion = `El ritmo del SubProyecto "${SubProyecto.nombreSubProyecto}" ha sido validado correctamente.`;
          await this.enviarNotificacionesAUsuarios(coordinadores, 'ritmo', titulo, descripcion, '/Proyectos-MisProyectos');
        }

        await this.notificarResultadoValidacion('matriz', true);
        await this.notificarResultadoValidacion('proyecto', true);

        this.ResetDrd();
        this.ResetForm();
        this.Loading = false;
        this.validando = true;
        Swal.fire(
          'Configuración',
          'Configuración validada de forma correcta',
          'success'
        );
      });

    });

  }

  Rechazar() {
    Swal.fire({
      title: 'Rechazar configuración',
      text: 'Ambas opciones rechazan la configuración. Seleccione si además desea abrir el correo.',
      icon: 'warning',
      showCloseButton: true,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Rechazar con correo',
      cancelButtonText: 'Rechazar sin correo',
      allowOutsideClick: false,
      allowEscapeKey: true
    }).then((decision: any) => {
      if (decision.value) {
        this.ejecutarRechazo(true);
        return;
      }

      if (decision.dismiss === 'cancel') {
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

    this._sSubProyecto.getSubProyectobyID(this.drdSubProyecto).subscribe(subProyecto => {

      subProyecto.idEstadoProyecto = 3; // Vuelve a "en configuración"

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

  async generarNotificacionesSubproyectosPendientes() {
    console.log('🔔 Generando notificaciones para subproyectos pendientes de validación...');

    try {
      for (const proyectoMatriz of this.ProyectosMatriz) {

        const proyectos = await this._sProyecto.getProyectobyidProyectoMatriz(proyectoMatriz.idProyectoMatriz).toPromise();

        for (const proyecto of proyectos) {

          const subproyectos = await this._sSubProyecto.getSubProyectobyidProyecto(proyecto.idProyecto).toPromise();
          const subproyectosPendientes = subproyectos.filter(sp => sp.idEstadoProyecto == 4);

          console.log(`📋 Proyecto "${proyecto.nombreProyecto}": ${subproyectosPendientes.length} subproyectos pendientes`);

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

  private async crearNotificacionSubproyectoPendiente(subproyecto: any, nombreProyecto: string) {
    try {
      const directores = await this.getUsersByRole('Director');
      const subGerentes = await this.getUsersByRole('Sub-Gerente');

      const todosLosUsuarios = [...directores, ...subGerentes];

      if (todosLosUsuarios.length > 0) {
        console.log(`📨 Creando notificación para "${subproyecto.nombreSubProyecto}" para ${todosLosUsuarios.length} usuarios`);

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