import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingUserComponent } from './booking-user.component';

describe('BookingUserComponent', () => {
  let component: BookingUserComponent;
  let fixture: ComponentFixture<BookingUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingUserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
