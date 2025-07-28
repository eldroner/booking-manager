import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService, Servicio, BusinessConfig, BusinessType, UserData, BookingStatus } from '../../services/booking-config.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { take, catchError, of, finalize } from 'rxjs';
import { NotificationsService } from '../../services/notifications.service';
import { HoraFinPipe } from "../../pipes/hora-fin.pipe";
import { EmailService } from '../../services/email.service';
import { Router } from '@angular/router';

registerLocaleData(localeEs);

@Component({
  selector: 'app-booking-user',
  standalone: true,
  imports: [CommonModule, FormsModule, HoraFinPipe],
  templateUrl: './booking-user.component.html',
  styleUrls: ['./booking-user.component.scss']
})
export class BookingUserComponent implements OnInit {
  @Input() isAdmin: boolean = false;
  @Input() fechasBloqueadas: string[] = [];
  private readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private readonly PHONE_REGEX = /^[0-9]{9,15}$/;
  phoneError: string | null = null;
  phoneTouched = false;

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
    private notifications: NotificationsService,
    private emailService: EmailService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    const loadingTimeout = setTimeout(() => {
      console.error('Timeout: No se recibió respuesta del servidor');
      this.notifications.showError('El servidor no responde. Intente recargar la página.');
      this.config = this.getDefaultConfig();
      this.loadServicios();
    }, 10000);

    this.bookingService.config$.pipe(
      take(1),
      finalize(() => clearTimeout(loadingTimeout))
    ).subscribe({
      next: (config) => {
        this.config = config || this.getDefaultConfig();
        this.negocioNombre = this.config.nombre || 'Sistema de Reservas';
        this.loadServicios();
      },
      error: (err) => {
        console.error('Error cargando configuración:', err);
        this.notifications.showError('Error al cargar configuración');
        this.config = this.getDefaultConfig();
        this.loadServicios();
      }
    });
  }

  debugEmail(): void {
  console.log('Email ingresado:', this.reservaData.usuario.email);
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

  goToAdmin() {
  this.router.navigate(['/admin']);  // Navega a la ruta '/admin'
}

  onServiceChange(): void {
    const servicioSeleccionado = this.serviciosDisponibles.find(s => s.id === this.reservaData.servicio);
    if (!servicioSeleccionado) return;

    this.reservaData.duracion = servicioSeleccionado.duracion;

    // Actualizar horas disponibles si ya hay fecha seleccionada
    if (this.reservaData.fechaInicio) {
      this.updateAvailableTimes();
    }
  }



  onDateChange(selectedDate: string): void {
    if (this.fechasBloqueadas.includes(selectedDate)) {
      this.notifications.showError('Esta fecha no está disponible. Por favor, elija otra.');
      this.reservaData.fechaInicio = ''; // Limpiar la fecha inválida
      this.availableTimes = [];
      return;
    }

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
    if (!this.reservaData.fechaInicio || !this.reservaData.servicio) {
      this.availableTimes = [];
      return;
    }

    const servicio = this.serviciosDisponibles.find(s => s.id === this.reservaData.servicio);
    if (!servicio) return;

    // Obtener slots válidos considerando la duración
    const allPossibleTimes = this.getAllPossibleTimesForDate(this.reservaData.fechaInicio);

    this.bookingService.getReservasPorFecha(this.reservaData.fechaInicio).subscribe(reservas => {
      this.availableTimes = allPossibleTimes.filter(timeSlot => {
        const slotStart = new Date(`${this.reservaData.fechaInicio}T${timeSlot}:00`);
        const slotEnd = new Date(slotStart.getTime() + servicio.duracion * 60000);

        // Contar reservas que se solapan con este slot
        const overlappingReservas = reservas.filter(r => {
          const rStart = new Date(r.fechaInicio);
          const rEnd = r.fechaFin
            ? new Date(r.fechaFin)
            : new Date(rStart.getTime() + (r.duracion || 30) * 60000);

          return (
            (rStart < slotEnd && rEnd > slotStart) || // Solapamiento parcial
            (rStart >= slotStart && rStart < slotEnd) || // Inicio dentro del slot
            (rEnd > slotStart && rEnd <= slotEnd) // Fin dentro del slot
          );
        });

        return overlappingReservas.length < this.config.maxReservasPorSlot;
      });
    });
  }

  private getDefaultConfig(): BusinessConfig {
    return {
      nombre: 'Sistema de Reservas',
      tipoNegocio: BusinessType.GENERAL,
      duracionBase: 30,
      maxReservasPorSlot: 1,
      servicios: [],
      horariosNormales: [],
      horariosEspeciales: []
    };
  }

  private getAllPossibleTimesForDate(dateStr: string): string[] {
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();
    const dateISO = dateObj.toISOString().split('T')[0];

    // 1. Obtener el servicio seleccionado (si existe)
    const servicio = this.serviciosDisponibles.find(s => s.id === this.reservaData.servicio);
    const duracionServicio = servicio?.duracion || 30; // Duración en minutos

    // 2. Horario especial tiene prioridad
    const specialSchedule = this.config.horariosEspeciales.find(h =>
      h.fecha === dateISO && h.activo
    );

    if (specialSchedule) {
      return this.generateValidSlots(
        specialSchedule.horaInicio,
        specialSchedule.horaFin,
        duracionServicio
      );
    }

    // 3. Horario normal
    const normalSchedule = this.config.horariosNormales.find(h => h.dia === dayOfWeek);
    if (normalSchedule?.tramos?.length) {
      return normalSchedule.tramos.flatMap(tramo =>
        this.generateValidSlots(
          tramo.horaInicio,
          tramo.horaFin,
          duracionServicio
        )
      );
    }

    return [];
  }

  private generateValidSlots(start: string, end: string, duracion: number): string[] {
    const slots: string[] = [];
    const incrementMinutes = 30; // Incremento fijo de 30 minutos

    if (!start || !end) return slots;

    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      // Calcular hora de fin del servicio si empieza en currentHour:currentMin
      const endServiceHour = currentHour + Math.floor((currentMin + duracion) / 60);
      const endServiceMin = (currentMin + duracion) % 60;

      // Verificar que el servicio completo cabe en el horario
      if (endServiceHour < endHour ||
        (endServiceHour === endHour && endServiceMin <= endMin)) {
        const hora = currentHour.toString().padStart(2, '0');
        const minuto = currentMin.toString().padStart(2, '0');
        slots.push(`${hora}:${minuto}`);
      }

      // Incremento fijo de 30 minutos
      currentMin += incrementMinutes;
      if (currentMin >= 60) {
        currentHour++;
        currentMin = currentMin % 60;
      }
    }

    return slots;
  }


