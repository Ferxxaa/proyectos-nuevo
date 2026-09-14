import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TableroControlComponent } from './tablero-control.component';

describe('TableroControlComponent', () => {
  let component: TableroControlComponent;
  let fixture: ComponentFixture<TableroControlComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TableroControlComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TableroControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
