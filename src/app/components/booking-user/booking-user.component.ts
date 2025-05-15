import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService, Reserva, Servicio, BusinessConfig } from '../../services/booking-config.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { Observable, combineLatest, map, take, of, catchError, forkJoin } from 'rxjs';
import { NotPipe } from '../../pipes/not.pipe';
import { NotificationsService } from '../../services/notifications.service';

registerLocaleData(localeEs);

@Component({
  selector: 'app-booking-user',
  standalone: true,
  imports: [CommonModule, FormsModule, NotPipe],
  templateUrl: './booking-user.component.html',
  styleUrls: ['./booking-user.component.scss']
})
export class BookingUserComponent implements OnInit {
  private readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  emailError: string | null = null;
  emailTouched = false;
  serviciosDisponibles$!: Observable<Servicio[]>;
  selectedService: string = '';
  selectedDate: string = '';
  selectedTime: string = '';
  availableTimes: string[] = [];
  negocioNombre: string = "Sistema de Reservas";
  reservas$: Observable<Reserva[]> = of([]);
  config: BusinessConfig;

  userData = {
    nombre: '',
    email: '',
    telefono: ''
  };

  today: string = new Date().toISOString().split('T')[0];
  maxDate: string = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

  constructor(
    private bookingService: BookingConfigService, 
    private notifications: NotificationsService
  ) {
    this.config = this.bookingService.getConfig();
    
    // this.reservas$ = this.bookingService.getReservas().pipe(
    //   catchError(() => of([]))
    // );
  }

  ngOnInit(): void {
    this.reservas$ = this.bookingService.getReservas().pipe(
      catchError(() => of([]))
    );
    this.loadInitialData();
    this.initializeReservas();
  }

  private initializeReservas(): void {
    this.reservas$ = this.bookingService.getReservas().pipe(
      map(reservas => reservas.sort((a, b) =>
        new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
      )),
      catchError(() => of([] as Reserva[]))
    );
  }

  

  private loadInitialData(): void {
    forkJoin({
      config: this.bookingService.config$.pipe(take(1)),
      servicios: this.bookingService.getServicios().pipe(take(1)),
      reservas: this.bookingService.getReservas().pipe(take(1))
    }).subscribe(({ config, servicios, reservas }) => {
      this.config = config;
      this.negocioNombre = config.nombre || 'Sistema de Reservas';
      this.serviciosDisponibles$ = of(servicios);

      if (servicios.length > 0) {
        this.selectedService = servicios[0].id;
      }

      this.reservas$ = of(reservas.sort((a, b) =>
        new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
      ));
    });
  }

  onServiceChange(): void {
    this.selectedTime = '';
    this.updateAvailableTimes();
  }

  onDateChange(): void {
    const dateObj = new Date(this.selectedDate);
    const offset = dateObj.getTimezoneOffset() * 60000;
    this.selectedDate = new Date(dateObj.getTime() - offset).toISOString().split('T')[0];
    this.selectedTime = '';
    this.updateAvailableTimes();
  }

private generateSlotsFromRange(start: string, end: string): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);

  const servicio = this.config.servicios?.find(s => s.id === this.selectedService);
  const duracion = servicio?.duracion || this.config.duracionBase;

  let currentHour = startHour;
  let currentMin = startMin;

  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const hora = currentHour.toString().padStart(2, '0');
    const minuto = currentMin.toString().padStart(2, '0');
    slots.push(`${hora}:${minuto}`);

    currentMin += duracion;
    if (currentMin >= 60) {
      currentHour++;
      currentMin = currentMin % 60;
    }
  }

  return slots;
}

  private updateAvailableTimes(): void {
    if (!this.selectedDate) {
      this.availableTimes = [];
      return;
    }

    const dateObj = new Date(this.selectedDate);
    const dayOfWeek = dateObj.getDay();
    const dateStr = dateObj.toISOString().split('T')[0];

    const specialSchedule = this.config.horariosEspeciales.find(h =>
      h.fecha === dateStr && h.activo
    );

    if (specialSchedule) {
      this.availableTimes = this.generateSlotsFromRange(
        specialSchedule.horaInicio,
        specialSchedule.horaFin
      );
      return;
    }

    const normalSchedule = this.config.horariosNormales.find(h => h.dia === dayOfWeek);
    if (normalSchedule?.tramos?.length) {
      this.availableTimes = normalSchedule.tramos.flatMap(tramo =>
        this.generateSlotsFromRange(tramo.horaInicio, tramo.horaFin)
      );
    } else {
      this.availableTimes = [];
    }
  }

