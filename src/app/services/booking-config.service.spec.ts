import { TestBed } from '@angular/core/testing';

import { BookingConfigService } from './booking-config.service';

describe('BookingConfigService', () => {
  let service: BookingConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BookingConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
