import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.css']
})
export class HelpComponent implements OnInit {

  @Input() text: string;

  constructor() { }

  ngOnInit() {
  }

}
