import { Routes } from '@angular/router';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: 'admin-login',
    loadComponent: () => import('./components/admin-login/admin-login.component').then(m => m.AdminLoginComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/booking-page/booking-page.component').then(m => m.BookingPageComponent),
    canActivate: [AdminGuard],
    data: { isAdmin: true }
  },
  {
    path: 'confirmar/:token',
    loadComponent: () => import('./features/confirmar-reserva/confirmar-reserva.component').then(m => m.ConfirmarReservaComponent)
  },
  {
    path: 'cancelar-reserva',
    loadComponent: () => import('./components/cancel-booking/cancel-booking.component').then(m => m.CancelBookingComponent)
  },
  { 
    path: '', 
    redirectTo: '/default', 
    pathMatch: 'full'
  },
  {
    path: ':idNegocio',
    loadComponent: () => import('./components/booking-page/booking-page.component').then(m => m.BookingPageComponent),
    data: { isAdmin: false }
  }
];