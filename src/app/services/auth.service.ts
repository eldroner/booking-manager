import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) { }

  private hasToken(): boolean {
    return !!localStorage.getItem('admin_token');
  }

  loginByEmail(emailContacto: string, password?: string): Observable<{ token: string, idNegocio: string }> {
    return this.http.post<{ token: string, idNegocio: string }>(`${environment.apiUrl}/api/admin/login-by-email`, { emailContacto, password })
      .pipe(
        tap(response => {
          localStorage.setItem('admin_token', response.token);
          localStorage.setItem('admin_idNegocio', response.idNegocio); // Guardar el idNegocio
          this.isAuthenticatedSubject.next(true);
        }),
        catchError(error => {
          this.logout(); // Asegurarse de limpiar cualquier token si el login falla
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_idNegocio');
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem('admin_token');
  }

  getIdNegocio(): string | null {
    return localStorage.getItem('admin_idNegocio');
  }

  isLoggedIn(): Observable<boolean> {
    return this.isAuthenticated$;
  }
}
