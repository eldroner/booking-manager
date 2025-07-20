import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
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
  telefono: string;
  notas?: string;
}

interface ApiError {
  message: string;
  code?: number;
  details?: any;
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
  duracion: number;
  fechaInicio: string;
  fechaFin?: string;
  servicio: string;
  estado: BookingStatus;
  confirmacionToken: string;
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
  private loadingSubject = new BehaviorSubject<boolean>(true);
  loading$ = this.loadingSubject.asObservable();
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
  this.loadingSubject.next(true);

  // Modifica el flujo para manejar errores correctamente
  this.loadBackendConfig().pipe(
    switchMap(config => {
      this.configSubject.next(config);
      return forkJoin({
        reservas: this.loadBackendReservas().pipe(
          catchError(() => of([])) // Siempre retorna un array vacío en caso de error
        ),
        servicios: config.servicios?.length > 0 
          ? of(config.servicios)
          : this.loadServiciosFromBackend().pipe(
              catchError(() => of([])) // Fallback a array vacío
            )
      });
    }),
    catchError(error => {
      console.error('Error inicializando datos:', error);
      return of({ reservas: [], servicios: [] }); // Asegura que el forkJoin siempre complete
    })
  ).subscribe({
    next: ({ reservas, servicios }) => {
      this.reservasSubject.next(reservas);
      if (servicios.length > 0) {
        const currentConfig = this.configSubject.value;
        this.configSubject.next({ ...currentConfig, servicios });
      }
      this.loadingSubject.next(false); // Asegura que el loading se desactive
    },
    error: () => {
      this.loadingSubject.next(false); // Importante: desactiva loading incluso en error
    }
  });
}

  private loadServiciosFromBackend(): Observable<Servicio[]> {
    // Si falla, usa datos por defecto
    const serviciosPorDefecto: Servicio[] = [
      { id: '1', nombre: 'Corte Básico', duracion: 30 },
      { id: '2', nombre: 'Corte Premium', duracion: 45 }
    ];

    return this.http.get<Servicio[]>(`${environment.apiUrl}/api/servicios`).pipe(
      catchError(() => {
        console.warn('Usando servicios por defecto');
        return of(serviciosPorDefecto);
      })
    );
  }

