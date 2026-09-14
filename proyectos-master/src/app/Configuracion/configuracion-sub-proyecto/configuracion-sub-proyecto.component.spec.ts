import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfiguracionSubProyectoComponent } from './configuracion-sub-proyecto.component';

describe('ConfiguracionSubProyectoComponent', () => {
  let component: ConfiguracionSubProyectoComponent;
  let fixture: ComponentFixture<ConfiguracionSubProyectoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConfiguracionSubProyectoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfiguracionSubProyectoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
