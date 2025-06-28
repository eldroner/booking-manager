import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmacionExitosaComponent } from './confirmacion-exitosa.component';

describe('ConfirmacionExitosaComponent', () => {
  let component: ConfirmacionExitosaComponent;
  let fixture: ComponentFixture<ConfirmacionExitosaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmacionExitosaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmacionExitosaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
