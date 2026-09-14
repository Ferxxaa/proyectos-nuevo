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

    //console.log(this.TipoBitacora);

    this._sDetalleSubProyecto.getDetalleSubProyectobyidSubProyecto(this.SubProyecto.idSubProyecto).subscribe(result => {
      this.EtapaActual = result.filter(element => { return element.vigente == true; })[0];
      this.Bitacora.idDetalleSubProyecto = this.EtapaActual.idDetalleSubProyecto;
    });
  }

  NombreArchivo() {
    $("#NombreArch").html($("#fileupload1")[0].files[0].name);
    this.Bitacora.NombreAdjunto = $("#fileupload1")[0].files[0].name;
    // if ($("#fileupload1")[0].files.length > 0) {
    //   this._Comunes.getFileBlob($("#fileupload1")[0].files[0]).then(blob => {
    //     this.Bitacora.NombreAdjunto = $("#fileupload1")[0].files[0].name;
    //     this.Bitacora.Adjunto = null;
    //   }).catch(e => console.log(e));
    // }
  }

  //*************************************************** Notificaciones ***************************************************

  private async getUsersByRole(roleName: string): Promise<any[]> {
    try {
      // Primero obtenemos el perfil por nombre
      const perfiles = await this._sPerfil.getPerfilbynombrePerfil(roleName).toPromise();
      if (perfiles && perfiles.length > 0) {
        const idPerfil = perfiles[0].idPerfil;
        
        // Luego obtenemos los usuarios con ese perfil
        const usuariosPerfiles = await this._sUsuariosPerfiles.getUsuariosPerfilesbyidPerfil(idPerfil).toPromise();
        
        // Obtenemos los detalles de cada usuario (aunque no tenemos el servicio sUsuario aquí)
        // Solo devolvemos los IDs de usuario activos
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
    // Notificar a Coordinador, Director y Sub-Gerente sobre la carga de archivos en bitácora
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

    // if (!this.Bitacora.idPrioridad){
    //   console.log("No posee prioridad");
    //   return false
    // }
    this.Loading = true;

    this.Bitacora.descripcion = this.Bitacora.descripcion.replace(/\n/g, "<br>");


    // console.log(this.Bitacora);


    if ($("#fileupload1")[0].files.length > 0) {
  this._sBitacora.AdjuntarArchivo($("#fileupload1")[0].files[0], this.SubProyecto.nombreSubProyecto, this.TipoBitacora.toString()).then((res: any) => {
    // Guardar nombre original y ruta física devuelta por el servidor
    this.Bitacora.NombreAdjunto = res.files.adjuntar.originalFilename;
    this.Bitacora.Adjunto = res.files.adjuntar.path;

    this._sBitacora.postAddBitacora(this.Bitacora).success(async result => {
      
          // 🔥 DETECTAR CARGA DE BITÁCORA CON ARCHIVO AUTOMÁTICAMENTE
          this._notificacionesService.detectarCargaBitacora(this.Bitacora, this.SubProyecto, this.usuario, true);
          
          // Notificar carga de bitácora con archivo (método legacy)
          await this.notificarCargaBitacora();
          
          Form.reset();
          this.Bitacora = new mBitacora(null, null, 0, null, null, new Date().toString(), true, null, this.usuario.idUsuario, null, null, null, this.TipoBitacora);
          this.Bitacora.idDetalleSubProyecto = this.EtapaActual.idDetalleSubProyecto;
          $("#NombreArch").html("");
          console.clear();
          this.Loading = false;
          this.ConseguirBitacoras.emit({ actualizar: true });
          Swal.fire(
            'Bitacora',
            'Se ha cargado la Bitacora de forma exitosa',
            'success'
          );
        });
      }).catch(error => {
        console.error('Error al procesar archivo:', error);
        this.Loading = false;
        Swal.fire('Error', 'No se pudo procesar el archivo adjunto', 'error');
      });

    } else {
      this._sBitacora.postAddBitacora(this.Bitacora).success(async result => {
        // 🔥 DETECTAR CARGA DE BITÁCORA SIN ARCHIVO AUTOMÁTICAMENTE
        this._notificacionesService.detectarCargaBitacora(this.Bitacora, this.SubProyecto, this.usuario, false);
        
        // Notificar carga de bitácora sin archivo (método legacy)
        await this.notificarCargaBitacora();
        
        Form.reset();
        // this.Bitacora = {idBitacora:null,descripcion:null,idPrioridad:0,idArchivoAdjunto:null,idDetalleSubProyecto:null,fechaCreacion:new Date().toString(),activo:true,fechaRemocion:null,idUsuarioCreador:this.usuario.idUsuario,idUsuarioRemovedor:null,Adjunto:null,NombreAdjunto:null,TipoBitacora:this.TipoBitacora};
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
