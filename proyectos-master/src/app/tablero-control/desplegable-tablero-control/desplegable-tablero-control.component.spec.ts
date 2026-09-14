import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DesplegableTableroControlComponent } from './desplegable-tablero-control.component';

describe('DesplegableTableroControlComponent', () => {
  let component: DesplegableTableroControlComponent;
  let fixture: ComponentFixture<DesplegableTableroControlComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DesplegableTableroControlComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DesplegableTableroControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
