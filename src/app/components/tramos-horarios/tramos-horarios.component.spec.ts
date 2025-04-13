import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TramosHorariosComponent } from './tramos-horarios.component';

describe('TramosHorariosComponent', () => {
  let component: TramosHorariosComponent;
  let fixture: ComponentFixture<TramosHorariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TramosHorariosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TramosHorariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
