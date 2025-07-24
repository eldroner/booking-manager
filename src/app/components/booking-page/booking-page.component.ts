import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingUserComponent } from '../booking-user/booking-user.component';
import { BookingAdminComponent } from '../booking-admin/booking-admin.component';
import { BookingConfigService } from '../../services/booking-config.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Added import

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
    private router: Router,
    private authService: AuthService // Injected AuthService
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.isAdmin = data['isAdmin'] || false;

      if (this.isAdmin) {
        const idNegocio = this.authService.getIdNegocio();
        if (idNegocio) {
          this.bookingService.loadBusinessData(idNegocio);
          this.loadFechasBloqueadas(); // Mover aquí
        } else {
          // Si no hay idNegocio en el AuthService, redirigir al login
          this.router.navigate(['/admin-login']);
        }
      } else {
        this.route.paramMap.subscribe(params => {
          const idNegocio = params.get('idNegocio');
          if (idNegocio) {
            this.bookingService.loadBusinessData(idNegocio);
          }
        });
        this.loadFechasBloqueadas(); // Mantener aquí para la vista de usuario
      }
    });

    this.bookingService.loading$.subscribe(loading => {
      this.isLoading = loading;
    });
  }

  toggleView() {
    // La lógica de toggleView ya no es necesaria aquí, ya que la navegación
    // entre vistas de admin y usuario se maneja a través de las rutas y guardas.
    // Si se necesita un botón para salir del admin, se puede implementar un logout.
    if (this.isAdmin) {
      this.authService.logout();
      this.router.navigate(['/']);
    } else {
      // Esto no debería ser llamado en la vista de usuario normal
      console.warn('Intento de toggleView en vista de usuario.');
    }
  }

  loadFechasBloqueadas(): void {
    // Asegurarse de que idNegocio esté cargado antes de llamar a getFechasBloqueadas
    // Esto se maneja dentro de bookingService.getFechasBloqueadas
    this.bookingService.getFechasBloqueadas().subscribe(fechas => {
      this.fechasBloqueadas = fechas;
    });
  }
}