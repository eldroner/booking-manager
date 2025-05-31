import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingConfigService, Reserva } from '../../services/booking-config.service';
import { CommonModule } from '@angular/common';
import { NotificationsService } from '../../services/notifications.service';
import { EmailService } from '../../services/email.service'; // Añadido

@Component({
  selector: 'app-confirmar-reserva',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmar-reserva.component.html',
  styleUrls: ['./confirmar-reserva.component.scss']
})
export class ConfirmarReservaComponent implements OnInit {
  confirmacionExitosa = false;
  error: string = '';
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private bookingService: BookingConfigService,
    private notifications: NotificationsService,
    private router: Router,
    private emailService: EmailService // Añadido
  ) { }

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    
    if (!token) {
      this.error = 'Token de confirmación no proporcionado';
      this.loading = false;
      return;
    }

    this.confirmarReserva(token);
  }

private confirmarReserva(token: string): void {
  this.bookingService.confirmarReserva(token).subscribe({
    next: (reservaConfirmada: Reserva) => {  // Especifica el tipo aquí
      this.confirmacionExitosa = true;
      this.notifications.showSuccess('Reserva confirmada correctamente');
      
      // Ahora TypeScript sabe que reservaConfirmada tiene estas propiedades
      this.emailService.sendBookingConfirmation(
        reservaConfirmada.usuario.email,
        reservaConfirmada.usuario.nombre,
        {
          fecha: new Date(reservaConfirmada.fechaInicio).toLocaleString('es-ES'),
          servicio: reservaConfirmada.servicio,
          token: token
        }
      ).catch(() => {
        console.warn('Email de confirmación no enviado');
      });

      setTimeout(() => this.router.navigate(['/']), 3000);
    },
    error: (err) => {
      this.error = err.message; // Usa err.message directamente
      this.notifications.showError(this.error);
      this.loading = false;
    }
  });
}
}