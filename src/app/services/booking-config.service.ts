import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export enum BusinessType {
  PELUQUERIA = 'peluqueria',
  HOTEL = 'hotel',
  CONSULTA = 'consulta_medica',
  GENERAL = 'general'
}

export enum BookingStatus {
  PENDIENTE = 'pendiente',
  CONFIRMADA = 'confirmada',
  CANCELADA = 'cancelada'
}

export interface UserData {
  nombre: string;
  email: string;
  telefono?: string;
  notas?: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  duracion: number;
  precio?: number;
}

export interface Reserva {
  id: string;
  usuario: UserData;
  fechaInicio: string;
  fechaFin?: string;
  servicio: string;
  estado: BookingStatus;
  metadata?: any;
}

export interface HorarioLaboral {
  diasLaborables: number[];
  horaInicio: string;
  horaFin: string;
}

export interface TramoHorario {
  hora: string;
  activo: boolean;
}

export interface BusinessConfig {
  nombre: string;
  tipoNegocio: BusinessType;
  duracionBase: number;
  maxReservasPorSlot: number;
  horarioLaboral: HorarioLaboral;
  tramosHorarios: TramoHorario[];
  servicios: Servicio[];
}

@Injectable({ providedIn: 'root' })
export class BookingConfigService {
  private readonly storageKey = 'booking-config';
  private readonly reservasKey = 'booking-reservas';
  private readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;

  private defaultConfig: BusinessConfig = {
    nombre: 'Mi Peluquería',
    tipoNegocio: BusinessType.PELUQUERIA,
    duracionBase: 30, // Duración mínima de slot
    maxReservasPorSlot: 2,
    horarioLaboral: {
      diasLaborables: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
      horaInicio: '09:00',
      horaFin: '20:00'
    },
    servicios: [
      { id: 'corte-hombre', nombre: 'Corte de Caballero', duracion: 30, precio: 15 },
      { id: 'corte-lavado-peinado', nombre: 'Corte, Lavado y Peinado Dama', duracion: 60, precio: 25 },
      { id: 'tinte', nombre: 'Tinte Completo', duracion: 120, precio: 40 }
    ],
    tramosHorarios: [
      { hora: '09:00', activo: true },
      { hora: '09:30', activo: true },
      { hora: '10:00', activo: true },
      { hora: '10:30', activo: true },
      { hora: '11:00', activo: true },
      { hora: '11:30', activo: true },
      { hora: '12:00', activo: true },
      { hora: '12:30', activo: true },
      { hora: '13:00', activo: true },
      { hora: '13:30', activo: true },
      { hora: '14:00', activo: true },
      { hora: '14:30', activo: true },
      { hora: '15:00', activo: true },
      { hora: '15:30', activo: true },
      { hora: '16:00', activo: true },
      { hora: '16:30', activo: true },
      { hora: '17:00', activo: true },
      { hora: '17:30', activo: true },
      { hora: '18:00', activo: true },
      { hora: '18:30', activo: true },
      { hora: '19:00', activo: true },
      { hora: '19:30', activo: true },
      { hora: '20:00', activo: true }
    ],
  };

  private configSubject = new BehaviorSubject<BusinessConfig>(this.loadConfig());
  private reservasSubject = new BehaviorSubject<Reserva[]>(this.loadReservas());

  config$ = this.configSubject.asObservable();
  reservas$ = this.reservasSubject.asObservable();

  getConfig(): BusinessConfig {
    return { ...this.configSubject.value };
  }

  getServicios(): Servicio[] {
    const servicios = this.configSubject.value.servicios;
    return Array.isArray(servicios) ? [...servicios] : [];
  }

  updateConfig(newConfig: Partial<BusinessConfig>): void {
    const currentConfig = this.configSubject.value;
    const mergedConfig: BusinessConfig = {
      ...currentConfig,
      ...newConfig,
      servicios: newConfig.servicios || currentConfig.servicios,
      horarioLaboral: newConfig.horarioLaboral || currentConfig.horarioLaboral
    };
    this.saveConfig(mergedConfig);
  }

  getReservas(): Observable<Reserva[]> {
    return this.reservas$;
  }

