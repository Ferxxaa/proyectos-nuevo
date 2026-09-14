import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PermisosProyectosComponent } from './permisos-proyectos.component';

describe('PermisosProyectosComponent', () => {
  let component: PermisosProyectosComponent;
  let fixture: ComponentFixture<PermisosProyectosComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PermisosProyectosComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PermisosProyectosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
