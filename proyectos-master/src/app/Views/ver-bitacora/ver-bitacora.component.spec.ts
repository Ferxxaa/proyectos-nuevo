import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VerBitacoraComponent } from './ver-bitacora.component';

describe('VerBitacoraComponent', () => {
  let component: VerBitacoraComponent;
  let fixture: ComponentFixture<VerBitacoraComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VerBitacoraComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerBitacoraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
