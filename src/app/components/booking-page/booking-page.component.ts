import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingUserComponent } from '../booking-user/booking-user.component';
import { BookingAdminComponent } from '../booking-admin/booking-admin.component';
import { BookingConfigService } from '../../services/booking-config.service';
import { ActivatedRoute, Router } from '@angular/router';

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
  fechasBloqueadas: string[] = [];

  constructor(
    private bookingService: BookingConfigService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idNegocio = params.get('idNegocio');
      if (idNegocio) {
        this.bookingService.loadBusinessData(idNegocio);
      }
    });

    this.route.data.subscribe(data => {
      this.isAdmin = data['isAdmin'] || false;
    });

    this.bookingService.loading$.subscribe(loading => {
      this.isLoading = loading;
    });

    this.loadFechasBloqueadas();
  }

  toggleView() {
    const currentIdNegocio = this.route.snapshot.paramMap.get('idNegocio');
    this.isAdmin = !this.isAdmin;
    if (this.isAdmin) {
      this.router.navigate([currentIdNegocio, 'admin']);
    } else {
      this.router.navigate([currentIdNegocio]);
    }
  }

  loadFechasBloqueadas(): void {
    this.bookingService.getFechasBloqueadas().subscribe(fechas => {
      this.fechasBloqueadas = fechas;
    });
  }
}
