import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  public logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin-login']);
  }
}
