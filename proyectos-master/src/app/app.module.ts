import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';
import { Md5 } from 'ts-md5/dist/md5';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
// import { UserComponent } from './header/user/user.component';
// import { HeaderComponent } from './header/header.component';
// import { NavComponent } from './nav/nav.component';
// import { MainComponent } from './main/main.component';
import { Ng2UploaderModule } from 'ng2-uploader';
//import { SanityPipe } from './sanity.pipe';
import { ProyectoMatrizComponent } from './Proyectos/proyecto-matriz/proyecto-matriz.component';
import { ProyectoComponent } from './Proyectos/proyecto/proyecto.component';
import { ValidarProyectoComponent } from './Proyectos/validar-proyecto/validar-proyecto.component';
import { SubProyectoComponent } from './Proyectos/sub-proyecto/sub-proyecto.component';
import { ValidarSubProyectoComponent } from './Proyectos/validar-sub-proyecto/validar-sub-proyecto.component';
import { MisProyectosComponent } from './Proyectos/mis-proyectos/mis-proyectos.component';
import { CartasGanttComponent } from './Proyectos/cartas-gantt.component';
import { ConfiguracionSubProyectoComponent } from './Configuracion/configuracion-sub-proyecto/configuracion-sub-proyecto.component';
import { ValidacionConfigSubProyectoComponent } from './Configuracion/validacion-config-sub-proyecto/validacion-config-sub-proyecto.component';
import { validateConfig } from '@angular/router/src/config';
import { SelectValidatorDirective } from './share/selectValidator.directive';
import { TableroControlComponent } from './tablero-control/tablero-control.component';
import { SeguimientoComponent } from './tablero-control/seguimiento/seguimiento.component';
import { BitacoraComponent } from './tablero-control/bitacora/bitacora.component';
import { ArchiosEstandarComponent } from './tablero-control/archios-estandar/archios-estandar.component';
import { TareasComponent } from './tablero-control/tareas/tareas.component';
import { VerBitacoraComponent } from './Views/ver-bitacora/ver-bitacora.component';
import { MisTareasComponent } from './Views/mis-tareas/mis-tareas.component';
import { MensajeComponent } from './share/components/mensaje/mensaje.component';
import { CrearTareaComponent } from './tareas/crear-tarea/crear-tarea.component';
import { CalendarioTareasComponent } from './tareas/calendario-tareas/calendario-tareas.component';
import { UsuariosComponent } from './Administracion/usuarios/usuarios.component';
import { NotificacionesService } from './services/notificaciones.service';
import { NotificacionesComponent } from './header/notificaciones/notificaciones.component';
import { spMis_Tareas } from './services/Personalizados/spMis_Tareas.service';
import { sUsuariosPerfiles } from './services/sUsuariosPerfiles.service';
import { sProyectoMatriz } from './services/sProyectoMatriz.service';
import { sProyecto } from './services/sProyecto.service';
import { sSubProyecto } from './services/sSubProyecto.service';
import { sCorreo } from './services/Personalizados/sCorreo.service';

//Material
import { MaterialModule } from './material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HomeAdnComponent } from './home/home-adn/home-adn.component';
import { PerfilesComponent } from './Administracion/perfiles/perfiles.component';
import { AgregarArchivoEstandarComponent } from './tablero-control/archios-estandar/agregar-archivo-estandar/agregar-archivo-estandar.component';
import { TablaHeaderComponent } from './tablero-control/tabla-header/tabla-header.component';
import { DesplegableTableroControlComponent } from './tablero-control/desplegable-tablero-control/desplegable-tablero-control.component';
import { CartaGanttComponent } from './tablero-control/carta-gantt/carta-gantt.component';
import { ListaConfPendientesComponent } from './Configuracion/lista-conf-pendientes/lista-conf-pendientes.component';
import { ArrDistingPipe } from './tablero-control/tareas/arr-disting.pipe';
import { FiltroMisTareasComponent } from './Views/mis-tareas/filtro-mis-tareas/filtro-mis-tareas.component';
import { SelectComponent } from './share/components/select/select.component';
import { PermisosProyectosComponent } from './Administracion/perfiles/permisos-proyectos/permisos-proyectos.component';
import { PermisosLicitacionesComponent } from './Administracion/perfiles/permisos-licitaciones/permisos-licitaciones.component';
import { PermisosFinanzasComponent } from './Administracion/perfiles/permisos-finanzas/permisos-finanzas.component';
import { SemaforoProyectoComponent } from './share/components/semaforo-proyecto/semaforo-proyecto.component';
import { HelpComponent } from './share/components/help/help.component';
import { FilterPerfilCategoriaPipe } from './Administracion/perfiles/pipe/filter-perfil-categoria.pipe';
import { ListUsersComponent } from './Administracion/components/list-users/list-users.component';
import { PerfilesPersonasComponent } from './Administracion/components/perfiles-personas/perfiles-personas.component';
import { OrderPerfilesPipe } from './Administracion/pipe/order-perfiles.pipe';
import { SortMisProyectosPipe } from './Proyectos/pipe/sort-mis-proyectos.pipe';
import { AprobCierreModule } from './aprob-cierre/aprob-cierre.module';
import { TemplateAprobComponent } from './aprob-cierre/template-aprob/template-aprob.component';
import { SortSpPipe } from './Proyectos/pipe/sort-sp.pipe';
import { ControlAvanceComponent } from './Proyectos/control-avance/control-avance.component';
import { ControlHallazgosComponent } from './Proyectos/control-hallazgos/control-hallazgos.component';
import { GraficoEstructuralComponent } from './nav/estructura-matrices/grafico-estructural.component';
import { sVis_ProyectoMatriz } from './services/sVis_ProyectoMatriz.service';
import { sVis_Proyectos } from './services/sVis_Proyectos.service';
import { sVis_SubProyecto } from './services/sVis_SubProyecto.service';

