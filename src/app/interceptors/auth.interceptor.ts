import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationsService } from '../services/notifications.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router,
    private notifications: NotificationsService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    let clonedReq = req;

    if (token) {
      clonedReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
    }

    return next.handle(clonedReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // 1. Mostrar notificación al usuario
          this.notifications.showError('Su sesión ha caducado, por favor inicie sesión de nuevo');
          
          // 2. Desloguear al usuario (limpiar token, etc.)
          this.authService.logout();
          
          // 3. Redirigir al login
          this.router.navigate(['/admin-login']);
        }
        
        // 4. Propagar el error para que otros manejadores puedan usarlo si es necesario
        return throwError(() => error);
      })
    );
  }
}
