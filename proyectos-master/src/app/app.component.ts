import { Component, ViewChild } from '@angular/core';
import { Http, Response, Headers } from '@angular/http';
import 'rxjs/add/operator/map'

import {Md5} from 'ts-md5/dist/md5';
import { LoginComponent } from './login/login.component'
import { Router } from '@angular/router';
import { MainComponent } from './main/main.component';


declare var jQuery: any;
declare var $: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  
  @ViewChild(LoginComponent) login;

  user: {};
  date = new Date();
  master;

  constructor(private router:Router){
    //this.user=this.login.user;
    this.master = new MainComponent(this.router);
    if (this.master.header == false){
      router.navigate(["/Login"]);
    }
  }

  ngOnInit() {
    $.getScript("http://trazas-nbi.com/Bootstrap/ajax-bootstrap4/js/settings.js");
    $.getScript("http://trazas-nbi.com/Bootstrap/ajax-bootstrap4/js/app.js");
  }

}
