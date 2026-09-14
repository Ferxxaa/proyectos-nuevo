import { Component, OnInit } from '@angular/core';

// Declarar jQuery global para TypeScript
declare var $: any;

//Share
import { PopUps } from '../../Share/PopUps';
import { Comunes } from '../../Share/Comunes';
import { Router } from '@angular/router';

//Model
import { mTarea } from '../../models/mTarea';
import { mDetalleSubProyecto } from '../../models/mDetalleSubProyecto';
import { mSubProyecto } from '../../models/mSubProyecto';
import { mVis_UsuarioPersona } from '../../models/mVis_UsuarioPersona';

//Servicios
import { sTarea } from '../../services/sTarea.service';
import { sDetalleSubProyecto } from '../../services/sDetalleSubProyecto.service';
import { sSubProyecto } from '../../services/sSubProyecto.service';
import { sUsuario } from '../../services/sUsuario.service';
import { sVis_UsuarioPersona } from '../../services/sVis_UsuarioPersona.service';
import { sMail } from '../../services/sMail.service';
import { sCorreo } from '../../services/Personalizados/sCorreo.service';
import { mCorreo } from '../../models/mCorreo';
import { NotificacionesService } from '../../services/notificaciones.service';

declare var Email: any;
declare var Swal: any;

@Component({
  selector: 'app-crear-tarea',
  templateUrl: './crear-tarea.component.html',
  styleUrls: ['./crear-tarea.component.css'],
  providers: [
    sTarea,
    sDetalleSubProyecto,
    sSubProyecto,
    sUsuario,
    sVis_UsuarioPersona,
    sMail,
    Comunes,
    sCorreo
  ]
})
export class CrearTareaComponent implements OnInit {

  readonly maxUsuariosCC = 6;

  //Select
  Responsables: Array<mVis_UsuarioPersona>
  Areas: Array<any>;

  //Objetos
  usuario: any;
  SubProyecto: mSubProyecto;
  Tarea: mTarea;
  UsuariosCCSeleccionados: Array<number>;
  ccBusqueda: string;
  ccDropdownAbierto: boolean;
  responsableBusqueda: string;
  responsableDropdownAbierto: boolean;

  //Loader
  Loading: boolean;

  constructor(
    private _sTarea: sTarea,
    private _sDetalleSubProyecto: sDetalleSubProyecto,
    private _sUsuario: sUsuario,
    private _sVis_UsuarioPersona: sVis_UsuarioPersona,
    private _sMail: sMail,
    private _Comunes: Comunes,
    private _sCorreo: sCorreo,
    private _notificacionesService: NotificacionesService
  ) {
    this.usuario = JSON.parse(localStorage.usuario);
    //this.SubProyecto = JSON.parse(localStorage.SubProyecto);
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
    this.UsuariosCCSeleccionados = [];
    this.ccBusqueda = '';
    this.ccDropdownAbierto = false;
    this.responsableBusqueda = '';
    this.responsableDropdownAbierto = false;
    this.Loading = false;
  }

  ngOnInit() {
    // Cambiar color del nav al entrar a Crear Tarea
    setTimeout(() => {
      try {
        if (window.hasOwnProperty('$') && typeof $ === 'function') {
          $('#sidebar').css('background-color', '#89658f');
        } else {
          const nav = document.getElementById('sidebar');
          if (nav) nav.style.backgroundColor = '#89658f';
        }
      } catch (e) {
        const nav = document.getElementById('sidebar');
        if (nav) nav.style.backgroundColor = '#89658f';
      }
    }, 100);

    this._sUsuario.getUsuariobyactivo(true).subscribe(usuarios => {
      this._sVis_UsuarioPersona.getVis_UsuarioPersona().subscribe(usuariosPersona => {
        const idsUsuariosActivos = usuarios.map(u => u.idUsuario);
        this.Responsables = usuariosPersona.filter(up => idsUsuariosActivos.includes(up.idUsuario));
      });
    });

    /*this._sDetalleSubProyecto.getDetalleSubProyectobyidSubProyecto(this.SubProyecto.idSubProyecto).subscribe(result => {
      this.Tarea.idDetalleSubProyecto = result.filter(element => { return element.vigente == true; })[0].idDetalleSubProyecto;
    });*/
  }

