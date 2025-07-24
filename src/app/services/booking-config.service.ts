import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, forkJoin } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { NotificationsService } from './notifications.service';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

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
  idNegocio?: string;
}

export interface Reserva {
  id: string;
  idNegocio?: string;
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
  idNegocio?: string;
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
  private idNegocio: string | null = null;

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
    private router: Router,
    private authService: AuthService
  ) {}

  public loadBusinessData(idNegocio: string): void {
    this.idNegocio = idNegocio;
    this.initializeData();
  }

  private initializeData(): void {
    if (!this.idNegocio) return;

    this.loadingSubject.next(true);
    this.loadBackendConfig().pipe(
      switchMap(config => {
        this.configSubject.next(config);
        return forkJoin({
          reservas: this.loadBackendReservas().pipe(catchError(() => of([]))),
          servicios: config.servicios?.length > 0
            ? of(config.servicios)
            : this.loadServiciosFromBackend().pipe(catchError(() => of([])))
        });
      }),
      catchError(error => {
        console.error('Error inicializando datos:', error);
        this.loadingSubject.next(false);
        return of({ reservas: [], servicios: [] });
      })
    ).subscribe({
      next: ({ reservas, servicios }) => {
        this.reservasSubject.next(reservas);
        if (servicios.length > 0) {
          const currentConfig = this.configSubject.value;
          this.configSubject.next({ ...currentConfig, servicios });
        }
        this.loadingSubject.next(false);
      },
      error: () => {
        this.loadingSubject.next(false);
      }
    });
  }

  private loadServiciosFromBackend(): Observable<Servicio[]> {
    if (!this.idNegocio) return of([]);
    const params = new HttpParams().set('idNegocio', this.idNegocio);
    return this.http.get<Servicio[]>(`${environment.apiUrl}/api/servicios`, { params }).pipe(
      catchError(() => {
        console.warn('Usando servicios por defecto');
        return of([
          { id: '1', nombre: 'Corte Básico', duracion: 30 },
          { id: '2', nombre: 'Corte Premium', duracion: 45 }
        ]);
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
    if (!this.idNegocio) return throwError(() => new Error('ID de negocio no proporcionado'));

    const params = new HttpParams().set('idNegocio', this.idNegocio);
    return this.http.get<BusinessConfig>(`${environment.apiUrl}/api/config`, { params }).pipe(
      catchError(error => {
        if (error.status === 404 || error.status === 403) {
          // Redirigir si el negocio no está autorizado
          window.location.href = 'https://pixelnova.es/services/booking-manager';
          return of(this.defaultConfig); // Devuelve un valor por defecto para que el stream no se rompa
        } else {
          // Para otros errores, notificar y usar la config por defecto
          this.notifications.showError('No se pudo cargar la configuración del negocio.');
          return of(this.defaultConfig);
        }
      })
    );
  }

  private loadBackendReservas(status?: BookingStatus): Observable<Reserva[]> {
    if (!this.idNegocio) return of([]);
    let params = new HttpParams().set('idNegocio', this.idNegocio);
    if (status) {
      params = params.set('estado', status);
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
    return servicio ? servicio.nombre : serviceId;
  }

  refreshCalendar(): void {
    this.configSubject.next({ ...this.configSubject.value });
  }

  updateConfig(newConfig: Partial<BusinessConfig>): Observable<BusinessConfig> {
    if (!this.idNegocio) return throwError(() => new Error('ID de negocio no definido'));
    const currentConfig = this.configSubject.value;
    const mergedConfig = { ...currentConfig, ...newConfig };
    const params = new HttpParams().set('idNegocio', this.idNegocio);
    return this.http.put<BusinessConfig>(`${environment.apiUrl}/api/config`, mergedConfig, { params }).pipe(
      tap(updatedConfig => {
        this.configSubject.next(updatedConfig);
      }),
      catchError(error => {
        console.error('Error al guardar configuración:', error);
        if (error.status === 403 && error.error?.message === 'No autorizado: Token inválido o expirado') {
          this.notifications.showError('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
          this.authService.logout();
          this.router.navigate(['/admin-login']);
        }
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
    if (!this.idNegocio) return throwError(() => new Error('ID de negocio no definido'));
    const params = new HttpParams().set('idNegocio', this.idNegocio);
    return this.http.put<Reserva>(`${environment.apiUrl}/api/reservas/${id}/confirm`, {}, { params }).pipe(
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
    if (!this.idNegocio) return throwError(() => new Error('ID de negocio no definido'));
    if (!reservaData.usuario?.nombre?.trim()) {
      return throwError(() => ({ message: 'El nombre del usuario es requerido', code: 400 }));
    }
    if (!reservaData.usuario?.email?.trim() || !this.isValidEmail(reservaData.usuario.email)) {
      return throwError(() => ({ message: 'El email del usuario es requerido y debe ser válido', code: 400 }));
    }
    if (!reservaData.fechaInicio || isNaN(new Date(reservaData.fechaInicio).getTime())) {
      return throwError(() => ({ message: 'La fecha de inicio es inválida', code: 400 }));
    }
    if (!reservaData.duracion || reservaData.duracion < 5) {
      return throwError(() => ({ message: 'La duración debe ser de al menos 5 minutos', code: 400 }));
    }

    const payload = {
      ...reservaData,
      idNegocio: this.idNegocio,
      usuario: {
        nombre: reservaData.usuario.nombre.trim(),
        email: reservaData.usuario.email.trim(),
        telefono: reservaData.usuario.telefono?.trim() || '',
        ...(reservaData.usuario.notas && { notas: reservaData.usuario.notas })
      }
    };

    return this.http.post<{ token: string }>(`${environment.apiUrl}/api/reservas`, payload).pipe(
      catchError((error: ApiError) => {
        const errorMessage = error.message || 'Error al crear la reserva';
        this.notifications.showError(errorMessage);
        return throwError(() => error);
      })
    );
  }

  deleteReserva(id: string): Observable<void> {
    if (!this.idNegocio) return throwError(() => new Error('ID de negocio no definido'));
    if (!id) {
      return throwError(() => new Error('ID de reserva inválido'));
    }
    const params = new HttpParams().set('idNegocio', this.idNegocio);
    return this.http.delete<void>(`${environment.apiUrl}/api/reservas/${id}`, { params }).pipe(
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
    if (!this.idNegocio) return of([]);
    const params = new HttpParams().set('idNegocio', this.idNegocio).set('fecha', fecha);
    return this.http.get<Reserva[]>(`${environment.apiUrl}/api/reservas`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  addReservaAdmin(reservaData: Omit<Reserva, 'id'>): Observable<Reserva> {
    if (!this.idNegocio) return throwError(() => new Error('ID de negocio no definido'));
    if (!reservaData.usuario?.nombre?.trim()) {
      return throwError(() => ({ message: 'El nombre del usuario es requerido', code: 400 }));
    }
    if (!reservaData.fechaInicio || isNaN(new Date(reservaData.fechaInicio).getTime())) {
      return throwError(() => ({ message: 'La fecha de inicio es inválida', code: 400 }));
    }
    if (!reservaData.duracion || reservaData.duracion < 5) {
      return throwError(() => ({ message: 'La duración debe ser de al menos 5 minutos', code: 400 }));
    }

    const payload = {
      ...reservaData,
      idNegocio: this.idNegocio,
      usuario: {
        nombre: reservaData.usuario.nombre.trim(),
        email: reservaData.usuario.email?.trim() || '',
        telefono: reservaData.usuario.telefono?.trim() || '',
        ...(reservaData.usuario.notas && { notas: reservaData.usuario.notas })
      },
      estado: 'confirmada',
      fechaConfirmacion: new Date().toISOString(),
      origen: 'admin'
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
    if (!this.idNegocio) return of(false);
    const params = new HttpParams()
      .set('idNegocio', this.idNegocio)
      .set('fecha', fecha)
      .set('hora', hora)
      .set('duracion', duracion.toString());
    return this.http.get<boolean>(`${environment.apiUrl}/api/disponibilidad`, { params }).pipe(
      catchError(() => of(false))
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
    if (!this.idNegocio) return of([]);
    const params = new HttpParams().set('idNegocio', this.idNegocio);
    return this.http.get<string[]>(`${environment.apiUrl}/api/bloqueo`, { params });
  }

  addFechaBloqueada(fecha: string): Observable<any> {
    if (!this.idNegocio) return throwError(() => new Error('ID de negocio no definido'));
    const body = { fecha, idNegocio: this.idNegocio };
    return this.http.post(`${environment.apiUrl}/api/bloqueo`, body);
  }

  deleteFechaBloqueada(fecha: string): Observable<any> {
    if (!this.idNegocio) return throwError(() => new Error('ID de negocio no definido'));
    const params = new HttpParams().set('idNegocio', this.idNegocio);
    return this.http.delete(`${environment.apiUrl}/api/bloqueo/${fecha}`, { params });
  }
}
