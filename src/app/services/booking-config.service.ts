import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class BookingConfigService {
  private readonly storageKey = 'booking-config';
  private readonly reservasKey = 'booking-reservas';

  // Configuración predeterminada
  config = {
    maxCitasPorHora: 2, // Valor predeterminado
  };

  private defaultConfig = {
    nombre: 'Mi negocio',
    maxCitasPorHora: 1
  };

  // BehaviorSubject para manejar la configuración
  private configSubject = new BehaviorSubject(this.loadConfig());
  config$ = this.configSubject.asObservable();

  // BehaviorSubject para manejar las reservas
  private reservasSubject = new BehaviorSubject<{ fecha: string; hora: string; id: string }[]>(this.loadReservas());
  reservas$ = this.reservasSubject.asObservable(); // Observable para componentes suscritos

  // Cargar la configuración desde localStorage
  private loadConfig() {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : { ...this.defaultConfig };
  }

  // Cargar las reservas desde localStorage
  public loadReservas(): { fecha: string; hora: string; id: string }[] {
    const savedReservas = JSON.parse(localStorage.getItem(this.reservasKey) || '[]');
    return savedReservas;
  }

  // Obtener la configuración actual
  getConfig() {
    return this.configSubject.value;
  }

  // Obtener las reservas actuales
  getReservas() {
    return this.reservasSubject.value;
  }

  // Eliminar una reserva por ID
  deleteReserva(id: string): void {
    const reservas = this.loadReservas(); // Cargar todas las reservas existentes
    console.log('Reservas antes de eliminar:', reservas); // Log para verificar el estado actual
  
    // Filtrar la reserva por ID
    const nuevasReservas = reservas.filter(reserva => reserva.id !== id);
    console.log('Reservas después de eliminar:', nuevasReservas); // Log para verificar la eliminación
  
    // Si la reserva no fue encontrada
    if (reservas.length === nuevasReservas.length) {
      console.log(`No se encontró una reserva con el id ${id}`);
    }
  
    // Guardar las reservas actualizadas en localStorage
    localStorage.setItem(this.reservasKey, JSON.stringify(nuevasReservas));
  
    // Emitir las nuevas reservas al BehaviorSubject
    this.reservasSubject.next(nuevasReservas);
  }
  

  // Actualizar la configuración
  updateConfig(newConfig: { nombre: string; maxCitasPorHora: number }) {
    localStorage.setItem(this.storageKey, JSON.stringify(newConfig));
    this.configSubject.next(newConfig);
  }

  
  addReserva(reserva: { fecha: string; hora: string }): string {
    const id = uuidv4();
    const reservas = this.loadReservas();
    reservas.push({ ...reserva, id });
    this.saveReservas(reservas);
    return id;
  }

  // Guardar nuevas reservas
  saveReservas(reservas: { fecha: string; hora: string; id: string }[]): void {
    const reservasConId = reservas.map((reserva) => ({
      ...reserva,
      id: reserva.id || uuidv4(), // Asegurar que cada reserva tenga un id único
    }));

    // Guardar en localStorage
    localStorage.setItem(this.reservasKey, JSON.stringify(reservasConId));

    // Emitir las nuevas reservas al BehaviorSubject
    this.reservasSubject.next(reservasConId);
  }

  // Obtener el máximo de citas por día (ejemplo de cálculo)
  getMaxCitasPorDia(): number {
    return this.config?.maxCitasPorHora ? this.config.maxCitasPorHora * 12 : 60; // Ejemplo
  }
}
