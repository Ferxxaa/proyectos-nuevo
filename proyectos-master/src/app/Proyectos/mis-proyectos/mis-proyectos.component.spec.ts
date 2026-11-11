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

  it('sets the sub-project traffic light by delay days', () => {
    const calcularSemaforo = component['calcularSemaforo'].bind(component);
    const proyecto = { DuracionTotal: 100, AvanceProgramado: 50, AvanceReal: 50 };

    expect(calcularSemaforo(Object.assign({}, proyecto, { duracionReal: 101 }))).toBe('verde');
    expect(calcularSemaforo(Object.assign({}, proyecto, { duracionReal: 102 }))).toBe('amarillo');
    expect(calcularSemaforo(Object.assign({}, proyecto, { duracionReal: 111 }))).toBe('amarillo');
    expect(calcularSemaforo(Object.assign({}, proyecto, { duracionReal: 112 }))).toBe('rojo');
  });

  it('counts progress delay as days within the planned duration', () => {
    const calcularSemaforo = component['calcularSemaforo'].bind(component);
    const base = { DuracionTotal: 100, duracionReal: 50 };

    // adelantado o al día
    expect(calcularSemaforo(Object.assign({}, base, { AvanceProgramado: 50, AvanceReal: 60 }))).toBe('verde');
    // 1 día de atraso
    expect(calcularSemaforo(Object.assign({}, base, { AvanceProgramado: 50, AvanceReal: 49 }))).toBe('verde');
    // 2 y 11 días de atraso
    expect(calcularSemaforo(Object.assign({}, base, { AvanceProgramado: 50, AvanceReal: 48 }))).toBe('amarillo');
    expect(calcularSemaforo(Object.assign({}, base, { AvanceProgramado: 50, AvanceReal: 39 }))).toBe('amarillo');
    // 12 días de atraso
    expect(calcularSemaforo(Object.assign({}, base, { AvanceProgramado: 50, AvanceReal: 38 }))).toBe('rojo');
  });
});