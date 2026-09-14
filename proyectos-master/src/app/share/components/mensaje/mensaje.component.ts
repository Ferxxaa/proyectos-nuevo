import { Component, OnInit, Input } from '@angular/core';

//import { PopUps } from '../../PopUps'
declare var $: any;

@Component({
  selector: 'app-mensaje',
  templateUrl: './mensaje.component.html',
  styleUrls: ['./mensaje.component.css']
  //providers: [PopUps]
})
export class MensajeComponent implements OnInit {

  @Input() mensaje: string;
  @Input() visible: boolean;

  constructor(
    //private _PopUps: PopUps
  ) { }

  ngOnInit() {
  }

  OcultarMensaje() {
    this.visible = false;
    $("body").attr("style", "overflow-y: scroll;");
  }


}
