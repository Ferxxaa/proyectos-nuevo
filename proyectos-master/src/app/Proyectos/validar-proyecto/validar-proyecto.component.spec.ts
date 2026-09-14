import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidarProyectoComponent } from './validar-proyecto.component';

describe('ValidarProyectoComponent', () => {
  let component: ValidarProyectoComponent;
  let fixture: ComponentFixture<ValidarProyectoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ValidarProyectoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidarProyectoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
