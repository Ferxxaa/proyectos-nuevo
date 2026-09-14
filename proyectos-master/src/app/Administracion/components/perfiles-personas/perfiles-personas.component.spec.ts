import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilesPersonasComponent } from './perfiles-personas.component';

describe('PerfilesPersonasComponent', () => {
  let component: PerfilesPersonasComponent;
  let fixture: ComponentFixture<PerfilesPersonasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PerfilesPersonasComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PerfilesPersonasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
