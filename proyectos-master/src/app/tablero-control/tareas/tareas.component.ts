import { Component, OnInit, Output, EventEmitter } from '@angular/core';

//Share
import { PopUps } from '../../Share/PopUps';
import { Router } from '@angular/router';

//Model
import { mVis_UsuariosCoordinadores } from '../../models/mVis_UsuariosCoordinadores';
import { mVis_UsuarioPersona } from '../../models/mVis_UsuarioPersona';
import { mTarea } from '../../models/mTarea';
import { mDetalleSubProyecto } from '../../models/mDetalleSubProyecto';
import { mSubProyecto } from '../../models/mSubProyecto';
import { mEtapa } from '../../models/mEtapa';

//Servicios
import { sVis_UsuariosCoordinadores } from '../../services/sVis_UsuariosCoordinadores.service';
import { sVis_UsuarioPersona } from '../../services/sVis_UsuarioPersona.service';
import { sTarea } from '../../services/sTarea.service';
import { sDetalleSubProyecto } from '../../services/sDetalleSubProyecto.service';
import { sSubProyecto } from '../../services/sSubProyecto.service';
import { mCorreo } from '../../models/mCorreo';
import { sUsuario } from '../../services/sUsuario.service';
import { sMail } from '../../services/sMail.service';
import { sCorreo } from '../../services/Personalizados/sCorreo.service';
import { sPerfil } from '../../services/sPerfil.service';
import { sUsuariosPerfiles } from '../../services/sUsuariosPerfiles.service';

declare var jQuery: any;
declare var $: any;
declare var Swal: any;

@Component({
  selector: 'app-tareas',
  templateUrl: './tareas.component.html',
  styleUrls: ['./tareas.component.css'],
  providers: [
    sVis_UsuariosCoordinadores,
    sVis_UsuarioPersona,
    sTarea,
    sDetalleSubProyecto,
    sSubProyecto,
    sUsuario,
    sMail,
    sCorreo,
    sPerfil,
    sUsuariosPerfiles
  ]
})
export class TareasComponent implements OnInit {

  //Select
  Responsables: Array<any>
  Areas: Array<any>;

  //Objetos
  usuario: any;
  SubProyecto: mSubProyecto;
  detalleSubProyecto: mDetalleSubProyecto;
  Tarea: mTarea;
  Etapa: mEtapa;

  @Output() crearTarea = new EventEmitter()

  constructor(
    private _sVis_UsuariosCoordinadores: sVis_UsuariosCoordinadores,
    private _sVis_UsuarioPersona: sVis_UsuarioPersona,
    private _sTarea: sTarea,
    private _sUsuario: sUsuario,
    private _sMail: sMail,
    private _sDetalleSubProyecto: sDetalleSubProyecto,
    private _sCorreo: sCorreo,
    private _sPerfil: sPerfil,
    private _sUsuariosPerfiles: sUsuariosPerfiles
  ) {
    this.usuario = JSON.parse(localStorage.usuario);
    this.SubProyecto = JSON.parse(localStorage.SubProyecto);
    this.Etapa = JSON.parse(localStorage.Etapa);
    this.Areas = [
      { idArea: "Administracion", nombre: "Administracion" },
      { idArea: "SGI", nombre: "SGI" },
      { idArea: "SSO_MA", nombre: "SSO_MA" },
      { idArea: "Estudio", nombre: "Estudio" },
      { idArea: "Comercial", nombre: "Comercial" },
      { idArea: "Gerencia", nombre: "Gerencia" },
      { idArea: "Construccion", nombre: "Construcción" },
      { idArea: "Arquitectura", nombre: "Arquitectura" }
    ];
    this.Tarea = new mTarea(null, null, "Tarea pendiente", null, 0, null, null, null, null, 1, new Date().toString(), true, null, this.usuario.idUsuario, null, "0", "0");
  }

