import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateAprobComponent } from './template-aprob.component';

describe('TemplateAprobComponent', () => {
  let component: TemplateAprobComponent;
  let fixture: ComponentFixture<TemplateAprobComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TemplateAprobComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TemplateAprobComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
