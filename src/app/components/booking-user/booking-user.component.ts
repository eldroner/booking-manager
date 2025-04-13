import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService, Reserva, Servicio } from '../../services/booking-config.service';
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
  
  serviceTypes: string[] = ['cita', 'consulta', 'servicio'];
  serviciosDisponibles: Servicio[] = [];
  selectedService: string = '';
  selectedType: string = 'cita';
  selectedDate: string = '';
  selectedTime: string = '';
  availableTimes: string[] = [
    '09:00', '10:00', '11:00',
    '12:00', '13:00', '16:00',
    '17:00', '18:00'
  ];
  negocioNombre: string = "";
  reservas: Reserva[] = [];

  userData = {
    nombre: '',
    email: '',
    telefono: ''
  };
  today: string = new Date().toISOString().split('T')[0];
  maxDate: string = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

  constructor(
    private bookingService: BookingConfigService,
    private cdr: ChangeDetectorRef

  ) {}

  ngOnInit(): void {
    this.loadServices();
    this.loadBusinessName();
    this.loadReservas();
    this.availableTimes = this.generateTimeSlots();
  }

  private loadServices(): void {
    this.serviciosDisponibles = this.bookingService.getServicios();
    if (this.serviciosDisponibles.length > 0) {
      this.selectedService = this.serviciosDisponibles[0].id;
    }
  }

  onServiceChange(): void {
    this.selectedTime = '';
    this.cdr.detectChanges(); // Actualizar vista
  }
  
  getSelectedService(): Servicio | undefined {
    return this.serviciosDisponibles.find(s => s.id === this.selectedService);
  }

  validateEmail(email: string, forceValidation = false): void {
    if (!this.emailTouched && !forceValidation) return;
  
    this.emailError = null;
    
    if (!email) {
      this.emailError = 'El email es requerido';
    } else if (!this.EMAIL_REGEX.test(email)) {
      this.emailError = 'Ingrese un email válido (ejemplo@dominio.com)';
    }
    // Elimina esta línea: this.cdr.detectChanges();
  }

  private generateTimeSlots(): string[] {
    const config = this.bookingService.getConfig();
    const slots: string[] = [];
    
    // Convertir horas a minutos desde medianoche
    const [startH, startM] = config.horarioLaboral.horaInicio.split(':').map(Number);
    const [endH, endM] = config.horarioLaboral.horaFin.split(':').map(Number);
    
    let current = startH * 60 + startM;
    const endTime = endH * 60 + endM;
    
    while (current < endTime) {
      const hours = Math.floor(current / 60).toString().padStart(2, '0');
      const mins = (current % 60).toString().padStart(2, '0');
      slots.push(`${hours}:${mins}`);
      current += 30; // Incremento de 30 minutos
    }
    
    return slots;
  }

  getHoraFinalizacion(): string {
    if (!this.selectedTime || !this.selectedService) return '';
    
    const servicio = this.serviciosDisponibles.find(s => s.id === this.selectedService);
    if (!servicio) return '';
    
    const [hours, mins] = this.selectedTime.split(':').map(Number);
    const endTime = new Date();
    endTime.setHours(hours, mins + servicio.duracion, 0, 0);
    
    return endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  onServiceTypeChange(): void {
    this.selectedDate = '';
    this.selectedTime = '';
  }

  onDateChange(): void {
    this.selectedTime = '';
    this.availableTimes = this.generateTimeSlots();
    this.cdr.detectChanges();
  }

  private loadBusinessName(): void {
    this.bookingService.config$.subscribe(config => {
      this.negocioNombre = config.nombre || 'Sistema de Reservas';
    });
  }

  private loadReservas(): void {
    this.bookingService.getReservas().subscribe({
      next: (reservas) => {
        this.reservas = reservas.sort((a, b) => 
          new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
        );
      },
      error: (err) => console.error('Error cargando reservas', err)
    });
  }

  esSlotDisponible(hora: string): boolean {
    if (!this.selectedService) return true;
    
    const servicio = this.serviciosDisponibles.find(s => s.id === this.selectedService);
    if (!servicio) return true;
  
    // Para servicios de 30 min
    if (servicio.duracion <= 30) {
      return this.esHoraDisponible(hora);
    }
  
    // Para servicios de 60 min (necesita 2 slots consecutivos)
    if (servicio.duracion <= 60) {
      const index = this.availableTimes.indexOf(hora);
      if (index === -1 || index === this.availableTimes.length - 1) return false;
      
      const siguienteHora = this.availableTimes[index + 1];
      return this.esHoraDisponible(hora) && this.esHoraDisponible(siguienteHora);
    }
  
    // Para servicios de 120 min (necesita 4 slots consecutivos)
    if (servicio.duracion <= 120) {
      const index = this.availableTimes.indexOf(hora);
      if (index === -1 || index >= this.availableTimes.length - 3) return false;
      
      return [0, 1, 2, 3].every(offset => 
        this.esHoraDisponible(this.availableTimes[index + offset])
      );
    }
  
    return true;
  }

  getMotivoNoDisponible(hora: string): string {
    const servicio = this.serviciosDisponibles.find(s => s.id === this.selectedService);
    if (!servicio) return 'No disponible';
  
    if (servicio.duracion > 30) {
      const index = this.availableTimes.indexOf(hora);
      if (index === -1) return 'Fuera de horario';
      
      // Verificar slots consecutivos
      if (servicio.duracion <= 60) {
        if (!this.esHoraDisponible(hora)) return 'Hora ocupada';
        if (index === this.availableTimes.length - 1) return 'No hay slot siguiente';
        if (!this.esHoraDisponible(this.availableTimes[index + 1])) return 'Slot siguiente ocupado';
      }
      
      if (servicio.duracion <= 120) {
        if (index >= this.availableTimes.length - 3) return 'No hay suficientes slots';
        const slotsOcupados = [0, 1, 2, 3]
          .filter(offset => !this.esHoraDisponible(this.availableTimes[index + offset]));
        return `Faltan ${slotsOcupados.length} slots`;
      }
    }
  
    return 'No disponible';
  }

  getNombreServicio(servicioId: string): string {
    const servicio = this.serviciosDisponibles.find(s => s.id === servicioId);
    return servicio ? servicio.nombre : servicioId;
  }
  
  calcularHoraFin(reserva: Reserva): Date {
    const fechaInicio = new Date(reserva.fechaInicio);
    const servicio = this.serviciosDisponibles.find(s => s.id === reserva.servicio);
    const duracion = servicio?.duracion || 30;
    
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMinutes(fechaInicio.getMinutes() + duracion);
    return fechaFin;
  }

  esHoraDisponible(hora: string): boolean {
    if (!this.selectedDate || !this.selectedService) return true;
  
    const servicio = this.serviciosDisponibles.find(s => s.id === this.selectedService);
    if (!servicio) return true;
  
    // Calcular inicio y fin de la reserva
    const [horaStr, minutoStr] = hora.split(':');
    const fechaInicio = new Date(this.selectedDate);
    fechaInicio.setHours(parseInt(horaStr), parseInt(minutoStr));
    
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMinutes(fechaInicio.getMinutes() + servicio.duracion);
  
    // Verificar horario laboral
    const config = this.bookingService.getConfig();
    const [endHour, endMinute] = config.horarioLaboral.horaFin.split(':').map(Number);
    const horaCierre = new Date(fechaInicio);
    horaCierre.setHours(endHour, endMinute, 0, 0);
    
    if (fechaFin > horaCierre) {
      return false;
    }
  
    // Verificar solapamiento con otras reservas
    const reservasConflictivas = this.reservas.filter(r => {
      if (!r.fechaInicio) return false;
      
      const rInicio = new Date(r.fechaInicio);
      const rServicio = this.serviciosDisponibles.find(s => s.id === r.servicio);
      const rDuracion = rServicio?.duracion || config.duracionBase;
      const rFin = new Date(rInicio);
      rFin.setMinutes(rInicio.getMinutes() + rDuracion);
      
      // Comprobar si los intervalos se solapan
      return rInicio < fechaFin && rFin > fechaInicio;
    });
  
    return reservasConflictivas.length < config.maxReservasPorSlot;
  }

  isFormValid(): boolean {
    const hasRequiredFields = !!this.userData.nombre?.trim() && 
                            !!this.selectedDate && 
                            !!this.selectedTime &&
                            !!this.selectedService;
  
    const emailIsValidOrUntouched = !this.emailTouched || 
                                  (!!this.userData.email && this.isEmailValid(this.userData.email));
  
    return hasRequiredFields && emailIsValidOrUntouched;
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
    // La validación se realizará automáticamente en isFormValid()
  }



  confirmarReserva(): void {
    if (!this.isFormValid()) {
      alert('Complete todos los campos correctamente');
      return;
    }
  
    const fechaISO = new Date(`${this.selectedDate}T${this.selectedTime}:00`).toISOString();
  
    this.bookingService.addReserva({
      usuario: this.userData,
      fechaInicio: fechaISO,
      servicio: this.selectedService
    }).subscribe({
      next: () => {
        alert('Reserva confirmada!');
        this.resetForm();
        this.loadReservas();
      },
      error: (err) => {
        console.error('Error en reserva:', err);
        alert(`Error: ${this.getFriendlyError(err.message)}`);
      }
    });
  }

  private getFriendlyError(error: string): string {
    const errors: Record<string, string> = {
      'Email inválido': 'Por favor ingrese un email válido',
      'Nombre debe tener al menos 3 caracteres': 'El nombre es demasiado corto',
      'Validación fallida': 'El horario no está disponible o hay un error en los datos'
    };
    return errors[error] || 'Ocurrió un error al procesar la reserva';
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
    this.emailError = null;
    this.emailTouched = false;
  }
}