const route = [
  {
    path: '',
    redirectTo: '/Login',
    pathMatch: 'full'
  },
  {
    path: 'Login',
    component: LoginComponent
  },
  {
    path: 'Home',
    component: HomeComponent
  },
  {
    path: 'Proyectos-ProyectoMatriz',
    component: ProyectoMatrizComponent
  },
  {
    path: 'Proyectos-Proyecto',
    component: ProyectoComponent
  },
  {
    path: 'Proyectos-ValidarProyecto',
    component: ValidarProyectoComponent
  },
  {
    path: 'Proyectos-SubProyecto',
    component: SubProyectoComponent
  },
  {
    path: 'Proyectos-ValidarSubProyectos',
    component: ValidarSubProyectoComponent
  },
  {
    path: 'Proyectos-MisProyectos',
    component: MisProyectosComponent
  },
  {
    path: 'Proyectos-CartasGantt',
    component: CartasGanttComponent
  },
  {
    path: 'Configuracion-SubProyecto',
    component: ConfiguracionSubProyectoComponent
  },
  {
    path: 'Configuracion-ValidacionSubProyecto',
    component: ValidacionConfigSubProyectoComponent
  },
  {
    path: 'Proyecto-TableroControl',
    component: TableroControlComponent
  },
  {
    path: 'Tablero-Control/:id',
    component: TableroControlComponent
  },
  {
    path: 'Ver-Bitacora',
    component: VerBitacoraComponent
  },
  {
    path: 'Ver-Tareas',
    component: MisTareasComponent
  },
  {
    path: 'Crear-Tareas',
    component: CrearTareaComponent
  },
  {
    path: 'Calendario-Tareas',
    component: CalendarioTareasComponent
  },
  {
    path: 'Usuarios',
    component: UsuariosComponent
  },
  {
    path: 'HomeAdn',
    component: HomeAdnComponent
  },
  {
    path: 'Perfiles',
    component: PerfilesComponent
  },
  {
    path: 'Validacion-Cierre',
    component: TemplateAprobComponent
  },
  {
    path: 'ProyectosFinalizados',
    component: TemplateAprobComponent
  },
  {
    path: 'notificaciones',
    component: NotificacionesComponent
  },
  {
    path: 'Grafico-Estructural',
    component: GraficoEstructuralComponent
  }
]

@NgModule({
  declarations: [
    // MensajeComponent ya está declarado aquí, lo que permite usar <app-mensaje> en cualquier template de este módulo.
    AppComponent,
    LoginComponent,
    HomeComponent,
    // UserComponent,
    // HeaderComponent,
    // NavComponent,
    // MainComponent,
    ProyectoMatrizComponent,
    ProyectoComponent,
    ValidarProyectoComponent,
    SubProyectoComponent,
    ValidarSubProyectoComponent,
    MisProyectosComponent,
    CartasGanttComponent,
    ConfiguracionSubProyectoComponent,
    ValidacionConfigSubProyectoComponent,
    SelectValidatorDirective,
    TableroControlComponent,
    SeguimientoComponent,
    BitacoraComponent,
    ArchiosEstandarComponent,
    TareasComponent,
    VerBitacoraComponent,
    MisTareasComponent,
    MensajeComponent,
    CrearTareaComponent,
    CalendarioTareasComponent,
    UsuariosComponent,
    HomeAdnComponent,
    PerfilesComponent,
    AgregarArchivoEstandarComponent,
    TablaHeaderComponent,
    DesplegableTableroControlComponent,
    CartaGanttComponent,
    ListaConfPendientesComponent,
    ArrDistingPipe,
    FiltroMisTareasComponent,
    SelectComponent,
    PermisosProyectosComponent,
    PermisosLicitacionesComponent,
    PermisosFinanzasComponent,
    SemaforoProyectoComponent,
    HelpComponent,
    FilterPerfilCategoriaPipe,
    ListUsersComponent,
    PerfilesPersonasComponent,
    OrderPerfilesPipe,
    SortMisProyectosPipe,
    SortSpPipe,
    NotificacionesComponent,
    ControlAvanceComponent,
    ControlHallazgosComponent,
    GraficoEstructuralComponent,
  ],
  imports: [
    // FormsModule ya está importado aquí, lo que permite usar [(ngModel)] en los templates de este módulo.
    HttpModule,
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    MaterialModule,
    ReactiveFormsModule,
    AprobCierreModule,
    RouterModule.forRoot(route, { onSameUrlNavigation: 'reload' }),
  ],
  providers: [
    NotificacionesService,
    spMis_Tareas,
    sUsuariosPerfiles,
    sProyectoMatriz,
    sProyecto,
    sSubProyecto,
    sCorreo,
    sVis_ProyectoMatriz,
    sVis_Proyectos,
    sVis_SubProyecto,
    DatePipe
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
