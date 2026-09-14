import { async, ComponentFixture, TestBed } from '../../../../node_modules/@angular/core/testing';

import { HomeAdnComponent } from './home-adn.component';

describe('HomeAdnComponent', () => {
  let component: HomeAdnComponent;
  let fixture: ComponentFixture<HomeAdnComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HomeAdnComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeAdnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
