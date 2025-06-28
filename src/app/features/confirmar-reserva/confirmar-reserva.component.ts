import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingConfigService, Reserva } from '../../services/booking-config.service';
import { CommonModule } from '@angular/common';
import { NotificationsService } from '../../services/notifications.service';
//import { EmailService } from '../../services/email.service'; // Añadido

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
    //private emailService: EmailService // Añadido
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
  this.loading = true;
  
  this.bookingService.confirmarReserva(token).subscribe({
    next: (reservaConfirmada: Reserva) => {
      this.confirmacionExitosa = true;
      this.loading = false;
      
      // Mostrar notificación
      this.notifications.showSuccess(`
        ¡Reserva confirmada! 
        Se ha enviado un email de confirmación a ${reservaConfirmada.usuario.email}
      `);

      // Redirigir después de 3 segundos
      setTimeout(() => {
        this.router.navigate(['/'], {
          state: { reservaRecienConfirmada: true }
        });
      }, 3000);
    },
    error: (err) => {
      this.loading = false;
      this.error = err.error?.message || 'Error al confirmar la reserva';
      
      // Notificación de error detallada
      this.notifications.showError(`
        ${this.error} 
        Por favor, intenta nuevamente o contacta al administrador.
      `);

      // Opcional: Redirigir a página de error
      setTimeout(() => {
        this.router.navigate(['/error-confirmacion'], {
          queryParams: { 
            token,
            error: this.error
          }
        });
      }, 3000);
    }
  });
}
}