  //Crud
  getResponsablesFiltrados(): Array<mVis_UsuarioPersona> {
    const textoBusqueda = (this.responsableBusqueda || '').toLowerCase().trim();

    return (this.Responsables || []).filter(responsable => {
      if (!responsable || !responsable.idUsuario) {
        return false;
      }

      if (!textoBusqueda) {
        return true;
      }

      const nombreCompleto = `${responsable.nombre || ''} ${responsable.paterno || ''} ${responsable.materno || ''}`.toLowerCase();
      return nombreCompleto.includes(textoBusqueda);
    }).slice(0, 20);
  }

  abrirDropdownResponsable() {
    this.responsableDropdownAbierto = true;
  }

  cerrarDropdownResponsable() {
    setTimeout(() => {
      this.responsableDropdownAbierto = false;
    }, 150);
  }

  onResponsableBusquedaChange(valor: string) {
    this.responsableBusqueda = valor;
    this.responsableDropdownAbierto = true;

    const nombreSeleccionado = this.obtenerNombreResponsableSeleccionado().toLowerCase();
    const nombreIngresado = (valor || '').toLowerCase().trim();

    if (!nombreIngresado || nombreIngresado !== nombreSeleccionado) {
      this.Tarea.idUsuarioResponsable = 0;
    }
  }

  seleccionarResponsable(responsable: mVis_UsuarioPersona) {
    if (!responsable || !responsable.idUsuario) {
      return;
    }

    this.Tarea.idUsuarioResponsable = +responsable.idUsuario;
    this.responsableBusqueda = this.obtenerNombreResponsableSeleccionado();
    this.responsableDropdownAbierto = false;
  }

  obtenerNombreResponsableSeleccionado(): string {
    const idResponsable = this.Tarea && this.Tarea.idUsuarioResponsable ? +this.Tarea.idUsuarioResponsable : 0;
    if (!idResponsable) {
      return '';
    }

    const responsable = (this.Responsables || []).find(usuario => +usuario.idUsuario === idResponsable);
    if (!responsable) {
      return '';
    }

    return `${responsable.nombre || ''} ${responsable.paterno || ''}`.trim();
  }

  getUsuariosCCFiltrados(): Array<mVis_UsuarioPersona> {
    const textoBusqueda = (this.ccBusqueda || '').toLowerCase().trim();
    const idsSeleccionados = this.UsuariosCCSeleccionados || [];
    const idResponsable = this.Tarea && this.Tarea.idUsuarioResponsable ? +this.Tarea.idUsuarioResponsable : 0;

    return (this.Responsables || []).filter(usuario => {
      if (!usuario || !usuario.idUsuario) {
        return false;
      }

      if (idsSeleccionados.includes(usuario.idUsuario)) {
        return false;
      }

      if (idResponsable > 0 && usuario.idUsuario === idResponsable) {
        return false;
      }

      if (!textoBusqueda) {
        return true;
      }

      const nombreCompleto = `${usuario.nombre || ''} ${usuario.paterno || ''} ${usuario.materno || ''}`.toLowerCase();
      return nombreCompleto.includes(textoBusqueda);
    }).slice(0, 20);
  }

  abrirDropdownCC() {
    this.ccDropdownAbierto = true;
  }

  cerrarDropdownCC() {
    setTimeout(() => {
      this.ccDropdownAbierto = false;
    }, 150);
  }

  agregarUsuarioCC(idUsuario: number) {
    const idsCC = (this.UsuariosCCSeleccionados || [])
      .map(id => +id)
      .filter(id => !!id && id > 0)
      .filter((id, index, self) => self.indexOf(id) === index);

    if (idsCC.includes(idUsuario)) {
      return;
    }

    idsCC.push(+idUsuario);

    if (idsCC.length > this.maxUsuariosCC) {
      this.UsuariosCCSeleccionados = idsCC.slice(0, this.maxUsuariosCC);
      try {
        if (typeof Swal !== 'undefined' && Swal && typeof Swal.fire === 'function') {
          Swal.fire({
            icon: 'warning',
            title: 'Máximo 6 usuarios en CC',
            text: 'Puedes seleccionar hasta 6 personas en copia.'
          });
        }
      } catch (e) { }
      return;
    }

    this.UsuariosCCSeleccionados = idsCC;
    this.ccBusqueda = '';
    this.ccDropdownAbierto = true;
  }

  removerUsuarioCC(idUsuario: number) {
    this.UsuariosCCSeleccionados = (this.UsuariosCCSeleccionados || []).filter(id => +id !== +idUsuario);
  }

