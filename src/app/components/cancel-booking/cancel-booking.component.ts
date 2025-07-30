import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BookingConfigService } from '../../services/booking-config.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cancel-booking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cancel-booking.component.html',
  styleUrls: ['./cancel-booking.component.scss']
})
export class CancelBookingComponent implements OnInit {
  message: string = 'Cancelando su reserva...';
  isSuccess: boolean | null = null;

  constructor(
    private route: ActivatedRoute,
    private bookingService: BookingConfigService
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.cancelBooking(token);
      } else {
        this.message = 'Token de cancelación no proporcionado.';
        this.isSuccess = false;
      }
    });
  }

  private cancelBooking(token: string): void {
    this.bookingService.cancelReservationByToken(token).subscribe({
      next: (response) => {
        this.message = response.message || 'Reserva cancelada con éxito.';
        this.isSuccess = true;
      },
      error: (err) => {
        this.message = err.message || 'Error al cancelar la reserva.';
        this.isSuccess = false;
      }
    });
  }
}
