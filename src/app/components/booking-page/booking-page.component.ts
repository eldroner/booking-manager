import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingUserComponent } from '../booking-user/booking-user.component';
import { BookingAdminComponent } from '../booking-admin/booking-admin.component';

@Component({
    selector: 'app-booking-page',
    standalone: true,
    imports: [CommonModule, FormsModule, BookingUserComponent, BookingAdminComponent],
    templateUrl: './booking-page.component.html',
    styleUrls: ['./booking-page.component.scss']
})
export class BookingPageComponent {
  isAdmin: boolean = false; // Cambia esto según la vista que quieras mostrar
}
