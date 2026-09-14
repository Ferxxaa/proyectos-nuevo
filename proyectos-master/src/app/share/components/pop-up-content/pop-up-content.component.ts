import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-pop-up-content',
  templateUrl: './pop-up-content.component.html',
  styleUrls: ['./pop-up-content.component.css']
})
export class PopUpContentComponent implements OnInit {

  visible: boolean;

  constructor() {}

  ngOnInit() {
  }

  prevPropag(e) {
    e.stopPropagation();
  }

  show() {
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }

}