  obtenerNombreUsuarioCC(idUsuario: number): string {
    const usuario = (this.Responsables || []).find(u => +u.idUsuario === +idUsuario);
    if (!usuario) {
      return '';
    }
    return `${usuario.nombre || ''} ${usuario.paterno || ''}`.trim();
  }

  Agregar(Form) {
    this.Loading = true;
    this.Tarea.descripcionTarea = this.Tarea.descripcionTarea.replace(/\n/g, "<br>");
    const idsCCSeleccionados = (this.UsuariosCCSeleccionados || [])
      .map(id => +id)
      .filter(id => !!id && id > 0);
    this.Tarea.usuarioCC = idsCCSeleccionados.length > 0 ? idsCCSeleccionados[0] : 0;

    // console.log(this.usuario);

    this._sTarea.postAddTarea(this.Tarea).success(result => {
      const idTareaCreada = result && result.idTarea ? result.idTarea : null;
      const idsCCParaNotificar = idsCCSeleccionados
        .filter((id, index, self) => self.indexOf(id) === index)
        .filter(id => id !== this.Tarea.idUsuarioResponsable);

      this.crearNotificacionesInternasTarea(this.Tarea.idUsuarioResponsable, idsCCParaNotificar, idTareaCreada);
      
      try {
        if (typeof Swal !== 'undefined' && Swal && typeof Swal.fire === 'function') {
          Swal.fire({
            title: 'Tarea Creada',
            icon: 'success'
          });
        } else {
          alert('Tarea Creada');
        }
      } catch (e) {
        alert('Tarea Creada');
      }

      // Obtener nombre del usuario creador
      this._sVis_UsuarioPersona.getVis_UsuarioPersona().subscribe(usuariosPersona => {
        const usuarioCreador = usuariosPersona.find(up => up.idUsuario === this.usuario.idUsuario);
        const nombreCreador = usuarioCreador ? `${usuarioCreador.nombre} ${usuarioCreador.paterno}` : 'Usuario';

        this._sUsuario.getUsuariobyID(this.Tarea.idUsuarioResponsable).subscribe(result => {
          this._sMail.getMailbyidPersona(result.idPersona).subscribe(mail => {
            // Formatear fecha de cumplimiento
            let fechaCumplimiento = '';
            if (this.Tarea.fechaTerminoProgramado) {
              const fecha = new Date(this.Tarea.fechaTerminoProgramado);
              fechaCumplimiento = fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
            }
            
            // Link directo a la tarea
            const linkTarea = idTareaCreada 
              ? `http://proyectos.trazas-nbi.com/Ver-Tareas?editarTarea=${idTareaCreada}`
              : 'http://proyectos.trazas-nbi.com/Ver-Tareas';
            
            let mensaje = `Estimado, <br>
            <br>
                Informamos que se le ha asignado la siguiente tarea por <b>${nombreCreador}</b>:<br>
                <h3 style="margin-bottom: 0px;"><b>Descripción de la tarea:</b></h3>
                ${this.Tarea.descripcionTarea}<br><br>
                ${fechaCumplimiento ? '<h3 style="margin-bottom: 0px;"><b>Fecha de cumplimiento:</b></h3>' + fechaCumplimiento + '<br><br>' : ''}
                Favor informar avance en el siguiente link:<br> 
                <a href='${linkTarea}' target='_blank' style='font-size: 16px; font-weight: bold; color: #007bff;'>Ir a la Tarea</a>
            `;
          const correosResponsable = this.obtenerCorreosActivos(mail);
          if (correosResponsable.length > 0) {
            const correoResponsable = correosResponsable[0];

            // Obtener correos de todos los usuarios en CC (si existen)
            if (idsCCSeleccionados.length > 0) {
              const idsCCUnicos = idsCCSeleccionados
                .filter((id, index, self) => self.indexOf(id) === index)
                .filter(id => id !== this.Tarea.idUsuarioResponsable);

              this.obtenerCorreosCC(idsCCUnicos, 0, [], correosCC => {
                this.enviarCorreoConCC(correoResponsable, correosCC, mensaje);
              });
            } else {
              this.enviarCorreoConCC(correoResponsable, [], mensaje);
            }
            } else {
              console.warn('No se encontró correo activo para el responsable de la tarea');
              this.Tarea = new mTarea(null, null, null, null, 0, null, null, null, null, 1, new Date().toString(), true, null, this.usuario.idUsuario, null, "0", "0");
              this.UsuariosCCSeleccionados = [];
              this.ccBusqueda = '';
              this.responsableBusqueda = '';
              this.responsableDropdownAbierto = false;
              this.Loading = false;
            }
          });
        });
      });
    }).error(e => {
      console.log(e);
      this.Tarea = new mTarea(null, null, null, null, 0, null, null, null, null, 1, new Date().toString(), true, null, this.usuario.idUsuario, null, "0", "0");
      this.UsuariosCCSeleccionados = [];
      this.ccBusqueda = '';
      this.responsableBusqueda = '';
      this.responsableDropdownAbierto = false;
      this.Loading = false;
    });

  }

