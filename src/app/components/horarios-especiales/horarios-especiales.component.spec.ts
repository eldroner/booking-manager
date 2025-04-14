import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorariosEspecialesComponent } from './horarios-especiales.component';

describe('HorariosEspecialesComponent', () => {
  let component: HorariosEspecialesComponent;
  let fixture: ComponentFixture<HorariosEspecialesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorariosEspecialesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HorariosEspecialesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
