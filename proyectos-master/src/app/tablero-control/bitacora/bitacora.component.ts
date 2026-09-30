import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

//Share
import { PopUps } from '../../Share/PopUps';
import { Comunes } from '../../Share/Comunes';
import { Router } from '@angular/router';

//Model
import { mPrioridad } from '../../models/mPrioridad';
import { mBitacora } from '../../models/mBitacora';
import { mDetalleSubProyecto } from '../../models/mDetalleSubProyecto';
import { mSubProyecto } from '../../models/mSubProyecto';
import { mEtapa } from '../../models/mEtapa';

//Servicios
import { sPrioridad } from '../../services/sPrioridad.service';
import { sBitacora } from '../../services/sBitacora.service';
import { sDetalleSubProyecto } from '../../services/sDetalleSubProyecto.service';
import { sSubProyecto } from '../../services/sSubProyecto.service';
import { NotificacionesService } from '../../services/notificaciones.service';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';
import { sPerfil } from '../../services/sPerfil.service';

declare var jQuery: any;
declare var $: any;
declare var Swal: any;

@Component({
  selector: 'app-bitacora',
  templateUrl: './bitacora.component.html',
  styleUrls: ['./bitacora.component.css'],
  providers: [
    PopUps,
    sPrioridad,
    sBitacora,
    sDetalleSubProyecto,
    sSubProyecto,
    Comunes,
    NotificacionesService,
    sUsuariosPerfiles,
    sPerfil
  ]
})
export class BitacoraComponent implements OnInit {

  @Input() TipoBitacora: number;
  @Input() soloLectura: boolean = false;

  @Output() ConseguirBitacoras = new EventEmitter();

  //Array
  Prioridades: Array<mPrioridad>;

  //Objetos
  Bitacora: mBitacora;
  usuario: any;
  EtapaActual: mDetalleSubProyecto;
  SubProyecto: mSubProyecto;
  Etapa: mEtapa;

  //Loader
  loader: boolean;
  Loading: boolean;

