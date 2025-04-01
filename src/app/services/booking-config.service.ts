import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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

  updateConfig(newConfig: { nombre: string; maxCitasPorHora: number }) {
    localStorage.setItem(this.storageKey, JSON.stringify(newConfig));
    this.configSubject.next(newConfig);
  }

  saveReservas(reservas: { fecha: string; hora: string }[]) {
    localStorage.setItem(this.reservasKey, JSON.stringify(reservas));
  }

  loadReservas(): { fecha: string; hora: string }[] {
    return JSON.parse(localStorage.getItem(this.reservasKey) || '[]');
  }
}

