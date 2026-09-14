import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidarSubProyectoComponent } from './validar-sub-proyecto.component';

describe('ValidarSubProyectoComponent', () => {
  let component: ValidarSubProyectoComponent;
  let fixture: ComponentFixture<ValidarSubProyectoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ValidarSubProyectoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidarSubProyectoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
