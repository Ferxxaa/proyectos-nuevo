import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PermisosLicitacionesComponent } from './permisos-licitaciones.component';

describe('PermisosLicitacionesComponent', () => {
  let component: PermisosLicitacionesComponent;
  let fixture: ComponentFixture<PermisosLicitacionesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PermisosLicitacionesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PermisosLicitacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
