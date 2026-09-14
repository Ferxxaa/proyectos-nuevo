import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MisProyectosComponent } from './mis-proyectos.component';

describe('MisProyectosComponent', () => {
  let component: MisProyectosComponent;
  let fixture: ComponentFixture<MisProyectosComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MisProyectosComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MisProyectosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
