import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SemaforoProyectoComponent } from './semaforo-proyecto.component';

describe('SemaforoProyectoComponent', () => {
  let component: SemaforoProyectoComponent;
  let fixture: ComponentFixture<SemaforoProyectoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SemaforoProyectoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SemaforoProyectoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
