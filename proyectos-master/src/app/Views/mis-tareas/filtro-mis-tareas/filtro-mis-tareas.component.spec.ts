import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FiltroMisTareasComponent } from './filtro-mis-tareas.component';

describe('FiltroMisTareasComponent', () => {
  let component: FiltroMisTareasComponent;
  let fixture: ComponentFixture<FiltroMisTareasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FiltroMisTareasComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FiltroMisTareasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
