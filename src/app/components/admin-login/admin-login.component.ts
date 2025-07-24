import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationsService } from '../../services/notifications.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.scss']
})
export class AdminLoginComponent {
  emailContacto: string = '';

  constructor(
    private router: Router,
    private notifications: NotificationsService,
    private authService: AuthService
  ) { }

  onLogin(): void {
    if (!this.emailContacto) {
      this.notifications.showError('Por favor, introduce el email de contacto.');
      return;
    }

    this.authService.loginByEmail(this.emailContacto).subscribe({
      next: () => {
        this.notifications.showSuccess('Inicio de sesión exitoso.');
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.notifications.showError(err.error?.message || 'Error al iniciar sesión.');
      }
    });
  }
}
