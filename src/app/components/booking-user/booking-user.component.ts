import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService, Reserva, Servicio, BusinessConfig } from '../../services/booking-config.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { Observable, combineLatest, map, take, of, catchError } from 'rxjs';
import { NotPipe } from '../../pipes/not.pipe';

registerLocaleData(localeEs);

@Component({
  selector: 'app-booking-user',
  standalone: true,
  imports: [CommonModule, FormsModule, NotPipe],
  templateUrl: './booking-user.component.html',
  styleUrls: ['./booking-user.component.scss']
})
export class BookingUserComponent implements OnInit {
  private readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;

  emailError: string | null = null;
  emailTouched = false;
  serviciosDisponibles$!: Observable<Servicio[]>;
  selectedService: string = '';
  selectedDate: string = '';
  selectedTime: string = '';
  availableTimes: string[] = [];
  negocioNombre: string = "Sistema de Reservas";
  reservas$: Observable<Reserva[]>;
  config: BusinessConfig;

  userData = {
    nombre: '',
    email: '',
    telefono: ''
  };

  today: string = new Date().toISOString().split('T')[0];
  maxDate: string = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

  constructor(private bookingService: BookingConfigService) {
    this.config = this.bookingService.getConfig();
    this.reservas$ = this.bookingService.getReservas().pipe(
      catchError(() => of([]))
    );
  }

  ngOnInit(): void {
    this.loadInitialData(); // <-- Añade esta línea
    this.reservas$ = this.bookingService.getReservas().pipe(
      map(reservas => reservas.sort((a, b) =>
        new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
      )),
      catchError(() => of([] as Reserva[]))
    );
  }

  private loadInitialData(): void {
    this.serviciosDisponibles$ = this.bookingService.getServicios().pipe(
      catchError(() => of([]))
    );

    this.serviciosDisponibles$.pipe(take(1)).subscribe(servicios => {
      if (servicios.length > 0) {
        this.selectedService = servicios[0].id;
      }
    });

    this.bookingService.config$.subscribe(config => {
      this.config = config;
      this.negocioNombre = config.nombre || 'Sistema de Reservas';
    });

    this.reservas$ = this.bookingService.getReservas().pipe(
      map(reservas => reservas.sort((a, b) =>
        new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
      )
      ),
      catchError(error => {
        console.error('Error cargando reservas:', error);
        return of([]);
      })
    );
  }

  onServiceChange(): void {
    console.log('Fecha seleccionada:', this.selectedDate);
    console.log('Configuración actual:', this.config);
    this.selectedTime = '';
    this.updateAvailableTimes();
    console.log('Horas generadas:', this.availableTimes)
  }

  onDateChange(): void {
    this.selectedTime = '';
    this.updateAvailableTimes();
  }

  private generateSlotsFromRange(start: string, end: string): string[] {
    const slots: string[] = [];
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    // Obtener duración del servicio seleccionado
    const servicio = this.config.servicios?.find(s => s.id === this.selectedService);
    const duracion = servicio?.duracion || this.config.duracionBase;

    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      slots.push(
        `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`
      );

      // Usar duración del servicio
      currentMin += duracion;
      if (currentMin >= 60) {
        currentHour++;
        currentMin = currentMin % 60;
      }
    }

    return slots;
  }



  private updateAvailableTimes(): void {
    console.log('Fecha seleccionada:', this.selectedDate);
    console.log('Día de la semana:', new Date(this.selectedDate).getDay());
    console.log('Config recibida:', this.config); // <- Ver horariosNormales
    if (!this.selectedDate) {
      this.availableTimes = [];
      return;
    }

    const selectedDateObj = new Date(this.selectedDate);
    const dayOfWeek = selectedDateObj.getDay();
    const dateStr = selectedDateObj.toISOString().split('T')[0];

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
    if (!normalSchedule || normalSchedule.tramos.length === 0) {
      this.availableTimes = [];
      return;
    }

    this.availableTimes = normalSchedule.tramos.flatMap(tramo =>
      this.generateSlotsFromRange(tramo.horaInicio, tramo.horaFin)
    );
  }



  isTimeAvailable(time: string): Observable<boolean> {
    if (!this.selectedDate || !this.selectedService) return of(false);

    return combineLatest([
      this.serviciosDisponibles$,
      this.reservas$.pipe(take(1))
    ]).pipe(
      map(([servicios, reservas]) => {
        const servicio = servicios.find(s => s.id === this.selectedService);
        if (!servicio) return false;

        // Crear fechas en UTC
        const startTime = new Date(`${this.selectedDate}T${time}:00Z`);
        const endTime = new Date(startTime.getTime() + servicio.duracion * 60000);

        // Calcular solapamientos
        const overlaps = reservas.some(reserva => {
          const reservaStart = new Date(reserva.fechaInicio);
          const reservaService = servicios.find(s => s.id === reserva.servicio);
          const reservaEnd = new Date(
            reservaStart.getTime() + (reservaService?.duracion || this.config.duracionBase) * 60000
          );

          return startTime < reservaEnd && endTime > reservaStart;
        });

        return !overlaps;
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
      alert('Complete todos los campos correctamente');
      return;
    }

    const reservaData = {
      usuario: { ...this.userData },
      fechaInicio: new Date(`${this.selectedDate}T${this.selectedTime}:00`).toISOString(),
      servicio: this.selectedService
    };

    this.bookingService.addReserva(reservaData).subscribe({
      next: () => {
        alert('Reserva confirmada!');
        this.resetForm();
        this.loadReservas();
      },
      error: (err) => alert(`Error: ${err.message}`)
    });
  }

  private loadReservas(): void {
    this.reservas$ = this.bookingService.getReservas().pipe(
      map(reservas =>
        reservas.sort((a, b) =>
          new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
        )
      ),
      catchError(() => of([]))
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
    if (confirm('¿Estás seguro de cancelar esta reserva?')) {
      this.bookingService.deleteReserva(id).subscribe({
        next: () => {
          this.loadReservas();
          alert('Reserva cancelada');
        },
        error: (err) => alert('Error al cancelar: ' + err.message)
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