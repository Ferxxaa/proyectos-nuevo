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

  it('sets the sub-project traffic light by percentage-point difference, regardless of duration', () => {
    const calcularSemaforo = component['calcularSemaforo'].bind(component);
    const proyecto = { AvanceProgramado: 50, AvanceReal: 50 };

    expect(calcularSemaforo(Object.assign({}, proyecto, { AvanceReal: 51, DuracionTotal: 100 }))).toBe('verde');
    expect(calcularSemaforo(Object.assign({}, proyecto, { AvanceReal: 45, DuracionTotal: 1 }))).toBe('verde');
    expect(calcularSemaforo(Object.assign({}, proyecto, { AvanceReal: 44.9 }))).toBe('amarillo');
    expect(calcularSemaforo(Object.assign({}, proyecto, { AvanceReal: 40.1 }))).toBe('amarillo');
    expect(calcularSemaforo(Object.assign({}, proyecto, { AvanceReal: 40 }))).toBe('rojo');
  });
});