import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class BookingConfigService {
  private readonly storageKey = 'booking-config';
  private readonly reservasKey = 'booking-reservas';

  private defaultConfig = {
    nombre: 'Mi negocio',
    maxCitasPorHora: 1
  };

  private configSubject = new BehaviorSubject(this.loadConfig());
  config$ = this.configSubject.asObservable();

  private loadConfig() {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : { ...this.defaultConfig };
  }

  getConfig() {
    return this.configSubject.value;
  }

  deleteReserva(id: string): void {
    const reservas = this.loadReservas().filter(reserva => reserva.id !== id);
    this.saveReservas(reservas); // Actualizar localStorage
  }
  

  updateConfig(newConfig: { nombre: string; maxCitasPorHora: number }) {
    localStorage.setItem(this.storageKey, JSON.stringify(newConfig));
    this.configSubject.next(newConfig);
  }

  saveReservas(reservas: { fecha: string; hora: string; id?: string }[]): void {
    // Garantiza que cada reserva tenga un id único
    const reservasConId = reservas.map(reserva => ({
      ...reserva,
      id: reserva.id || uuidv4()
    }));
    localStorage.setItem(this.reservasKey, JSON.stringify(reservasConId));
  }
  
  loadReservas(): { fecha: string; hora: string; id: string }[] {
    const savedReservas = JSON.parse(localStorage.getItem(this.reservasKey) || '[]');
    return savedReservas.map((reserva: any) => ({
      ...reserva,
      id: reserva.id || uuidv4() // Añade un id si falta
    }));
  }
}

