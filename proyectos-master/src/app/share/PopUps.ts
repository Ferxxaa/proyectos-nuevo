import { Injectable } from '@angular/core';

declare var jQuery: any;
declare var $: any;

@Injectable()

export class PopUps {

  VerPopUpEditar() {
    $("#exampleModalLong").attr('class', 'modal fade in');
    $("#exampleModalLong").removeAttr("aria-hidden");
    $("#exampleModalLong").attr("style", "display: block;background-color:rgba(0, 0, 0, 0.5);overflow-y: scroll;");
    $("body").attr("style", "overflow-y: hidden;");
  }

  OcultarPopUpEditar() {
    $("#exampleModalLong").attr('class', 'modal fade');
    $("#exampleModalLong").attr("style", "");
    $("#exampleModalLong").removeAttr("aria-hidden");
    $("body").attr("style", "");
  }

  Confirmacion() {
    $("#Confirm").attr('class', 'modal fade in');
    $("#Confirm").attr("style", "display: block;background-color:rgba(0, 0, 0, 0.5);overflow-y: scroll;");
    $("body").attr("style", "overflow-y: hidden;");
  }

  OcultarConfirmacion() {
    $("#Confirm").attr('class', 'modal fade');
    $("#Confirm").attr("style", "");
    $("body").attr("style", "");
    return false
  }

}