isTimeAvailable(time: string): Observable<boolean> {
  if (!this.selectedDate || !this.selectedService) return of(false);

  return combineLatest([
    this.bookingService.getReservasPorSlot(this.selectedDate, time),
    this.bookingService.config$,
    this.serviciosDisponibles$
  ]).pipe(
    map(([reservasEnSlot, config, servicios]) => {
      const servicio = servicios.find(s => s.id === this.selectedService);
      if (!servicio) return false;

      // Verificar solapamientos primero
      const startTime = new Date(`${this.selectedDate}T${time}:00Z`);
      const endTime = new Date(startTime.getTime() + servicio.duracion * 60000);

      const tieneSolapamientos = reservasEnSlot.some(reserva => {
        const reservaStart = new Date(reserva.fechaInicio);
        const reservaService = servicios.find(s => s.id === reserva.servicio);
        const reservaEnd = new Date(
          reservaStart.getTime() + (reservaService?.duracion || config.duracionBase) * 60000
        );

        return startTime < reservaEnd && endTime > reservaStart;
      });

      // Verificar límite de reservas por slot
      const alcanzoLimite = reservasEnSlot.length >= config.maxReservasPorSlot;

      return !tieneSolapamientos && !alcanzoLimite;
    }),
    catchError(() => of(false))
  );
}

  getSelectedService(): Observable<Servicio | undefined> {
    return this.serviciosDisponibles$.pipe(
      map(servicios => servicios.find(s => s.id === this.selectedService)),
      catchError(() => of(undefined))
    );
  }

  getHoraFinalizacion(): Observable<string> {
    return this.getSelectedService().pipe(
      map(servicio => {
        if (!servicio || !this.selectedTime) return '';
        const [hours, mins] = this.selectedTime.split(':').map(Number);
        const endTime = new Date();
        endTime.setHours(hours, mins + servicio.duracion, 0, 0);
        return endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }),
      catchError(() => of(''))
    );
  }

  isFormValid(): boolean {
    return !!this.userData.nombre?.trim() &&
      !!this.selectedDate &&
      !!this.selectedTime &&
      !!this.selectedService &&
      (!this.emailTouched || this.isEmailValid(this.userData.email));
  }

  private isEmailValid(email: string): boolean {
    if (!this.EMAIL_REGEX.test(email)) {
      this.emailError = 'Ingrese un email válido';
      return false;
    }
    this.emailError = null;
    return true;
  }

  onEmailBlur(): void {
    this.emailTouched = true;
  }

confirmarReserva(): void {
  if (!this.isFormValid()) {
    this.notifications.showError('Por favor complete todos los campos correctamente');
    return;
  }

  // Preparar los datos de la reserva
  const fechaInicio = new Date(`${this.selectedDate}T${this.selectedTime}:00`);
  const servicio = this.config.servicios.find(s => s.id === this.selectedService);
  
  if (!servicio) {
    this.notifications.showError('Servicio no encontrado');
    return;
  }

  const fechaFin = new Date(fechaInicio.getTime() + servicio.duracion * 60000);

  const reservaData = {
    usuario: { 
      nombre: this.userData.nombre.trim(),
      email: this.userData.email.trim(),
      telefono: this.userData.telefono?.trim() || ''
    },
    fechaInicio: fechaInicio.toISOString(),
    servicio: this.selectedService,
    // Agregar fechaFin si es necesario
    fechaFin: fechaFin.toISOString()
  };

  console.log('Datos enviados al backend:', reservaData); // Para depuración

  this.bookingService.addReserva(reservaData).subscribe({
    next: (reservaCreada) => {
      this.notifications.showSuccess('Reserva confirmada correctamente');
      this.resetForm();
      this.loadReservas();
    },
    error: (err) => {
      console.error('Error detallado:', err);
      const errorMsg = err.error?.message || 
                      err.error?.error?.detalles || 
                      'Error al crear la reserva';
      this.notifications.showError(errorMsg);
    }
  });
}

private loadReservas(): void {
  this.reservas$ = this.bookingService.getReservas().pipe(
    map(reservas => {
      if (!reservas || !Array.isArray(reservas)) {
        throw new Error('Formato de reservas inválido');
      }
      return reservas.sort((a, b) => 
        new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
      );
    }),
    catchError(error => {
      console.error('Error cargando reservas:', error);
      this.notifications.showError('Error al cargar reservas');
      return of([]);
    })
  );
}

  calcularHoraFinReserva(reserva: Reserva): Observable<string> {
    return this.serviciosDisponibles$.pipe(
      map(servicios => {
        const fechaInicio = new Date(reserva.fechaInicio);
        const servicio = servicios.find(s => s.id === reserva.servicio);
        if (!servicio) return '';
        const fechaFin = new Date(fechaInicio);
        fechaFin.setMinutes(fechaInicio.getMinutes() + servicio.duracion);
        return fechaFin.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      }),
      catchError(() => of(''))
    );
  }

  getServiceName(servicioId: string): Observable<string> {
    return this.serviciosDisponibles$.pipe(
      map(servicios => {
        const servicio = servicios.find(s => s.id === servicioId);
        return servicio ? servicio.nombre : 'Servicio no encontrado';
      }),
      catchError(() => of('Servicio no disponible'))
    );
  }

cancelarReserva(id: string): void {
  if (!id) {
    this.notifications.showError('ID de reserva inválido');
    return;
  }

  if (confirm('¿Estás seguro de cancelar esta reserva?')) {
    this.bookingService.deleteReserva(id).subscribe({
      next: () => {
        this.notifications.showSuccess('Reserva cancelada correctamente');
        this.loadReservas();
      },
      error: (err) => {
        console.error('Error cancelando reserva:', err);
        this.notifications.showError(`Error al cancelar: ${err.error?.message || err.message}`);
      }
    });
  }
}

  private resetForm(): void {
    this.userData = { nombre: '', email: '', telefono: '' };
    this.selectedDate = '';
    this.selectedTime = '';
    this.serviciosDisponibles$.pipe(take(1)).subscribe(servicios => {
      this.selectedService = servicios.length > 0 ? servicios[0].id : '';
    });
    this.emailError = null;
    this.emailTouched = false;
    this.availableTimes = [];
  }
}