import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PopUpContentComponent } from './pop-up-content.component';

describe('PopUpContentComponent', () => {
  let component: PopUpContentComponent;
  let fixture: ComponentFixture<PopUpContentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PopUpContentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PopUpContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
