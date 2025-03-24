import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BookingConfigService {
  private readonly storageKey = 'booking-config';

  private defaultConfig = {
    nombre: 'Mi negocio',
    maxCitasPorHora: 1
  };

  private config = this.loadConfig();

  private loadConfig() {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : { ...this.defaultConfig };
  }

  getConfig() {
    return this.config;
  }

  updateConfig(newConfig: { nombre: string; maxCitasPorHora: number }) {
    this.config = { ...newConfig };
    localStorage.setItem(this.storageKey, JSON.stringify(this.config));
  }
}
