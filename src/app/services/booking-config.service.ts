import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, map, tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsService } from './notifications.service';

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
  dia: number;
  tramos: {
    horaInicio: string;
    horaFin: string;
  }[];
}

export interface HorarioEspecial {
  fecha: string;
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

  private configSubject = new BehaviorSubject<BusinessConfig>(this.defaultConfig);
  private reservasSubject = new BehaviorSubject<Reserva[]>([]);

  config$ = this.configSubject.asObservable();
  reservas$ = this.reservasSubject.asObservable();

  constructor(
    private http: HttpClient,
    private notifications: NotificationsService
  
  ) {
    this.initializeData();
  }

  private initializeData(): void {
    forkJoin({
      config: this.loadBackendConfig(),
      reservas: this.loadBackendReservas()
    }).pipe(
      catchError(() => {
        return of({
          config: this.defaultConfig,
          reservas: []
        });
      })
    ).subscribe(({ config, reservas }) => {
      this.configSubject.next(config);
      this.reservasSubject.next(reservas);
    });
  }

  private loadBackendConfig(): Observable<BusinessConfig> {
    return this.http.get<BusinessConfig>(`${environment.apiUrl}/api/config`).pipe(
      catchError(() => of(this.defaultConfig))
    )
  }

  private loadBackendReservas(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${environment.apiUrl}/api/reservas`).pipe(
      catchError(() => of([]))
    );
  }

  getConfig(): BusinessConfig {
    return { ...this.configSubject.value };
  }

  getServicios(): Observable<Servicio[]> {
    return this.config$.pipe(
      map(config => [...config.servicios]),
      catchError(() => of([]))
    );
  }

  private refreshCalendar(): void {
  this.configSubject.next({...this.configSubject.value}); // Forzar actualización reactiva
}

updateConfig(newConfig: Partial<BusinessConfig>): void {
  const currentConfig = this.configSubject.value;
  const mergedConfig = { 
    ...currentConfig,
    ...newConfig,
    servicios: newConfig.servicios || currentConfig.servicios,
    horariosNormales: newConfig.horariosNormales || currentConfig.horariosNormales,
    horariosEspeciales: newConfig.horariosEspeciales || currentConfig.horariosEspeciales
  };

  this.http.put<BusinessConfig>(`${environment.apiUrl}/api/config`, mergedConfig).pipe(
    tap(updatedConfig => {
      this.configSubject.next(updatedConfig);
      alert('✅ Configuración actualizada correctamente');
      this.refreshCalendar(); // Añadido para actualizar el calendario si existe
    }),
    catchError(error => {
      console.error('Error actualizando configuración:', error);
      alert(`❌ Error al guardar: ${error.message}`);
      return throwError(() => new Error('No se pudo guardar la configuración'));
    })
  ).subscribe();
}

  getReservas(): Observable<Reserva[]> {
    return this.reservas$;
  }

  addReserva(reservaData: Omit<Reserva, 'id' | 'estado'>): Observable<Reserva> {
    const nuevaReserva: Reserva = {
      ...reservaData,
      id: uuidv4(),
      estado: BookingStatus.CONFIRMADA,
      fechaInicio: new Date(reservaData.fechaInicio).toISOString(),
      fechaFin: reservaData.fechaFin ? new Date(reservaData.fechaFin).toISOString() : undefined
    };

    return this.http.post<Reserva>(`${environment.apiUrl}/api/reservas`, nuevaReserva).pipe(
      tap(reserva => {
        const reservas = [...this.reservasSubject.value, reserva];
        this.reservasSubject.next(reservas);
      }),
      catchError(error => throwError(() => error))
    );
  }

  deleteReserva(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/reservas/${id}`).pipe(
      tap(() => {
        const reservas = this.reservasSubject.value.filter(r => r.id !== id);
        this.reservasSubject.next(reservas);
      }),
      catchError(error => throwError(() => error))
    );
  }

  isHoraDisponible(fecha: string, hora: string): Observable<boolean> {
    return this.http.get<boolean>(`${environment.apiUrl}/api/disponibilidad`, {
      params: { fecha, hora }
    });
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

  getHorariosNormales(): HorarioNormal[] {
    return [...this.configSubject.value.horariosNormales];
  }

  updateHorariosNormales(horarios: HorarioNormal[]): void {
    const currentConfig = this.configSubject.value;
    this.updateConfig({ 
      ...currentConfig,
      horariosNormales: horarios 
    });
  }

  getHorariosEspeciales(): HorarioEspecial[] {
    return [...this.configSubject.value.horariosEspeciales];
  }

  updateHorariosEspeciales(horarios: HorarioEspecial[]): void {
    const currentConfig = this.configSubject.value;
    this.updateConfig({ 
      ...currentConfig,
      horariosEspeciales: horarios 
    });
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
}