// booking-page.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingUserComponent } from '../booking-user/booking-user.component';
import { BookingAdminComponent } from '../booking-admin/booking-admin.component';
import { BookingConfigService } from '../../services/booking-config.service';

@Component({
    selector: 'app-booking-page',
    standalone: true,
    imports: [CommonModule, FormsModule, BookingUserComponent, BookingAdminComponent],
    templateUrl: './booking-page.component.html',
    styleUrls: ['./booking-page.component.scss']
})
export class BookingPageComponent implements OnInit {
  isAdmin: boolean = false;
  isLoading: boolean = true;

  constructor(private bookingService: BookingConfigService) {}

  ngOnInit(): void {
    this.bookingService.loading$.subscribe(loading => {
      this.isLoading = loading;
    });
  }
}