confirmarReserva(token: string): Observable<Reserva> {
  return this.http.get<Reserva>(
    `${environment.apiUrl}/api/reservas/confirmar/${encodeURIComponent(token)}`
  ).pipe(
    catchError(error => {
      const errorMsg = error.error?.message || 'Error al confirmar reserva';
      return throwError(() => new Error(errorMsg));
    })
  );
}

  private loadBackendConfig(): Observable<BusinessConfig> {
    return this.http.get<BusinessConfig>(`${environment.apiUrl}/api/config`).pipe(
      catchError(() => of(this.defaultConfig))
    )
  }

  private loadBackendReservas(status?: BookingStatus): Observable<Reserva[]> {
    const params: { [key: string]: string } = {};
    if (status) {
      params['estado'] = status;
    }
    return this.http.get<Reserva[]>(`${environment.apiUrl}/api/reservas`, { params }).pipe(
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

  getServiceName(serviceId: string): string {
    const config = this.configSubject.value;
    const servicio = config.servicios.find(s => s.id === serviceId);
    return servicio ? servicio.nombre : serviceId; // Retorna el nombre o el ID si no lo encuentra
  }

  refreshCalendar(): void {
    this.configSubject.next({ ...this.configSubject.value }); // Forzar actualización reactiva
  }

  updateConfig(newConfig: Partial<BusinessConfig>): Observable<BusinessConfig> {
    const currentConfig = this.configSubject.value;
    const mergedConfig = {
      ...currentConfig,
      ...newConfig
    };

    return this.http.put<BusinessConfig>(`${environment.apiUrl}/api/config`, mergedConfig).pipe(
      tap(updatedConfig => {
        this.configSubject.next(updatedConfig);
        // Eliminamos la notificación aquí para evitar duplicados
      }),
      catchError(error => {
        console.error('Error al guardar configuración:', error);
        return throwError(() => error);
      })
    );
  }

  getReservas(status?: BookingStatus): Observable<Reserva[]> {
    return this.loadBackendReservas(status).pipe(
      tap(reservas => this.reservasSubject.next(reservas))
    );
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

  private isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  confirmReservaDefinitiva(token: string): Observable<Reserva> {
  return this.http.post<Reserva>(
    `${environment.apiUrl}/api/reservas/confirmar-definitiva/${token}`,
    {}
  ).pipe(
    catchError(error => {
      const errorMsg = error.error?.message || 'Error al confirmar reserva';
      return throwError(() => new Error(errorMsg));
    })
  );
}

  confirmReservationByAdmin(id: string): Observable<Reserva> {
    return this.http.put<Reserva>(`${environment.apiUrl}/api/reservas/${id}/confirm`, {}).pipe(
      tap(updatedReserva => {
        const currentReservas = this.reservasSubject.value;
        const updatedReservas = currentReservas.map(r => r.id === id ? updatedReserva : r);
        this.reservasSubject.next(updatedReservas);
      }),
      catchError(error => {
        const errorMsg = error.error?.message || 'Error al confirmar la reserva';
        return throwError(() => new Error(errorMsg));
      })
    );
  }

addReserva(reservaData: Omit<Reserva, 'id' | 'estado'>): Observable<{ token: string }> {
    // Validación mejorada (se mantiene igual)
    if (!reservaData.usuario?.nombre?.trim()) {
      return throwError(() => ({ message: 'El nombre del usuario es requerido', code: 400 }));
    }

    if (!reservaData.usuario?.email?.trim()) {
      return throwError(() => ({ message: 'El email del usuario es requerido', code: 400 }));
    }

    if (!this.isValidEmail(reservaData.usuario.email)) {
      return throwError(() => ({ message: 'El email no tiene un formato válido', code: 400 }));
    }

    if (!reservaData.fechaInicio || isNaN(new Date(reservaData.fechaInicio).getTime())) {
      return throwError(() => ({ message: 'La fecha de inicio es inválida', code: 400 }));
    }

    if (reservaData.fechaFin && isNaN(new Date(reservaData.fechaFin).getTime())) {
      return throwError(() => ({ message: 'La fecha de fin es inválida', code: 400 }));
    }

    if (!reservaData.duracion || reservaData.duracion < 5) {
      return throwError(() => ({ 
        message: 'La duración debe ser de al menos 5 minutos', 
        code: 400 
      }));
    }

    const payload = {
      usuario: {
        nombre: reservaData.usuario.nombre.trim(),
        email: reservaData.usuario.email.trim(),
        telefono: reservaData.usuario.telefono?.trim() || '',
        ...(reservaData.usuario.notas && { notas: reservaData.usuario.notas })
      },
      fechaInicio: reservaData.fechaInicio,
      servicio: reservaData.servicio,
      duracion: reservaData.duracion,
      ...(reservaData.fechaFin && { fechaFin: reservaData.fechaFin }),
      ...(reservaData.metadata && { metadata: reservaData.metadata })
    };

    // Cambios clave:
    // 1. Tipo de retorno: Observable<{ token: string }>
    // 2. Eliminamos el tap que añadía la reserva al estado local
    return this.http.post<{ token: string }>(`${environment.apiUrl}/api/reservas`, payload).pipe(
      catchError((error: ApiError) => {
        const errorMessage = error.message || 'Error al crear la reserva';
        this.notifications.showError(errorMessage);
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

  getReservasPorFecha(fecha: string): Observable<Reserva[]> {
  return this.http.get<Reserva[]>(`${environment.apiUrl}/api/reservas`, {
    params: { fecha }
  }).pipe(
    catchError(() => of([]))
  );
}

addReservaAdmin(reservaData: Omit<Reserva, 'id'>): Observable<Reserva> {
    // Validaciones básicas (sin validación de email)
    if (!reservaData.usuario?.nombre?.trim()) {
      return throwError(() => ({ message: 'El nombre del usuario es requerido', code: 400 }));
    }

    if (!reservaData.fechaInicio || isNaN(new Date(reservaData.fechaInicio).getTime())) {
      return throwError(() => ({ message: 'La fecha de inicio es inválida', code: 400 }));
    }

    if (reservaData.fechaFin && isNaN(new Date(reservaData.fechaFin).getTime())) {
      return throwError(() => ({ message: 'La fecha de fin es inválida', code: 400 }));
    }

    if (!reservaData.duracion || reservaData.duracion < 5) {
      return throwError(() => ({ 
        message: 'La duración debe ser de al menos 5 minutos', 
        code: 400 
      }));
    }

    const payload = {
      ...reservaData,
      usuario: {
        nombre: reservaData.usuario.nombre.trim(),
        email: reservaData.usuario.email?.trim() || '', // Email opcional
        telefono: reservaData.usuario.telefono?.trim() || '',
        ...(reservaData.usuario.notas && { notas: reservaData.usuario.notas })
      },
      estado: 'confirmada', // Confirmación inmediata
      fechaConfirmacion: new Date().toISOString(),
      origen: 'admin' // Para trazabilidad
    };

    return this.http.post<Reserva>(`${environment.apiUrl}/api/reservas/admin`, payload).pipe(
      tap((reservaCreada) => {
        this.notifications.showSuccess(`Reserva confirmada para ${reservaCreada.usuario.nombre}`);
      }),
      catchError((error: ApiError) => {
        const errorMessage = error.message || 'Error al crear la reserva';
        this.notifications.showError(errorMessage);
        return throwError(() => error);
      })
    );
}

isHoraDisponible(fecha: string, hora: string, duracion: number): Observable<boolean> {
  return this.http.get<boolean>(`${environment.apiUrl}/api/disponibilidad`, {
    params: { 
      fecha, 
      hora,
      duracion: duracion.toString() 
    }
  }).pipe(
    catchError(() => of(false)) // Si falla, asumir no disponible
  );
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

  // Métodos para fechas bloqueadas
  getFechasBloqueadas(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/api/bloqueo`);
  }

  addFechaBloqueada(fecha: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/bloqueo`, { fecha });
  }

  deleteFechaBloqueada(fecha: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/api/bloqueo/${fecha}`);
  }
}