isFormValid(): boolean {
    const emailValidation = this.isEmailValid(this.reservaData.usuario.email);
    const phoneValidation = this.isPhoneValid(this.reservaData.usuario.telefono);
    
    this.emailError = emailValidation.error;
    this.phoneError = phoneValidation.error;

    return !!this.reservaData.usuario.nombre?.trim() &&
      !!this.reservaData.fechaInicio &&
      !!this.selectedTime &&
      !!this.reservaData.servicio &&
      emailValidation.isValid &&
      phoneValidation.isValid;
}

private isEmailValid(email: string): { isValid: boolean, error: string | null } {
    if (!email) return { isValid: false, error: 'Email es requerido' }; // Cambiado a requerido
    const isValid = this.EMAIL_REGEX.test(email);
    return { isValid, error: isValid ? null : 'Email inválido' };
}

// Nuevo método para validar teléfono
private isPhoneValid(phone: string | undefined): { isValid: boolean, error: string | null } {
    if (!phone || phone.trim() === '') {
      return { isValid: false, error: 'Teléfono es requerido' };
    }
    
    const isValid = this.PHONE_REGEX.test(phone);
    return { 
        isValid, 
        error: isValid ? null : 'Teléfono debe tener 9-15 dígitos' 
    };
}


soloNumeros(event: Event): void {
  const input = event.target as HTMLInputElement;
  input.value = input.value.replace(/[^0-9]/g, '');
  this.reservaData.usuario.telefono = input.value;
  
  // Solo validar después del primer touch
  if (this.phoneTouched) {
    this.phoneError = this.isPhoneValid(input.value).error;
  }
}

confirmarReserva(): void {
  const fechaInicio = new Date(`${this.reservaData.fechaInicio.split('T')[0]}T${this.selectedTime}:00`);
  const servicio = this.serviciosDisponibles.find(s => s.id === this.reservaData.servicio);
  
  if (!servicio) return;

  const reservaCompleta = {
    usuario: this.reservaData.usuario,
    fechaInicio: fechaInicio.toISOString(),
    servicio: servicio.id,
    duracion: servicio.duracion,
    confirmacionToken: 'temp-token'
  };

if (this.isAdmin) {
    // Lógica para el administrador: guardar directamente sin email de confirmación
    const reservaAdmin = {
      ...reservaCompleta,
      estado: BookingStatus.CONFIRMADA, // Marcar como confirmada directamente
      confirmacionToken: 'admin-confirmed' // Token ficticio para indicar que fue confirmada por admin
    };

    this.bookingService.addReservaAdmin(reservaAdmin).subscribe({
      next: (reserva) => {
        this.resetForm();
      },
      error: (err) => {
        this.notifications.showError(err.error?.message || 'Error al crear la reserva como administrador');
      }
    });

  } else {
    // Lógica normal para el usuario: enviar email de confirmación
    this.bookingService.addReserva(reservaCompleta).subscribe({
      next: (response: { token: string, emailContacto?: string }) => {
        if (!response.token) {
          console.error('No se recibió token de confirmación');
          this.notifications.showError('Error en la confirmación de la reserva');
          return;
        }

        console.log('Email a enviar:', reservaCompleta.usuario.email);

        const fechaFormateada = new Date(reservaCompleta.fechaInicio).toLocaleDateString('es-ES');

        const servicioSeleccionado = this.serviciosDisponibles.find(s => s.id === reservaCompleta.servicio);
        const nombreServicio = servicioSeleccionado ? servicioSeleccionado.nombre : 'Servicio no encontrado';

        this.emailService.sendBookingConfirmation(
          reservaCompleta.usuario.email,
          reservaCompleta.usuario.nombre,
          {
            fecha: fechaFormateada,
            servicio: nombreServicio,
            token: response.token,
            businessName: this.negocioNombre,
            bookingTime: this.selectedTime
          }
        ).then(() => {
          this.notifications.showSuccess('Reserva solicitada. Revisa tu email para validarla. Tienes 48 horas para hacerlo.');
          // Enviar notificación al administrador
          if (response.emailContacto && this.config.idNegocio) {
            this.emailService.sendAdminNotification(
              response.emailContacto,
              reservaCompleta.usuario.nombre,
              this.config.idNegocio
            ).catch(adminError => {
              console.error('Error enviando notificación al administrador:', adminError);
              // No mostrar error al usuario final por esto
            });
          }
        }).catch(error => {
          console.error('Error enviando email:', error);
          this.notifications.showError('Reserva creada, pero falló el envío del email de confirmación');
        });

        this.resetForm();
      },
      error: (err) => {
        this.notifications.showError(err.error?.message || 'Error al reservar');
      }
    });
  }
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
    this.phoneError = null;
    this.phoneTouched = false;
  }
}