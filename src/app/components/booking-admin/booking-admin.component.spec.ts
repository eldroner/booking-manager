import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingAdminComponent } from './booking-admin.component';

describe('BookingAdminComponent', () => {
  let component: BookingAdminComponent;
  let fixture: ComponentFixture<BookingAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
