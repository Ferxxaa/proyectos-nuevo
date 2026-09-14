import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ArchiosEstandarComponent } from './archios-estandar.component';

describe('ArchiosEstandarComponent', () => {
  let component: ArchiosEstandarComponent;
  let fixture: ComponentFixture<ArchiosEstandarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ArchiosEstandarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ArchiosEstandarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
