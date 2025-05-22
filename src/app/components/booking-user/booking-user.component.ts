import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService, Reserva, Servicio, BusinessConfig, UserData, BookingStatus } from '../../services/booking-config.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { take, catchError, of } from 'rxjs';
import { NotificationsService } from '../../services/notifications.service';

registerLocaleData(localeEs);

@Component({
  selector: 'app-booking-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-user.component.html',
  styleUrls: ['./booking-user.component.scss']
})
export class BookingUserComponent implements OnInit {
  private readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  reservaData = {
    servicio: '',
    duracion: 0,
    fechaInicio: '',
    usuario: {
      nombre: '',
      email: '',
      telefono: ''
    } as UserData
  };

  serviciosDisponibles: Servicio[] = [];
  emailError: string | null = null;
  emailTouched = false;
  selectedTime: string = '';
  horaFinReserva: string = '';
  availableTimes: string[] = [];
  negocioNombre: string = "Sistema de Reservas";
  today: string = new Date().toISOString().split('T')[0];
  maxDate: string = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
  config!: BusinessConfig;

  constructor(
    private bookingService: BookingConfigService,
    private notifications: NotificationsService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.bookingService.config$.pipe(
      take(1)
    ).subscribe({
      next: (config) => {
        this.config = config;
        this.negocioNombre = config.nombre || 'Sistema de Reservas';
        this.loadServicios();
      },
      error: (err) => {
        console.error('Error loading config:', err);
        this.notifications.showError('Error al cargar configuración');
      }
    });
  }

  private loadServicios(): void {
    this.bookingService.getServicios().pipe(
      take(1),
      catchError(err => {
        console.error('Error loading services:', err);
        this.notifications.showError('Error al cargar servicios');
        return of([]);
      })
    ).subscribe(servicios => {
      this.serviciosDisponibles = servicios;
      if (servicios.length > 0) {
        this.reservaData.servicio = servicios[0].id;
      }
    });
  }

onServiceChange(): void {
  // Eliminamos la validación de fecha aquí, ya que no es necesaria
  const servicioSeleccionado = this.serviciosDisponibles.find(s => s.id === this.reservaData.servicio);
  if (!servicioSeleccionado) {
    console.warn('Servicio no encontrado');
    return;
  }

  this.reservaData.duracion = servicioSeleccionado.duracion;
  
  // Solo actualizamos hora fin si ya hay fecha seleccionada
  if (this.reservaData.fechaInicio) {
    this.updateHoraFin();
  }
}

  private updateHoraFin(): void {
    if (!this.reservaData.fechaInicio) return;

    const fechaInicio = new Date(this.reservaData.fechaInicio);
    const fechaFin = new Date(fechaInicio.getTime() + this.reservaData.duracion * 60000);
    this.horaFinReserva = fechaFin.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

onDateChange(selectedDate: string): void {
  this.reservaData.fechaInicio = selectedDate;
  this.selectedTime = '';
  
  // Validamos que haya un servicio seleccionado
  if (this.reservaData.servicio) {
    const servicio = this.serviciosDisponibles.find(s => s.id === this.reservaData.servicio);
    if (servicio) {
      this.reservaData.duracion = servicio.duracion;
    }
  }
  
  this.updateAvailableTimes();
}

  private updateAvailableTimes(): void {
    if (!this.reservaData.fechaInicio) {
      this.availableTimes = [];
      return;
    }

    const dateObj = new Date(this.reservaData.fechaInicio);
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

private generateSlotsFromRange(start: string, end: string): string[] {
  const slots: string[] = [];
  
  // Validación de entrada
  if (!start || !end || !this.reservaData.duracion) {
    return slots;
  }

  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);

  // Validación de horarios
  if (isNaN(startHour)) return slots;
  if (isNaN(startMin)) return slots;
  if (isNaN(endHour)) return slots;
  if (isNaN(endMin)) return slots;

  let currentHour = startHour;
  let currentMin = startMin;

  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const hora = currentHour.toString().padStart(2, '0');
    const minuto = currentMin.toString().padStart(2, '0');
    slots.push(`${hora}:${minuto}`);

    currentMin += this.reservaData.duracion;
    if (currentMin >= 60) {
      currentHour++;
      currentMin = currentMin % 60;
    }
  }

  return slots;
}

isFormValid(): boolean {
  const emailValidation = this.isEmailValid(this.reservaData.usuario.email);
  this.emailError = emailValidation.error;
  
  return !!this.reservaData.usuario.nombre?.trim() &&
         !!this.reservaData.fechaInicio &&
         !!this.selectedTime &&
         !!this.reservaData.servicio &&
         emailValidation.isValid;
}

  private isEmailValid(email: string): { isValid: boolean, error: string | null } {
  if (!email) return { isValid: true, error: null };
  const isValid = this.EMAIL_REGEX.test(email);
  return { isValid, error: isValid ? null : 'Email inválido' };
}

confirmarReserva(): void {
  if (!this.isFormValid()) {
    this.notifications.showError('Complete todos los campos correctamente');
    return;
  }

  const fechaInicio = new Date(`${this.reservaData.fechaInicio.split('T')[0]}T${this.selectedTime}:00`);
  const servicio = this.serviciosDisponibles.find(s => s.id === this.reservaData.servicio);

  if (!servicio) {
    this.notifications.showError('Servicio no encontrado');
    return;
  }

  const reservaCompleta: Reserva = {
    id: 'temp-' + Date.now(),
    usuario: this.reservaData.usuario,
    fechaInicio: fechaInicio.toISOString(),
    servicio: this.reservaData.servicio,
    estado: BookingStatus.PENDIENTE,
    duracion: servicio.duracion // Ahora compatible con la interfaz
  };

  this.bookingService.addReserva(reservaCompleta).subscribe({
    next: () => {
      this.notifications.showSuccess('Reserva confirmada');
      this.resetForm();
    },
    error: (err) => {
      console.error('Error:', err);
      this.notifications.showError(err.error?.message || 'Error al reservar');
    }
  });
}

  private resetForm(): void {
    this.reservaData = {
      servicio: this.serviciosDisponibles.length > 0 ? this.serviciosDisponibles[0].id : '',
      duracion: 0,
      fechaInicio: '',
      usuario: {
        nombre: '',
        email: '',
        telefono: ''
      }
    };
    this.selectedTime = '';
    this.availableTimes = [];
    this.emailError = null;
    this.emailTouched = false;
  }
}