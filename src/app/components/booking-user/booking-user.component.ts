import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService, Reserva, Servicio, BusinessConfig } from '../../services/booking-config.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);

@Component({
  selector: 'app-booking-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-user.component.html',
  styleUrls: ['./booking-user.component.scss']
})
export class BookingUserComponent implements OnInit {
  private readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
  
  emailError: string | null = null;
  emailTouched = false;
  serviciosDisponibles: Servicio[] = [];
  selectedService: string = '';
  selectedDate: string = '';
  selectedTime: string = '';
  availableTimes: string[] = [];
  negocioNombre: string = "Sistema de Reservas";
  reservas: Reserva[] = [];
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
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.serviciosDisponibles = this.bookingService.getServicios();
    if (this.serviciosDisponibles.length > 0) {
      this.selectedService = this.serviciosDisponibles[0].id;
    }

    this.bookingService.config$.subscribe(config => {
      this.config = config;
      this.negocioNombre = config.nombre || 'Sistema de Reservas';
    });

    this.loadReservas();
  }

  onServiceChange(): void {
    this.selectedTime = '';
    this.updateAvailableTimes();
  }

  onDateChange(): void {
    this.selectedTime = '';
    this.updateAvailableTimes();
  }

  private loadReservas(): void {
    this.bookingService.getReservas().subscribe({
      next: (reservas) => {
        // Mostramos TODAS las reservas sin filtrar por email
        this.reservas = reservas.sort((a, b) => 
          new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
        );
      },
      error: (err) => console.error('Error cargando reservas', err)
    });
  }

  private updateAvailableTimes(): void {
    if (!this.selectedDate) {
      this.availableTimes = [];
      return;
    }

    const selectedDateObj = new Date(this.selectedDate);
    const dayOfWeek = selectedDateObj.getDay();
    const dateStr = selectedDateObj.toISOString().split('T')[0];

    // Check for special schedule first
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

    // Use normal schedule
    const normalSchedule = this.config.horariosNormales.find(h => h.dia === dayOfWeek);
    if (!normalSchedule || normalSchedule.tramos.length === 0) {
      this.availableTimes = [];
      return;
    }

    this.availableTimes = normalSchedule.tramos.flatMap(tramo => 
      this.generateSlotsFromRange(tramo.horaInicio, tramo.horaFin)
    );
  }

  private generateSlotsFromRange(start: string, end: string): string[] {
    const slots: string[] = [];
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      slots.push(
        `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`
      );
      
      currentMin += this.config.duracionBase;
      if (currentMin >= 60) {
        currentHour++;
        currentMin = 0;
      }
    }

    return slots;
  }

  isTimeAvailable(time: string): boolean {
    if (!this.selectedDate || !this.selectedService) return false;

    const servicio = this.getSelectedService();
    if (!servicio) return false;

    const startTime = new Date(`${this.selectedDate}T${time}:00`);
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + servicio.duracion);

    // Check against existing reservations
    const overlappingReservations = this.reservas.filter(reserva => {
      const reservaStart = new Date(reserva.fechaInicio);
      const reservaService = this.serviciosDisponibles.find(s => s.id === reserva.servicio);
      const reservaEnd = new Date(reservaStart);
      reservaEnd.setMinutes(reservaStart.getMinutes() + (reservaService?.duracion || this.config.duracionBase));

      return reservaStart < endTime && reservaEnd > startTime;
    });

    return overlappingReservations.length < this.config.maxReservasPorSlot;
  }

  getSelectedService(): Servicio | undefined {
    return this.serviciosDisponibles.find(s => s.id === this.selectedService);
  }

  getSelectedServiceName(servicioId: string): string {
    const servicio = this.serviciosDisponibles.find(s => s.id === servicioId);
    return servicio ? servicio.nombre : 'Servicio no encontrado';
  }

  getHoraFinalizacion(): string {
    const servicio = this.getSelectedService();
    if (!servicio || !this.selectedTime) return '';

    const [hours, mins] = this.selectedTime.split(':').map(Number);
    const endTime = new Date();
    endTime.setHours(hours, mins + servicio.duracion, 0, 0);
    
    return endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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

  calcularHoraFinReserva(reserva: Reserva): string {
    const fechaInicio = new Date(reserva.fechaInicio);
    const servicio = this.serviciosDisponibles.find(s => s.id === reserva.servicio);
    
    if (!servicio) return '';
    
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMinutes(fechaInicio.getMinutes() + servicio.duracion);
    
    return fechaFin.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
  }

  getServiceName(servicioId: string): string {
    const servicio = this.serviciosDisponibles.find(s => s.id === servicioId);
    return servicio ? servicio.nombre : 'Servicio no encontrado';
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
    this.selectedService = this.serviciosDisponibles.length > 0 ? this.serviciosDisponibles[0].id : '';
    this.emailError = null;
    this.emailTouched = false;
    this.availableTimes = [];
  }
}