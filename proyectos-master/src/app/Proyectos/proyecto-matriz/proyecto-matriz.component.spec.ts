import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProyectoMatrizComponent } from './proyecto-matriz.component';

describe('ProyectoMatrizComponent', () => {
  let component: ProyectoMatrizComponent;
  let fixture: ComponentFixture<ProyectoMatrizComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProyectoMatrizComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProyectoMatrizComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
