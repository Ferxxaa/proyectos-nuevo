import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SubProyectoComponent } from './sub-proyecto.component';

describe('SubProyectoComponent', () => {
  let component: SubProyectoComponent;
  let fixture: ComponentFixture<SubProyectoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SubProyectoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SubProyectoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
