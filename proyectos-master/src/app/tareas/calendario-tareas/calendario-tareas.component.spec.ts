import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarioTareasComponent } from './calendario-tareas.component';

describe('CalendarioTareasComponent', () => {
  let component: CalendarioTareasComponent;
  let fixture: ComponentFixture<CalendarioTareasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CalendarioTareasComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CalendarioTareasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
