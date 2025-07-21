import { Routes } from '@angular/router';
import { BookingPageComponent } from './components/booking-page/booking-page.component';
import { ConfirmarReservaComponent } from './features/confirmar-reserva/confirmar-reserva.component';

export const routes: Routes = [
  { 
    path: '', 
    redirectTo: '/default', // Redirige a un negocio por defecto
    pathMatch: 'full'
  },
  {
    path: ':idNegocio', // Ruta para el cliente con ID de negocio
    component: BookingPageComponent,
    data: { isAdmin: false }
  },
  {
    path: ':idNegocio/admin', // Ruta para el admin con ID de negocio
    component: BookingPageComponent,
    data: { isAdmin: true }
  },
  {
    path: 'confirmar/:token',
    component: ConfirmarReservaComponent
  }
];