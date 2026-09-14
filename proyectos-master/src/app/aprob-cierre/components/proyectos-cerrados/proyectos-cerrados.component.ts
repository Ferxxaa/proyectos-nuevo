import { Component, OnInit, ViewChild } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ActivatedRoute } from '@angular/router';
import { mDetalleSubProyecto } from '../../../models/mDetalleSubProyecto';
import { mSubProyecto } from '../../../models/mSubProyecto';
import { mVis_SubProyecto } from '../../../models/mVis_SubProyecto';
import { sDetalleSubProyecto } from '../../../services/sDetalleSubProyecto.service';
import { sMis_Proyectos } from '../../../services/sMis_Proyectos.service';
import { sSubProyecto } from '../../../services/sSubProyecto.service';
import { sVis_SubProyecto } from '../../../services/sVis_SubProyecto.service';
import { PopUpContentComponent } from '../../../share/components/pop-up-content/pop-up-content.component';
import { Comunes } from '../../../Share/Comunes';
import { firestoreDB } from '../../../firebase-init';

@Component({
  selector: 'app-proyectos-cerrados',
  templateUrl: './proyectos-cerrados.component.html',
  styleUrls: ['./proyectos-cerrados.component.css']
})
export class ProyectosCerradosComponent implements OnInit {

  proyectosCerrados$: Observable<any>;
  detalleProyecto$: Observable<mDetalleSubProyecto> | null;
  solicitudesCierrePendientes: any[];
  subProyectoSeleccionadoId: number | null = null;

  subProy: mSubProyecto;
  mensaje: string;
  estadoMensaje: number;

  @ViewChild(PopUpContentComponent) popUp: PopUpContentComponent;

  constructor(
    private subProyecto: sSubProyecto,
    private misProyectos: sMis_Proyectos,
    public detalleProyecto: sDetalleSubProyecto,
    private comunes: Comunes,
    private route: ActivatedRoute
  ) {
    this.proyectosCerrados$ = this.misProyectos.getMis_ProyectosbynombreEstadoProyecto("Finalizado");
    this.detalleProyecto$ = null;
    this.mensaje = '';
    this.estadoMensaje = 0;
    this.solicitudesCierrePendientes = [];
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const idSubProyecto = params['subproyecto'];
      this.subProyectoSeleccionadoId = idSubProyecto ? Number(idSubProyecto) : null;
      this.cargarSolicitudesCierrePendientes();
    });
  }

  private cargarSolicitudesCierrePendientes() {
    firestoreDB.collection('solicitudesCierre')
      .where('estado', '==', 'pendiente_validacion')
      .onSnapshot((snapshot: any) => {
        let solicitudes = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        if (this.subProyectoSeleccionadoId) {
          solicitudes = solicitudes.filter((item: any) => Number(item.idSubProyecto) === this.subProyectoSeleccionadoId);
        }

        this.solicitudesCierrePendientes = solicitudes;
      }, (error: any) => {
        console.warn('No se pudieron cargar solicitudes de cierre desde Firebase. Se muestra la lista vacía.', error);
        this.solicitudesCierrePendientes = [];
      });
  }

  aprobarSolicitudCierre(solicitud: any) {
    if (!solicitud) {
      return;
    }

    this.subProyecto.getSubProyectobyID(solicitud.idSubProyecto).subscribe(subProy => {
      this.subProy = subProy;
      this.subProy.idEstadoProyecto = 7;
      this.subProyecto.postUpdDelSubProyecto(this.subProy).then(res => {
        this.removerSolicitudCierre(solicitud);
        this.proyectosCerrados$ = this.misProyectos.getMis_ProyectosbynombreEstadoProyecto("Finalizado");
        this.mensaje = 'Se ha confirmado el cierre del proyecto, Muchas gracias';
        this.estadoMensaje = 1;
      });
    });
  }

  anularSolicitudCierre(solicitud: any) {
    if (!solicitud) {
      return;
    }

    this.subProyecto.getSubProyectobyID(solicitud.idSubProyecto).subscribe(subProy => {
      this.subProy = subProy;
      this.subProy.idEstadoProyecto = 4;
      this.subProyecto.postUpdDelSubProyecto(this.subProy).then(res => {
        this.removerSolicitudCierre(solicitud);
        this.mensaje = 'Se ha anulado el cierre del proyecto, Favor gestionar los ajustes necesarios';
        this.estadoMensaje = 2;
      });
    });
  }

  private removerSolicitudCierre(solicitud: any) {
    if (!solicitud || !solicitud.id) {
      return;
    }

    firestoreDB.collection('solicitudesCierre').doc(solicitud.id).delete().catch((error: any) => {
      if (error && error.code === 'permission-denied') {
        console.warn('La solicitud se aprobó/rechazó localmente, pero Firebase no permitió borrar el registro por permisos insuficientes.', error);
        return;
      }
      console.error('Error eliminando solicitud de cierre desde Firebase:', error);
    });
  }

  viewDetalleProyecto(visProyecto: mVis_SubProyecto) {
    this.detalleProyecto$ = this.detalleProyecto.getDetalleSubProyectobyidSubProyecto(visProyecto.idSubProyecto);
    this.popUp.show();
    this.subProyecto.getSubProyectobyID(visProyecto.idSubProyecto).subscribe(subProy => {
      this.subProy = subProy
    })
  }

  cerrarProyecto() {
    this.subProy.idEstadoProyecto = 7;
    this.actualizarSubProy('Se ha Confirmado el cierre del proyecto, Muchas gracias', 1);
  }

  anularCierre() {
    this.subProy.idEstadoProyecto = 4;
    this.actualizarSubProy('Se ha Anulado el cierre del proyecto, Favor gestionar los ajustes necesarios', 2);
  }

  retDuracionProyecto(detalles: mDetalleSubProyecto[]): number {
    if (!Array.isArray(detalles) || detalles.length === 0) {
      return 0;
    }

    const detallesValidos = detalles.filter((item: any) => item && item.fechaInicioReal);
    if (detallesValidos.length === 0) {
      return 0;
    }

    const inicioReal = detallesValidos[0].fechaInicioReal;
    const etapaVigente = detallesValidos.find((el: any) => el && el.vigente && el.fechaTerminoReal);
    const terminoReal = etapaVigente && etapaVigente.fechaTerminoReal ? etapaVigente.fechaTerminoReal : null;

    if (!inicioReal || !terminoReal) {
      return 0;
    }

    try {
      return this.comunes.calDuracionProy(inicioReal, terminoReal);
    } catch (error) {
      console.warn('retDuracionProyecto: no fue posible calcular la duración real.', error);
      return 0;
    }
  }

  private actualizarSubProy(mesaje: string, estadoMensaje: number) {
    this.subProyecto.postUpdDelSubProyecto(this.subProy).then(res => {
      console.log(res);
      this.proyectosCerrados$ = this.misProyectos.getMis_ProyectosbynombreEstadoProyecto("Finalizado");
      this.detalleProyecto$ = null;
      this.mensaje = mesaje;
      this.estadoMensaje = estadoMensaje;
    });
  }

}
