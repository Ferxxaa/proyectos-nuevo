import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TablaHeaderComponent } from './tabla-header.component';

describe('TablaHeaderComponent', () => {
  let component: TablaHeaderComponent;
  let fixture: ComponentFixture<TablaHeaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TablaHeaderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TablaHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
