import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpModule } from '@angular/http';

import { TemplateAprobComponent } from './template-aprob/template-aprob.component';
import { ProyectosCerradosComponent } from './components/proyectos-cerrados/proyectos-cerrados.component';
import { NavComponent } from '../nav/nav.component';
import { HeaderComponent } from '../header/header.component';
import { MainComponent } from '../main/main.component';
import { UserComponent } from '../header/user/user.component';
import { PopUpContentComponent } from '../share/components/pop-up-content/pop-up-content.component';
import { MaterialModule } from '../material';
import { sDetalleSubProyecto } from '../services/sDetalleSubProyecto.service';
import { IdEtapaToNombrePipe } from './pipe/id-etapa-to-nombre.pipe';
import { sEtapa } from '../services/sEtapa.service';
import { sSubProyecto } from '../services/sSubProyecto.service';
import { sCorreo } from '../services/Personalizados/sCorreo.service';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { sMis_Proyectos } from '../services/sMis_Proyectos.service';
import { sMis_Tareas } from '../services/sMis_Tareas.service';
import { spMis_Tareas } from '../services/Personalizados/spMis_Tareas.service';
import { sProyecto } from '../services/sProyecto.service';
import { CleanDuplicadosPipe } from './pipe/clean-duplicados.pipe';
import { AddDuracionRealPipe } from './pipe/add-duracion-real.pipe';
import { ReduceDuracionProgramadaPipe } from './pipe/reduce-duracion-programada.pipe';
import { ReduceDuracionRealPipe } from './pipe/reduce-duracion-real.pipe';
import { Comunes } from '../Share/Comunes';
import { NotificacionesService } from '../services/notificaciones.service';


@NgModule({
  imports: [
    CommonModule,
    HttpModule,
    MaterialModule,
    FormsModule,
    RouterModule
  ],
  declarations: [
    TemplateAprobComponent, 
    ProyectosCerradosComponent,
    NavComponent,
    UserComponent,
    HeaderComponent,
    MainComponent,
    PopUpContentComponent,
    IdEtapaToNombrePipe,
    CleanDuplicadosPipe,
    AddDuracionRealPipe,
    ReduceDuracionProgramadaPipe,
    ReduceDuracionRealPipe
  ],
  providers:[
    sSubProyecto,
    sProyecto,
    sMis_Proyectos,
    sMis_Tareas,
    spMis_Tareas,
    sDetalleSubProyecto,
    sEtapa,
    sCorreo,
    Comunes,
    NotificacionesService
  ],
  exports: [
    TemplateAprobComponent, 
    ProyectosCerradosComponent,
    NavComponent,
    UserComponent,
    HeaderComponent,
    MainComponent,
    PopUpContentComponent
  ]
})
export class AprobCierreModule { }
