import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ErrorConfirmacionComponent } from './error-confirmacion.component';

describe('ErrorConfirmacionComponent', () => {
  let component: ErrorConfirmacionComponent;
  let fixture: ComponentFixture<ErrorConfirmacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorConfirmacionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ErrorConfirmacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
