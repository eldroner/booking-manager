import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingUserComponent } from '../booking-user/booking-user.component';
import { BookingAdminComponent } from '../booking-admin/booking-admin.component';
import { BookingConfigService } from '../../services/booking-config.service';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';

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

  constructor(
    private bookingService: BookingConfigService,
    private route: ActivatedRoute,
    private router: Router // Inyecta el Router
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.isAdmin = data['isAdmin'] || false;
    });

    this.bookingService.loading$.subscribe(loading => {
      this.isLoading = loading;
    });
  }

  // Nuevo método para cambiar de vista
  toggleView() {
    this.isAdmin = !this.isAdmin;
    if (this.isAdmin) {
      this.router.navigate(['/admin']); // Navega a admin
    } else {
      this.router.navigate(['/']); // Navega a home (usuario)
    }
  }
}