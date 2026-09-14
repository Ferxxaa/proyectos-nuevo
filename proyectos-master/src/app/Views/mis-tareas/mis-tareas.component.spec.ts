import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MisTareasComponent } from './mis-tareas.component';

describe('MisTareasComponent', () => {
  let component: MisTareasComponent;
  let fixture: ComponentFixture<MisTareasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MisTareasComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MisTareasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