  addReserva(reservaData: Omit<Reserva, 'id' | 'estado'>): Observable<Reserva> {
    // Validación básica del usuario
    if (!reservaData.usuario?.email || !this.EMAIL_REGEX.test(reservaData.usuario.email)) {
      return throwError(() => new Error('Email inválido'));
    }

    if (!reservaData.usuario?.nombre || reservaData.usuario.nombre.trim().length < 3) {
      return throwError(() => new Error('Nombre debe tener al menos 3 caracteres'));
    }

    // Crear nueva reserva
    const nuevaReserva: Reserva = {
      ...reservaData,
      id: uuidv4(),
      estado: BookingStatus.CONFIRMADA,
      fechaInicio: new Date(reservaData.fechaInicio).toISOString(),
      fechaFin: reservaData.fechaFin ? new Date(reservaData.fechaFin).toISOString() : undefined
    };

    // Validación específica de la reserva
    if (!this.validateBooking(nuevaReserva)) {
      return throwError(() => new Error('Validación fallida: horario no disponible o datos incorrectos'));
    }

    // Guardar y retornar
    const reservas = [...this.reservasSubject.value, nuevaReserva];
    this.saveReservas(reservas);
    return of(nuevaReserva);
  }

  deleteReserva(id: string): Observable<void> {
    const reservas = this.reservasSubject.value.filter(r => r.id !== id);
    this.saveReservas(reservas);
    return of(void 0);
  }

  private loadConfig(): BusinessConfig {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...this.defaultConfig,
          ...parsed,
          servicios: Array.isArray(parsed.servicios) ? parsed.servicios : this.defaultConfig.servicios,
          horarioLaboral: parsed.horarioLaboral || this.defaultConfig.horarioLaboral
        };
      }
    } catch (e) {
      console.error('Error cargando configuración', e);
    }
    return this.defaultConfig;
  }

  private saveConfig(config: BusinessConfig): void {
    localStorage.setItem(this.storageKey, JSON.stringify(config));
    this.configSubject.next(config);
  }

  private loadReservas(): Reserva[] {
    try {
      const reservasStr = localStorage.getItem(this.reservasKey);
      return reservasStr ? JSON.parse(reservasStr) : [];
    } catch (error) {
      console.error('Error cargando reservas', error);
      return [];
    }
  }

  private saveReservas(reservas: Reserva[]): void {
    localStorage.setItem(this.reservasKey, JSON.stringify(reservas));
    this.reservasSubject.next(reservas);
  }

  private validateBooking(reserva: Reserva): boolean {
    // Validaciones básicas
    if (!reserva.usuario?.nombre || !reserva.usuario?.email) {
      return false;
    }

    const fechaReserva = new Date(reserva.fechaInicio);
    if (isNaN(fechaReserva.getTime())) {
      return false;
    }

    // Validación según tipo de negocio
    const config = this.configSubject.value;
    switch (config.tipoNegocio) {
      case BusinessType.PELUQUERIA:
        return this.validateHairSalonBooking(reserva);
      case BusinessType.HOTEL:
        return this.validateHotelBooking(reserva);
      default:
        return true;
    }
  }

  private validateHairSalonBooking(reserva: Reserva): boolean {
    const config = this.configSubject.value;
    
    // Validar servicio
    const servicio = config.servicios.find(s => s.id === reserva.servicio);
    if (!servicio) {
      console.error('Servicio no encontrado:', reserva.servicio);
      return false;
    }

    // Validar horario laboral
    if (!config.horarioLaboral?.diasLaborables) {
      console.error('Configuración incompleta: días laborables no definidos');
      return false;
    }

    const fechaInicio = new Date(reserva.fechaInicio);
    const diaSemana = fechaInicio.getDay(); // 0=Domingo, 1=Lunes, etc.
    
    // Validar día laborable
    if (!config.horarioLaboral.diasLaborables.includes(diaSemana)) {
      return false;
    }

    // Validar disponibilidad en el slot
    const duracion = servicio.duracion;
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMinutes(fechaInicio.getMinutes() + duracion);

    const reservasEnSlot = this.reservasSubject.value.filter(r => {
      if (!r.fechaInicio) return false;
      
      const rInicio = new Date(r.fechaInicio);
      const rServicio = config.servicios.find(s => s.id === r.servicio);
      const rDuracion = rServicio?.duracion || config.duracionBase;
      const rFin = new Date(rInicio);
      rFin.setMinutes(rInicio.getMinutes() + rDuracion);
      
      return rInicio < fechaFin && rFin > fechaInicio;
    }).length;

    return reservasEnSlot < config.maxReservasPorSlot;
  }

  private validateHotelBooking(reserva: Reserva): boolean {
    // Implementación específica para hoteles
    // (Puedes añadir lógica particular para hoteles aquí)
    return true;
  }
}