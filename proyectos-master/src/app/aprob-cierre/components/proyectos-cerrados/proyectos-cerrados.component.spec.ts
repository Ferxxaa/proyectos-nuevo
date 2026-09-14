import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProyectosCerradosComponent } from './proyectos-cerrados.component';

describe('ProyectosCerradosComponent', () => {
  let component: ProyectosCerradosComponent;
  let fixture: ComponentFixture<ProyectosCerradosComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProyectosCerradosComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProyectosCerradosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return 0 when the detail array contains undefined entries or missing dates', () => {
    const unsafeComponent = Object.create(ProyectosCerradosComponent.prototype) as any;
    unsafeComponent.comunes = {
      calDuracionProy: (inicio: string, termino: string) => {
        const diff = new Date(termino).getTime() - new Date(inicio).getTime();
        return Math.round(diff / 86400000);
      }
    };

    expect(unsafeComponent.retDuracionProyecto([undefined as any])).toBe(0);
    expect(unsafeComponent.retDuracionProyecto([
      undefined as any,
      { fechaInicioReal: '2024-01-01T00:00:00', fechaTerminoReal: '2024-01-31T00:00:00', vigente: true }
    ] as any)).toBe(30);
  });
});