  crearNotificacionesInternasTarea(idResponsable: number, idsCC: Array<number>, idTareaCreada?: number) {
    const linkTarea = idTareaCreada ? `/Ver-Tareas?editarTarea=${idTareaCreada}` : '/Ver-Tareas';
    const titulo = 'Nueva tarea asignada';
    const descripcion = this.Tarea && this.Tarea.descripcionTarea
      ? this.Tarea.descripcionTarea.replace(/<br>/g, ' ')
      : 'Se te ha asignado una nueva tarea.';

    if (idResponsable && idResponsable > 0) {
      this._notificacionesService.crearNotificacionPersonalizada(
        idResponsable,
        'general',
        titulo,
        descripcion,
        'media',
        linkTarea
      );
    }

    (idsCC || []).forEach(idUsuarioCC => {
      if (!idUsuarioCC || idUsuarioCC <= 0) {
        return;
      }

      this._notificacionesService.crearNotificacionPersonalizada(
        idUsuarioCC,
        'general',
        `CC en tarea: ${titulo}`,
        descripcion,
        'media',
        linkTarea
      );
    });
  }

  obtenerCorreosCC(idsCC: Array<number>, index: number, correos: Array<string>, done: (correos: Array<string>) => void) {
    if (!idsCC || index >= idsCC.length) {
      done(correos);
      return;
    }

    const idUsuarioCC = idsCC[index];
    this._sUsuario.getUsuariobyID(idUsuarioCC).subscribe(usuarioCC => {
      if (usuarioCC && usuarioCC.idPersona) {
        this._sMail.getMailbyidPersona(usuarioCC.idPersona).subscribe(mailCC => {
          const correosActivosCC = this.obtenerCorreosActivos(mailCC);
          const correoCC = correosActivosCC.length > 0 ? correosActivosCC[0] : null;
          if (correoCC) {
            correos.push(correoCC);
          }
          this.obtenerCorreosCC(idsCC, index + 1, correos, done);
        }, () => {
          this.obtenerCorreosCC(idsCC, index + 1, correos, done);
        });
      } else {
        this.obtenerCorreosCC(idsCC, index + 1, correos, done);
      }
    }, () => {
      this.obtenerCorreosCC(idsCC, index + 1, correos, done);
    });
  }

  enviarCorreoConCC(correoResponsable: string, correosCC: Array<string>, mensaje: string) {
    const para = [correoResponsable].concat(correosCC || []).filter(x => !!x);
    const paraUnicos = para.filter((correo, index, self) => self.indexOf(correo) === index).join(',');

    if (!paraUnicos) {
      console.warn('No hay destinatarios válidos para enviar correo de tarea');
    } else {
      let correoEnviar: mCorreo = new mCorreo(paraUnicos, 'Tarea asignada', mensaje)
      this._sCorreo.postCorreo(correoEnviar).subscribe(
        () => { },
        err => { console.error('Error enviando correo de tarea:', err); }
      );
    }

    this.Tarea = new mTarea(null, null, null, null, 0, null, null, null, null, 1, new Date().toString(), true, null, this.usuario.idUsuario, null, "0", "0");
    this.UsuariosCCSeleccionados = [];
    this.ccBusqueda = '';
    this.responsableBusqueda = '';
    this.responsableDropdownAbierto = false;
    this.Loading = false;
  }

  obtenerCorreosActivos(mailList: Array<any>): Array<string> {
    const correos = (mailList || [])
      .filter(m => m && m.activo !== false && m.direccionMail && m.direccionMail.toString().trim().length > 0)
      .map(m => m.direccionMail.toString().trim());

    return correos.filter((correo, index, self) => self.indexOf(correo) === index);
  }

}