import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AgregarArchivoEstandarComponent } from './agregar-archivo-estandar.component';

describe('AgregarArchivoEstandarComponent', () => {
  let component: AgregarArchivoEstandarComponent;
  let fixture: ComponentFixture<AgregarArchivoEstandarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AgregarArchivoEstandarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AgregarArchivoEstandarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
