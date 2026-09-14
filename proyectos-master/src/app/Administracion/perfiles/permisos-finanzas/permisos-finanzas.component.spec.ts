import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PermisosFinanzasComponent } from './permisos-finanzas.component';

describe('PermisosFinanzasComponent', () => {
  let component: PermisosFinanzasComponent;
  let fixture: ComponentFixture<PermisosFinanzasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PermisosFinanzasComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PermisosFinanzasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
