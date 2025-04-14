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

export interface HorarioNormal {
  dia: number; // 0-6 (Domingo-Sábado)
  tramos: {
    horaInicio: string;
    horaFin: string;
  }[];
}

export interface HorarioEspecial {
  fecha: string; // Formato YYYY-MM-DD
  horaInicio: string;
  horaFin: string;
  activo: boolean;
}

export interface BusinessConfig {
  nombre: string;
  tipoNegocio: BusinessType;
  duracionBase: number;
  maxReservasPorSlot: number;
  servicios: Servicio[];
  horariosNormales: HorarioNormal[];
  horariosEspeciales: HorarioEspecial[];
}

@Injectable({ providedIn: 'root' })
export class BookingConfigService {
  private readonly storageKey = 'booking-config';
  private readonly reservasKey = 'booking-reservas';
  private readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;

  private defaultConfig: BusinessConfig = {
    nombre: '',
    tipoNegocio: BusinessType.GENERAL,
    duracionBase: 30,
    maxReservasPorSlot: 1,
    servicios: [],
    horariosNormales: [
      { dia: 1, tramos: [{ horaInicio: '09:00', horaFin: '13:00' }, { horaInicio: '15:00', horaFin: '19:00' }] },
      { dia: 2, tramos: [{ horaInicio: '09:00', horaFin: '13:00' }, { horaInicio: '15:00', horaFin: '19:00' }] },
      { dia: 3, tramos: [{ horaInicio: '09:00', horaFin: '13:00' }, { horaInicio: '15:00', horaFin: '19:00' }] },
      { dia: 4, tramos: [{ horaInicio: '09:00', horaFin: '13:00' }, { horaInicio: '15:00', horaFin: '19:00' }] },
      { dia: 5, tramos: [{ horaInicio: '09:00', horaFin: '13:00' }, { horaInicio: '15:00', horaFin: '19:00' }] },
      { dia: 6, tramos: [{ horaInicio: '10:00', horaFin: '14:00' }] }
    ],
    horariosEspeciales: []
  };

  private configSubject = new BehaviorSubject<BusinessConfig>(this.loadConfig());
  private reservasSubject = new BehaviorSubject<Reserva[]>(this.loadReservas());

  config$ = this.configSubject.asObservable();
  reservas$ = this.reservasSubject.asObservable();

  getConfig(): BusinessConfig {
    return { ...this.configSubject.value };
  }

  getServicios(): Servicio[] {
    return [...this.configSubject.value.servicios];
  }

  updateConfig(newConfig: Partial<BusinessConfig>): void {
    const currentConfig = this.configSubject.value;
    const mergedConfig: BusinessConfig = {
      ...currentConfig,
      ...newConfig,
      servicios: newConfig.servicios || currentConfig.servicios,
      horariosNormales: newConfig.horariosNormales || currentConfig.horariosNormales,
      horariosEspeciales: newConfig.horariosEspeciales || currentConfig.horariosEspeciales
    };
    this.saveConfig(mergedConfig);
  }

  getReservas(): Observable<Reserva[]> {
    return this.reservas$;
  }

  getHorariosNormales(): HorarioNormal[] {
    return [...this.configSubject.value.horariosNormales];
  }

  updateHorariosNormales(horarios: HorarioNormal[]): void {
    this.updateConfig({ horariosNormales: horarios });
  }

  getHorariosEspeciales(): HorarioEspecial[] {
    return [...this.configSubject.value.horariosEspeciales];
  }

  updateHorariosEspeciales(horarios: HorarioEspecial[]): void {
    this.updateConfig({ horariosEspeciales: horarios });
  }

  addReserva(reservaData: Omit<Reserva, 'id' | 'estado'>): Observable<Reserva> {
    if (!this.validateUserData(reservaData.usuario)) {
      return throwError(() => new Error('Datos de usuario inválidos'));
    }

    const nuevaReserva: Reserva = {
      ...reservaData,
      id: uuidv4(),
      estado: BookingStatus.CONFIRMADA,
      fechaInicio: new Date(reservaData.fechaInicio).toISOString(),
      fechaFin: reservaData.fechaFin ? new Date(reservaData.fechaFin).toISOString() : undefined
    };

    if (!this.validateBooking(nuevaReserva)) {
      return throwError(() => new Error('Horario no disponible o datos incorrectos'));
    }

    const reservas = [...this.reservasSubject.value, nuevaReserva];
    this.saveReservas(reservas);
    return of(nuevaReserva);
  }

