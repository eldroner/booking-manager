import { Routes } from '@angular/router';
import { BookingPageComponent } from './components/booking-page/booking-page.component';
import { ConfirmarReservaComponent } from './features/confirmar-reserva/confirmar-reserva.component';

export const routes: Routes = [
  { 
    path: '', 
    component: BookingPageComponent,
    data: { isAdmin: false } // Cambiado de 'admin' a 'isAdmin' para consistencia
  },
  { 
    path: 'admin', 
    component: BookingPageComponent,
    data: { isAdmin: true } 
  },
  { 
    path: 'confirmar/:token', 
    component: ConfirmarReservaComponent 
  },
  { path: '**', redirectTo: '' }
];