  ngOnInit() {
    // Cargar usuarios activos desde el mismo endpoint que usa Gestión de Usuarios
    this._sUsuario.getUsuariobyactivo(true).subscribe(usuarios => {
      console.log('📋 Usuarios activos cargados:', usuarios);
      
      // Cargar datos de persona para cada usuario
      this._sVis_UsuarioPersona.getVis_UsuarioPersona().subscribe(usuariosPersona => {
        // Filtrar Vis_UsuarioPersona para obtener solo los usuarios activos
        const idsUsuariosActivos = usuarios.map(u => u.idUsuario);
        this.Responsables = usuariosPersona.filter(up => idsUsuariosActivos.includes(up.idUsuario));
        
        console.log('✅ Usuarios cargados desde Gestión de Usuarios:', this.Responsables.length, this.Responsables);
      });
    }, error => {
      console.error('❌ Error al cargar usuarios:', error);
    });

    this._sDetalleSubProyecto.getDetalleSubProyectobyidSubProyecto(this.SubProyecto.idSubProyecto).subscribe(result => {
      this.detalleSubProyecto = result.find(element => element.vigente == true);
      this.Tarea.idDetalleSubProyecto = this.detalleSubProyecto.idDetalleSubProyecto;
      console.log('✅ Tarea configurada con idDetalleSubProyecto:', this.detalleSubProyecto.idDetalleSubProyecto);
    });
  }

  Agregar(Form) {
    //console.log(this.Tarea.descripcionTarea);
    let tarTemp = { ...this.Tarea };
    this.Tarea.descripcionTarea = this.Tarea.descripcionTarea.replace(/\n/g, "<br>");
    console.log('🆕 Creando tarea con datos:', this.Tarea);
    console.log('📍 ID Detalle SubProyecto asignado:', this.Tarea.idDetalleSubProyecto);
    this._sTarea.postAddTarea(this.Tarea).success(result => {
      console.log('✅ Tarea creada exitosamente:', result);
      const idTareaCreada = result && result.idTarea ? result.idTarea : null;

      // Obtener nombre del usuario creador
      this._sVis_UsuarioPersona.getVis_UsuarioPersona().subscribe(usuariosPersona => {
        const usuarioCreador = usuariosPersona.find(up => up.idUsuario === this.usuario.idUsuario);
        const nombreCreador = usuarioCreador ? `${usuarioCreador.nombre} ${usuarioCreador.paterno}` : 'Usuario';

        this._sUsuario.getUsuariobyID(tarTemp.idUsuarioResponsable).subscribe(usuarioRes => {
          this._sMail.getMailbyidPersona(usuarioRes.idPersona).subscribe(mail => {
            // Formatear fecha de cumplimiento
            let fechaCumplimiento = '';
            if (tarTemp.fechaTerminoProgramado) {
              const fecha = new Date(tarTemp.fechaTerminoProgramado);
              fechaCumplimiento = fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
            }
            
            // Link directo a la tarea
            const linkTarea = idTareaCreada 
              ? `http://proyectos.trazas-nbi.com/Ver-Tareas?destacarTarea=${idTareaCreada}`
              : 'http://proyectos.trazas-nbi.com/Ver-Tareas';
            
            let mensaje = `Estimado, <br>
            <br>
                Informamos que se le ha asignado la siguiente tarea por <b>${nombreCreador}</b>:<br>
                <h3 style="margin-bottom: 0px;"><b>Descripción de la tarea:</b></h3>
                ${tarTemp.descripcionTarea}<br><br>
                ${fechaCumplimiento ? '<h3 style="margin-bottom: 0px;"><b>Fecha de cumplimiento:</b></h3>' + fechaCumplimiento + '<br><br>' : ''}
                Favor informar avance en el siguiente link:<br> 
                <a href='${linkTarea}' target='_blank' style='font-size: 16px; font-weight: bold; color: #007bff;'>Ir a la Tarea</a>`;

            let correoEnviar: mCorreo = new mCorreo(mail[0].direccionMail, 'Tarea asignada', mensaje)
            this._sCorreo.postCorreo(correoEnviar).subscribe(res => console.log(res), err => console.log(err));
          }, err => console.log(err));
        }, err => console.log(err));
      });
      
      this.Tarea = new mTarea(null, null, "Tarea pendiente", null, 0, null, null, null, null, 1, new Date().toString(), true, null, this.usuario.idUsuario, null, "0", "0");
      this.Tarea.idDetalleSubProyecto = this.detalleSubProyecto.idDetalleSubProyecto;
      Swal.fire(
        'Tareas',
        'Se ha creado la tarea correctamente',
        'success'
      );
      this.crearTarea.emit({ "crear": true })
      Form.reset();
    }).error(e => {
      this.crearTarea.emit({ "crear": true });
      console.log(e);
      Form.reset();
      this.Tarea = new mTarea(null, null, "Tarea pendiente", null, 0, null, null, null, null, 1, new Date().toString(), true, null, this.usuario.idUsuario, null, "0", "0");
      this.Tarea.idDetalleSubProyecto = this.detalleSubProyecto.idDetalleSubProyecto;
    });
  }

}
