import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaConfPendientesComponent } from './lista-conf-pendientes.component';

describe('ListaConfPendientesComponent', () => {
  let component: ListaConfPendientesComponent;
  let fixture: ComponentFixture<ListaConfPendientesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListaConfPendientesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListaConfPendientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
