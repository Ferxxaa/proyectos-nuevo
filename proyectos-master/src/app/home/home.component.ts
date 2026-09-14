import { Component, OnInit } from '@angular/core';
import { Http, Response, Headers } from '@angular/http';
import 'rxjs/add/operator/map'
import { style } from '@angular/core/src/animation/dsl';
import { AppComponent } from '../app.component';
import { Router } from '@angular/router';

declare var jQuery: any;
declare var $: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})

export class HomeComponent implements OnInit {

  SubProy : any;
  Tareas: any;
  pgProy1 : string;
  status : boolean;
  

  'ProgBar'
  Proyectos= [];
  nombreProy : string;
  AvanceProyBar : string;
  datos:any ={}
  
  constructor(private _http: Http, private router: Router) {

    this.status=true;

    this.Tareas = [
      {Tarea: "Tarea", id: "1"},
      {Tarea: "Tarea1", id: "2"},
      {Tarea: "Tarea2", id: "3"},
    ]

   }

   CargaDatosReporteSP(){
    this.status=true;
     var me = this;
     this.Proyectos=[];
    $.ajax({
      url: "http://trazas-nbi.com:1234/api/SubProyectoCalculado/GetSubProyectoCalculadoByIdUsuarioCoordinador/CalculadoCoordinador=2"
    }).then(function(data) {
      data.forEach(element => {
        //console.log("Lo devuelto por la funcion es: " + me.ReporteSP(element))
        let P = { "Nombre" : element.nombreSubProyecto , "Avance" : element.AvanceReal, "Estado" : element.Estado }
        me.Proyectos.push(P);
      });
      this.status=false;
    });
    //this.status=false;
   }

  ngOnInit() {
    // Cambiar color del nav al entrar a Home (gris)
    setTimeout(() => {
      if (typeof $ !== 'undefined') {
        $('#sidebar').css('background-color', '#464545ff');
      } else {
        const nav = document.getElementById('sidebar');
        if (nav) nav.style.backgroundColor = '#9c9696ff';
      }
    }, 100);

    $.getScript("http://trazas-nbi.com/Bootstrap/ajax-bootstrap4/js/settings.js");
    $.getScript("http://trazas-nbi.com/Bootstrap/ajax-bootstrap4/js/app.js");
    
    this.status=true;
    $('#content').attr('class','content foo');

    this.CargaDatosReporteSP()

    $.ajax({
      url: "http://trazas-nbi.com:1234/api/Tarea/GetTareaByidUsuarioResponsable/idUsuarioResponsable=1"
      }).then(function(data) {
        $('#lblTareasPendientes').append(data.length);
        $('#lblTarPen').append(data.length);
      });

    this.status=false;

    //console.log("cargue el home");

  }

  setMyStyles(index:number){
    let styles = {
      'width': this.Proyectos[index].Avance + '%',
    };
    return styles;
  }

  getClase(Estado:string):string{
    var clase : string
    if (Estado=="warning" ){
      clase="progress-warning";
    }else if(Estado=="danger"){
      clase="progress-danger";
    }else{
      clase="progress-success";
    }
    
    return clase
  }

}