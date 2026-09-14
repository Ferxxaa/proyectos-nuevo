import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidacionConfigSubProyectoComponent } from './validacion-config-sub-proyecto.component';

describe('ValidacionConfigSubProyectoComponent', () => {
  let component: ValidacionConfigSubProyectoComponent;
  let fixture: ComponentFixture<ValidacionConfigSubProyectoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ValidacionConfigSubProyectoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidacionConfigSubProyectoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
