import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, map, tap } from 'rxjs/operators';
//import { v4 as uuidv4 } from 'uuid';
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
    private notifications: NotificationsService,

  ) {
    this.initializeData();
  }

private initializeData(): void {
  forkJoin({
    config: this.loadBackendConfig().pipe(
      catchError(() => of(this.defaultConfig))
    ),
    reservas: this.loadBackendReservas().pipe(
      catchError(() => of([]))
    )
  }).subscribe({
    next: ({ config, reservas }) => {
      this.configSubject.next(config);
      this.reservasSubject.next(reservas);
      // Forzar carga de servicios
      if (config.servicios.length === 0) {
        this.loadServiciosFromBackend();
      }
    },
    error: () => {
      this.configSubject.next(this.defaultConfig);
      this.reservasSubject.next([]);
    }
  });
}

private loadServiciosFromBackend(): void {
  this.http.get<Servicio[]>(`${environment.apiUrl}/api/servicios`).pipe(
    catchError(() => of([]))
  ).subscribe(servicios => {
    if (servicios.length > 0) {
      const currentConfig = this.configSubject.value;
      this.configSubject.next({
        ...currentConfig,
        servicios
      });
    }
  });
}

  private loadBackendConfig(): Observable<BusinessConfig> {
    return this.http.get<BusinessConfig>(`${environment.apiUrl}/api/config`).pipe(
      catchError(() => of(this.defaultConfig))
    )
  }

private loadBackendReservas(): Observable<Reserva[]> {
  return this.http.get<Reserva[]>(`${environment.apiUrl}/api/reservas`).pipe(
    map(reservas => reservas.map(reserva => ({
      ...reserva,
      fechaInicio: new Date(reserva.fechaInicio).toISOString()
    }))),
    catchError(error => {
      console.error('Error cargando reservas:', error);
      this.notifications.showError('Error al cargar reservas');
      return of([]);
    })
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
    this.configSubject.next({ ...this.configSubject.value }); // Forzar actualización reactiva
  }

updateConfig(newConfig: Partial<BusinessConfig>): Observable<BusinessConfig> {
  const currentConfig = this.configSubject.value;
  const mergedConfig = {
    ...currentConfig,
    ...newConfig,
    servicios: newConfig.servicios ?? currentConfig.servicios,
    horariosNormales: newConfig.horariosNormales ?? currentConfig.horariosNormales,
    horariosEspeciales: newConfig.horariosEspeciales ?? currentConfig.horariosEspeciales
  };

  return this.http.put<BusinessConfig>(`${environment.apiUrl}/api/config`, mergedConfig).pipe(
    tap(updatedConfig => {
      this.configSubject.next(updatedConfig);
      this.notifications.showSuccess('Configuración actualizada');
      this.refreshCalendar();
    }),
    catchError(error => {
      console.error('Error al guardar configuración:', error);
      this.notifications.showError('Error al guardar: ' + (error.error?.message || error.message));
      return throwError(() => error);
    })
  );
}

  getReservas(): Observable<Reserva[]> {
    return this.reservas$;
  }

  getReservasPorSlot(fecha: string, hora: string): Observable<Reserva[]> {
  return this.reservas$.pipe(
    map(reservas => reservas.filter(r => {
      const reservaDate = new Date(r.fechaInicio);
      const reservaHora = reservaDate.getHours().toString().padStart(2, '0') + ':' + 
                         reservaDate.getMinutes().toString().padStart(2, '0');
      return reservaDate.toISOString().split('T')[0] === fecha && reservaHora === hora;
    }))
  );
}

addReserva(reservaData: Omit<Reserva, 'id' | 'estado'>): Observable<Reserva> {
  // Asegurarse de no incluir ningún campo 'id'
  const payload = {
    usuario: {
      nombre: reservaData.usuario.nombre.trim(),
      email: reservaData.usuario.email.trim(),
      telefono: reservaData.usuario.telefono?.trim() || ''
    },
    fechaInicio: reservaData.fechaInicio,
    servicio: reservaData.servicio
    // No incluir 'id' ni 'estado' - el backend los manejará
  };

  console.log('Payload enviado al backend:', payload); // Para depuración

  return this.http.post<Reserva>(`${environment.apiUrl}/api/reservas`, payload).pipe(
    tap(reserva => {
      const reservas = [...this.reservasSubject.value, reserva];
      this.reservasSubject.next(reservas);
    }),
    catchError(error => {
      console.error('Error en addReserva:', error);
      return throwError(() => error);
    })
  );
}

deleteReserva(id: string): Observable<void> {
  // Asegurar que el ID no está undefined
  if (!id) {
    return throwError(() => new Error('ID de reserva inválido'));
  }
  
  return this.http.delete<void>(`${environment.apiUrl}/api/reservas/${id}`).pipe(
    tap(() => {
      const reservas = this.reservasSubject.value.filter(r => r.id !== id);
      this.reservasSubject.next(reservas);
    }),
    catchError(error => {
      console.error('Error en deleteReserva:', error);
      return throwError(() => error);
    })
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



  getHorariosEspeciales(): HorarioEspecial[] {
    return [...this.configSubject.value.horariosEspeciales];
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