import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly storageKey = 'reservas';

  constructor() {}

  private loadReservas(): any[] {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : [];
  }

  private saveReservas(reservas: any[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(reservas));
  }

  getReservas(): any[] {
    return this.loadReservas();
  }

  addReserva(reserva: { tipo: string; fecha: string; hora: string }): void {
    const reservas = this.loadReservas();
    const nuevaReserva = {
      id: this.generateId(),
      ...reserva
    };
    reservas.push(nuevaReserva);
    this.saveReservas(reservas);
  }

// booking.service.ts
deleteReserva(id: string): Observable<void> {
  let reservas = this.loadReservas();
  reservas = reservas.filter(reserva => reserva.id !== id);
  this.saveReservas(reservas);
  return of(void 0); // Para manejar operaciones asíncronas si luego cambias a HTTP
}

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
