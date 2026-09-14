import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CartaGanttComponent } from './carta-gantt.component';

describe('CartaGanttComponent', () => {
  let component: CartaGanttComponent;
  let fixture: ComponentFixture<CartaGanttComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CartaGanttComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CartaGanttComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