  constructor(
    private _PopUps: PopUps,
    private _sPrioridad: sPrioridad,
    private _sBitacora: sBitacora,
    private _sDetalleSubProyecto: sDetalleSubProyecto,
    private _sSubProyecto: sSubProyecto,
    private _Comunes: Comunes,
    private _notificacionesService: NotificacionesService,
    private _sUsuariosPerfiles: sUsuariosPerfiles,
    private _sPerfil: sPerfil
  ) {
    this.loader = false;
    this.usuario = JSON.parse(localStorage.usuario);
    this.SubProyecto = new mSubProyecto(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    this.Bitacora = new mBitacora(null, null, 0, null, null, new Date().toString(), true, null, this.usuario.idUsuario, null, null, null, null);
    this.EtapaActual = new mDetalleSubProyecto(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    this.Etapa = JSON.parse(localStorage.Etapa);
    this.SubProyecto = JSON.parse(localStorage.SubProyecto);
  }

  ngOnInit() {
    this._sPrioridad.getPrioridad().subscribe(result => {
      this.Prioridades = result;
    });

    this.Bitacora.TipoBitacora = this.TipoBitacora;

    this._sDetalleSubProyecto.getDetalleSubProyectobyidSubProyecto(this.SubProyecto.idSubProyecto).subscribe(result => {
      this.EtapaActual = result.filter(element => { return element.vigente == true; })[0];
      this.Bitacora.idDetalleSubProyecto = this.EtapaActual.idDetalleSubProyecto;
    });
  }

  //*************************************************** Archivo ***************************************************

  NombreArchivo() {
    const input = $("#fileupload1")[0];

    if (!input.files || input.files.length === 0) {
      $("#NombreArch").html("");
      this.Bitacora.NombreAdjunto = null;
      return;
    }

    const archivo = input.files[0];
    const error = this._sBitacora.validarNombreArchivo(archivo.name);

    if (error) {
      this.limpiarArchivo();
      this.avisarNombreInvalido(error);
      return;
    }

    $("#NombreArch").html(archivo.name);
    this.Bitacora.NombreAdjunto = archivo.name;
  }

  private limpiarArchivo() {
    const $input = $("#fileupload1");
    $input.val('');
    $input.closest('.fileinput').removeClass('fileinput-exists').addClass('fileinput-new');
    $("#NombreArch").html("");
    this.Bitacora.NombreAdjunto = null;
  }

  private avisarNombreInvalido(mensaje: string) {
    Swal.fire({
      type: 'warning',
      title: 'Nombre de archivo no válido',
      html: mensaje +
        '<br><br>Renombra el archivo usando solo letras <b>sin tildes ni ñ</b>, números, espacios, ' +
        'guion (-), guion bajo (_), puntos y paréntesis, y vuelve a adjuntarlo.'
    });
  }

  //*************************************************** Notificaciones ***************************************************

  private async getUsersByRole(roleName: string): Promise<any[]> {
    try {
      const perfiles = await this._sPerfil.getPerfilbynombrePerfil(roleName).toPromise();
      if (perfiles && perfiles.length > 0) {
        const idPerfil = perfiles[0].idPerfil;

        const usuariosPerfiles = await this._sUsuariosPerfiles.getUsuariosPerfilesbyidPerfil(idPerfil).toPromise();

        const usuariosIds = usuariosPerfiles
          .filter(up => up.activo)
          .map(up => ({ idUsuario: up.idUsuario }));

        return usuariosIds;
      }
    } catch (error) {
      console.error(`Error al obtener usuarios con rol ${roleName}:`, error);
    }
    return [];
  }

  private async notificarCargaBitacora() {
    const roles = ['Coordinador', 'Director', 'Sub-Gerente'];

    for (const rol of roles) {
      const usuarios = await this.getUsersByRole(rol);
      for (const usuario of usuarios) {
        const titulo = 'Carga de archivos en bitácora';
        const descripcion = `Se ha cargado un nuevo archivo en la bitácora del SubProyecto "${this.SubProyecto.nombreSubProyecto}".`;

        this._notificacionesService.crearNotificacionPersonalizada(
          usuario.idUsuario,
          'bitacora',
          titulo,
          descripcion,
          'media',
          '/Ver-Bitacora'
        );
      }
    }
  }

  //*************************************************** CRUD ***************************************************

  Agregar(Form) {
    if (this.soloLectura) {
      return;
    }

    const tieneArchivo = $("#fileupload1")[0].files.length > 0;

    // Validar nombre ANTES de tocar nada
    if (tieneArchivo) {
      const error = this._sBitacora.validarNombreArchivo($("#fileupload1")[0].files[0].name);
      if (error) {
        this.limpiarArchivo();
        this.avisarNombreInvalido(error);
        return;
      }
    }

    this.Loading = true;

    this.Bitacora.descripcion = this.Bitacora.descripcion.replace(/\n/g, "<br>");

    if (tieneArchivo) {
      this._sBitacora.SubirArchivo($("#fileupload1")[0].files[0], this.SubProyecto.idSubProyecto, this.TipoBitacora).then(res => {
        // Nombre original + URL de descarga de Firebase
        this.Bitacora.NombreAdjunto = res.nombre;
        this.Bitacora.Adjunto = res.url;

        this._sBitacora.postAddBitacora(this.Bitacora).success(async result => {

          this._notificacionesService.detectarCargaBitacora(this.Bitacora, this.SubProyecto, this.usuario, true);

          await this.notificarCargaBitacora();

          Form.reset();
          this.Bitacora = new mBitacora(null, null, 0, null, null, new Date().toString(), true, null, this.usuario.idUsuario, null, null, null, this.TipoBitacora);
          this.Bitacora.idDetalleSubProyecto = this.EtapaActual.idDetalleSubProyecto;
          this.limpiarArchivo();
          this.Loading = false;
          this.ConseguirBitacoras.emit({ actualizar: true });
          Swal.fire(
            'Bitacora',
            'Se ha cargado la Bitacora de forma exitosa',
            'success'
          );
        }).error(e => {
          console.error('Error al guardar bitácora:', e);
          this.Loading = false;
          this.Bitacora.descripcion = this.Bitacora.descripcion.replace(/<br>/g, "\n");
          Swal.fire('Error', 'El archivo se subió, pero no se pudo guardar la bitácora', 'error');
        });
      }).catch((error: any) => {
        console.error('Error al subir archivo:', error);
        this.Loading = false;
        this.Bitacora.descripcion = this.Bitacora.descripcion.replace(/<br>/g, "\n");

        if (error && error.nombreInvalido) {
          this.limpiarArchivo();
          this.avisarNombreInvalido(error.mensaje);
          return;
        }
        Swal.fire('Error', 'No se pudo subir el archivo adjunto' + (error && error.code ? ' (' + error.code + ')' : ''), 'error');
      });

    } else {
      this._sBitacora.postAddBitacora(this.Bitacora).success(async result => {
        this._notificacionesService.detectarCargaBitacora(this.Bitacora, this.SubProyecto, this.usuario, false);

        await this.notificarCargaBitacora();

        Form.reset();
        this.Bitacora = new mBitacora(null, null, 0, null, null, new Date().toString(), true, null, this.usuario.idUsuario, null, null, null, this.TipoBitacora);
        this.Bitacora.idDetalleSubProyecto = this.EtapaActual.idDetalleSubProyecto;
        this.Loading = false;
        Swal.fire(
          'Bitacora',
          'Se ha cargado la Bitacora de forma exitosa',
          'success'
        );
        this.ConseguirBitacoras.emit({ actualizar: true });
      });
    }
  }

}