  deleteReserva(id: string): Observable<void> {
    const reservas = this.reservasSubject.value.filter(r => r.id !== id);
    this.saveReservas(reservas);
    return of(void 0);
  }

  getReservasSnapshot(): Reserva[] {
    return this.reservasSubject.value;
  }

  isHoraDisponible(fecha: string, hora: string): boolean {
    const config = this.getConfig();
    const reservasEnSlot = this.reservasSubject.value.filter(r =>
      r.fechaInicio.includes(fecha) &&
      r.fechaInicio.includes(hora)
    ).length;

    return reservasEnSlot < config.maxReservasPorSlot;
  }

  validateHorarioEspecial(horario: Partial<HorarioEspecial>): boolean {
    if (!horario?.fecha || !horario.horaInicio || !horario.horaFin) return false;
    
    return this.isValidDate(horario.fecha) && 
           this.isValidTime(horario.horaInicio) && 
           this.isValidTime(horario.horaFin) &&
           this.compareTimes(horario.horaInicio, horario.horaFin) < 0;
  }

  checkSolapamientoHorarios(nuevoHorario: HorarioEspecial): boolean {
    return this.getHorariosEspeciales().some(h => 
      h.activo &&
      h.fecha === nuevoHorario.fecha &&
      !(this.compareTimes(nuevoHorario.horaFin, h.horaInicio) <= 0 || 
       this.compareTimes(nuevoHorario.horaInicio, h.horaFin) >= 0)
    );
  }

  private validateBooking(reserva: Reserva): boolean {
    if (!reserva.usuario?.nombre || !reserva.usuario?.email) {
      return false;
    }

    const fechaReserva = new Date(reserva.fechaInicio);
    if (isNaN(fechaReserva.getTime())) {
      return false;
    }

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
    const servicio = config.servicios.find(s => s.id === reserva.servicio);
    if (!servicio) return false;

    const fechaInicio = new Date(reserva.fechaInicio);
    const diaSemana = fechaInicio.getDay();
    const horarioDia = config.horariosNormales.find(h => h.dia === diaSemana);
    
    if (!horarioDia) return false;

    const horaReserva = fechaInicio.getHours() + fechaInicio.getMinutes() / 60;
    const enTramoValido = horarioDia.tramos.some(tramo => {
      const [hIni, mIni] = tramo.horaInicio.split(':').map(Number);
      const [hFin, mFin] = tramo.horaFin.split(':').map(Number);
      const inicioTramo = hIni + mIni / 60;
      const finTramo = hFin + mFin / 60;
      return horaReserva >= inicioTramo && horaReserva < finTramo;
    });

    if (!enTramoValido) return false;

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
    // Implementar lógica específica para hoteles si es necesario
    return true;
  }

  private validateUserData(usuario: UserData): boolean {
    // Verificar que el nombre tenga al menos 3 caracteres
    const nombreValido = !!usuario?.nombre && usuario.nombre.trim().length >= 3;
    
    // Verificar que el email sea válido
    const emailValido = !!usuario?.email && this.EMAIL_REGEX.test(usuario.email);
    
    return nombreValido && emailValido;
}

  private compareTimes(time1: string, time2: string): number {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return h1 - h2 || m1 - m2;
  }

  private isValidTime(time: string): boolean {
    if (!time) return false;
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  private isValidDate(date: string): boolean {
    return !isNaN(Date.parse(date));
  }

  private loadConfig(): BusinessConfig {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? this.parseConfig(JSON.parse(saved)) : this.defaultConfig;
    } catch (e) {
      console.error('Error cargando configuración', e);
      return this.defaultConfig;
    }
  }

  private parseConfig(parsed: any): BusinessConfig {
    return {
      ...this.defaultConfig,
      ...parsed,
      servicios: Array.isArray(parsed.servicios) ? parsed.servicios : this.defaultConfig.servicios,
      horariosNormales: Array.isArray(parsed.horariosNormales) ? parsed.horariosNormales : this.defaultConfig.horariosNormales,
      horariosEspeciales: Array.isArray(parsed.horariosEspeciales) ? parsed.horariosEspeciales : this.defaultConfig.horariosEspeciales
    };
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
}