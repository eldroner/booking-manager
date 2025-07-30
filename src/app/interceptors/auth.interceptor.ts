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
          // Solo mostrar la notificación si no es una ruta de login (para evitar bucles)
          if (!req.url.includes('/admin-login')) {
            this.notifications.showError('Su sesión ha caducado, por favor inicie sesión de nuevo');
            this.authService.logout();
            this.router.navigate(['/admin-login']);
          }
          // No propagar el error para evitar que los suscriptores lo manejen
          return new Observable<HttpEvent<any>>();
        }
        
        // Propagar el error para otros tipos de errores
        return throwError(() => error);
      })
    );
  }
}
